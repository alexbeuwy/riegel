"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { site } from "@/lib/site";

interface AuthState {
  enabled: boolean;
  ready: boolean;
  user: User | null;
  session: Session | null;
  signUp: (
    email: string,
    password: string,
    /** Ziel-URL für den Bestätigungslink (z. B. /konto?next=/immobilien/…) —
     *  sonst landet der Nutzer nach der E-Mail-Bestätigung im Nirgendwo. */
    emailRedirectTo?: string,
    /** Käufer-Stammdaten für den Provisionsnachweis → user_metadata
     *  (s. lib/buyer-details.ts, buyerToMetadata). */
    data?: Record<string, string>,
  ) => Promise<{ error: string | null; needsConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** user_metadata der aktiven Session ergänzen/aktualisieren (z. B. fehlende
   *  Nachweis-Stammdaten vor dem Exposé-Download nacherfassen). */
  updateProfile: (data: Record<string, string>) => Promise<{ error: string | null }>;
  /** Löst den Supabase-Reset-Mail-Versand aus (verrät nie, ob das Konto
   *  existiert — die Erfolgsmeldung ist immer gleich). redirectTo führt
   *  zurück auf /konto/passwort, wo die Recovery-Session landet. */
  resetPassword: (email: string, redirectTo: string) => Promise<{ error: string | null }>;
  /** Setzt das Passwort der aktuell aktiven (Recovery-)Session — nur nutzbar,
   *  solange über den Reset-Link ein `user` vorhanden ist. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthState | null>(null);

/**
 * Supabase-Auth-Fehler in verständliches Deutsch übersetzen.
 *
 * Anlass: Beim Registrieren stand „email rate limit exceeded" roh und englisch
 * über dem Formular (Screenshot Sissy). Das ist eine Grenze von Supabase Auth
 * selbst, NICHT von Resend — Resend war zu dem Zeitpunkt bei 170 von 3.000
 * Mails im Monat und 1 von 100 am Tag. Solange in Supabase kein eigener
 * SMTP-Versand hinterlegt ist, verschickt Supabase Bestätigungsmails über
 * seinen eingebauten Dienst, und der ist bewusst hart gedeckelt (wenige Mails
 * pro Stunde, ausdrücklich nicht für den Produktivbetrieb gedacht).
 *
 * Zwei Dinge sind hier getrennt zu halten: Der Deckel gehört in die
 * Supabase-Konfiguration (SMTP auf Resend umstellen), die MELDUNG gehört
 * hierher. Ein Kunde darf nie eine englische API-Meldung sehen, und schon gar
 * keine, die ihm die Schuld für ein Serverproblem zuschiebt.
 *
 * Unbekannte Meldungen landen in einem neutralen deutschen Satz; der Originaltext
 * geht in die Konsole, damit er beim Nachstellen nicht verloren ist.
 */
export function authFehlerText(roh: string): string {
  const m = roh.toLowerCase();

  // Versand-Deckel: nicht der Nutzer hat etwas falsch gemacht, sondern wir.
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("over_email_send_rate_limit"))
    return `Wir konnten die Bestätigungsmail gerade nicht verschicken. Bitte versuchen Sie es in ein paar Minuten erneut oder rufen Sie uns an: ${site.phone}.`;
  // Eigene Sperre pro Adresse ("… only request this after 47 seconds")
  if (m.includes("for security purposes")) {
    const sek = roh.match(/(\d+)\s*second/i)?.[1];
    return sek
      ? `Bitte warten Sie noch ${sek} Sekunden, bevor Sie es erneut versuchen.`
      : "Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.";
  }
  if (m.includes("already registered") || m.includes("user_already_exists"))
    return "Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.";
  if (m.includes("invalid login credentials"))
    return "E-Mail-Adresse oder Passwort stimmen nicht.";
  if (m.includes("email not confirmed"))
    return "Bitte bestätigen Sie zuerst den Link in unserer E-Mail.";
  if (m.includes("password") && (m.includes("at least") || m.includes("should be")))
    return "Das Passwort ist zu kurz — bitte mindestens 8 Zeichen.";
  if (m.includes("invalid format") || m.includes("email_address_invalid") || m.includes("unable to validate email"))
    return "Diese E-Mail-Adresse sieht nicht gültig aus.";
  if (m.includes("signups not allowed"))
    return `Die Registrierung ist derzeit deaktiviert. Bitte melden Sie sich telefonisch: ${site.phone}.`;
  if (m.includes("failed to fetch") || m.includes("networkerror"))
    return "Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.";

  console.error("[auth] unübersetzte Meldung:", roh);
  return `Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an: ${site.phone}.`;
}

/** null bleibt null — nur echte Fehlertexte werden übersetzt. */
const uebersetzt = (e: { message: string } | null) => (e ? authFehlerText(e.message) : null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, emailRedirectTo?: string, meta?: Record<string, string>) => {
      if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
      const options =
        emailRedirectTo || meta
          ? { options: { ...(emailRedirectTo && { emailRedirectTo }), ...(meta && { data: meta }) } }
          : {};
      const { data, error } = await supabase.auth.signUp({ email, password, ...options });
      if (error) return { error: authFehlerText(error.message) };
      return { error: null, needsConfirm: !data.session };
    },
    [],
  );

  const updateProfile = useCallback(async (data: Record<string, string>) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.updateUser({ data });
    return { error: uebersetzt(error) };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: uebersetzt(error) };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string, redirectTo: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: uebersetzt(error) };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: uebersetzt(error) };
  }, []);

  return (
    <Ctx.Provider
      value={{
        enabled: isSupabaseEnabled,
        ready,
        user,
        session,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

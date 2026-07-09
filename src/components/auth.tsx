"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

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
  ) => Promise<{ error: string | null; needsConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Löst den Supabase-Reset-Mail-Versand aus (verrät nie, ob das Konto
   *  existiert — die Erfolgsmeldung ist immer gleich). redirectTo führt
   *  zurück auf /konto/passwort, wo die Recovery-Session landet. */
  resetPassword: (email: string, redirectTo: string) => Promise<{ error: string | null }>;
  /** Setzt das Passwort der aktuell aktiven (Recovery-)Session — nur nutzbar,
   *  solange über den Reset-Link ein `user` vorhanden ist. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthState | null>(null);

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

  const signUp = useCallback(async (email: string, password: string, emailRedirectTo?: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(emailRedirectTo && { options: { emailRedirectTo } }),
    });
    if (error) return { error: error.message };
    return { error: null, needsConfirm: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string, redirectTo: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error ? error.message : null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: "Konten sind noch nicht aktiviert." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? error.message : null };
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

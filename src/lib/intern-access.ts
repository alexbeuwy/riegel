import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { INTERN_INVITED_KEY } from "@/lib/site-settings-keys";

/**
 * Zugangsprüfung für das interne Dashboard (/intern).
 *
 * Zwei gleichwertige Wege:
 *  1. ADMIN_PASSWORD (bestehend) — geteiltes Passwort.
 *  2. E-Mail-Freigabe: ein per Supabase-Auth eingeloggter Nutzer, dessen
 *     E-Mail auf der Allowlist steht. Sissy meldet sich also ganz normal mit
 *     ihrem RIEGEL-Konto an; steht ihre Adresse auf der Liste, ist /intern frei.
 *     Die Allowlist ist zweigeteilt: eine FESTE Liste (internFixedEmails, per
 *     Env/Default) plus eine DYNAMISCHE Liste aus der site_settings-Tabelle
 *     (internInvitedEmails); Letztere kann Sissy selbst über /intern per
 *     Einladung pflegen, ohne dass dafür ein Deploy nötig ist.
 *
 * Das Access-Token wird IMMER serverseitig mit dem service_role-Client
 * verifiziert (Signatur + Ablauf über Supabase) — der Client kann nichts
 * fälschen. Fehlermeldungen bleiben nach außen generisch.
 */

/** Feste E-Mail-Allowlist (lowercase). Default: Sissy + Alex. Überschreibbar
 *  via INTERN_EMAILS (kommagetrennt) — dann gilt ausschließlich die Env-Liste.
 *  Diese Adressen sind aus der /intern-Nutzerverwaltung heraus NICHT entfernbar
 *  oder löschbar (s. api/intern/users/route.ts). */
export function internFixedEmails(): Set<string> {
  const fromEnv = (process.env.INTERN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const defaults = ["sissy.riegel@riegel-immobilien.de", "alex@beuwy.com"];
  return new Set(fromEnv.length ? fromEnv : defaults);
}

/** Dynamisch über /intern eingeladene E-Mail-Adressen (site_settings-Tabelle,
 *  Key INTERN_INVITED_KEY, Wert ein JSON-Array aus lowercase-E-Mails). Fail-soft
 *  in jeder Hinsicht: fehlende Supabase-Konfiguration, kein Eintrag, kaputtes
 *  JSON oder ein DB-Fehler dürfen den Zugang der FESTEN Liste NIE gefährden,
 *  darum hier im Zweifel immer ein leeres Array statt eines Fehlers. */
export async function internInvitedEmails(): Promise<string[]> {
  if (!supabaseServer) return [];
  try {
    const { data, error } = await supabaseServer
      .from("site_settings")
      .select("value")
      .eq("key", INTERN_INVITED_KEY)
      .maybeSingle();
    if (error || !data?.value) return [];
    const parsed: unknown = JSON.parse(data.value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").map((s) => s.toLowerCase());
  } catch {
    return [];
  }
}

export type InternAuth =
  | { ok: true; via: "password" | "email"; email?: string }
  | { ok: false; status: number; error: string };

export async function verifyInternAccess(input: {
  password?: string;
  accessToken?: string;
}): Promise<InternAuth> {
  // 1) Passwort-Weg (z. B. Alex). Nur bei nicht-leerem Passwort prüfen.
  if (input.password) {
    const pw = checkAdminPassword(input.password);
    if (pw.ok) return { ok: true, via: "password" };
    // Ohne Token bleibt es beim Passwortfehler; mit Token fällt es weiter unten
    // auf den E-Mail-Weg durch.
    if (!input.accessToken) return { ok: false, status: pw.status, error: pw.error };
  }

  // 2) E-Mail-Weg über eine gültige Supabase-Session.
  if (input.accessToken) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("[intern-access] Supabase-Env fehlt (URL/SERVICE_ROLE).");
      return { ok: false, status: 503, error: "Zugriff derzeit nicht möglich." };
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.getUser(input.accessToken);
    const email = data.user?.email?.toLowerCase();
    if (error || !email) return { ok: false, status: 401, error: "Zugriff verweigert." };
    // Zugang zählt, wenn die E-Mail auf der FESTEN ODER der eingeladenen Liste
    // steht (Vereinigung). internInvitedEmails() ist fail-soft, ein DB-Fehler
    // fällt also nie auf "kein Zugang" zurück, wenn die feste Liste greift.
    const invited = await internInvitedEmails();
    if (!internFixedEmails().has(email) && !invited.includes(email)) {
      return { ok: false, status: 403, error: "Dieses Konto ist nicht für /intern freigeschaltet." };
    }
    return { ok: true, via: "email", email };
  }

  return { ok: false, status: 401, error: "Zugriff verweigert." };
}

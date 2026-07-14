import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "@/lib/admin-auth";

/**
 * Zugangsprüfung für das interne Dashboard (/intern).
 *
 * Zwei gleichwertige Wege:
 *  1. ADMIN_PASSWORD (bestehend) — geteiltes Passwort.
 *  2. E-Mail-Freigabe: ein per Supabase-Auth eingeloggter Nutzer, dessen
 *     E-Mail auf der Allowlist steht. Sissy meldet sich also ganz normal mit
 *     ihrem RIEGEL-Konto an; steht ihre Adresse auf der Liste, ist /intern frei.
 *
 * Das Access-Token wird IMMER serverseitig mit dem service_role-Client
 * verifiziert (Signatur + Ablauf über Supabase) — der Client kann nichts
 * fälschen. Fehlermeldungen bleiben nach außen generisch.
 */

/** E-Mail-Allowlist (lowercase). Default: Sissy + Alex. Überschreibbar via
 *  INTERN_EMAILS (kommagetrennt) — dann gilt ausschließlich die Env-Liste. */
export function internEmailAllowlist(): Set<string> {
  const fromEnv = (process.env.INTERN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const defaults = ["sissy.riegel@riegel-immobilien.de", "alex@beuwy.com"];
  return new Set(fromEnv.length ? fromEnv : defaults);
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
    if (!internEmailAllowlist().has(email)) {
      return { ok: false, status: 403, error: "Dieses Konto ist nicht für /intern freigeschaltet." };
    }
    return { ok: true, via: "email", email };
  }

  return { ok: false, status: 401, error: "Zugriff verweigert." };
}

import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { INTERN_INVITED_KEY } from "@/lib/site-settings-keys";
import { site } from "@/lib/site";

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
 *  oder löschbar (s. api/intern/users/route.ts).
 *
 *  WICHTIG (White-Label-Schutz): Der Sissy/Alex-Default ist nur für RIEGEL/
 *  lokale Entwicklung gedacht. Ohne gesetztes INTERN_EMAILS würde er in einer
 *  geklonten Makler-Instanz stillschweigend Fremden (Sissy/Alex) Zugriff auf
 *  deren /intern-Dashboard geben — s. docs/white-label-migration.md §5
 *  ("rote Liste") und §4. In Produktion (NODE_ENV=production) greift der
 *  Default darum NICHT mehr: fehlt INTERN_EMAILS dort, bleibt die Allowlist
 *  leer (niemand kommt per Session-Mail rein) statt fremder Zugriff — der
 *  Passwort-Weg (ADMIN_PASSWORD) bleibt davon unberührt. In Dev/Preview bleibt
 *  der Komfort-Default bestehen, damit lokale Entwicklung ohne Env-Setup
 *  weiterläuft. Der Fehler wird laut protokolliert, damit ein „vergessenes"
 *  INTERN_EMAILS beim Go-Live sofort auffällt statt erst, wenn niemand mehr
 *  reinkommt (oder — im schlimmeren Fall — jemand Fremdes reinkommt). */
export function internFixedEmails(): Set<string> {
  const fromEnv = (process.env.INTERN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length) return new Set(fromEnv);

  if (process.env.NODE_ENV === "production") {
    // VORFALL 19.08.2026: Hier stand vorher `return new Set()` — mit dem
    // Ergebnis, dass Sissy in der Produktion ohne gesetztes INTERN_EMAILS
    // ausgesperrt war ("Dieses Konto ist nicht für /intern freigeschaltet").
    // Die feste Liste bleibt leer (kein fremder Personen-Default, s. o.), aber
    // greifen tut stattdessen die Domain-Notfallregel in `internNotfallErlaubt`:
    // Adressen der eigenen Seiten-Domain UND der Betreiber-Domain kommen rein
    // (s. internNotfallDomains — die reine Seiten-Domain hat am 19.08.2026
    // den Betreiber selbst ausgesperrt). Das ist bei jedem Klon genau der
    // richtige Personenkreis und leakt keine fremden Makler-Adressen.
    console.error(
      "[intern-access] INTERN_EMAILS nicht gesetzt — es gilt die Notfallregel " +
        `(nur Adressen auf ${internNotfallDomains().map((d) => `@${d}`).join(" / ")}). ` +
        "Bitte INTERN_EMAILS in den Env-Variablen setzen.",
    );
    return new Set();
  }

  const defaults = ["sissy.riegel@riegel-immobilien.de", "alex@beuwy.com"];
  return new Set(defaults);
}

/** Host der eigenen Seite (ohne www.) — Basis der Notfallregel unten. */
function internEigeneDomain(): string {
  try {
    return new URL(site.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Domains, die OHNE gesetztes INTERN_EMAILS ins Dashboard dürfen.
 *
 *  1. Die eigene Seiten-Domain — das Team des Maklers selbst.
 *  2. Die Betreiber-Domain (beuwy als Dienstleister), sonst sperrt sich der
 *     Betreiber bei jedem Klon selbst aus. Genau das ist am 19.08.2026
 *     passiert: Die erste Fassung dieser Regel kannte nur (1), Sissy kam
 *     wieder rein — Alex (@beuwy.com) nicht. Über INTERN_BETREIBER_DOMAIN
 *     überschreibbar, mit "" komplett abschaltbar.
 *
 * Ein Klon, der NIEMANDEN von außen im Dashboard haben will, setzt entweder
 * INTERN_EMAILS (dann gilt ausschließlich diese Liste und die ganze Regel
 * greift nicht mehr) oder INTERN_BETREIBER_DOMAIN="" — beides steht als
 * Pflichtschritt im Migrations-Playbook §4/§5.
 */
export function internNotfallDomains(): string[] {
  const betreiber = (process.env.INTERN_BETREIBER_DOMAIN ?? "beuwy.com")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return [internEigeneDomain(), betreiber].filter(Boolean);
}

/**
 * Notfallregel, wenn INTERN_EMAILS NICHT gesetzt ist: Adressen auf einer der
 * Domains aus `internNotfallDomains()` dürfen ins Dashboard. Damit ist ein
 * vergessenes Env kein Aussperren mehr (Vorfall 19.08.2026), ohne den
 * White-Label-Schutz aufzugeben: Fremde Makler-Personen kommen nie rein, nur
 * das Team des Maklers selbst und der Betreiber. Sobald INTERN_EMAILS gesetzt
 * ist, gilt ausschließlich diese Liste und die Regel greift nicht mehr.
 */
export function internNotfallErlaubt(email: string): boolean {
  const envGesetzt = (process.env.INTERN_EMAILS ?? "").trim().length > 0;
  if (envGesetzt) return false;
  const adr = email.toLowerCase();
  return internNotfallDomains().some((d) => adr.endsWith(`@${d}`));
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
    if (!internFixedEmails().has(email) && !invited.includes(email) && !internNotfallErlaubt(email)) {
      return { ok: false, status: 403, error: "Dieses Konto ist nicht für /intern freigeschaltet." };
    }
    return { ok: true, via: "email", email };
  }

  return { ok: false, status: 401, error: "Zugriff verweigert." };
}

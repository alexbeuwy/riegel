/**
 * Sicherheits-Diagnose für /intern. AUSSCHLIESSLICH LESEND.
 *
 * Entstanden aus einem konkreten Verdachtsfall: In der Kontenliste des
 * Lead-Cockpits tauchte eine unbekannte Adresse auf, was zunächst wie ein
 * Einbruch aussah. Tatsächlich zeigt diese Liste ALLE registrierten
 * RIEGEL-Kundenkonten (Merkliste, gespeicherte Suchen, Suchaufträge), und
 * Registrierung ist absichtlich öffentlich. Wer Zugang zum Intern-Portal hat,
 * ist eine ganz andere, viel kleinere Menge.
 *
 * Genau diese Verwechslung räumt das Skript aus: Es stellt beide Listen
 * getrennt und unmissverständlich nebeneinander.
 *
 * Aufruf (Zugangsdaten kommen aus der Umgebung, nie aus dem Code):
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/security-check.mts
 *
 * Hinweis: Die Supabase-Schlüssel liegen produktiv nur in Vercel. Lokal läuft
 * das Skript daher nur, wenn die Variablen dort vorliegen.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung.\n" +
      "Die Werte liegen produktiv in Vercel unter Settings, Environment Variables.",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Muss mit internFixedEmails() in src/lib/intern-access.ts übereinstimmen.
const AUS_ENV = (process.env.INTERN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const FESTE_LISTE = AUS_ENV.length
  ? AUS_ENV
  : ["sissy.riegel@riegel-immobilien.de", "alex@beuwy.com"];

console.log("=== 1. WER KOMMT INS INTERN-PORTAL ===");
console.log("\nFeste Liste (im Code bzw. per INTERN_EMAILS, nicht entfernbar):");
for (const e of FESTE_LISTE) console.log(`  - ${e}`);

const { data: setting } = await db
  .from("site_settings")
  .select("value")
  .eq("key", "intern_invited_emails")
  .maybeSingle();
let eingeladen: string[] = [];
try {
  const parsed: unknown = JSON.parse(String(setting?.value ?? "[]"));
  if (Array.isArray(parsed)) eingeladen = parsed.filter((x): x is string => typeof x === "string");
} catch {
  console.log("  (Eingeladenen-Liste ist kein gültiges JSON)");
}
console.log("\nZusätzlich eingeladen (über /intern pflegbar und entziehbar):");
if (eingeladen.length === 0) console.log("  (keine)");
for (const e of eingeladen) console.log(`  - ${e}`);

const zugang = new Set([...FESTE_LISTE, ...eingeladen.map((e) => e.toLowerCase())]);
console.log(`\n=> Insgesamt ${zugang.size} Adresse(n) mit Intern-Zugang.`);
console.log("   Das Passwort ADMIN_PASSWORD ist der zweite, gleichwertige Weg.");

console.log("\n=== 2. REGISTRIERTE KUNDENKONTEN (haben KEINEN Intern-Zugang) ===");
const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
const liste = users?.users ?? [];
console.log(`\n${liste.length} Konto/Konten insgesamt:\n`);
for (const u of liste) {
  const mail = (u.email ?? "").toLowerCase();
  const marke = zugang.has(mail) ? "INTERN" : "      ";
  console.log(
    `  ${marke}  ${mail.padEnd(40)} angelegt ${String(u.created_at).slice(0, 10)}` +
      `  bestätigt ${u.email_confirmed_at ? "ja  " : "NEIN"}` +
      `  letzter Login ${u.last_sign_in_at ? String(u.last_sign_in_at).slice(0, 10) : "nie"}`,
  );
}

console.log("\n=== 3. AUFFÄLLIGKEITEN ===\n");
const auffaellig: string[] = [];
for (const u of liste) {
  const mail = (u.email ?? "").toLowerCase();
  // Eine Intern-Adresse ohne bestätigte E-Mail wäre erklärungsbedürftig.
  if (zugang.has(mail) && !u.email_confirmed_at)
    auffaellig.push(`Intern-Adresse ${mail} ist NICHT bestätigt.`);
  const provider = u.app_metadata?.provider;
  if (provider && provider !== "email")
    auffaellig.push(`${mail} nutzt den Anmeldeweg "${provider}" statt E-Mail.`);
}
for (const e of eingeladen) {
  if (!liste.some((u) => (u.email ?? "").toLowerCase() === e.toLowerCase()))
    auffaellig.push(`Eingeladen, aber ohne Konto: ${e} (harmlos, nur ungenutzt).`);
}
if (auffaellig.length === 0) console.log("  Keine. Zugangsliste und Konten sind schlüssig.");
for (const a of auffaellig) console.log(`  ! ${a}`);

console.log("\nDatenbestand (nur Zeilenzahlen, keine Inhalte):");
for (const t of ["profiles", "leads", "valuation_requests", "feedback", "site_settings"]) {
  const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(20)} ${error ? "Fehler: " + error.message : `${count} Zeilen`}`);
}

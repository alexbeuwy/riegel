/**
 * Testbatterie für die Formular-Validierung (src/lib/validierung.ts).
 *
 * WORAUF ES ANKOMMT — in dieser Reihenfolge:
 *   1. ECHTE LEADS DÜRFEN NIE ABGEWIESEN WERDEN. Ein fälschlich blockierter
 *      Eigentümer kostet mehr als hundert unsaubere Einträge in der Liste.
 *      Die Fälle unter „muss durchkommen" sind deshalb der eigentliche
 *      Regressionsschutz — bricht einer davon, ist die Regel zu streng.
 *   2. Offensichtlicher Unsinn soll draußen bleiben.
 *   3. Tippfehler sollen einen Vorschlag bekommen, echte Domains nie.
 *
 * Läuft offline (kein DNS, kein Netz) und in CI.
 *   npx tsx scripts/validierung-check.mts
 */
import {
  reportSchema,
  terminSchema,
  pruefeFormular,
  mailTippfehler,
  telefonNormalisieren,
  leadQualitaet,
} from "../src/lib/validierung";

let fehler = 0;
function pruefe(bedingung: boolean, text: string, details = "") {
  if (!bedingung) fehler++;
  console.log(`${bedingung ? "✓" : "✗"} ${text}${details ? ` — ${details}` : ""}`);
}

/* ── 1. Echte Leads müssen durchkommen ─────────────────────────────────── */
console.log("\n── Echte Leads (dürfen NIE abgewiesen werden) ──");
const echte: { name: string; email: string; phone?: string; was: string }[] = [
  { name: "Max Mustermann", email: "max.mustermann@web.de", phone: "0621 5200 8800", was: "Standardfall" },
  { name: "Dr. Anna Bär-Weiß", email: "a.baer@t-online.de", was: "Titel, Umlaut, Bindestrich" },
  { name: "Sean O'Connor", email: "sean@oconnor-immobilien.ie", was: "Apostroph, Firmendomain" },
  { name: "Jan van der Berg", email: "j.vdberg@gmx.net", was: "Mehrteiliger Nachname" },
  { name: "Li Wei", email: "li.wei@icloud.com", was: "Kurze Namensteile" },
  { name: "Sylwia Riegel", email: "sissy.riegel@riegel-immobilien.de", was: "Eigene Domain (kein Tippfehler-Vorschlag!)" },
  { name: "Müller", email: "mueller@sub.domain.example.com", phone: "+49 171 1234567", was: "Nur Nachname, Subdomain, intl. Nummer" },
  { name: "J. Schmidt", email: "js@arcor.de", phone: "06232/1001010", was: "Abgekürzter Vorname" },
];
for (const e of echte) {
  const r = pruefeFormular(reportSchema, { name: e.name, email: e.email, phone: e.phone ?? "" });
  pruefe(r.ok === true && r.bot === false, `${e.name} <${e.email}>`, e.was + (r.ok ? "" : ` → ABGEWIESEN: ${r.fehler}`));
}

/* ── 2. Unsinn soll draußen bleiben ────────────────────────────────────── */
console.log("\n── Muss abgewiesen werden ──");
const muell: { name: string; email: string; was: string }[] = [
  { name: "", email: "max@web.de", was: "Name leer" },
  { name: "a", email: "max@web.de", was: "Name einbuchstabig" },
  { name: "1234567890", email: "max@web.de", was: "Name ohne einen einzigen Buchstaben" },
  { name: "Max Mustermann", email: "a@b.c", was: "TLD einbuchstabig (kam vorher durch)" },
  { name: "Max Mustermann", email: "max@gmail", was: "Keine TLD" },
  { name: "Max Mustermann", email: "max..mustermann@web.de", was: "Doppelter Punkt" },
  { name: "Max Mustermann", email: ".max@web.de", was: "Führender Punkt" },
  { name: "Max Mustermann", email: "max mustermann@web.de", was: "Leerzeichen in der Adresse" },
  { name: "Max Mustermann", email: "", was: "E-Mail leer" },
];
for (const m of muell) {
  const r = pruefeFormular(reportSchema, { name: m.name, email: m.email });
  pruefe(r.ok === false, `„${m.name}" <${m.email}>`, m.was);
}

/* ── 3. Honeypot ───────────────────────────────────────────────────────── */
console.log("\n── Honeypot ──");
const bot = pruefeFormular(reportSchema, { name: "Bot", email: "bot@spam.example", website: "http://spam" });
pruefe(bot.ok === true && bot.bot === true, "Gefuelltes Honeypot-Feld gilt als Bot (Antwort bleibt ok)");
const mensch = pruefeFormular(reportSchema, { name: "Max Mustermann", email: "max@web.de", website: "" });
pruefe(mensch.ok === true && mensch.bot === false, "Leeres Honeypot-Feld stoert nicht");

/* ── 4. Tippfehler-Vorschläge ──────────────────────────────────────────── */
console.log("\n── Tippfehler: Vorschlag ja/nein ──");
const tippfehler: [string, string | null, string][] = [
  ["max@gmial.com", "max@gmail.com", "vertauschte Buchstaben"],
  ["max@gmail.con", "max@gmail.com", ".con statt .com"],
  ["max@web.dee", "max@web.de", "Buchstabe zu viel"],
  ["max@gmx.d", "max@gmx.de", "Buchstabe fehlt"],
  ["max@t-online.se", "max@t-online.de", "falsche TLD"],
  // Diese dürfen NIEMALS einen Vorschlag bekommen:
  ["max@gmail.com", null, "korrekt"],
  ["sissy@riegel-immobilien.de", null, "echte Firmendomain"],
  ["info@adler-immobilien.de", null, "echte Firmendomain"],
  ["max@web.at", null, "echte österreichische Domain, nicht web.de"],
  ["kontakt@sparkasse-vorderpfalz.de", null, "lange echte Domain"],
];
for (const [eingabe, erwartet, was] of tippfehler) {
  const ist = mailTippfehler(eingabe);
  pruefe(ist === erwartet, `${eingabe} → ${ist ?? "kein Vorschlag"}`, `${was}, erwartet ${erwartet ?? "kein Vorschlag"}`);
}

/* ── 5. Telefon-Normalisierung ─────────────────────────────────────────── */
console.log("\n── Telefon ──");
const telefone: [string, string][] = [
  ["0621 5200 8800", "+4962152008800"],
  ["06232/100 10 10", "+4962321001010"],
  ["+49 171 1234567", "+491711234567"],
  ["0049 171 1234567", "+491711234567"],
  ["+49 (0)621 520088-00", "+49621520088-00"],  // Durchwahl-Bindestrich bleibt bewusst erhalten
  ["", ""],
];
for (const [roh, erwartet] of telefone) {
  const ist = telefonNormalisieren(roh);
  pruefe(ist === erwartet, `„${roh}" → „${ist}"`, `erwartet „${erwartet}"`);
}
const zuKurz = pruefeFormular(reportSchema, { name: "Max Mustermann", email: "max@web.de", phone: "123" });
pruefe(zuKurz.ok === false, "Telefonnummer mit 3 Ziffern wird abgewiesen");
const ohne = pruefeFormular(reportSchema, { name: "Max Mustermann", email: "max@web.de", phone: "" });
pruefe(ohne.ok === true, "Leeres Telefonfeld ist in Ordnung (optional)");

/* ── 6. Termin-Datum ───────────────────────────────────────────────────── */
console.log("\n── Termin-Datum ──");
const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const morgen = new Date(Date.now() + 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const terminBasis = { name: "Max Mustermann", email: "max@web.de", time: "10:00" };
pruefe(pruefeFormular(terminSchema, { ...terminBasis, date: heute }).ok === true, "Heute geht");
pruefe(pruefeFormular(terminSchema, { ...terminBasis, date: morgen }).ok === true, "Morgen geht");
pruefe(pruefeFormular(terminSchema, { ...terminBasis, date: "1990-01-01" }).ok === false, "1990 wird abgewiesen");
pruefe(pruefeFormular(terminSchema, { ...terminBasis, date: "2087-01-01" }).ok === false, "2087 wird abgewiesen");
pruefe(
  pruefeFormular(terminSchema, { ...terminBasis, date: morgen, time: "25:99" }).ok === false,
  "Uhrzeit 25:99 wird abgewiesen",
);

/* ── 7. Lead-Qualität ──────────────────────────────────────────────────── */
console.log("\n── Lead-Qualität (nur Anzeige, blockiert nichts) ──");
const q1 = leadQualitaet({ name: "Hallo Hallo", email: "hallo@hallo.de", domain: "ok" });
pruefe(
  q1.hinweise.some((h) => h.includes("identisch")) && q1.hinweise.some((h) => h.includes("Platzhalter")),
  `„Hallo Hallo“ wird als Platzhalter mit identischen Namensteilen erkannt`,
  `${q1.punkte} Punkte: ${q1.hinweise.join(", ")}`,
);
// Bewusst NICHT „Max Mustermann": der steht auf der Platzhalter-Liste.
const q2 = leadQualitaet({
  name: "Anna Berger",
  email: "anna.berger@web.de",
  telefon: "+4962152008800",
  domain: "ok",
});
pruefe(q2.punkte === 100 && q2.hinweise.length === 0, "Vollständiger echter Lead: 100 Punkte, keine Hinweise");
const q3 = leadQualitaet({ name: "Anna Schmidt", email: "anna@mailinator.com", telefon: "0621 1", domain: "ok" });
pruefe(q3.hinweise.some((h) => h.includes("Wegwerf")), "Wegwerf-Adresse wird erkannt", q3.hinweise.join(", "));
const q4 = leadQualitaet({ name: "Anna Schmidt", email: "anna@asdf.asdf", domain: "existiert-nicht" });
pruefe(
  q4.hinweise.some((h) => h.includes("existiert nicht")),
  "Nicht existierende Domain wird erkannt",
  q4.hinweise.join(", "),
);

/* ── Ergebnis ──────────────────────────────────────────────────────────── */
console.log(fehler === 0 ? "\nAlle Validierungs-Prüfungen grün." : `\n${fehler} Prüfung(en) FEHLGESCHLAGEN.`);
process.exit(fehler === 0 ? 0 : 1);

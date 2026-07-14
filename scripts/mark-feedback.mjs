// Markiert die bereits abgearbeiteten Feedback-Kommentare (Sissy) als "done" in
// der Status-Karte (site_settings.feedback_status). Match per Kommentar-Textteil,
// damit es robust gegen exakte UUIDs ist. Genuin offene Punkte bleiben unberührt.
//
// Nutzung: node --env-file=.env.local scripts/mark-feedback.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen.");
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
// Status liegt in einer Sentinel-Zeile der feedback-Tabelle (site_settings fehlt in dieser DB).
const SENTINEL_ID = "00000000-0000-0000-0000-000000000001";
const SENTINEL_MARKER = "__feedback_status__";

// Kommentar-Textteil -> Notiz (was erledigt wurde). Alles, was auf keinen dieser
// Teile passt, bleibt OFFEN (u. a. Award-Logos, MRN-Logo, Exposé-Zustimmung,
// Trustpilot-Marken, Haftungsausschluss/AI-Act, Atlas-Durchsicht).
const DONE_RULES = [
  ["Insgesamt nicht ortsgebunden", "Hero: Regional/National, großer statt größter, Familienunternehmen betont, Besichtigungen/verkaufte Objekte raus"],
  ["die bisher verkauften raus stimmt auch nicht", "bisher verkauft raus, ca. 6.000 Besichtigungen/Jahr, 12,5 Mio belassen, Wettbewerber anonym"],
  ["mehr als 40 Jahr immobilien erfahrung", "Ueber 40 Jahre Immobilienerfahrung im Hero ergaenzt"],
  ["willst du das vorderpfalz lassen", "Region durchgaengig auf Metropolregion Rhein-Neckar umgestellt"],
  ["quadratmeter preise bissl hoch", "Preisatlas + Rechner: Quadratmeterpreise moderat gesenkt"],
  ["sind mehr bewertungen", "Google aufgenommen (4,8 / 449), Gesamt-Bewertungen 229 auf 678"],
  ["Bild Christoph und ich", "ImmoAward-Bild = Diptychon Christoph & Alex"],
  ["Maklerprov. Vorderpfalz Metropolregion", "Region auf Metropolregion Rhein-Neckar"],
  ["bei provision nicht rlp", "FAQ: Provision bundesweit, Versicherungspolice, nach Vereinbarung, kein Gendern"],
  ["würde bei der Karte oder so schreiben", "Datenschutz-Hinweis Ungefaehre Lage auf der Portal-Karte"],
  ["bei den Orten geht auch umkreis", "Umkreissuche (Ort + Radius) gebaut"],
  ["bei dem Energieausweis müssen wir", "Energieausweis-Hinweis (Paragraf 80 GEG) auf /verkaufen ergaenzt"],
  ["metropolregion rheinneckar", "Region auf Metropolregion Rhein-Neckar"],
  ["in der Region verwurzelt - national", "ueber-uns: regional zuhause national vernetzt + Immobilienexperten, kein Gendern"],
  ["Ihre freundlichen Experten", "Team-Ueberschrift: Ihre freundlichen Experten an unseren Standorten"],
  ["fotos kann man die bisherigen", "Kein Handlungsbedarf: Fotos bleiben, neue im August"],
];

const { data: rows, error } = await sb.from("feedback").select("id, comment");
if (error) {
  console.error("Feedback-Load-Fehler:", error.message);
  process.exit(1);
}

const rowList = (rows ?? []).filter((r) => r.id !== SENTINEL_ID);
const sentinel = (rows ?? []).find((r) => r.id === SENTINEL_ID);
let map = {};
try {
  map = sentinel?.comment ? JSON.parse(sentinel.comment) : {};
} catch {
  map = {};
}

const at = new Date().toISOString();
let marked = 0;
for (const r of rowList) {
  const rule = DONE_RULES.find(([sub]) => (r.comment ?? "").includes(sub));
  if (rule) {
    map[r.id] = { status: "done", note: rule[1], at };
    marked += 1;
  }
}

const up = await sb
  .from("feedback")
  .upsert({ id: SENTINEL_ID, page_url: SENTINEL_MARKER, comment: JSON.stringify(map) });
if (up.error) {
  console.error("Speichern fehlgeschlagen:", up.error.message);
  process.exit(1);
}
const doneCount = Object.values(map).filter((e) => e.status === "done").length;
console.error(
  `${marked} Kommentare als erledigt markiert. Offen: ${rowList.length - doneCount} von ${rowList.length}.`,
);

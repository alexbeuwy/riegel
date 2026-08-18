/**
 * Datenstand-Wächter für die Bewertungs-Engine und den Preisatlas.
 *
 * WOZU: Die Engine wirkt auf den Kunden GENAUSO selbstbewusst, wenn ihre
 * Basiswerte ein Jahr alt sind. Es gibt keinen Fehler, keinen roten Test und
 * keine leere Seite — der Report nennt weiter „3.450 €/m² Speyer", nur eben
 * aus einem Markt, den es so nicht mehr gibt. Genau diese Art von Fehler
 * findet niemand von selbst, deshalb dieses Skript: es misst das ALTER der
 * drei hartkodierten Datenschichten und macht Veralten laut.
 *
 * GEPRÜFT WIRD (alles OHNE Netz, rein aus dem Repo):
 *   1. Preisatlas-Stand   — MARKT_STAND / MARKT_STAND_DATUM (marktdaten.ts)
 *      gegen das laufende Quartal: ab 2 Quartalen Rückstand WARNUNG,
 *      ab 3 Quartalen Fehler (Exit 1).
 *   2. Kalibrierstand     — KALIBRIER_STAND (valuation.ts), also der letzte
 *      Lauf gegen echte OnOffice-Abschlüsse: ab 6 Monaten WARNUNG, ab 9
 *      Monaten Fehler (Exit 1).
 *   3. Stadt-Niveau       — der Recherche-Stand der Großstadt-Tabelle
 *      (stadt-niveau.ts), gleiche Schwellen wie 2.
 *
 * WARUM KONSTANTEN STATT KOMMENTAR-REGEX: Datumsangaben in Prosa-Kommentaren
 * verschieben sich bei jeder Umformulierung, ein Wächter, der daran hängt,
 * wird still blind. Die Stände 1 und 2 werden deshalb als exportierte
 * Konstanten IMPORTIERT. Einzige Ausnahme ist die Stadt-Niveau-Tabelle: dort
 * steht der Stand bis heute nur im Kopfkommentar („Stand Q4 2025–Q2 2026"),
 * er wird per Regex gelesen und das Skript sagt selbst, dass dort eine
 * Konstante nachzurüsten ist, sobald jemand die Datei ohnehin anfasst.
 *
 * WANN LAUFEN LASSEN:
 *   - vor jedem Release/Deploy
 *   - bei der Migration auf eine neue Makler-Instanz (der neue Makler startet
 *     mit UNSEREN Zahlen — er muss wissen, wie alt sie sind)
 *   - regelmäßig, mindestens einmal je Quartal
 *
 *   npx tsx scripts/kalibrier-alter-check.mts
 *     → Exit 0 = im grünen Bereich (Warnungen möglich); Exit 1 = überfällig
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { KALIBRIER_STAND } from "../src/lib/valuation";
import { MARKT_STAND, MARKT_STAND_DATUM } from "../src/lib/marktdaten";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Schwellen in MONATEN für die datumsbasierten Schichten (2 und 3). */
const WARN_MONATE = 6;
const FEHLER_MONATE = 9;
/** Schwellen in QUARTALEN Rückstand für den Preisatlas-Stand (Schicht 1). */
const WARN_QUARTALE = 2;
const FEHLER_QUARTALE = 3;

const warnungen: string[] = [];
const fehler: string[] = [];

/** „heute" bewusst zur Laufzeit — dies ist ein Wächter, kein Renderer. */
const jetzt = new Date();
const jetztQuartal = Math.floor(jetzt.getMonth() / 3) + 1;
const jetztJahr = jetzt.getFullYear();

/** Volle Monate zwischen `datum` und heute (angefangene zählen nicht). */
function monateAlt(datum: Date): number {
  let m = (jetztJahr - datum.getFullYear()) * 12 + (jetzt.getMonth() - datum.getMonth());
  if (jetzt.getDate() < datum.getDate()) m -= 1;
  return m;
}

/** Quartalsbeginn als Datum — bewusst der ANFANG: konservativ gerechnet,
 *  denn erhoben wurden die Daten irgendwann IM Quartal, nicht an dessen Ende. */
function quartalsBeginn(quartal: number, jahr: number): Date {
  return new Date(Date.UTC(jahr, (quartal - 1) * 3, 1));
}

function zeile(status: "ok" | "warn" | "fehler", titel: string, detail: string, hinweis?: string) {
  const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️ " : "❌";
  console.log(`${icon} ${titel}\n   ${detail}${hinweis ? `\n   → ${hinweis}` : ""}\n`);
}

const NACHZIEHEN_KALIBRIERUNG =
  "npx tsx scripts/preisanalyse-onoffice.mts mit OnOffice-Credentials laufen lassen, " +
  "REGIONS in src/lib/valuation.ts + REGION_BASIS in src/lib/marktdaten.ts nachziehen, " +
  "KALIBRIER_STAND auf das Laufdatum setzen und scripts/valuation-battery.mts prüfen.";

console.log("Datenstand-Wächter — wie alt sind die hartkodierten Marktdaten?\n");
console.log(`Heute: ${jetzt.toISOString().slice(0, 10)} (Q${jetztQuartal} ${jetztJahr})\n`);

/* ── 1. Preisatlas-Stand (MARKT_STAND / MARKT_STAND_DATUM) ────────────────── */
const marktDatum = new Date(`${MARKT_STAND_DATUM}T00:00:00Z`);
if (Number.isNaN(marktDatum.getTime())) {
  fehler.push(`MARKT_STAND_DATUM ist kein gültiges Datum: „${MARKT_STAND_DATUM}"`);
  zeile("fehler", "Preisatlas-Stand", `MARKT_STAND_DATUM unlesbar: „${MARKT_STAND_DATUM}"`, "Format YYYY-MM-DD in src/lib/marktdaten.ts");
} else {
  const standQuartal = Math.floor(marktDatum.getUTCMonth() / 3) + 1;
  const standJahr = marktDatum.getUTCFullYear();
  const rueckstand = (jetztJahr - standJahr) * 4 + (jetztQuartal - standQuartal);
  const detail = `MARKT_STAND „${MARKT_STAND}" / MARKT_STAND_DATUM ${MARKT_STAND_DATUM} → Q${standQuartal} ${standJahr}, Rückstand ${rueckstand} Quartal(e)`;

  // Konsistenz der beiden handgepflegten Werte: der Anzeigetext und das
  // maschinenlesbare Datum dürfen nicht auseinanderlaufen.
  const erwarteterText = `Q${standQuartal} ${standJahr}`;
  if (MARKT_STAND.replace(/\s+/g, " ").trim() !== erwarteterText) {
    warnungen.push(
      `MARKT_STAND „${MARKT_STAND}" und MARKT_STAND_DATUM ${MARKT_STAND_DATUM} (= ${erwarteterText}) meinen verschiedene Quartale`,
    );
  }

  if (rueckstand >= FEHLER_QUARTALE) {
    fehler.push(`Preisatlas-Stand ${rueckstand} Quartale alt (Grenze ${FEHLER_QUARTALE})`);
    zeile("fehler", "Preisatlas-Stand", detail, "Marktdaten neu erheben und MARKT_STAND + MARKT_STAND_DATUM in src/lib/marktdaten.ts setzen.");
  } else if (rueckstand >= WARN_QUARTALE) {
    warnungen.push(`Preisatlas-Stand ${rueckstand} Quartale alt`);
    zeile("warn", "Preisatlas-Stand", detail, "Im laufenden Quartal aktualisieren: MARKT_STAND + MARKT_STAND_DATUM in src/lib/marktdaten.ts.");
  } else {
    zeile("ok", "Preisatlas-Stand", detail);
  }
}

/* ── 2. Kalibrierstand der Engine (KALIBRIER_STAND) ───────────────────────── */
const kalibDatum = new Date(`${KALIBRIER_STAND}T00:00:00Z`);
if (Number.isNaN(kalibDatum.getTime())) {
  fehler.push(`KALIBRIER_STAND ist kein gültiges Datum: „${KALIBRIER_STAND}"`);
  zeile("fehler", "Kalibrierstand (echte Abschlüsse)", `KALIBRIER_STAND unlesbar: „${KALIBRIER_STAND}"`, "Format YYYY-MM-DD in src/lib/valuation.ts");
} else {
  const alt = monateAlt(kalibDatum);
  const detail = `Letzter Kalibrierlauf gegen echte OnOffice-Abschlüsse: ${KALIBRIER_STAND} (${alt} Monat(e) her)`;
  if (alt >= FEHLER_MONATE) {
    fehler.push(`Kalibrierstand ${alt} Monate alt (Grenze ${FEHLER_MONATE})`);
    zeile("fehler", "Kalibrierstand (echte Abschlüsse)", detail, NACHZIEHEN_KALIBRIERUNG);
  } else if (alt >= WARN_MONATE) {
    warnungen.push(`Kalibrierstand ${alt} Monate alt`);
    zeile("warn", "Kalibrierstand (echte Abschlüsse)", detail, NACHZIEHEN_KALIBRIERUNG);
  } else {
    zeile("ok", "Kalibrierstand (echte Abschlüsse)", detail);
  }
}

/* ── 3. Stadt-Niveau-Recherche (Kommentar-Regex, s. Kopfkommentar) ────────── */
const NIVEAU_DATEI = join(REPO, "src", "lib", "stadt-niveau.ts");
let niveauQuelle = "";
try {
  niveauQuelle = readFileSync(NIVEAU_DATEI, "utf8");
} catch {
  warnungen.push("src/lib/stadt-niveau.ts nicht lesbar — Stand der Großstadt-Tabelle ungeprüft");
}
// „Stand Q4 2025–Q2 2026" (Zeitraum) oder „Stand Q2 2026" (Einzelquartal).
// Genommen wird immer das LETZTE genannte Quartal, also das Ende des
// Recherchezeitraums.
const niveauTreffer = /Stand\s+((?:Q[1-4]\s*\d{4}\s*[–—-]?\s*)+)/i.exec(niveauQuelle);
const quartale = niveauTreffer ? [...niveauTreffer[1].matchAll(/Q([1-4])\s*(\d{4})/g)] : [];
if (quartale.length === 0) {
  if (niveauQuelle) {
    warnungen.push(`Stand der Stadt-Niveau-Tabelle nicht auffindbar (Kommentar-Muster „Stand Q… JJJJ" fehlt)`);
    zeile(
      "warn",
      "Stadt-Niveau-Recherche",
      "Kein Stand-Vermerk in src/lib/stadt-niveau.ts gefunden",
      "Beim nächsten Anfassen der Datei eine exportierte Konstante STADT_NIVEAU_STAND = \"JJJJ-MM-TT\" ergänzen und hier importieren — dann hängt der Wächter nicht mehr an einem Kommentar.",
    );
  }
} else {
  const letztes = quartale[quartale.length - 1];
  const q = Number(letztes[1]);
  const jahr = Number(letztes[2]);
  const alt = monateAlt(quartalsBeginn(q, jahr));
  const detail = `Recherche-Stand der Großstadt-Tabelle: bis Q${q} ${jahr} (konservativ ab Quartalsbeginn: ${alt} Monat(e) her)`;
  const hinweis =
    "Werte in src/lib/stadt-niveau.ts gegen die Quellen prüfen (Homeday-Preisatlas, ImmoScout24 WohnBarometer, " +
    "Gutachterausschuss-Berichte) und docs/preisatlas-research.md §8 mitziehen.";
  if (alt >= FEHLER_MONATE) {
    fehler.push(`Stadt-Niveau-Recherche ${alt} Monate alt (Grenze ${FEHLER_MONATE})`);
    zeile("fehler", "Stadt-Niveau-Recherche", detail, hinweis);
  } else if (alt >= WARN_MONATE) {
    warnungen.push(`Stadt-Niveau-Recherche ${alt} Monate alt`);
    zeile("warn", "Stadt-Niveau-Recherche", detail, hinweis);
  } else {
    zeile("ok", "Stadt-Niveau-Recherche", detail);
  }
}

/* ── Zusammenfassung ──────────────────────────────────────────────────────── */
if (fehler.length === 0 && warnungen.length === 0) {
  console.log("Alle Datenstände im grünen Bereich.");
  process.exit(0);
}
if (warnungen.length > 0) {
  console.log("Warnungen (noch kein Fehler, aber einplanen):");
  for (const w of warnungen) console.log(`  - ${w}`);
}
if (fehler.length > 0) {
  console.log("\nÜBERFÄLLIG:");
  for (const f of fehler) console.log(`  - ${f}`);
  console.log(`\nHandlungsanweisung: ${NACHZIEHEN_KALIBRIERUNG}`);
  process.exit(1);
}

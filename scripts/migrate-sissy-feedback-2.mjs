/**
 * Zweite Feedback-Runde (Sissy, 24.07.2026):
 *  1) haus-verkaufen-mit-oder-ohne-makler: Vergleichstabelle "Was Privatpersonen
 *     bei den Dienstleistern zahlen" (einmalige Beauftragung vs. Makler-Konditionen)
 *     + Markenschreibweise "RIEGEL" korrigieren.
 *  2) maklerprovision-rheinland-pfalz: Abschnitt "Wer zahlt die Maklerprovision
 *     in Rheinland-Pfalz?" komplett entfernen ("das bitte raus").
 *  3) immobilie-verkaufen-ablauf: Grundrisse-Kostenzeile präzisieren (Größe,
 *     Anzahl/Häufigkeit, einmalige Privat-Beauftragung am teuersten).
 * Atomar: schreibt nur, wenn ALLE Ersetzungen exakt einmal greifen.
 */
import { readFileSync, writeFileSync } from "node:fs";

const PATH = new URL("../src/content/geo-articles.json", import.meta.url);
const data = JSON.parse(readFileSync(PATH, "utf8"));
const bySlug = (s) => data.find((a) => a.slug === s);
let fails = 0;

/** In genau EINEM String-Feld eines Artikels ersetzen (muss 1× vorkommen). */
function replOnce(slug, locate, find, replace) {
  const art = bySlug(slug);
  if (!art) { console.error(`Artikel fehlt: ${slug}`); fails++; return; }
  const target = locate(art);
  if (!target || typeof target.get() !== "string") { console.error(`Feld fehlt in ${slug}`); fails++; return; }
  const cur = target.get();
  const n = cur.split(find).length - 1;
  if (n !== 1) { console.error(`[${slug}] Fundstellen != 1 (${n}): ${find.slice(0, 50)}`); fails++; return; }
  target.set(cur.replace(find, replace));
  console.log(`ok  [${slug}] ${find.slice(0, 55).replace(/\n/g, " ")}…`);
}

// ── 1) haus-verkaufen: Vergleichstabelle in den Kosten-Abschnitt ──
const TABELLE = [
  "",
  "",
  "**Was Privatpersonen bei den Dienstleistern zahlen (Richtwerte):**",
  "",
  "| Leistung | Privatperson (einmalige Beauftragung) | Über Makler (laufende Zusammenarbeit) |",
  "|---|---|---|",
  "| Professionelle Objektfotos | ca. 300 bis 600 € | ca. 150 bis 300 € |",
  "| Grundrisse / Schnitte (nachgezeichnet) | ca. 150 bis 400 € | ca. 80 bis 200 € |",
  "| Portal-Top-Platzierung (pro Objekt) | ca. 199 bis 1.500 € netto | stark rabattiert über Rahmenvertrag |",
  "| Bedarfs-Energieausweis | ca. 300 bis 450 € | ca. 250 bis 400 € |",
  "",
  "Der Unterschied entsteht durch das Auftragsvolumen: Ein Makler beauftragt Fotografen, Zeichenbüros und Portale laufend und erhält dafür Mengenkonditionen. Als Privatperson beauftragen Sie dieselben Leistungen einmalig zum Listenpreis und zahlen dafür oft rund das Doppelte. Die Werte sind Richtwerte und schwanken je nach Anbieter und Objekt.",
].join("\n");

replOnce(
  "haus-verkaufen-mit-oder-ohne-makler",
  (a) => ({ get: () => a.sections[2].body, set: (v) => (a.sections[2].body = v) }),
  "ein Kostenvorteil, der beim Vergleich oft übersehen wird.\n\nHinzu kommt der Zeitaufwand:",
  `ein Kostenvorteil, der beim Vergleich oft übersehen wird.${TABELLE}\n\nHinzu kommt der Zeitaufwand:`,
);

// Markenschreibweise (nur diese Prosa-Fundstelle ist klein geschrieben)
replOnce(
  "haus-verkaufen-mit-oder-ohne-makler",
  (a) => ({ get: () => a.sections[7].body, set: (v) => (a.sections[7].body = v) }),
  "Riegel Immobilien ist ein inhabergeführtes Familienunternehmen",
  "RIEGEL Immobilien ist ein inhabergeführtes Familienunternehmen",
);

// ── 2) maklerprovision: Abschnitt "Wer zahlt..." komplett raus ──
{
  const art = bySlug("maklerprovision-rheinland-pfalz");
  const idx = art?.sections.findIndex((s) => s.h2 === "Wer zahlt die Maklerprovision in Rheinland-Pfalz?");
  if (idx == null || idx < 0) { console.error("maklerprovision: Abschnitt nicht gefunden"); fails++; }
  else { art.sections.splice(idx, 1); console.log(`ok  [maklerprovision] Abschnitt entfernt (war Index ${idx})`); }
}

// ── 3) ablauf: Grundrisse-Zeile präzisieren ──
replOnce(
  "immobilie-verkaufen-ablauf",
  (a) => {
    const s = a.sections.find((x) => x.body.includes("**Grundrisse / Schnitte:**"));
    return { get: () => (s ? s.body : null), set: (v) => s && (s.body = v) };
  },
  "- **Grundrisse / Schnitte:** professionell nachgezeichnet meist nach Wohnfläche (m²-Preis) berechnet – je nach Objektgröße schnell mehrere hundert Euro",
  "- **Grundrisse / Schnitte:** professionell nachgezeichnet meist nach Wohnfläche (m²-Preis) berechnet und abhängig davon, wie viele Grundrisse und wie oft sie beauftragt werden. Bei einer einmaligen Beauftragung als Privatperson zahlen Sie am meisten, weil der Mengenrabatt laufender Aufträge fehlt – je nach Objektgröße schnell mehrere hundert Euro",
);

if (fails > 0) {
  console.error(`\n${fails} Fehler – Datei NICHT geschrieben.`);
  process.exit(1);
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n");
console.log("\nAlle Änderungen angewendet, JSON geschrieben.");

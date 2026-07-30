/**
 * Diagnose der Vergleichsobjekt-Auswahl im Wertreport.
 *
 * Anlass war ein Hinweis von Manfred: Bei einer Bewertung in Edigheim
 * (Stadtteil von Ludwigshafen) erschienen verkaufte Nachbarobjekte nicht als
 * Referenz. Das Skript macht nachvollziehbar, WELCHE Objekte für einen
 * bestimmten Zielort und Zielwert gewinnen und warum.
 *
 * Rein lesend, verändert nichts.
 *
 * Aufruf:
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/referenz-diagnose.mts
 */
import { fetchVerkaufteReferenzen, fetchOnOfficeEstates } from "@/lib/onoffice";
import { selectReportObjekte } from "@/lib/report-objekte";

const verkauft = (await fetchVerkaufteReferenzen()) ?? [];
const aktiv = (await fetchOnOfficeEstates()) ?? [];
const pool = [...aktiv, ...verkauft];

console.log(`Pool: ${aktiv.length} aktive + ${verkauft.length} verkaufte Objekte`);

// Zeitliche Reichweite des Verkauft-Pools. Er ist auf eine Seite der
// OnOffice-Liste begrenzt (nach geaendert_am absteigend), reicht also nicht
// beliebig weit zurueck. Aeltere Abschluesse fehlen bewusst: ihre Preise
// spiegeln den heutigen Markt nicht mehr.
const daten = verkauft
  .filter((e) => e.updatedAt)
  .map((e) => new Date(e.updatedAt!))
  .sort((a, b) => +a - +b);
if (daten.length) {
  console.log(
    `Verkauft-Pool reicht zurueck bis ${daten[0].toISOString().slice(0, 10)} ` +
      `(neuestes ${daten[daten.length - 1].toISOString().slice(0, 10)})`,
  );
}

/** Ortsschreibweisen, die dieselbe Lage bezeichnen muessen. */
const FAELLE: { name: string; ziel: { lat: number; lng: number; preis: number; flaeche: number }; orte: string[] }[] = [
  {
    name: "Edigheim / Oppau (Ludwigshafen), Haus um 380 Tsd. mit 140 m2",
    ziel: { lat: 49.5155, lng: 8.4083, preis: 380000, flaeche: 140 },
    // Die Adresssuche liefert fuer Strassen dort "Ludwigshafen am Rhein",
    // OnOffice pflegt "Ludwigshafen" plus Stadtteil. Alle vier Schreibweisen
    // muessen zum selben Ergebnis fuehren.
    orte: ["Ludwigshafen am Rhein", "Ludwigshafen", "Edigheim", "Oppau"],
  },
  {
    name: "Speyer, Haus um 600 Tsd. mit 150 m2",
    ziel: { lat: 49.3172, lng: 8.4386, preis: 600000, flaeche: 150 },
    orte: ["Speyer"],
  },
];

for (const fall of FAELLE) {
  console.log(`\n=== ${fall.name} ===`);
  for (const ort of fall.orte) {
    const treffer = await selectReportObjekte(pool, "haus", ort, 3, fall.ziel);
    console.log(`  Zielort "${ort}":`);
    if (treffer.length === 0) console.log("    keine Referenz");
    for (const t of treffer) {
      console.log(
        `    [${t.einordnung ?? "?"}] ${t.ort.padEnd(24)} ${(t.preis ?? "-").padEnd(24)} ` +
          `${(t.flaeche ?? "-").padEnd(10)} ${t.vermittelt ? "vermittelt" : "aktiv"}`,
      );
    }
  }
}

// Gegenprobe ohne Ortsangabe: so verhielt sich der Code fuer Ludwigshafen,
// solange der Ortsvergleich auf exakte Zeichenkettengleichheit lief
// ("Ludwigshafen am Rhein" traf nie auf "Ludwigshafen").
console.log("\n=== Gegenprobe: dasselbe Ziel OHNE Ortsangabe ===");
for (const t of await selectReportObjekte(pool, "haus", "", 3, FAELLE[0].ziel)) {
  console.log(`  [${t.einordnung ?? "?"}] ${t.ort}  ${t.preis ?? "-"}  ${t.flaeche ?? "-"}`);
}

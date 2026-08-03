/** Reproduktion des Eberle-Falls: Wohnung, 240 m2, 6 Zi, Bj 1960, Boehl-Iggelheim. */
import { estimateValue } from "@/lib/valuation";
import { marktortByOrt } from "@/lib/marktdaten";

for (const [label, input] of Object.entries({
  "wie gemeldet (Wohnung)": { objektart: "wohnung" as const, ort: "Böhl-Iggelheim", plz: "67459", wohnflaeche: 240, zimmer: 6, baujahr: 1960, zustand: "gepflegt" as const, qualitaet: "normal" as const, ausstattung: [] },
  "als Haus gerechnet    ": { objektart: "haus" as const, ort: "Böhl-Iggelheim", plz: "67459", wohnflaeche: 240, grundflaeche: 500, zimmer: 6, baujahr: 1960, zustand: "gepflegt" as const, qualitaet: "normal" as const, ausstattung: [] },
})) {
  const r = estimateValue(input as any);
  console.log(`\n=== ${label} ===  mid ${r.mid.toLocaleString("de-DE")} €  (${r.pricePerSqm?.toLocaleString("de-DE")} €/m²)  Spanne ${r.low.toLocaleString("de-DE")}–${r.high.toLocaleString("de-DE")}`);
  for (const f of r.factors) console.log(`   ${f.label.padEnd(28)} ${f.effectPct > 0 ? "+" : ""}${f.effectPct} %`);
}
const m = marktortByOrt("Böhl-Iggelheim");
console.log("\nPreisatlas Böhl-Iggelheim:", m ? JSON.stringify({ haus: m.haus, wohnung: m.wohnung }).slice(0, 220) : "kein Eintrag");

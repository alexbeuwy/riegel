/**
 * Regressions-Batterie für die Bewertungs-Engine (src/lib/valuation.ts) —
 * OHNE Netz, OHNE Server: ruft estimateValue() direkt mit festen Fixtures
 * auf und prüft BÄNDER statt exakter Werte (robust gegen bewusste
 * Feinjustierungen), plus harte Regressionsanker für Fälle, die sich durch
 * Engine-Änderungen NICHT bewegen dürfen.
 *
 * Anlass: Kleinkarlbach-Fall — EFH mit 3.247 m² Grundstück (davon real nur
 * ~1.300 m² Bauland) wurde mit BRW × 0,6 × Gesamtfläche auf 1,67 Mio. €
 * bewertet; realistisch sind ~650 Tsd. € (Homeday-Niveau Häuser dort:
 * ~2.500 €/m²). Seit v2.1 staffelt die Engine übergroße Grundstücke und
 * dämpft die Gebäudebasis über den amtlichen Bodenrichtwert (Mikrolage).
 *
 *   npx tsx scripts/valuation-battery.mts        → Exit 0 = alles grün
 */
import { estimateValue, type ValuationInput, type EstimateOptions } from "../src/lib/valuation";

const nf = new Intl.NumberFormat("de-DE");
let failures = 0;

function check(name: string, actual: number, lo: number, hi: number) {
  const ok = actual >= lo && actual <= hi;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${name}: ${nf.format(actual)} € ${ok ? "" : `(erwartet ${nf.format(lo)}–${nf.format(hi)})`}`,
  );
}

function run(input: ValuationInput, opts?: EstimateOptions) {
  return estimateValue(input, opts);
}

/* F1 — Der Kleinkarlbach-Fall (Anlass der v2.1-Staffel). */
const f1 = run(
  {
    objektart: "haus",
    ort: "Kleinkarlbach",
    wohnflaeche: 180,
    grundflaeche: 3247,
    baujahr: 1985,
    zustand: "gepflegt",
    qualitaet: "normal",
    ausstattung: ["Garten", "Garage / Stellplatz", "Keller"],
  },
  { bodenrichtwert: 260 },
);
check("F1 EFH Kleinkarlbach 180 m² Wfl / 3.247 m² Grund (BRW 260)", f1.mid, 630_000, 680_000);
check("F1 Grundstücksanteil (gestaffelt)", f1.grundstuecksAnrechnung?.wert ?? 0, 175_000, 190_000);

/* F2 — Regressionsanker: normales Speyer-EFH darf sich NICHT bewegen
 * (Grundstück ≤ 700 m² → Staffel identisch zur alten Formel; BRW 590 =
 * Modellwert → Lagefaktor exakt 1). */
const f2 = run(
  {
    objektart: "haus",
    ort: "Speyer",
    wohnflaeche: 140,
    grundflaeche: 420,
    baujahr: 1990,
    zustand: "gepflegt",
    qualitaet: "normal",
    ausstattung: ["Garten"],
  },
  { bodenrichtwert: 590 },
);
check("F2 EFH Speyer 140/420 (BRW 590, Anker exakt)", f2.mid, 676_000, 676_000);

/* F3 — Wohnung Speyer (kein Grundstücksanteil, Lagefaktor 1). */
const f3 = run(
  { objektart: "wohnung", ort: "Speyer", wohnflaeche: 90, baujahr: 2005, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 590 },
);
check("F3 Wohnung Speyer 90 m²", f3.mid, 365_000, 375_000);

/* F4 — MFH: Ertragswert-Zweig komplett unberührt von der Staffel. */
const f4 = run({
  objektart: "mehrfamilienhaus",
  ort: "Speyer",
  jahresnettokaltmiete: 60_000,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
check("F4 MFH Speyer (JNKM 60.000, Anker exakt)", f4.mid, 936_000, 936_000);
if (f4.vervielfaeltiger !== 15.6) {
  failures++;
  console.log(`❌ F4 Vervielfältiger: ${f4.vervielfaeltiger} (erwartet 15.6)`);
}

/* F5 — Großes Grundstück solo: vorher 844.220 € (Fläche × BRW), jetzt gestaffelt. */
const f5 = run(
  { objektart: "grundstueck", ort: "Kleinkarlbach", grundflaeche: 3247, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 260 },
);
check("F5 Grundstück 3.247 m² (BRW 260)", f5.mid, 390_000, 425_000);

/* F6 — Normales Grundstück: unter 1.000 m² rechnet die Staffel wie zuvor. */
const f6 = run(
  { objektart: "grundstueck", ort: "Speyer", grundflaeche: 800, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 590 },
);
check("F6 Grundstück Speyer 800 m² (Anker exakt)", f6.mid, 472_000, 472_000);

/* F7 — Ohne BORIS-Wert (Modell-BRW = Lagefaktor 1) identisch zu F2. */
const f7 = run({
  objektart: "haus",
  ort: "Speyer",
  wohnflaeche: 140,
  grundflaeche: 420,
  baujahr: 1990,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: ["Garten"],
});
check("F7 wie F2 ohne amtlichen BRW (Anker exakt)", f7.mid, 676_000, 676_000);

/* F8 — Haus am Ludwigshafener Rand: BRW 300 unter Modell 430 → Basis sinkt. */
const f8 = run(
  { objektart: "haus", ort: "Ludwigshafen", wohnflaeche: 160, grundflaeche: 900, baujahr: 1970, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 300 },
);
check("F8 EFH Ludwigshafen-Rand 160/900 (BRW 300)", f8.mid, 440_000, 510_000);

/* Invarianten. */
for (const [name, r] of [["F1", f1], ["F2", f2], ["F3", f3], ["F4", f4], ["F5", f5], ["F8", f8]] as const) {
  if (!(r.low < r.mid && r.mid < r.high)) {
    failures++;
    console.log(`❌ Invariante low<mid<high verletzt bei ${name}`);
  }
}
const g = (m2: number) =>
  run({ objektart: "grundstueck", ort: "Kleinkarlbach", grundflaeche: m2, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] }, { bodenrichtwert: 260 }).mid;
if (!(g(500) < g(1500) && g(1500) < g(3000))) {
  failures++;
  console.log("❌ Invariante Monotonie Grundstücksfläche verletzt");
}
if (!((f1.grundstuecksAnrechnung?.wert ?? Infinity) < 260 * 0.6 * 3247)) {
  failures++;
  console.log("❌ Invariante: Staffel muss unter der alten Pauschalformel liegen");
}

console.log(
  `\nDetails F1: Bauland ${f1.grundstuecksAnrechnung?.baulandM2} m², Mehrfläche ${f1.grundstuecksAnrechnung?.mehrflaecheM2} m², Gartenland ${f1.grundstuecksAnrechnung?.gartenlandM2} m² → ${nf.format(f1.grundstuecksAnrechnung?.wert ?? 0)} €`,
);
console.log(`Details F5: Ø-Niveau ${nf.format(f5.pricePerSqm ?? 0)} €/m² (roher BRW bleibt ${f5.bodenrichtwert} €/m²)`);

if (failures > 0) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle Prüfungen grün.");

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
// Band am 06.08.2026 nachgezogen: die Eberle-Erdung (Kompression der
// Aufwertungs-Faktoren + geschärfte Baujahres-Stufen, b7c039f) senkt diesen
// Fall bewusst auf 619 Tsd. € — weiterhin im realistischen Korridor um
// ~650 Tsd. (Homeday-Niveau dort), nur unter dem alten Banduntergrenze.
check("F1 EFH Kleinkarlbach 180 m² Wfl / 3.247 m² Grund (BRW 260)", f1.mid, 600_000, 670_000);
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
// Anker am 06.08.2026 neu gesetzt (676 → 668 Tsd.): die Eberle-Erdung
// (b7c039f) staucht die Aufwertungs-Faktoren dieses Falls bewusst.
// 11.08.2026 erneut nachgezogen (668 → 621 Tsd.): Speyer-Basis auf den
// Median echter Abschlüsse rekalibriert (Fall Manfred „Landauer Warte",
// Haus 3.800 → 3.450) — der Anker friert den NEUEN Sollwert ein.
check("F2 EFH Speyer 140/420 (BRW 590, Anker exakt)", f2.mid, 621_000, 621_000);

/* F3 — Wohnung Speyer (kein Grundstücksanteil, Lagefaktor 1). */
const f3 = run(
  { objektart: "wohnung", ort: "Speyer", wohnflaeche: 90, baujahr: 2005, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 590 },
);
// Band 11.08.2026 nachgezogen: Speyer-Wohnungsbasis 3.950 → 3.600 (Median
// echter Abschlüsse, s. REGIONS-Kommentar in valuation.ts).
check("F3 Wohnung Speyer 90 m²", f3.mid, 328_000, 340_000);

/* F4 — MFH: Ertragswert-Zweig komplett unberührt von der Staffel. */
const f4 = run({
  objektart: "mehrfamilienhaus",
  ort: "Speyer",
  jahresnettokaltmiete: 60_000,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
// 11.08.2026: Speyer-Rekalibrierung senkt auch den Vervielfältiger leicht
// (er hängt am regionalen Wohnungs-Niveau, s. mfhVervielfaeltiger).
check("F4 MFH Speyer (JNKM 60.000, Anker exakt)", f4.mid, 918_000, 918_000);
if (f4.vervielfaeltiger !== 15.3) {
  failures++;
  console.log(`❌ F4 Vervielfältiger: ${f4.vervielfaeltiger} (erwartet 15.3)`);
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
// Wie F2: Anker 06.08. (Eberle-Erdung) und 11.08.2026 (Speyer-Basis) nachgezogen.
check("F7 wie F2 ohne amtlichen BRW (Anker exakt)", f7.mid, 621_000, 621_000);

/* F8 — Haus am Ludwigshafener Rand: BRW 300 unter Modell 430 → Basis sinkt. */
const f8 = run(
  { objektart: "haus", ort: "Ludwigshafen", wohnflaeche: 160, grundflaeche: 900, baujahr: 1970, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 300 },
);
check("F8 EFH Ludwigshafen-Rand 160/900 (BRW 300)", f8.mid, 440_000, 510_000);

/* F9 — MFH LEERSTEHEND (Rückfrage Manfred): ohne Mieteinnahmen ergab der
   Ertragswert-Zweig früher 0 €. Jetzt setzt die Engine für die leere Fläche
   eine marktübliche Miete an (LU: 2.850/380 = 7,50 €/m²) und zieht 8 %
   Leerstandsabschlag ab: 400 m² × 7,50 × 12 = 36.000 € × 14,8 × 0,92. */
const f9 = run({
  objektart: "mehrfamilienhaus",
  ort: "Ludwigshafen",
  wohnflaeche: 400,
  vermietungsstand: "leer",
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
check("F9 MFH Ludwigshafen 400 m² LEER (ohne Mietangabe)", f9.mid, 460_000, 520_000);
if (f9.mid <= 0) {
  failures++;
  console.log("❌ F9: leerstehendes MFH muss einen Preis liefern (war 0 €)");
}
if (f9.mietAnsatz?.abschlagPct !== 8 || f9.mietAnsatz?.istMiete !== 0) {
  failures++;
  console.log(`❌ F9 MietAnsatz: ${JSON.stringify(f9.mietAnsatz)} (erwartet abschlagPct 8, istMiete 0)`);
}

/* F10 — MFH TEILWEISE vermietet: Ist-Miete plus Marktmiete der leeren Fläche,
   Abschlag nur anteilig (100 von 400 m² leer → 2 %). */
const f10 = run({
  objektart: "mehrfamilienhaus",
  ort: "Ludwigshafen",
  wohnflaeche: 400,
  jahresnettokaltmiete: 27_000,
  vermietungsstand: "teilweise",
  leerstehendeWohnflaeche: 100,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
if (f10.mietAnsatz?.abschlagPct !== 2) {
  failures++;
  console.log(`❌ F10 Abschlag: ${f10.mietAnsatz?.abschlagPct} % (erwartet 2 %)`);
}
if (f10.mietAnsatz?.ansatzMiete !== 27_000 + 9_000) {
  failures++;
  console.log(`❌ F10 Ansatzmiete: ${f10.mietAnsatz?.ansatzMiete} (erwartet 36.000)`);
}
// Teilleerstand muss zwischen Vollvermietung und Vollleerstand liegen.
const f10voll = run({
  objektart: "mehrfamilienhaus",
  ort: "Ludwigshafen",
  wohnflaeche: 400,
  jahresnettokaltmiete: 36_000,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
if (!(f9.mid < f10.mid && f10.mid < f10voll.mid)) {
  failures++;
  console.log(`❌ Invariante Leerstand: leer ${f9.mid} < teilweise ${f10.mid} < vermietet ${f10voll.mid} verletzt`);
}

/* F11 — Rückwärtskompatibilität: "vermietet" explizit === ohne Angabe. */
const f11 = run({
  objektart: "mehrfamilienhaus",
  ort: "Speyer",
  jahresnettokaltmiete: 60_000,
  vermietungsstand: "vermietet",
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
if (f11.mid !== f4.mid) {
  failures++;
  console.log(`❌ F11: "vermietet" (${f11.mid}) muss F4 ohne Angabe (${f4.mid}) entsprechen`);
}

/* F12 — Gewerbe mit Hallenanteil (Hinweis Manfred: Bürogebäude mit Halle).
   900 m² gesamt, davon 600 m² Halle → Halle zählt nur mit 45 % des
   Büro-Satzes. Muss deutlich unter der reinen Büro-Bewertung liegen. */
const f12buero = run({
  objektart: "gewerbe",
  ort: "Ludwigshafen",
  wohnflaeche: 900,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
const f12halle = run({
  objektart: "gewerbe",
  ort: "Ludwigshafen",
  wohnflaeche: 900,
  hallenflaeche: 600,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
if (!(f12halle.mid < f12buero.mid)) {
  failures++;
  console.log(`❌ F12: Hallenanteil muss den Wert senken (${f12halle.mid} vs. ${f12buero.mid})`);
}
check("F12 Gewerbe 900 m², davon 600 m² Halle", f12halle.mid, 1_000_000, 1_400_000);
// Ohne Hallenangabe muss exakt wie zuvor gerechnet werden (keine Regression).
const f12ohne = run({
  objektart: "gewerbe",
  ort: "Ludwigshafen",
  wohnflaeche: 900,
  hallenflaeche: 0,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
});
if (f12ohne.mid !== f12buero.mid) {
  failures++;
  console.log(`❌ F12: hallenflaeche 0 muss wie ohne Angabe rechnen (${f12ohne.mid} vs. ${f12buero.mid})`);
}

/* F13 — Gewerbe MIT Grundstück (Freigabe Alex): Betriebsgrundstücke waren
   bisher wertlos in der Rechnung. 2.000 m² bei BRW 300 → 1.500 m² voll zu
   70 %, 500 m² zu 45 %. Muss deutlich über der Bewertung ohne Grundstück
   liegen, aber unter BRW × Gesamtfläche (Staffel greift). */
const f13ohne = run(
  { objektart: "gewerbe", ort: "Ludwigshafen", wohnflaeche: 900, zustand: "gepflegt", qualitaet: "normal", ausstattung: [] },
  { bodenrichtwert: 300 },
);
const f13mit = run(
  {
    objektart: "gewerbe",
    ort: "Ludwigshafen",
    wohnflaeche: 900,
    grundflaeche: 2000,
    zustand: "gepflegt",
    qualitaet: "normal",
    ausstattung: [],
  },
  { bodenrichtwert: 300 },
);
if (!(f13mit.mid > f13ohne.mid)) {
  failures++;
  console.log(`❌ F13: Grundstück muss den Gewerbewert erhöhen (${f13mit.mid} vs. ${f13ohne.mid})`);
}
const f13anr = f13mit.grundstuecksAnrechnung;
if (!f13anr || f13anr.wert >= 300 * 2000) {
  failures++;
  console.log(`❌ F13: Staffel muss unter BRW × Fläche liegen (${f13anr?.wert} vs. ${300 * 2000})`);
}
// Gebäude ca. 1,47 Mio. € (1.628 €/m² × 900) + Grundstück 382.500 €
// (1.500 × 0,7 × 300 plus 500 × 0,45 × 300).
check("F13 Gewerbe 900 m² + 2.000 m² Grundstück (BRW 300)", f13mit.mid, 1_780_000, 1_920_000);

/* F14 — Mischobjekt (Hinweis Manfred: Halle, zwei Wohnungen und Büro im
   Keller auf 1.692 m² Grundstück — Misch-/Dorfgebiet). 1.000 m² Nutzfläche:
   600 m² Halle, 160 m² Wohnen (zwei Wohnungen), 240 m² Büro. Der Wohnanteil
   muss den Wert GEGENÜBER derselben Fläche als Büro anheben (Wohnungs-Satz
   liegt in jeder Region über dem Büro-Satz), und die Aufteilung muss offen
   im Ergebnis stehen. */
const f14basis = {
  ort: "Speyer",
  wohnflaeche: 1000,
  hallenflaeche: 600,
  grundflaeche: 1692,
  zustand: "gepflegt" as const,
  qualitaet: "normal" as const,
  ausstattung: [] as string[],
};
const f14ohneWohnen = run({ objektart: "gewerbe", ...f14basis }, { bodenrichtwert: 300 });
const f14 = run({ objektart: "gewerbe", ...f14basis, mischWohnflaeche: 160 }, { bodenrichtwert: 300 });
if (!(f14.mid > f14ohneWohnen.mid)) {
  failures++;
  console.log(`❌ F14: Wohnanteil muss den Wert anheben (${f14.mid} vs. ${f14ohneWohnen.mid})`);
}
const f14a = f14.flaechenAufteilung;
if (!f14a || f14a.bueroM2 !== 240 || f14a.halleM2 !== 600 || f14a.wohnM2 !== 160) {
  failures++;
  console.log(`❌ F14: Aufteilung falsch (${JSON.stringify(f14a)})`);
}
if (f14a && !(f14a.wohnSatz > f14a.bueroSatz && f14a.bueroSatz > f14a.halleSatz)) {
  failures++;
  console.log(`❌ F14: Satz-Ordnung Wohnen > Büro > Halle verletzt (${JSON.stringify(f14a)})`);
}
// Wohnsatz Speyer: 3.950 × Lagefaktor √(300/590) geklemmt auf 0,72 → 0,72,
// × 0,9 Misch-Dämpfung ≈ 2.560 €/m². Zum Vergleich Büro ≈ 1.765, Halle ≈ 794.
// Gesamt: Büro 424 Tsd. + Halle 476 Tsd. + Wohnen 410 Tsd. + Grundstück
// (1.500 × 0,7 × 300 + 192 × 0,45 × 300 ≈ 341 Tsd.) ≈ 1,65 Mio. €.
check("F14 Mischobjekt Halle + Wohnungen + Büro + 1.692 m²", f14.mid, 1_550_000, 1_750_000);
// Rückwärtskompatibilität: mischWohnflaeche 0 muss exakt wie ohne Angabe rechnen.
const f14null = run({ objektart: "gewerbe", ...f14basis, mischWohnflaeche: 0 }, { bodenrichtwert: 300 });
if (f14null.mid !== f14ohneWohnen.mid) {
  failures++;
  console.log(`❌ F14: mischWohnflaeche 0 muss wie ohne Angabe rechnen (${f14null.mid} vs. ${f14ohneWohnen.mid})`);
}

/* Invarianten. */
for (const [name, r] of [["F1", f1], ["F2", f2], ["F3", f3], ["F4", f4], ["F5", f5], ["F8", f8], ["F9", f9], ["F10", f10]] as const) {
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
console.log(
  `Details F9 (leer): Marktmiete ${f9.mietAnsatz?.marktmieteM2} €/m²/Monat → ${nf.format(f9.mietAnsatz?.marktmieteGeschaetzt ?? 0)} €/Jahr, Abschlag ${f9.mietAnsatz?.abschlagPct} % → ${nf.format(f9.mid)} € (${nf.format(f9.pricePerSqm ?? 0)} €/m²)`,
);
console.log(
  `Details F10 (teilweise): Ist ${nf.format(f10.mietAnsatz?.istMiete ?? 0)} € + Markt ${nf.format(f10.mietAnsatz?.marktmieteGeschaetzt ?? 0)} € = ${nf.format(f10.mietAnsatz?.ansatzMiete ?? 0)} €, Abschlag ${f10.mietAnsatz?.abschlagPct} % → ${nf.format(f10.mid)} €`,
);

/* F15 — Der Fall „Landauer Warte" (Manfred, 11.08.2026): Wohnung Speyer,
 * 105 m², Bj. 1972, vom Eigentümer als „neuwertig" (renoviert) eingegeben,
 * 700 € Hausgeld, BRW 790 (Zone 0602), 4 Ausstattungsmerkmale. Alt: 473.000 €
 * (4.501 €/m²) — weit über jedem echten Abschluss vor Ort; realistisch laut
 * Manfred 300–350 Tsd. Neu müssen VIER Erdungen greifen: neuwertig→gepflegt
 * (ohne Kernsanierung), Energie-Annahme E, BRW-Obergrenze 1,06 statt 1,15,
 * Hausgeld-Abschlag — plus p75-Deckel, sobald ortsStats vorliegen. */
const manne: ValuationInput = {
  objektart: "wohnung",
  ort: "Speyer",
  wohnflaeche: 105,
  zimmer: 3,
  baujahr: 1972,
  zustand: "neuwertig",
  qualitaet: "normal",
  hausgeldMonat: 700,
  ausstattung: ["Balkon / Terrasse", "Gäste-WC", "Garage / Stellplatz", "Keller"],
};
const f15 = run(manne, { bodenrichtwert: 790 });
check("F15 Fall Manfred ohne ortsStats (Modell geerdet)", f15.mid, 300_000, 360_000);
if (f15.annahmen.length < 2) {
  failures++;
  console.log(`❌ F15: Annahmen (neuwertig-Erdung + Energie-Annahme) müssen ausgewiesen sein (${f15.annahmen.length})`);
}
// Mit echten Orts-Abschlüssen (die 5 Vergleichsobjekte aus Mannes Report:
// Median 3.594, p75 3.688 €/m²): Deckel darf NICHT unter dem geerdeten
// Modellwert kappen, wenn der schon drunter liegt — und comparables = n.
const f15s = run(manne, { bodenrichtwert: 790, ortsStats: { n: 5, medianQm: 3594, p75Qm: 3688 } });
check("F15b Fall Manfred mit ortsStats", f15s.mid, 300_000, Math.round(3688 * 105 * 1.001));
if (f15s.comparables !== 5) {
  failures++;
  console.log(`❌ F15b: comparables muss die echte Abschlusszahl sein (${f15s.comparables})`);
}
// Kernsaniert + Energieausweis D und OHNE Hausgeld-Last: jetzt darf
// „neuwertig" voll zählen und das Modell klettert über p75 — der Deckel
// muss exakt auf p75 × Fläche kappen (3.688 × 105 = 387.240 → 387.000)
// und den Eingriff als `plausibilisierung` ausweisen. (Mit den 700 €
// Hausgeld bleibt der Wert von selbst unter dem Deckel — F15b.)
const f15k = run(
  { ...manne, hausgeldMonat: undefined, kernsaniert: true, energieklasse: "D" },
  { bodenrichtwert: 790, ortsStats: { n: 5, medianQm: 3594, p75Qm: 3688 } },
);
check("F15c kernsaniert + Energie D, ohne Hausgeld (p75-Deckel greift)", f15k.mid, 387_000, 387_000);
if (!f15k.plausibilisierung) {
  failures++;
  console.log("❌ F15c: Plausibilisierung muss ausgewiesen sein, wenn der Deckel greift");
}

/* F16 — Determinismus-Anker: identische Eingabe ⇒ identisches Ergebnis
 * (die Kennzahlen waren bis 11.08.2026 Math.random — der Kunde bekam bei
 * jedem Aufruf andere „Vergleichsobjekte"/„Konfidenz"). */
const f16a = run(manne, { bodenrichtwert: 790 });
const f16b = run(manne, { bodenrichtwert: 790 });
if (
  f16a.comparables !== f16b.comparables ||
  f16a.confidence !== f16b.confidence ||
  f16a.trendPct !== f16b.trendPct ||
  f16a.mikrolage !== f16b.mikrolage ||
  f16a.rentYieldPct !== f16b.rentYieldPct
) {
  failures++;
  console.log("❌ F16: Kennzahlen müssen deterministisch sein");
} else {
  console.log("✅ F16 Kennzahlen deterministisch (kein Math.random mehr)");
}

console.log(
  `Details F15: mid ${nf.format(f15.mid)} € (${nf.format(f15.pricePerSqm ?? 0)} €/m²), Konfidenz ${f15.confidence} %, Annahmen: ${f15.annahmen.length}`,
);
console.log(`Details F15c: mid ${nf.format(f15k.mid)} €, Deckel p75 ${nf.format(f15k.plausibilisierung?.p75Qm ?? 0)} €/m² (n=${f15k.plausibilisierung?.n}), Modell davor ${nf.format(f15k.plausibilisierung?.modellMid ?? 0)} €`);

if (failures > 0) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle Prüfungen grün.");

/**
 * Offline-Testscript für den PDF-Marktwert-Report — OHNE Netz, OHNE Server,
 * OHNE Next-Build: ruft buildReportPdf() direkt mit drei synthetischen
 * Fixtures auf (Haus mit vollen Feldern, Mehrfamilienhaus im Ertragswert-
 * Ansatz, Wohnung ohne Preisatlas-Stadt-Treffer) und schreibt die erzeugten
 * PDFs zur Sichtprüfung in den Scratchpad. Prüft: kein Throw, Dateigröße,
 * Seitenzahl (via PDFDocument.load — dient hier nur der Verifikation, keine
 * neue Laufzeit-Abhängigkeit).
 *
 *   npx tsx scripts/preview-report.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { buildReportPdf, type ReportData } from "../src/lib/report-pdf";
import { buildReportContext } from "../src/lib/report-context";
import { estimateValue } from "../src/lib/valuation";
import type { ReportVergleichsObjekt } from "../src/lib/report-objekte";

const OUT_DIR = "/tmp/claude-0/-home-user-riegel/93995920-053c-5324-b000-7153d2fd2ad6/scratchpad/report-preview";

const dateLabel = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

// ── Fixture 1: Haus in Speyer, alle Felder gefüllt (Faktoren-Wasserfall,
//    amtlicher Bodenrichtwert, Ausstattungs-Chips, fünf Referenzobjekte OHNE
//    Foto — testet den SURFACE-Fallback statt eines eingebetteten Bilds sowie
//    die volle Belegung der Referenzseite, REFERENZ_MAX in lib/report-pdf.ts). ──
const vergleichsobjekteHaus: ReportVergleichsObjekt[] = [
  { titel: "Gepflegtes Einfamilienhaus mit Garten", ort: "67346 Speyer", preis: "745.000 € · Kaufpreis", flaeche: "155 m²", zimmer: "5 Zimmer", vermittelt: true, einordnung: "vergleich", distanzKm: 1 },
  { titel: "Freistehendes Haus in ruhiger Wohnlage", ort: "67346 Speyer", preis: "812.000 € · Kaufpreis", flaeche: "172 m²", zimmer: "6 Zimmer", vermittelt: false, einordnung: "vergleich", distanzKm: 3 },
  { titel: "Saniertes Haus nahe Dom", ort: "67346 Speyer", flaeche: "148 m²", zimmer: "5 Zimmer", vermittelt: false, einordnung: "vergleich", distanzKm: 2 },
  { titel: "Doppelhaushälfte mit Garage und Südterrasse in gewachsener Wohnlage", ort: "67354 Römerberg", preis: "589.000 € · Kaufpreis", flaeche: "141 m²", zimmer: "5 Zimmer", vermittelt: true, einordnung: "vergleich", distanzKm: 7 },
  { titel: "Reihenmittelhaus", ort: "67373 Dudenhofen", preis: "425.000 € · Kaufpreis", flaeche: "119 m²", zimmer: "4 Zimmer", vermittelt: true, einordnung: "referenz", distanzKm: 9 },
];

const hausFixture: ReportData = {
  name: "Familie Weber",
  address: "Musterstraße 12, 67346 Speyer",
  city: "Speyer",
  postcode: "67346",
  objektartLabel: "Haus",
  wohnflaeche: 160,
  grundflaeche: 420,
  zimmer: 6,
  baujahr: 1996,
  zustand: "gepflegt",
  qualitaet: "gehoben",
  energieklasse: "C",
  ausstattung: ["Balkon", "Garage", "Garten"],
  factors: [
    { label: "Zustand", effectPct: 5 },
    { label: "Ausstattungsqualität", effectPct: 8 },
    { label: "Baujahr", effectPct: -3 },
    { label: "Energieeffizienz", effectPct: 4 },
    { label: "Marktoptimismus", effectPct: 3 },
  ],
  context: buildReportContext({ city: "Speyer" }),
  vergleichsobjekte: vergleichsobjekteHaus,
  // Annahmen-Block (11.08.2026): prüft das Rendering der Modell-Annahmen auf
  // der Preis-Zusammensetzungs-Seite (Zeilenumbruch + Stapelung überm Disclaimer).
  annahmen: [
    `Zustand „neuwertig" bei Baujahr 1972 ohne Kernsanierung: als „gepflegt" gewertet. Mit Kernsanierung (Elektrik, Leitungen, Fenster, Heizung) gilt der volle Zustands-Bonus.`,
    `Modellwert an der Realität geerdet: 5 echte Verkäufe in Speyer (OnOffice) erzielten bis 3.688 €/m² im oberen Viertel — der Report bleibt innerhalb dieses belegten Niveaus.`,
  ],
  value: {
    low: 725_000,
    mid: 780_000,
    high: 866_000,
    pricePerSqm: 4875,
    comparables: 62,
    trendPct: 4.2,
    mikrolage: 8.4,
    confidence: 91,
  },
  dateLabel,
  bodenrichtwert: { brw: 590, zone: "Sp-12", stichtag: "01.01.2026" },
};

// ── Fixture 2: Mehrfamilienhaus in Ludwigshafen — Ertragswert-Ansatz statt
//    Faktoren-Wasserfall (factors: []), Einheiten-Mix-Balken, kein Foto-Set. ──
const mfhFixture: ReportData = {
  name: "Herr Dr. Becker",
  address: "Bismarckstraße 44, 67059 Ludwigshafen",
  city: "Ludwigshafen",
  postcode: "67059",
  objektartLabel: "Mehrfamilienhaus",
  wohnflaeche: 680,
  baujahr: 1978,
  zustand: "gepflegt",
  qualitaet: "normal",
  jahresnettokaltmiete: 96_000,
  wohneinheiten: 8,
  gewerbeeinheiten: 1,
  factors: [],
  // lat/lng mitgeben: der Geo-Artikel führt den Ort als "Ludwigshafen am
  // Rhein" (exaktes Namens-Matching in marktortByOrt schlägt sonst fehl) —
  // mit Koordinaten greift der Distanz-Teiltreffer, genau wie im echten
  // Rechner-Flow (OSM liefert i. d. R. nur "Ludwigshafen").
  context: buildReportContext({ city: "Ludwigshafen", lat: 49.4774, lng: 8.4452 }),
  value: {
    low: 1_390_000,
    mid: 1_488_000,
    high: 1_595_000,
    comparables: 24,
    trendPct: 3.6,
    mikrolage: 7.1,
    confidence: 87,
    vervielfaeltiger: 15.5,
  },
  dateLabel,
};

// ── Fixture 3: Wohnung ohne Preisatlas-Stadt-Treffer (Buxtehude liegt weit
//    außerhalb der RIEGEL-Marktregion) — context.markt/standortText fehlen,
//    context.stats/usps bleiben aber immer gesetzt (buildReportContext wirft
//    nie). Muss mit ≤ 7 Seiten sauber durchlaufen (S4 "Ihr Markt" entfällt). ──
const ohneKontextFixture: ReportData = {
  name: "Frau Ottersen",
  address: "Lindenweg 3, 21614 Buxtehude",
  city: "Buxtehude",
  postcode: "21614",
  objektartLabel: "Wohnung",
  wohnflaeche: 82,
  zimmer: 3,
  baujahr: 2004,
  zustand: "neuwertig",
  qualitaet: "normal",
  energieklasse: "B",
  ausstattung: ["Balkon", "Aufzug"],
  factors: [
    { label: "Zustand", effectPct: 4 },
    { label: "Energieeffizienz", effectPct: 2 },
    { label: "Marktoptimismus", effectPct: 3 },
  ],
  context: buildReportContext({ city: "Buxtehude" }),
  value: {
    low: 289_000,
    mid: 311_000,
    high: 342_000,
    pricePerSqm: 3793,
    comparables: 18,
    trendPct: 2.9,
    mikrolage: 6.8,
    confidence: 82,
  },
  dateLabel,
};

// ── Fixture 4: LEERSTEHENDES Mehrfamilienhaus (Rückfrage Manfred) — keine
//    Mieteinnahmen, die Engine setzt die marktübliche Miete selbst an. Werte
//    bewusst NICHT handgeschrieben, sondern aus estimateValue() gezogen, damit
//    das PDF genau das zeigt, was der Rechner rechnet. ──
const leerCalc = estimateValue({
  objektart: "mehrfamilienhaus",
  ort: "Ludwigshafen",
  wohnflaeche: 420,
  vermietungsstand: "leer",
  zustand: "renovierungsbeduerftig",
  qualitaet: "normal",
  ausstattung: [],
});
const mfhLeerFixture: ReportData = {
  name: "Herr Riegel",
  address: "Beispielstraße 7, 67059 Ludwigshafen",
  city: "Ludwigshafen",
  postcode: "67059",
  objektartLabel: "Mehrfamilienhaus",
  wohnflaeche: 420,
  baujahr: 1965,
  zustand: "renovierungsbedürftig",
  qualitaet: "normal",
  // Keine jahresnettokaltmiete: das Haus steht leer — genau der Fall, der
  // vorher 0 € ergab.
  wohneinheiten: 6,
  factors: [],
  context: buildReportContext({ city: "Ludwigshafen", lat: 49.4774, lng: 8.4452 }),
  value: {
    low: leerCalc.low,
    mid: leerCalc.mid,
    high: leerCalc.high,
    pricePerSqm: leerCalc.pricePerSqm,
    comparables: leerCalc.comparables,
    trendPct: leerCalc.trendPct,
    mikrolage: leerCalc.mikrolage,
    confidence: leerCalc.confidence,
    vervielfaeltiger: leerCalc.vervielfaeltiger,
    mietAnsatz: leerCalc.mietAnsatz,
  },
  dateLabel,
};

// ── Fixture 5: Gewerbe-MISCHOBJEKT (Hinweis Manfred): Halle, zwei Wohnungen
//    und Büro im Keller auf 1.692 m² Grundstück. Werte aus estimateValue()
//    gezogen, damit PDF und Rechner dieselbe Aufteilung zeigen. ──
const mischCalc = estimateValue(
  {
    objektart: "gewerbe",
    ort: "Speyer",
    wohnflaeche: 1000,
    hallenflaeche: 600,
    mischWohnflaeche: 160,
    grundflaeche: 1692,
    baujahr: 1988,
    zustand: "gepflegt",
    qualitaet: "normal",
    ausstattung: [],
  },
  { bodenrichtwert: 300 },
);
const mischFixture: ReportData = {
  name: "Herr Manfred Muster",
  address: "Gewerbering 3, 67346 Speyer",
  city: "Speyer",
  postcode: "67346",
  objektartLabel: "Gewerbe",
  wohnflaeche: 1000,
  hallenflaeche: 600,
  mischWohnflaeche: 160,
  grundflaeche: 1692,
  baujahr: 1988,
  zustand: "gepflegt",
  qualitaet: "normal",
  ausstattung: [],
  factors: mischCalc.factors,
  context: buildReportContext({ city: "Speyer" }),
  value: {
    low: mischCalc.low,
    mid: mischCalc.mid,
    high: mischCalc.high,
    pricePerSqm: mischCalc.pricePerSqm,
    comparables: mischCalc.comparables,
    trendPct: mischCalc.trendPct,
    mikrolage: mischCalc.mikrolage,
    confidence: mischCalc.confidence,
    grundstuecksAnrechnung: mischCalc.grundstuecksAnrechnung,
    flaechenAufteilung: mischCalc.flaechenAufteilung,
  },
  dateLabel,
  bodenrichtwert: { brw: 300, zone: "Sp-Gew-4", stichtag: "01.01.2026" },
};

async function run(name: string, fixture: ReportData) {
  const pdfBase64 = await buildReportPdf(fixture);
  const bytes = Buffer.from(pdfBase64, "base64");
  const outPath = `${OUT_DIR}/${name}`;
  await writeFile(outPath, bytes);
  const doc = await PDFDocument.load(bytes);
  const pageCount = doc.getPageCount();
  console.log(
    JSON.stringify({
      file: name,
      bytes: bytes.length,
      pages: pageCount,
      hasMarkt: Boolean(fixture.context?.markt),
      hasVergleich: Boolean(fixture.vergleichsobjekte?.length),
    }),
  );
  if (bytes.length <= 50_000) throw new Error(`${name}: PDF verdächtig klein (${bytes.length} Bytes) — Rendering vermutlich unvollständig.`);
  return pageCount;
}

await mkdir(OUT_DIR, { recursive: true });

const results = await Promise.all([
  run("haus.pdf", hausFixture),
  run("mfh.pdf", mfhFixture),
  run("ohne-kontext.pdf", ohneKontextFixture),
  run("mfh-leerstand.pdf", mfhLeerFixture),
  run("mischobjekt.pdf", mischFixture),
]);

// Kern des Hinweises Manfred (Mischgebiet): die drei Flächenarten müssen
// getrennt und in der richtigen Satz-Ordnung bewertet sein.
const fa = mischCalc.flaechenAufteilung;
if (!fa || !(fa.wohnSatz > fa.bueroSatz && fa.bueroSatz > fa.halleSatz)) {
  throw new Error(`mischobjekt: Aufteilung fehlt oder Satz-Ordnung verletzt (${JSON.stringify(fa)})`);
}
console.log(
  `Misch-Fixture: Büro ${fa.bueroM2} m² à ${fa.bueroSatz} € + Halle ${fa.halleM2} m² à ${fa.halleSatz} € + Wohnen ${fa.wohnM2} m² à ${fa.wohnSatz} € → ${mischCalc.mid.toLocaleString("de-DE")} €`,
);

if (results[2] > 7) {
  throw new Error(`ohne-kontext.pdf hat ${results[2]} Seiten — erwartet ≤ 7 (Ihr-Markt-Seite muss ohne Stadt-Treffer entfallen).`);
}

// Kern der Rückfrage Manfred: ein leerstehendes MFH muss einen Preis liefern.
if (!leerCalc.mid || leerCalc.mid <= 0) {
  throw new Error("mfh-leerstand: Engine liefert 0 € — Leerstands-Ansatz greift nicht.");
}
console.log(
  `Leerstand-Fixture: ${leerCalc.mietAnsatz?.marktmieteM2} €/m²/Monat angesetzt → ${leerCalc.mid.toLocaleString("de-DE")} € (${leerCalc.pricePerSqm} €/m², −${leerCalc.mietAnsatz?.abschlagPct} %)`,
);

console.log("OK — alle vier Fixtures ohne Throw durchgelaufen.");

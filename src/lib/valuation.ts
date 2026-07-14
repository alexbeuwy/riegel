/**
 * Bewertungs-Engine v2 (heuristisch, regionale €/m²-Basis + viele Faktoren).
 * Bewusst leicht höher angesetzt (Verkaufsargument); klar als Schätzung
 * deklariert — KEIN Verkehrswertgutachten. Client-seitig.
 */
export type Objektart = "wohnung" | "haus" | "grundstueck" | "gewerbe" | "mehrfamilienhaus";
export type Zustand = "neuwertig" | "gepflegt" | "renovierungsbeduerftig";
export type Qualitaet = "einfach" | "normal" | "gehoben" | "luxus";

export interface ValuationInput {
  objektart: Objektart;
  ort: string;
  plz?: string;
  addressLabel?: string;
  lat?: number;
  lng?: number;
  wohnflaeche?: number;
  grundflaeche?: number;
  zimmer?: number;
  badezimmer?: number;
  baujahr?: number;
  zustand: Zustand;
  qualitaet: Qualitaet;
  energieklasse?: string;
  ausstattung: string[];
  /**
   * Nur für objektart === "mehrfamilienhaus" (Zinshaus/Mehrparteienhaus):
   * Ertragswert-Eingaben statt reiner Flächen-Rechnung — s. estimateValue.
   */
  jahresnettokaltmiete?: number;
  wohneinheiten?: number;
  gewerbeeinheiten?: number;
}

export interface ValuationFactor {
  label: string;
  effectPct: number; // +/- in %
}

export interface ValuationResult {
  low: number;
  mid: number;
  high: number;
  /** Bei "mehrfamilienhaus" nur gesetzt, wenn wohnflaeche vorliegt (mid / wohnflaeche) —
   * ein Ertragswert hat keinen zwingenden €/m²-Bezug. Sonst immer gesetzt. */
  pricePerSqm?: number;
  comparables: number;
  confidence: number;
  trendPct: number;
  bodenrichtwert: number;
  mikrolage: number;
  rentYieldPct: number;
  /** Ertragswert-Vervielfältiger (Jahresnettokaltmiete × Vervielfältiger = Ertragswert),
   * nur bei objektart === "mehrfamilienhaus" gesetzt — s. mfhVervielfaeltiger(). */
  vervielfaeltiger?: number;
  factors: ValuationFactor[];
}

const REGIONS: Record<string, { wohnung: number; haus: number; gewerbe: number; boden: number }> = {
  speyer: { wohnung: 3950, haus: 3800, gewerbe: 2450, boden: 590 },
  ludwigshafen: { wohnung: 2850, haus: 2700, gewerbe: 1950, boden: 430 },
  schifferstadt: { wohnung: 3200, haus: 3050, gewerbe: 1900, boden: 410 },
  frankenthal: { wohnung: 3050, haus: 2900, gewerbe: 1850, boden: 415 },
  neustadt: { wohnung: 3550, haus: 3400, gewerbe: 2050, boden: 490 },
  mannheim: { wohnung: 3800, haus: 3600, gewerbe: 2550, boden: 570 },
  heidelberg: { wohnung: 5000, haus: 4700, gewerbe: 3050, boden: 860 },
  vorderpfalz: { wohnung: 3350, haus: 3200, gewerbe: 1900, boden: 390 },
};
const DEFAULT_REGION = { wohnung: 3350, haus: 3200, gewerbe: 1900, boden: 400 };

const ZUSTAND_FACTOR: Record<Zustand, number> = {
  neuwertig: 1.12,
  gepflegt: 1.0,
  renovierungsbeduerftig: 0.84,
};
const QUALITAET_FACTOR: Record<Qualitaet, number> = {
  einfach: 0.9,
  normal: 1.0,
  gehoben: 1.12,
  luxus: 1.25,
};
const ENERGIE_FACTOR: Record<string, number> = {
  "A+": 1.06, A: 1.05, B: 1.03, C: 1.0, D: 0.98, E: 0.96, F: 0.93, G: 0.9, H: 0.88,
};

function baujahrFactor(y?: number): number {
  if (!y) return 1.0;
  if (y >= 2015) return 1.1;
  if (y >= 2000) return 1.04;
  if (y >= 1980) return 0.98;
  if (y >= 1960) return 0.92;
  return 0.88;
}

const OPTIMISM = 1.06;

/**
 * Deterministischer Regio-Ansatz für die Mietrendite (Basis für den
 * Ertragswert-Vervielfältiger bei Mehrfamilienhäusern) — sinkt mit
 * steigendem €/m²-Wohnungs-Niveau der Region, dasselbe Muster wie
 * yieldFor() in lib/marktdaten.ts. Bewusst hier lokal nachgebildet statt
 * importiert: marktdaten.ts importiert bereits regionKey() von hier, ein
 * Rückimport würde einen Zirkelbezug erzeugen.
 */
function regionalRentYieldPct(basisWohnung: number): number {
  const raw = 6.4 - (basisWohnung / 1000) * 0.62;
  return Math.min(5.2, Math.max(2.6, raw));
}

/**
 * Ertragswert-Vervielfältiger (Jahresnettokaltmiete × Vervielfältiger ≈
 * Ertragswert) — grobe Heuristik aus 100 / Mietrendite, auf eine für
 * Zinshäuser plausible Bandbreite gedeckelt. Ersetzt KEINE echte
 * Ertragswertermittlung (Bewirtschaftungskosten, Liegenschaftszins etc.).
 */
function mfhVervielfaeltiger(basisWohnung: number): number {
  const v = 100 / regionalRentYieldPct(basisWohnung);
  return Math.round(Math.min(30, Math.max(18, v)) * 10) / 10;
}

export function regionKey(ort: string): string {
  const o = (ort || "").toLowerCase();
  for (const k of Object.keys(REGIONS)) if (o.includes(k)) return k;
  if (o.includes("pfalz")) return "vorderpfalz";
  return "";
}

export interface EstimateOptions {
  /**
   * Amtlicher Bodenrichtwert (€/m², z. B. von BORIS-RLP), ersetzt den
   * regionalen Modellwert `r.boden` in der Grundstücks-/Haus-Bodenanteil-
   * Rechnung UND im zurückgegebenen `bodenrichtwert`-Feld. Optional —
   * bestehende Aufrufe ohne `opts` bleiben unverändert gültig.
   */
  bodenrichtwert?: number;
}

export function estimateValue(input: ValuationInput, opts?: EstimateOptions): ValuationResult {
  const r = REGIONS[regionKey(input.ort)] ?? DEFAULT_REGION;
  const boden = opts?.bodenrichtwert ?? r.boden;
  const ausstBonus = Math.min(input.ausstattung.length * 0.012, 0.08);
  const bf = baujahrFactor(input.baujahr);
  const zf = ZUSTAND_FACTOR[input.zustand];
  const qf = QUALITAET_FACTOR[input.qualitaet];
  const ef = input.energieklasse ? ENERGIE_FACTOR[input.energieklasse] ?? 1.0 : 1.0;

  let pricePerSqm: number | undefined;
  let mid: number;
  let vervielfaeltiger: number | undefined;

  if (input.objektart === "grundstueck") {
    pricePerSqm = Math.round(boden * (1 + ausstBonus) * OPTIMISM);
    mid = pricePerSqm * (input.grundflaeche ?? 0);
  } else if (input.objektart === "mehrfamilienhaus") {
    // Ertragswert-Ansatz statt Flächen-Rechnung: Jahresnettokaltmiete ×
    // Vervielfältiger (~ 100 / regionale Mietrendite, gedeckelt 18–30) — s.
    // mfhVervielfaeltiger(). Zustand/Qualität/Energie fließen bewusst NICHT
    // ein (kein Schein-Präzisions-Zuschlag auf eine Ertragswertschätzung,
    // die primär mietbasiert ist); die Werttreiber-Faktoren unten bleiben
    // deshalb für diesen Objekttyp leer.
    const miete = Math.max(0, input.jahresnettokaltmiete ?? 0);
    vervielfaeltiger = mfhVervielfaeltiger(r.wohnung);
    mid = miete * vervielfaeltiger;
    pricePerSqm = input.wohnflaeche ? Math.round(mid / input.wohnflaeche) : undefined;
  } else {
    const base = input.objektart === "haus" ? r.haus : input.objektart === "gewerbe" ? r.gewerbe : r.wohnung;
    pricePerSqm = Math.round(base * zf * bf * qf * ef * (1 + ausstBonus) * OPTIMISM);
    mid = pricePerSqm * (input.wohnflaeche ?? 0);
    if (input.objektart === "haus" && input.grundflaeche) {
      mid += Math.round(boden * 0.6 * input.grundflaeche);
    }
  }

  const round = (n: number) => Math.round(n / 1000) * 1000;
  const pct = (x: number) => Math.round((x - 1) * 100);

  const factors: ValuationFactor[] =
    input.objektart === "mehrfamilienhaus"
      ? []
      : [
          { label: "Zustand", effectPct: pct(zf) },
          { label: "Ausstattungsqualität", effectPct: pct(qf) },
          { label: "Baujahr", effectPct: pct(bf) },
          { label: "Energieeffizienz", effectPct: pct(ef) },
          { label: "Ausstattung", effectPct: Math.round(ausstBonus * 100) },
          { label: "Marktoptimismus", effectPct: pct(OPTIMISM) },
        ].filter((x) => x.effectPct !== 0);

  return {
    low: round(mid * 0.93),
    mid: round(mid),
    high: round(mid * 1.11),
    pricePerSqm,
    comparables: 48 + Math.floor(Math.random() * 110),
    confidence: 85 + Math.floor(Math.random() * 11),
    trendPct: Math.round((3 + Math.random() * 3.6) * 10) / 10,
    bodenrichtwert: boden,
    mikrolage: Math.round((7.2 + Math.random() * 2.4) * 10) / 10,
    rentYieldPct: Math.round((2.8 + Math.random() * 1.6) * 10) / 10,
    vervielfaeltiger,
    factors,
  };
}

export const QUALITAETEN: { key: Qualitaet; label: string }[] = [
  { key: "einfach", label: "Einfach" },
  { key: "normal", label: "Normal" },
  { key: "gehoben", label: "Gehoben" },
  { key: "luxus", label: "Luxuriös" },
];

export const AUSSTATTUNG_OPTIONEN = [
  "Balkon / Terrasse",
  "Garten",
  "Einbauküche",
  "Fußbodenheizung",
  "Aufzug",
  "Garage / Stellplatz",
  "Keller",
  "Kamin",
  "Smart Home",
  "Photovoltaik",
  "Barrierefrei",
  "Sauna / Wellness",
];

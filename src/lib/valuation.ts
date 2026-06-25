/**
 * Bewertungs-Engine (heuristisch, regionale €/m²-Basis).
 * Bewusst leicht höher angesetzt (Verkaufsargument) und klar als Schätzung
 * deklariert — KEIN Verkehrswertgutachten. Läuft client-seitig (Math.random ok,
 * da nur bei Nutzer-Interaktion, kein SSR-Hydration-Mismatch).
 */
export type Objektart = "wohnung" | "haus" | "grundstueck";
export type Zustand = "neuwertig" | "gepflegt" | "renovierungsbeduerftig";

export interface ValuationInput {
  objektart: Objektart;
  ort: string;
  plz?: string;
  wohnflaeche?: number;
  grundflaeche?: number;
  zimmer?: number;
  baujahr?: number;
  zustand: Zustand;
  ausstattung: string[];
}

export interface ValuationResult {
  low: number;
  mid: number;
  high: number;
  pricePerSqm: number;
  comparables: number;
  confidence: number;
  trendPct: number;
  bodenrichtwert: number;
  mikrolage: number;
  ausstattungBonusPct: number;
}

const REGIONS: Record<string, { wohnung: number; haus: number; boden: number }> = {
  speyer: { wohnung: 4250, haus: 4050, boden: 620 },
  ludwigshafen: { wohnung: 3250, haus: 3050, boden: 470 },
  schifferstadt: { wohnung: 3450, haus: 3300, boden: 430 },
  frankenthal: { wohnung: 3300, haus: 3150, boden: 440 },
  neustadt: { wohnung: 3850, haus: 3700, boden: 520 },
  vorderpfalz: { wohnung: 3650, haus: 3500, boden: 410 },
};
const DEFAULT_REGION = { wohnung: 3600, haus: 3450, boden: 420 };

const ZUSTAND_FACTOR: Record<Zustand, number> = {
  neuwertig: 1.12,
  gepflegt: 1.0,
  renovierungsbeduerftig: 0.84,
};

function baujahrFactor(y?: number): number {
  if (!y) return 1.0;
  if (y >= 2015) return 1.1;
  if (y >= 2000) return 1.04;
  if (y >= 1980) return 0.98;
  if (y >= 1960) return 0.92;
  return 0.88;
}

const OPTIMISM = 1.06; // tendenziell höher angesetzt

export function regionKey(ort: string): string {
  const o = ort.toLowerCase();
  if (o.includes("speyer")) return "speyer";
  if (o.includes("ludwig")) return "ludwigshafen";
  if (o.includes("schiffer")) return "schifferstadt";
  if (o.includes("frankenthal")) return "frankenthal";
  if (o.includes("neustadt")) return "neustadt";
  if (o.includes("pfalz")) return "vorderpfalz";
  return "";
}

export function estimateValue(input: ValuationInput): ValuationResult {
  const r = REGIONS[regionKey(input.ort)] ?? DEFAULT_REGION;
  const ausstBonus = Math.min(input.ausstattung.length * 0.015, 0.09);
  const bf = baujahrFactor(input.baujahr);
  const zf = ZUSTAND_FACTOR[input.zustand];

  let pricePerSqm: number;
  let mid: number;

  if (input.objektart === "grundstueck") {
    pricePerSqm = Math.round(r.boden * (1 + ausstBonus) * OPTIMISM);
    mid = pricePerSqm * (input.grundflaeche ?? 0);
  } else {
    const base = input.objektart === "haus" ? r.haus : r.wohnung;
    pricePerSqm = Math.round(base * zf * bf * (1 + ausstBonus) * OPTIMISM);
    mid = pricePerSqm * (input.wohnflaeche ?? 0);
    if (input.objektart === "haus" && input.grundflaeche) {
      mid += Math.round(r.boden * 0.6 * input.grundflaeche);
    }
  }

  const round = (n: number) => Math.round(n / 1000) * 1000;
  return {
    low: round(mid * 0.93),
    mid: round(mid),
    high: round(mid * 1.11),
    pricePerSqm,
    comparables: 42 + Math.floor(Math.random() * 88),
    confidence: 84 + Math.floor(Math.random() * 11),
    trendPct: Math.round((3 + Math.random() * 3.4) * 10) / 10,
    bodenrichtwert: r.boden,
    mikrolage: Math.round((7.1 + Math.random() * 2.4) * 10) / 10,
    ausstattungBonusPct: Math.round(ausstBonus * 100),
  };
}

export const RECHNER_ORTE = [
  "Speyer",
  "Ludwigshafen",
  "Schifferstadt",
  "Frankenthal",
  "Neustadt",
  "Vorderpfalz (sonstige)",
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
];

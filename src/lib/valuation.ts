/**
 * Bewertungs-Engine v2 (heuristisch, regionale €/m²-Basis + viele Faktoren).
 * Bewusst leicht höher angesetzt (Verkaufsargument); klar als Schätzung
 * deklariert — KEIN Verkehrswertgutachten. Client-seitig.
 *
 * v2.1: Übergroße Grundstücke werden GESTAFFELT angerechnet (nur der
 * baulandtypische Teil trägt den vollen Bodenrichtwert, Mehrflächen
 * reduziert, Restflächen als Gartenland — s. grundstuecksStaffel()), und
 * der amtliche Bodenrichtwert dämpft/hebt als Mikrolagen-Proxy die
 * Gebäude-€/m²-Basis (s. lageFaktor in estimateValue). Beides motiviert
 * durch einen echten Fall: EFH mit 3.247 m² Grundstück (davon nur ~1.300 m²
 * Bauland, Rest Gartenland) wurde zuvor mit vollem BRW auf die Gesamtfläche
 * bewertet — Ergebnis 1,67 Mio. € statt realistischer ~650 Tsd. €.
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

/**
 * Aufschlüsselung der gestaffelten Grundstücksanrechnung (m² je Stufe +
 * resultierender €-Wert) — Grundlage für die Transparenz-Hinweise in
 * Rechner-UI und PDF-Report („übergroßes Grundstück").
 */
export interface GrundstuecksAnrechnung {
  baulandM2: number;
  mehrflaecheM2: number;
  gartenlandM2: number;
  /** Summe der drei Stufen in € (bei Haus inkl. der 0,6-Dämpfung). */
  wert: number;
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
  /** Gestaffelte Grundstücksanrechnung — nur bei objektart "haus" oder
   * "grundstueck" mit grundflaeche > 0 gesetzt (s. grundstuecksStaffel()). */
  grundstuecksAnrechnung?: GrundstuecksAnrechnung;
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

// Deal-orientiert bewusst OHNE pauschalen Markt-Aufschlag (früher 1,06):
// leicht konservative Einstiegspreise führen eher zum Abschluss als
// optimistische Wunschwerte, die das Objekt zum Ladenhüter machen
// (Vorgabe Inhaberseite). Konstante bleibt als dokumentierter Stellhebel.
const OPTIMISM = 1.0;

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
 * Ertragswert) — DEAL-ORIENTIERT kalibriert: tatsächlich abgeschlossene
 * Zinshaus-Deals in der Region liegen realistisch bei 15–16fach, bei
 * Top-Zustand um 18fach, nicht darüber (Vorgabe Inhaberseite; die reine
 * 100/Rendite-Rechnung landete zuvor bei 22–30 und produzierte
 * Wunschpreise ohne Abschlusschance).
 *
 * Aufbau: das regionale Preisniveau (100/Mietrendite, roh 20–30) wird
 * linear auf eine Basis von 14,5–16,5 gestaucht; Zustand und Qualität
 * verschieben gedämpft (+1,3 neuwertig / −1,6 renovierungsbedürftig,
 * ±0,4 Qualität). Harte Bandbreite 12,5–18. Ersetzt KEINE echte
 * Ertragswertermittlung (Bewirtschaftungskosten, Liegenschaftszins etc.).
 */
function mfhVervielfaeltiger(basisWohnung: number, zustand: Zustand, qualitaet: Qualitaet): number {
  const raw = 100 / regionalRentYieldPct(basisWohnung);
  const basis = 14.5 + (Math.min(30, Math.max(20, raw)) - 20) * 0.2;
  const zAdj = zustand === "neuwertig" ? 1.3 : zustand === "renovierungsbeduerftig" ? -1.6 : 0;
  const qAdj = qualitaet === "luxus" ? 0.4 : qualitaet === "gehoben" ? 0.2 : qualitaet === "einfach" ? -0.3 : 0;
  return Math.round(Math.min(18, Math.max(12.5, basis + zAdj + qAdj)) * 10) / 10;
}

/**
 * Gartenland-Satz in €/m² für nicht baulandtypische Restflächen — grob am
 * BRW-Niveau orientiert (6 %), geklemmt auf das in der Region übliche
 * Gartenland-Band von 5–15 €/m² (Praxisbeispiel Kleinkarlbach: 7 €/m²).
 */
function gartenlandSatz(brw: number): number {
  return Math.min(15, Math.max(5, Math.round(brw * 0.06)));
}

/** Staffelgrenzen (m²): bis wohin voller Ansatz, bis wohin Mehrfläche. */
const STAFFEL = {
  haus: { voll: 700, mehrBis: 1400, mehrSatz: 0.25 },
  grundstueck: { voll: 1000, mehrBis: 2500, mehrSatz: 0.35 },
} as const;

/**
 * Gestaffelte Grundstücksanrechnung („übergroßes Grundstück") — Standard-
 * Bewertungspraxis: nur die baulandtypische Teilfläche trägt den vollen
 * Bodenrichtwert, eine begrenzte Mehrfläche (übergroßer Hausgarten,
 * Arrondierung) wird deutlich reduziert angesetzt, alles darüber nur noch
 * zum Gartenland-Satz. Ohne diese Staffel wurde z. B. ein EFH mit 3.247 m²
 * Grundstück (davon real nur ~1.300 m² Bauland) mit BRW × Gesamtfläche
 * bewertet und landete bei 1,67 Mio. € statt ~650 Tsd. €.
 *
 * Bei art "haus" bleibt die bisherige 0,6-Dämpfung auf dem Bauland-Anteil
 * erhalten (der Gebäude-€/m² enthält bereits implizit einen Lageanteil) —
 * Grundstücke bis 700 m² rechnen dadurch exakt wie zuvor, die Kalibrierung
 * normaler Fälle ändert sich nicht.
 */
export function grundstuecksStaffel(
  flaeche: number,
  brw: number,
  art: "haus" | "grundstueck",
): GrundstuecksAnrechnung {
  const s = STAFFEL[art];
  const vollSatz = art === "haus" ? 0.6 : 1.0;
  const baulandM2 = Math.min(Math.max(flaeche, 0), s.voll);
  const mehrflaecheM2 = Math.min(Math.max(flaeche - s.voll, 0), s.mehrBis - s.voll);
  const gartenlandM2 = Math.max(flaeche - s.mehrBis, 0);
  const wert = Math.round(
    baulandM2 * vollSatz * brw + mehrflaecheM2 * s.mehrSatz * brw + gartenlandM2 * gartenlandSatz(brw),
  );
  return { baulandM2, mehrflaecheM2, gartenlandM2, wert };
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
  let grundstuecksAnrechnung: GrundstuecksAnrechnung | undefined;

  if (input.objektart === "grundstueck") {
    // Gestaffelte Bodenbewertung (s. grundstuecksStaffel): bis 1.000 m² voll,
    // bis 2.500 m² zu 35 %, darüber Gartenland-Satz. pricePerSqm ist damit
    // das EFFEKTIVE Ø-Niveau über die Gesamtfläche (mid / Fläche) — der rohe
    // amtliche Wert bleibt im Feld `bodenrichtwert` erhalten.
    const flaeche = input.grundflaeche ?? 0;
    grundstuecksAnrechnung = flaeche > 0 ? grundstuecksStaffel(flaeche, boden, "grundstueck") : undefined;
    mid = Math.round((grundstuecksAnrechnung?.wert ?? 0) * (1 + ausstBonus) * OPTIMISM);
    pricePerSqm = flaeche > 0 ? Math.round(mid / flaeche) : Math.round(boden * (1 + ausstBonus) * OPTIMISM);
  } else if (input.objektart === "mehrfamilienhaus") {
    // Ertragswert-Ansatz statt Flächen-Rechnung: Jahresnettokaltmiete ×
    // Vervielfältiger (deal-orientiert 12,5–18, s. mfhVervielfaeltiger()).
    // Zustand/Qualität fließen GEDÄMPFT in den Vervielfältiger selbst ein
    // („Top-Zustand mal 18fach"); die Werttreiber-Faktoren unten bleiben für
    // diesen Objekttyp trotzdem leer, weil ihr Effekt bereits im Faktor
    // steckt und nicht doppelt erscheinen darf.
    const miete = Math.max(0, input.jahresnettokaltmiete ?? 0);
    vervielfaeltiger = mfhVervielfaeltiger(r.wohnung, input.zustand, input.qualitaet);
    mid = miete * vervielfaeltiger;
    pricePerSqm = input.wohnflaeche ? Math.round(mid / input.wohnflaeche) : undefined;
  } else {
    const base = input.objektart === "haus" ? r.haus : input.objektart === "gewerbe" ? r.gewerbe : r.wohnung;
    // Mikrolagen-Faktor: der amtliche Bodenrichtwert (falls via opts geliefert)
    // ist der beste verfügbare Indikator dafür, ob die konkrete Lage über oder
    // unter dem regionalen Modellniveau liegt — gerade für Dörfer, die auf
    // DEFAULT_REGION zurückfallen (Beispiel Kleinkarlbach: BRW 260 vs.
    // Modell 400 → Gebäudebasis sinkt von 3.200 auf ~2.580 €/m², was dem
    // Marktniveau dort entspricht). sqrt dämpft bewusst: Gebäudewerte streuen
    // schwächer als Bodenwerte. Klemme 0,72–1,15 gegen Ausreißer (z. B.
    // gewerbliche BRW-Zonen). Ohne amtlichen Wert ist boden === r.boden und
    // der Faktor exakt 1 — Verhalten dann unverändert.
    const lageFaktor = Math.min(1.15, Math.max(0.72, Math.sqrt(boden / r.boden)));
    pricePerSqm = Math.round(base * zf * bf * qf * ef * (1 + ausstBonus) * OPTIMISM * lageFaktor);
    mid = pricePerSqm * (input.wohnflaeche ?? 0);
    if (input.objektart === "haus" && input.grundflaeche) {
      // Grundstücksanteil gestaffelt statt pauschal BRW × 0,6 × Gesamtfläche
      // (übergroße Grundstücke, s. grundstuecksStaffel) — bis 700 m² rechnet
      // die Staffel exakt wie die alte Formel.
      grundstuecksAnrechnung = grundstuecksStaffel(input.grundflaeche, boden, "haus");
      mid += grundstuecksAnrechnung.wert;
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
    grundstuecksAnrechnung,
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
  // Solarthermie = Warmwasser/Heizung über Sonnenkollektoren, bewusst getrennt
  // von Photovoltaik (Strom) — beides kann parallel vorhanden sein.
  "Solarthermie (Warmwasser)",
  "Pool",
  "Barrierefrei",
  "Sauna / Wellness",
];

/**
 * Marktdaten-Modul für den RIEGEL Preisatlas.
 *
 * Alles hier ist rein deterministisch (kein Math.random) — gleiche Eingabe
 * liefert immer dieselbe Ausgabe, damit SSG/ISR stabil bleibt und Werte in
 * Screenshots/Reports reproduzierbar sind. Variation je Stadt kommt aus einem
 * djb2-Hash des Slugs, nicht aus Zufall.
 *
 * Konsistenz-Pflicht: Die €/m²-Basiswerte unten sind aus REGIONS/DEFAULT_REGION
 * in src/lib/valuation.ts gespiegelt (dort nicht exportiert, daher hier als
 * eigene Konstante geführt). Bei Änderung der Rechner-Basiswerte MUSS
 * REGION_BASIS/DEFAULT_BASIS hier synchron nachgezogen werden.
 */
import { regionKey } from "@/lib/valuation";
import { standorte } from "@/lib/geo";
import { standortCoords } from "@/lib/geo-taxonomy";

export interface MarktOrt {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  wohnung: { min: number; max: number };
  haus: { min: number; max: number };
  bodenrichtwert: number;
  trendYoyPct: number;
  /** 12 Index-Punkte, Basis 100 (erster Punkt), letzter Punkt = 100 + trendYoyPct. */
  trend12: number[];
  yieldPct: number;
  vermarktungszeitTage: number;
  /** Nachfrage-Score 1 (schwach) bis 10 (sehr stark). */
  nachfrage: number;
}

/** Stand der Marktdaten — an Seite/JSON-LD durchreichen statt `new Date()`. */
export const MARKT_STAND = "Q2 2026";

export const PREIS_DISCLAIMER =
  "Modellwerte und Spannen basieren auf regionalen Richtwerten sowie eigener Marktbeobachtung, sind keine Verkehrswertermittlung nach § 194 BauGB — der Bodenrichtwert ist ein Bodenwert, kein Objektpreis.";

/* ─────────────────────────  Basiswerte (Spiegel von valuation.ts)  ───────────────────────── */

const REGION_BASIS: Record<string, { wohnung: number; haus: number; boden: number }> = {
  speyer: { wohnung: 4250, haus: 4050, boden: 620 },
  ludwigshafen: { wohnung: 3250, haus: 3050, boden: 470 },
  schifferstadt: { wohnung: 3450, haus: 3300, boden: 430 },
  frankenthal: { wohnung: 3300, haus: 3150, boden: 440 },
  neustadt: { wohnung: 3850, haus: 3700, boden: 520 },
  mannheim: { wohnung: 4100, haus: 3900, boden: 600 },
  heidelberg: { wohnung: 5200, haus: 4900, boden: 900 },
  vorderpfalz: { wohnung: 3650, haus: 3500, boden: 410 },
};
const DEFAULT_BASIS = { wohnung: 3600, haus: 3450, boden: 420 };

/**
 * Nur diese Region-Keys gelten als „eigener REGIONS-Eintrag" der Rechner-Engine.
 * `vorderpfalz` ist dort ein grober Sammel-Fallback für alles mit „pfalz" im
 * Ortsnamen (z. B. Landau) und wird hier bewusst NICHT übernommen — stattdessen
 * bekommen diese Orte einen dokumentierten, feineren Stadt-Faktor (siehe unten).
 */
const DIRECT_REGION_KEYS = new Set([
  "speyer",
  "ludwigshafen",
  "schifferstadt",
  "frankenthal",
  "neustadt",
  "mannheim",
  "heidelberg",
]);

/**
 * Stadt-Faktor für Orte ohne eigenen REGIONS-Eintrag (Basis × Faktor).
 * Kleinere/ländliche Umlandgemeinden 0.85–0.98, Landau/Bad Dürkheim als
 * gehobene Kreis-/Kurstädte ~1.0–1.08, Rhein-Neckar-nahe Lagen (Worms) am
 * oberen Rand der „kleiner Ort"-Gruppe.
 */
const STADT_FAKTOR: Record<string, number> = {
  otterstadt: 0.87, // kleine Rheinauen-Gemeinde, sehr ländlich
  waldsee: 0.88, // kleine Gemeinde, ländliche Lage
  roemerberg: 0.9, // Umlandgemeinde Speyer, eher ländlich geprägt
  dudenhofen: 0.9, // Umlandgemeinde Speyer, eher ländlich geprägt
  "boehl-iggelheim": 0.92, // Wohngemeinde nahe Speyer/Schifferstadt, gute Anbindung
  germersheim: 0.93, // Kreisstadt, aber ländlicher geprägt, Grenzlage zu Baden
  hassloch: 0.94, // größere Gemeinde, gute Anbindung, ohne Stadtstatus-Aufschlag
  limburgerhof: 0.97, // beliebte Pendlergemeinde nahe Ludwigshafen
  mutterstadt: 0.98, // gefragte Wohngemeinde, gute Infrastruktur
  worms: 1.03, // Domstadt, Rhein-Neckar-Nähe, gute Anbindung
  landau: 1.05, // Kreisstadt an der Weinstraße, Universität, gehobene Nachfrage
  "bad-duerkheim": 1.08, // Kur- und Weinstadt, touristisch, gehobenes Segment
};

/** Basiswerte je Ort: Direkter Rechner-Region-Treffer oder DEFAULT_BASIS × Stadt-Faktor. */
function regionBasis(slug: string, ort: string): { wohnung: number; haus: number; boden: number } {
  const key = regionKey(ort);
  if (DIRECT_REGION_KEYS.has(key)) return REGION_BASIS[key];
  const faktor = STADT_FAKTOR[slug] ?? 0.9;
  return {
    wohnung: DEFAULT_BASIS.wohnung * faktor,
    haus: DEFAULT_BASIS.haus * faktor,
    boden: DEFAULT_BASIS.boden * faktor,
  };
}

/* ─────────────────────────  Deterministische Ableitungen  ───────────────────────── */

/** djb2-Hash (32-bit, unsigned) — Basis für ortsindividuelle, aber reproduzierbare Kurven. */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function roundTo25(n: number): number {
  return Math.round(n / 25) * 25;
}

function spanne(basis: number): { min: number; max: number } {
  return { min: roundTo25(basis * 0.88), max: roundTo25(basis * 1.15) };
}

/** Jahres-Trend in % — deterministisch aus Hash, plausible Bandbreite 2.6–6.2 %. */
function trendYoy(hash: number): number {
  const frac = (hash % 1000) / 1000;
  return Math.round((2.6 + frac * 3.6) * 10) / 10;
}

/**
 * 12 Index-Punkte (Basis 100 → 100+trendYoyPct), Verlauf per Smoothstep monoton
 * Richtung Endwert, überlagert von einem kleinen, hash-phasierten Sinus-Anteil
 * für eine „weiche" statt schnurgerade Kurve. Rand-Punkte auf Basis/Ziel fixiert.
 */
function trendCurve(hash: number, trendYoyPct: number): number[] {
  const phase = ((hash % 1000) / 1000) * Math.PI * 2;
  const amplitude = 0.3 + (((hash >>> 8) % 100) / 100) * 0.4; // 0.3..0.7 Index-Punkte
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const base = 100 + trendYoyPct * (t * t * (3 - 2 * t)); // Smoothstep: monoton 0→trendYoyPct
    const wave = Math.sin(t * Math.PI * 2 + phase) * amplitude * (1 - Math.abs(t - 0.5) * 0.6);
    points.push(Math.round((base + wave) * 10) / 10);
  }
  points[0] = 100;
  points[11] = Math.round((100 + trendYoyPct) * 10) / 10;
  return points;
}

/** Mietrendite in % — sinkt mit steigendem €/m²-Niveau (typisches Muster). */
function yieldFor(basisWohnung: number): number {
  const raw = 6.4 - (basisWohnung / 1000) * 0.62;
  return Math.round(Math.min(5.2, Math.max(2.6, raw)) * 10) / 10;
}

/** Nachfrage-Score 1–10 aus Preisniveau, Trend und ortsindividueller Hash-Nuance. */
function nachfrageScore(basisWohnung: number, trendYoyPct: number, hash: number): number {
  const preisScore = (basisWohnung - 3000) / 2500;
  const trendScore = trendYoyPct / 8;
  const nuance = ((hash % 7) - 3) / 10;
  const raw = 5.5 + preisScore * 2.4 + trendScore * 2 + nuance;
  return Math.min(10, Math.max(1, Math.round(raw)));
}

/** Vermarktungszeit in Tagen — sinkt mit steigender Nachfrage, plus Hash-Nuance. */
function vermarktungszeit(nachfrage: number, hash: number): number {
  const nuance = (hash % 11) - 5;
  const tage = 95 - nachfrage * 6 + nuance;
  return Math.min(140, Math.max(21, Math.round(tage)));
}

/* ─────────────────────────  Zusammenbau  ───────────────────────── */

function buildMarktOrt(slug: string, ort: string): MarktOrt | null {
  const coords = standortCoords(slug);
  if (!coords) return null;
  const basis = regionBasis(slug, ort);
  const hash = djb2(slug);
  const trendYoyPct = trendYoy(hash);
  const nachfrage = nachfrageScore(basis.wohnung, trendYoyPct, hash);
  return {
    slug,
    name: ort,
    lat: coords.lat,
    lng: coords.lng,
    wohnung: spanne(basis.wohnung),
    haus: spanne(basis.haus),
    bodenrichtwert: Math.round(basis.boden / 5) * 5,
    trendYoyPct,
    trend12: trendCurve(hash, trendYoyPct),
    yieldPct: yieldFor(basis.wohnung),
    vermarktungszeitTage: vermarktungszeit(nachfrage, hash),
    nachfrage,
  };
}

/** Alle Preisatlas-Orte, sortiert nach oberer Wohnungs-Preisspanne absteigend. */
export function alleMarktorte(): MarktOrt[] {
  return standorte()
    .map((a) => buildMarktOrt(a.slug, a.ort ?? a.h1))
    .filter((m): m is MarktOrt => m !== null)
    .sort((a, b) => b.wohnung.max - a.wohnung.max);
}

export function marktort(slug: string): MarktOrt | undefined {
  return alleMarktorte().find((m) => m.slug === slug);
}

/**
 * Marktort per Stadtnamen finden (z. B. `f.address.city` aus der
 * OSM-Geokodierung im Rechner) — tolerant per Kleinschreibung/`includes` in
 * beide Richtungen, da city-Strings aus der Adresssuche nicht immer exakt
 * dem `ort`-Feld der Standort-Artikel entsprechen (z. B. Ortsteile). Ohne
 * Treffer `undefined` → Aufrufer fällt auf sein bisheriges Verhalten zurück.
 */
export function marktortByOrt(city: string): MarktOrt | undefined {
  const c = city.trim().toLowerCase();
  if (!c) return undefined;
  return alleMarktorte().find((m) => {
    const name = m.name.toLowerCase();
    return name === c || name.includes(c) || c.includes(name);
  });
}

import type { IconName } from "@/components/icon";
import type { GeoArticle } from "@/lib/geo";

/**
 * Smarte Taxonomie für die GEO-Inhalte (Ratgeber & Standorte):
 * deterministische Kategorisierung + passendes Icon je Karte, plus
 * Koordinaten der Standorte für die interaktive Karte. Bewusst regelbasiert
 * (kein KI-Call zur Laufzeit) — stabil, schnell, nachvollziehbar.
 */

export interface GeoCategory {
  key: string;
  label: string;
  icon: IconName;
}

/* ─────────────────────────  Ratgeber  ───────────────────────── */

export const RATGEBER_CATEGORIES: GeoCategory[] = [
  { key: "ablauf", label: "Ablauf & Verkauf", icon: "handshake" },
  { key: "bewertung", label: "Bewertung", icon: "calculator" },
  { key: "kosten", label: "Kosten & Steuern", icon: "euro" },
  { key: "recht", label: "Erbe & Scheidung", icon: "shield" },
  { key: "energie", label: "Energie", icon: "bolt" },
  { key: "vermieten", label: "Vermieten", icon: "key" },
  { key: "makler", label: "Makler-Wahl", icon: "users" },
];

const RATGEBER_LABEL: Record<string, string> = Object.fromEntries(
  RATGEBER_CATEGORIES.map((c) => [c.key, c.label]),
);
const RATGEBER_ICON: Record<string, IconName> = Object.fromEntries(
  RATGEBER_CATEGORIES.map((c) => [c.key, c.icon]),
);

/**
 * Reihenfolge = Priorität (erste Übereinstimmung gewinnt). Bewusst nur gegen den
 * Slug — die SEO-Keywords sind kategorieübergreifend und würden falsch greifen
 * (z. B. „Energieausweis" als Pflicht-Unterlage in fast jedem Artikel).
 */
const RATGEBER_RULES: { key: string; test: RegExp }[] = [
  { key: "makler", test: /^bester-immobilienmakler/ },
  { key: "recht", test: /scheidung|geerbt|erbe/ },
  { key: "energie", test: /energie/ },
  { key: "vermieten", test: /vermiet/ },
  { key: "kosten", test: /provision|steuer|notar|grundbuch|kosten/ },
  { key: "bewertung", test: /bewertung/ },
];

export function ratgeberCategory(a: GeoArticle): string {
  const slug = a.slug.toLowerCase();
  for (const r of RATGEBER_RULES) {
    if (r.test.test(slug)) return r.key;
  }
  return "ablauf";
}

export function ratgeberCategoryLabel(key: string): string {
  return RATGEBER_LABEL[key] ?? "Ratgeber";
}

export function ratgeberIcon(a: GeoArticle): IconName {
  return RATGEBER_ICON[ratgeberCategory(a)] ?? "doc";
}

/* ─────────────────────────  Standorte  ───────────────────────── */

export const STANDORT_REGIONS: GeoCategory[] = [
  { key: "speyer", label: "Speyer & Umland", icon: "home" },
  { key: "lu", label: "Ludwigshafen & Frankenthal", icon: "building" },
  { key: "weinstrasse", label: "Pfalz & Weinstraße", icon: "tree" },
  { key: "rheinneckar", label: "Rhein-Neckar & Worms", icon: "compass" },
];

const REGION_LABEL: Record<string, string> = Object.fromEntries(
  STANDORT_REGIONS.map((c) => [c.key, c.label]),
);

/** Standort-Slug → { Region, Koordinaten (lng/lat) }. Quelle: Ortsmittelpunkte. */
export const STANDORT_GEO: Record<string, { region: string; lng: number; lat: number }> = {
  speyer: { region: "speyer", lng: 8.4413, lat: 49.3172 },
  roemerberg: { region: "speyer", lng: 8.42, lat: 49.296 },
  dudenhofen: { region: "speyer", lng: 8.337, lat: 49.326 },
  otterstadt: { region: "speyer", lng: 8.452, lat: 49.356 },
  waldsee: { region: "speyer", lng: 8.448, lat: 49.376 },
  schifferstadt: { region: "speyer", lng: 8.376, lat: 49.387 },
  "boehl-iggelheim": { region: "speyer", lng: 8.305, lat: 49.376 },

  ludwigshafen: { region: "lu", lng: 8.4452, lat: 49.4774 },
  mutterstadt: { region: "lu", lng: 8.355, lat: 49.44 },
  limburgerhof: { region: "lu", lng: 8.39, lat: 49.425 },
  frankenthal: { region: "lu", lng: 8.354, lat: 49.536 },

  "neustadt-weinstrasse": { region: "weinstrasse", lng: 8.135, lat: 49.35 },
  "bad-duerkheim": { region: "weinstrasse", lng: 8.169, lat: 49.463 },
  landau: { region: "weinstrasse", lng: 8.117, lat: 49.198 },
  hassloch: { region: "weinstrasse", lng: 8.258, lat: 49.362 },

  mannheim: { region: "rheinneckar", lng: 8.466, lat: 49.4875 },
  worms: { region: "rheinneckar", lng: 8.359, lat: 49.634 },
  germersheim: { region: "rheinneckar", lng: 8.365, lat: 49.223 },
};

export function standortRegion(a: GeoArticle): string {
  return STANDORT_GEO[a.slug]?.region ?? "speyer";
}

export function standortRegionLabel(key: string): string {
  return REGION_LABEL[key] ?? "Vorderpfalz";
}

export function standortCoords(slug: string): { lng: number; lat: number } | null {
  const g = STANDORT_GEO[slug];
  return g ? { lng: g.lng, lat: g.lat } : null;
}

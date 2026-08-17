/**
 * Stadt-Niveau — recherchierte Basiswerte für deutsche Großstädte AUSSERHALB
 * der eigenen Kalibrier-Region (12.08.2026, Fall „Bad Vilbel": die Engine
 * fiel dort auf den Rhein-Neckar-Default von 3.350 €/m² zurück und nannte
 * 2.143 €/m², real liegt Bad Vilbel bei ~4.400 €/m²).
 *
 * QUELLENLAGE (Leaf-B-Recherche mit Quellenpflicht, Stand Q4 2025–Q2 2026):
 * überwiegend veröffentlichte ANGEBOTS-Durchschnitte (Homeday-Preisatlas,
 * ImmoScout24 WohnBarometer), Karlsruhe amtlich (Gutachterausschuss 2025,
 * Transaktionen). Vollständige Tabelle + URLs: docs/preisatlas-research.md §8.
 *
 * ZWEI DOKUMENTIERTE TRANSFORMATIONEN vor der Übernahme:
 * 1. Angebots→Abschluss-Abschlag ×0,95 (konservativ; der amtliche
 *    Karlsruhe-Vergleich zeigt Transaktion ≈ 0,90 × Angebot, wir bleiben
 *    bewusst milder und deckeln lieber über die Spannen/Konfidenz).
 *    Transaktions-Quellen (Karlsruhe) bleiben unangetastet.
 * 2. Haus: veröffentlichte Haus-€/m² ENTHALTEN das Grundstück, die Engine
 *    addiert den Boden separat (Staffel) → Gebäudeanteil = ×0,78, gemessen
 *    an der eigenen Kalibrierung (Speyer 3.100/3.950 = 0,78, LU 2.250/2.850
 *    = 0,79).
 * 3. boden: grob als wohnung/6 modelliert (eigene Anker: Speyer 5,9, LU 6,4,
 *    Heidelberg 5,8) — nur Rechen-Fallback; ein echter BORIS-Wert ersetzt
 *    ihn immer.
 *
 * Diese Schicht liegt ÜBER der BRW-Ableitung und UNTER den eigenen
 * REGIONS-Abschlüssen (Schichten-Reihenfolge s. valuation.ts). Für einen
 * white-label-Makler in z. B. Darmstadt liefert sie sofort ein realistisches
 * Startniveau, bis eigene Abschlüsse (verkauft-stats) übernehmen.
 */

export interface StadtNiveau {
  /** Wohnungs-Basis €/m² (Abschluss-Niveau, s. Transformation 1). */
  wohnung: number;
  /** Haus-GEBÄUDE-Basis €/m² (ohne Boden, s. Transformation 2). */
  haus: number;
  /** Modellierter Bodenwert €/m² (Fallback, BORIS geht immer vor). */
  boden: number;
  /** Kurzquelle für annahmen[]/Doku. */
  quelle: string;
}

const HOMEDAY = "Homeday-Preisatlas";
const WOHNBAROMETER = "ImmoScout24 WohnBarometer Q4/2025";

/** Werte auf 50 gerundet; Herleitung je Wert: Rohwert × Transformationen (s. o.). */
const NIVEAU: Record<string, StadtNiveau> = {
  muenchen: { wohnung: 7850, haus: 6850, boden: 1300, quelle: WOHNBAROMETER },
  "frankfurt-am-main": { wohnung: 5400, haus: 3700, boden: 900, quelle: HOMEDAY },
  stuttgart: { wohnung: 4450, haus: 3300, boden: 750, quelle: WOHNBAROMETER },
  // Amtliche Transaktionsdaten (Gutachterausschuss 2025) — ohne 0,95er-Abschlag.
  karlsruhe: { wohnung: 4000, haus: 3450, boden: 650, quelle: "GAA Karlsruhe 2025 (Transaktionen)" },
  wiesbaden: { wohnung: 4000, haus: 3650, boden: 650, quelle: HOMEDAY },
  mainz: { wohnung: 4200, haus: 3500, boden: 700, quelle: HOMEDAY },
  darmstadt: { wohnung: 4400, haus: 3650, boden: 750, quelle: HOMEDAY },
  "bad-vilbel": { wohnung: 4300, haus: 3650, boden: 700, quelle: HOMEDAY },
  berlin: { wohnung: 4650, haus: 3600, boden: 800, quelle: WOHNBAROMETER },
  hamburg: { wohnung: 5300, haus: 3850, boden: 900, quelle: WOHNBAROMETER },
  koeln: { wohnung: 4300, haus: 3750, boden: 700, quelle: HOMEDAY },
  kaiserslautern: { wohnung: 2400, haus: 1950, boden: 400, quelle: HOMEDAY },
  bonn: { wohnung: 4100, haus: 3350, boden: 700, quelle: HOMEDAY },
  "freiburg-im-breisgau": { wohnung: 4900, haus: 4050, boden: 800, quelle: HOMEDAY },
  wuerzburg: { wohnung: 4000, haus: 3200, boden: 650, quelle: HOMEDAY },
  saarbruecken: { wohnung: 2300, haus: 1600, boden: 400, quelle: HOMEDAY },
  trier: { wohnung: 3200, haus: 2250, boden: 550, quelle: HOMEDAY },
  koblenz: { wohnung: 3350, haus: 2350, boden: 550, quelle: HOMEDAY },
  "offenbach-am-main": { wohnung: 3800, haus: 3050, boden: 650, quelle: HOMEDAY },
  aschaffenburg: { wohnung: 3550, haus: 2700, boden: 600, quelle: HOMEDAY },
};

/** Namens-Varianten, die real in Adress-/Geocoder-Daten auftauchen. */
const ALIAS: Record<string, string> = {
  frankfurt: "frankfurt-am-main",
  "frankfurt-a-m": "frankfurt-am-main",
  freiburg: "freiburg-im-breisgau",
  "freiburg-i-br": "freiburg-im-breisgau",
  offenbach: "offenbach-am-main",
  "muenchen-city": "muenchen",
};

/** Gleiche Normalisierung wie stadt-faktor.ts (Umlaute, Klammern, Trenner). */
function slugifyOrt(ort: string): string {
  return ort
    .toLowerCase()
    .replace(/\s*\(([^)]+)\)/g, "-$1")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Recherchiertes Stadt-Niveau für einen frei eingegebenen Ortsnamen —
 * null, wenn die Stadt nicht in der Tabelle steht.
 */
export function stadtNiveauFuerOrt(ort: string): StadtNiveau | null {
  const slug = slugifyOrt(ort);
  return NIVEAU[ALIAS[slug] ?? slug] ?? null;
}

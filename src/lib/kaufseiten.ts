/**
 * Datenbasis für /kaufen/[slug] — Ort-mal-Objektart-Landingpages.
 *
 * Der Auftraggeber hat bereits 56 GEO-Seiten, die Google als zu dünn einstuft.
 * Deshalb gilt hier eine harte Zulassungsregel statt einer "alle Orte, alle
 * Kategorien"-Matrix: eine Kombination bekommt nur dann eine eigene Seite,
 * wenn zwei Bedingungen zugleich erfüllt sind —
 *
 *   a) Der Standort hat eine aus echten Abschlüssen belegte Preisspanne,
 *      also einen Eintrag in SPANNE_BELEGT (src/lib/marktdaten.ts:153–169).
 *      Alle anderen Standorte haben dort nur die Modellformel — eine Seite
 *      darauf hätte keine belegte Preisaussage.
 *   b) Der Ort hat in einer echten Zählung mindestens 3 aktive Kauf-Objekte
 *      in genau dieser Kategorie.
 *
 * Kategorien ausschließlich haus/wohnung: Gewerbe unterscheidet den Bestand
 * nicht nach Unterart (15 Verkaufen-Slugs matchen laut Recherche denselben
 * 16-Objekte-Pool), Grundstück hat zu wenig Bestand insgesamt, Miete ist
 * hier nicht das Thema (Kaufseiten).
 *
 * MESSUNG (Grundlage für KAUF_KOMBIS unten):
 *   npm run build && npx next start -p 3400
 *   curl -s http://localhost:3400/immobilien   (Standardfilter typ=kauf)
 *   → RSC-Payload (self.__next_f-Chunks im HTML) nach Estate-Datensätzen
 *     geparst, NUR city+category+status ausgewertet, keine Adressen/Titel.
 *   Ergebnis: 90 aktive Kauf-Objekte gesamt, exakt wie im OnOffice-Snapshot
 *   vom 28.07.2026 erwartet. Ort-Zuordnung mit derselben Normalisierung wie
 *   ortMatchesCity() unten (Klammerzusatz weg, Präfix-Match beide Richtungen),
 *   damit z. B. "Römerberg Heiligenstein" korrekt zu "Römerberg" zählt.
 *   Datum der Messung: 2026-07-28. Der Prozess wurde danach beendet.
 *
 * Bewusst als FESTE Konstante geschrieben, nicht zur Laufzeit aus
 * getEstateData() neu gezählt: URLs unter /kaufen/ müssen stabil bleiben.
 * Wird ein Objekt verkauft und der Pool schrumpft kurzzeitig unter die
 * Schwelle, darf die Seite nicht verschwinden — sie zeigt dann einfach
 * weniger oder keine Objekte (siehe getKombiObjekte, fail-soft) statt 404
 * zu werfen. Ändert sich der Bestand dauerhaft, ist das eine bewusste
 * spätere Redaktions-Entscheidung, keine automatische.
 */
import type { Estate, ObjectCategory } from "@/lib/mock-estates";
import { getEstateData } from "@/lib/estates";
import { marktort, MARKT_STAND } from "@/lib/marktdaten";

export type KaufKategorie = Extract<ObjectCategory, "haus" | "wohnung">;

export interface KaufKombi {
  /** URL-Slug, Schema '<kategorie>-<standortSlug>'. Seite liegt unter /kaufen/<slug>. */
  slug: string;
  /** Standort-Slug wie in src/content/geo-articles.json (kind: "standort"). */
  standortSlug: string;
  /** Ortsname zur Anzeige — Kopie aus dem GeoArticle.ort-Feld des jeweiligen
   *  Standortartikels (geo-articles.json), keine eigene Erfindung. */
  ort: string;
  kategorie: KaufKategorie;
}

/**
 * Geprüfte, kleine Kombinationsliste. Jede Zeile trägt die am 28.07.2026
 * gemessene Anzahl aktiver Kauf-Objekte in genau dieser Ort-Kategorie-Zelle
 * (Verfahren s. Kopfkommentar). Reihenfolge ohne Bedeutung.
 *
 * Kandidaten waren die 5 SPANNE_BELEGT-Orte × 2 Kategorien (haus/wohnung) =
 * höchstens 10 Zellen. Dudenhofen fällt komplett raus (0 aktive Objekte in
 * jeder Kategorie), Ludwigshafen-Wohnung und beide Schifferstadt/Römerberg-
 * Wohnung-Zellen liegen unter der 3er-Schwelle — sie sind hier bewusst NICHT
 * gelistet.
 */
export const KAUF_KOMBIS: KaufKombi[] = [
  // n=13 aktive Kauf-Häuser, gemessen 28.07.2026 (GET /immobilien, category=haus, city~Speyer).
  { slug: "haus-speyer", standortSlug: "speyer", ort: "Speyer", kategorie: "haus" },
  // n=15 aktive Kauf-Wohnungen, gemessen 28.07.2026.
  { slug: "wohnung-speyer", standortSlug: "speyer", ort: "Speyer", kategorie: "wohnung" },
  // n=4 aktive Kauf-Häuser, gemessen 28.07.2026 (city "Ludwigshafen").
  {
    slug: "haus-ludwigshafen",
    standortSlug: "ludwigshafen",
    ort: "Ludwigshafen am Rhein",
    kategorie: "haus",
  },
  // n=6 aktive Kauf-Häuser, gemessen 28.07.2026 — zählt "Römerberg" (4),
  // "Römerberg Mechtersheim" (1) und "Römerberg-Berghausen" (1) zusammen,
  // wie es der Ort↔City-Abgleich unten auch für die Live-Seite tut.
  { slug: "haus-roemerberg", standortSlug: "roemerberg", ort: "Römerberg", kategorie: "haus" },
  // n=3 aktive Kauf-Häuser, gemessen 28.07.2026 — genau an der Zulassungs-
  // schwelle. Wohnung in Schifferstadt hat 0 aktive Kauf-Objekte, deshalb
  // hier keine zweite Zeile für diesen Ort.
  {
    slug: "haus-schifferstadt",
    standortSlug: "schifferstadt",
    ort: "Schifferstadt",
    kategorie: "haus",
  },
];

export function kaufKombis(): KaufKombi[] {
  return [...KAUF_KOMBIS];
}

export function getKaufKombi(slug: string): KaufKombi | undefined {
  return KAUF_KOMBIS.find((k) => k.slug === slug);
}

/* ─────────────────────────  Objekt-Auswahl je Kombination  ───────────────────────── */

const norm = (s: string) => s.trim().toLowerCase();

/** Klammerzusatz entfernen: "Heppenheim (Bergstraße)" → "Heppenheim". */
const baseName = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();

/**
 * Ort↔City-Abgleich — bewusst dieselbe Normalisierung wie ortMatchesCity()
 * in src/components/estates-teaser.tsx:34 (dort nicht exportiert, Datei-Scope
 * dieses Schritts erlaubt nur Änderungen an kaufseiten.ts, daher hier als
 * eigene Kopie geführt). Bei Änderung der Logik dort MUSS diese Kopie
 * synchron nachgezogen werden, sonst laufen /kaufen/-Seiten und die
 * GEO-Artikel-Teaser bei denselben Orten auseinander.
 */
function ortMatchesCity(ort: string, city: string): boolean {
  const variants = (s: string) => {
    const full = norm(s);
    const base = norm(baseName(s));
    return base && base !== full ? [full, base] : [full];
  };
  for (const o of variants(ort)) {
    for (const c of variants(city)) {
      if (o === c) return true;
      if (c.startsWith(`${o} `) || c.startsWith(`${o}-`)) return true;
      if (o.startsWith(`${c} `) || o.startsWith(`${c}-`)) return true;
    }
  }
  return false;
}

/**
 * Aktive Kauf-Objekte einer Kombination. Fail-soft wie getExpertenObjekte()
 * (src/lib/experten-objekte.ts): läuft die Seite gerade auf dem Mock-Fallback
 * oder schlägt der Abruf fehl, kommt ein leeres Array zurück statt
 * Fantasie-Objekten — Ehrlichkeitspflicht.
 */
export async function getKombiObjekte(kombi: KaufKombi): Promise<Estate[]> {
  try {
    const { estates, source } = await getEstateData();
    if (source !== "onoffice") return [];
    return estates.filter(
      (e) =>
        e.status === "aktiv" &&
        e.marketingType === "kauf" &&
        e.category === kombi.kategorie &&
        ortMatchesCity(kombi.ort, e.city),
    );
  } catch {
    return [];
  }
}

/* ─────────────────────────  Belegte Marktspanne je Standort  ───────────────────────── */

export interface BelegterMarkt {
  wohnung: { min: number; max: number };
  haus: { min: number; max: number };
  /** Stichprobengröße (n) der ausgewerteten Abschlüsse — Quelle: die
   *  SPANNE_BELEGT-Kommentare in src/lib/marktdaten.ts:153–169. */
  n: number;
  /** Stand der Marktdaten, identisch zu MARKT_STAND aus marktdaten.ts. */
  stand: string;
}

/**
 * Stichprobengrößen der SPANNE_BELEGT-Einträge in marktdaten.ts. Dort selbst
 * nicht exportiert (Datei-Scope dieses Schritts erlaubt keine Änderung an
 * marktdaten.ts) — deshalb hier als eigene, klar benannte Konstante geführt.
 * MUSS synchron zu SPANNE_BELEGT bleiben: wird dort ein Ort ergänzt/entfernt
 * oder die Fallzahl aktualisiert, ist diese Liste von Hand nachzuziehen.
 * Gleiches Kopplungs-Muster wie REGION_BASIS/REGIONS in marktdaten.ts selbst.
 */
const SPANNE_BELEGT_N: Record<string, number> = {
  speyer: 39, // marktdaten.ts:154
  ludwigshafen: 15, // marktdaten.ts:160
  roemerberg: 9, // marktdaten.ts:162
  schifferstadt: 5, // marktdaten.ts:164
  dudenhofen: 5, // marktdaten.ts:166
};

/**
 * Belegte Preisspanne + Stichprobengröße + Stand für einen Standort-Slug.
 * `undefined`, wenn der Standort KEINEN SPANNE_BELEGT-Eintrag hat — die
 * Modellformel (marktort() ohne belegte Spanne) darf hier NIEMALS
 * einspringen, sonst stünde auf der Seite eine unbelegte Zahl als "belegt".
 */
export function belegtMarkt(standortSlug: string): BelegterMarkt | undefined {
  const n = SPANNE_BELEGT_N[standortSlug];
  if (n === undefined) return undefined;
  const ort = marktort(standortSlug);
  if (!ort) return undefined; // sollte bei den gepflegten Slugs nie eintreten, fail-soft trotzdem
  return { wohnung: ort.wohnung, haus: ort.haus, n, stand: MARKT_STAND };
}

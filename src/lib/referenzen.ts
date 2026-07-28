/**
 * Referenzobjekte je Ort — server-only, bewusst datensparsam.
 *
 * DATENSCHUTZ IST HIER DIE FÜHRENDE VORGABE: Die Einwilligung der Verkäufer
 * deckt die VERMARKTUNG ihres Objekts ab, nicht dessen dauerhafte
 * Veröffentlichung nach dem Abschluss. Ein verkauftes Objekt darf deshalb
 * nicht mit vollem Exposé weiterleben — hier bleibt pro Objekt NUR Objektart
 * und Fläche übrig, keine Adresse, kein Titel (kann Straße/Hausnummer
 * enthalten), kein Preis, keine Koordinaten, keine Fotos. Das deckt sich mit
 * getVerkauftesObjektById() in src/lib/verkauft.ts, das dieselbe reduzierte
 * Sicht für die einzelne 410-Statusseite baut.
 *
 * Grundlage ist getVerkaufteArchiv() aus src/lib/verkauft.ts (Verkauft-Pool
 * MINUS aktiv vermarktete Objekte) — diese Datei bleibt unverändert.
 */
import { cache } from "react";
import { getVerkaufteArchiv } from "@/lib/verkauft";
import { standorte } from "@/lib/geo";
import { categoryLabel } from "@/lib/format";
import type { Estate } from "@/lib/mock-estates";

/** Auf einen Ort reduzierter Eintrag — kein Preis, keine Adresse, kein Titel. */
export interface ReferenzEintrag {
  objektart: string;
  flaeche: number;
}

export interface ReferenzOrt {
  /** Standort-Slug aus geo-articles.json (kind "standort"), z. B. "speyer". */
  slug: string;
  /** Anzeigename, identisch mit GeoArticle.ort. */
  ort: string;
  eintraege: ReferenzEintrag[];
}

/**
 * Schwelle für eine eigene Ortsseite. Spiegelt bewusst die bestehende
 * Konvention aus marktdaten.ts:149-151 (unter n=5 keine eigene Aussage) —
 * eine Handvoll Objekte trägt weder eine Marktaussage noch eine dünne Seite.
 */
const MIN_EINTRAEGE = 5;

const norm = (s: string) => s.trim().toLowerCase();

/** Klammerzusatz entfernen: "Heppenheim (Bergstraße)" → "Heppenheim". */
const baseName = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();

/**
 * Robuster Ort↔City-Vergleich — 1:1 dieselbe Logik wie ortMatchesCity in
 * src/components/estates-teaser.tsx:34 (dort nicht exportiert, deshalb hier
 * dupliziert statt eine Komponente außerhalb des Auftrags-Scopes anzufassen).
 * Städte ohne Treffer in einem der 33 Standort-Slugs (z. B. Middelhagen auf
 * Rügen, Dahme in Ostholstein) fallen dadurch einfach durch — es wird kein
 * neuer Ort erfunden, um sie unterzubringen.
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
 * Reduziert ein Estate auf { objektart, flaeche } oder verwirft es.
 *
 * objektart ist die Kategorie (categoryLabel, src/lib/format.ts:71), ergänzt um
 * den OnOffice-Objekttyp, falls gepflegt. Der Objekttyp allein reicht dafür
 * NICHT: er ist die rohe CRM-Kennung und liefert Werte wie „Etage",
 * „Reihenmittel" oder „Hochparterre" (prettifyKey über objekttyp,
 * src/lib/onoffice.ts:563). In einer Spalte „Objektart" gelesen ergibt das
 * keine Objektart, sondern eine halbe Angabe. Deshalb dieselbe Darstellung
 * wie auf der 410-Statusseite (src/app/immobilien/verkauft/page.tsx):
 * „Wohnung · Etage". Beide Bestandteile kommen aus demselben Datensatz,
 * nichts wird ergänzt oder umgedeutet.
 *
 * flaeche ist die Wohnfläche, bei Grundstücken die Grundstücksfläche (dort
 * gibt es keine Wohnfläche). Fehlt sie, wird das Objekt ausgelassen: die
 * Feldabdeckung des Verkauft-Pools ist nicht geprüft, eine Lücke wird nicht
 * plausibel aufgefüllt.
 */
function reduziere(e: Estate): ReferenzEintrag | null {
  const kategorie = categoryLabel(e.category);
  if (!kategorie) return null;
  const objektart = e.objectType ? `${kategorie} · ${e.objectType}` : kategorie;
  const flaeche = e.category === "grundstueck" ? e.plotArea : e.livingArea;
  if (flaeche == null) return null;
  return { objektart, flaeche };
}

/**
 * Verkauft-Archiv gruppiert auf die 33 vorhandenen Standort-Slugs, je Ort auf
 * { objektart, flaeche } reduziert. Nur Orte mit mindestens MIN_EINTRAEGE
 * verwertbaren Einträgen kommen in die Liste (keine dünnen Seiten).
 *
 * Fail-soft in beide Richtungen: getVerkaufteArchiv() liefert bei Fehler oder
 * Mock-Betrieb bereits [] (s. src/lib/verkauft.ts) — der try/catch hier fängt
 * zusätzlich ab, falls ein künftiger Aufruf hier selbst einmal wirft, statt
 * die aufrufende Seite mitzureißen.
 */
export const referenzOrte = cache(async (): Promise<ReferenzOrt[]> => {
  try {
    const archiv = await getVerkaufteArchiv();
    if (archiv.length === 0) return [];

    const result: ReferenzOrt[] = [];
    for (const a of standorte()) {
      if (!a.ort) continue;
      const eintraege = archiv
        .filter((e) => ortMatchesCity(a.ort!, e.city))
        .map(reduziere)
        .filter((x): x is ReferenzEintrag => x !== null);
      if (eintraege.length >= MIN_EINTRAEGE) {
        result.push({ slug: a.slug, ort: a.ort, eintraege });
      }
    }
    return result;
  } catch {
    return [];
  }
});

/** Referenzdaten für genau einen Standort-Slug, `null` unterhalb der Schwelle oder ohne Treffer. */
export async function referenzenFuerOrt(slug: string): Promise<ReferenzOrt | null> {
  const orte = await referenzOrte();
  return orte.find((o) => o.slug === slug) ?? null;
}

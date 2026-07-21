/**
 * Daten-Anreicherung für den PDF-Marktwert-Report — bündelt vorhandenes
 * Website-Wissen (Preisatlas-Marktdaten, GEO-Standorttexte, RIEGEL-Kennzahlen)
 * zu einem Kontext-Objekt, das buildReportPdf() in eigene Report-Seiten
 * übersetzt. Rein deterministisch und synchron: keine Netzwerk-Aufrufe,
 * gleiche Eingabe → gleicher Kontext (wichtig für die /intern-Regeneration).
 *
 * Fail-soft auf jeder Ebene: ohne Stadt-Treffer fehlen markt/standortText
 * einfach (der Report lässt die Stadt-Visuals dann weg und fällt auf die
 * Metropolregion-Erzählung zurück) — es wird NIE geworfen.
 */
import { marktortByOrt, MARKT_STAND, type MarktOrt } from "@/lib/marktdaten";
import { standorte } from "@/lib/geo";
import { RIEGEL_STATS } from "@/lib/riegel-stats";

export interface ReportContext {
  /** Preisatlas-Marktdaten der eingegebenen Stadt (Spannen, Trend, Nachfrage …). */
  markt?: MarktOrt;
  /** Stand der Marktdaten ("Q3 2026") — für Quellenzeilen im PDF. */
  marktStand: string;
  /** Anzeigename der Stadt (aus dem Marktort, sonst die Roheingabe). */
  standortName?: string;
  /**
   * 1–2 Absätze Standort-Wissen aus dem GEO-Artikel der Stadt (Plaintext,
   * gekürzt) — macht den Report spürbar orts-spezifisch statt generisch.
   */
  standortText?: string[];
  /** Kuratierte RIEGEL-Kennzahlen (nur bestätigte Werte, s. riegel-stats.ts). */
  stats: {
    aktiveSuchauftraege: number;
    immoscoutAufrufe: number;
    exposeAufrufe: number;
    besichtigungenProJahr: number;
    oVermarktungstage: number;
    jahreAmMarkt: string;
    immobilienErfahrungJahre: number;
    /** Abgelesene Google-Bewertungen: 414 Speyer + 35 Ludwigshafen. */
    googleBewertungen: number;
  };
  /** Bestätigte Verkaufsargumente — Reihenfolge = Anzeige-Reihenfolge im PDF. */
  usps: string[];
}

/** Absatz-Kürzung an Satzgrenzen (kein hartes Abschneiden mitten im Satz). */
function trimToSentences(text: string, maxChars: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastEnd > maxChars * 0.5 ? cut.slice(0, lastEnd + 1) : cut.trimEnd() + " …";
}

export function buildReportContext(input: {
  city?: string;
  lat?: number | null;
  lng?: number | null;
}): ReportContext {
  const markt = marktortByOrt(input.city ?? "", input.lat ?? undefined, input.lng ?? undefined);

  // GEO-Standortartikel über den gemeinsamen Slug (marktdaten.ts baut seine
  // Orte AUS lib/geo.ts — die Slugs sind identisch).
  let standortText: string[] | undefined;
  if (markt) {
    const artikel = standorte().find((a) => a.slug === markt.slug);
    if (artikel) {
      const absaetze = [artikel.intro, artikel.sections[0]?.body ?? ""]
        .filter(Boolean)
        .map((p) => trimToSentences(p, 420))
        .filter((p) => p.length > 60);
      if (absaetze.length > 0) standortText = absaetze.slice(0, 2);
    }
  }

  return {
    markt,
    marktStand: MARKT_STAND,
    standortName: markt?.name ?? (input.city || undefined),
    standortText,
    stats: {
      aktiveSuchauftraege: RIEGEL_STATS.aktiveSuchauftraege,
      immoscoutAufrufe: RIEGEL_STATS.immoscoutAufrufe,
      exposeAufrufe: RIEGEL_STATS.exposeAufrufe,
      besichtigungenProJahr: RIEGEL_STATS.besichtigungenProJahr,
      oVermarktungstage: RIEGEL_STATS.oVermarktungstage,
      jahreAmMarkt: RIEGEL_STATS.jahreAmMarkt,
      immobilienErfahrungJahre: RIEGEL_STATS.immobilienErfahrungJahre,
      googleBewertungen: 449,
    },
    usps: [
      "121.000+ aktive Suchaufträge: Ihr Objekt findet Käufer oft schon vor der Veröffentlichung",
      "Direktankauf über zwei eigene Investorenfirmen, auf Wunsch diskret und ohne Vermarktung",
      "ImmoScout24-Goldpartner · ImmoAward 2025: Top 21 von über 25.000 Maklern in Deutschland",
      "449 Google-Bewertungen an zwei Standorten (Speyer und Ludwigshafen)",
      "Familienunternehmen mit über 40 Jahren Immobilienerfahrung in der Metropolregion Rhein-Neckar",
      "Rund 6.000 Besichtigungen pro Jahr, im Schnitt 90 Tage bis zum Verkauf",
    ],
  };
}

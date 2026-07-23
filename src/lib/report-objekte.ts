/**
 * Vergleichsobjekte für den PDF-Marktwert-Report — echte Objekte aus der
 * laufenden RIEGEL-Vermarktung PLUS von RIEGEL bereits VERKAUFTE Objekte
 * (auch deaktivierte/archivierte, s. getVerkaufteReferenzen) — passend zur
 * bewerteten Objektart, bevorzugt aus derselben Stadt. Verkaufte Referenzen
 * bekommen einen Score-Bonus: „hier gerade verkauft" ist das stärkste
 * Argument, gerade in kleinen Orten (Anfrage Inhaberseite, Fall
 * Kleinkarlbach). NUR in Server-Routen importieren (zieht
 * getEstateData/OnOffice mit).
 *
 * Ehrlichkeitspflicht wie überall (Live-Ticker, Experten-Seiten): läuft der
 * Bestand gerade auf dem Mock-Fallback, kommt ein LEERES Array zurück — im
 * Report erscheinen NIE Fantasie-Inserate. Fotos werden serverseitig geladen
 * und als Base64 eingebettet (das PDF muss offline funktionieren); jeder
 * Einzelfehler (Timeout, unbekanntes Format) kostet nur das Foto, nie den Report.
 */
import type { Estate } from "@/lib/mock-estates";
import { getEstateData, getVerkaufteReferenzen } from "@/lib/estates";
import { fetchEstateImageUrls } from "@/lib/onoffice";
import { distanceKm } from "@/lib/geo-distance";

/**
 * Relevanz-Kontext des bewerteten Objekts — je mehr davon vorliegt, desto
 * passender die Auswahl. Eingeführt nach echtem Fehlgriff: eine 563-Tsd-€-
 * Bewertung in Kleinkarlbach bekam drei verkaufte 120-150-Tsd-€-Wohnungen
 * als Referenzen, eine davon aus Mosbach (~75 km) — ohne Nähe- und
 * Preis-Signal gewann der pauschale Verkauft-Bonus.
 */
export interface ReferenzZiel {
  lat?: number;
  lng?: number;
  /** Schätzwert (mid) der Bewertung — Basis der Preisnähe. */
  preis?: number;
  /** Wohnfläche des bewerteten Objekts — Basis der Größenähnlichkeit. */
  flaeche?: number;
}

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
// Flächen kommen aus OnOffice teils mit Nachkommastellen ("318.51") —
// deutsch formatiert mit max. 1 Dezimale ("318,5 m²").
const qm = (n: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);

export interface ReportVergleichsObjekt {
  titel: string;
  /** "67346 Speyer" — Anzeigeort. */
  ort: string;
  /** Formatiert inkl. Label, z. B. "385.000 € · Kaufpreis". */
  preis?: string;
  flaeche?: string;
  zimmer?: string;
  /** true = verkauft/vermietet ("Erfolgreich vermittelt"), false = aktiv. */
  vermittelt: boolean;
  /**
   * Ehrliche Einordnung fürs PDF (Feedback Manfred: ein 38-m²-Wochenendhaus
   * neben einem EFH darf nicht als „gleiche Objektklasse" laufen):
   * "vergleich" = wirklich vergleichbar (Nähe + Preis-/Größenband passt),
   * "referenz" = Vermarktungs-Referenz aus der Region, KEIN Wertvergleich.
   * Optional für Alt-Aufrufer/Fixtures; das PDF behandelt fehlend wie "referenz".
   */
  einordnung?: "vergleich" | "referenz";
  /** Luftlinie zum bewerteten Objekt in km (nur wenn beide Koordinaten vorliegen). */
  distanzKm?: number;
  fotoB64?: string;
  fotoKind?: "jpg" | "png";
}

// Mehrfamilienhaus-Heuristik wie in experten-objekte.ts: category "haus" +
// Signal im Titel/objectType (Ziffer vor "Familienhaus", damit
// "Einfamilienhaus" NICHT matcht).
const MFH_RE = /mehrfamilienhaus|zinshaus|wohnanlage|\b\d+\s*[- ]?\s*familienhaus/i;
const STELLPLATZ_RE = /tiefgarage|stellplatz|^garage$/i;

function passtZurObjektart(e: Estate, objektart: string): boolean {
  const hay = `${e.title} ${e.objectType ?? ""}`;
  switch (objektart) {
    case "wohnung":
      return e.category === "wohnung";
    case "haus":
      return e.category === "haus";
    case "mehrfamilienhaus":
      return e.category === "haus" && MFH_RE.test(hay);
    case "gewerbe":
      return e.category === "gewerbe" && !STELLPLATZ_RE.test(e.objectType ?? "");
    case "grundstueck":
      return e.category === "grundstueck";
    default:
      return false;
  }
}

/** Erstes Foto eines Objekts laden — Magic-Bytes entscheiden das Embed-Format. */
async function fetchFoto(url: string): Promise<{ b64: string; kind: "jpg" | "png" } | null> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000 || buf.length > 4_000_000) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8) return { b64: buf.toString("base64"), kind: "jpg" };
    if (buf[0] === 0x89 && buf[1] === 0x50) return { b64: buf.toString("base64"), kind: "png" };
    return null; // WebP & Co. kann pdf-lib nicht einbetten
  } catch {
    return null;
  }
}

export async function buildReportObjekte(
  objektart: string,
  city?: string,
  limit = 3,
  ziel?: ReferenzZiel,
): Promise<ReportVergleichsObjekt[]> {
  try {
    const [{ estates, source }, verkaufte] = await Promise.all([getEstateData(), getVerkaufteReferenzen()]);
    // Aktiver Pool nur bei echter OnOffice-Quelle (nie Mock-Inserate);
    // verkaufte Referenzen kommen ohnehin ausschließlich live aus OnOffice.
    const aktive = source === "onoffice" ? estates : [];
    const seen = new Set(aktive.map((e) => e.id));
    const pool = [...aktive, ...verkaufte.filter((e) => !seen.has(e.id))];
    if (pool.length === 0) return [];
    return await selectReportObjekte(pool, objektart, city, limit, ziel);
  } catch {
    return [];
  }
}

/**
 * Pure Auswahl + Foto-Einbettung, separat exportiert: Scripts außerhalb der
 * Next-Runtime (z. B. scripts/preview-report-mail.mts) können damit direkt
 * gegen fetchOnOfficeEstates arbeiten — getEstateData fällt unter tsx auf den
 * Mock zurück und der Ehrlichkeits-Guard oben liefert dann bewusst [].
 */
export async function selectReportObjekte(
  estates: Estate[],
  objektart: string,
  city?: string,
  limit = 3,
  ziel?: ReferenzZiel,
): Promise<ReportVergleichsObjekt[]> {
  try {
    const cityNorm = (city ?? "").trim().toLowerCase();
    // Wochenendhaus/Ferienobjekt-Signal: läuft im CRM als Kategorie "haus",
    // ist aber für eine normale EFH-Bewertung keine überzeugende Referenz
    // (Feedback Manfred: 38-m²-Wochenendhaus neben 180-m²-EFH).
    const FERIEN_RE = /wochenendhaus|ferienhaus|ferienwohnung|wochenendgrundst/i;
    const scored = estates
      .filter((e) => e.status !== "reserviert" && passtZurObjektart(e, objektart))
      .map((e) => {
        let score = 0;
        if (e.marketingType === "kauf") score += 2; // der Report richtet sich an Verkaufsinteressierte
        const cityMatch = !!cityNorm && e.city.trim().toLowerCase() === cityNorm;
        if (cityMatch) score += 3;
        if (e.images.length > 0) score += 1;
        // Abgeschlossene Verkäufe sind die stärkste Referenz („erfolgreich
        // vermittelt") — bevorzugen, besonders in Kombination mit Orts-Treffer.
        if (e.status === "verkauft" || e.status === "vermietet") score += 2;
        // Nähe zum bewerteten Objekt: Referenzen aus der direkten Umgebung
        // überzeugen; weit entfernte (z. B. Mosbach, ~75 km) wirken beliebig
        // und fliegen über die Negativ-Schwelle unten raus.
        let dist: number | undefined;
        if (ziel?.lat != null && ziel?.lng != null && e.geo) {
          dist = distanceKm(ziel.lat, ziel.lng, e.geo.lat, e.geo.lng);
          if (dist <= 15) score += 2;
          else if (dist <= 35) score += 1;
          else if (dist > 60) score -= 3;
        }
        // Preisnähe zum Schätzwert: eine 120-Tsd-€-Wohnung ist keine Referenz
        // für ein 560-Tsd-€-Objekt — Faktor ≤2 belohnen, >3,5 hart abwerten.
        let preisRatio: number | undefined;
        if (ziel?.preis && ziel.preis > 0 && e.price != null && e.price > 0) {
          preisRatio = Math.max(e.price / ziel.preis, ziel.preis / e.price);
          if (preisRatio <= 2) score += 1;
          else if (preisRatio > 3.5) score -= 3;
        }
        // Größenähnlichkeit (Wohnfläche): Faktor >2,5 wirkt für Kunden absurd.
        let flaecheRatio: number | undefined;
        if (ziel?.flaeche && ziel.flaeche > 0 && e.livingArea != null && e.livingArea > 0) {
          flaecheRatio = Math.max(e.livingArea / ziel.flaeche, ziel.flaeche / e.livingArea);
          if (flaecheRatio <= 1.6) score += 1;
          else if (flaecheRatio > 2.5) score -= 2;
        }
        // Ferien-/Wochenendobjekte abwerten, außer das bewertete Objekt ist
        // selbst klein (< 60 m², dann kann so eine Referenz sogar passen).
        const ferien = FERIEN_RE.test(`${e.title} ${e.objectType ?? ""}`);
        if (ferien && !(ziel?.flaeche && ziel.flaeche < 60)) score -= 2;

        // Ehrliche Einordnung fürs PDF: „vergleich" nur, wenn Nähe stimmt UND
        // kein bekanntes Ähnlichkeits-Signal dagegen spricht (unbekannte Werte
        // zählen nicht dagegen, Ferienobjekte nie als Vergleich).
        const nah = cityMatch || (dist != null && dist <= 20);
        const preisOk = preisRatio == null || preisRatio <= 2;
        const flaecheOk = flaecheRatio == null || flaecheRatio <= 1.8;
        const einordnung: "vergleich" | "referenz" = nah && preisOk && flaecheOk && !ferien ? "vergleich" : "referenz";

        return { e, score, einordnung, distanzKm: dist != null ? Math.round(dist) : undefined };
      })
      // Negative Scores sind aktiv schlechte Referenzen (zu weit weg und/oder
      // Preisklasse daneben): lieber weniger Referenzen zeigen als absurde —
      // ohne Treffer entfällt die Referenzobjekte-Seite ohnehin sauber.
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || b.e.updatedAt.localeCompare(a.e.updatedAt))
      .slice(0, limit);
    const gewaehlt = scored.map((x) => x.e);

    // Lazy-Foto-Auflösung: der Verkauft-Pool kommt OHNE Bild-URLs (s.
    // fetchVerkaufteReferenzen) — für die wenigen AUSGEWÄHLTEN Referenzen
    // die URLs jetzt nachladen (ein estatepictures-Call für ≤3 Ids).
    // Fail-soft: ohne URLs bleibt nur das Foto leer, nie die Referenz.
    const ohneBilder = gewaehlt.filter((e) => e.images.length === 0).map((e) => e.id);
    if (ohneBilder.length > 0) {
      try {
        const urls = await fetchEstateImageUrls(ohneBilder);
        for (const e of gewaehlt) {
          if (e.images.length === 0) e.images = urls.get(e.id) ?? [];
        }
      } catch {
        // Fotos entfallen, Referenzen bleiben.
      }
    }

    return await Promise.all(
      scored.map(async ({ e, einordnung, distanzKm }) => {
        const foto = e.images[0] ? await fetchFoto(e.images[0]) : null;
        return {
          titel: e.title,
          ort: [e.postcode, e.city].filter(Boolean).join(" "),
          preis: e.price != null && e.price > 0 ? `${eur(e.price)} · ${e.priceLabel}` : undefined,
          flaeche: e.livingArea ? `${qm(e.livingArea)} m²` : e.plotArea ? `${qm(e.plotArea)} m² Grundstück` : undefined,
          zimmer: e.rooms ? `${e.rooms} Zimmer` : undefined,
          vermittelt: e.status === "verkauft" || e.status === "vermietet",
          einordnung,
          distanzKm,
          fotoB64: foto?.b64,
          fotoKind: foto?.kind,
        };
      }),
    );
  } catch {
    return [];
  }
}

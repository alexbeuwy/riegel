/**
 * Vergleichsobjekte für den PDF-Marktwert-Report — echte Objekte aus der
 * laufenden RIEGEL-Vermarktung (OnOffice), passend zur bewerteten Objektart,
 * bevorzugt aus derselben Stadt. NUR in Server-Routen importieren (zieht
 * getEstateData/OnOffice mit).
 *
 * Ehrlichkeitspflicht wie überall (Live-Ticker, Experten-Seiten): läuft der
 * Bestand gerade auf dem Mock-Fallback, kommt ein LEERES Array zurück — im
 * Report erscheinen NIE Fantasie-Inserate. Fotos werden serverseitig geladen
 * und als Base64 eingebettet (das PDF muss offline funktionieren); jeder
 * Einzelfehler (Timeout, unbekanntes Format) kostet nur das Foto, nie den Report.
 */
import type { Estate } from "@/lib/mock-estates";
import { getEstateData } from "@/lib/estates";

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

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
): Promise<ReportVergleichsObjekt[]> {
  try {
    const { estates, source } = await getEstateData();
    if (source !== "onoffice") return [];
    return await selectReportObjekte(estates, objektart, city, limit);
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
): Promise<ReportVergleichsObjekt[]> {
  try {
    const cityNorm = (city ?? "").trim().toLowerCase();
    const gewaehlt = estates
      .filter((e) => e.status !== "reserviert" && passtZurObjektart(e, objektart))
      .map((e) => {
        let score = 0;
        if (e.marketingType === "kauf") score += 2; // der Report richtet sich an Verkaufsinteressierte
        if (cityNorm && e.city.trim().toLowerCase() === cityNorm) score += 3;
        if (e.images.length > 0) score += 1;
        return { e, score };
      })
      .sort((a, b) => b.score - a.score || b.e.updatedAt.localeCompare(a.e.updatedAt))
      .slice(0, limit)
      .map((x) => x.e);

    return await Promise.all(
      gewaehlt.map(async (e) => {
        const foto = e.images[0] ? await fetchFoto(e.images[0]) : null;
        return {
          titel: e.title,
          ort: [e.postcode, e.city].filter(Boolean).join(" "),
          preis: e.price != null && e.price > 0 ? `${eur(e.price)} · ${e.priceLabel}` : undefined,
          flaeche: e.livingArea ? `${e.livingArea} m²` : e.plotArea ? `${e.plotArea} m² Grundstück` : undefined,
          zimmer: e.rooms ? `${e.rooms} Zimmer` : undefined,
          vermittelt: e.status === "verkauft" || e.status === "vermietet",
          fotoB64: foto?.b64,
          fotoKind: foto?.kind,
        };
      }),
    );
  } catch {
    return [];
  }
}

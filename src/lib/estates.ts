/**
 * Gecachte Objekt-Datenquelle — server-only.
 *
 * Einheitlicher Einstiegspunkt für Komponenten/Seiten: liefert entweder Live-Daten
 * aus OnOffice oder die Mock-Fixtures als Fallback, ohne dass Aufrufer den
 * Unterschied kennen müssen (source-Feld ist nur für Debug-/Hinweisbanner gedacht).
 */
import { unstable_cache } from "next/cache";
import { fetchOnOfficeEstates } from "@/lib/onoffice";
import { mockEstates, ESTATE_ORTE, type Estate } from "@/lib/mock-estates";

export type EstateSource = "onoffice" | "mock";

export interface EstateData {
  estates: Estate[];
  source: EstateSource;
}

// Der HMAC-Timestamp im Request-Body ändert sich jede Sekunde — ein fetch-naher
// Cache-Key wäre also nie stabil. Deshalb cachen wir nicht den Request, sondern das
// Ergebnis dieser Funktion (Fallback auf Mock inklusive) über unstable_cache.
const getCachedEstateData = unstable_cache(
  async (): Promise<EstateData> => {
    const onOfficeEstates = await fetchOnOfficeEstates();
    if (onOfficeEstates) return { estates: onOfficeEstates, source: "onoffice" };
    return { estates: mockEstates, source: "mock" };
  },
  ["estates-source"],
  { revalidate: 300, tags: ["estates"] },
);

export async function getEstateData(): Promise<EstateData> {
  return getCachedEstateData();
}

export async function getEstateBySlug(
  slug: string,
): Promise<{ estate: Estate; source: EstateSource } | null> {
  const { estates, source } = await getEstateData();

  // Primär: numerische Id am Slug-Ende — übersteht Titeländerungen in OnOffice,
  // die sonst zu 404 bei bestehenden Links führen würden. Bewusst NUR gegen e.id
  // (der Slug wird ausschließlich daraus gebaut) — externalId/objektnr_extern ist
  // eine unabhängige Nummerierung und könnte auf ein falsches Objekt matchen.
  const idMatch = slug.match(/-([0-9]+)$/);
  if (idMatch) {
    const byId = estates.find((e) => e.id === idMatch[1]);
    if (byId) return { estate: byId, source };
  }

  // Sekundär: exakter Slug-Vergleich (deckt Mock-Slugs wie "e1-penthouse-…" ab).
  const bySlug = estates.find((e) => e.slug === slug);
  return bySlug ? { estate: bySlug, source } : null;
}

export async function getFeaturedEstates(n: number): Promise<Estate[]> {
  const { estates } = await getEstateData();
  const byUpdatedDesc = (a: Estate, b: Estate) => b.updatedAt.localeCompare(a.updatedAt);

  // Nur aktive Objekte: Reservierte/Verkaufte/Vermietete würden auf der
  // Startseite ohne Status-Badge (PropertyCard hat keins) als frisches
  // Angebot wirken — im Portal selbst zeigt PortalCard den Status weiterhin.
  const aktiv = estates.filter((e) => e.status === "aktiv");
  const featured = aktiv.filter((e) => e.isFeatured).sort(byUpdatedDesc);
  const rest = aktiv.filter((e) => !e.isFeatured).sort(byUpdatedDesc);

  return [...featured, ...rest].slice(0, n);
}

export async function getEstateOrte(): Promise<string[]> {
  const { estates, source } = await getEstateData();
  if (source === "mock") return ESTATE_ORTE;

  const orte = new Set(estates.map((e) => e.city).filter(Boolean));
  return [...orte].sort((a, b) => a.localeCompare(b, "de"));
}

import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { standorte, ratgeber, GEO_CONTENT_UPDATED } from "@/lib/geo";
import { getEstateData } from "@/lib/estates";

// Stabiles Datum statt `new Date()` — sonst meldet jede Sitemap-Auslieferung
// alle URLs als „gerade geändert" (wertloses Freshness-Signal).
const SITE_UPDATED = new Date("2026-07-01");
const GEO_UPDATED = new Date(GEO_CONTENT_UPDATED);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  // /merkliste + /konto sind nutzerspezifisch (robots-Disallow) → nicht listen.
  const routes = [
    "",
    "/immobilien",
    "/rechner",
    "/preisatlas",
    "/verkaufen",
    "/standorte",
    "/ratgeber",
    "/ueber-uns",
    "/kontakt",
    "/termin",
    "/impressum",
    "/datenschutz",
    "/widerruf",
  ];

  const { estates, source } = await getEstateData();
  // Mock-Objekte (/immobilien/[slug]) bleiben draußen — sonst indexiert Google
  // Beispiel-Inserate mit Fantasiepreisen. Echte OnOffice-Objekte werden gelistet.
  const estateRoutes =
    source === "onoffice"
      ? estates.map((e) => ({ url: `${base}/immobilien/${e.slug}`, lastModified: new Date(e.updatedAt) }))
      : [];

  return [
    ...routes.map((r) => ({ url: `${base}${r}`, lastModified: SITE_UPDATED })),
    ...standorte().map((a) => ({ url: `${base}/standorte/${a.slug}`, lastModified: GEO_UPDATED })),
    ...ratgeber().map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: GEO_UPDATED })),
    ...estateRoutes,
  ];
}

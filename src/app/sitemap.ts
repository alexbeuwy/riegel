import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { standorte, ratgeber, GEO_CONTENT_UPDATED } from "@/lib/geo";

// Stabiles Datum statt `new Date()` — sonst meldet jede Sitemap-Auslieferung
// alle URLs als „gerade geändert" (wertloses Freshness-Signal).
const SITE_UPDATED = new Date("2026-07-01");
const GEO_UPDATED = new Date(GEO_CONTENT_UPDATED);

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  // /merkliste + /konto sind nutzerspezifisch (robots-Disallow) → nicht listen.
  // Mock-Objekte (/immobilien/[slug]) bleiben bis zur OnOffice-Anbindung
  // draußen — sonst indexiert Google Beispiel-Inserate mit Fantasiepreisen.
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
  return [
    ...routes.map((r) => ({ url: `${base}${r}`, lastModified: SITE_UPDATED })),
    ...standorte().map((a) => ({ url: `${base}/standorte/${a.slug}`, lastModified: GEO_UPDATED })),
    ...ratgeber().map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: GEO_UPDATED })),
  ];
}

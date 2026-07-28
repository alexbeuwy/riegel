import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { standorte, ratgeber, GEO_CONTENT_UPDATED } from "@/lib/geo";
import { expertenSeiten, EXPERTEN_UPDATED } from "@/lib/experten";
import { getEstateData } from "@/lib/estates";

// Stabiles Datum statt `new Date()` — sonst meldet jede Sitemap-Auslieferung
// alle URLs als „gerade geändert" (wertloses Freshness-Signal).
// Exportiert, damit sitemap-inhalte.xml exakt dieselben Werte verwendet statt
// eigener, potenziell abweichender Konstanten.
export const SITE_UPDATED = new Date("2026-07-01");
export const GEO_UPDATED = new Date(GEO_CONTENT_UPDATED);
export const EXPERTEN_DATE = new Date(EXPERTEN_UPDATED);

// Ohne dieses Feld cached Vercel die Route mit ihrer Default-Dauer, die
// deutlich länger lief als die 300s des Objekt-Caches (gemessen: zwei Abrufe
// im Abstand von zwei Sekunden lieferten je "HIT" mit age 753 bzw. 755). Ein
// in OnOffice bereits entferntes Objekt blieb dadurch länger in der Sitemap
// stehen, als der Objekt-Cache es hergibt, Googlebot fand die URL noch und
// bekam kurz darauf 404. 300s hält die Sitemap so frisch wie die Objektdaten.
export const revalidate = 300;

// /merkliste + /konto sind nutzerspezifisch (robots-Disallow) → nicht listen.
// Exportiert, damit sitemap-inhalte.xml dieselbe Liste verwendet statt einer
// zweiten, potenziell abweichenden Kopie.
export const STATISCHE_ROUTEN = [
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const routes = STATISCHE_ROUTEN;

  const { estates, source } = await getEstateData();
  // Mock-Objekte (/immobilien/[slug]) bleiben draußen — sonst indexiert Google
  // Beispiel-Inserate mit Fantasiepreisen. Echte OnOffice-Objekte werden gelistet.
  const estateRoutes =
    source === "onoffice"
      ? estates.map((e) => ({ url: `${base}/immobilien/${e.slug}`, lastModified: new Date(e.updatedAt) }))
      : [];

  return [
    ...routes.map((r) => ({ url: `${base}${r}`, lastModified: SITE_UPDATED })),
    ...expertenSeiten.map((s) => ({ url: `${base}/verkaufen/${s.slug}`, lastModified: EXPERTEN_DATE })),
    ...standorte().map((a) => ({ url: `${base}/standorte/${a.slug}`, lastModified: GEO_UPDATED })),
    ...ratgeber().map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: GEO_UPDATED })),
    ...estateRoutes,
  ];
}

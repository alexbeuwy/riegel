import { site } from "@/lib/site";
import { standorte, ratgeber } from "@/lib/geo";
import { expertenSeiten } from "@/lib/experten";
import { SITE_UPDATED, GEO_UPDATED, EXPERTEN_DATE, STATISCHE_ROUTEN } from "@/app/sitemap";

/**
 * Diagnose-Sitemap: die stabilen Inhaltsseiten (statische Seiten,
 * /verkaufen/[typ], /standorte/[slug], /ratgeber/[slug]), ohne die volatilen
 * Objekt-URLs.
 *
 * Grund: sitemap.xml ist bereits bei Google eingereicht und muss unverändert
 * bleiben, aber die Search Console schlüsselt den Indexierungsstatus nur pro
 * eingereichter Sitemap auf. Ohne Aufteilung lässt sich nicht unterscheiden,
 * ob die "zurzeit nicht indexiert"-Funde von den volatilen OnOffice-Objekten
 * oder von diesen stabilen Seiten stammen. Dieselbe URL in mehreren Sitemaps
 * ist nach dem Sitemap-Protokoll zulässig, sitemap.xml bleibt daher
 * unverändert vollständig bestehen. Die Konstanten werden 1:1 aus sitemap.ts
 * übernommen, damit hier keine zweite, potenziell abweichende Datumsquelle
 * entsteht.
 */
export const revalidate = 300;

// XML erlaubt kein rohes "&" in Text/Attributen, z. B. bei Slugs mit
// kaufmännischem Und.
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const base = site.url;

  const urls = [
    ...STATISCHE_ROUTEN.map((r) => ({ loc: `${base}${r}`, lastmod: SITE_UPDATED })),
    ...expertenSeiten.map((s) => ({ loc: `${base}/verkaufen/${s.slug}`, lastmod: EXPERTEN_DATE })),
    ...standorte().map((a) => ({ loc: `${base}/standorte/${a.slug}`, lastmod: GEO_UPDATED })),
    ...ratgeber().map((a) => ({ loc: `${base}/ratgeber/${a.slug}`, lastmod: GEO_UPDATED })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod.toISOString()}</lastmod>\n  </url>`,
    ),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}

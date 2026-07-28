import { site } from "@/lib/site";
import { getEstateData } from "@/lib/estates";

/**
 * Diagnose-Sitemap: ausschließlich die Objekt-URLs (/immobilien/[slug]).
 *
 * Grund: sitemap.xml ist bereits bei Google eingereicht und muss unverändert
 * bleiben, aber die Search Console schlüsselt den Indexierungsstatus nur pro
 * eingereichter Sitemap auf. Ohne Aufteilung lässt sich nicht unterscheiden,
 * ob die "zurzeit nicht indexiert"-Funde von den volatilen OnOffice-Objekten
 * (verkaufte Objekte verschwinden, URL wird zu 404) oder von den stabilen
 * Standort-/Ratgeber-/Verkaufen-Seiten stammen. Dieselbe URL in mehreren
 * Sitemaps ist nach dem Sitemap-Protokoll zulässig, sitemap.xml bleibt daher
 * unverändert vollständig bestehen.
 */
export const revalidate = 300;

// XML erlaubt kein rohes "&" in Text/Attributen, und OnOffice übernimmt
// Sonderzeichen aus dem Objekttitel unverändert in den Slug.
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const base = site.url;
  const { estates, source } = await getEstateData();

  // Dieselbe Mock-Regel wie sitemap.ts: Mock-Objekte (Fantasiepreise) werden
  // nie gelistet, nur echte OnOffice-Objekte.
  const urls =
    source === "onoffice"
      ? estates.map((e) => ({ loc: `${base}/immobilien/${e.slug}`, lastmod: new Date(e.updatedAt) }))
      : [];

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

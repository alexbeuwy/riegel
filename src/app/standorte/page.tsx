import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { GeoExplorer, type GeoExplorerItem } from "@/components/geo/geo-explorer";
import { standorte } from "@/lib/geo";
import { STANDORT_REGIONS, standortRegion, standortRegionLabel, standortCoords } from "@/lib/geo-taxonomy";
import { site } from "@/lib/site";

export const metadata = {
  title: "Standorte & Regionen",
  description:
    "Immobilie verkaufen in Speyer, Ludwigshafen, Germersheim, Frankenthal und der gesamten Metropolregion Rhein-Neckar — Ihr lokaler Immobilienmakler Riegel Immobilien.",
  alternates: { canonical: "/standorte" },
};

export default function StandorteIndex() {
  const items: GeoExplorerItem[] = standorte().map((a) => {
    const region = standortRegion(a);
    const c = standortCoords(a.slug);
    return {
      slug: a.slug,
      href: `/standorte/${a.slug}`,
      title: a.h1,
      desc: a.metaDescription,
      eyebrow: a.ort,
      category: region,
      categoryLabel: standortRegionLabel(region),
      icon: "pin" as const,
      lng: c?.lng,
      lat: c?.lat,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Standorte & Regionen",
        description: metadata.description,
        url: `${site.url}/standorte`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.eyebrow ?? it.title,
            url: `${site.url}${it.href}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Standorte", item: `${site.url}/standorte` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageIntro eyebrow="Standorte & Regionen" title="Ihr Immobilienmakler in der Metropolregion Rhein-Neckar">
        Lokale Marktkenntnis zahlt sich aus. Wählen Sie Ihre Stadt — wir kennen
        den Markt vor Ort und verkaufen Ihre Immobilie zum bestmöglichen Preis.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          {items.length === 0 ? (
            <p className="text-muted">Standortseiten folgen in Kürze.</p>
          ) : (
            <GeoExplorer
              items={items}
              categories={STANDORT_REGIONS}
              withMap
              cols={3}
              searchPlaceholder="Ort suchen — z. B. Speyer, Schifferstadt, Landau …"
              cta="Mehr erfahren"
            />
          )}
        </Container>
      </section>
    </>
  );
}

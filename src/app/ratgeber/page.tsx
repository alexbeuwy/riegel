import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { GeoExplorer, type GeoExplorerItem } from "@/components/geo/geo-explorer";
import { ratgeber } from "@/lib/geo";
import { RATGEBER_CATEGORIES, ratgeberCategory, ratgeberCategoryLabel, ratgeberIcon } from "@/lib/geo-taxonomy";
import { site } from "@/lib/site";

export const metadata = {
  title: "Ratgeber rund um den Immobilienverkauf",
  description:
    "Immobilienbewertung, Maklerprovision, Energieausweis, Ablauf des Hausverkaufs — verständlich erklärt von Riegel Immobilien für die Vorderpfalz und Rhein-Neckar.",
  alternates: { canonical: "/ratgeber" },
};

export default function RatgeberIndex() {
  const items: GeoExplorerItem[] = ratgeber().map((a) => {
    const cat = ratgeberCategory(a);
    return {
      slug: a.slug,
      href: `/ratgeber/${a.slug}`,
      title: a.h1,
      desc: a.metaDescription,
      category: cat,
      categoryLabel: ratgeberCategoryLabel(cat),
      icon: ratgeberIcon(a),
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Ratgeber rund um den Immobilienverkauf",
        description: metadata.description,
        url: `${site.url}/ratgeber`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.title,
            url: `${site.url}${it.href}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Ratgeber", item: `${site.url}/ratgeber` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageIntro eyebrow="Ratgeber" title="Wissen für Eigentümer & Verkäufer">
        Klare Antworten auf die wichtigsten Fragen rund um Verkauf, Bewertung und
        Kosten — fundiert und regional eingeordnet.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          {items.length === 0 ? (
            <p className="text-muted">Ratgeber-Artikel folgen in Kürze.</p>
          ) : (
            <GeoExplorer
              items={items}
              categories={RATGEBER_CATEGORIES}
              cols={2}
              searchPlaceholder="Ratgeber durchsuchen — z. B. Provision, Erbe, Energieausweis …"
              cta="Artikel lesen"
            />
          )}
        </Container>
      </section>
    </>
  );
}

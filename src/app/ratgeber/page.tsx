import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { GeoExplorer, type GeoExplorerItem } from "@/components/geo/geo-explorer";
import { ratgeber } from "@/lib/geo";
import { RATGEBER_CATEGORIES, ratgeberCategory, ratgeberCategoryLabel, ratgeberIcon } from "@/lib/geo-taxonomy";

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

  return (
    <>
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

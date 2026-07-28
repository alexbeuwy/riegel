import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { kaufKombis } from "@/lib/kaufseiten";
import { categoryLabel } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata = {
  title: "Immobilien kaufen in der Metropolregion Rhein-Neckar",
  description:
    "Häuser und Wohnungen zum Kauf, nach Ort und Objektart gebündelt: aktueller Bestand von RIEGEL Immobilien mit belegten Marktdaten je Standort.",
  alternates: { canonical: "/kaufen" },
};

/**
 * Hub für die /kaufen/[slug]-Seiten.
 *
 * Angelegt, weil die Einzelseiten zwar von der jeweiligen Standortseite
 * verlinkt sind, /kaufen selbst aber 404 lieferte (nachgemessen). Wer die
 * Adresse kürzt, landete damit im Nichts, und die Seiten hatten keinen
 * gemeinsamen Einstieg. /referenzen hatte einen solchen Hub bereits, das war
 * schlicht unsymmetrisch.
 *
 * Bewusst KEINE ItemList im Markup: die Kombinationsliste ist absichtlich
 * klein gehalten und ändert sich mit dem Bestand (s. KAUF_KOMBIS), sie ist
 * keine feste, sinnvoll aufzählbare Seitenmenge wie die Experten-Seiten.
 */
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Immobilien kaufen", item: `${site.url}/kaufen` },
        ],
      },
    ],
  };
}

export default function KaufenPage() {
  const kombis = kaufKombis();

  return (
    <article className="py-20 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <Container>
        <nav className="text-sm text-faint">
          <Link href="/" className="hover:text-fg">
            Start
          </Link>
          {" / "}
          <span className="text-muted">Immobilien kaufen</span>
        </nav>

        <div className="mt-6 max-w-2xl">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
            <Icon name="search" size={22} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-fg sm:text-4xl">Immobilien kaufen</h1>
          <p className="mt-5 leading-relaxed text-muted">
            Häuser und Wohnungen nach Ort und Objektart gebündelt. Jede Seite zeigt den
            aktuellen Bestand von RIEGEL Immobilien und die Marktdaten des jeweiligen
            Standorts. Aufgeführt sind nur Orte, für die uns eine aus echten Abschlüssen
            belegte Preisspanne vorliegt und in denen wir derzeit auch tatsächlich
            vermitteln.
          </p>
        </div>

        {kombis.length === 0 ? (
          <p className="mt-10 text-muted">
            Derzeit liegt für keine Kombination aus Ort und Objektart ausreichend Bestand vor.
            Den vollständigen Bestand finden Sie im{" "}
            <Link href="/immobilien" className="text-accent underline">
              Immobilienportal
            </Link>
            .
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kombis.map((k) => (
              <Link
                key={k.slug}
                href={`/kaufen/${k.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
              >
                <div className="min-w-0">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">
                    {categoryLabel(k.kategorie)} kaufen
                  </div>
                  <div className="mt-0.5 truncate text-sm font-medium text-fg">{k.ort}</div>
                </div>
                <Icon
                  name="arrowRight"
                  size={16}
                  className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        )}

        <p className="mt-8 text-sm text-muted">
          Sie suchen einen anderen Ort oder eine andere Objektart?{" "}
          <Link href="/immobilien" className="text-accent underline">
            Im Immobilienportal
          </Link>{" "}
          finden Sie den gesamten Bestand mit Karte und Filtern.
        </p>
      </Container>
    </article>
  );
}

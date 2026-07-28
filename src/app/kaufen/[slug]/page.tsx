import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { Icon } from "@/components/icon";
import { PropertyCard } from "@/components/property-card";
import { KaufseiteMarkt } from "@/components/kaufseite-markt";
import { site } from "@/lib/site";
import { categoryLabel } from "@/lib/format";
import { kaufKombis, getKaufKombi, getKombiObjekte, type KaufKombi } from "@/lib/kaufseiten";

/** Plural-Form je Kategorie für Fließtext — Kaufkombis sind laut
 *  kaufseiten.ts strikt auf haus/wohnung begrenzt, kein weiterer Fall nötig. */
const KATEGORIE_PLURAL: Record<KaufKombi["kategorie"], string> = {
  haus: "Häuser",
  wohnung: "Wohnungen",
};

function h1Of(kombi: KaufKombi): string {
  // Suchmuster der Portale, z. B. "Haus kaufen in Speyer" (Vorgabe Auftrag).
  return `${categoryLabel(kombi.kategorie)} kaufen in ${kombi.ort}`;
}

export function generateStaticParams() {
  return kaufKombis().map((k) => ({ slug: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kombi = getKaufKombi(slug);
  if (!kombi) return { title: "Kaufen" };
  const h1 = h1Of(kombi);
  const url = `/kaufen/${kombi.slug}`;
  const description =
    `${h1}: aktuelle Angebote von RIEGEL Immobilien, Ihrem Makler in der Metropolregion ` +
    `Rhein-Neckar, mit belegter Preisspanne für ${kombi.ort}.`;
  return {
    // absolute: Marke steht bereits im Titel selbst (wie /standorte/[slug]).
    title: { absolute: `${h1} | ${site.name}` },
    description,
    alternates: { canonical: url },
    openGraph: { title: h1, description, url, type: "website" },
  };
}

export default async function KaufSeite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kombi = getKaufKombi(slug);
  if (!kombi) notFound();

  // Live-Bestand zur Anzeigezeit — fail-soft [] bei Mock-Fallback/Fehler
  // (s. getKombiObjekte in kaufseiten.ts), NICHT die feste Messzahl aus dem
  // KAUF_KOMBIS-Kommentar (die diente nur der Zulassungsprüfung der Seite).
  const objekte = await getKombiObjekte(kombi);

  const h1 = h1Of(kombi);
  const kategoriePlural = KATEGORIE_PLURAL[kombi.kategorie];
  const pageUrl = `${site.url}/kaufen/${kombi.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Immobilien", item: `${site.url}/immobilien` },
          { "@type": "ListItem", position: 3, name: h1, item: pageUrl },
        ],
      },
      // Nur mit echten Treffern — kein ItemList-Knoten ohne Inhalt.
      ...(objekte.length > 0
        ? [
            {
              "@type": "ItemList",
              itemListElement: objekte.map((e, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${site.url}/immobilien/${e.slug}`,
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <article className="pb-20 sm:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageIntro eyebrow="Immobilien kaufen" title={h1}>
        {objekte.length > 0 ? (
          <>
            RIEGEL Immobilien vermittelt aktuell {objekte.length} {kategoriePlural} zum Kauf in{" "}
            {kombi.ort}. Als Makler in der Metropolregion Rhein-Neckar begleiten wir Kaufinteressierte
            durch den gesamten Ablauf.
          </>
        ) : (
          <>
            RIEGEL Immobilien ist Makler für {kategoriePlural} in der Metropolregion Rhein-Neckar,
            mit Standorten in Speyer und Ludwigshafen. Aktuell liegt für {kombi.ort} kein aktives
            Angebot dieser Art vor — sprechen Sie uns gern zu Ihrem Kaufwunsch an.
          </>
        )}
      </PageIntro>

      <Container>
        {/* Objektliste — fail-soft: bei 0 Treffern entfällt die Sektion
            vollständig (gleiches Muster wie EstatesTeaser), keine leere
            Überschrift ohne Inhalt. */}
        {objekte.length > 0 && (
          <section className="mt-12 sm:mt-16">
            <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
              <span className="text-accent">
                <Icon name="home" size={20} />
              </span>
              Aktuelle {kategoriePlural} in {kombi.ort}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {objekte.map((e) => (
                <PropertyCard key={e.id} estate={e} />
              ))}
            </div>
            <Link
              // Portalfilter-Parameter aus src/lib/portal-filter.ts (typ, typ_obj,
              // ort) — ort mit der TATSÄCHLICHEN city des ersten Treffers, nicht
              // mit kombi.ort ("Ludwigshafen am Rhein" u. Ä. matcht dort nicht
              // exakt, ebenso in estates-teaser.tsx).
              href={`/immobilien?typ=kauf&typ_obj=${kombi.kategorie}&ort=${encodeURIComponent(objekte[0].city)}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Alle {kategoriePlural} in {kombi.ort} im Portal ansehen
              <Icon name="arrowRight" size={14} />
            </Link>
          </section>
        )}

        {/* Marktdaten — eigene Komponente, zeigt nur die belegte Spanne
            (s. kaufseite-markt.tsx). Rendert selbst nichts ohne Beleg. */}
        <KaufseiteMarkt kombi={kombi} />

        {/* Interne Links auf bestehende Seiten — keine neuen Pfade. */}
        <section className="mt-16 sm:mt-20">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
            <span className="text-accent">
              <Icon name="layers" size={20} />
            </span>
            Weiterführend
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={`/standorte/${kombi.standortSlug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
            >
              <div className="min-w-0">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Standort-Guide</div>
                <div className="mt-0.5 truncate text-sm font-medium text-fg">Immobilienmakler {kombi.ort}</div>
              </div>
              <Icon name="pin" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/preisatlas?ort=${kombi.standortSlug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
            >
              <div className="min-w-0">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Preisatlas</div>
                <div className="mt-0.5 truncate text-sm font-medium text-fg">Alle Marktdaten für {kombi.ort}</div>
              </div>
              <Icon name="trend" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/rechner"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
            >
              <div className="min-w-0">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Bewertung</div>
                <div className="mt-0.5 truncate text-sm font-medium text-fg">Immobilie bewerten lassen</div>
              </div>
              <Icon name="calculator" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/verkaufen"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
            >
              <div className="min-w-0">
                <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Für Eigentümer</div>
                <div className="mt-0.5 truncate text-sm font-medium text-fg">Immobilie verkaufen</div>
              </div>
              <Icon name="handshake" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </Container>
    </article>
  );
}

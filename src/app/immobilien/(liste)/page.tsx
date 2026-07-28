import { Container } from "@/components/container";
import { FilterBar } from "@/components/portal/filter-bar";
import { ActiveChips } from "@/components/portal/active-chips";
import { PortalView } from "@/components/portal/portal-view";
import { SaveSearchButton } from "@/components/saved-searches";
import type { Estate } from "@/lib/mock-estates";
import { getEstateData, getEstateOrte } from "@/lib/estates";
import { filterEstates, parseFilters, type SearchParamsObj } from "@/lib/portal-filter";
import { site } from "@/lib/site";

export const metadata = {
  title: "Immobilien",
  description:
    "Alle Immobilienangebote von RIEGEL Immobilien — filtern nach Typ, Preis, Ort, Zimmern und Fläche, mit interaktiver Karte. Keine Weiterleitung.",
  alternates: { canonical: "/immobilien" },
};

/**
 * Strukturierte Daten für die Trefferliste (CollectionPage + ItemList) und die
 * Breadcrumb, analog zu src/app/ratgeber/page.tsx. Bislang lieferte /immobilien
 * live nur das globale RealEstateAgent-Snippet aus dem Layout aus, kein eigenes
 * Markup für den Seitentyp.
 */
function jsonLd(results: Estate[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Immobilien",
        description: metadata.description,
        url: `${site.url}/immobilien`,
        mainEntity: {
          "@type": "ItemList",
          // Auf 100 Einträge begrenzt: strukturierte Daten sollen die Kern-
          // Trefferliste abbilden, nicht jeden Filterzustand bis zum letzten
          // Objekt auflisten.
          itemListElement: results.slice(0, 100).map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: e.title,
            url: `${site.url}/immobilien/${e.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Immobilien", item: `${site.url}/immobilien` },
        ],
      },
    ],
  };
}

export default async function ImmobilienPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsObj>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [{ estates, source }, orte] = await Promise.all([getEstateData(), getEstateOrte()]);
  const results = filterEstates(estates, filters);

  return (
    <div>
      {/* "<" escapen wie in src/app/immobilien/[slug]/page.tsx: Objekttitel
          stammen aus dem CRM (OnOffice), JSON.stringify lässt "</script>" sonst
          unverändert durch. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(results)).replace(/</g, "\\u003c") }}
      />
      <h1 className="sr-only">Immobilienangebote in Speyer, Ludwigshafen &amp; der Metropolregion Rhein-Neckar</h1>
      <div className="border-b border-border bg-bg pt-6">
        <Container className="pb-5">
          <FilterBar filters={filters} orte={orte} />
          {/* Zähler + „Suche speichern" auf einer sauberen horizontalen Achse (statt hängendem Einzel-Button) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <ActiveChips filters={filters} resultCount={results.length} />
            <SaveSearchButton />
          </div>
        </Container>
      </div>
      <PortalView estates={results} />
      <p className="px-5 pb-10 text-xs text-faint sm:px-8">
        {source === "mock"
          ? "Vorschau mit Beispiel-Objekten · Live-Anbindung an OnOffice in Vorbereitung · Karten-Tiles © OpenStreetMap, © CARTO."
          : "Live-Daten aus der RIEGEL-Objektverwaltung · Karten-Tiles © OpenStreetMap, © CARTO."}
      </p>
    </div>
  );
}

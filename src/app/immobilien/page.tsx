import { Container } from "@/components/container";
import { FilterBar } from "@/components/portal/filter-bar";
import { ActiveChips } from "@/components/portal/active-chips";
import { PortalView } from "@/components/portal/portal-view";
import { SaveSearchButton } from "@/components/saved-searches";
import { getEstateData, getEstateOrte } from "@/lib/estates";
import { filterEstates, parseFilters, type SearchParamsObj } from "@/lib/portal-filter";

export const metadata = {
  title: "Immobilien",
  description:
    "Alle Immobilienangebote von RIEGEL Immobilien — filtern nach Typ, Preis, Ort, Zimmern und Fläche, mit interaktiver Karte. Keine Weiterleitung.",
  alternates: { canonical: "/immobilien" },
};

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

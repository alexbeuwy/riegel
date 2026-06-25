import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { PropertyCard } from "@/components/property-card";
import { mockEstates } from "@/lib/mock-estates";

export const metadata = { title: "Immobilien" };

export default function ImmobilienPage() {
  return (
    <>
      <PageIntro eyebrow="Portal" title="Immobilienangebote">
        Filtern Sie nach Typ, Preis, Ort, Zimmern und Fläche — mit Karte und
        teilbarer Suche, ganz ohne Weiterleitung. Das vollständige
        Such-Erlebnis (Karte + Liste, Live-Filter) ist in Vorbereitung; unten
        sehen Sie eine Vorschau mit Beispiel-Objekten.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockEstates.map((e) => (
              <PropertyCard key={e.slug} estate={e} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

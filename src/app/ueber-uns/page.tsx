import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { site } from "@/lib/site";

export const metadata = { title: "Über uns" };

export default function UeberUnsPage() {
  return (
    <>
      <PageIntro eyebrow="Über uns" title="Regional verwurzelt, persönlich engagiert">
        Riegel Immobilien steht für Diskretion, Erfahrung und echte
        Marktkenntnis in Speyer, Ludwigshafen und der Vorderpfalz.
      </PageIntro>
      <section className="py-20">
        <Container>
          <div className="max-w-2xl space-y-5 text-muted">
            <p>
              Als inhabergeführtes Maklerunternehmen begleiten wir Eigentümer
              und Kaufinteressenten mit persönlicher Betreuung — vom ersten
              Gespräch bis zur Schlüsselübergabe.
            </p>
            <p>Unsere Region: {site.regions.join(" · ")}.</p>
          </div>
        </Container>
      </section>
    </>
  );
}

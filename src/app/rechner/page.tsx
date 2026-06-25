import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Calculator } from "@/components/calculator/calculator";

export const metadata = {
  title: "Immobilienbewertung",
  description:
    "Kostenlose, datenbasierte Sofort-Bewertung Ihrer Immobilie in Speyer, Ludwigshafen und der Vorderpfalz — aus Bodenrichtwerten, Vergleichsobjekten und eigener Transaktionsdatenbank.",
};

export default function RechnerPage() {
  return (
    <>
      <PageIntro eyebrow="Kostenlos & unverbindlich" title="Was ist Ihre Immobilie wert?">
        In 60 Sekunden zur datenbasierten Einschätzung — zusammengeführt aus
        amtlichen Bodenrichtwerten, Vergleichsobjekten und unserer eigenen
        Transaktionsdatenbank.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          <Calculator />
        </Container>
      </section>
    </>
  );
}

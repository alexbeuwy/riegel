import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { BookingTool } from "@/components/booking-tool";

export const metadata = {
  title: "Termin vereinbaren",
  description:
    "Besichtigung oder Beratung bei Riegel Immobilien online buchen — Anlass, Datum und Uhrzeit wählen, wir bestätigen kurzfristig.",
};

export default function TerminPage() {
  return (
    <>
      <PageIntro eyebrow="Termin" title="Besichtigung & Beratung buchen">
        Wählen Sie Anlass, Datum und Uhrzeit — wir bestätigen Ihren Wunschtermin
        kurzfristig, persönlich oder digital.
      </PageIntro>
      <section className="py-14">
        <Container>
          <BookingTool />
        </Container>
      </section>
    </>
  );
}

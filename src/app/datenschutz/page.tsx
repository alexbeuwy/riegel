import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutzerklärung" />
      <section className="py-16">
        <Container>
          <div className="rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ Entwurf / Platzhalter — die Datenschutzerklärung (Art. 13 DSGVO)
            inkl. eingesetzter Dienste (OnOffice, Adobe Fonts, Karten,
            Buchungstool) ist anwaltlich zu erstellen. Externe Embeds werden vor
            dem Go-Live hinter ein echtes Consent-Tool gelegt. Siehe
            <code> docs/legal-checklist.md</code>.
          </div>
          <div className="mt-8 max-w-2xl space-y-2 text-muted">
            <p>Verantwortlicher: Riegel Immobilien · [Anschrift]</p>
            <p>Diese Seite befindet sich im Aufbau.</p>
          </div>
        </Container>
      </section>
    </>
  );
}

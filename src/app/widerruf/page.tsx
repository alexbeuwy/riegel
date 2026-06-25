import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Widerruf" };

export default function WiderrufPage() {
  return (
    <>
      <PageIntro eyebrow="Verbraucherrecht" title="Widerrufsbelehrung">
        Verbraucher haben bei im Fernabsatz geschlossenen Maklerverträgen ein
        Widerrufsrecht. Die rechtsverbindliche Belehrung folgt nach
        anwaltlicher Prüfung.
      </PageIntro>
      <section className="py-16">
        <Container>
          <div className="rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ Entwurf / Platzhalter — Widerrufsbelehrung und Muster-Widerrufs­formular
            müssen WORTGLEICH der Anlage 2 EGBGB entsprechen und anwaltlich
            geprüft werden (höchstes kommerzielles Risiko für den
            Provisionsanspruch). Siehe <code>docs/legal-checklist.md</code>.
          </div>
          <div className="mt-8 max-w-2xl space-y-4 text-muted">
            <h2 className="text-xl font-semibold text-fg">Widerrufsrecht</h2>
            <p>
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
              diesen Vertrag zu widerrufen. [Platzhalter — vollständiger,
              geprüfter Text folgt.]
            </p>
            <h2 className="text-xl font-semibold text-fg">Muster-Widerrufsformular</h2>
            <p>[Platzhalter — Anlage 2 EGBGB.]</p>
          </div>
        </Container>
      </section>
    </>
  );
}

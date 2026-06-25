import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Impressum" />
      <section className="py-16">
        <Container>
          <div className="rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ Entwurf / Platzhalter — Pflichtangaben (§ 5 DDG, § 34c GewO,
            Aufsichtsbehörde, MaBV) sind von Sissy zu liefern und anwaltlich zu
            prüfen. Siehe <code>docs/legal-checklist.md</code>.
          </div>
          <div className="mt-8 max-w-2xl space-y-2 text-muted">
            <p>Angaben gemäß § 5 DDG</p>
            <p>Riegel Immobilien · [Anschrift]</p>
            <p>Vertreten durch: Sylwia Riegel</p>
            <p>Kontakt: [Telefon] · [E-Mail]</p>
            <p>Aufsichtsbehörde (§ 34c GewO): [zuständige Behörde]</p>
            <p>USt-IdNr.: [falls vorhanden]</p>
          </div>
        </Container>
      </section>
    </>
  );
}

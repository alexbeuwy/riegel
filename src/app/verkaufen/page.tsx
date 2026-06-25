import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Verkaufen" };

const steps = [
  ["01", "Bewertung", "Kostenfreie, fundierte Markteinschätzung Ihrer Immobilie."],
  ["02", "Vermarktung", "Hochwertige Aufbereitung und gezielte, diskrete Ansprache."],
  ["03", "Abschluss", "Begleitung bis zum Notartermin und zur Übergabe."],
];

export default function VerkaufenPage() {
  return (
    <>
      <PageIntro eyebrow="Für Eigentümer" title="Immobilie verkaufen">
        Wir verkaufen Ihre Immobilie zum bestmöglichen Preis — mit regionaler
        Marktkenntnis, professioneller Vermarktung und persönlicher Begleitung.
      </PageIntro>
      <section className="py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map(([n, t, d]) => (
              <div key={n} className="rounded-xl border border-border bg-surface p-7">
                <div className="text-sm text-accent">{n}</div>
                <h2 className="mt-3 text-xl font-semibold">{t}</h2>
                <p className="mt-2 text-muted">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href="/rechner"
              className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Jetzt kostenlos bewerten
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

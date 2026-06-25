import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Immobilienbewertung" };

export default function RechnerPage() {
  return (
    <>
      <PageIntro eyebrow="Kostenlos" title="Was ist Ihre Immobilie wert?">
        Erhalten Sie eine fundierte, datenbasierte Einschätzung für Ihr Haus,
        Ihre Wohnung, Ihr Grundstück oder Gewerbe in der Region. Der interaktive
        Bewertungsrechner ist in Entwicklung.
      </PageIntro>
      <section className="py-20">
        <Container>
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12">
            <h2 className="text-2xl font-semibold">Bewertung in Vorbereitung</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Wir bauen einen hochwertigen Bewertungsrechner mit Ergebnis-Spanne
              und regionalen Daten. Bis dahin erstellen wir Ihre Bewertung gerne
              persönlich — unverbindlich und kostenfrei.
            </p>
            <Link
              href="/kontakt"
              className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Persönliche Bewertung anfragen
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

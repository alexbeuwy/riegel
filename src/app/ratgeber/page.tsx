import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icon";
import { ratgeber } from "@/lib/geo";

export const metadata = {
  title: "Ratgeber rund um den Immobilienverkauf",
  description:
    "Immobilienbewertung, Maklerprovision, Energieausweis, Ablauf des Hausverkaufs — verständlich erklärt von Riegel Immobilien für die Vorderpfalz und Rhein-Neckar.",
  alternates: { canonical: "/ratgeber" },
};

export default function RatgeberIndex() {
  const artikel = ratgeber();
  return (
    <>
      <PageIntro eyebrow="Ratgeber" title="Wissen für Eigentümer & Verkäufer">
        Klare Antworten auf die wichtigsten Fragen rund um Verkauf, Bewertung und
        Kosten — fundiert und regional eingeordnet.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          {artikel.length === 0 ? (
            <p className="text-muted">Ratgeber-Artikel folgen in Kürze.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {artikel.map((a, i) => (
                <Reveal key={a.slug} delay={i * 60}>
                  <Link
                    href={`/ratgeber/${a.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-500 hover:-translate-y-0.5 hover:border-accent/50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent transition-colors group-hover:border-accent/50">
                      <Icon name="doc" size={20} />
                    </span>
                    <h2 className="mt-5 text-lg font-semibold text-fg">{a.h1}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{a.metaDescription}</p>
                    <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-accent">
                      Artikel lesen
                      <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

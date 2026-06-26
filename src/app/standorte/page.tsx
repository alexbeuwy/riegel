import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icon";
import { standorte } from "@/lib/geo";

export const metadata = {
  title: "Standorte & Regionen",
  description:
    "Immobilie verkaufen in Speyer, Ludwigshafen, Germersheim, Frankenthal und der gesamten Vorderpfalz — Ihr lokaler Immobilienmakler Riegel Immobilien.",
  alternates: { canonical: "/standorte" },
};

export default function StandorteIndex() {
  const orte = standorte();
  return (
    <>
      <PageIntro eyebrow="Standorte & Regionen" title="Ihr Immobilienmakler in der Vorderpfalz">
        Lokale Marktkenntnis zahlt sich aus. Wählen Sie Ihre Stadt — wir kennen
        den Markt vor Ort und verkaufen Ihre Immobilie zum bestmöglichen Preis.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          {orte.length === 0 ? (
            <p className="text-muted">Standortseiten folgen in Kürze.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orte.map((a, i) => (
                <Reveal key={a.slug} delay={i * 50}>
                  <Link
                    href={`/standorte/${a.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-[transform,border-color] duration-500 hover:-translate-y-0.5 hover:border-accent/50"
                  >
                    <div className="flex items-center gap-2 text-accent">
                      <Icon name="pin" size={18} />
                      <span className="text-sm uppercase tracking-widest">{a.ort}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-fg">{a.h1}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{a.metaDescription}</p>
                    <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-accent">
                      Mehr erfahren
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

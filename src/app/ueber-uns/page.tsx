import Image from "next/image";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { site } from "@/lib/site";

export const metadata = {
  title: "Über uns",
  description:
    "Riegel Immobilien — inhabergeführt, regional verwurzelt in Speyer und Ludwigshafen. Lernen Sie das Team kennen.",
};

// Echte Namen von der Live-Seite; Rollen ggf. mit Sissy final abstimmen.
const team = [
  { name: "Sylwia „Sissy“ Riegel", role: "Inhaberin & Geschäftsführung", img: "/images/sissy.jpg" },
  { name: "Manfred Riegel", role: "Gründer & Senior-Berater", img: "/images/team-manfred.jpg" },
  { name: "Christoph", role: "Immobilienberatung", img: "/images/team-christoph.jpg" },
];

const werte = [
  ["Diskretion", "Vertraulichkeit in jeder Phase — vom ersten Gespräch bis zum Notartermin."],
  ["Marktkenntnis", "Echte Daten und regionale Erfahrung statt Bauchgefühl."],
  ["Persönlich", "Ein fester Ansprechpartner, der Ihre Region und Ihre Ziele kennt."],
];

export default function UeberUnsPage() {
  return (
    <>
      <PageIntro eyebrow="Über uns" title="Menschen, die Ihre Region kennen">
        Riegel Immobilien ist inhabergeführt und seit Jahren in Speyer,
        Ludwigshafen und der Vorderpfalz verwurzelt. Wir verbinden persönliche
        Betreuung mit echter Marktkenntnis.
      </PageIntro>

      {/* Team */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <figure className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border">
                    <Image
                      src={m.img}
                      alt={m.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-4">
                    <div className="text-lg font-semibold text-fg">{m.name}</div>
                    <div className="text-sm text-accent">{m.role}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Werte */}
      <section className="relative overflow-hidden border-t border-border bg-surface/40 py-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wave-1.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-0 hidden h-full w-auto opacity-10 mix-blend-screen lg:block"
        />
        <Container className="relative">
          <div className="max-w-2xl">
            <span className="text-sm uppercase tracking-[0.25em] text-muted">Wofür wir stehen</span>
          </div>
          <div className="mt-10 divide-y divide-border border-y border-border">
            {werte.map(([t, d]) => (
              <div key={t} className="grid gap-2 py-6 md:grid-cols-[200px_1fr] md:gap-10">
                <div className="text-xl font-semibold text-fg">{t}</div>
                <div className="text-muted">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-faint">{site.regions.join(" · ")}</p>
        </Container>
      </section>
    </>
  );
}

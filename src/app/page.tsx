import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Magnetic } from "@/components/magnetic";
import { PropertyCard } from "@/components/property-card";
import { mockEstates } from "@/lib/mock-estates";
import { site } from "@/lib/site";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
      {children}
    </span>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-full bg-accent py-3 pl-6 pr-3 text-sm font-medium text-on-accent transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-hover active:scale-[0.98]"
    >
      {children}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-on-accent/10 transition-transform duration-300 group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

function GhostCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-fg transition-colors duration-300 hover:border-accent hover:text-accent"
    >
      {children}
    </Link>
  );
}

const services = [
  {
    title: "Verkauf",
    text: "Diskrete, professionelle Vermarktung Ihrer Immobilie — von der Bewertung bis zum Notartermin.",
    icon: <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9.5 20v-5h5v5" />,
  },
  {
    title: "Bewertung",
    text: "Fundierte Markteinschätzung Ihrer Immobilie — datenbasiert, regional, kostenfrei.",
    icon: <path d="M4 19V5m0 14h16M8 16l3-4 3 2 4-6" />,
  },
  {
    title: "Beratung",
    text: "Persönliche Begleitung bei Kauf, Verkauf und Finanzierung — auf Augenhöhe.",
    icon: (
      <path d="M7.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-2.5 2-4.5 4.5-4.5S12 17.5 12 20m1 0c0-2.5 2-4.5 4.5-4.5S22 17.5 22 20" />
    ),
  },
];

export default function HomePage() {
  return (
    <>
      {/* ───────── Block 1 · Hero (WebGL-Mesh-Shader) ───────── */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden">
        <HeroBackdrop />
        {/* Marken-Wave (blau) als wiederkehrendes Motiv */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wave-2.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-auto opacity-20 mix-blend-screen lg:block"
        />
        <Container className="relative z-10 py-32">
          <div className="max-w-3xl">
            <div className="reveal" style={{ animationDelay: "0ms" }}>
              <Eyebrow>Immobilienmakler · Speyer &amp; Ludwigshafen</Eyebrow>
            </div>
            <h1 className="mt-6 akira text-[2.6rem] leading-[0.95] sm:text-7xl lg:text-[6.5rem]">
              <span className="reveal block" style={{ animationDelay: "80ms" }}>
                Immobilien
              </span>
              <span className="reveal block" style={{ animationDelay: "180ms" }}>
                mit <span className="akira-outline text-accent">Niveau</span>
              </span>
            </h1>
            <p
              className="reveal mt-7 max-w-xl text-lg text-muted"
              style={{ animationDelay: "320ms" }}
            >
              Verkauf, Bewertung und Beratung mit regionaler Expertise —
              diskret, persönlich und auf höchstem Niveau.
            </p>
            <div
              className="reveal mt-9 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "440ms" }}
            >
              <Magnetic>
                <PrimaryCta href="/immobilien">Immobilien entdecken</PrimaryCta>
              </Magnetic>
              <GhostCta href="/rechner">Immobilie bewerten</GhostCta>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────── Block 2 · Leistungen ───────── */}
      <section className="py-24 sm:py-32">
        <Container>
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow>Leistungen</Eyebrow>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Alles aus einer Hand — mit dem Anspruch, den Ihre Immobilie verdient.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div className="h-full rounded-xl border border-border bg-surface p-7 transition-colors duration-500 hover:border-accent/50">
                  <svg
                    viewBox="0 0 24 24"
                    width={28}
                    height={28}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent"
                    aria-hidden
                  >
                    {s.icon}
                  </svg>
                  <h3 className="mt-5 text-xl font-semibold text-fg">{s.title}</h3>
                  <p className="mt-3 text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── Block 3 · Aktuelle Angebote ───────── */}
      <section className="border-t border-border bg-surface/40 py-24 sm:py-32">
        <Container>
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <Eyebrow>Aktuelle Angebote</Eyebrow>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Ausgewählte Immobilien aus unserem Portfolio
              </h2>
            </div>
            <GhostCta href="/immobilien">Alle Immobilien</GhostCta>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockEstates.slice(0, 3).map((estate, i) => (
              <Reveal key={estate.slug} delay={i * 90}>
                <PropertyCard estate={estate} />
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-faint">
            Vorschau mit Beispiel-Objekten · Live-Anbindung an OnOffice in Vorbereitung.
          </p>
        </Container>
      </section>

      {/* ───────── Block 4 · Über / Kontakt ───────── */}
      <section className="py-24 sm:py-32">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-xl border border-border">
                <Image
                  src="/images/sissy.jpg"
                  alt="Sylwia „Sissy“ Riegel, Inhaberin Riegel Immobilien"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </Reveal>

            <Reveal delay={120} className="space-y-6">
              <Eyebrow>Persönlich</Eyebrow>
              <h2 className="akira text-3xl sm:text-5xl">Regional verwurzelt</h2>
              <p className="text-lg text-muted">
                Riegel Immobilien steht für persönliche Betreuung und echte
                Marktkenntnis in Speyer, Ludwigshafen und der gesamten
                Vorderpfalz. Wir begleiten Sie mit Diskretion und Erfahrung —
                vom ersten Gespräch bis zur Schlüsselübergabe.
              </p>
              <p className="text-sm text-faint">{site.regions.join(" · ")}</p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <PrimaryCta href="/kontakt">Kontakt aufnehmen</PrimaryCta>
                <GhostCta href="/rechner">Kostenlose Bewertung</GhostCta>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { PropertyCard } from "@/components/property-card";
import { mockEstates } from "@/lib/mock-estates";
import { site } from "@/lib/site";
import { Faq } from "@/components/faq";
import { faqs } from "@/lib/faq";
import { BentoGrid, BentoTile } from "@/components/bento";
import { Icon } from "@/components/icon";
import { HeroAddressSearch } from "@/components/hero-address-search";
import { ShaderCta } from "@/components/shader-cta";
import { AwardHighlight } from "@/components/award-highlight";
import { ReelsGrid } from "@/components/reels-grid";

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

const stats: { value: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { value: "Ø 90 Tage", label: "durchschnittliche Vermarktungszeit bis zum Verkauf", icon: "clock" },
  { value: "Ø ~4 Mon.", label: "bis der Kaufpreis auf Ihrem Konto ist", icon: "euro" },
  { value: "Top 21", label: "von über 25.000 Maklern bundesweit · ImmoAward 2025", icon: "star" },
  { value: "2", label: "Standorte — Speyer & Ludwigshafen", icon: "pin" },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      {/* ───────── Block 1 · Hero (Bild) ───────── */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Hochwertige Immobilie in der Region Speyer / Ludwigshafen"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/85 via-bg/40 to-transparent" />
        <Container className="relative z-10 py-24 sm:py-28">
          <div className="max-w-3xl">
            <div className="reveal" style={{ animationDelay: "0ms" }}>
              <Eyebrow>Immobilienmakler · Speyer &amp; Ludwigshafen</Eyebrow>
            </div>
            <h1 className="mt-8 akira text-[2rem] leading-[1.02] sm:text-5xl lg:text-[4.25rem]">
              <span className="reveal block" style={{ animationDelay: "80ms" }}>
                Regionale Expertise.
              </span>
              <span className="reveal block text-accent" style={{ animationDelay: "180ms" }}>
                Alles andere ist
              </span>
              <span className="reveal block akira-outline" style={{ animationDelay: "280ms" }}>
                Fast Food.
              </span>
            </h1>
            <p
              className="reveal mt-8 max-w-xl text-lg text-muted"
              style={{ animationDelay: "380ms" }}
            >
              Verkauf, Bewertung und Beratung in Speyer, Ludwigshafen und der
              Vorderpfalz — diskret, persönlich und datenbasiert.
            </p>
            <div className="reveal relative z-20 mt-10" style={{ animationDelay: "480ms" }}>
              <HeroAddressSearch />
            </div>
            <div
              className="reveal relative z-10 mt-6 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "560ms" }}
            >
              <Magnetic>
                <PrimaryCta href="/immobilien">Immobilien entdecken</PrimaryCta>
              </Magnetic>
              <GhostCta href="/verkaufen">Verkaufen mit Riegel</GhostCta>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────── Block 2 · Leistungen (Bento) ───────── */}
      <section className="py-24 sm:py-32">
        <Container>
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow>Leistungen</Eyebrow>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Alles aus einer Hand — mit dem Anspruch, den Ihre Immobilie verdient.
            </h2>
          </Reveal>

          <Reveal className="mt-14">
            <BentoGrid>
              <BentoTile
                icon="key"
                eyebrow="Kernleistung"
                title="Verkauf & Vermarktung"
                cols="2"
                rows="2"
                href="/verkaufen"
                cta="Mehr zum Verkaufsprozess"
              >
                <p>
                  Diskrete, professionelle Vermarktung Ihrer Immobilie — von der
                  Bewertung über Exposé, Fotografie und Besichtigungen bis zum
                  Notartermin.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Marktgerechte, datenbasierte Preisermittlung",
                    "Hochwertiges Exposé & professionelle Fotos",
                    "Qualifizierte Interessenten, diskrete Abwicklung",
                    "Begleitung bis zur Schlüsselübergabe",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-fg/90">
                      <span className="mt-0.5 text-accent">
                        <Icon name="check" size={17} />
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </BentoTile>

              <BentoTile
                icon="calculator"
                eyebrow="In 60 Sekunden"
                title="Online-Bewertung"
                cols="2"
                href="/rechner"
                cta="Immorechner starten"
              >
                Fundierte Markteinschätzung — datenbasiert, regional und kostenfrei.
                Ohne Anmeldung, direkt mit Ergebnis.
              </BentoTile>

              <BentoTile icon="handshake" eyebrow="Persönlich" title="Beratung">
                Begleitung bei Kauf, Verkauf und Finanzierung — auf Augenhöhe.
              </BentoTile>

              <BentoTile icon="home" eyebrow="Für Eigentümer" title="Vermietung">
                Bonitätsgeprüfte Mieter, rechtssichere Verträge, weniger Aufwand.
              </BentoTile>

              <BentoTile
                icon="search"
                eyebrow="Suchen & Filtern"
                title="Immobilienportal"
                cols="2"
                accent
                href="/immobilien"
                cta="Zum Portal"
              >
                Alle Objekte durchsuchen, filtern und auf der Karte entdecken —
                Zillow-Style, mit teilbaren Suchen.
              </BentoTile>

              <BentoTile
                icon="calendar"
                eyebrow="Online"
                title="Termin buchen"
                cols="2"
                href="/termin"
                cta="Wunschtermin wählen"
              >
                Beratungs- oder Besichtigungstermin in wenigen Klicks — inkl.
                Kalendereintrag zum Download.
              </BentoTile>
            </BentoGrid>
          </Reveal>
        </Container>
      </section>

      {/* ───────── Block · Kennzahlen ───────── */}
      <section className="border-y border-border bg-surface/40 py-16">
        <Container>
          <div className="grid grid-cols-2 gap-y-10 sm:gap-6 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} className="flex flex-col items-start">
                <span className="mb-3 text-accent">
                  <Icon name={s.icon} size={24} />
                </span>
                <span className="akira text-3xl text-fg sm:text-4xl">{s.value}</span>
                <span className="mt-2 max-w-[12rem] text-sm text-muted">{s.label}</span>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-xs text-faint">
            Ø-Werte als Orientierung, abhängig von Objekt, Preis und Marktlage.
            ImmoScout24 ImmoAward 2025: Top 21 national, Top 3 im Raum Frankfurt.
          </p>
        </Container>
      </section>

      {/* ───────── Block 3 · Aktuelle Angebote ───────── */}
      <section className="py-24 sm:py-32">
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

      {/* ───────── Block · ImmoAward 2025 ───────── */}
      <AwardHighlight />

      {/* ───────── Block · Instagram-Reels ───────── */}
      <ReelsGrid />

      {/* ───────── Block · Shader-CTA (Sofort-Bewertung) ───────── */}
      <ShaderCta />

      {/* ───────── Block · FAQ ───────── */}
      <section className="border-t border-border py-24 sm:py-32">
        <Container>
          <Reveal className="max-w-2xl space-y-4">
            <Eyebrow>Häufige Fragen</Eyebrow>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Antworten, bevor Sie fragen
            </h2>
          </Reveal>
          <div className="mt-12 max-w-3xl">
            <Faq />
          </div>
        </Container>
      </section>

      {/* ───────── Block 4 · Über / Kontakt ───────── */}
      <section className="py-24 sm:py-32">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-xl border border-border">
                <Image
                  src="/images/team/sylwia.jpg"
                  alt="Sylwia Riegel, Geschäftsleitung Riegel Immobilien"
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

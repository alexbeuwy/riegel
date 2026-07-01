import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { PropertyCard } from "@/components/property-card";
import { mockEstates } from "@/lib/mock-estates";
import { site } from "@/lib/site";
import { photos } from "@/lib/photos";
import { Faq } from "@/components/faq";
import { faqs } from "@/lib/faq";
import { BentoGrid, BentoTile } from "@/components/bento";
import { Icon } from "@/components/icon";
import { HeroAddressSearch } from "@/components/hero-address-search";
import { HeroBackdrop } from "@/components/hero-backdrop";
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
      className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-fg transition-colors duration-300 hover:border-accent hover:text-accent"
    >
      {children}
    </Link>
  );
}

export const metadata = {
  alternates: { canonical: "/" },
};

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
      {/* ───────── Block 1 · Hero (WebGL-Gradient) ───────── */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        {/* Animierter Mesh-Gradient (Near-Black → RIEGEL-Blau), GPU-only,
            mit CSS- & reduced-motion-Fallback. Kein Stockfoto mehr. */}
        <HeroBackdrop />
        {/* Dezente Abdunklung links für die Textspalte; der blaue Glow oben
            rechts bleibt sichtbar. Unten weicher Übergang in die Folge-Sektion. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/70 via-bg/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-bg to-transparent" />
        <Container className="relative z-10 py-24 sm:py-28">
          <div className="max-w-3xl">
            <div className="reveal-lcp" style={{ animationDelay: "0ms" }}>
              <Eyebrow>Immobilienmakler · Speyer &amp; Ludwigshafen</Eyebrow>
            </div>
            <h1 className="mt-8 akira text-[2rem] leading-[1.02] sm:text-5xl lg:text-[4.25rem]">
              <span className="reveal-lcp block" style={{ animationDelay: "80ms" }}>
                Regionale Expertise.
              </span>
              <span className="reveal-lcp block text-accent-strong" style={{ animationDelay: "180ms" }}>
                Alles andere ist
              </span>
              <span className="reveal-lcp block akira-outline" style={{ animationDelay: "280ms" }}>
                Fast Food.
              </span>
            </h1>
            <p
              className="reveal-lcp mt-8 max-w-xl text-lg text-muted"
              style={{ animationDelay: "380ms" }}
            >
              Verkauf, Bewertung und Beratung in Speyer, Ludwigshafen und der
              Vorderpfalz — diskret, persönlich und datenbasiert.
            </p>
            <div className="reveal-lcp relative z-20 mt-10" style={{ animationDelay: "480ms" }}>
              <HeroAddressSearch />
            </div>
            <div
              className="reveal-lcp relative z-10 mt-6 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "560ms" }}
            >
              {/* Nur EIN Primary im Hero (die Adresssuche) — beide CTAs sekundär. */}
              <Magnetic>
                <GhostCta href="/immobilien">Immobilien entdecken</GhostCta>
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
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="group relative flex flex-col items-start gap-3 bg-surface p-5 transition-colors duration-300 hover:bg-surface-2 sm:p-8"
                >
                  {/* Akzent-Hairline oben, erscheint beim Hover */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08] text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon name={s.icon} size={20} />
                  </span>
                  <span className="akira text-2xl text-fg sm:text-4xl">{s.value}</span>
                  <span className="text-sm leading-snug text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <p className="mt-5 text-center text-xs text-faint">
            Ø-Werte als Orientierung, abhängig von Objekt, Preis und Marktlage. ImmoScout24
            ImmoAward 2025 — Top 21 Makler des Jahres in Deutschland (von über 25.000).
          </p>
        </Container>
      </section>

      {/* ───────── Block · Begleitung (Fotos) ───────── */}
      <section className="py-20 sm:py-28">
        <Container>
          <Reveal className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Persönlich begleitet — von der Bewertung bis zur Übergabe
            </h2>
          </Reveal>
          <Reveal>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-3xl border border-border">
                <Image
                  src={photos.wertReport2}
                  alt="Beratungsgespräch mit Riegel Immobilien"
                  width={1100}
                  height={1300}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="h-[300px] w-full object-cover md:h-[520px]"
                />
              </div>
              <div className="grid gap-4">
                <div className="relative overflow-hidden rounded-3xl border border-border">
                  <Image
                    src={photos.analyse3}
                    alt="Digitale Immobilienanalyse beim Kunden"
                    width={1100}
                    height={620}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="h-[200px] w-full object-cover md:h-[252px]"
                  />
                </div>
                <div className="relative overflow-hidden rounded-3xl border border-border">
                  <Image
                    src={photos.wertReport5}
                    alt="Marktwert-Report mit Blick auf Speyer"
                    width={1100}
                    height={620}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="h-[200px] w-full object-cover md:h-[252px]"
                  />
                </div>
              </div>
            </div>
          </Reveal>
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
              <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-xl border border-border">
                <Image
                  src="/images/team/gruppe.jpg"
                  alt="Das Team von Riegel Immobilien"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent p-4">
                  <span className="text-sm text-fg">Familie &amp; Team Riegel — zwei Standorte, eine Region.</span>
                </div>
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

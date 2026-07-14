import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Magnetic } from "@/components/magnetic";
import { PropertyCard } from "@/components/property-card";
import { getEstateData, getFeaturedEstates, getLiveTickerStats } from "@/lib/estates";
import { LiveTicker } from "@/components/live-ticker";
import { StatStrip } from "@/components/stat-strip";
import { RIEGEL_STATS } from "@/lib/riegel-stats";
import { site } from "@/lib/site";
import { photos } from "@/lib/photos";
import { Faq } from "@/components/faq";
import { faqs } from "@/lib/faq";
import { BentoGrid, BentoTile, BentoPhoto } from "@/components/bento";
import { Icon } from "@/components/icon";
import { HeroAddressSearch } from "@/components/hero-address-search";
import { ShaderCta } from "@/components/shader-cta";
import { AwardHighlight } from "@/components/award-highlight";
import { AwardsGrid } from "@/components/awards-grid";
import { ReelsGrid } from "@/components/reels-grid";
import { TrustStrip } from "@/components/trust-strip";
import { Testimonials } from "@/components/testimonials";
import { PreisatlasTeaser } from "@/components/preisatlas-teaser";
import { TESTIMONIALS, TRUST_PLATFORMS } from "@/lib/trust-data";
import { getSiteSetting } from "@/lib/site-settings";
import { HERO_IMAGE_KEY } from "@/lib/site-settings-keys";
import { ReachChart } from "@/components/reach-chart";

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

// "20+ Jahre" und "Ø 90 Tage" sind in den neuen StatStrip/RIEGEL_STATS
// gewandert (Sektion "Zahlen, die man nachprüfen kann", direkt nach dem
// TrustStrip) — hier bewusst nicht mehr dupliziert, nur die übrigen,
// dort nicht abgedeckten Kennzahlen bleiben in diesem Block.
const stats: { prefix?: string; value: string; suffix?: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { prefix: "Ø ~", value: "4", suffix: "Mon.", label: "bis der Kaufpreis auf Ihrem Konto ist", icon: "euro" },
  { prefix: "Top", value: "21", label: "von über 25.000 Maklern bundesweit · ImmoAward 2025", icon: "star" },
  { value: "2", label: "Standorte — Speyer & Ludwigshafen", icon: "pin" },
];

// ISR-Fallback: falls revalidatePath() aus /api/intern/hero-image ausnahmsweise
// nicht durchkommt, veraltet die Seite trotzdem nach spätestens 5 Minuten nicht dauerhaft.
export const revalidate = 300;

export default async function HomePage() {
  const heroImage = await getSiteSetting(HERO_IMAGE_KEY, photos.heroKitchenDark);
  const [featured, { source }, liveTicker] = await Promise.all([
    getFeaturedEstates(3),
    getEstateData(),
    getLiveTickerStats(),
  ]);
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
      {/* ───────── Block 1 · Hero (Foto: Mann mit iPad, Küche, abgedunkelte Fassung) ───────── */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src={heroImage}
            alt="Immobilienberatung mit iPad in der Küche, blaues Licht — RIEGEL Immobilien"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Foto ist bereits vorab abgedunkelt — Overlay bewusst leicht. */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/65 via-transparent to-bg/15" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        </div>
        <Container className="relative z-10 py-24 sm:py-28">
          <div className="max-w-3xl">
            <div className="reveal-lcp" style={{ animationDelay: "0ms" }}>
              <Eyebrow>Familienunternehmen · Speyer &amp; Ludwigshafen</Eyebrow>
            </div>
            <h1 className="mt-8 akira text-[2.25rem] leading-[1.04] sm:text-6xl lg:text-[4.5rem]">
              <span className="reveal-lcp block" style={{ animationDelay: "80ms" }}>
                Regional zuhause.
              </span>
              <span className="reveal-lcp block text-accent-strong" style={{ animationDelay: "180ms" }}>
                National vernetzt.
              </span>
            </h1>
            <p
              className="reveal-lcp mt-8 max-w-xl text-lg text-muted"
              style={{ animationDelay: "380ms" }}
            >
              Ihr <strong className="font-medium text-fg">Familienunternehmen</strong> für Immobilien:
              seit über 20 Jahren regional verwurzelt, bundesweit vernetzt und mit{" "}
              <strong className="font-medium text-fg">über 40 Jahren Immobilienerfahrung</strong> im Team.
              Ihr führender Makler mit großer Reichweite:{" "}
              <strong className="font-medium text-fg">12,5 Millionen Aufrufe</strong> auf ImmoScout24.
            </p>
            <p
              className="reveal-lcp mt-4 max-w-xl text-base text-muted"
              style={{ animationDelay: "430ms" }}
            >
              Ohne Zwang, ohne lästige Telefonate, ohne Registrierung: in 60 Sekunden zur
              ersten Werteinschätzung mit dem <strong className="font-medium text-fg">RIEGEL Rechner</strong>.
              Er rechnet mit Daten aus dutzenden Quellen, von amtlichen BORIS-Bodenrichtwerten
              bis zu unserem eigenen Verkaufsbestand.
            </p>
            <div className="reveal-lcp relative z-20 mt-8" style={{ animationDelay: "480ms" }}>
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

      {/* ───────── Trust-Streifen (Bewertungen, Auszeichnungen) ───────── */}
      <TrustStrip />

      {/* ───────── Block · Zahlen, die man nachprüfen kann (Live-Ticker als ruhiges Zentrum) ─────────
          Markenkern-Story: ein Wettbewerber wirbt mit Live-Ticker + Zahlenkacheln,
          aber mit erfundenen Zahlen — bei uns kommt der Ticker wirklich live aus
          derselben Objektverwaltung, die auch das Portal befüllt.
          Redesign (Kundenfeedback "zu viele große Zahlen"): die Aufrufe-Zahl steht
          bereits in Prosa im Hero-Sub und wird hier NICHT als zweite Zahlen-Wand
          wiederholt. Eine „bisher verkauft"-Zahl gibt es bewusst NICHT (Sissy:
          über die Jahrzehnte nicht exakt belegbar). Der Live-Ticker mit seinen
          echten Live-Werten ist die einzige große Zahlengruppe dieser Sektion,
          StatStrip liefert nur drei leise, dauerhaft belegbare Zusatz-Fakten.
          Layout (2. Redesign): Desktop 2 Spalten (lg:grid-cols-2) — links bleibt
          alles wie gehabt (Eyebrow/H2/Copy + Ticker + Zusatz-Fakten), rechts
          füllt der neue Reichweiten-Vergleich (ReachChart, zulässige
          vergleichende Werbung mit realen, öffentlich nachprüfbaren
          ImmoScout24-Zahlen) den bislang leeren Raum neben dem Ticker. Mobil
          stapelt CSS Grid automatisch (Chart rutscht unter den Ticker), da die
          Chart-Spalte im Markup nach der Textspalte kommt. */}
      <section className="py-20 sm:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <Reveal className="max-w-2xl space-y-4">
                <Eyebrow>Zahlen, die man nachprüfen kann</Eyebrow>
                <h2 className="text-3xl font-semibold sm:text-4xl">
                  Wir behaupten nicht. Wir zeigen live.
                </h2>
                <p className="text-lg text-muted">
                  Andere Makler werben mit Wunschzahlen. Unser Ticker liest live aus
                  derselben Objektverwaltung, die auch unser Portal befüllt. Jede
                  Zahl hier ist nachprüfbar.
                </p>
              </Reveal>

              <div className="mt-12 max-w-2xl">
                {/* Ehrlichkeitspflicht: ohne live gezogene Zahlen (OnOffice down/Mock-
                    Fallback) gibt es KEINEN Ticker statt einer geschätzten Zahl — die
                    zwei statischen, real belegten Zusatz-Fakten bleiben davon
                    unabhängig immer sichtbar. */}
                {liveTicker && (
                  <Reveal>
                    <LiveTicker {...liveTicker} />
                  </Reveal>
                )}
                <Reveal delay={liveTicker ? 120 : 0} className="mt-8">
                  <StatStrip stats={RIEGEL_STATS} />
                </Reveal>
              </div>
            </div>

            <Reveal delay={liveTicker ? 200 : 80}>
              <ReachChart />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── Block · So vermarkten wir Immobilien (Videos, bewusst prominent direkt nach den Zahlen) ───────── */}
      <ReelsGrid />

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

              {/* Füllt die Grid-Lücke neben „Beratung" mit einem echten Foto
                  statt Leerraum (wirkt hochwertiger). */}
              <BentoPhoto src={photos.analyse1} alt="RIEGEL-Beratung vor Ort mit iPad" />


              <BentoTile
                icon="chart"
                eyebrow="Markt-Transparenz"
                title="Preisatlas Rhein-Neckar"
                cols="2"
                href="/preisatlas"
                cta="Preise & Trends ansehen"
              >
                Preisspannen, Bodenwerte und Trends für 18 Städte der Region — auf einen
                Blick, direkt vom Makler vor Ort.
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
                modern, übersichtlich, mit teilbaren Suchen.
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

              <BentoTile icon="home" eyebrow="Für Eigentümer" title="Vermietung" cols="2">
                Bonitätsgeprüfte Mieter, rechtssichere Verträge, weniger Aufwand.
              </BentoTile>
            </BentoGrid>
          </Reveal>
        </Container>
      </section>

      {/* ───────── Block · Preisatlas-Teaser ───────── */}
      <PreisatlasTeaser />

      {/* ───────── Block · Kennzahlen ───────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
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
                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    {s.prefix && (
                      <span className="text-sm font-medium text-accent sm:text-base">{s.prefix}</span>
                    )}
                    <span className="akira text-2xl text-fg sm:text-4xl">{s.value}</span>
                    {s.suffix && (
                      <span className="text-sm font-medium text-accent sm:text-base">{s.suffix}</span>
                    )}
                  </span>
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

      {/* ───────── Block · Begleitung (Fotos + starkes Trust-Signal) ───────── */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Akzent-Glow im Hintergrund — gibt der Sektion etwas Tiefe statt Flachheit. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/[0.07] blur-3xl"
        />
        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Reveal>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Persönlich begleitet — von der Bewertung bis zur Übergabe
                </h2>
              </Reveal>
              {/* Echtes Testimonial, groß & sichtbar — dieses Vertrauens-Signal
                  ist stark, daher hier zusätzlich zur Kundenstimmen-Sektion
                  prominent herausgestellt. Dezentes Anführungszeichen-Glyph im
                  Hintergrund für einen redaktionellen, hochwertigen Touch. */}
              <Reveal delay={90}>
                <blockquote className="relative mt-8 overflow-hidden rounded-2xl border-l-2 border-accent bg-surface/40 py-5 pl-6 pr-5">
                  <span
                    aria-hidden
                    className="akira pointer-events-none absolute -right-1 -top-6 select-none text-8xl text-accent/[0.08]"
                  >
                    &rdquo;
                  </span>
                  <p className="relative text-xl font-medium leading-snug text-fg sm:text-2xl">
                    „{TESTIMONIALS[0].text}&rdquo;
                  </p>
                  <footer className="relative mt-3 text-sm text-muted">
                    <span className="font-medium text-fg">{TESTIMONIALS[0].autor}</span>
                    <span className="text-faint"> · {TESTIMONIALS[0].plattform}-Bewertung</span>
                  </footer>
                </blockquote>
              </Reveal>
              {/* Kompakte Bewertungs-Liste — wie gut Riegel überall bewertet ist. */}
              <Reveal delay={160}>
                <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                  {TRUST_PLATFORMS.map((p) => (
                    <li key={p.key} className="flex items-center gap-1.5 text-sm">
                      <Icon name="star" size={14} className="text-accent" fill="currentColor" />
                      <span className="text-fg">{p.name}</span>
                      <span className="tabular-nums text-faint">
                        {p.rating.toLocaleString("de-DE")}/{p.scaleMax}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Reveal delay={80} className="relative">
                <div className="group relative overflow-hidden rounded-3xl border border-border transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(1,92,255,0.35)]">
                  <Image
                    src={photos.wertReport2}
                    alt="Beratungsgespräch mit Riegel Immobilien"
                    width={1100}
                    height={1300}
                    sizes="(max-width: 1024px) 50vw, 28vw"
                    className="h-[300px] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 md:h-[420px]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/50 via-transparent to-transparent" />
                  {/* Vertrauens-Badge, überlappt die Foto-Ecke — verbindet Bild und Botschaft. */}
                  <span className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg/60 px-3.5 py-1.5 text-xs text-fg backdrop-blur">
                    <Icon name="calendar" size={13} className="text-accent" />
                    Familienunternehmen seit über 20 Jahren
                  </span>
                </div>
              </Reveal>
              <div className="grid gap-4">
                <Reveal delay={160}>
                  <div className="group relative overflow-hidden rounded-3xl border border-border transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-18px_rgba(1,92,255,0.3)]">
                    <Image
                      src={photos.analyse3}
                      alt="Digitale Immobilienanalyse beim Kunden"
                      width={1100}
                      height={620}
                      sizes="(max-width: 1024px) 50vw, 28vw"
                      className="h-[140px] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 md:h-[198px]"
                    />
                  </div>
                </Reveal>
                <Reveal delay={240}>
                  <div className="group relative overflow-hidden rounded-3xl border border-border transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-18px_rgba(1,92,255,0.3)]">
                    <Image
                      src={photos.wertReport5}
                      alt="Marktwert-Report mit Blick auf Speyer"
                      width={1100}
                      height={620}
                      sizes="(max-width: 1024px) 50vw, 28vw"
                      className="h-[140px] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 md:h-[198px]"
                    />
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
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
            {featured.map((estate, i) => (
              <Reveal key={estate.slug} delay={i * 90}>
                <PropertyCard estate={estate} />
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-faint">
            {source === "mock"
              ? "Vorschau mit Beispiel-Objekten · Live-Anbindung an OnOffice in Vorbereitung."
              : "Live-Daten aus der RIEGEL-Objektverwaltung."}
          </p>
        </Container>
      </section>

      {/* ───────── Block · Kundenstimmen ───────── */}
      <Testimonials />

      {/* ───────── Block · ImmoAward 2025 ───────── */}
      <AwardHighlight />

      {/* ───────── Block · Weitere Auszeichnungen & Mitgliedschaften ───────── */}
      <AwardsGrid />

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
                Metropolregion Rhein-Neckar. Wir begleiten Sie mit Diskretion und Erfahrung —
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

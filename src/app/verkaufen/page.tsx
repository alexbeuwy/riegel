import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon, type IconName } from "@/components/icon";
import { BentoGrid, BentoTile, BentoPhoto } from "@/components/bento";
import { ProcessTimeline } from "@/components/process-timeline";
import { TrustStrip } from "@/components/trust-strip";
import { photos } from "@/lib/photos";
import { expertenSeiten, expertenFlaggschiffe, EXPERTEN_CLUSTER_LABEL } from "@/lib/experten";

export const metadata = {
  title: "Immobilie verkaufen",
  description:
    "Verkaufen Sie Ihre Immobilie in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar zum bestmöglichen Preis — mit professioneller Vermarktung und persönlicher Begleitung von RIEGEL Immobilien.",
  alternates: { canonical: "/verkaufen" },
};

const steps: { n: string; icon: IconName; title: string; text: string }[] = [
  {
    n: "01",
    icon: "calculator",
    title: "Bewertung",
    text: "Kostenfreie, fundierte Markteinschätzung Ihrer Immobilie — datenbasiert und regional verankert.",
  },
  {
    n: "02",
    icon: "doc",
    title: "Aufbereitung",
    text: "Professionelle Fotos, aussagekräftiges Exposé und alle Unterlagen sauber zusammengestellt.",
  },
  {
    n: "03",
    icon: "search",
    title: "Vermarktung",
    text: "Gezielte, diskrete Ansprache passender Interessenten über Portale und unser eigenes Netzwerk.",
  },
  {
    n: "04",
    icon: "users",
    title: "Besichtigungen",
    text: "Qualifizierte Interessenten, koordinierte Termine — Sie behalten jederzeit den Überblick.",
  },
  {
    n: "05",
    icon: "key",
    title: "Abschluss",
    text: "Begleitung bis zum Notartermin und zur Schlüsselübergabe — rechtssicher und stressfrei.",
  },
];

export default function VerkaufenPage() {
  return (
    <>
      {/* Hero — Foto-Hintergrund (Model in Wohnung, blaues Licht) */}
      <section className="relative overflow-hidden border-b border-border pb-16 pt-36">
        <div className="absolute inset-0 -z-10">
          <Image
            src={photos.modelWohnung}
            alt="Premium-Wohnraum mit blauem Lichtakzent — RIEGEL Immobilien"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[75%_center]"
          />
          {/* Foto ist bereits dunkel — Overlay bewusst leicht. */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/55 via-bg/10 to-transparent" />
        </div>
        <Container className="relative z-10">
          <span className="inline-block rounded-full border border-border bg-bg/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted backdrop-blur">
            Für Eigentümer
          </span>
          <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">Immobilie verkaufen</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Wir verkaufen Ihre Immobilie zum bestmöglichen Preis — mit regionaler
            Marktkenntnis, professioneller Vermarktung und persönlicher Begleitung.
          </p>
        </Container>
      </section>

      <TrustStrip />

      {/* Asymmetrischer Auftakt — echtes Beratungsfoto */}
      <section className="pt-2">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h2 className="akira text-3xl leading-tight text-fg sm:text-4xl">
                Den Bestpreis holt, <span className="text-accent">wer den Markt kennt.</span>
              </h2>
              <p className="mt-5 max-w-md text-muted">
                Datenbasierte Bewertung, professionelle Vermarktung und ein fester
                Ansprechpartner von der ersten Einschätzung bis zur Schlüsselübergabe.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Link href="/rechner" className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
                  <Icon name="calculator" size={17} /> Wert ermitteln
                </Link>
                <Link href="/termin?anlass=Verkaufsberatung" className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
                  <Icon name="calendar" size={17} /> Beratung buchen
                </Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-border">
              <Image
                src={photos.broschuerePortrait}
                alt="Persönliche Verkaufsberatung von RIEGEL Immobilien"
                width={900}
                height={1120}
                sizes="(max-width: 1024px) 100vw, 520px"
                className="h-[clamp(300px,42vw,520px)] w-full object-cover object-top"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/40 to-transparent" />
            </div>
          </div>
        </Container>
      </section>

      {/* Prozess */}
      <section className="py-20">
        <Container>
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              So läuft Ihr Verkauf — in fünf klaren Schritten
            </h2>
          </Reveal>
          <ProcessTimeline steps={steps.map(({ icon, title, text }) => ({ icon, title, text }))} />
        </Container>
      </section>

      {/* Aufbereitung & Unterlagen — echtes Foto (image-left) */}
      <section className="pb-4">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-border">
              <Image
                src={photos.dokumente}
                alt="Aufbereitung von Grundrissen und Unterlagen bei RIEGEL Immobilien"
                width={1400}
                height={780}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-[260px] w-full object-cover sm:h-[360px]"
              />
            </div>
            <div>
              <h2 className="akira text-2xl leading-tight text-fg sm:text-3xl">
                Sauber aufbereitet, <span className="text-accent">lückenlos belegt.</span>
              </h2>
              <p className="mt-5 max-w-md text-muted">
                Grundrisse, Energieausweis, Grundbuch und Exposé — wir bringen alle
                Unterlagen in Form und verbinden sie mit einer datenbasierten Bewertung.
                Das schafft Vertrauen bei Käufern und beschleunigt den Verkauf.
              </p>
              <p className="mt-3 max-w-md text-xs text-faint">
                Hinweis: Beim Verkauf ist ein gültiger Energieausweis Pflicht
                (§&nbsp;80 GEG). Ob Verbrauchs- oder Bedarfsausweis nötig ist,
                hängt vom Gebäude ab — bei älteren Ein- und Zweifamilienhäusern
                (Bauantrag vor 1977, unsaniert) ist ein Bedarfsausweis
                vorgeschrieben. Wir klären das für Ihr Objekt.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["Vollständige Objektakte & Grundrisse", "Datenbasierte Wertermittlung", "Aussagekräftiges, professionelles Exposé"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-fg/90">
                    <span className="mt-0.5 text-accent"><Icon name="check" size={17} /></span>
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Spezialisiert auf Ihre Immobilienart — Verweis auf /verkaufen/[typ] */}
      <section className="py-20">
        <Container>
          <Reveal className="mb-10 max-w-2xl space-y-4">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Spezialisierung
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Spezialisiert auf Ihre Immobilienart
            </h2>
            <p className="text-muted">
              Vom Mehrfamilienhaus bis zur Nachlassimmobilie: Jede Objektart hat
              ihre eigenen Käufergruppen, Bewertungsfaktoren und rechtlichen
              Rahmenbedingungen — wir kennen sie.
            </p>
          </Reveal>
          <Reveal>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expertenFlaggschiffe.map((s) => (
                <Link
                  key={s.slug}
                  href={`/verkaufen/${s.slug}`}
                  className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/50"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
                    <Icon name={s.icon} size={20} />
                  </span>
                  <div className="mt-4 text-[0.62rem] uppercase tracking-[0.18em] text-faint">
                    Die Experten für
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-fg">{s.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.teaser}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                    Mehr erfahren
                    <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>

          {/* Alle Spezialgebiete — kompakte, gruppierte Linkliste (Hub-and-Spoke:
              jede der 30 weiteren Objektart-Seiten ist von hier crawlbar,
              ohne den Hub mit 35 Riesen-Karten zu fluten). */}
          <Reveal className="mt-14">
            <h3 className="text-lg font-semibold text-fg">Alle Spezialgebiete</h3>
            <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(EXPERTEN_CLUSTER_LABEL).map(([cluster, label]) => {
                const seiten = expertenSeiten.filter(
                  (s) => s.cluster === cluster && !expertenFlaggschiffe.some((f) => f.slug === s.slug),
                );
                if (seiten.length === 0) return null;
                return (
                  <div key={cluster}>
                    <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">{label}</div>
                    <ul className="mt-3 space-y-2">
                      {seiten.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/verkaufen/${s.slug}`}
                            className="text-sm text-muted transition-colors hover:text-accent"
                          >
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Warum RIEGEL (Bento) */}
      <section className="border-t border-border bg-surface/40 py-20 sm:py-28">
        <Container>
          <Reveal className="mb-12 max-w-2xl space-y-4">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Warum RIEGEL
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Erfahrung, die sich für Sie auszahlt
            </h2>
          </Reveal>
          <Reveal>
            <BentoGrid>
              <BentoTile
                icon="trend"
                eyebrow="Bestpreis"
                title="Marktgerecht bewertet"
                cols="2"
                rows="2"
              >
                <p>
                  Wir setzen den Preis nicht zu niedrig (Geld verschenkt) und
                  nicht zu hoch (Ladenhüter). Datenbasierte Bewertung plus
                  jahrelange regionale Marktkenntnis treffen den Punkt.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Vergleichsdaten aus der Region",
                    "Bodenrichtwerte & Markttrend berücksichtigt",
                    "ehrliche, belastbare Einschätzung",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-fg/90">
                      <span className="mt-0.5 text-accent">
                        <Icon name="check" size={17} />
                      </span>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </BentoTile>
              <BentoTile icon="shield" eyebrow="Diskret" title="Vertraulich" cols="2">
                Auf Wunsch vermarkten wir Ihre Immobilie diskret, ohne öffentliche
                Inserate — nur an vorgemerkte, geprüfte Interessenten.
              </BentoTile>
              <BentoTile icon="users" title="Persönlich betreut">
                Ein fester Ansprechpartner von Anfang bis zur Übergabe.
              </BentoTile>
              <BentoTile icon="pin" title="Regional verwurzelt">
                Speyer, Ludwigshafen und die gesamte Metropolregion Rhein-Neckar.
              </BentoTile>
              <BentoTile
                icon="calculator"
                eyebrow="Unverbindlich"
                title="Wert in 60 Sekunden"
                cols="2"
                accent
                href="/rechner"
                cta="Immorechner starten"
              >
                Verschaffen Sie sich sofort eine erste Einschätzung — kostenfrei
                und ohne Anmeldung.
              </BentoTile>

              {/* Füllt die Grid-Lücke am Zeilenende mit einem echten Foto
                  statt Leerraum. */}
              <BentoPhoto
                src={photos.wertReportNight}
                alt="Beratungsabend mit der RIEGEL-Broschüre"
                cols="2"
              />
            </BentoGrid>
          </Reveal>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/rechner"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Jetzt kostenlos bewerten
              <Icon name="arrowRight" size={18} />
            </Link>
            <Link
              href="/termin"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="calendar" size={18} />
              Beratungstermin buchen
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

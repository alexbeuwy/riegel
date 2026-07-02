import Image from "next/image";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/lib/site";
import { photos } from "@/lib/photos";

export const metadata = {
  title: "Über uns",
  description:
    "Riegel Immobilien — inhabergeführtes Familienunternehmen, regional verwurzelt in Speyer und Ludwigshafen. 18 Expert:innen an zwei Standorten. Lernen Sie die Familie Riegel und das Team kennen.",
  alternates: { canonical: "/ueber-uns" },
};

// Familie Riegel — echte Namen & Rollen (Live-Seite). Manfred=Vater, Sylwia=Mutter,
// Sissy & Christoph = die Riegel-Kinder.
const familie = [
  {
    name: "Manfred Riegel",
    role: "Gründer · Regionaldirektor BVFI",
    relation: "Vater",
    img: "/images/team/manfred.jpg",
  },
  {
    name: "Sylwia Riegel",
    role: "Geschäftsleitung",
    relation: "Mutter",
    img: "/images/team/sylwia.jpg",
  },
  {
    name: "Sissy Riegel",
    role: "Marketing",
    relation: "Tochter",
    img: "/images/team/sissy.jpg",
  },
  {
    name: "Christoph Riegel",
    role: "Verkauf",
    relation: "Sohn",
    img: "/images/team/christoph.jpg",
  },
];

// Das übrige Team — vorübergehend als Platzhalter (18 Expert:innen gesamt).
// Profile/Fotos folgen; Rollenbereiche real abgebildet.
// 14 Platzhalter + 4 Familie = 18 Expert:innen. Namen/Porträts folgen.
const teamRollen = [
  "Immobilienberatung Speyer",
  "Immobilienberatung Ludwigshafen",
  "Vertrieb & Akquise",
  "Backoffice & Organisation",
  "Marketing & Social Media",
  "Finanzierungsberatung",
  "Objektaufbereitung & Fotografie",
  "Empfang & Kundenservice",
  "Bewertung & Analyse",
  "Vertragswesen",
  "Drohnen- & Videoproduktion",
  "Kundenbetreuung",
  "Social Media & Content",
  "Assistenz der Geschäftsleitung",
];

const werte: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield",
    title: "Diskretion",
    text: "Vertraulichkeit in jeder Phase — vom ersten Gespräch bis zum Notartermin.",
  },
  {
    icon: "chart",
    title: "Marktkenntnis",
    text: "Echte Daten und regionale Erfahrung statt Bauchgefühl.",
  },
  {
    icon: "handshake",
    title: "Persönlich",
    text: "Ein fester Ansprechpartner, der Ihre Region und Ihre Ziele kennt.",
  },
];

export default function UeberUnsPage() {
  return (
    <>
      <PageIntro eyebrow="Über uns" title="Die Familie Riegel — und ein Team, das Ihre Region kennt">
        Riegel Immobilien ist inhabergeführt und seit über 20&nbsp;Jahren in Speyer,
        Ludwigshafen und der Vorderpfalz verwurzelt. Als Familienunternehmen mit
        18&nbsp;Expert:innen an zwei Standorten verbinden wir persönliche
        Betreuung mit echter Marktkenntnis.
      </PageIntro>

      {/* Familie */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Familie Riegel
            </span>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {familie.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <figure className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border">
                    <Image
                      src={m.img}
                      alt={m.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-bg/80 px-2.5 py-1 text-[0.65rem] uppercase tracking-widest text-muted backdrop-blur">
                      {m.relation}
                    </span>
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

      {/* In der Beratung — echte Fotos */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">Nah dran — in der Beratung</h2>
            <p className="mt-3 text-muted">
              Ob am Küchentisch, vor Ort oder digital: Wir nehmen uns Zeit und
              erklären jede Zahl, bis sie sitzt.
            </p>
          </Reveal>
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { src: photos.analyse2, alt: "Beratung mit digitaler Analyse" },
                { src: photos.wertReport4, alt: "Telefonische Beratung mit Blick auf Speyer" },
              ].map((img) => (
                <div key={img.src} className="relative overflow-hidden rounded-3xl border border-border">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={1100}
                    height={680}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="h-[230px] w-full object-cover sm:h-[300px]"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Das Team (Platzhalter) */}
      <section className="border-t border-border bg-surface/40 py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl space-y-3">
              <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                Das Team
              </span>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                18 freundliche Expert:innen an zwei Standorten
              </h2>
              <p className="text-muted">
                Hinter jedem erfolgreichen Verkauf steht ein eingespieltes Team.
                Die vollständigen Profile und Fotos folgen in Kürze.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {teamRollen.map((rolle, i) => (
              <Reveal key={rolle} delay={i * 40}>
                <div className="flex h-full items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-faint">
                    <Icon name="users" size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">Team Riegel</div>
                    <div className="truncate text-xs text-muted">{rolle}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-xs text-faint">
            Platzhalter — Namen &amp; Porträts der Kolleg:innen werden ergänzt.
          </p>
        </Container>
      </section>

      {/* Standorte (echte Büro-Fotos) */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10 max-w-xl space-y-3">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Standorte
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl">Zweimal in Ihrer Nähe</h2>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            {site.locations.map((l, i) => (
              <Reveal key={l.city} delay={i * 100}>
                <div className="group overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={i === 0 ? "/images/standorte/speyer.jpg" : "/images/standorte/ludwigshafen.jpg"}
                      alt={`Riegel Immobilien Büro ${l.city}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="space-y-2 p-6">
                    <div className="flex items-center gap-2 text-lg font-semibold text-fg">
                      <Icon name="pin" size={18} className="text-accent" />
                      {l.city}
                    </div>
                    <div className="text-sm text-muted">
                      {l.street}, {l.zip} {l.city}
                    </div>
                    <a
                      href={`tel:${l.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"
                    >
                      <Icon name="phone" size={15} />
                      {l.phone}
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Einblicke — echte Büro-Innenaufnahmen */}
          <Reveal className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { src: "/images/office/empfang.jpg", label: "Empfang" },
              { src: "/images/office/beratung.jpg", label: "Beratung" },
              { src: "/images/office/bueroraum.jpg", label: "Unser Büro" },
            ].map((img) => (
              <div key={img.src} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
                <Image
                  src={img.src}
                  alt={`Riegel Immobilien — ${img.label}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent p-4">
                  <span className="text-sm text-fg">{img.label}</span>
                </div>
              </div>
            ))}
          </Reveal>
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
            {werte.map((w) => (
              <div key={w.title} className="grid gap-2 py-6 md:grid-cols-[220px_1fr] md:gap-10">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent">
                    <Icon name={w.icon} size={20} />
                  </span>
                  <span className="text-xl font-semibold text-fg">{w.title}</span>
                </div>
                <div className="text-muted">{w.text}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-faint">{site.regions.join(" · ")}</p>
        </Container>
      </section>
    </>
  );
}

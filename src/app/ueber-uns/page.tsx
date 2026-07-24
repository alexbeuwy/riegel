import Image from "next/image";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/lib/site";
import { photos, portraits } from "@/lib/photos";
import { EngagementBento } from "@/components/engagement-bento";

export const metadata = {
  title: "Über uns",
  description:
    "RIEGEL Immobilien — inhabergeführtes Familienunternehmen, regional verwurzelt in Speyer und Ludwigshafen. Lernen Sie die Familie RIEGEL und das Team persönlich kennen.",
  alternates: { canonical: "/ueber-uns" },
};

// Familie RIEGEL — echte Namen & Rollen. Neue, einheitliche Porträts (von
// Sissy hochgeladen); Christoph hat noch kein neues Porträt, daher sein
// bisheriges Foto (Status wird intern geklärt).
const familie = [
  { name: "Manfred RIEGEL", role: "Gründer · Regionaldirektor BVFI", relation: "Vater", img: portraits.manfred },
  { name: "Sylwia RIEGEL", role: "Geschäftsleitung", relation: "Mutter", img: portraits.sylwia },
  { name: "Sissy RIEGEL", role: "Marketing", relation: "Tochter", img: portraits.sissy },
  { name: "Christoph RIEGEL", role: "Verkauf", relation: "Sohn", img: "/images/team/christoph.jpg" },
];

// Das Team — echte Besetzung + Porträts (Sissys aktuelle Liste). Reihenfolge:
// Beratung, Backoffice, Extern, Auszubildende. Loana Sabielny: Porträt folgt
// (img null → Platzhalter-Kachel).
const team: { name: string; role: string; img: string | null }[] = [
  { name: "Lorenz Höll", role: "Beratung", img: portraits.lorenz },
  { name: "Vanessa Drewnowska", role: "Beratung", img: portraits.vanessa },
  { name: "Annika Redmann", role: "Backoffice", img: portraits.annika },
  { name: "Carina Büßecker", role: "Backoffice", img: portraits.carina },
  { name: "Magdalena Czerwinski", role: "Backoffice", img: portraits.magdalena },
  // Vaida & Tanja: bisherige Porträts (passen wie gehabt).
  { name: "Vaida Laschke", role: "Backoffice", img: "/images/team/vaida-laschke.jpg" },
  { name: "Tanja Knab", role: "Backoffice", img: "/images/team/tanja-knab.jpg" },
  { name: "Helena Sator", role: "Extern", img: portraits.helena },
  { name: "Julien Brenner", role: "Azubi", img: portraits.julien },
  { name: "Melanie Oblonk", role: "Azubi", img: portraits.melanie },
  { name: "Loana Sabielny", role: "Azubi", img: null },
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
      <PageIntro eyebrow="Über uns" title="Die Familie RIEGEL — und ein Team, das Ihre Region kennt">
        RIEGEL Immobilien ist inhabergeführt und seit über 20&nbsp;Jahren in Speyer,
        Ludwigshafen und der Region verwurzelt — regional zuhause, national
        vernetzt. Als Familienunternehmen mit Immobilienexperten an zwei
        Standorten verbinden wir persönliche Betreuung mit echter Marktkenntnis.
      </PageIntro>

      {/* Familie */}
      <section className="py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Familie RIEGEL
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

      {/* Das Team — echte Besetzung mit Porträts (kein Gruppenfoto mehr) */}
      <section className="border-t border-border bg-surface/40 py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10 max-w-xl space-y-3">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Das Team
            </span>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Die Menschen hinter RIEGEL
            </h2>
            <p className="text-muted">
              Hinter jedem erfolgreichen Verkauf steht ein eingespieltes Team aus
              Beratung, Marketing und Backoffice — persönlich erreichbar an beiden
              Standorten.
            </p>
          </Reveal>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={(i % 4) * 70}>
                <figure className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface-2">
                    {m.img ? (
                      <Image
                        src={m.img}
                        alt={m.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                    ) : (
                      // Platzhalter für Loana Sabielny (Foto folgt) — Initialen
                      // im Marken-Look statt eines leeren Rahmens.
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
                        <span className="akira text-3xl text-accent/70">LS</span>
                        <span className="text-[0.65rem] uppercase tracking-widest text-faint">Foto folgt</span>
                      </div>
                    )}
                  </div>
                  <figcaption className="mt-3">
                    <div className="text-sm font-semibold leading-tight text-fg">{m.name}</div>
                    <div className="text-xs text-accent">{m.role}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8">
            <p className="text-sm text-muted">
              Wir bilden aus: <span className="text-fg">Kaufleute für Büromanagement</span> und{" "}
              <span className="text-fg">Immobilienkaufleute</span> — Nachwuchs aus der Region, für die Region.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Engagement & Sponsoring — Bento, „setzt sich beim Scroll zusammen" */}
      <section className="border-t border-border py-16 sm:py-20">
        <Container>
          <Reveal className="mb-10 max-w-2xl space-y-3">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Engagement &amp; Sponsoring
            </span>
            <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
              Regional engagiert und verwurzelt, <span className="text-accent">national</span>{" "}
              vernetzt und tätig.
            </h2>
            <p className="text-muted">
              Seit über 20&nbsp;Jahren zeigen wir Gesicht — im lokalen Vereinsleben
              genauso wie auf der großen Bühne der Bundesliga.
            </p>
          </Reveal>
          <EngagementBento />
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
                      alt={`RIEGEL Immobilien Büro ${l.city}`}
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
                  alt={`RIEGEL Immobilien — ${img.label}`}
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

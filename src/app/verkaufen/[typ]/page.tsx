import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import {
  ExpertenInfografik,
  type ExpertenInfografikTyp,
} from "@/components/experten/experten-infografik";
import { ReferenzObjekte } from "@/components/experten/referenz-objekte";
import { BewertungSpotlight } from "@/components/experten/bewertung-spotlight";
import { getExpertenObjekte } from "@/lib/experten-objekte";

/** Nur diese 5 Typen haben eine eigene Infografik-Variante. */
const INFOGRAFIK_TYPEN = new Set(["mehrfamilienhaus", "gewerbeimmobilie", "wohn-und-geschaeftshaus", "anlageimmobilie", "nachlassimmobilie"]);
import { site } from "@/lib/site";
import {
  expertenSeiten,
  expertenRelated,
  getExpertenSeite,
  EXPERTEN_PUBLISHED,
  EXPERTEN_UPDATED,
  type ExpertenSeite,
} from "@/lib/experten";

export function generateStaticParams() {
  return expertenSeiten.map((s) => ({ typ: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ typ: string }> }) {
  const { typ } = await params;
  const s = getExpertenSeite(typ);
  if (!s) return { title: "Verkaufen" };
  const url = `/verkaufen/${s.slug}`;
  return {
    // absolute: metaTitle enthält die Marke bereits → kein doppeltes „| RIEGEL Immobilien".
    title: { absolute: s.metaTitle },
    description: s.metaDescription,
    alternates: { canonical: url },
    keywords: s.keywords,
    openGraph: { title: s.metaTitle, description: s.metaDescription, url, type: "article" },
  };
}

function jsonLd(seite: ExpertenSeite, url: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: seite.h1,
        description: seite.metaDescription,
        serviceType: `Verkauf und Vermarktung: ${seite.label}`,
        provider: { "@id": `${site.url}/#organization` },
        areaServed: ["Speyer", "Ludwigshafen", "Metropolregion Rhein-Neckar"],
        url,
      },
      {
        "@type": "Article",
        headline: seite.h1,
        description: seite.metaDescription,
        about: seite.keywords,
        author: { "@type": "Organization", name: site.legalName },
        publisher: { "@type": "Organization", name: site.legalName, url: site.url },
        mainEntityOfPage: url,
        inLanguage: "de-DE",
        datePublished: EXPERTEN_PUBLISHED,
        dateModified: EXPERTEN_UPDATED,
      },
      {
        // Entity-Signal analog geo-article-view: @id verweist auf den
        // Org-Knoten im Layout → Google führt die Entitäten zusammen.
        "@type": "RealEstateAgent",
        "@id": `${site.url}/#organization`,
        name: site.legalName,
        url: site.url,
        telephone: site.phone,
        email: site.email,
        areaServed: ["Speyer", "Ludwigshafen", "Metropolregion Rhein-Neckar"],
        address: site.locations.map((l) => ({
          "@type": "PostalAddress",
          streetAddress: l.street,
          postalCode: l.zip,
          addressLocality: l.city,
          addressCountry: "DE",
        })),
        sameAs: [site.socials.instagram, site.socials.facebook, site.socials.youtube].filter(Boolean),
      },
      {
        "@type": "FAQPage",
        mainEntity: seite.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Verkaufen", item: `${site.url}/verkaufen` },
          { "@type": "ListItem", position: 3, name: seite.h1, item: url },
        ],
      },
    ],
  };
}

/** Hebt den konfigurierten Teilstring des Claims im Akzentton hervor. */
function claimMitAkzent(claim: string, akzent?: string): ReactNode {
  if (!akzent) return claim;
  const i = claim.indexOf(akzent);
  if (i === -1) return claim;
  return (
    <>
      {claim.slice(0, i)}
      <span className="text-accent">{akzent}</span>
      {claim.slice(i + akzent.length)}
    </>
  );
}

/** Einheitliche Sektions-Überschrift (Icon-Muster der Bestandsblöcke). */
function SektionsTitel({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
      <span className="text-accent"><Icon name={icon} size={20} /></span>
      {children}
    </h2>
  );
}

export default async function ExpertenPage({ params }: { params: Promise<{ typ: string }> }) {
  const { typ } = await params;
  const seite = getExpertenSeite(typ);
  if (!seite) notFound();

  const url = `${site.url}/verkaufen/${seite.slug}`;
  // Cluster-Nachbarn zuerst (Hub-and-Spoke-Verlinkung), aufgefüllt mit Flaggschiffen.
  const related = expertenRelated(seite, 4);
  // Fail-soft: Mock-Fallback oder Fehler → [] → Sektion entfällt komplett.
  const objekte = await getExpertenObjekte(seite.slug, 3);

  return (
    <article className="pb-20 sm:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(seite, url)) }}
      />

      {/* Hero — asymmetrisch: Claim/Subline/CTA links, Foto rechts mit Fade
          in den Seitenhintergrund. Sichtbare h1 = Subline (SEO-kanonisch
          bleibt seite.h1 in Metadata + JSON-LD), der akira-Claim ist reines
          Display-Element darüber. */}
      <section className="relative overflow-hidden pb-20 pt-32 sm:pt-36 lg:pb-28">
        <div className="absolute inset-0 -z-10 lg:left-[34%]">
          <Image
            src={seite.heroFoto.src}
            alt={seite.heroFoto.alt}
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 66vw"
            className="object-cover"
            style={seite.heroFoto.position ? { objectPosition: seite.heroFoto.position } : undefined}
          />
          {/* Mobil liegt das Foto voll hinter dem Text → kräftig abdunkeln. */}
          <div aria-hidden className="absolute inset-0 bg-bg/55 lg:hidden" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30 lg:hidden" />
          {/* Desktop: weicher horizontaler Fade von der Textspalte ins Foto
              plus Fade nach unten in den Seitenhintergrund. */}
          <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-bg from-[6%] via-bg/45 via-[46%] to-bg/5 lg:block" />
          <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-t from-bg to-transparent to-[38%] lg:block" />
        </div>

        <Container>
          <nav className="text-sm text-faint">
            <Link href="/" className="hover:text-fg">Start</Link>
            {" / "}
            <Link href="/verkaufen" className="hover:text-fg">Verkaufen</Link>
            {" / "}
            <span className="text-muted">{seite.label}</span>
          </nav>

          <div className="mt-10 max-w-3xl sm:mt-14 lg:max-w-[58%]">
            <p className="akira text-[clamp(1.55rem,6.4vw,3rem)] leading-[1.04] text-fg [text-wrap:balance]">
              {claimMitAkzent(seite.claim, seite.claimAkzent)}
            </p>
            <h1 className="mt-5 text-lg font-medium text-muted sm:text-xl">
              {seite.subline}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg/90 sm:text-lg">
              {seite.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/rechner"
                className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                <Icon name="calculator" size={17} /> Kostenlose Werteinschätzung
              </Link>
              <Link
                href="/termin?anlass=Verkaufsberatung"
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-bg/40 px-6 py-3 text-sm text-fg backdrop-blur transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="calendar" size={17} /> Termin vereinbaren
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        {/* USP-Karten — bewusst ohne Reveal: Kerninhalt einer Landingpage
            soll sofort sichtbar sein (analog geo-article-view). */}
        <section className="mt-4 sm:mt-6">
          <SektionsTitel icon="star">Warum RIEGEL</SektionsTitel>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {seite.usps.map((u) => (
              <div key={u.title} className="rounded-2xl border border-border bg-surface p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
                  <Icon name={u.icon} size={20} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-fg tabular-nums">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{u.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Animierte Infografik direkt nach der Übersicht (Kundenvorgabe) —
            nur die 5 Flaggschiff-Typen haben eine eigene Variante; die
            weiteren Objektart-Seiten überspringen die Sektion. */}
        {INFOGRAFIK_TYPEN.has(seite.slug) && (
          <section className="mt-20 sm:mt-24">
            <SektionsTitel icon="chart">Auf einen Blick</SektionsTitel>
            <div className="mt-6">
              <ExpertenInfografik typ={seite.slug as ExpertenInfografikTyp} />
            </div>
          </section>
        )}

        {/* Vertiefende Inhalts-Sektionen — Zick-Zack: Text/Bild wechseln
            die Seite, mobil kollabiert alles einspaltig (Text zuerst). */}
        {seite.vertiefung.map((v, i) => {
          const gespiegelt = i % 2 === 1;
          return (
            <Reveal as="section" key={v.titel} className="mt-20 sm:mt-28">
              <div
                className={`grid items-center gap-8 lg:gap-14 ${
                  gespiegelt ? "lg:grid-cols-[0.95fr_1.05fr]" : "lg:grid-cols-[1.05fr_0.95fr]"
                }`}
              >
                <div className={gespiegelt ? "lg:order-2" : ""}>
                  <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
                    {v.eyebrow}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold text-fg sm:text-3xl">{v.titel}</h2>
                  {v.absaetze.map((a) => (
                    <p key={a.slice(0, 32)} className="mt-4 leading-relaxed text-muted">
                      {a}
                    </p>
                  ))}
                  {v.punkte && (
                    <ul className="mt-6 space-y-2.5">
                      {v.punkte.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-fg/90">
                          <span className="mt-0.5 text-accent"><Icon name="check" size={17} /></span>
                          <span className="text-sm tabular-nums">{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div
                  className={`relative overflow-hidden rounded-3xl border border-border ${
                    gespiegelt ? "lg:order-1" : ""
                  }`}
                >
                  <Image
                    src={v.foto.src}
                    alt={v.foto.alt}
                    width={1200}
                    height={800}
                    sizes="(max-width: 1024px) 100vw, 46vw"
                    className="h-[260px] w-full object-cover sm:h-[380px]"
                    style={v.foto.position ? { objectPosition: v.foto.position } : undefined}
                  />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/35 to-transparent" />
                </div>
              </div>
            </Reveal>
          );
        })}

        {/* Referenzobjekte — nur mit echten Live-Mandaten (fail-soft []). */}
        {objekte.length > 0 && (
          <Reveal className="mt-20 sm:mt-28">
            <ReferenzObjekte estates={objekte} heading={seite.referenzHeading} />
          </Reveal>
        )}

        {/* Bewertungs-Spotlight — echte Zitate, Treffer-Wörter hervorgehoben. */}
        <Reveal className="mt-20 sm:mt-28">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
            Kundenstimmen
          </span>
          <div className="mt-2">
            <BewertungSpotlight keywords={seite.spotlightKeywords} />
          </div>
        </Reveal>

        {/* „Wir vermarkten"-Chips */}
        <section className="mt-20 sm:mt-28">
          <SektionsTitel icon="handshake">Wir vermarkten</SektionsTitel>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {seite.chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-fg/90"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ — Akkordeon (nativ, ohne JS, analog geo-article-view) */}
        <section className="mt-20 max-w-3xl sm:mt-28">
          <SektionsTitel icon="search">Häufige Fragen von Eigentümern</SektionsTitel>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {seite.faq.map((f) => (
              <details key={f.q} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-fg">
                  {f.q}
                  <span className="shrink-0 text-faint transition-transform duration-300 group-open:rotate-180">
                    <Icon name="chevronDown" size={18} />
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* „Wir suchen laufend" + CTA — Abschluss der Seite */}
        <section className="mt-20 sm:mt-28">
          <div className="rounded-2xl border border-accent/30 bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm text-accent">
              <Icon name="sparkle" size={18} />
              Wir suchen laufend
            </div>
            <p className="mt-3 max-w-2xl text-lg text-fg/90">{seite.suchen}</p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Häufig können wir passende Kaufinteressenten schon vor der öffentlichen
              Vermarktung ansprechen — sprechen Sie uns unverbindlich an.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/rechner"
                className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                <Icon name="calculator" size={17} /> Kostenlose Werteinschätzung
              </Link>
              <Link
                href="/termin?anlass=Verkaufsberatung"
                className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="calendar" size={17} /> Termin vereinbaren
              </Link>
            </div>
          </div>
        </section>

        {/* Weitere Spezialisierungen — interne Verlinkung gegen Sackgassen */}
        <section className="mt-16 sm:mt-20">
          <SektionsTitel icon="layers">Weitere Spezialisierungen</SektionsTitel>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {related.map((s) => (
              <Link
                key={s.slug}
                href={`/verkaufen/${s.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
              >
                <div className="min-w-0">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Die Experten für</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-fg">{s.label}</div>
                </div>
                <Icon name="arrowRight" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </Container>
    </article>
  );
}

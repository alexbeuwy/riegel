import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";
import {
  expertenSeiten,
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
    // absolute: metaTitle enthält die Marke bereits → kein doppeltes „| Riegel Immobilien".
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

export default async function ExpertenPage({ params }: { params: Promise<{ typ: string }> }) {
  const { typ } = await params;
  const seite = getExpertenSeite(typ);
  if (!seite) notFound();

  const url = `${site.url}/verkaufen/${seite.slug}`;
  const related = expertenSeiten.filter((s) => s.slug !== seite.slug);

  return (
    <article className="py-20 sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(seite, url)) }}
      />
      <Container>
        <nav className="text-sm text-faint">
          <Link href="/" className="hover:text-fg">Start</Link>
          {" / "}
          <Link href="/verkaufen" className="hover:text-fg">Verkaufen</Link>
          {" / "}
          <span className="text-muted">{seite.label}</span>
        </nav>

        {/* Hero */}
        <div className="mt-6 max-w-3xl">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
            <Icon name={seite.icon} size={22} />
          </span>
          {/* clamp() wie geo-article-view: lange Komposita in Akira Expanded
              sprengen sonst den 390px-Viewport. h1Display enthält Soft-Hyphens
              (­), damit der Umbruch mit Trennstrich erfolgt — unabhängig vom
              Trennwörterbuch des Browsers; break-words bleibt als Fallback. */}
          <h1 className="akira mt-5 text-[clamp(1.5rem,7.5vw,1.875rem)] leading-[1.05] hyphens-auto break-words sm:text-5xl">
            {seite.h1Display}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-fg/90">{seite.intro}</p>
        </div>

        {/* USP-Karten — bewusst ohne Reveal: Kerninhalt einer Landingpage
            soll sofort sichtbar sein (analog geo-article-view). */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {seite.usps.map((u) => (
            <div key={u.title} className="rounded-2xl border border-border bg-surface p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
                <Icon name={u.icon} size={20} />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-fg tabular-nums">{u.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{u.text}</p>
            </div>
          ))}
        </div>

        {/* „Wir vermarkten"-Chips */}
        <section className="mt-14">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
            <span className="text-accent"><Icon name="handshake" size={20} /></span>
            Wir vermarkten
          </h2>
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
        <section className="mt-14 max-w-3xl">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
            <span className="text-accent"><Icon name="search" size={20} /></span>
            Häufige Fragen von Eigentümern
          </h2>
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

        {/* „Wir suchen laufend" + CTA */}
        <section className="mt-14">
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
        <section className="mt-14">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
            <span className="text-accent"><Icon name="layers" size={20} /></span>
            Weitere Spezialisierungen
          </h2>
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

import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";
import type { GeoArticle } from "@/lib/geo";

/* ---------- Mini-Markdown-Renderer (Fett, Listen, Zwischenüberschriften) ---------- */
function inline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyBase}-b${i}`} className="font-semibold text-fg">
        {part}
      </strong>
    ) : (
      <span key={`${keyBase}-t${i}`}>{part}</span>
    ),
  );
}

function renderBody(body: string): React.ReactNode {
  const blocks = body.trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const isUl = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOl = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));
    if (isUl) {
      return (
        <ul key={bi} className="my-4 space-y-2">
          {lines.map((l, li) => (
            <li key={li} className="flex items-start gap-2.5 text-muted">
              <span className="mt-1 text-accent">
                <Icon name="check" size={16} />
              </span>
              <span>{inline(l.replace(/^\s*[-*]\s+/, ""), `${bi}-${li}`)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (isOl) {
      return (
        <ol key={bi} className="my-4 space-y-2">
          {lines.map((l, li) => (
            <li key={li} className="flex items-start gap-3 text-muted">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-accent">
                {li + 1}
              </span>
              <span>{inline(l.replace(/^\s*\d+\.\s+/, ""), `${bi}-${li}`)}</span>
            </li>
          ))}
        </ol>
      );
    }
    if (/^###\s+/.test(block)) {
      return (
        <h4 key={bi} className="mt-6 text-lg font-semibold text-fg">
          {inline(block.replace(/^###\s+/, ""), `h-${bi}`)}
        </h4>
      );
    }
    if (/^##\s+/.test(block)) {
      return (
        <h3 key={bi} className="mt-8 text-xl font-semibold text-fg">
          {inline(block.replace(/^##\s+/, ""), `h-${bi}`)}
        </h3>
      );
    }
    return (
      <p key={bi} className="my-4 leading-relaxed text-muted">
        {inline(block.replace(/\n/g, " "), `p-${bi}`)}
      </p>
    );
  });
}

export function GeoArticleView({ article }: { article: GeoArticle }) {
  const basePath = article.kind === "standort" ? "/standorte" : "/ratgeber";
  const baseLabel = article.kind === "standort" ? "Standorte" : "Ratgeber";
  const url = `${site.url}${basePath}/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.h1,
        description: article.metaDescription,
        about: article.keywords,
        author: { "@type": "Organization", name: site.legalName },
        publisher: { "@type": "Organization", name: site.legalName, url: site.url },
        mainEntityOfPage: url,
        inLanguage: "de-DE",
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: baseLabel, item: `${site.url}${basePath}` },
          { "@type": "ListItem", position: 3, name: article.h1, item: url },
        ],
      },
    ],
  };

  return (
    <article className="py-20 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Container>
        <nav className="text-sm text-faint">
          <Link href="/" className="hover:text-fg">
            Start
          </Link>{" "}
          /{" "}
          <Link href={basePath} className="hover:text-fg">
            {baseLabel}
          </Link>{" "}
          / <span className="text-muted">{article.ort ?? article.h1}</span>
        </nav>

        <div className="mt-6 max-w-3xl">
          <h1 className="akira text-3xl leading-[1.05] sm:text-5xl">{article.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg/90">{article.intro}</p>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_280px]">
          <div className="max-w-3xl">
            {article.sections.map((s, i) => (
              <section key={i} className="mt-10 first:mt-0">
                <h2 className="text-2xl font-semibold text-fg">{s.h2}</h2>
                {renderBody(s.body)}
              </section>
            ))}

            {/* FAQ */}
            {article.faq.length > 0 && (
              <section className="mt-12">
                <h2 className="text-2xl font-semibold text-fg">Häufige Fragen</h2>
                <div className="mt-5 divide-y divide-border border-y border-border">
                  {article.faq.map((f, i) => (
                    <div key={i} className="py-5">
                      <h3 className="font-semibold text-fg">{f.q}</h3>
                      <p className="mt-2 leading-relaxed text-muted">{f.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar-CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-accent/30 bg-surface p-6">
              <div className="flex items-center gap-2 text-sm text-accent">
                <Icon name="sparkle" size={18} />
                {article.kind === "standort" && article.ort ? article.ort : "Riegel Immobilien"}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-fg">
                Kostenlose Bewertung anfordern
              </h3>
              <p className="mt-2 text-sm text-muted">
                Datenbasiert, regional und unverbindlich — Ergebnis in 60 Sekunden.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <Link
                  href="/rechner"
                  className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Icon name="calculator" size={17} />
                  Immobilie bewerten
                </Link>
                <Link
                  href="/termin"
                  className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon name="calendar" size={17} />
                  Termin vereinbaren
                </Link>
              </div>
              <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
                <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-accent">
                  <Icon name="phone" size={15} />
                  {site.phone}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}

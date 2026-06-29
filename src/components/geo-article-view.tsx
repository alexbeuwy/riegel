import Link from "next/link";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/lib/site";
import type { GeoArticle } from "@/lib/geo";

/* ---------- Inline-Markdown: **fett** + *kursiv* ---------- */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+?)\*\*|\*([^*]+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={`${keyBase}-t${i}`}>{text.slice(last, m.index)}</span>);
    if (m[1] != null) out.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-fg">{m[1]}</strong>);
    else out.push(<em key={`${keyBase}-i${i}`} className="text-fg/90">{m[2]}</em>);
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) out.push(<span key={`${keyBase}-t${i}`}>{text.slice(last)}</span>);
  return out;
}

/* Deutsche Zahl(en) aus einer Tabellenzelle → Mittelwert (für Balken-Chart). */
function cellNumber(cell: string): number | null {
  const nums = cell.match(/\d[\d.]*(?:,\d+)?/g);
  if (!nums) return null;
  const vals = nums.map((n) => Number(n.replace(/\./g, "").replace(",", "."))).filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
const splitRow = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/* ---------- Tabelle (Pipe-Markdown) → Premium-Tabelle + optionaler Balken-Chart ---------- */
function TableBlock({ lines, kb }: { lines: string[]; kb: string }) {
  const header = splitRow(lines[0]);
  const rows = lines.slice(2).map(splitRow).filter((r) => r.some((c) => c.length > 0));
  const lastIdx = header.length - 1;
  const chart = rows
    .map((r) => ({ label: r[0], val: cellNumber(r[lastIdx] ?? "") }))
    .filter((x) => x.val != null) as { label: string; val: number }[];
  const max = chart.length ? Math.max(...chart.map((c) => c.val)) : 0;

  return (
    <div className="my-6">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-faint">
            <tr>
              {header.map((h, i) => (
                <th key={i} className={`px-4 py-3 font-medium ${i > 0 ? "text-right" : ""}`}>{inline(h, `${kb}-h${i}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border">
                {r.map((c, ci) => (
                  <td key={ci} className={`px-4 py-3 ${ci > 0 ? "text-right font-medium tabular-nums text-fg" : "text-muted"}`}>{inline(c, `${kb}-${ri}-${ci}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chart.length >= 2 && max > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-faint">
            <Icon name="chart" size={14} className="text-accent" />
            {header[lastIdx]}
          </div>
          <div className="space-y-2.5">
            {chart.map((c, ci) => (
              <div key={ci} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted">{c.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent" style={{ width: `${Math.round((c.val / max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.7rem] text-faint">Illustrative Visualisierung der Tabellenwerte (Mittelwerte).</p>
        </div>
      )}
    </div>
  );
}

function renderBody(body: string, kb: string): React.ReactNode {
  const blocks = body.trim().split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const isTable = lines.length >= 2 && lines.every((l) => /^\s*\|.*\|\s*$/.test(l)) && /^[\s|:-]+$/.test(lines[1]);
    if (isTable) return <TableBlock key={bi} lines={lines} kb={`${kb}-${bi}`} />;

    const isUl = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
    const isOl = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));
    if (isUl) {
      return (
        <ul key={bi} className="my-4 space-y-2">
          {lines.map((l, li) => (
            <li key={li} className="flex items-start gap-2.5 text-muted">
              <span className="mt-1 text-accent"><Icon name="check" size={16} /></span>
              <span>{inline(l.replace(/^\s*[-*]\s+/, ""), `${kb}-${bi}-${li}`)}</span>
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
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-accent">{li + 1}</span>
              <span>{inline(l.replace(/^\s*\d+\.\s+/, ""), `${kb}-${bi}-${li}`)}</span>
            </li>
          ))}
        </ol>
      );
    }
    if (/^###\s+/.test(block)) return <h4 key={bi} className="mt-6 text-lg font-semibold text-fg">{inline(block.replace(/^###\s+/, ""), `${kb}-h${bi}`)}</h4>;
    if (/^##\s+/.test(block)) return <h3 key={bi} className="mt-8 text-xl font-semibold text-fg">{inline(block.replace(/^##\s+/, ""), `${kb}-h${bi}`)}</h3>;
    return <p key={bi} className="my-4 leading-relaxed text-muted">{inline(block.replace(/\n/g, " "), `${kb}-p${bi}`)}</p>;
  });
}

/* ---------- Section-Icon nach Stichwort ---------- */
function sectionIcon(h2: string): IconName {
  const t = h2.toLowerCase();
  const map: [RegExp, IconName][] = [
    [/kosten|provision|steuer|preis|courtage|gebühr|€/, "euro"],
    [/ablauf|schritt|phase|so läuft|vorgehen/, "layers"],
    [/bewert|wert|markt|preis­entwicklung|rendite/, "calculator"],
    [/lage|stadtteil|ortsteil|region|umgebung|wo /, "pin"],
    [/energie|sanier|heiz/, "bolt"],
    [/verkauf|verkaufen|vermarkt|mandat/, "handshake"],
    [/unterlage|dokument|grundbuch|vertrag|notar/, "doc"],
    [/trend|entwicklung|nachfrage/, "trend"],
    [/miete|vermiet|kapitalanlage/, "key"],
    [/scheidung|erbe|geerbt|trennung/, "shield"],
    [/warum|riegel|ausgezeichnet|award|erfahrung/, "star"],
    [/frage|faq/, "search"],
  ];
  for (const [re, name] of map) if (re.test(t)) return name;
  return "sparkle";
}

/* ---------- Schlüssel-Fakten (kurze fette Zahl-Token) ---------- */
function keyFacts(article: GeoArticle): { text: string; icon: IconName }[] {
  const corpus = [article.intro, ...article.sections.map((s) => s.body)].join("\n");
  const found: { text: string; icon: IconName }[] = [];
  const seen = new Set<string>();
  const re = /\*\*([^*]{2,26}?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(corpus)) !== null) {
    const t = m[1].trim();
    if (!/\d/.test(t)) continue;
    if (!/(%|€|m²|Jahr|Top \d|Tage|Monat)/.test(t)) continue;
    const key = t.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const icon: IconName = /Top \d|ausgezeichnet/.test(t) ? "star" : /%/.test(t) ? "trend" : /€/.test(t) ? "euro" : /m²/.test(t) ? "ruler" : "clock";
    found.push({ text: t, icon });
    if (found.length >= 4) break;
  }
  return found;
}

export function GeoArticleView({ article }: { article: GeoArticle }) {
  const basePath = article.kind === "standort" ? "/standorte" : "/ratgeber";
  const baseLabel = article.kind === "standort" ? "Standorte" : "Ratgeber";
  const url = `${site.url}${basePath}/${article.slug}`;
  const facts = keyFacts(article);
  const heroIcon: IconName = article.kind === "standort" ? "pin" : sectionIcon(article.h1);

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
        // Starker Entity-/Local-Signal für KI-Antworten (wer ist der Makler?)
        "@type": "RealEstateAgent",
        name: site.legalName,
        url: site.url,
        telephone: site.phone,
        email: site.email,
        award: "ImmoScout24 ImmoAward 2025 — Top 21 Makler des Jahres in Deutschland",
        areaServed: ["Speyer", "Ludwigshafen", "Vorderpfalz", "Rhein-Neckar", article.ort].filter(Boolean),
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
          <Link href="/" className="hover:text-fg">Start</Link>{" / "}
          <Link href={basePath} className="hover:text-fg">{baseLabel}</Link>{" / "}
          <span className="text-muted">{article.ort ?? article.h1}</span>
        </nav>

        <div className="mt-6 max-w-3xl">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
            <Icon name={heroIcon} size={22} />
          </span>
          <h1 className="akira mt-5 text-3xl leading-[1.05] sm:text-5xl">{article.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg/90">{article.intro}</p>

          {facts.length >= 2 && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {facts.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm">
                  <Icon name={f.icon} size={15} className="text-accent" />
                  <span className="text-fg">{f.text}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_280px]">
          <div className="max-w-3xl">
            {article.sections.map((s, i) => (
              <section key={i} className="mt-10 first:mt-0">
                <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
                  <span className="text-accent"><Icon name={sectionIcon(s.h2)} size={20} /></span>
                  {s.h2}
                </h2>
                {renderBody(s.body, `s${i}`)}
              </section>
            ))}

            {/* FAQ — Akkordeon (nativ, ohne JS) */}
            {article.faq.length > 0 && (
              <section className="mt-12">
                <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
                  <span className="text-accent"><Icon name="search" size={20} /></span>
                  Häufige Fragen
                </h2>
                <div className="mt-5 divide-y divide-border border-y border-border">
                  {article.faq.map((f, i) => (
                    <details key={i} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
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
            )}
          </div>

          {/* Sidebar-CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-accent/30 bg-surface p-6">
              <div className="flex items-center gap-2 text-sm text-accent">
                <Icon name="sparkle" size={18} />
                {article.kind === "standort" && article.ort ? article.ort : "Riegel Immobilien"}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-fg">Kostenlose Bewertung anfordern</h3>
              <p className="mt-2 text-sm text-muted">Datenbasiert, regional und unverbindlich — Ergebnis in 60 Sekunden.</p>
              <div className="mt-5 flex flex-col gap-2.5">
                <Link href="/rechner" className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
                  <Icon name="calculator" size={17} /> Immobilie bewerten
                </Link>
                <Link href="/termin" className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
                  <Icon name="calendar" size={17} /> Termin vereinbaren
                </Link>
              </div>
              <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
                <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-accent">
                  <Icon name="phone" size={15} /> {site.phone}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}

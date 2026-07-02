import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/lib/site";
import { photos } from "@/lib/photos";
import { geoArticles, GEO_CONTENT_PUBLISHED, GEO_CONTENT_UPDATED, type GeoArticle } from "@/lib/geo";
import {
  standortRegion,
  standortRegionLabel,
  ratgeberCategory,
  ratgeberCategoryLabel,
} from "@/lib/geo-taxonomy";
import { marktort } from "@/lib/marktdaten";

const nf = new Intl.NumberFormat("de-DE");
const fmtPct = (n: number) => n.toFixed(1).replace(".", ",");

/** Verwandte Seiten: gleiche Region (Standort) bzw. Kategorie (Ratgeber) zuerst, dann auffüllen. */
function relatedArticles(article: GeoArticle): GeoArticle[] {
  const groupOf = (a: GeoArticle) => (a.kind === "standort" ? standortRegion(a) : ratgeberCategory(a));
  const key = groupOf(article);
  const sameKind = geoArticles.filter((a) => a.kind === article.kind && a.slug !== article.slug);
  const primary = sameKind.filter((a) => groupOf(a) === key);
  const rest = sameKind.filter((a) => groupOf(a) !== key);
  return [...primary, ...rest].slice(0, 4);
}

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

/* ---------- Tabelle (Pipe-Markdown) → Premium-Tabelle + optionaler Balken-Chart ----------
   Der Chart braucht eine SPALTE mit einer einzigen, eindeutigen Einheit (€, %, m² oder
   einer Zeitdauer) — sonst entstehen Geister-Werte: eine Telefonnummer oder ein "Q1 2026"
   ergeben durchs bloße Ziffern-Regex einen Zahlenwert, der aber nichts Vergleichbares misst.
   Daher: cellMetric() akzeptiert eine Zelle NUR mit erkennbarem Einheiten-Signal, und
   pickChartColumn() wählt die best-geeignete Spalte statt blind die letzte zu nehmen. */
type Unit = "eur" | "pct" | "m2" | "days";

const DURATION_UNITS: [RegExp, number][] = [
  [/\bstd\.?\b|\bstunden?\b/i, 1 / 24],
  [/\btage?\b/i, 1],
  [/\bwochen?\b/i, 7],
  [/\bmonate?\b/i, 30],
  [/\bjahre?\b/i, 365],
];

function cellMetric(cell: string): { val: number; unit: Unit } | null {
  const nums = cell.match(/\d[\d.]*(?:,\d+)?/g);
  if (!nums) return null;
  const vals = nums.map((n) => Number(n.replace(/\./g, "").replace(",", "."))).filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length; // Range-Zelle ("2.700–3.000 €") → Mittelwert
  if (/€/.test(cell)) return { val: avg, unit: "eur" };
  if (/%/.test(cell)) return { val: avg, unit: "pct" };
  if (/m²/.test(cell)) return { val: avg, unit: "m2" };
  for (const [re, factor] of DURATION_UNITS) {
    if (re.test(cell)) return { val: avg * factor, unit: "days" }; // auf Tage normiert, sonst sind "3 Wochen" vs. "75 Tage" nicht vergleichbar
  }
  return null; // kein Einheiten-Signal → keine Chart-Zahl (verhindert Telefonnummern/Jahreszahlen/Quartale als Werte)
}

const splitRow = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** Wählt die am besten geeignete Wertespalte (nicht blind die letzte): mind. 2 Werte,
 *  mind. 60 % der Zeilen abgedeckt, eine einzige Einheit — sonst kein Chart statt eines
 *  falschen/lückenhaften. */
function pickChartColumn(
  header: string[],
  rows: string[][],
): { colIdx: number; unitLabel: string; chart: { label: string; val: number }[] } | null {
  let best: { colIdx: number; unitLabel: string; chart: { label: string; val: number }[] } | null = null;
  for (let col = 1; col < header.length; col++) {
    const parsed = rows.map((r) => ({ label: r[0], metric: cellMetric(r[col] ?? "") }));
    const withVal = parsed.filter((p) => p.metric != null) as { label: string; metric: { val: number; unit: Unit } }[];
    if (withVal.length < 2 || withVal.length / rows.length < 0.6) continue;
    const units = new Set(withVal.map((p) => p.metric.unit));
    if (units.size > 1) continue; // gemischte Einheiten in derselben Spalte → nicht vergleichbar
    if (!best || withVal.length >= best.chart.length) {
      best = { colIdx: col, unitLabel: header[col], chart: withVal.map((p) => ({ label: p.label, val: p.metric.val })) };
    }
  }
  return best;
}

function TableBlock({ lines, kb }: { lines: string[]; kb: string }) {
  const header = splitRow(lines[0]);
  const rows = lines.slice(2).map(splitRow).filter((r) => r.some((c) => c.length > 0));
  // Rechenschritt-Tabellen (Zeilen mit −/=/+-Präfix, z. B. Verkaufspreis − Kosten = Gewinn):
  // ein flacher Größenvergleichs-Balken ist hier irreführend (die Tabelle selbst erklärt die
  // Rechnung bereits klar) — deshalb bewusst kein Chart für dieses Muster.
  const isWaterfall = rows.filter((r) => /^[−\-=+]/.test(r[0]?.trim() ?? "")).length >= 2;
  const picked = isWaterfall ? null : pickChartColumn(header, rows);
  const chart = picked?.chart ?? [];
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
            {picked!.unitLabel}
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
  const related = relatedArticles(article);
  const markt = article.kind === "standort" ? marktort(article.slug) : undefined;

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
        datePublished: GEO_CONTENT_PUBLISHED,
        dateModified: GEO_CONTENT_UPDATED,
      },
      {
        // Starker Entity-/Local-Signal für KI-Antworten (wer ist der Makler?)
        // @id verweist auf den Org-Knoten im Layout → Google führt die
        // Entitäten zusammen (geo/Standorte/Award kommen von dort).
        "@type": "RealEstateAgent",
        "@id": `${site.url}/#organization`,
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
          {/* Lange Komposita (Akira Expanded ist ein breiter Schriftschnitt) sprengen bei
              fester text-3xl sonst den 390px-Viewport → clamp() statt Fixgröße + Silbentrennung
              (lang="de" ist auf <html> gesetzt, s. layout.tsx) mit break-words als Fallback,
              falls der Browser für ein Wort keine Trennstelle findet. Sehr lange Titel (>65
              Zeichen) bekommen eine kleinere Basisgröße, damit weniger Wörter mitten im
              Kompositum getrennt werden müssen. */}
          <h1
            className={`akira mt-5 leading-[1.05] hyphens-auto break-words ${
              article.h1.length > 65
                ? "text-[clamp(1.35rem,6.5vw,1.5rem)] sm:text-4xl"
                : "text-[clamp(1.5rem,7.5vw,1.875rem)] sm:text-5xl"
            }`}
          >
            {article.h1}
          </h1>
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

        {/* grid-cols-1 (= minmax(0,1fr)) statt der impliziten auto-Spalte: sonst
            zieht ein breites Kind (z. B. Tabellen mit min-w-[480px] weiter unten,
            trotz ihres eigenen overflow-x-auto-Wrappers) die ganze Spalte und damit
            den kompletten Viewport auf Mobile in die Breite (CSS-Grid-„Blowout"). */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
          <div className="max-w-[68ch]">
            {article.sections.map((s, i) => (
              <section key={i} id={`abschnitt-${i}`} className="mt-10 scroll-mt-24 first:mt-0">
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

            {/* Verwandte Seiten — interne Verlinkung gegen Sackgassen (SEO + UX) */}
            {related.length > 0 && (
              <section className="mt-12">
                <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
                  <span className="text-accent"><Icon name="layers" size={20} /></span>
                  {article.kind === "standort" ? "Standorte in der Nähe" : "Passende Ratgeber"}
                </h2>
                {/* grid-cols-1 explizit (statt impliziter auto-Spalte) — sonst zieht der
                    ungetrunkierte Flex-Link-Titel (s. u.) die ganze Spalte/den Viewport
                    in die Breite (identisches Grid-Blowout-Muster wie oben). */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {related.map((a) => {
                    const isStandort = a.kind === "standort";
                    const label = isStandort
                      ? standortRegionLabel(standortRegion(a))
                      : ratgeberCategoryLabel(ratgeberCategory(a));
                    return (
                      <Link
                        key={a.slug}
                        href={`${isStandort ? "/standorte" : "/ratgeber"}/${a.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
                      >
                        <div className="min-w-0">
                          <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">{label}</div>
                          <div className="mt-0.5 truncate text-sm font-medium text-fg">
                            {isStandort ? `Immobilienmakler ${a.ort}` : a.h1}
                          </div>
                        </div>
                        <Icon name="arrowRight" size={16} className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: Marktdaten (Standort-Seiten) + Inhalt (bei langen Artikeln) + CTA */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {markt && (
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-faint">
                  <span>Marktdaten {markt.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium normal-case tracking-normal tabular-nums ${
                      // text-accent-strong statt text-accent: reines Akzent-Blau liegt bei
                      // dieser Textgröße auf Surface/BG unter dem WCAG-AA-Minimum 4,5:1.
                      markt.trendYoyPct >= 0 ? "border-accent/40 text-accent-strong" : "border-border text-muted"
                    }`}
                  >
                    <Icon name="trend" size={11} className={markt.trendYoyPct >= 0 ? "" : "rotate-180"} />
                    {markt.trendYoyPct >= 0 ? "+" : ""}
                    {fmtPct(markt.trendYoyPct)} %
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted">Wohnung, €/m²</div>
                    <div className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                      {nf.format(markt.wohnung.min)}–{nf.format(markt.wohnung.max)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Haus, €/m²</div>
                    <div className="mt-0.5 text-base font-semibold text-fg tabular-nums">
                      {nf.format(markt.haus.min)}–{nf.format(markt.haus.max)}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/preisatlas?ort=${markt.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Zum Preisatlas
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            )}
            {article.sections.length >= 4 && (
              <nav aria-label="Inhalt" className="rounded-2xl border border-border bg-surface p-5">
                <div className="text-[0.65rem] uppercase tracking-[0.25em] text-faint">Inhalt</div>
                <ul className="mt-3 space-y-2">
                  {article.sections.map((s, i) => (
                    <li key={i}>
                      <a
                        href={`#abschnitt-${i}`}
                        className="flex items-start gap-2 text-sm text-muted transition-colors hover:text-accent"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                        {s.h2}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="overflow-hidden rounded-2xl border border-accent/30 bg-surface">
              <Image
                src={article.kind === "standort" ? photos.wertReportDay : photos.wertReportNight}
                alt="Riegel Immobilien – persönliche Bewertung"
                width={560}
                height={360}
                sizes="280px"
                className="h-40 w-full object-cover"
              />
            <div className="p-6">
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
            </div>
          </aside>
        </div>
      </Container>
    </article>
  );
}

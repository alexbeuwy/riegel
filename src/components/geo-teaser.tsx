import Link from "next/link";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";
import { geoArticles } from "@/lib/geo";

/**
 * GEO-Teaser im Footer: zeigt abgedunkelt und in zwei laufenden Reihen, wie viel
 * Wissen RIEGEL bietet (28 Standort- & Ratgeberseiten). Reine CSS-Marquee,
 * pausiert bei Hover, respektiert prefers-reduced-motion.
 */
function label(a: (typeof geoArticles)[number]): string {
  if (a.kind === "standort" && a.ort) return `Immobilienmakler ${a.ort}`;
  return a.h1.split(/[:–-]/)[0].trim().slice(0, 48);
}
function icon(a: (typeof geoArticles)[number]): IconName {
  if (a.kind === "standort") return "pin";
  const t = a.h1.toLowerCase();
  if (/kosten|provision|steuer|notar/.test(t)) return "euro";
  if (/energie/.test(t)) return "bolt";
  if (/bewert|wert/.test(t)) return "calculator";
  if (/scheidung|erbe|geerbt/.test(t)) return "shield";
  if (/miete|vermiet/.test(t)) return "key";
  if (/ablauf|verkauf/.test(t)) return "handshake";
  return "doc";
}

function Chip({ a }: { a: (typeof geoArticles)[number] }) {
  const base = a.kind === "standort" ? "/standorte" : "/ratgeber";
  return (
    <Link
      href={`${base}/${a.slug}`}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-bg/40 px-4 py-2 text-sm text-faint transition-colors hover:border-accent/50 hover:text-fg"
    >
      <Icon name={icon(a)} size={14} className="text-faint transition-colors group-hover:text-accent" />
      {label(a)}
    </Link>
  );
}

function Row({ items, rev }: { items: typeof geoArticles; rev?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="reel-marquee py-1.5">
      <div className={`reel-track is-slow ${rev ? "is-rev" : ""}`}>
        {doubled.map((a, i) => (
          <Chip key={`${a.slug}-${i}`} a={a} />
        ))}
      </div>
    </div>
  );
}

export function GeoTeaser() {
  const standorte = geoArticles.filter((a) => a.kind === "standort");
  const ratgeber = geoArticles.filter((a) => a.kind === "ratgeber");
  return (
    <section className="relative overflow-hidden border-t border-border bg-bg py-14">
      <Container>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Wissen & Standorte
            </span>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              RIEGEL beantwortet, was die Region fragt.
            </h2>
            <p className="mt-2 text-sm text-muted">
              {geoArticles.length}&nbsp;Ratgeber- &amp; Standortseiten — gefunden bei Google
              <span className="text-faint"> und in KI-Antworten</span>.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/standorte" className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              <Icon name="pin" size={15} /> Standorte
            </Link>
            <Link href="/ratgeber" className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              <Icon name="doc" size={15} /> Ratgeber
            </Link>
          </div>
        </div>
      </Container>
      <div className="space-y-2">
        <Row items={standorte} />
        <Row items={ratgeber} rev />
      </div>
    </section>
  );
}

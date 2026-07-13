"use client";

import { useInViewOnce, useCountUp } from "@/components/count-up";
import type { RiegelStats } from "@/lib/riegel-stats";

const nfInt = new Intl.NumberFormat("de-DE");
const nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Tile {
  key: string;
  label: string;
  prefix?: string;
  /** Count-up-Zielwert — bereits in der Einheit, die format() erwartet. */
  target: number;
  /** Formatiert NUR die große Zahl (ohne Präfix/Suffix) — Einheiten/Zeichen
   *  wie "Mio."/"+"/"Ø" laufen bewusst als eigene, kleinere Spans daneben
   *  (Muster aus dem bestehenden Kennzahlen-Block, s. page.tsx): die .akira-
   *  Klasse transformiert auf UPPERCASE, und lange Strings in der riesigen
   *  Zahl-Schrift laufen in schmalen Kacheln sonst in die Nachbarkachel über. */
  format: (n: number) => string;
  suffix?: string;
}

export interface StatStripProps {
  stats: RiegelStats;
}

/**
 * Großer Zahlenstreifen ("wie beim Wettbewerber, nur mit echten Zahlen") —
 * die stärksten vier RIEGEL_STATS-Werte, groß und ohne Chrome. Zählt einmalig
 * beim Scroll-in hoch (gemeinsamer IntersectionObserver für den ganzen
 * Streifen, damit alle Kacheln synchron starten).
 */
export function StatStrip({ stats }: StatStripProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  const tiles: Tile[] = [
    {
      key: "aufrufe",
      label: "Aufrufe auf ImmoScout24",
      target: stats.immoscoutAufrufe / 1_000_000,
      format: (n) => nf1.format(n),
      suffix: "Mio.",
    },
    {
      key: "besichtigungen",
      label: "Besichtigungen begleitet",
      target: stats.besichtigungen,
      format: (n) => nfInt.format(Math.round(n)),
    },
    {
      key: "vermarktungstage",
      label: "bis zum Verkauf",
      prefix: "Ø",
      target: stats.oVermarktungstage,
      format: (n) => nfInt.format(Math.round(n)),
      suffix: "Tage",
    },
    {
      key: "jahre",
      label: "Erfahrung in der Region",
      target: 20,
      format: (n) => nfInt.format(Math.round(n)),
      suffix: "+ Jahre",
    },
  ];

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-4"
    >
      {tiles.map((tile, i) => (
        <StatTile key={tile.key} tile={tile} active={inView} delay={i * 90} />
      ))}
    </div>
  );
}

function StatTile({ tile, active, delay }: { tile: Tile; active: boolean; delay: number }) {
  const value = useCountUp(tile.target, active, 1200 + delay);
  return (
    <div className="group relative flex flex-col items-start gap-2 bg-surface p-6 transition-colors duration-300 hover:bg-surface-2 sm:p-8">
      {/* Akzent-Hairline oben, erscheint beim Hover (Muster aus dem bestehenden Kennzahlen-Block). */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-transform duration-500 group-hover:scale-x-100" />
      <span className="flex flex-wrap items-baseline gap-1.5">
        {tile.prefix && <span className="text-sm font-medium text-accent sm:text-base">{tile.prefix}</span>}
        <span className="akira text-3xl tabular-nums text-fg sm:text-5xl">{tile.format(value)}</span>
        {tile.suffix && <span className="text-sm font-medium text-accent sm:text-base">{tile.suffix}</span>}
      </span>
      <span className="text-sm leading-snug text-muted">{tile.label}</span>
    </div>
  );
}

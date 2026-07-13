"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { useInViewOnce, useCountUp } from "@/components/count-up";

const nf = new Intl.NumberFormat("de-DE");

export interface LiveTickerProps {
  aktuellImAngebot: number;
  inVorbereitung: number;
  bisherVerkauft: number;
}

/**
 * Echter Live-Ticker der Startseite: die drei Zahlen kommen server-seitig
 * LIVE aus OnOffice (getLiveTickerStats() in lib/estates.ts) — hier wird nur
 * gezählt/animiert, es wird nichts erfunden oder geschätzt.
 *
 * Optik: bewusst 1:1 die Kennzahlen-Boxen weiter unten auf der Seite
 * (Container, Icon-Chip, Hover-Akzentlinie, Hover-Lift identisch) — nur die
 * Zahl IN der Box ist größer und das Schlagwort ist fett/hell, damit sofort
 * ins Auge springt, worum es geht. Zusätzlich der Live-Puls oben und ein
 * Portal-CTA unten (die „im Angebot"-Zahl führt direkt zu den Objekten).
 *
 * Absichtlich nur DREI Werte (kein „Reserviert") — s. Kommentar bei
 * fetchLiveTickerCounts() in lib/onoffice.ts: lieber eine ehrliche Lücke als
 * eine falsche Zahl.
 */
export function LiveTicker({ aktuellImAngebot, inVorbereitung, bisherVerkauft }: LiveTickerProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  // Leichter Versatz je Spalte (Split-&-Stagger statt eines einzigen Sprungs).
  const angebot = useCountUp(aktuellImAngebot, inView, 1100);
  const vorbereitung = useCountUp(inVorbereitung, inView, 1300);
  const verkauft = useCountUp(bisherVerkauft, inView, 1500);

  const cols: { label: string; value: number; icon: IconName }[] = [
    { label: "Aktuell im Angebot", value: angebot, icon: "building" },
    { label: "In Vorbereitung", value: vorbereitung, icon: "sparkle" },
    { label: "Bisher verkauft", value: verkauft, icon: "handshake" },
  ];

  return (
    <div ref={ref}>
      {/* Live-Status über den Boxen */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
          Live
        </span>
        <span className="text-xs text-faint">aus unserer Objektverwaltung</span>
      </div>

      {/* Boxen: 1:1 der Kennzahlen-Block (Container/Cell/Hover identisch) */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
        {cols.map((col) => (
          <div
            key={col.label}
            className="group relative flex flex-col items-start gap-3 bg-surface p-5 transition-colors duration-300 hover:bg-surface-2 sm:p-7"
          >
            {/* Akzent-Hairline oben, erscheint beim Hover — identisch zum Kennzahlen-Block */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-transform duration-500 group-hover:scale-x-100" />
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08] text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
              <Icon name={col.icon} size={20} />
            </span>
            {/* Zahl IN der Box größer */}
            <span className="akira text-4xl tabular-nums leading-none text-fg sm:text-5xl">
              {nf.format(Math.round(col.value))}
            </span>
            {/* Schlagwort fett/hell, damit sofort klar ist, worum es geht */}
            <span className="text-sm font-bold text-fg sm:text-base">{col.label}</span>
          </div>
        ))}
      </div>

      {/* Kontextueller CTA: die Live-Zahl „im Angebot" führt direkt ins Portal. */}
      <Link
        href="/immobilien"
        className="group mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-strong transition-colors hover:text-accent"
      >
        Alle Objekte im Portal ansehen
        <Icon
          name="arrowRight"
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

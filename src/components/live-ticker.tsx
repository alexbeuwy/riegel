"use client";

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
 * gezählt/animiert, es wird nichts erfunden oder geschätzt. Zählt einmalig
 * hoch, sobald die Karte ins Viewport scrollt (IntersectionObserver, wie
 * Reveal); prefers-reduced-motion springt sofort auf die Endwerte.
 *
 * Absichtlich nur DREI Zeilen (kein "Reserviert") — s. Kommentar bei
 * fetchLiveTickerCounts() in lib/onoffice.ts: lieber eine ehrliche Lücke als
 * eine falsche Zahl.
 */
export function LiveTicker({ aktuellImAngebot, inVorbereitung, bisherVerkauft }: LiveTickerProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  // Leichter Versatz je Zeile (Split-&-Stagger statt eines einzigen Sprungs) —
  // gleiche Dauer würde alle drei Zahlen exakt synchron beenden und wirkt flacher.
  const vorbereitung = useCountUp(inVorbereitung, inView, 1100);
  const angebot = useCountUp(aktuellImAngebot, inView, 1300);
  const verkauft = useCountUp(bisherVerkauft, inView, 1500);

  const rows: { label: string; value: number }[] = [
    { label: "In Vorbereitung", value: vorbereitung },
    { label: "Aktuell im Angebot", value: angebot },
    { label: "Bisher verkauft", value: verkauft },
  ];

  return (
    <div
      ref={ref}
      className="relative isolate overflow-hidden rounded-3xl border border-accent/25 bg-surface p-6 shadow-[0_30px_70px_-35px_rgba(1,92,255,0.45)] sm:p-8"
    >
      {/* Akzent-Glow, bleibt dank overflow-hidden innerhalb der abgerundeten Ecken. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 -z-10 h-56 w-56 rounded-full bg-accent/[0.14] blur-3xl"
      />

      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
          Live
        </span>
      </div>

      <dl className="mt-6 divide-y divide-border/80">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
          >
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="akira text-3xl tabular-nums text-fg sm:text-4xl">
              {nf.format(Math.round(row.value))}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-xs text-faint">
        Live aus unserer Objektdatenbank aktualisiert.
      </p>
    </div>
  );
}

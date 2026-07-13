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
 * hoch, sobald die Zeile ins Viewport scrollt (IntersectionObserver, wie
 * Reveal); prefers-reduced-motion springt sofort auf die Endwerte.
 *
 * Redesign (Kundenfeedback "Ticker viel zu groß" + "Label muss sofort ins
 * Auge springen"): keine schwere Karte mehr — kein bg/Shadow/Glow, nur eine
 * Hairline oben und drei knappe Spalten (Section 4.4 "cards omitted in
 * favor of spacing"). Zahl und Schlagwort bilden pro Spalte bewusst eine
 * enge Einheit: das Label steht in kräftigem Akzent-Uppercase direkt an der
 * Zahl statt als kleiner, blasser Nachgedanke darunter.
 *
 * Absichtlich nur DREI Zeilen (kein "Reserviert") — s. Kommentar bei
 * fetchLiveTickerCounts() in lib/onoffice.ts: lieber eine ehrliche Lücke als
 * eine falsche Zahl.
 */
export function LiveTicker({ aktuellImAngebot, inVorbereitung, bisherVerkauft }: LiveTickerProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();
  // Leichter Versatz je Spalte (Split-&-Stagger statt eines einzigen Sprungs) —
  // gleiche Dauer würde alle drei Zahlen exakt synchron beenden und wirkt flacher.
  const angebot = useCountUp(aktuellImAngebot, inView, 1100);
  const vorbereitung = useCountUp(inVorbereitung, inView, 1300);
  const verkauft = useCountUp(bisherVerkauft, inView, 1500);

  const cols: { label: string; value: number }[] = [
    { label: "Aktuell im Angebot", value: angebot },
    { label: "In Vorbereitung", value: vorbereitung },
    { label: "Bisher verkauft", value: verkauft },
  ];

  return (
    <div ref={ref} className="border-t border-accent/25 pt-6 sm:pt-7">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {/* Einziger erlaubter Deko-Punkt: echter Live-Status, kein Ornament. */}
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-strong">
          Live
        </span>
        <span className="text-xs text-faint">aus unserer Objektverwaltung</span>
      </div>

      <div className="mt-5 grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
        {cols.map((col) => (
          <div
            key={col.label}
            className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
          >
            {/* Zahl + Schlagwort als EINE Einheit: das Label steht hoch-kontrastig
                und gleich groß-lesbar direkt über der Zahl, nicht klein/muted. */}
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
              {col.label}
            </span>
            <span className="akira text-3xl tabular-nums text-fg sm:text-4xl">
              {nf.format(Math.round(col.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

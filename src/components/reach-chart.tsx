"use client";

import { useInViewOnce, useCountUp } from "@/components/count-up";

/**
 * Reichweiten-Vergleich „Exposé-Aufrufe auf ImmoScout24" — Balken 1 (RIEGEL) und
 * jeder weitere Wettbewerber sind ein reines Config-Array: ein neuer Makler ist
 * eine zusätzliche Zeile, kein Layout-Umbau. Sortierung erfolgt automatisch
 * absteigend, die Skala ist linear auf den größten Wert (aktuell RIEGEL).
 *
 * Rechtlich zulässige vergleichende Werbung: ausschließlich reale, auf den
 * ImmoScout24-Anbieterprofilen öffentlich einsehbare Zahlen, mit Datum — keine
 * Wertung oder Spitze im Text, nur die Fakten. NICHTS hier ist geschätzt.
 */
export interface ReachEntry {
  name: string;
  value: number;
  /** Der eigene Balken (RIEGEL) — Akzentfarbe + kräftigere Typografie. */
  highlight?: boolean;
}

export const REACH_DATA: ReachEntry[] = [
  { name: "RIEGEL Immobilien", value: 413_177, highlight: true },
  // Wettbewerber bewusst ANONYM nach Ort (Vorgabe Sissy): keine Namensnennung
  // -> kein Risiko vergleichender Werbung, die Zahlen bleiben echt und
  // öffentlich nachprüfbar. Weitere Balken folgen, sobald die Aufruf-Zahlen
  // der jeweiligen IS24-Profile bestätigt sind.
  { name: "Makler aus Neustadt", value: 64_423 },
  { name: "Makler aus Mannheim", value: 36_473 },
  // Weiterer Makler? Einfach eine Zeile ergänzen — Sortierung und Skala
  // passen sich automatisch an (Maximalwert = längster Balken).
];

const nf = new Intl.NumberFormat("de-DE");

export function ReachChart() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>(0.35);
  const sorted = [...REACH_DATA].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 1;

  return (
    <div ref={ref} className="border-t border-border pt-6 sm:pt-7">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-fg">
          Exposé-Aufrufe auf ImmoScout24
        </h3>
        <p className="text-xs text-faint">
          ImmoScout24-Anbieterprofile · Stand 13.07.2026
        </p>
        <p className="text-[11px] text-faint/70">
          Öffentlich einsehbar auf den jeweiligen Anbieterprofilen.
        </p>
      </div>

      <div className="mt-8 space-y-7">
        {sorted.map((entry, i) => (
          <ReachBarRow
            key={entry.name}
            entry={entry}
            max={max}
            active={inView}
            delay={i * 110}
          />
        ))}
      </div>
    </div>
  );
}

function ReachBarRow({
  entry,
  max,
  active,
  delay,
}: {
  entry: ReachEntry;
  max: number;
  active: boolean;
  delay: number;
}) {
  const value = useCountUp(entry.value, active, 1100 + delay);
  const pct = (entry.value / max) * 100;

  return (
    <div>
      <span
        className={`block ${
          entry.highlight
            ? "text-sm font-semibold text-fg"
            : "text-sm text-muted"
        }`}
      >
        {entry.name}
      </span>

      {/* Grid statt Flex-Prozentmathe: Spalte 1 (Balken) nimmt den Restplatz,
          Spalte 2 (Zahl) ist auto-breit — dadurch sitzt die Zahl exakt am
          Balkenende, ohne je über den Container hinauszulaufen (minmax(0,1fr)
          verhindert den klassischen Grid-Overflow bei langen Zahlen). */}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="h-3 overflow-hidden">
          <div
            className="h-full origin-left rounded-r-sm transition-transform ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
            style={{
              width: `${pct}%`,
              transform: active ? "scaleX(1)" : "scaleX(0)",
              transitionDuration: "1100ms",
              transitionDelay: `${delay}ms`,
              backgroundImage: entry.highlight
                ? "linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) 45%, transparent 100%)"
                : undefined,
              backgroundColor: entry.highlight
                ? undefined
                : "color-mix(in oklab, var(--color-fg) 12%, transparent)",
            }}
          />
        </div>
        <span
          className={`tabular-nums ${
            entry.highlight
              ? "text-xl font-bold text-fg sm:text-2xl"
              : "text-sm font-medium text-muted"
          }`}
        >
          {nf.format(Math.round(value))}
        </span>
      </div>
    </div>
  );
}

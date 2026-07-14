"use client";

import { useInViewOnce, useCountUp } from "@/components/count-up";
import type { RiegelStats } from "@/lib/riegel-stats";

const nfInt = new Intl.NumberFormat("de-DE");

interface Fact {
  key: string;
  label: string;
  target: number;
  format: (n: number) => string;
}

export interface StatStripProps {
  stats: RiegelStats;
}

/**
 * Ruhige Zusatz-Fakten NEBEN dem Live-Ticker — bewusst KEIN eigener
 * 4-Kachel-Zahlenstreifen mit Riesenzahlen (Kundenfeedback "zu viele große
 * Zahlen"). Deutlich kleiner/leiser als die Live-Zahlen im Ticker gesetzt
 * (kein akira-Display, kleinere Schrift) — reine Ergänzung. Alle drei Werte
 * sind belegbar und bewusst so gewählt, dass sie über die Jahre stimmen:
 * Ø Vermarktungsdauer, Jahre am Markt und die jährlichen Besichtigungen
 * (Jahreswert statt eines nicht exakt belegbaren Gesamtwerts).
 */
export function StatStrip({ stats }: StatStripProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  const facts: Fact[] = [
    {
      key: "vermarktungstage",
      label: "Tage bis zum Verkauf",
      target: stats.oVermarktungstage,
      format: (n) => `Ø ${nfInt.format(Math.round(n))}`,
    },
    {
      key: "jahre",
      label: "Jahre am Markt",
      target: 20,
      format: (n) => `${nfInt.format(Math.round(n))}+`,
    },
    {
      key: "besichtigungen",
      label: "Besichtigungen / Jahr",
      target: stats.besichtigungenProJahr,
      format: (n) => `ca. ${nfInt.format(Math.round(n))}`,
    },
  ];

  return (
    <div ref={ref} className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
      {facts.map((fact, i) => (
        <FactItem key={fact.key} fact={fact} active={inView} delay={i * 90} />
      ))}
    </div>
  );
}

function FactItem({ fact, active, delay }: { fact: Fact; active: boolean; delay: number }) {
  const value = useCountUp(fact.target, active, 900 + delay);
  return (
    <p className="flex items-baseline gap-1.5 text-sm text-muted">
      <span className="tabular-nums text-base font-semibold text-fg sm:text-lg">
        {fact.format(value)}
      </span>
      {fact.label}
    </p>
  );
}

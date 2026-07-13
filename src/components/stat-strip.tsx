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
 * Zwei ruhige Zusatz-Fakten NEBEN dem Live-Ticker — bewusst KEIN eigener
 * 4-Kachel-Zahlenstreifen mehr (Kundenfeedback "zu viele große Zahlen").
 * Die Lebenszeit-Zahlen (Aufrufe, Besichtigungen) stehen bereits in Prosa im
 * Hero-Sub und werden hier NICHT dupliziert — nur die beiden Werte, die
 * exklusiv dieser Sektion gehören (s. Kommentar in page.tsx), bleiben übrig:
 * Ø Vermarktungsdauer und Jahre am Markt. Deutlich kleiner/leiser als die
 * drei Live-Zahlen im Ticker gesetzt (kein akira-Display, kleinere Schrift) —
 * reine Ergänzung, kein zweites Cockpit voller Riesenzahlen.
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

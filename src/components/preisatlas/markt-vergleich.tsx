"use client";

import { useState } from "react";
import { TiltCard } from "@/components/tilt-card";
import type { MarktOrt } from "@/lib/marktdaten";

const nf = new Intl.NumberFormat("de-DE");
const fmtPct = (n: number) => n.toFixed(1).replace(".", ",");

const METRICS: { key: string; label: string; get: (o: MarktOrt) => number; fmt: (v: number) => string }[] = [
  { key: "wohnung", label: "Wohnung (bis)", get: (o) => o.wohnung.max, fmt: (v) => `${nf.format(v)} €/m²` },
  { key: "haus", label: "Haus (bis)", get: (o) => o.haus.max, fmt: (v) => `${nf.format(v)} €/m²` },
  {
    key: "boden",
    label: "Bodenwert, kein Objektpreis",
    get: (o) => o.bodenrichtwert,
    fmt: (v) => `${nf.format(v)} €/m²`,
  },
  { key: "yield", label: "Rendite", get: (o) => o.yieldPct, fmt: (v) => `${fmtPct(v)} %` },
];

export interface MarktVergleichProps {
  orte: MarktOrt[];
  defaultLeftSlug?: string;
  defaultRightSlug?: string;
}

/** "Städte vergleichen": zwei Auswahlen, zwei Tilt-Karten mit animierten Vergleichsbalken. */
export function MarktVergleich({ orte, defaultLeftSlug, defaultRightSlug }: MarktVergleichProps) {
  const [leftSlug, setLeftSlug] = useState(defaultLeftSlug ?? orte[0]?.slug ?? "");
  const [rightSlug, setRightSlug] = useState(defaultRightSlug ?? orte[1]?.slug ?? orte[0]?.slug ?? "");

  const left = orte.find((o) => o.slug === leftSlug) ?? orte[0];
  const right = orte.find((o) => o.slug === rightSlug) ?? orte[1] ?? orte[0];
  if (!left || !right) return null; // keine Orte übergeben — nichts zu vergleichen

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <CitySelect label="Stadt A" value={leftSlug} onChange={setLeftSlug} orte={orte} />
        <CitySelect label="Stadt B" value={rightSlug} onChange={setRightSlug} orte={orte} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CompareCard label="Stadt A" ort={left} other={right} />
        <CompareCard label="Stadt B" ort={right} other={left} />
      </div>
    </div>
  );
}

function CitySelect({
  label,
  value,
  onChange,
  orte,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  orte: MarktOrt[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-widest text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-fg outline-none transition-colors focus:border-accent"
      >
        {orte.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompareCard({ label, ort, other }: { label: string; ort: MarktOrt; other: MarktOrt }) {
  return (
    <TiltCard cardClassName="border border-border bg-surface p-6">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.25em] text-faint">{label}</div>
        <h4 className="mt-1 text-lg font-semibold text-fg">{ort.name}</h4>
      </div>
      <div className="space-y-4">
        {METRICS.map((m) => {
          const v = m.get(ort);
          const vOther = m.get(other);
          const denom = Math.max(v, vOther, 1);
          const pct = Math.round((v / denom) * 100);
          const winner = v > vOther;
          return (
            <div key={m.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">{m.label}</span>
                {/* text-accent-strong statt text-accent: reicht bei dieser Textgröße
                    erst auf Surface/BG ans WCAG-AA-Minimum 4,5:1 heran. */}
                <span className={`tabular-nums font-medium ${winner ? "text-accent-strong" : "text-fg"}`}>{m.fmt(v)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${winner ? "bg-accent" : "bg-faint"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </TiltCard>
  );
}

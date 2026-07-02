"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { MARKT_STAND, PREIS_DISCLAIMER, type MarktOrt } from "@/lib/marktdaten";

const nf = new Intl.NumberFormat("de-DE");
const fmtPct = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * Count-up 0→target (Muster aus calculator.tsx, hier ohne Analyse-Phase:
 * jede Zieländerung — also jeder Ortswechsel — löst einen frischen Lauf aus).
 */
function useCountUp(target: number, dur = 700): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    // Reduced-motion läuft über dieselbe raf-Schleife mit Dauer 0 (Endwert
    // bereits im ersten Tick) statt separatem setState()-und-return-Zweig —
    // Letzteres synchronisiert nur State ohne externes System und wird von
    // react-hooks/set-state-in-effect als vermeidbarer Render markiert.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDur = reduce ? 0 : dur;
    let raf = 0;
    let start = 0;
    // Kein manuelles setVal(0) vorab nötig: der erste Tick liefert p=0 (bzw.
    // bei reduced-motion direkt p=1) und setzt den Wert dadurch selbst.
    const tick = (t: number) => {
      if (!start) start = t;
      const p = effectiveDur === 0 ? 1 : Math.min(1, (t - start) / effectiveDur);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

export interface MarktPanelProps {
  ort: MarktOrt;
}

/** Detail-Panel für einen MarktOrt: Spannen-Stats, Sekundär-Stats, Trend-Sparkline. */
export function MarktPanel({ ort }: MarktPanelProps) {
  const wohnungMin = useCountUp(ort.wohnung.min);
  const wohnungMax = useCountUp(ort.wohnung.max);
  const hausMin = useCountUp(ort.haus.min);
  const hausMax = useCountUp(ort.haus.max);

  return (
    // Kein Remount mehr bei Ortswechsel (kein key/.reveal hier) — .reveal
    // übernimmt bereits der Aufrufer (Scroll-in-View, einmalig); einzelne
    // Werte zeigen den Wechsel stattdessen granular per .t-num-d (s. u.).
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      {/* Screenreader-Ansage bei Ortswechsel — Karte/Chips tauschen die Zahlen
          sonst lautlos aus (Tastaturpfad läuft ausschließlich über die Chips). */}
      <span role="status" aria-live="polite" className="sr-only">
        Marktdaten {ort.name} aktualisiert.
      </span>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-faint">Marktdaten</div>
          <h3 className="mt-1 text-xl font-semibold text-fg">{ort.name}</h3>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
            <Icon name="chart" size={18} />
            <span className="t-badge" data-open="true">
              <span className="t-badge-dot flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent tabular-nums">
                <span key={ort.nachfrage} className="t-num-d">
                  {ort.nachfrage}
                </span>
              </span>
            </span>
          </span>
          <span className="text-[0.65rem] text-faint">Nachfrage {ort.nachfrage}/10</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatSpanne label="Wohnung, €/m²" min={wohnungMin} max={wohnungMax} />
        <StatSpanne label="Haus, €/m²" min={hausMin} max={hausMax} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SecondaryStat
          label="Bodenwert, kein Objektpreis"
          value={`${nf.format(ort.bodenrichtwert)} €/m²`}
          tooltipId={`tt-boden-${ort.slug}`}
          tooltip="Amtlicher Bodenrichtwert je m² Grundstücksfläche — keine Verkehrswertermittlung nach § 194 BauGB."
        />
        <SecondaryStat label="Rendite" value={`${fmtPct(ort.yieldPct)} %`} />
        <SecondaryStat label="Ø Vermarktungszeit" value={`${ort.vermarktungszeitTage} Tage`} />
      </div>

      <Sparkline points={ort.trend12} trendYoyPct={ort.trendYoyPct} />

      <p className="border-t border-border pt-4 text-xs text-faint">
        Stand {MARKT_STAND} · {PREIS_DISCLAIMER}
      </p>
    </div>
  );
}

function StatSpanne({ label, min, max }: { label: string; min: number; max: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-5 transition-[transform,border-color] duration-500 hover:-translate-y-0.5 hover:border-accent/40">
      <div className="text-xs uppercase tracking-widest text-faint">{label}</div>
      <div className="mt-2 flex items-baseline gap-2 text-2xl font-semibold text-fg tabular-nums sm:text-3xl">
        <span>{nf.format(min)}</span>
        <span className="text-base font-normal text-faint">–</span>
        <span>{nf.format(max)}</span>
      </div>
    </div>
  );
}

function SecondaryStat({
  label,
  value,
  tooltip,
  tooltipId,
}: {
  label: string;
  value: string;
  tooltip?: string;
  tooltipId?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-5 transition-[transform,border-color] duration-500 hover:-translate-y-0.5 hover:border-accent/40">
      <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-widest text-faint">
        <span>{label}</span>
        {tooltip && tooltipId && (
          <span className="t-tt-wrap">
            {/* -m-3/p-3 vergrößert die Trefffläche auf ~40px ohne den 12px-Icon-Look zu verändern. */}
            <button
              type="button"
              className="t-tt-trigger press -m-3 flex items-center justify-center rounded-full p-3 text-faint outline-none transition-colors hover:text-fg"
              aria-describedby={tooltipId}
            >
              <Icon name="doc" size={12} />
              <span className="sr-only">Hinweis</span>
            </button>
            <span className="t-tt" id={tooltipId} role="tooltip">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="mt-1.5 text-base text-fg tabular-nums">
        <span key={value} className="t-num-d">
          {value}
        </span>
      </div>
    </div>
  );
}

function Sparkline({ points, trendYoyPct }: { points: number[]; trendYoyPct: number }) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const [drawn, setDrawn] = useState(false);

  const W = 220;
  const H = 56;
  const PAD = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(0.1, max - min);
  const coords = points.map((v, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / span) * (H - PAD * 2);
    return [x, y] as const;
  });
  const pointsAttr = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];

  // Draw-in: dasharray/-offset auf die reale Pfadlänge (kein fester Platzhalter),
  // Reflow zwischen "unsichtbar setzen" und "auf 0 animieren" nötig zum Neustarten.
  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    setDrawn(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = Math.ceil(line.getTotalLength()) + 1;
    line.style.transition = "none";
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
    void line.getBoundingClientRect(); // Reflow erzwingen — sonst spielt die Animation nicht neu
    line.style.transition = reduce ? "none" : "stroke-dashoffset var(--duration-very-slow) var(--ease-smooth-out)";
    line.style.strokeDashoffset = "0";
    // Kreis-Pop erst NACH der Linie: Dauer aus dem Token lesen statt hart zu
    // codieren, sonst driftet der Timeout bei künftigen Token-Änderungen ab.
    // setDrawn() läuft im Callback (nicht synchron im Effect-Body) — bei
    // reduced-motion mit Verzögerung 0 im selben Tick wie das direkte Setzen.
    const tokenDur = parseFloat(getComputedStyle(line).getPropertyValue("--duration-very-slow"));
    const t = setTimeout(() => setDrawn(true), reduce ? 0 : Number.isFinite(tokenDur) ? tokenDur : 500);
    return () => clearTimeout(t);
  }, [points]);

  const positive = trendYoyPct >= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-faint">Preistrend, 12 Monate</span>
        {/* Keine Rot/Grün-Semantik — die Marke kennt nur EINEN Akzent (accent);
            negativer Trend fällt bewusst auf neutrales muted/border zurück. */}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${
            // text-accent-strong statt text-accent: reines Akzent-Blau liegt bei
            // dieser Textgröße auf Surface/BG unter dem WCAG-AA-Minimum 4,5:1.
            positive ? "border-accent/40 text-accent-strong" : "border-border text-muted"
          }`}
        >
          <Icon name="trend" size={12} className={positive ? "" : "rotate-180"} />
          {positive ? "+" : ""}
          {fmtPct(trendYoyPct)} %
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible" aria-hidden>
        <polyline
          ref={lineRef}
          points={pointsAttr}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={last[0]}
          cy={last[1]}
          r={drawn ? 3 : 0}
          fill="var(--color-accent)"
          style={{ transition: "r var(--duration-fast) var(--ease-smooth-out)" }}
        />
      </svg>
    </div>
  );
}

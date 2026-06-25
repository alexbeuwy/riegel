"use client";

import { useEffect, useRef, useState } from "react";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { formatEUR } from "@/lib/format";
import {
  estimateValue,
  AUSSTATTUNG_OPTIONEN,
  RECHNER_ORTE,
  type Objektart,
  type ValuationInput,
  type ValuationResult,
  type Zustand,
} from "@/lib/valuation";

type Phase = "form" | "analyzing" | "result";

interface FormState {
  objektart: Objektart;
  ort: string;
  plz: string;
  wohnflaeche: string;
  grundflaeche: string;
  zimmer: string;
  baujahr: string;
  zustand: Zustand;
  ausstattung: string[];
  name: string;
  email: string;
  telefon: string;
  consent: boolean;
}

const EMPTY: FormState = {
  objektart: "wohnung",
  ort: "",
  plz: "",
  wohnflaeche: "",
  grundflaeche: "",
  zimmer: "",
  baujahr: "",
  zustand: "gepflegt",
  ausstattung: [],
  name: "",
  email: "",
  telefon: "",
  consent: false,
};

const OBJEKTARTEN: { key: Objektart; label: string; icon: React.ReactNode }[] = [
  { key: "wohnung", label: "Wohnung", icon: <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /> },
  { key: "haus", label: "Haus", icon: <path d="M3 11.5 12 4l9 7.5M5 10v11h14V10M10 21v-6h4v6" /> },
  { key: "grundstueck", label: "Grundstück", icon: <path d="M3 20h18M5 20V9l7-4 7 4v11M9 20v-4h2v4" /> },
];

const SOURCES: { label: string; value: (r: ValuationResult, f: FormState) => string }[] = [
  { label: "Amtliche Bodenrichtwerte (BORIS)", value: (r) => `${r.bodenrichtwert} €/m²` },
  { label: "Vergleichsobjekte der Region", value: (r) => `${r.comparables} Objekte` },
  { label: "Marktpreis-Index (12 Monate)", value: (r) => `+${r.trendPct} % p.a.` },
  { label: "Mikrolage- & Infrastruktur-Score", value: (r) => `${r.mikrolage}/10` },
  { label: "Angebot/Nachfrage-Verhältnis", value: () => "hohe Nachfrage" },
  { label: "Baujahr- & Zustandsbewertung", value: (_r, f) => f.zustand },
  { label: "Ausstattungs- & Energiebonus", value: (r) => `+${r.ausstattungBonusPct} %` },
  { label: "Eigene Transaktionsdatenbank", value: (r) => `${Math.round(r.comparables * 0.6)} Datensätze` },
];

function useCountUp(target: number, run: boolean, dur = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, dur]);
  return val;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

export function Calculator() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [revealed, setRevealed] = useState(0);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const toggleAusst = (a: string) =>
    setF((s) => ({
      ...s,
      ausstattung: s.ausstattung.includes(a)
        ? s.ausstattung.filter((x) => x !== a)
        : [...s.ausstattung, a],
    }));

  function validateStep(s: number): string | null {
    if (s === 0 && !f.ort) return "Bitte einen Ort wählen.";
    if (s === 1) {
      if (f.objektart === "grundstueck" && !f.grundflaeche) return "Bitte die Grundstücksfläche angeben.";
      if (f.objektart !== "grundstueck" && !f.wohnflaeche) return "Bitte die Wohnfläche angeben.";
    }
    if (s === 2) {
      if (!f.name) return "Bitte Ihren Namen angeben.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return "Bitte eine gültige E-Mail angeben.";
      if (!f.consent) return "Bitte der Verarbeitung zustimmen.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < 2) {
      setStep(step + 1);
    } else {
      startAnalysis();
    }
  }

  function startAnalysis() {
    const input: ValuationInput = {
      objektart: f.objektart,
      ort: f.ort,
      plz: f.plz || undefined,
      wohnflaeche: f.wohnflaeche ? Number(f.wohnflaeche) : undefined,
      grundflaeche: f.grundflaeche ? Number(f.grundflaeche) : undefined,
      zimmer: f.zimmer ? Number(f.zimmer) : undefined,
      baujahr: f.baujahr ? Number(f.baujahr) : undefined,
      zustand: f.zustand,
      ausstattung: f.ausstattung,
    };
    setResult(estimateValue(input));
    setRevealed(0);
    setPhase("analyzing");
  }

  // Analyse-Sequenz: Quellen nacheinander „einlesen"
  useEffect(() => {
    if (phase !== "analyzing") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduce ? 120 : 620;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < SOURCES.length) timers.push(setTimeout(tick, stepMs));
      else timers.push(setTimeout(() => setPhase("result"), reduce ? 200 : 850));
    };
    timers.push(setTimeout(tick, reduce ? 100 : 450));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  function reset() {
    setF(EMPTY);
    setStep(0);
    setResult(null);
    setError(null);
    setPhase("form");
  }

  if (phase === "analyzing") return <Analyzing f={f} result={result} revealed={revealed} />;
  if (phase === "result" && result) return <Result f={f} result={result} onReset={reset} />;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Fortschritt */}
      <div className="mb-8 flex items-center gap-3">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
                s <= step ? "border-accent bg-accent text-on-accent" : "border-border text-muted"
              }`}
            >
              {s + 1}
            </div>
            {s < 2 && (
              <div className={`h-px flex-1 ${s < step ? "bg-accent" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Was möchten Sie bewerten?</h2>
            <div className="grid grid-cols-3 gap-3">
              {OBJEKTARTEN.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => set("objektart", o.key)}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-colors ${
                    f.objektart === o.key ? "border-accent bg-surface-2" : "border-border hover:border-accent/50"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" className={f.objektart === o.key ? "text-accent" : "text-muted"}>
                    {o.icon}
                  </svg>
                  <span className="text-sm text-fg">{o.label}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ort">
                <select className={inputCls} value={f.ort} onChange={(e) => set("ort", e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {RECHNER_ORTE.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="PLZ (optional)">
                <input className={inputCls} inputMode="numeric" value={f.plz} onChange={(e) => set("plz", e.target.value)} placeholder="z. B. 67346" />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Eckdaten der Immobilie</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {f.objektart !== "grundstueck" && (
                <Field label="Wohnfläche (m²)">
                  <input className={inputCls} inputMode="numeric" value={f.wohnflaeche} onChange={(e) => set("wohnflaeche", e.target.value)} placeholder="z. B. 120" />
                </Field>
              )}
              {f.objektart !== "wohnung" && (
                <Field label="Grundstücksfläche (m²)">
                  <input className={inputCls} inputMode="numeric" value={f.grundflaeche} onChange={(e) => set("grundflaeche", e.target.value)} placeholder="z. B. 450" />
                </Field>
              )}
              {f.objektart !== "grundstueck" && (
                <>
                  <Field label="Zimmer">
                    <input className={inputCls} inputMode="numeric" value={f.zimmer} onChange={(e) => set("zimmer", e.target.value)} placeholder="z. B. 4" />
                  </Field>
                  <Field label="Baujahr">
                    <input className={inputCls} inputMode="numeric" value={f.baujahr} onChange={(e) => set("baujahr", e.target.value)} placeholder="z. B. 1998" />
                  </Field>
                  <Field label="Zustand">
                    <select className={inputCls} value={f.zustand} onChange={(e) => set("zustand", e.target.value as Zustand)}>
                      <option value="neuwertig">Neuwertig / saniert</option>
                      <option value="gepflegt">Gepflegt</option>
                      <option value="renovierungsbeduerftig">Renovierungsbedürftig</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
            {f.objektart !== "grundstueck" && (
              <div className="space-y-3">
                <span className="text-sm text-muted">Ausstattung</span>
                <div className="flex flex-wrap gap-2">
                  {AUSSTATTUNG_OPTIONEN.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAusst(a)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        f.ausstattung.includes(a) ? "border-accent text-accent" : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Wohin dürfen wir das Ergebnis senden?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Vor- und Nachname" />
              </Field>
              <Field label="E-Mail">
                <input className={inputCls} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@beispiel.de" />
              </Field>
              <Field label="Telefon (optional)">
                <input className={inputCls} value={f.telefon} onChange={(e) => set("telefon", e.target.value)} placeholder="Für Rückfragen" />
              </Field>
            </div>
            <label className="flex items-start gap-3 text-sm text-muted">
              <input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span>
                Ich willige ein, dass Riegel Immobilien meine Angaben zur Erstellung der
                Bewertung verarbeitet und mich kontaktiert. Die Einwilligung ist jederzeit
                widerrufbar.
              </span>
            </label>
          </div>
        )}

        {error && <p className="mt-5 text-sm text-accent">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className="text-sm text-muted hover:text-fg">
              Zurück
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
          >
            {step < 2 ? "Weiter" : "Bewertung starten"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Analyzing({ f, result, revealed }: { f: FormState; result: ValuationResult | null; revealed: number }) {
  const pct = Math.round((revealed / SOURCES.length) * 100);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <HeroBackdrop />
      <div className="relative z-10 mx-auto max-w-xl px-6 py-16 text-center">
        <div className="text-sm uppercase tracking-[0.25em] text-accent">Analyse läuft</div>
        <h2 className="mt-3 text-2xl font-semibold">Wir bewerten Ihre Immobilie in {f.ort}</h2>
        <p className="mt-2 text-muted">Daten werden aus mehreren Quellen zusammengeführt …</p>

        <div className="mt-8 space-y-2 text-left">
          {SOURCES.map((s, i) => {
            const done = i < revealed;
            const active = i === revealed;
            return (
              <div
                key={s.label}
                className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-all duration-500 ${
                  done ? "border-border bg-surface/70 opacity-100" : active ? "border-accent/40 bg-surface/40 opacity-100" : "border-transparent opacity-40"
                }`}
              >
                <span className="flex items-center gap-3 text-sm">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${done ? "bg-accent text-on-accent" : "border border-border text-muted"}`}>
                    {done ? "✓" : active ? "…" : ""}
                  </span>
                  <span className={done ? "text-fg" : "text-muted"}>{s.label}</span>
                </span>
                {done && result && <span className="text-sm text-accent">{s.value(result, f)}</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-faint">{pct}% — {revealed}/{SOURCES.length} Quellen ausgewertet</div>
      </div>
    </div>
  );
}

function Result({ f, result, onReset }: { f: FormState; result: ValuationResult; onReset: () => void }) {
  const mid = useCountUp(result.mid, true);
  const rangePos =
    result.high > result.low ? ((result.mid - result.low) / (result.high - result.low)) * 100 : 50;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <HeroBackdrop />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-14">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.25em] text-accent">Geschätzter Marktwert</div>
          <div className="mt-3 akira text-4xl text-fg sm:text-6xl">{formatEUR(mid)}</div>
          <div className="mt-3 text-muted">
            Spanne {formatEUR(result.low)} – {formatEUR(result.high)}
          </div>
          {/* Range-Bar */}
          <div className="relative mx-auto mt-6 h-2 max-w-md rounded-full bg-surface-2">
            <div className="absolute inset-y-0 left-[8%] right-[8%] rounded-full bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
            <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent" style={{ left: `${8 + (rangePos * 0.84)}%` }} />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { k: "Preis / m²", v: `${formatEUR(result.pricePerSqm)}` },
            { k: "Vergleichsobjekte", v: `${result.comparables}` },
            { k: "Markttrend", v: `+${result.trendPct} %` },
            { k: "Konfidenz", v: `${result.confidence} %` },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="text-xs uppercase tracking-widest text-faint">{s.k}</div>
              <div className="mt-1 text-lg text-fg">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-accent/30 bg-surface p-6 text-center">
          <h3 className="text-lg font-semibold">Danke, {f.name.split(" ")[0] || "und bis gleich"}!</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Diese Sofort-Einschätzung tendiert bewusst zur oberen Marktspanne. Für einen
            belastbaren Verkaufspreis erstellt Ihnen Riegel Immobilien eine kostenlose,
            ausführliche Bewertung — wir melden uns bei Ihnen.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="/kontakt" className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
              Ausführliche Bewertung anfordern
            </a>
            <button type="button" onClick={onReset} className="rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              Neue Bewertung
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Unverbindliche, datenbasierte Schätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
        </p>
      </div>
    </div>
  );
}

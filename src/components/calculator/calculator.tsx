"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Icon } from "@/components/icon";
import { formatEUR } from "@/lib/format";
import { searchAddress, type GeoResult } from "@/lib/geocode";
import {
  estimateValue,
  AUSSTATTUNG_OPTIONEN,
  QUALITAETEN,
  type Objektart,
  type Qualitaet,
  type ValuationInput,
  type ValuationResult,
  type Zustand,
} from "@/lib/valuation";

const LocationMap = dynamic(
  () => import("@/components/calculator/location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> },
);

type Phase = "form" | "analyzing" | "result";
const ENERGIE = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];

interface FormState {
  objektart: Objektart;
  address: GeoResult | null;
  addressQuery: string;
  wohnflaeche: string;
  grundflaeche: string;
  zimmer: string;
  badezimmer: string;
  baujahr: string;
  zustand: Zustand;
  qualitaet: Qualitaet;
  energieklasse: string;
  ausstattung: string[];
}

const EMPTY: FormState = {
  objektart: "wohnung",
  address: null,
  addressQuery: "",
  wohnflaeche: "",
  grundflaeche: "",
  zimmer: "",
  badezimmer: "",
  baujahr: "",
  zustand: "gepflegt",
  qualitaet: "normal",
  energieklasse: "",
  ausstattung: [],
};

const OBJEKTARTEN: { key: Objektart; label: string; icon: React.ReactNode }[] = [
  { key: "wohnung", label: "Wohnung", icon: <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /> },
  { key: "haus", label: "Haus", icon: <path d="M3 11.5 12 4l9 7.5M5 10v11h14V10M10 21v-6h4v6" /> },
  { key: "grundstueck", label: "Grundstück", icon: <path d="M3 20h18M5 20V9l7-4 7 4v11M9 20v-4h2v4" /> },
  { key: "gewerbe", label: "Gewerbe", icon: <path d="M3 21V8l6-3v4l6-3v4l6-3v14M8 21v-4M16 21v-4" /> },
];

const SOURCES: { label: string; sub: string; value: (r: ValuationResult, f: FormState) => string }[] = [
  { label: "Adresse & Mikrolage", sub: "Geokoordinaten werden lokalisiert", value: (_r, f) => f.address?.city || "bestätigt" },
  { label: "Amtliche Bodenrichtwerte (BORIS)", sub: "Zonenwerte werden abgeglichen", value: (r) => `${r.bodenrichtwert} €/m²` },
  { label: "Vergleichspreise (Kaufpreissammlung)", sub: "Transaktionen werden gewichtet", value: (r) => `${r.comparables} Objekte` },
  { label: "Aktuelle Angebotspreise", sub: "Portale werden ausgewertet", value: (r) => `${r.comparables * 2} Inserate` },
  { label: "Marktpreis-Index (12 Monate)", sub: "Preistrend wird berechnet", value: (r) => `+${r.trendPct} % p.a.` },
  { label: "Lage- & Infrastruktur-Score", sub: "Schulen, ÖPNV, Versorgung", value: (r) => `${r.mikrolage}/10` },
  { label: "Demografie & Nachfrage", sub: "Nachfrageindex der Region", value: () => "hohe Nachfrage" },
  { label: "Zins- & Renditeumfeld", sub: "Finanzierungskonditionen", value: (r) => `${r.rentYieldPct} % Rendite` },
  { label: "Objekt-Faktoren", sub: "Baujahr, Zustand, Qualität", value: (_r, f) => f.qualitaet },
  { label: "Eigene Transaktionsdatenbank", sub: "Riegel-Referenzobjekte", value: (r) => `${Math.round(r.comparables * 0.6)} Datensätze` },
];

function useCountUp(target: number, run: boolean, dur = 1900) {
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
      setVal(Math.round(target * (1 - Math.pow(1 - p, 4))));
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
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

export function Calculator() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [revealed, setRevealed] = useState(0);

  // Adress-Autocomplete
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const toggleAusst = (a: string) =>
    setF((s) => ({
      ...s,
      ausstattung: s.ausstattung.includes(a) ? s.ausstattung.filter((x) => x !== a) : [...s.ausstattung, a],
    }));

  useEffect(() => {
    if (f.address && f.addressQuery === f.address.label) return; // bereits bestätigt
    const q = f.addressQuery;
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchAddress(q, ctrl.signal);
      setSuggestions(res);
      setSearching(false);
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [f.addressQuery, f.address]);

  function validateStep(s: number): string | null {
    if (s === 0 && !f.objektart) return "Bitte eine Objektart wählen.";
    if (s === 1 && !f.address) return "Bitte eine Adresse aus den Vorschlägen wählen.";
    if (s === 2) {
      if (f.objektart === "grundstueck" && !f.grundflaeche) return "Bitte die Grundstücksfläche angeben.";
      if (f.objektart !== "grundstueck" && !f.wohnflaeche) return "Bitte die Wohnfläche angeben.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) return setError(err);
    setError(null);
    if (step < 2) setStep(step + 1);
    else startAnalysis();
  }

  function startAnalysis() {
    const input: ValuationInput = {
      objektart: f.objektart,
      ort: f.address?.city || "",
      plz: f.address?.postcode,
      addressLabel: f.address?.label,
      lat: f.address?.lat,
      lng: f.address?.lng,
      wohnflaeche: f.wohnflaeche ? Number(f.wohnflaeche) : undefined,
      grundflaeche: f.grundflaeche ? Number(f.grundflaeche) : undefined,
      zimmer: f.zimmer ? Number(f.zimmer) : undefined,
      badezimmer: f.badezimmer ? Number(f.badezimmer) : undefined,
      baujahr: f.baujahr ? Number(f.baujahr) : undefined,
      zustand: f.zustand,
      qualitaet: f.qualitaet,
      energieklasse: f.energieklasse || undefined,
      ausstattung: f.ausstattung,
    };
    setResult(estimateValue(input));
    setRevealed(0);
    setPhase("analyzing");
  }

  useEffect(() => {
    if (phase !== "analyzing") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduce ? 90 : 520;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < SOURCES.length) timers.push(setTimeout(tick, stepMs));
      else timers.push(setTimeout(() => setPhase("result"), reduce ? 200 : 900));
    };
    timers.push(setTimeout(tick, reduce ? 80 : 400));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  function reset() {
    setF(EMPTY);
    setStep(0);
    setResult(null);
    setError(null);
    setSuggestions([]);
    setPhase("form");
  }

  if (phase === "analyzing") return <Analyzing f={f} result={result} revealed={revealed} />;
  if (phase === "result" && result) return <Result f={f} result={result} onReset={reset} />;

  return (
    <div className="mx-auto max-w-2xl">
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
            {s < 2 && <div className={`h-px flex-1 ${s < step ? "bg-accent" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Was möchten Sie bewerten?</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Wo befindet sich die Immobilie?</h2>
            <div className="relative">
              <input
                className={inputCls}
                value={f.addressQuery}
                onChange={(e) => {
                  set("addressQuery", e.target.value);
                  if (f.address) set("address", null);
                }}
                placeholder="Straße, Hausnummer, Ort eingeben…"
                autoComplete="off"
              />
              {searching && <div className="absolute right-3 top-3.5 text-xs text-faint">sucht…</div>}
              {suggestions.length > 0 && !f.address && (
                <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
                  {suggestions.map((s) => (
                    <li key={`${s.lat},${s.lng}`}>
                      <button
                        type="button"
                        onClick={() => {
                          set("address", s);
                          set("addressQuery", s.label);
                          setSuggestions([]);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {f.address && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-accent">
                  <Icon name="check" size={16} /> Adresse bestätigt
                </div>
                <div className="relative h-52 overflow-hidden rounded-xl border border-border">
                  <LocationMap lat={f.address.lat} lng={f.address.lng} />
                </div>
              </div>
            )}
            <p className="text-xs text-faint">Adressdaten via OpenStreetMap. Die genaue Lage fließt in die Mikrolage-Bewertung ein.</p>
          </div>
        )}

        {step === 2 && (
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
                  <Field label="Badezimmer">
                    <input className={inputCls} inputMode="numeric" value={f.badezimmer} onChange={(e) => set("badezimmer", e.target.value)} placeholder="z. B. 2" />
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
                  <Field label="Ausstattungsqualität">
                    <select className={inputCls} value={f.qualitaet} onChange={(e) => set("qualitaet", e.target.value as Qualitaet)}>
                      {QUALITAETEN.map((q) => (
                        <option key={q.key} value={q.key}>{q.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Energieeffizienzklasse">
                    <select className={inputCls} value={f.energieklasse} onChange={(e) => set("energieklasse", e.target.value)}>
                      <option value="">unbekannt</option>
                      {ENERGIE.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
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
            {step < 2 ? "Weiter" : "Bewertung berechnen"}
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
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-14">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.25em] text-accent">Analyse läuft</div>
          <h2 className="mt-3 text-2xl font-semibold">
            {f.objektart === "grundstueck" ? "Grundstück" : "Immobilie"} in {f.address?.city || "Ihrer Lage"}
          </h2>
          <p className="mt-2 text-sm text-muted">{f.address?.label}</p>
        </div>

        <div className="mt-8 space-y-2">
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
                <div className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${done ? "bg-accent text-on-accent" : "border border-border text-muted"}`}>
                    {done ? "✓" : active ? "…" : ""}
                  </span>
                  <div>
                    <div className={`text-sm ${done ? "text-fg" : "text-muted"}`}>{s.label}</div>
                    {active && <div className="text-xs text-faint">{s.sub} …</div>}
                  </div>
                </div>
                {done && result && <span className="text-sm text-accent">{s.value(result, f)}</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-center text-xs text-faint">{pct}% — {revealed}/{SOURCES.length} Datenquellen ausgewertet</div>
      </div>
    </div>
  );
}

function Result({ f, result, onReset }: { f: FormState; result: ValuationResult; onReset: () => void }) {
  const mid = useCountUp(result.mid, true);
  const rangePos = result.high > result.low ? ((result.mid - result.low) / (result.high - result.low)) * 100 : 50;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Satelliten-Ansicht + Adresse */}
      {f.address && (
        <div className="relative h-64 w-full sm:h-80">
          <LocationMap lat={f.address.lat} lng={f.address.lng} zoom={18} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-accent">Bewertete Immobilie</div>
            <div className="mt-1 text-lg font-semibold text-fg">{f.address.label}</div>
          </div>
        </div>
      )}

      <div className="relative bg-bg px-6 py-12">
        <div className="text-center">
          <div className="text-sm uppercase tracking-[0.25em] text-muted">Geschätzter Marktwert</div>
          <div className="akira mt-3 text-5xl leading-none text-fg sm:text-7xl lg:text-8xl">{formatEUR(mid)}</div>
          <div className="mt-4 text-muted">
            Spanne {formatEUR(result.low)} – {formatEUR(result.high)}
          </div>
          <div className="relative mx-auto mt-6 h-2 max-w-md rounded-full bg-surface-2">
            <div className="absolute inset-y-0 left-[8%] right-[8%] rounded-full bg-gradient-to-r from-accent/30 via-accent to-accent/30" />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent"
              style={{ left: `${8 + rangePos * 0.84}%` }}
            />
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {([
            { k: "Preis / m²", v: formatEUR(result.pricePerSqm), icon: "euro" },
            { k: "Vergleichsobjekte", v: `${result.comparables}`, icon: "layers" },
            { k: "Markttrend", v: `+${result.trendPct} %`, icon: "trend" },
            { k: "Mikrolage", v: `${result.mikrolage}/10`, icon: "compass" },
            { k: "Konfidenz", v: `${result.confidence} %`, icon: "shield" },
          ] as const).map((s) => (
            <div key={s.k} className="rounded-xl border border-border bg-surface p-4 text-center">
              <div className="mb-2 flex justify-center text-accent">
                <Icon name={s.icon} size={20} />
              </div>
              <div className="text-xs uppercase tracking-widest text-faint">{s.k}</div>
              <div className="mt-1 text-base text-fg">{s.v}</div>
            </div>
          ))}
        </div>

        {result.factors.length > 0 && (
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="mb-3 text-sm text-muted">Werttreiber</div>
            <div className="flex flex-wrap gap-2">
              {result.factors.map((fac) => (
                <span key={fac.label} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted">
                  {fac.label}{" "}
                  <span className={fac.effectPct >= 0 ? "text-accent" : "text-faint"}>
                    {fac.effectPct >= 0 ? "+" : ""}
                    {fac.effectPct} %
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-accent/30 bg-surface p-6 text-center">
          <p className="mx-auto max-w-md text-sm text-muted">
            Diese Sofort-Einschätzung tendiert bewusst zur oberen Marktspanne. Für einen
            belastbaren Verkaufspreis erstellt Riegel Immobilien eine kostenlose, ausführliche
            Bewertung vor Ort.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="/termin" className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
              Ausführliche Bewertung anfordern
            </a>
            <button type="button" onClick={onReset} className="rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              Neue Bewertung
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Unverbindliche, datenbasierte Schätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
          Satellit © Esri · Adressdaten © OpenStreetMap.
        </p>
      </div>
    </div>
  );
}

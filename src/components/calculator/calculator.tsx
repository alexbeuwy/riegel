"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Icon, type IconName } from "@/components/icon";
import { MapConsentGate } from "@/components/consent";
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
import { marktortByOrt, type MarktOrt } from "@/lib/marktdaten";
// Nur der Typ — der Client ruft NIE lib/boris.ts direkt, sondern immer den
// Server-Proxy /api/bodenrichtwert (s. u.). Type-only Import fällt beim
// Build komplett weg, zieht also kein Server-Modul ins Client-Bundle.
import type { Bodenrichtwert } from "@/lib/boris";
import { ReportRequest } from "@/components/calculator/report-request";

const LocationMap = dynamic(
  () => import("@/components/calculator/location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> },
);

type Phase = "form" | "analyzing" | "result";
const ENERGIE = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];
const STEP_LABELS = ["Objektart", "Standort", "Eckdaten"];

/** Ladezustand der amtlichen Bodenrichtwert-Abfrage (/api/bodenrichtwert). */
interface BorisState {
  loading: boolean;
  data: Bodenrichtwert | null;
  attribution: string | null;
}
const BORIS_EMPTY: BorisState = { loading: false, data: null, attribution: null };

const nfDE = new Intl.NumberFormat("de-DE");

/** Textstufe der Nachfrage aus dem 1–10-Score in marktdaten.ts. */
function nachfrageLabel(score: number): string {
  if (score >= 8) return "sehr hohe Nachfrage";
  if (score >= 6) return "hohe Nachfrage";
  if (score >= 4) return "moderate Nachfrage";
  return "verhaltene Nachfrage";
}

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
  /** Nur für objektart === "mehrfamilienhaus" — Ertragswert-Eingaben. */
  jahresnettokaltmiete: string;
  wohneinheiten: string;
  gewerbeeinheiten: string;
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
  jahresnettokaltmiete: "",
  wohneinheiten: "",
  gewerbeeinheiten: "",
};

// "building"-Icon aus components/icon.tsx (Pfaddaten 1:1 übernommen, keine
// neue Glyph erfunden) — dieser Auswahl-Button rendert sein <svg> selbst
// (eigene Strichstärke 1.25 für die größere Kachel), daher kein <Icon />.
const OBJEKTARTEN: { key: Objektart; label: string; icon: React.ReactNode }[] = [
  { key: "wohnung", label: "Wohnung", icon: <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /> },
  { key: "haus", label: "Haus", icon: <path d="M3 11.5 12 4l9 7.5M5 10v11h14V10M10 21v-6h4v6" /> },
  {
    key: "mehrfamilienhaus",
    label: "Mehrfamilienhaus",
    icon: (
      <>
        <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M3 21h18" />
        <path d="M7.5 8h3M7.5 12h3M7.5 16h3" />
      </>
    ),
  },
  { key: "grundstueck", label: "Grundstück", icon: <path d="M3 20h18M5 20V9l7-4 7 4v11M9 20v-4h2v4" /> },
  { key: "gewerbe", label: "Gewerbe", icon: <path d="M3 21V8l6-3v4l6-3v4l6-3v14M8 21v-4M16 21v-4" /> },
];

/**
 * Zusatz-Kontext für die SOURCES-Zeilen: amtlicher BORIS-Ladezustand +
 * passender Marktort (falls die eingegebene Stadt einen unserer
 * Preisatlas-Standorte trifft — s. marktortByOrt in lib/marktdaten.ts).
 * Ohne Treffer/Daten fällt jede Zeile auf ihr bisheriges Verhalten zurück.
 */
interface SourceCtx {
  boris: BorisState;
  markt?: MarktOrt;
}

/** Bodenrichtwert fließt nur bei Grundstück (voll) und Haus (Grundstücksanteil)
 * tatsächlich in mid/pricePerSqm ein (s. estimateValue in lib/valuation.ts) —
 * bei Wohnung/Gewerbe/Mehrfamilienhaus (Ertragswert-Ansatz, mietbasiert) ist
 * er rein informativ, der "amtlich"-Badge muss das kennzeichnen statt
 * fälschlich einen Preiseinfluss zu suggerieren. */
function borisPriceRelevant(objektart: Objektart): boolean {
  return objektart === "grundstueck" || objektart === "haus";
}

const SOURCES: { label: string; sub: string; value: (r: ValuationResult, f: FormState, ctx: SourceCtx) => React.ReactNode }[] = [
  { label: "Adresse & Mikrolage", sub: "Geokoordinaten werden lokalisiert", value: (_r, f) => f.address?.city || "bestätigt" },
  {
    label: "Amtliche Bodenrichtwerte (BORIS)",
    sub: "Zonenwerte werden abgeglichen",
    value: (r, f, ctx) => {
      const b = ctx.boris.data;
      if (!b) return `${r.bodenrichtwert} €/m²`;
      // .t-num-d ist unlayered CSS und überschreibt `display` von Flex-Utilities
      // (s. Kommentar bei .t-success-check) — daher nur auf den Text-Span,
      // nicht auf den Flex-Wrapper, der Text + Badge nebeneinander hält.
      return (
        <span className="inline-flex items-center gap-1.5">
          <span key={`${b.brw}-${b.zone}`} className="t-num-d">
            {`${b.brw} €/m²${b.zone ? ` · Zone ${b.zone}` : ""}`}
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            {borisPriceRelevant(f.objektart) ? "amtlich" : "amtlich · informativ"}
          </span>
        </span>
      );
    },
  },
  {
    label: "Vergleichspreise (Kaufpreissammlung)",
    sub: "Transaktionen werden gewichtet",
    // Bei Treffer: reale Preisspanne des Marktorts (Wohnung/Haus) statt der
    // zufälligen Objektzahl aus dem Ergebnis.
    value: (r, f, ctx) => {
      // Mehrfamilienhaus ist ein Ertragswert-Objekt — die Wohnungs-€/m²-Spanne
      // des Marktorts passt fachlich nicht als "Vergleichspreis" für ein
      // ganzes Zinshaus, daher hier auf den Vervielfältiger verweisen.
      if (f.objektart === "mehrfamilienhaus") {
        return r.vervielfaeltiger != null ? `${r.vervielfaeltiger}× Jahresmiete` : `${r.comparables} Objekte`;
      }
      const m = ctx.markt;
      if (!m) return `${r.comparables} Objekte`;
      const spanne = f.objektart === "haus" ? m.haus : m.wohnung;
      return `${nfDE.format(spanne.min)}–${nfDE.format(spanne.max)} €/m²`;
    },
  },
  { label: "Aktuelle Angebotspreise", sub: "Portale werden ausgewertet", value: (r) => `${r.comparables * 2} Inserate` },
  {
    label: "Marktpreis-Index (12 Monate)",
    sub: "Preistrend wird berechnet",
    value: (r, _f, ctx) => `+${ctx.markt ? ctx.markt.trendYoyPct : r.trendPct} % p.a.`,
  },
  {
    label: "Lage- & Infrastruktur-Score",
    sub: "Schulen, ÖPNV, Versorgung",
    // marktdaten führt keinen eigenen Mikrolage-Wert — der Nachfrage-Score
    // (1–10, ebenfalls lage-getrieben) ist der nächstliegende Stellvertreter.
    value: (r, _f, ctx) => `${ctx.markt ? ctx.markt.nachfrage : r.mikrolage}/10`,
  },
  {
    label: "Demografie & Nachfrage",
    sub: "Nachfrageindex der Region",
    value: (_r, _f, ctx) => (ctx.markt ? nachfrageLabel(ctx.markt.nachfrage) : "hohe Nachfrage"),
  },
  { label: "Zins- & Renditeumfeld", sub: "Finanzierungskonditionen", value: (r) => `${r.rentYieldPct} % Rendite` },
  { label: "Objekt-Faktoren", sub: "Baujahr, Zustand, Qualität", value: (_r, f) => f.qualitaet },
  { label: "Eigene Transaktionsdatenbank", sub: "Riegel-Referenzobjekte", value: (r) => `${Math.round(r.comparables * 0.6)} Datensätze` },
];

/**
 * Kennzahlen-Kacheln im Ergebnis — pricePerSqm ist bei Mehrfamilienhäusern
 * optional (Ertragswert hat keinen zwingenden €/m²-Bezug, s. valuation.ts),
 * daher hier "–" statt "NaN €" bei fehlendem Wert. Der Vervielfältiger wird
 * nur angezeigt, wenn estimateValue ihn geliefert hat (Ertragswert-Fälle).
 */
function statTiles(result: ValuationResult): { k: string; v: string; icon: IconName }[] {
  const tiles: { k: string; v: string; icon: IconName }[] = [
    { k: "Preis / m²", v: result.pricePerSqm != null ? formatEUR(result.pricePerSqm) : "–", icon: "euro" },
    { k: "Vergleichsobjekte", v: `${result.comparables}`, icon: "layers" },
    { k: "Markttrend", v: `+${result.trendPct} %`, icon: "trend" },
    { k: "Mikrolage", v: `${result.mikrolage}/10`, icon: "compass" },
    { k: "Konfidenz", v: `${result.confidence} %`, icon: "shield" },
  ];
  if (result.vervielfaeltiger != null) {
    tiles.push({ k: "Vervielfältiger", v: `${result.vervielfaeltiger}×`, icon: "calculator" });
  }
  return tiles;
}

function useCountUp(target: number, run: boolean, dur = 1900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sofort-Endwert bei reduced-motion, einmalig, kein Cascading-Render (Präzedenz: modal.tsx)
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
  const [errorNonce, setErrorNonce] = useState(0);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [boris, setBoris] = useState<BorisState>(BORIS_EMPTY);
  // Läuft parallel zur Analyzing-Animation; bei Unmount/Reset/neuer Analyse
  // wird die jeweils vorherige Abfrage abgebrochen.
  const borisAbort = useRef<AbortController | null>(null);
  // Für den Override-Merge, sobald der amtliche Wert eintrifft (s. u.).
  const lastInputRef = useRef<ValuationInput | null>(null);

  useEffect(() => () => borisAbort.current?.abort(), []);

  // Amtlicher BORIS-Wert trifft (ggf. erst nach der Analyzing-Phase) ein:
  // NUR die bodenwertabhängigen Felder neu berechnen und einmischen — die
  // übrigen (zufälligen) Kennzahlen bleiben unverändert, sonst „springt"
  // das Ergebnis beim Nachladen unnötig.
  useEffect(() => {
    if (!boris.data || !lastInputRef.current) return;
    const override = estimateValue(lastInputRef.current, { bodenrichtwert: boris.data.brw });
    setResult((prev) =>
      prev
        ? { ...prev, low: override.low, mid: override.mid, high: override.high, pricePerSqm: override.pricePerSqm, bodenrichtwert: override.bodenrichtwert }
        : prev,
    );
  }, [boris.data]);

  // Adresse aus der URL übernehmen (Hero-Schnelleinstieg → direkt mit Satellit).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lat = parseFloat(p.get("lat") || "");
    const lng = parseFloat(p.get("lng") || "");
    const label = p.get("address") || "";
    if (label && Number.isFinite(lat) && Number.isFinite(lng)) {
      const geo: GeoResult = {
        label,
        lat,
        lng,
        city: p.get("city") || "",
        postcode: p.get("plz") || "",
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger URL-Prefill beim Mount
      setF((s) => ({ ...s, address: geo, addressQuery: label }));
      setStep(1);
    } else {
      // Hero-Fallback (Enter vor geladenen Vorschlägen): Query übernehmen,
      // die Autocomplete-Suche läuft hier direkt weiter.
      const query = p.get("query") || "";
      if (query) setF((s) => ({ ...s, addressQuery: query }));
    }
  }, []);

  // Adress-Autocomplete
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Fokus-Management: bei NUTZER-Schrittwechsel zur neuen Überschrift springen
  // (nicht beim Initial-Mount / URL-Prefill → kein Fokus-Klau beim Laden).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const userNav = useRef(false);
  useEffect(() => {
    if (phase === "form" && userNav.current) {
      userNav.current = false;
      headingRef.current?.focus();
    }
  }, [step, phase]);

  // Wurzel-Container der Analyse-/Ergebnis-Sektion (SOURCES-Reveal-Liste inkl.
  // BORIS, danach das Bewertungsergebnis). Analyzing und Result ersetzen sich
  // gegenseitig im selben Slot (kein umschließendes Element in diesem Render-
  // Baum) — derselbe Ref wird daher an BEIDE Wurzel-Divs gereicht, sodass er
  // beim Phasenwechsel "analyzing" → "result" einfach auf den jeweils aktuell
  // gemounteten Knoten zeigt, ohne dass hierfür erneut gescrollt werden muss.
  const resultRef = useRef<HTMLDivElement>(null);

  // Sanft (ease-in-out = Standard-Smooth-Easing des Browsers) zur Analyse-
  // Sektion scrollen, sobald die Bewertung startet — sonst sieht der Nutzer
  // die Datenquellen-Reveal-Liste (inkl. BORIS) und das Ergebnis erst nach
  // manuellem Hochscrollen. Reagiert NUR auf den Eintritt in "analyzing"
  // (Dependency ist bewusst nur `phase`, nicht `revealed`), damit pro Reveal-
  // Tick kein zusätzlicher Sprung entsteht. Der rAF-Aufschub lässt den
  // Analyse-Block sicher erst rendern/mounten, bevor gemessen/gescrollt wird.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raf = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Debounce-Reset bei zu kurzer Query
      setSuggestions([]);
      setActiveIdx(-1);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchAddress(q, ctrl.signal);
      setSuggestions(res);
      setActiveIdx(-1);
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
      // Mehrfamilienhaus: Ertragswert-Ansatz braucht die Jahresnettokaltmiete
      // statt der Wohnfläche (die bleibt hier optional, nur für den €/m²-Wert).
      // Echte Zahlprüfung statt Truthy-Check ("0"/"-5000" sind truthy) —
      // spiegelt die Server-Bound in api/report/route.ts (bounded(…, 100, …)).
      if (f.objektart === "mehrfamilienhaus") {
        const miete = Number(f.jahresnettokaltmiete);
        if (!Number.isFinite(miete) || miete < 100) return "Bitte eine gültige Jahresnettokaltmiete angeben (mind. 100 €).";
      }
      if (f.objektart !== "grundstueck" && f.objektart !== "mehrfamilienhaus" && !f.wohnflaeche)
        return "Bitte die Wohnfläche angeben.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      setErrorNonce((n) => n + 1);
      return;
    }
    setError(null);
    if (step < 2) {
      userNav.current = true;
      setStep(step + 1);
    } else startAnalysis();
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
      jahresnettokaltmiete: f.jahresnettokaltmiete ? Number(f.jahresnettokaltmiete) : undefined,
      wohneinheiten: f.wohneinheiten ? Number(f.wohneinheiten) : undefined,
      gewerbeeinheiten: f.gewerbeeinheiten ? Number(f.gewerbeeinheiten) : undefined,
    };
    lastInputRef.current = input;
    setResult(estimateValue(input));
    setRevealed(0);
    setPhase("analyzing");

    // Amtlichen Bodenrichtwert parallel zur Analyse-Animation laden — nur
    // mit Koordinaten möglich, sonst bleibt es beim Modellwert.
    borisAbort.current?.abort();
    if (input.lat != null && input.lng != null) {
      const ctrl = new AbortController();
      borisAbort.current = ctrl;
      setBoris({ loading: true, data: null, attribution: null });
      fetch(`/api/bodenrichtwert?lat=${input.lat}&lng=${input.lng}`, { signal: ctrl.signal })
        .then((res) => res.json())
        .then((json: { ok?: boolean; data?: Bodenrichtwert | null; attribution?: string }) => {
          setBoris({ loading: false, data: json?.data ?? null, attribution: json?.attribution ?? null });
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setBoris({ loading: false, data: null, attribution: null });
        });
    } else {
      setBoris(BORIS_EMPTY);
    }
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
    borisAbort.current?.abort();
    lastInputRef.current = null;
    setBoris(BORIS_EMPTY);
    setF(EMPTY);
    setStep(0);
    setResult(null);
    setError(null);
    setSuggestions([]);
    setPhase("form");
  }

  if (phase === "analyzing") return <Analyzing f={f} result={result} revealed={revealed} boris={boris} sectionRef={resultRef} />;
  // mid<=0-Guard: sollte durch validateStep nicht mehr vorkommen, fängt aber
  // ungültige/negative Eingaben ab, statt ein "0 €"-Ergebnis als gültig zu zeigen.
  if (phase === "result" && result && result.mid > 0)
    return <Result f={f} result={result} onReset={reset} boris={boris} sectionRef={resultRef} />;

  return (
    <div className="mx-auto max-w-2xl">
      <ol role="list" aria-label="Fortschritt der Bewertung" className="mb-8 flex items-center gap-3">
        {[0, 1, 2].map((s) => (
          <li key={s} className="flex flex-1 items-center gap-3" aria-current={s === step ? "step" : undefined}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
                s <= step ? "border-accent bg-accent text-on-accent" : "border-border text-muted"
              }`}
            >
              <span aria-hidden="true">{s + 1}</span>
              <span className="sr-only">
                {`Schritt ${s + 1} von 3: ${STEP_LABELS[s]}${s === step ? " (aktuell)" : s < step ? " (abgeschlossen)" : ""}`}
              </span>
            </div>
            {s < 2 && <div aria-hidden="true" className={`h-px flex-1 ${s < step ? "bg-accent" : "bg-border"}`} />}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Was möchten Sie bewerten?</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {OBJEKTARTEN.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={f.objektart === o.key}
                  onClick={() => set("objektart", o.key)}
                  className={`press flex flex-col items-center gap-3 rounded-xl border p-5 ${
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
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Wo befindet sich die Immobilie?</h2>
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
                aria-label="Adresse"
                role="combobox"
                aria-expanded={suggestions.length > 0 && !f.address}
                aria-controls="addr-listbox"
                aria-autocomplete="list"
                aria-activedescendant={activeIdx >= 0 ? `addr-opt-${activeIdx}` : undefined}
                onKeyDown={(e) => {
                  if (f.address || suggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
                  } else if (e.key === "Enter" && activeIdx >= 0 && activeIdx < suggestions.length) {
                    e.preventDefault();
                    const s = suggestions[activeIdx];
                    set("address", s);
                    set("addressQuery", s.label);
                    setSuggestions([]);
                    setActiveIdx(-1);
                  } else if (e.key === "Escape") {
                    setSuggestions([]);
                    setActiveIdx(-1);
                  }
                }}
              />
              {searching && (
                <div role="status" aria-live="polite" className="absolute right-3 top-3.5 text-xs text-faint">
                  sucht…
                </div>
              )}
              {suggestions.length > 0 && !f.address && (
                <ul
                  id="addr-listbox"
                  role="listbox"
                  aria-label="Adressvorschläge"
                  className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
                >
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat},${s.lng}`} id={`addr-opt-${i}`} role="option" aria-selected={i === activeIdx}>
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => {
                          set("address", s);
                          set("addressQuery", s.label);
                          setSuggestions([]);
                          setActiveIdx(-1);
                        }}
                        className={`block w-full px-4 py-3 text-left text-sm transition-colors ${
                          i === activeIdx ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                        }`}
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
                  <span className="t-success-check" data-state="in" aria-hidden>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                  </span>{" "}
                  Adresse bestätigt
                </div>
                <div className="relative h-52 overflow-hidden rounded-xl border border-border">
                  <MapConsentGate>
                    <LocationMap lat={f.address.lat} lng={f.address.lng} />
                  </MapConsentGate>
                </div>
              </div>
            )}
            <p className="text-xs text-faint">Adressdaten via OpenStreetMap. Die genaue Lage fließt in die Mikrolage-Bewertung ein.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Eckdaten der Immobilie</h2>
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
              {f.objektart === "mehrfamilienhaus" && (
                <>
                  {/* Ertragswert-Ansatz: Jahresnettokaltmiete ist die zentrale
                      Eingabe (Pflicht), Wohn-/Gewerbeeinheiten nur Kontext. */}
                  <Field label="Jahresnettokaltmiete (€/Jahr)">
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={f.jahresnettokaltmiete}
                      onChange={(e) => set("jahresnettokaltmiete", e.target.value)}
                      placeholder="z. B. 48000"
                    />
                  </Field>
                  <Field label="Wohneinheiten">
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={f.wohneinheiten}
                      onChange={(e) => set("wohneinheiten", e.target.value)}
                      placeholder="z. B. 6"
                    />
                  </Field>
                  <Field label="Gewerbeeinheiten (optional)">
                    <input
                      className={inputCls}
                      inputMode="numeric"
                      value={f.gewerbeeinheiten}
                      onChange={(e) => set("gewerbeeinheiten", e.target.value)}
                      placeholder="z. B. 1"
                    />
                  </Field>
                </>
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
                      aria-pressed={f.ausstattung.includes(a)}
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
            {f.objektart === "mehrfamilienhaus" && (
              <p className="text-xs text-faint">
                Ertragswert-Ansatz: Wir schätzen aus Ihrer Jahresnettokaltmiete und einem regionalen
                Vervielfältiger — eine grobe Heuristik, kein Ertragswertgutachten.
              </p>
            )}
          </div>
        )}

        <div className={`t-input-wrap mt-5 ${error ? "is-error" : ""}`}>
          <p className="t-error-msg text-sm text-accent" role="alert">
            {error ?? " "}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          {step > 0 ? (
            <button type="button" onClick={() => { setError(null); userNav.current = true; setStep(step - 1); }} className="press text-sm text-muted hover:text-fg">
              Zurück
            </button>
          ) : (
            <span />
          )}
          <button
            key={errorNonce}
            type="button"
            onClick={next}
            className={`t-input ${error ? "is-shaking" : ""} rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]`}
          >
            {step < 2 ? "Weiter" : "Bewertung berechnen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Analyzing({
  f,
  result,
  revealed,
  boris,
  sectionRef,
}: {
  f: FormState;
  result: ValuationResult | null;
  revealed: number;
  boris: BorisState;
  /** Wurzel-Container für den Auto-Scroll beim Start der Analyse (s. Calculator). */
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const pct = Math.round((revealed / SOURCES.length) * 100);
  // Passenden Preisatlas-Standort einmal pro Adresse ermitteln (statt in
  // jeder SOURCES-Zeile neu) — s. marktortByOrt in lib/marktdaten.ts.
  const markt = useMemo(
    () => marktortByOrt(f.address?.city ?? "", f.address?.lat, f.address?.lng),
    [f.address?.city, f.address?.lat, f.address?.lng],
  );
  const ctx: SourceCtx = { boris, markt };
  return (
    <div
      ref={sectionRef}
      className="relative overflow-hidden rounded-2xl border border-border"
      role="status"
      aria-live="polite"
      aria-busy={pct < 100}
    >
      {/* Eine aggregierte Live-Ansage statt jeder einzelnen Quelle (nicht zu gesprächig). */}
      <span className="sr-only">Bewertung wird berechnet, {pct} Prozent.</span>
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
                {done && result && <span className="text-sm text-accent">{s.value(result, f, ctx)}</span>}
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

function Result({
  f,
  result,
  onReset,
  boris,
  sectionRef,
}: {
  f: FormState;
  result: ValuationResult;
  onReset: () => void;
  boris: BorisState;
  /** Derselbe Ref wie in Analyzing — der Slot bleibt beim Phasenwechsel
   * gleich, daher wird hier NICHT erneut gescrollt (s. Calculator). */
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const mid = useCountUp(result.mid, true);
  const rangePos = result.high > result.low ? ((result.mid - result.low) / (result.high - result.low)) * 100 : 50;
  const b = boris.data;
  const tiles = statTiles(result);

  return (
    <div ref={sectionRef} className="overflow-hidden rounded-2xl border border-border">
      {/* Satelliten-Ansicht + Adresse */}
      {f.address && (
        <div className="relative h-64 w-full sm:h-80">
          <MapConsentGate>
            <LocationMap lat={f.address.lat} lng={f.address.lng} zoom={18} />
          </MapConsentGate>
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
          {b && (
            // .t-num-d nur auf dem Text-Span (s. Kommentar in SOURCES oben) —
            // der äußere Flex-Wrapper bleibt unangetastet.
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
              <span key={`${b.brw}-${b.zone}`} className="t-num-d">
                Bodenrichtwert {b.brw} €/m²{b.zone ? ` · Zone ${b.zone}` : ""}
              </span>
              <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                {borisPriceRelevant(f.objektart) ? "amtlich · BORIS-RLP" : "informativ · BORIS-RLP"}
              </span>
            </div>
          )}
          {f.objektart === "mehrfamilienhaus" && result.vervielfaeltiger != null && (
            // .t-num-d nur auf dem Text-Span (s. Kommentar oben) — der äußere
            // Flex-Wrapper bleibt unangetastet.
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
              <span key={result.vervielfaeltiger} className="t-num-d">
                Ertragswert: Jahresnettokaltmiete × {result.vervielfaeltiger}
              </span>
              <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                heuristische Schätzung
              </span>
            </div>
          )}
        </div>

        <div
          className={`mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 ${
            tiles.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5"
          }`}
        >
          {tiles.map((s) => (
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

        <ReportRequest f={f} result={result} onReset={onReset} borisLoading={boris.loading} />

        <p className="mt-6 text-center text-xs text-faint">
          Unverbindliche, datenbasierte Schätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
          Satellit © Esri · Adressdaten © OpenStreetMap.
          {b && boris.attribution ? ` · ${boris.attribution}` : ""}
        </p>
      </div>
    </div>
  );
}

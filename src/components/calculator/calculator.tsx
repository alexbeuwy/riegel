"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Icon, type IconName } from "@/components/icon";
import { MapConsentGate } from "@/components/consent";
import { formatEUR } from "@/lib/format";
import { ortAusLabel, searchAddress, type GeoResult } from "@/lib/geocode";
import { track, trackKlick } from "@/lib/track";
import {
  estimateValue,
  AUSSTATTUNG_HAUS,
  AUSSTATTUNG_WOHNUNG,
  AUSSTATTUNG_GEWERBE,
  AUSSTATTUNG_MFH,
  HAUSTYPEN,
  type Haustyp,
  QUALITAETEN,
  type Objektart,
  type OrtsStats,
  type Qualitaet,
  type ValuationInput,
  type ValuationResult,
  type Vermietungsstand,
  type Zustand,
} from "@/lib/valuation";
import { marktortByOrt, type MarktOrt } from "@/lib/marktdaten";
// Nur der Typ — der Client ruft NIE lib/boris.ts direkt, sondern immer den
// Server-Proxy /api/bodenrichtwert (s. u.). Type-only Import fällt beim
// Build komplett weg, zieht also kein Server-Modul ins Client-Bundle.
import type { Bodenrichtwert } from "@/lib/boris";
import { ReportRequest } from "@/components/calculator/report-request";
import { parseDeZahl } from "@/lib/parse-de-zahl";

const LocationMap = dynamic(
  () => import("@/components/calculator/location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> },
);

type Phase = "form" | "analyzing" | "result";
const ENERGIE = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Klassische Energieausweis-Farbskala (Grün → Rot) mit gleitendem Pin-Rahmen
 * auf der gewählten Klasse (Wunsch Alex 18.08.2026). Das Select daneben
 * bleibt das zugängliche Steuerelement — der Strahl ist reine Visualisierung
 * (aria-hidden), deshalb dürfen die Buchstaben im Strahl klein sein.
 */
const ENERGIE_FARBEN = ["#0a8f3c", "#2fa23a", "#7cb52e", "#c8c421", "#e8b31d", "#e88f1d", "#e2661b", "#d8401e", "#c22323"];

function EnergieStrahl({ wert }: { wert: string }) {
  const idx = ENERGIE.indexOf(wert);
  return (
    <div className="relative flex-1" aria-hidden>
      <div className="flex h-9 overflow-hidden rounded-lg">
        {ENERGIE.map((k, i) => (
          <span
            key={k}
            className="flex flex-1 items-center justify-center text-[0.6rem] font-semibold text-black/70 transition-opacity duration-300"
            style={{ backgroundColor: ENERGIE_FARBEN[i], opacity: idx === -1 ? 0.5 : idx === i ? 1 : 0.35 }}
          >
            {k}
          </span>
        ))}
      </div>
      {idx >= 0 && (
        <span
          className="energie-pin absolute -top-1 bottom-[-4px] rounded-md border-2 border-fg shadow-[0_0_10px_rgba(0,0,0,0.55)]"
          style={{ left: `calc(${(idx / ENERGIE.length) * 100}% + 1px)`, width: `calc(${100 / ENERGIE.length}% - 2px)` }}
        />
      )}
    </div>
  );
}
// Vier Fortschritts-Knoten: „Rechner aufrufen" gilt mit dem Öffnen bereits
// als erledigt (psychologischer Vorsprung) — die drei Formularschritte folgen.
const STEP_NODES = ["Rechner aufrufen", "Objektart", "Standort", "Eckdaten"];
// Nicht-linearer Fortschritt je Formularschritt (frühe Schritte springen weiter).
const PROGRESS_PCT = [32, 60, 82];

/** Ladezustand der amtlichen Bodenrichtwert-Abfrage (/api/bodenrichtwert). */
interface BorisState {
  loading: boolean;
  data: Bodenrichtwert | null;
  attribution: string | null;
}
const BORIS_EMPTY: BorisState = { loading: false, data: null, attribution: null };

const nfDE = new Intl.NumberFormat("de-DE");

/**
 * Demo-Modus für interne Live-Tests (Wunsch Alex 18.08.2026: „damit ich die
 * Endseite testen kann, ohne alles 100 Mal einzutippen"): /rechner?demo=wohnung
 * |haus|mfh füllt ein realistisches Objekt komplett aus und startet die
 * Analyse automatisch → landet direkt auf der Ergebnis-Seite. Bewusst ohne
 * Auth (rechnet nur, was jeder auch manuell eintippen könnte); das Tracking
 * ignoriert Demo-Aufrufe (s. track.ts), damit Tests die Funnel-Zahlen im
 * /intern-Conversion-Tab nicht verfälschen. Links dazu: /intern → Übersicht.
 */
const DEMO_ADRESSE: GeoResult = {
  label: "Maximilianstraße 100, 67346 Speyer",
  city: "Speyer",
  postcode: "67346",
  lat: 49.31797,
  lng: 8.43705,
};
const DEMO_PRESETS: Record<string, Partial<FormState>> = {
  wohnung: {
    objektart: "wohnung",
    address: DEMO_ADRESSE,
    addressQuery: DEMO_ADRESSE.label,
    wohnflaeche: "92",
    zimmer: "3",
    badezimmer: "1",
    baujahr: "1996",
    zustand: "gepflegt",
    qualitaet: "normal",
    energieklasse: "C",
    hausgeld: "290",
    ausstattung: ["Balkon / Terrasse", "Keller"],
  },
  haus: {
    objektart: "haus",
    address: DEMO_ADRESSE,
    addressQuery: DEMO_ADRESSE.label,
    wohnflaeche: "160",
    grundflaeche: "520",
    zimmer: "5",
    badezimmer: "2",
    baujahr: "1988",
    zustand: "gepflegt",
    qualitaet: "normal",
    energieklasse: "D",
    ausstattung: ["Garage / Stellplatz", "Keller"],
  },
  mfh: {
    objektart: "mehrfamilienhaus",
    address: DEMO_ADRESSE,
    addressQuery: DEMO_ADRESSE.label,
    wohnflaeche: "420",
    grundflaeche: "600",
    wohneinheiten: "6",
    jahresnettokaltmiete: "42000",
    vermietungsstand: "vermietet",
    baujahr: "1972",
    zustand: "gepflegt",
    qualitaet: "normal",
    ausstattung: [],
  },
};

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
  /** Nur Haus: Bauform (freistehend, Doppelhaushälfte, Reihenhaus, Bungalow). */
  haustyp: Haustyp;
  /** Nur Haus: zweite abgeschlossene Wohneinheit. */
  zweifamilienhaus: boolean;
  /** Nur für objektart === "mehrfamilienhaus" — Ertragswert-Eingaben. */
  jahresnettokaltmiete: string;
  wohneinheiten: string;
  gewerbeeinheiten: string;
  /** MFH: Vermietungsstand steuert, ob eine Ist-Miete gebraucht wird. */
  vermietungsstand: Vermietungsstand;
  /** MFH + "teilweise": leerstehende Wohnfläche in m². */
  leerstehendeWohnflaeche: string;
  /** Nur Gewerbe: Hallen-/Lageranteil an der Nutzfläche in m². */
  hallenflaeche: string;
  /** Nur Gewerbe: Wohnfläche abgeschlossener Wohneinheiten im Objekt in m²
   *  (Mischobjekt — Hinweis Manfred: Halle mit zwei Wohnungen und Büro). */
  mischWohnflaeche: string;
  /** Nur Wohnung: monatliches Hausgeld in € — realer Preisdrücker, den das
   *  Modell sonst nicht sieht (Fall Manfred „Landauer Warte": 700 €/Monat). */
  hausgeld: string;
  /** Wohnung/Haus: Kernsanierung (Elektrik, Leitungen, Fenster, Heizung) —
   *  erdet die „neuwertig"-Selbstauskunft bei Altbaujahren (s. valuation.ts). */
  kernsaniert: boolean;
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
  haustyp: "freistehend",
  zweifamilienhaus: false,
  jahresnettokaltmiete: "",
  wohneinheiten: "",
  gewerbeeinheiten: "",
  vermietungsstand: "vermietet",
  leerstehendeWohnflaeche: "",
  hallenflaeche: "",
  mischWohnflaeche: "",
  hausgeld: "",
  kernsaniert: false,
};

/**
 * Formular-Persistenz im sessionStorage.
 *
 * WARUM: Der Rechner ist der wichtigste Lead-Kanal, und Schritt 3 kostet echte
 * Tipparbeit. Ein versehentlicher Reload, ein Klick auf „Datenschutz" oder ein
 * Zurück-Wisch auf dem Handy löschte bisher ALLES — der Lead war weg. session-
 * Storage (nicht localStorage) ist bewusst gewählt: die Daten überleben genau
 * den Tab/Besuch und verschwinden danach von selbst (Datenschutz-Sparsamkeit,
 * dieselbe Linie wie das cookielose Tracking in lib/track.ts).
 */
const SPEICHER_KEY = "riegel:rechner";
/** Älteres bleibt liegen: Nach einer halben Stunde ist die Sitzung inhaltlich
 *  eine andere — dann lieber sauber leer starten als mit fremden Zahlen. */
const SPEICHER_MAX_MS = 30 * 60 * 1000;

interface GespeicherterStand {
  ts: number;
  step: number;
  f: FormState;
  /** s. ortNaeherung im Calculator — Badge „Ortszentrum als Näherung". */
  ortNaeherung?: boolean;
}

/** Interner Demo-Einstieg (?demo=…): dort ist der Direktsprung gewollt, also
 *  weder Persistenz noch abgefangene Zurück-Geste (s. DEMO_PRESETS). */
function istDemo(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");
}

function standLoeschen(): void {
  try {
    sessionStorage.removeItem(SPEICHER_KEY);
  } catch {
    /* fail-soft: Private-Mode / gesperrter Storage darf den Rechner nie stören */
  }
}

function standLaden(): GespeicherterStand | null {
  try {
    const roh = sessionStorage.getItem(SPEICHER_KEY);
    if (!roh) return null;
    const snap = JSON.parse(roh) as GespeicherterStand;
    if (!snap?.f || typeof snap.ts !== "number" || Date.now() - snap.ts > SPEICHER_MAX_MS) {
      standLoeschen();
      return null;
    }
    // Defensiv gegen alte/kaputte Stände: fehlende Felder aus EMPTY auffüllen,
    // damit ein späterer Feld-Zusatz keinen Uralt-Stand zum Absturz bringt.
    return { ...snap, step: Math.min(2, Math.max(0, snap.step | 0)), f: { ...EMPTY, ...snap.f } };
  } catch {
    return null;
  }
}

/**
 * Optionale Zahlenfelder, die bisher LAUTLOS verworfen wurden: parseDeZahl
 * liefert bei „ca. 1998er Bau" oder „vier" undefined, startAnalysis rechnete
 * dann einfach ohne das Feld weiter — der Eigentümer hat es angegeben und
 * wundert sich später über den Wert. Geprüft wird nur, was zur aktuellen
 * Objektart auch SICHTBAR ist: sonst blockiert ein Feld die Weiterfahrt, das
 * gar nicht mehr auf dem Bildschirm steht (Fall: Hausgeld getippt, danach auf
 * „Haus" gewechselt).
 */
const ZAHLFELDER: {
  key: keyof FormState;
  label: string;
  beispiel: string;
  sichtbar: (f: FormState) => boolean;
}[] = [
  { key: "baujahr", label: "Baujahr", beispiel: "1998", sichtbar: (f) => f.objektart !== "grundstueck" },
  {
    key: "zimmer",
    label: "Zimmer",
    beispiel: "3,5",
    sichtbar: (f) => f.objektart === "wohnung" || f.objektart === "haus" || f.objektart === "mehrfamilienhaus",
  },
  {
    key: "badezimmer",
    label: "Badezimmer",
    beispiel: "1,5",
    sichtbar: (f) => f.objektart !== "gewerbe" && f.objektart !== "grundstueck",
  },
  { key: "hausgeld", label: "Hausgeld pro Monat", beispiel: "320", sichtbar: (f) => f.objektart === "wohnung" },
  {
    key: "jahresnettokaltmiete",
    label: "Jahresnettokaltmiete",
    beispiel: "48000",
    sichtbar: (f) => f.objektart === "mehrfamilienhaus" && f.vermietungsstand !== "leer",
  },
  { key: "wohneinheiten", label: "Wohneinheiten", beispiel: "6", sichtbar: (f) => f.objektart === "mehrfamilienhaus" },
  { key: "gewerbeeinheiten", label: "Gewerbeeinheiten", beispiel: "1", sichtbar: (f) => f.objektart === "mehrfamilienhaus" },
  {
    key: "leerstehendeWohnflaeche",
    label: "Leerstehende Wohnfläche",
    beispiel: "120",
    sichtbar: (f) => f.objektart === "mehrfamilienhaus" && f.vermietungsstand === "teilweise",
  },
  { key: "hallenflaeche", label: "Hallen-/Lagerfläche", beispiel: "400", sichtbar: (f) => f.objektart === "gewerbe" },
  { key: "mischWohnflaeche", label: "Wohnfläche im Objekt", beispiel: "160", sichtbar: (f) => f.objektart === "gewerbe" },
];

/**
 * Reduzierte Such-Queries für den Ortszentrum-Fallback (s. ortFallback).
 * Reihenfolge = Trefferchance: erst PLZ + Ort (der zuverlässigste Anker),
 * dann das letzte / die letzten beiden Komma-Segmente, zuletzt die Eingabe
 * ohne Hausnummer. Photon findet „Kirchgasse 3b" in einem 400-Seelen-Ortsteil
 * oft nicht, „67435 Neustadt" praktisch immer.
 */
function ortKandidaten(roh: string): string[] {
  const segmente = roh
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const out: string[] = [];
  const plzOrt = roh.match(/\b\d{5}\b[^,]*/);
  if (plzOrt) out.push(plzOrt[0].trim());
  if (segmente.length >= 1) out.push(segmente[segmente.length - 1]);
  if (segmente.length >= 2) out.push(segmente.slice(-2).join(", "));
  // Hausnummer am Ende eines Segments abschneiden („Wormser Str. 13" → „Wormser Str.").
  const ohneNr = segmente.map((t) => t.replace(/\s*\d+\s*[a-z]?$/i, "").trim()).filter(Boolean);
  if (ohneNr.length) out.push(ohneNr.join(", "));
  return [...new Set(out)].filter((s) => s.trim().length >= 3);
}

// "building"-Icon aus components/icon.tsx (Pfaddaten 1:1 übernommen, keine
// neue Glyph erfunden) — dieser Auswahl-Button rendert sein <svg> selbst
// (eigene Strichstärke 1.25 für die größere Kachel), daher kein <Icon />.
const OBJEKTARTEN: { key: Objektart; label: string; icon: React.ReactNode }[] = [
  { key: "wohnung", label: "Wohnung", icon: <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" /> },
  { key: "haus", label: "Haus", icon: <path d="M3 11.5 12 4l9 7.5M5 10v11h14V10M10 21v-6h4v6" /> },
  {
    key: "mehrfamilienhaus",
    label: "Mehrfamilien­haus",
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

/** Bodenrichtwert fließt bei Grundstück, Haus und Gewerbe (jeweils gestaffelt
 * angerechnet, s. grundstuecksStaffel in lib/valuation.ts)
 * tatsächlich in mid/pricePerSqm ein (s. estimateValue in lib/valuation.ts) —
 * bei Wohnung/Mehrfamilienhaus (Ertragswert-Ansatz, mietbasiert) ist
 * er rein informativ, der "amtlich"-Badge muss das kennzeichnen statt
 * fälschlich einen Preiseinfluss zu suggerieren. */
/**
 * Bauform-Icons. Gleiche Bildsprache wie die Objektart-Kacheln (24er-Raster,
 * runde Enden, currentColor). Der ausgefuellte Punkt markiert, welches der
 * gezeigten Haeuser das eigene ist — bei Reihenend- und Reihenmittelhaus ist
 * das der einzige Unterschied und deshalb der ganze Witz des Icons.
 */
const HAUSTYP_ICONS: Record<Haustyp, React.ReactNode> = {
  freistehend: (
    <>
      <path d="M7.5 11.5 12 7.5l4.5 4M9 11v8h6v-8M3 19h18" />
      <circle cx="12" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  doppelhaushaelfte: (
    <>
      <path d="M4 11.5 8 8l4 3.5 4-3.5 4 3.5M5.5 11v8h13v-8M12 11v8M3 19h18" />
      <circle cx="8.75" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  reihenendhaus: (
    <>
      <path d="M2.5 12 5 9.5 7.5 12 10 9.5 12.5 12 15 9.5 17.5 12M4 11.5V19h13v-7.5M8.5 11.5V19M13 11.5V19M2 19h18" />
      <circle cx="6.25" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  reihenmittelhaus: (
    <>
      <path d="M2.5 12 5 9.5 7.5 12 10 9.5 12.5 12 15 9.5 17.5 12M4 11.5V19h13v-7.5M8.5 11.5V19M13 11.5V19M2 19h18" />
      <circle cx="10.75" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  bungalow: (
    <>
      <path d="M3.5 13.5 12 9.5l8.5 4M5.5 13V19h13v-6M3 19h18" />
      <circle cx="12" cy="16.5" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
};

/**
 * Ausstattungsliste je Objektart. Haus und Wohnung haben eigene Listen, weil
 * sich die wertrelevanten Merkmale unterscheiden: „Aufzug" ist bei einem
 * freistehenden Einfamilienhaus sinnlos, „Einliegerwohnung" bei einer
 * Eigentumswohnung baulich nicht vorgesehen. Das Mehrfamilienhaus hat eine
 * eigene Liste, weil dort der Zustand von Dach, Technik und Fenstern zählt
 * und nicht die Einbauküche.
 */
function ausstattungListe(objektart: Objektart): string[] {
  if (objektart === "gewerbe") return AUSSTATTUNG_GEWERBE;
  if (objektart === "haus") return AUSSTATTUNG_HAUS;
  if (objektart === "mehrfamilienhaus") return AUSSTATTUNG_MFH;
  return AUSSTATTUNG_WOHNUNG;
}

function borisPriceRelevant(objektart: Objektart): boolean {
  return objektart === "grundstueck" || objektart === "haus" || objektart === "gewerbe";
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
          <span className="whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
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
        return r.vervielfaeltiger != null ? `${nfDE.format(r.vervielfaeltiger)}× Jahresmiete` : "Ertragswert-Ansatz";
      }
      const m = ctx.markt;
      // comparables ist seit 11.08.2026 die Zahl ECHTER Orts-Abschlüsse
      // (0 = keine belastbare Datenlage) — keine erfundenen Zählwerte mehr.
      if (!m) return r.comparables > 0 ? `${r.comparables} echte Abschlüsse` : "regional gewichtet";
      const spanne = f.objektart === "haus" ? m.haus : m.wohnung;
      return `${nfDE.format(spanne.min)}–${nfDE.format(spanne.max)} €/m²`;
    },
  },
  {
    label: "Aktuelle Angebotspreise",
    sub: "Portale werden ausgewertet",
    // Ehrlich statt erfundener Inserats-Zahl (war comparables × 2 und damit
    // Zufall): oberes Ende der regionalen Marktspanne, sonst neutraler Text.
    value: (_r, f, ctx) => {
      const m = ctx.markt;
      if (!m || f.objektart === "grundstueck" || f.objektart === "gewerbe") return "einbezogen";
      const spanne = f.objektart === "haus" ? m.haus : m.wohnung;
      return `bis ${nfDE.format(spanne.max)} €/m²`;
    },
  },
  {
    label: "Marktpreis-Index (12 Monate)",
    sub: "Preistrend wird berechnet",
    value: (r, _f, ctx) => `+${nfDE.format(ctx.markt ? ctx.markt.trendYoyPct : r.trendPct)} % p.a.`,
  },
  {
    label: "Lage- & Infrastruktur-Score",
    sub: "Schulen, ÖPNV, Versorgung",
    // marktdaten führt keinen eigenen Mikrolage-Wert — der Nachfrage-Score
    // (1–10, ebenfalls lage-getrieben) ist der nächstliegende Stellvertreter.
    value: (r, _f, ctx) => `${nfDE.format(ctx.markt ? ctx.markt.nachfrage : r.mikrolage)}/10`,
  },
  {
    label: "Demografie & Nachfrage",
    sub: "Nachfrageindex der Region",
    value: (_r, _f, ctx) => (ctx.markt ? nachfrageLabel(ctx.markt.nachfrage) : "hohe Nachfrage"),
  },
  { label: "Zins- & Renditeumfeld", sub: "Finanzierungskonditionen", value: (r) => `${nfDE.format(r.rentYieldPct)} % Rendite` },
  { label: "Objekt-Faktoren", sub: "Baujahr, Zustand, Qualität", value: (_r, f) => f.qualitaet },
  {
    label: "Eigene Transaktionsdatenbank",
    sub: "RIEGEL-Referenzobjekte",
    // Echte Abschluss-Zahl aus dem OnOffice-Verkauft-Pool (via /api/marktstats)
    // — solange sie (noch) nicht da ist, kein erfundener Zählwert.
    value: (r) => (r.comparables > 0 ? `${r.comparables} Abschlüsse vor Ort` : "wird abgeglichen"),
  },
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
    // Nur ECHTE Orts-Abschlüsse zählen (s. valuation.ts) — „–" statt einer
    // erfundenen Zahl, wenn die Datenlage zu dünn ist.
    { k: "Echte Verkäufe", v: result.comparables > 0 ? `${result.comparables}` : "–", icon: "layers" },
    { k: "Markttrend", v: `+${nfDE.format(result.trendPct)} %`, icon: "trend" },
    { k: "Mikrolage", v: `${nfDE.format(result.mikrolage)}/10`, icon: "compass" },
    { k: "Konfidenz", v: `${result.confidence} %`, icon: "shield" },
  ];
  if (result.vervielfaeltiger != null) {
    // Kurzes Label: „Vervielfältiger" passte nicht in die schmale Kachel und
    // wurde mitten im Wort umgebrochen. „Ertragsfaktor" ist fachlich dasselbe.
    tiles.push({ k: "Ertragsfaktor", v: `${nfDE.format(result.vervielfaeltiger)}×`, icon: "calculator" });
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

/**
 * Setzt die Schriftgröße eines Betrags so, dass er die Zeile exakt füllt.
 *
 * Warum gemessen statt geschätzt: Der Wert ist die einzige Zahl, wegen der
 * jemand den Rechner überhaupt bedient — sie soll so groß wie möglich stehen,
 * darf aber nie überlaufen. „89.000 €" und „12.750.000 €" unterscheiden sich in
 * der Breite um mehr als das Doppelte, und AKIRA Expanded macht das schlimmer.
 * Eine CSS-Formel über die Zeichenzahl muss auf den breitesten Fall auslegen
 * und verschenkt dadurch bei kurzen Beträgen ein Drittel der Fläche.
 *
 * Gemessen wird gegen den ENDWERT, nicht gegen den hochzählenden Zwischenwert:
 * Sonst wüchse die Schrift während der Animation mit jeder neuen Ziffer mit und
 * zappelte. Ein Durchgang genügt, weil die Textbreite linear an der Schriftgröße
 * hängt — der zweite Durchgang korrigiert nur Rundung und Kerning.
 *
 * Die CSS-Regel .wert-zahl bleibt als Vorschuss für SSR/ohne JS bestehen.
 */
function useFitText(ziffern: string, einheit: string, minPx: number, maxPx: number) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const messen = () => {
      const platz = el.clientWidth;
      if (!platz) return;
      // Die Probe bildet denselben Aufbau nach wie das echte Element, inklusive
      // des kleineren €-Spans — sonst würde sie zu breit messen und die Zahl
      // fiele unnötig klein aus. Sie hängt neben dem Element im selben Eltern-
      // knoten, erbt also Schrift, Schnitt und Laufweite.
      const probe = document.createElement("div");
      probe.className = el.className;
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;left:0;top:0";
      probe.append(document.createTextNode(ziffern));
      const eu = document.createElement("span");
      eu.className = "wert-euro";
      eu.textContent = einheit;
      probe.append(eu);
      (el.parentElement ?? el).appendChild(probe);
      // 3 % Sicherheitsabzug. 0,5 % waren zu knapp: offsetWidth misst die
      // VORSCHUB-Breite, die Tinte eines Zeichens kann darüber hinausstehen
      // (AKIRAs € tut das). Zusammen mit background-clip: text, das am
      // Element-Rand abschneidet, sah das € dadurch angeschnitten aus.
      const ziel = platz * 0.97;
      let groesse = 0;
      for (let i = 0; i < 2 && probe.offsetWidth > 0; i++) {
        groesse = Math.min(maxPx, Math.max(minPx, (100 * ziel) / probe.offsetWidth));
        probe.style.fontSize = `${groesse}px`;
        // Nach der ersten Runde misst die Probe bei der Zielgröße; das Verhältnis
        // korrigiert dann noch Hinting-/Kerning-Rundungen.
        if (i === 0) continue;
        groesse = Math.min(maxPx, Math.max(minPx, (groesse * ziel) / probe.offsetWidth));
      }
      probe.remove();
      if (groesse > 0) el.style.fontSize = `${groesse}px`;
    };

    messen();
    // Webfont kommt asynchron: vor dem AKIRA-Swap misst der Fallback-Font eine
    // andere Breite, danach stimmt sie erst.
    document.fonts?.ready.then(messen).catch(() => {});
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ziffern, einheit, minPx, maxPx]);

  return ref;
}

/**
 * „487.000 €" in Ziffern und Währung trennen.
 *
 * Intl setzt ein GESCHÜTZTES Leerzeichen (U+00A0) davor, danach wird gesucht.
 * Getrennt, weil das € kleiner gesetzt wird als die Zahl: Es ist die Einheit,
 * nicht die Aussage, und in AKIRA Expanded frisst es auf gleicher Höhe fast so
 * viel Breite wie zwei Ziffern.
 */
function betragTeile(s: string): [string, string] {
  const i = s.lastIndexOf(" ");
  return i === -1 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
}

/** wichtig = Hauptfeld: kräftigere Kontur + hellere Beschriftung — optionale
 *  Felder behalten die bisherige, dezentere Optik (Wunsch Alex 18.08.2026:
 *  Pflicht und Kür müssen auf einen Blick unterscheidbar sein). */
function Field({ label, children, wichtig }: { label: string; children: React.ReactNode; wichtig?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className={`text-sm ${wichtig ? "font-medium text-fg" : "text-muted"}`}>{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";
/** Hauptfeld-Variante: sichtbarere Kontur (s. Field.wichtig). */
const inputClsWichtig = inputCls.replace("border-border", "border-fg/30");

export function Calculator() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [boris, setBoris] = useState<BorisState>(BORIS_EMPTY);
  // Aufklapper „Präzisere Kalkulation gewünscht?" — Conversion-Regel: nie
  // mehr als 5–6 Felder gleichzeitig sichtbar (Wunsch Alex 18.08.2026).
  const [mehrDetails, setMehrDetails] = useState(false);
  // Echte Orts-Abschlüsse (Aggregate aus /api/marktstats, OnOffice-Pool) —
  // Plausibilitäts-Deckel + ehrliche Vergleichszahl (s. valuation.ts).
  const [stats, setStats] = useState<OrtsStats | null>(null);
  // Läuft parallel zur Analyzing-Animation; bei Unmount/Reset/neuer Analyse
  // wird die jeweils vorherige Abfrage abgebrochen.
  const borisAbort = useRef<AbortController | null>(null);
  const statsAbort = useRef<AbortController | null>(null);
  // Für den Override-Merge, sobald amtlicher Wert / echte Abschlüsse eintreffen.
  const lastInputRef = useRef<ValuationInput | null>(null);
  // Adresse kam über den Ortszentrum-Fallback (s. ortFallback): muss sichtbar
  // bleiben, damit niemand glaubt, seine exakte Hausnummer sei erkannt worden.
  const [ortNaeherung, setOrtNaeherung] = useState(false);

  useEffect(() => () => {
    borisAbort.current?.abort();
    statsAbort.current?.abort();
  }, []);

  // Amtlicher BORIS-Wert und/oder echte Orts-Abschlüsse treffen (ggf. erst
  // nach der Analyzing-Phase) ein: komplette Neuberechnung mit allen
  // verfügbaren Ankern. Seit die Engine deterministisch ist (11.08.2026),
  // darf das Ergebnis vollständig ersetzt werden — es „springt" nichts mehr
  // zufällig, nur die Daten werden präziser (und die Kennzahlen wie
  // Vergleichsobjekte/Konfidenz ziehen ehrlich mit).
  useEffect(() => {
    if (!lastInputRef.current || (!boris.data && !stats)) return;
    setResult(
      estimateValue(lastInputRef.current, {
        bodenrichtwert: boris.data?.brw,
        ortsStats: stats ?? undefined,
      }),
    );
  }, [boris.data, stats]);

  // Demo-Modus: merkt sich, dass nach dem URL-Prefill genau EINMAL automatisch
  // die Analyse starten soll (Effect dazu steht NACH startAnalysis, s. dort).
  const demoStart = useRef(false);

  // Adresse aus der URL übernehmen (Hero-Schnelleinstieg → direkt mit Satellit).
  // Danach — und NUR wenn die URL nichts vorgibt — den gespeicherten Stand aus
  // dem sessionStorage wiederherstellen: ein frischer Hero-Einstieg mit neuer
  // Adresse darf nie von einem alten Formularstand überschrieben werden.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    // Interner Demo-Einstieg (s. DEMO_PRESETS): komplettes Objekt + Autostart.
    const demo = p.get("demo");
    if (demo && DEMO_PRESETS[demo]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger URL-Prefill beim Mount (gleiches Muster wie unten)
      setF((s) => ({ ...s, ...DEMO_PRESETS[demo] }));
      demoStart.current = true;
      return;
    }
    const lat = parseFloat(p.get("lat") || "");
    const lng = parseFloat(p.get("lng") || "");
    const label = p.get("address") || "";
    if (label && Number.isFinite(lat) && Number.isFinite(lng)) {
      const geo: GeoResult = {
        label,
        lat,
        lng,
        // city kann in Hero-URLs leer sein (PLZ-/Ortssuche, Fall Bad Vilbel
        // 12.08.2026) — dann aus dem Label ableiten, sonst rechnen alle
        // ortsbasierten Engine-Schichten mit einem leeren Ort.
        city: p.get("city") || ortAusLabel(label),
        postcode: p.get("plz") || "",
      };

      setF((s) => ({ ...s, address: geo, addressQuery: label }));
      // Bewusst KEIN Sprung auf den Standort-Schritt: die Objektart ist mit
      // "wohnung" vorbelegt, ein Überspringen würde ein über den Hero
      // eingegebenes Haus stillschweigend als Wohnung bewerten. Der Nutzer
      // startet also weiter bei der Objektart, die Adresse ist bereits
      // hinterlegt und wird auf diesem Schritt sichtbar bestätigt.
      return;
    }
    // Hero-Fallback (Enter vor geladenen Vorschlägen): Query übernehmen,
    // die Autocomplete-Suche läuft hier direkt weiter.
    const query = p.get("query") || "";
    if (query) {
      setF((s) => ({ ...s, addressQuery: query }));
      return;
    }
    const snap = standLaden();
    if (!snap) return;
    // Bewusst NUR der Formularstand (Schritt + Eingaben + Adresse), NIE eine
    // laufende Analyse oder ein fertiges Ergebnis: „analyzing" wäre nach dem
    // Reload eine eingefrorene Animation, und ein wiederhergestelltes Ergebnis
    // müsste ohne Bodenrichtwert-/Marktstats-Abgleich neu geraten werden. Wer
    // sein Ergebnis zurückwill, klickt einmal auf „Bewertung berechnen" —
    // sämtliche Angaben stehen dafür schon im Formular.
    setF(snap.f);
    setStep(snap.step);
    setOrtNaeherung(Boolean(snap.ortNaeherung));
  }, []);

  // Gespiegelt wird debounced (~400 ms), damit nicht jeder Tastendruck in den
  // Storage schreibt. Demo-Aufrufe bleiben außen vor (s. istDemo).
  useEffect(() => {
    if (istDemo()) return;
    const t = setTimeout(() => {
      try {
        const snap: GespeicherterStand = { ts: Date.now(), step, f, ortNaeherung };
        sessionStorage.setItem(SPEICHER_KEY, JSON.stringify(snap));
      } catch {
        /* fail-soft: voller/gesperrter Storage darf den Rechner nie stören */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [f, step, ortNaeherung]);

  // Adress-Autocomplete
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  /** Query, für die zuletzt eine Suche ABGESCHLOSSEN wurde — nur so lässt sich
   *  „nichts gefunden" von „noch nicht gesucht" unterscheiden (beides ist
   *  searching=false + leere Vorschläge). */
  const [letzteSuche, setLetzteSuche] = useState("");
  const [fallbackBusy, setFallbackBusy] = useState(false);
  const [fallbackFehler, setFallbackFehler] = useState(false);

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
      setLetzteSuche("");
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchAddress(q, ctrl.signal);
      setSuggestions(res);
      setActiveIdx(-1);
      setSearching(false);
      setLetzteSuche(q.trim());
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [f.addressQuery, f.address]);

  /**
   * Zurück-Geste (Browser-Zurück / Wisch-Geste auf dem Handy) fängt der
   * Rechner selbst ab, statt den Nutzer mitten im Trichter von der Seite zu
   * werfen. Modell: eine „Tiefe" (Schritt 0–2, Analyse/Ergebnis = 3). Nur beim
   * Vorwärtsgehen wird ein History-Eintrag gelegt — jedes Zurück verbraucht
   * genau einen, deshalb kann die History nicht endlos wachsen. Auf Schritt 0
   * gibt es keinen eigenen Eintrag mehr: „Zurück" verlässt die Seite dann ganz
   * normal (popstate feuert dabei gar nicht erst).
   */
  const tiefeRef = useRef(0);
  useEffect(() => {
    if (istDemo()) return; // Demo springt bewusst direkt ans Ende
    const tiefe = phase === "form" ? step : 3;
    if (tiefe > tiefeRef.current) window.history.pushState({ rechnerTiefe: tiefe }, "");
    tiefeRef.current = tiefe;
  }, [phase, step]);

  useEffect(() => {
    if (istDemo()) return;
    const onPop = () => {
      // Aus Analyse/Ergebnis führt „Zurück" zurück ins Formular (Eckdaten) —
      // KEIN neues Tracking-Event: der Trichter zählt Vorwärtsschritte.
      if (phase !== "form") {
        userNav.current = true;
        setPhase("form");
        setStep(2);
        tiefeRef.current = 2;
        return;
      }
      if (step > 0) {
        userNav.current = true;
        setError(null);
        setStep(step - 1);
        tiefeRef.current = step - 1;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [phase, step]);

  /**
   * Sackgassen-Ausweg im Standort-Schritt: Photon (OSM) kennt längst nicht
   * jede Hausnummer — kleine Neubaugebiete und Ortsteile fehlen regelmäßig.
   * Bisher endete die Bewertung genau dort, weil ohne bestätigten Vorschlag
   * kein „Weiter" möglich ist. Wir suchen deshalb gestaffelt nach dem ORT
   * (s. ortKandidaten): dessen Zentrum reicht für Satellitenbild und die
   * Bodenrichtwert-Näherung völlig aus. Fail-soft — wirft nie.
   */
  async function ortFallback() {
    const roh = f.addressQuery.trim();
    if (!roh || fallbackBusy) return;
    setFallbackBusy(true);
    setFallbackFehler(false);
    let treffer: GeoResult | null = null;
    try {
      for (const q of ortKandidaten(roh)) {
        const res = await searchAddress(q);
        const mitOrt = res.find((r) => r.city);
        if (mitOrt) {
          treffer = mitOrt;
          break;
        }
      }
    } catch {
      /* fail-soft: unten greift der Hinweis mit der Telefonnummer */
    }
    setFallbackBusy(false);
    if (!treffer) {
      setFallbackFehler(true);
      return;
    }
    const gefunden = treffer;
    setF((s) => ({ ...s, address: gefunden, addressQuery: gefunden.label }));
    setOrtNaeherung(true);
    setSuggestions([]);
    setActiveIdx(-1);
    setError(null);
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !f.objektart) return "Bitte eine Objektart wählen.";
    if (s === 1 && !f.address) return "Bitte eine Adresse aus den Vorschlägen wählen.";
    if (s === 2) {
      // Zuerst die tippfehler-anfälligen Zahlenfelder: eine konkrete Meldung
      // („Baujahr: bitte als Zahl angeben") ist hilfreicher als das stille
      // Verwerfen des Werts in startAnalysis (s. ZAHLFELDER).
      for (const z of ZAHLFELDER) {
        if (!z.sichtbar(f)) continue;
        const roh = String(f[z.key] ?? "");
        if (roh.trim() && parseDeZahl(roh) == null)
          return `${z.label}: bitte als Zahl angeben, z. B. ${z.beispiel}.`;
      }
      if (f.objektart === "grundstueck" && !f.grundflaeche) return "Bitte die Grundstücksfläche angeben.";
      // Mehrfamilienhaus: Ertragswert-Ansatz braucht die Jahresnettokaltmiete
      // statt der Wohnfläche (die bleibt hier optional, nur für den €/m²-Wert).
      // Echte Zahlprüfung statt Truthy-Check ("0"/"-5000" sind truthy) —
      // spiegelt die Server-Bound in api/report/route.ts (bounded(…, 100, …)).
      if (f.objektart === "mehrfamilienhaus") {
        // Bei Leerstand ist die Wohnfläche die Rechengrundlage (wir setzen die
        // marktübliche Miete selbst an), bei Vermietung die Ist-Miete.
        if (f.vermietungsstand === "leer") {
          const wfl = parseDeZahl(f.wohnflaeche);
          if (wfl == null || wfl < 10)
            return "Bitte die Wohnfläche angeben — daraus schätzen wir die marktübliche Miete.";
        } else {
          const miete = parseDeZahl(f.jahresnettokaltmiete);
          if (miete == null || miete < 100) return "Bitte eine gültige Jahresnettokaltmiete angeben (mind. 100 €).";
        }
        if (f.vermietungsstand === "teilweise") {
          const wfl = parseDeZahl(f.wohnflaeche);
          if (wfl == null || wfl < 10)
            return "Bitte die Wohnfläche angeben — daraus schätzen wir die Miete der leerstehenden Flächen.";
          const leer = parseDeZahl(f.leerstehendeWohnflaeche);
          if (leer == null || leer <= 0)
            return "Bitte die leerstehende Wohnfläche angeben (z. B. 120).";
          if (leer >= wfl)
            return 'Die leerstehende Fläche muss kleiner als die Gesamtwohnfläche sein — sonst bitte „Leer stehend" wählen.';
        }
      }
      if (f.objektart !== "grundstueck" && f.objektart !== "mehrfamilienhaus" && !f.wohnflaeche)
        return "Bitte die Wohnfläche angeben.";
      // Komma-/Format-Eingaben sind ok (parseDeZahl), aber komplett
      // unlesbare Werte sauber abfangen statt still ohne Preis zu enden
      // (Kundenfall Manfred: "32,35" ergab vorher NaN und kein Ergebnis).
      const flaechenName = f.objektart === "gewerbe" ? "Nutzflächen" : "Wohnflächen";
      const wfl = parseDeZahl(f.wohnflaeche);
      if (f.wohnflaeche && wfl == null)
        return "Bitte die Wohnfläche als Zahl angeben (z. B. 120 oder 92,5).";
      const gfl = parseDeZahl(f.grundflaeche);
      if (f.grundflaeche && gfl == null)
        return "Bitte die Grundstücksfläche als Zahl angeben (z. B. 450).";
      // Mindestwerte spiegeln die Server-Grenzen aus /api/report (bounded(…,
      // 10, …) bzw. bounded(…, 20, …)) — sonst läuft der Rechner durch und
      // erst der Report-Versand scheitert, wenn der Lead schon getippt hat.
      if (wfl != null && wfl < 10) return `Bitte prüfen: ${flaechenName} unter 10 m² können wir nicht bewerten.`;
      if (gfl != null && gfl < 20) return "Bitte prüfen: Grundstücksflächen unter 20 m² können wir nicht bewerten.";
      // Gewerbe-/Mischobjekt: Hallen- und Wohnanteil sind Teilflächen der
      // Nutzfläche — zusammen dürfen sie diese nicht übersteigen, sonst wäre
      // die Bürofläche negativ (die Engine würde still klemmen und der
      // Eigentümer wundert sich über den Wert).
      if (f.objektart === "gewerbe") {
        const nutz = parseDeZahl(f.wohnflaeche) ?? 0;
        const teile = (parseDeZahl(f.hallenflaeche) ?? 0) + (parseDeZahl(f.mischWohnflaeche) ?? 0);
        if (nutz > 0 && teile > nutz)
          return "Hallen- und Wohnfläche zusammen dürfen die Gesamtnutzfläche nicht übersteigen.";
      }
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
    // Trichter-Nenner: „Start" darf NICHT nur am Objektart-Klick hängen — die
    // Objektart ist mit „Wohnung" vorbelegt, und wer über den Hero mit fertiger
    // Adresse einsteigt, klickt oft keine Kachel und fiel bisher komplett aus
    // der Statistik. track() dedupliziert je Seitenaufruf, doppelt zählt also nichts.
    track("rechner_start");
    if (step < 2) {
      userNav.current = true;
      // Funnel-Messung: der ABGESCHLOSSENE Schritt zählt (1-basiert), nicht
      // der neu betretene — sonst zeigt der /intern-Trichter „Schritt 1" für
      // Leute, die nur die Objektart angeklickt haben.
      track("rechner_step", { step: step + 1 });
      setStep(step + 1);
    } else {
      track("rechner_step", { step: 3 });
      startAnalysis();
    }
  }

  function startAnalysis() {
    const input: ValuationInput = {
      objektart: f.objektart,
      ort: f.address?.city || "",
      plz: f.address?.postcode,
      addressLabel: f.address?.label,
      lat: f.address?.lat,
      lng: f.address?.lng,
      wohnflaeche: parseDeZahl(f.wohnflaeche),
      grundflaeche: parseDeZahl(f.grundflaeche),
      zimmer: parseDeZahl(f.zimmer),
      badezimmer: parseDeZahl(f.badezimmer),
      baujahr: parseDeZahl(f.baujahr),
      zustand: f.zustand,
      qualitaet: f.qualitaet,
      energieklasse: f.objektart === "gewerbe" ? undefined : f.energieklasse || undefined,
      haustyp: f.objektart === "haus" ? f.haustyp : undefined,
      zweifamilienhaus: f.objektart === "haus" ? f.zweifamilienhaus : undefined,
      ausstattung: f.ausstattung,
      // Bei Vollleerstand eine evtl. vorher eingetippte Miete NICHT mitsenden
      // (sonst zählt sie trotz "leer stehend" weiter mit).
      jahresnettokaltmiete:
        f.objektart === "mehrfamilienhaus" && f.vermietungsstand === "leer"
          ? undefined
          : parseDeZahl(f.jahresnettokaltmiete),
      wohneinheiten: parseDeZahl(f.wohneinheiten),
      gewerbeeinheiten: parseDeZahl(f.gewerbeeinheiten),
      vermietungsstand: f.objektart === "mehrfamilienhaus" ? f.vermietungsstand : undefined,
      leerstehendeWohnflaeche:
        f.objektart === "mehrfamilienhaus" && f.vermietungsstand === "teilweise"
          ? parseDeZahl(f.leerstehendeWohnflaeche)
          : undefined,
      hallenflaeche: f.objektart === "gewerbe" ? parseDeZahl(f.hallenflaeche) : undefined,
      mischWohnflaeche: f.objektart === "gewerbe" ? parseDeZahl(f.mischWohnflaeche) : undefined,
      hausgeldMonat: f.objektart === "wohnung" ? parseDeZahl(f.hausgeld) : undefined,
      kernsaniert: f.objektart === "wohnung" || f.objektart === "haus" ? f.kernsaniert : undefined,
    };
    lastInputRef.current = input;
    setResult(estimateValue(input));
    setRevealed(0);
    track("rechner_analyse");
    setPhase("analyzing");

    // Echte Orts-Abschlüsse (OnOffice-Aggregate) parallel laden — gleiche
    // Mechanik wie der Bodenrichtwert: die Anzeige startet mit dem
    // Modellwert und erdet sich, sobald die echten Zahlen da sind. Ohne
    // diesen Abgleich würde der Rechner mehr anzeigen als das PDF
    // (der Kunde zitiert dann den höheren Wert — Fall Manfred).
    statsAbort.current?.abort();
    setStats(null);
    if ((input.objektart === "wohnung" || input.objektart === "haus") && input.ort) {
      const sctrl = new AbortController();
      statsAbort.current = sctrl;
      fetch(`/api/marktstats?ort=${encodeURIComponent(input.ort)}&objektart=${input.objektart}`, { signal: sctrl.signal })
        .then((res) => res.json())
        .then((json: { ok?: boolean; data?: OrtsStats | null }) => {
          if (!sctrl.signal.aborted) setStats(json?.data ?? null);
        })
        .catch(() => {
          /* fail-soft: Modellwert bleibt */
        });
    }

    // Amtlichen Bodenrichtwert parallel zur Analyse-Animation laden — nur
    // mit Koordinaten möglich, sonst bleibt es beim Modellwert.
    borisAbort.current?.abort();
    if (input.lat != null && input.lng != null) {
      const ctrl = new AbortController();
      borisAbort.current = ctrl;
      setBoris({ loading: true, data: null, attribution: null });
      // objektart mitschicken: wählt bei überlappenden Hessen-Zonen die
      // passende Zone (EFH/MFH/Gewerbe) und ist Teil des CDN-Cache-Keys.
      fetch(`/api/bodenrichtwert?lat=${input.lat}&lng=${input.lng}&objektart=${input.objektart}`, { signal: ctrl.signal })
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

  // Demo-Autostart (s. demoStart beim URL-Prefill): sobald der Preset-State
  // committed ist, genau einmal die Analyse starten — direkt zur Endseite.
  useEffect(() => {
    if (demoStart.current && f.address) {
      demoStart.current = false;
      startAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startAnalysis ist bewusst kein Dep (bei jedem Render neu erzeugt)
  }, [f.address]);

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
      else
        timers.push(
          setTimeout(() => {
            track("rechner_ergebnis");
            setPhase("result");
          }, reduce ? 200 : 900),
        );
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
    setOrtNaeherung(false);
    setFallbackFehler(false);
    setLetzteSuche("");
    setPhase("form");
    // Gespeicherten Stand mitnehmen: „Neue Bewertung" heißt neu, nicht
    // „gleiches Objekt nach dem nächsten Reload wieder da".
    standLoeschen();
    tiefeRef.current = 0;
  }

  /** „Angaben anpassen" aus dem Ergebnis: zurück zu den Eckdaten, OHNE Reset —
   *  das Ergebnis bleibt erhalten und wird beim nächsten „Bewertung berechnen"
   *  neu gerechnet. Bewusst kein eigenes Tracking-Event (s. popstate). */
  function angabenAnpassen() {
    userNav.current = true;
    setError(null);
    setPhase("form");
    setStep(2);
    tiefeRef.current = 2;
  }

  if (phase === "analyzing") return <Analyzing f={f} result={result} revealed={revealed} boris={boris} sectionRef={resultRef} />;
  // mid<=0-Guard: sollte durch validateStep nicht mehr vorkommen, fängt aber
  // ungültige/negative Eingaben ab, statt ein "0 €"-Ergebnis als gültig zu zeigen.
  if (phase === "result" && result && result.mid > 0)
    return (
      <Result
        f={f}
        result={result}
        onReset={reset}
        onAnpassen={angabenAnpassen}
        onGesendet={standLoeschen}
        boris={boris}
        sectionRef={resultRef}
      />
    );

  const currentNode = step + 1; // Knoten 0 „Rechner aufrufen" ist mit dem Öffnen erledigt
  const pct = PROGRESS_PCT[step] ?? PROGRESS_PCT[0];

  return (
    // onClickCapture: anonyme 5-%-Raster-Klicks für die Conversion-Heatmap in
    // /intern (s. lib/track.ts — bewusst ohne Nutzer-Wiedererkennung).
    <div className="mx-auto max-w-3xl" data-track-bereich="formular" onClickCapture={trackKlick}>
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs">
          <span className="uppercase tracking-[0.2em] text-faint">Schritt {currentNode + 1} von 4</span>
          {/* Fortschritt als Badge (analog zum "amtlich"-Badge im Ergebnis) statt
              als loser Text in der Ecke. */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-medium text-accent">
            <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 4 4 10-10" />
            </svg>
            <span key={pct} className="t-num-d tabular-nums">{pct}%</span> erledigt
          </span>
        </div>
        <ol role="list" aria-label="Fortschritt der Bewertung" className="flex items-center gap-2 sm:gap-3">
          {STEP_NODES.map((label, d) => {
            const done = d < currentNode;
            const current = d === currentNode;
            return (
              <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={current ? "step" : undefined}>
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                      done
                        ? "border-accent bg-accent text-on-accent"
                        : current
                          ? "border-accent text-accent"
                          : "border-border text-muted"
                    }`}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 4 4 10-10" />
                      </svg>
                    ) : (
                      <span aria-hidden="true">{d + 1}</span>
                    )}
                    <span className="sr-only">
                      {`Schritt ${d + 1} von 4: ${label}${current ? " (aktuell)" : done ? " (abgeschlossen)" : ""}`}
                    </span>
                  </div>
                  <span className={`hidden truncate text-xs sm:inline ${current ? "font-medium text-fg" : done ? "text-muted" : "text-faint"}`}>
                    {label}
                  </span>
                </div>
                {d < STEP_NODES.length - 1 && (
                  <div aria-hidden="true" className={`h-px flex-1 ${d < currentNode ? "bg-accent" : "bg-border"}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">Was möchten Sie bewerten?</h2>
            {/* Adresse aus dem Hero (oder aus einem Rückschritt) sichtbar
                bestätigen: sonst wirkt es, als sei die Eingabe verloren
                gegangen, weil dieser Schritt gar nicht nach ihr fragt. */}
            {f.address && (
              <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/5 px-3.5 py-2.5">
                <Icon name="pin" size={15} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{f.address.label}</span>
                <span className="shrink-0 text-xs uppercase tracking-widest text-faint">
                  übernommen
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {OBJEKTARTEN.map((o) => {
                const selected = f.objektart === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={selected}
                    // Objektart-Wechsel setzt die Ausstattung zurück: Wohn- und
                    // Gewerbe-Merkmale sind zwei verschiedene Listen, sonst
                    // bliebe „Balkon" an einer Halle ausgewählt.
                    onClick={() => {
                      track("rechner_start");
                      setF((s) =>
                        s.objektart === o.key ? s : { ...s, objektart: o.key, ausstattung: [] },
                      );
                    }}
                    className={`group press relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border p-4 text-center transition-[border-color,background-color,transform] duration-300 ${
                      selected
                        ? "glow-select-on border-accent bg-surface-2"
                        : "border-border hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2/60"
                    }`}
                  >
                    <span aria-hidden="true" className="glow-select-ring" />
                    <span
                      className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-300 ${
                        selected
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border/70 bg-surface text-muted group-hover:text-accent"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                        {o.icon}
                      </svg>
                    </span>
                    <span
                      lang="de"
                      // Keine automatische Silbentrennung: „Mehrfamilien­haus" trägt
                      // bereits einen weichen Trennstrich am Kompositum-Fugenpunkt,
                      // das ist die einzige gewünschte (saubere) Trennstelle.
                      className={`relative text-[0.8rem] font-medium leading-tight tracking-tight ${
                        selected ? "text-fg" : "text-muted group-hover:text-fg"
                      }`}
                    >
                      {o.label}
                    </span>
                  </button>
                );
              })}
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
                  setOrtNaeherung(false);
                  setFallbackFehler(false);
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
                    setOrtNaeherung(false);
                    setSuggestions([]);
                    setActiveIdx(-1);
                  } else if (e.key === "Enter" && activeIdx < 0) {
                    // Ohne Pfeiltasten-Auswahl gilt der erste Vorschlag als
                    // gemeint: Enter ist die natürliche Geste nach dem Tippen —
                    // vorher passierte schlicht nichts, und die Adresse blieb
                    // unbestätigt (= „Weiter" verweigert den Dienst).
                    e.preventDefault();
                    const s = suggestions[0];
                    set("address", s);
                    set("addressQuery", s.label);
                    setOrtNaeherung(false);
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
                          setOrtNaeherung(false);
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
            {/* Sackgassen-Ausweg: Suche gelaufen, nichts gefunden — statt den
                Nutzer hier verhungern zu lassen, bieten wir das Ortszentrum an
                (s. ortFallback). Erscheint nur, wenn wirklich für GENAU diese
                Eingabe gesucht wurde und noch keine Adresse bestätigt ist. */}
            {!f.address &&
              !searching &&
              suggestions.length === 0 &&
              f.addressQuery.trim().length >= 3 &&
              letzteSuche === f.addressQuery.trim() && (
                <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3.5 text-sm">
                  {fallbackFehler ? (
                    <p className="text-muted">
                      Bitte Schreibweise prüfen — oder rufen Sie uns an:{" "}
                      <a href="tel:+4962321001010" className="text-accent hover:underline">
                        06232 100 10 10
                      </a>
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="min-w-0 text-muted">
                        Adresse nicht dabei? Kein Problem — wir rechnen mit dem Ortszentrum.
                      </p>
                      <button
                        type="button"
                        onClick={ortFallback}
                        disabled={fallbackBusy}
                        className="press shrink-0 rounded-full border border-accent/50 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-60"
                      >
                        {fallbackBusy ? "sucht Ort …" : "Mit Ort/PLZ fortfahren"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            {f.address && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-accent">
                  <span className="t-success-check" data-state="in" aria-hidden>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                  </span>{" "}
                  Adresse bestätigt
                  {/* Ehrlichkeits-Zusatz: sonst hält der Eigentümer das
                      Ortszentrum für seine exakt erkannte Hausnummer. */}
                  {ortNaeherung && (
                    <span className="whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      Ortszentrum als Näherung
                    </span>
                  )}
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

            {/* Bauform: nur beim Haus. Frage Manfred, ob das den Wert
                beeinflusst — ja, und zwar ueber die Baukosten (s.
                HAUSTYP_FAKTOR in lib/valuation.ts). Bewusst als sichtbare
                Kachelreihe und nicht als Dropdown: fuenf Bauformen sind mit
                einem Bild sofort zu unterscheiden, als Textliste dagegen
                nicht ("Reihenendhaus" vs. "Reihenmittelhaus"). Der Punkt in
                jedem Icon markiert, welches Haus das eigene ist. */}
            {f.objektart === "haus" && (
              <div className="space-y-3">
                <span className="text-sm text-muted">Bauform</span>
                <div
                  role="radiogroup"
                  aria-label="Bauform des Hauses"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-5"
                >
                  {HAUSTYPEN.map((h) => {
                    const gewaehlt = f.haustyp === h.key;
                    return (
                      <button
                        key={h.key}
                        type="button"
                        role="radio"
                        aria-checked={gewaehlt}
                        onClick={() => set("haustyp", h.key)}
                        title={h.label}
                        className={`press group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border p-3 text-center transition-[border-color,background-color,transform] duration-300 ${
                          gewaehlt
                            ? "glow-select-on border-accent bg-surface-2"
                            : "border-border hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-2/60"
                        }`}
                      >
                        <span aria-hidden="true" className="glow-select-ring" />
                        <svg
                          viewBox="0 0 24 24"
                          width={34}
                          height={34}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={`relative transition-colors duration-300 ${
                            gewaehlt ? "text-accent" : "text-muted group-hover:text-accent"
                          }`}
                        >
                          {HAUSTYP_ICONS[h.key]}
                        </svg>
                        <span
                          className={`relative text-[0.72rem] font-medium leading-tight tracking-tight ${
                            gewaehlt ? "text-fg" : "text-muted group-hover:text-fg"
                          }`}
                        >
                          {h.kurz}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Amtlicher Korrekturfaktor 1,05 aus Fussnote 2 der Anlage 4
                    ImmoWertV. Bewusst ein eigener Schalter und keine sechste
                    Kachel: "Zweifamilienhaus" ist keine Bauform, sondern eine
                    Eigenschaft, die zu JEDER Bauform dazukommen kann. */}
                <label className="press flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-accent/50 hover:bg-surface-2/60">
                  <input
                    type="checkbox"
                    checked={f.zweifamilienhaus}
                    onChange={(e) => set("zweifamilienhaus", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">Zweifamilienhaus</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      Zwei abgeschlossene Wohneinheiten, etwa mit Einliegerwohnung oder
                      getrennter Obergeschosswohnung.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {/* CONVERSION-REGEL (18.08.2026, Alex): nie mehr als 5–6 Felder
                gleichzeitig sichtbar — alles Optionale wandert in den
                „Präzisere Kalkulation"-Aufklapper darunter. Sichtbar bleibt je
                Objektart nur, was Pflicht ist oder den Wert stark treibt. */}
            <div className="grid gap-4 sm:grid-cols-2">
              {f.objektart !== "grundstueck" && (
                // Bei Gewerbe heißt die Fläche Nutzfläche, nicht Wohnfläche.
                <Field wichtig label={f.objektart === "gewerbe" ? "Nutzfläche gesamt (m²)" : "Wohnfläche (m²)"}>
                  {/* inputMode="decimal" statt "numeric" überall dort, wo ein
                      Dezimalwert legitim ist (Flächen, Zimmer wie „3,5", Bäder
                      wie „1,5", Geldbeträge): Die reine Numerik-Tastatur von
                      iOS/Android hat KEIN Komma — der Nutzer kann „92,5" also
                      gar nicht eintippen, obwohl unsere eigene Fehlermeldung
                      genau dazu einlädt („z. B. 92,5"). decimal blendet den
                      Dezimaltrenner ein. Echte Ganzzahlfelder (Baujahr, Wohn-
                      und Gewerbeeinheiten) behalten bewusst "numeric". */}
                  <input
                    className={inputClsWichtig}
                    inputMode="decimal"
                    value={f.wohnflaeche}
                    onChange={(e) => set("wohnflaeche", e.target.value)}
                    placeholder={f.objektart === "gewerbe" ? "z. B. 900" : "z. B. 120"}
                  />
                </Field>
              )}
              {/* Grundstück: bei Haus/Gewerbe/Grundstück Haupt-Werttreiber und
                  sichtbar — beim MFH optional (wandert in den Aufklapper). */}
              {(f.objektart === "haus" || f.objektart === "gewerbe" || f.objektart === "grundstueck") && (
                <Field wichtig label="Grundstücksfläche (m²)">
                  <input className={inputClsWichtig} inputMode="decimal" value={f.grundflaeche} onChange={(e) => set("grundflaeche", e.target.value)} placeholder="z. B. 450" />
                </Field>
              )}
              {f.objektart === "mehrfamilienhaus" && (
                <>
                  {/* Vermietungsstand steuert den Ertragswert-Ansatz: bei
                      Leerstand braucht der Eigentümer KEINE Miete zu erfinden,
                      dann setzen wir für die leeren Flächen selbst eine
                      marktübliche Miete an (Rückfrage Manfred). */}
                  <Field wichtig label="Vermietungsstand">
                    <select
                      className={inputClsWichtig}
                      value={f.vermietungsstand}
                      onChange={(e) => set("vermietungsstand", e.target.value as Vermietungsstand)}
                    >
                      <option value="vermietet">Vollständig vermietet</option>
                      <option value="teilweise">Teilweise vermietet</option>
                      <option value="leer">Leer stehend / keine Mieteinnahmen</option>
                    </select>
                  </Field>
                  {f.vermietungsstand !== "leer" && (
                    <Field
                      wichtig
                      label={
                        f.vermietungsstand === "teilweise"
                          ? "Aktuelle Jahresnettokaltmiete (€/Jahr)"
                          : "Jahresnettokaltmiete (€/Jahr)"
                      }
                    >
                      <input
                        className={inputClsWichtig}
                        inputMode="decimal"
                        value={f.jahresnettokaltmiete}
                        onChange={(e) => set("jahresnettokaltmiete", e.target.value)}
                        placeholder="z. B. 48000"
                      />
                    </Field>
                  )}
                  {f.vermietungsstand === "teilweise" && (
                    <Field wichtig label="Davon leerstehende Wohnfläche (m²)">
                      <input
                        className={inputClsWichtig}
                        inputMode="decimal"
                        value={f.leerstehendeWohnflaeche}
                        onChange={(e) => set("leerstehendeWohnflaeche", e.target.value)}
                        placeholder="z. B. 120"
                      />
                    </Field>
                  )}
                  {/* 1–4 Einheiten schalten den Vergleichswert-Anker der Engine
                      frei — deshalb Hauptfeld, nicht Kür (s. valuation.ts). */}
                  <Field wichtig label="Wohneinheiten">
                    <input
                      className={inputClsWichtig}
                      inputMode="numeric"
                      value={f.wohneinheiten}
                      onChange={(e) => set("wohneinheiten", e.target.value)}
                      placeholder="z. B. 6"
                    />
                  </Field>
                </>
              )}
              {/* Gewerbe: Hallen-/Lager- und Wohnanteil statt Zimmer und
                  Badezimmer (Hinweise Manfred: Bürogebäude mit Halle,
                  ehemaliges Autohaus; Mischobjekt Halle + zwei Wohnungen +
                  Büro). Beide Angaben sind Anteile AN der Nutzfläche —
                  Büro/Praxis ergibt sich als Rest. */}
              {f.objektart === "gewerbe" && (
                <>
                  <Field wichtig label="Davon Hallen-/Lagerfläche (m²)">
                    <input
                      className={inputClsWichtig}
                      inputMode="decimal"
                      value={f.hallenflaeche}
                      onChange={(e) => set("hallenflaeche", e.target.value)}
                      placeholder="z. B. 400"
                    />
                  </Field>
                  <Field wichtig label="Davon Wohnfläche (m²) — falls Wohnungen im Objekt">
                    <input
                      className={inputClsWichtig}
                      inputMode="decimal"
                      value={f.mischWohnflaeche}
                      onChange={(e) => set("mischWohnflaeche", e.target.value)}
                      placeholder="z. B. 160"
                    />
                  </Field>
                </>
              )}
              {/* Zimmer: bei Wohnung/Haus Haupt-Angabe; beim MFH fachlich
                  kaum ausschlaggebend → dort optional im Aufklapper
                  (Wunsch Alex 18.08.2026). */}
              {(f.objektart === "wohnung" || f.objektart === "haus") && (
                <Field wichtig label="Zimmer">
                  <input className={inputClsWichtig} inputMode="decimal" value={f.zimmer} onChange={(e) => set("zimmer", e.target.value)} placeholder="z. B. 4" />
                </Field>
              )}
              {f.objektart !== "grundstueck" && (
                <>
                  <Field wichtig label="Baujahr">
                    <input className={inputClsWichtig} inputMode="numeric" value={f.baujahr} onChange={(e) => set("baujahr", e.target.value)} placeholder="z. B. 1998" />
                  </Field>
                  <Field wichtig label="Zustand">
                    <select className={inputClsWichtig} value={f.zustand} onChange={(e) => set("zustand", e.target.value as Zustand)}>
                      <option value="neuwertig">Neuwertig / saniert</option>
                      <option value="gepflegt">Gepflegt</option>
                      <option value="renovierungsbeduerftig">Renovierungsbedürftig</option>
                    </select>
                  </Field>
                </>
              )}
            </div>

            {/* „Neuwertig" heißt bei Altbaujahren nur MIT Kernsanierung
                neuwertig — der Schalter gehört deshalb DIREKT unter den
                sichtbaren Zustand, nicht in die Kür (er ändert die Rechnung). */}
            {(f.objektart === "wohnung" || f.objektart === "haus") && f.zustand === "neuwertig" && (
              <label className="press flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-accent/50 hover:bg-surface-2/60">
                <input
                  type="checkbox"
                  checked={f.kernsaniert}
                  onChange={(e) => set("kernsaniert", e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">Kernsaniert</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    Elektrik, Leitungen, Fenster und Heizung wurden grundlegend erneuert —
                    nicht nur Böden, Bäder oder Malerarbeiten.
                  </span>
                </span>
              </label>
            )}

            {/* Ausstattung bleibt SICHTBAR (Korrektur Alex 18.08.2026): die
                Bubbles tragen spürbar zum Wert bei und kosten als Ein-Klick-
                Chips kaum Aufmerksamkeit — in die Kür gehören nur Felder, die
                Tipparbeit verlangen. */}
            {f.objektart !== "grundstueck" && (
              <div className="space-y-3">
                <span className="text-sm text-muted">Ausstattung</span>
                <div className="flex flex-wrap gap-2">
                  {ausstattungListe(f.objektart).map((a) => (
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

            {/* Aufklapper für alles Optionale — beim reinen Grundstück gibt es
                keine Kür-Felder, dann entfällt der Button komplett. */}
            {f.objektart !== "grundstueck" && (
              <div data-track-bereich="praezisere-kalkulation">
                <button
                  type="button"
                  aria-expanded={mehrDetails}
                  onClick={() => setMehrDetails((v) => !v)}
                  className="press flex w-full items-center justify-between rounded-xl border border-border px-4 py-3.5 transition-colors hover:border-accent/50 hover:bg-surface-2/60"
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium text-fg">
                    <Icon name="sparkle" size={16} className="text-accent-strong" />
                    Präzisere Kalkulation gewünscht?
                    <span className="hidden text-xs font-normal text-faint sm:inline">optional — verfeinert das Ergebnis</span>
                  </span>
                  <Icon name="chevronDown" size={16} className={`shrink-0 text-muted transition-transform duration-300 ${mehrDetails ? "rotate-180" : ""}`} />
                </button>
                <div className={`t-collapse ${mehrDetails ? "is-open" : ""}`}>
                  <div className="t-collapse-inner">
                    <div className="grid gap-4 pt-4 sm:grid-cols-2">
                      {f.objektart === "mehrfamilienhaus" && (
                        <>
                          <Field label="Grundstücksfläche (m²)">
                            <input className={inputCls} inputMode="decimal" value={f.grundflaeche} onChange={(e) => set("grundflaeche", e.target.value)} placeholder="z. B. 450" />
                          </Field>
                          <Field label="Gewerbeeinheiten">
                            <input
                              className={inputCls}
                              inputMode="numeric"
                              value={f.gewerbeeinheiten}
                              onChange={(e) => set("gewerbeeinheiten", e.target.value)}
                              placeholder="z. B. 1"
                            />
                          </Field>
                          <Field label="Zimmer gesamt">
                            <input className={inputCls} inputMode="decimal" value={f.zimmer} onChange={(e) => set("zimmer", e.target.value)} placeholder="z. B. 12" />
                          </Field>
                        </>
                      )}
                      {f.objektart !== "gewerbe" && (
                        <Field label="Badezimmer">
                          <input className={inputCls} inputMode="decimal" value={f.badezimmer} onChange={(e) => set("badezimmer", e.target.value)} placeholder="z. B. 2" />
                        </Field>
                      )}
                      <Field label="Ausstattungsqualität">
                        <select className={inputCls} value={f.qualitaet} onChange={(e) => set("qualitaet", e.target.value as Qualitaet)}>
                          {QUALITAETEN.map((q) => (
                            <option key={q.key} value={q.key}>{q.label}</option>
                          ))}
                        </select>
                      </Field>
                      {/* Hausgeld nur bei der Eigentumswohnung: realer Preisdrücker
                          (Fall Manfred „Landauer Warte": 700 €/Monat bei 105 m²). */}
                      {f.objektart === "wohnung" && (
                        <Field label="Hausgeld pro Monat (€)">
                          <input
                            className={inputCls}
                            inputMode="decimal"
                            value={f.hausgeld}
                            onChange={(e) => set("hausgeld", e.target.value)}
                            placeholder="z. B. 320"
                          />
                        </Field>
                      )}
                      {/* Energieeffizienzklassen A+ bis H gelten nach Anlage 10 GEG
                          ausschließlich für WOHNgebäude — bei Gewerbe entfällt das
                          Feld. Mini-Select + Farbstrahl mit gleitendem Pin
                          (Wunsch Alex 18.08.2026). */}
                      {f.objektart !== "gewerbe" && (
                        <div className="sm:col-span-2">
                          <Field label="Energieeffizienzklasse">
                            <div className="flex items-center gap-3">
                              <select className={`${inputCls} w-24 shrink-0`} value={f.energieklasse} onChange={(e) => set("energieklasse", e.target.value)}>
                                <option value="">–</option>
                                {ENERGIE.map((k) => (
                                  <option key={k} value={k}>{k}</option>
                                ))}
                              </select>
                              <EnergieStrahl wert={f.energieklasse} />
                            </div>
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {f.objektart === "mehrfamilienhaus" && (
              <p className="text-xs text-faint">
                {f.vermietungsstand === "vermietet"
                  ? "Ertragswert-Ansatz: Wir schätzen aus Ihrer Jahresnettokaltmiete und einem regionalen Vervielfältiger — eine grobe Heuristik, kein Ertragswertgutachten."
                  : f.vermietungsstand === "teilweise"
                    ? "Ertragswert-Ansatz: Für die leerstehende Fläche setzen wir eine marktübliche Miete Ihrer Region an und ziehen anteilig einen Abschlag für das Vermietungsrisiko ab. Grobe Heuristik, kein Ertragswertgutachten."
                    : "Kein Problem ohne Mieteinnahmen: Wir setzen für die gesamte Wohnfläche eine marktübliche Miete Ihrer Region an und ziehen einen Abschlag für den Leerstand ab. Sie müssen keine Miete schätzen. Grobe Heuristik, kein Ertragswertgutachten."}
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
          <span className={step < 2 ? "wiggle-cta" : "inline-block"}>
            <button
              key={errorNonce}
              type="button"
              onClick={next}
              className={`t-input ${error ? "is-shaking" : ""} rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]`}
            >
              {step < 2 ? "Weiter" : "Bewertung berechnen"}
            </button>
          </span>
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
  onAnpassen,
  onGesendet,
  boris,
  sectionRef,
}: {
  f: FormState;
  result: ValuationResult;
  onReset: () => void;
  /** Zurück zu den Eckdaten, ohne die Eingaben zu verlieren (s. Calculator). */
  onAnpassen: () => void;
  /** Report erfolgreich versendet → gespeicherten Formularstand verwerfen. */
  onGesendet: () => void;
  boris: BorisState;
  /** Derselbe Ref wie in Analyzing — der Slot bleibt beim Phasenwechsel
   * gleich, daher wird hier NICHT erneut gescrollt (s. Calculator). */
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const mid = useCountUp(result.mid, true);
  // Endbetrag (nicht der hochzählende Zwischenwert) ist die Referenz für die
  // Schriftgröße und für die Screenreader-Ausgabe — s. useFitText.
  const endBetrag = formatEUR(result.mid);
  const [endZiffern, endEinheit] = betragTeile(endBetrag);
  const [zifferm, einheitm] = betragTeile(formatEUR(mid));
  // Untergrenze 22 px: „14.040.000 €" (Mehrfamilienhaus mit hoher Jahresmiete)
  // braucht auf 375 px 28 px, um in eine Zeile zu passen — gemessen. Mit einer
  // höheren Grenze liefe der Betrag über und das €-Zeichen würde abgeschnitten.
  // Eine etwas kleinere Zahl ist allemal besser als eine beschnittene.
  const fitRef = useFitText(endZiffern, endEinheit, 22, 132);
  const rangePos = result.high > result.low ? ((result.mid - result.low) / (result.high - result.low)) * 100 : 50;
  const b = boris.data;
  const tiles = statTiles(result);

  return (
    <div ref={sectionRef} className="overflow-hidden rounded-2xl border border-border" data-track-bereich="ergebnis" onClickCapture={trackKlick}>
      {/* Satelliten-Ansicht + Adresse */}
      {f.address && (
        <div className="relative h-64 w-full sm:h-80">
          <MapConsentGate>
            <LocationMap lat={f.address.lat} lng={f.address.lng} zoom={18} />
          </MapConsentGate>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent p-6">
            {/* accent-strong statt Voll-Blau: auf dem Satellitenfoto war das dunkle
                Akzentblau kaum lesbar (Hinweis Alex 18.08.2026) — die helle
                Tönung ist im Design-System genau für Text auf Dunkel gedacht. */}
            <div className="text-xs uppercase tracking-[0.25em] text-accent-strong drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">Bewertete Immobilie</div>
            <div className="mt-1 text-lg font-semibold text-fg">{f.address.label}</div>
          </div>
        </div>
      )}

      <div className="relative bg-bg px-6 py-12">
        {/* Wert-Bühne im Glow-Panel-Look der Schritt-1-Objektart-Kacheln (statische
            Variante ohne Spin, s. .glow-panel in globals.css) — Innenaufbau unangetastet. */}
        <div className="glow-panel overflow-hidden rounded-2xl border border-border bg-surface/60 px-6 py-10">
          <div className="text-center">
            {/* Label als Badge mit Icon statt als bloße Kleinschrift: Der Wert
                ist das, wofür der Rechner bedient wird — die Zeile darüber darf
                das ankündigen, statt nur danebenzustehen. */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] py-1.5 pl-1.5 pr-3.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent-strong">
                <Icon name="euro" size={14} />
              </span>
              {/* Engere Laufweite auf Mobil: mit 0,2em bricht „Geschätzter
                  Marktwert" auf 375 px in zwei Zeilen und das Badge wird zum
                  Kasten. Ab sm ist Platz für die weite Sperrung. */}
              <span className="whitespace-nowrap text-[0.6rem] font-medium uppercase tracking-[0.1em] text-accent-strong sm:text-[0.7rem] sm:tracking-[0.2em]">
                Geschätzter Marktwert
              </span>
            </div>

            {/* Zweiter Anker Richtung PDF (Wunsch Alex 18.08.2026, seit
                Feedback-Runde 2 als VOLLWERTIGER Button statt Badge — soll
                als primärer CTA wirken): das EINZIGE warme Element im
                Ergebnis. Klick wirkt wie „Report anfordern": öffnet und
                scrollt zum Formular (CustomEvent, ReportRequest hört darauf). */}
            <div className="mt-3">
              <button
                type="button"
                data-track-bereich="pdf-badge"
                onClick={() => {
                  track("report_form_geoeffnet", { quelle: "badge" });
                  window.dispatchEvent(new CustomEvent("riegel:report-oeffnen"));
                }}
                className="press badge-beam-orange inline-flex max-w-full items-center gap-2.5 rounded-full bg-amber-400 py-2.5 pl-3 pr-4 text-left transition-colors hover:bg-amber-300"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/15 text-[#221604]">
                  <Icon name="printer" size={14} />
                </span>
                <span className="min-w-0 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-[#221604] sm:text-[0.72rem]">
                  Präzisere Infos &amp; Daten im kostenlosen Report-PDF
                </span>
                <Icon name="chevronDown" size={15} className="pdf-pfeil shrink-0 text-[#221604]" />
              </button>
            </div>

            {/* Wert-Plakette (s. .wert-plakette in globals.css). --wert-len ist
                die Zeichenzahl des formatierten Betrags und steuert dort die
                Schriftgröße, damit auch siebenstellige Werte auf 320 px passen. */}
            {/* -mx-3 px-3 auf Mobil: Die Plakette holt sich einen Teil der
                Panel-Polsterung zurück. Auf 375 px stecken sonst 87 px je Seite
                in Container + Sektion + Panel + Plakette, und der Betrag müsste
                auf ~31 px schrumpfen, um in einer Zeile zu bleiben. */}
            <div className="wert-plakette -mx-3 mt-5 max-w-3xl rounded-2xl border border-accent/25 bg-accent/[0.05] px-3 py-6 sm:mx-auto sm:px-8 sm:py-9">
              {/* Die hochzählende Zahl ist für Screenreader ausgeblendet: Sie
                  würde sonst während der Animation dutzendfach vorgelesen. Der
                  Endwert steht direkt darunter, einmal und vollständig. */}
              <div
                ref={fitRef}
                aria-hidden
                className="wert-zahl akira leading-none"
                style={{ "--wert-len": endBetrag.length } as React.CSSProperties}
              >
                {zifferm}
                <span className="wert-euro">{einheitm}</span>
              </div>
              <span className="sr-only">Geschätzter Marktwert: {endBetrag}</span>
            </div>

            {/* text-sm auf Mobil: in Standardgröße bricht die Spanne direkt
                unter der Plakette in zwei Zeilen um. */}
            <div className="mt-4 text-sm text-muted sm:text-base">
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
              // der äußere Flex-Wrapper bleibt unangetastet. flex-wrap gegen
              // Overflow bei langen Zonen-Bezeichnungen auf schmalen Screens.
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
                <span key={`${b.brw}-${b.zone}`} className="t-num-d">
                  Bodenrichtwert {b.brw} €/m²{b.zone ? ` · Zone ${b.zone}` : ""}
                </span>
                <span className="whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  {/* Quellen-Name je Landesdienst (RLP/Hessen); Alt-Antworten
                      ohne quelle-Feld fallen auf RLP zurück. */}
                  {`${borisPriceRelevant(f.objektart) ? "amtlich" : "informativ"} · ${b.quelle === "HE" ? "BORIS Hessen" : "BORIS-RLP"}`}
                </span>
              </div>
            )}
            {result.grundstuecksAnrechnung &&
              (result.grundstuecksAnrechnung.mehrflaecheM2 > 0 || result.grundstuecksAnrechnung.gartenlandM2 > 0) && (
                // Transparenz bei übergroßen Grundstücken: die Staffel (voll /
                // Mehrfläche / Gartenland, s. grundstuecksStaffel in
                // lib/valuation.ts) wird offen ausgewiesen, damit nachvollziehbar
                // ist, dass NICHT die Gesamtfläche zum vollen Bodenrichtwert
                // eingeht. Normale Umbrüche, kein Overflow möglich.
                <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted">
                  Übergroßes Grundstück gestaffelt angerechnet:{" "}
                  {nfDE.format(result.grundstuecksAnrechnung.baulandM2)} m² Bauland voll,{" "}
                  {nfDE.format(result.grundstuecksAnrechnung.mehrflaecheM2)} m² Mehrfläche anteilig
                  {result.grundstuecksAnrechnung.gartenlandM2 > 0
                    ? `, ${nfDE.format(result.grundstuecksAnrechnung.gartenlandM2)} m² als Gartenland`
                    : ""}
                  .
                </p>
              )}
            {result.flaechenAufteilung && (
              // Transparenz beim Gewerbe-/Mischobjekt (Halle, Wohnungen und
              // Büro in einem Objekt): jede Flächenart geht zu ihrem eigenen
              // Satz ein — offen ausweisen, sonst wirkt der Wert wie
              // „Nutzfläche × ein Preis" und ist nicht nachvollziehbar.
              <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted">
                Mischobjekt anteilig bewertet:{" "}
                {[
                  result.flaechenAufteilung.bueroM2 > 0
                    ? `${nfDE.format(result.flaechenAufteilung.bueroM2)} m² Büro/Praxis`
                    : "",
                  result.flaechenAufteilung.halleM2 > 0
                    ? `${nfDE.format(result.flaechenAufteilung.halleM2)} m² Halle/Lager`
                    : "",
                  result.flaechenAufteilung.wohnM2 > 0
                    ? `${nfDE.format(result.flaechenAufteilung.wohnM2)} m² Wohnen`
                    : "",
                ]
                  .filter(Boolean)
                  .join(", ")}{" "}
                — jeweils zum markt&shy;üblichen Satz der Flächenart.
              </p>
            )}
            {f.objektart === "mehrfamilienhaus" && result.vervielfaeltiger != null && (
              // .t-num-d nur auf dem Text-Span (s. Kommentar oben) — der äußere
              // Flex-Wrapper bleibt unangetastet. flex-wrap wie beim Boris-Badge oben.
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
                <span key={result.vervielfaeltiger} className="t-num-d">
                  Ertragswert:{" "}
                  {result.mietAnsatz && result.mietAnsatz.marktmieteGeschaetzt > 0
                    ? "angesetzte Jahresmiete"
                    : "Jahresnettokaltmiete"}{" "}
                  × {nfDE.format(result.vervielfaeltiger)}
                </span>
                <span className="whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  heuristische Schätzung
                </span>
              </div>
            )}
            {/* Leerstand transparent aufschlüsseln: welcher Teil ist Ist-Miete,
                welchen Teil haben WIR angesetzt, und was kostet der Leerstand. */}
            {result.mietAnsatz && result.mietAnsatz.marktmieteGeschaetzt > 0 && (
              <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-faint">
                Für {nfDE.format(result.mietAnsatz.leerstandM2)} m² leerstehende Wohnfläche haben wir
                eine marktübliche Miete von {nfDE.format(result.mietAnsatz.marktmieteM2)} €/m² im Monat
                angesetzt ({formatEUR(result.mietAnsatz.marktmieteGeschaetzt)} im Jahr)
                {result.mietAnsatz.istMiete > 0
                  ? ` zusätzlich zu Ihrer aktuellen Miete von ${formatEUR(result.mietAnsatz.istMiete)}`
                  : ""}
                . Für das Vermietungsrisiko haben wir {nfDE.format(result.mietAnsatz.abschlagPct)} %
                abgezogen.
              </p>
            )}
          </div>
        </div>

        <div
          className={`mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 ${
            tiles.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5"
          }`}
        >
          {tiles.map((s) => (
            <div key={s.k} className="glow-panel rounded-xl border border-border bg-surface p-4 text-center">
              <div className="mb-2 flex justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent/[0.08] text-accent">
                  <Icon name={s.icon} size={18} />
                </span>
              </div>
              {/* Kein overflow-wrap:anywhere / hyphens mehr (Vorgabe Inhaberseite:
                  keine hässlichen Wortumbrüche) — es zerlegte lange Labels mitten
                  im Wort („VERVIELFÄLTIGE / R"). Die Labels sind stattdessen kurz
                  genug gehalten (s. statTiles), tracking-normal spart die Breite. */}
              <div lang="de" className="min-w-0 text-[0.6rem] uppercase leading-tight text-faint">
                {s.k}
              </div>
              <div className="mt-1 text-base font-semibold text-fg tabular-nums">{s.v}</div>
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

        {/* Die Annahmen-Box („So hat das Modell Ihre Angaben eingeordnet")
            stand hier bis 18.08.2026 — auf Wunsch Alex entfernt: sie schob den
            Report-CTA nach unten und brachte im Web keinen Mehrwert. Die
            annahmen[] der Engine bleiben erhalten und erscheinen weiter im
            PDF (Preis-Zusammensetzungs-Seite) — dort stören sie keinen CTA. */}

        <ReportRequest
          f={f}
          result={result}
          onReset={onReset}
          onAnpassen={onAnpassen}
          onGesendet={onGesendet}
          borisLoading={boris.loading}
        />

        <p className="mt-6 text-center text-xs text-faint">
          Unverbindliche, datenbasierte Schätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
          Satellit © Esri · Adressdaten © OpenStreetMap.
          {b && boris.attribution ? ` · ${boris.attribution}` : ""}
        </p>
      </div>
    </div>
  );
}

"use client";

/**
 * Anonymes Conversion-Tracking für den Rechner-Funnel (18.08.2026, Auftrag
 * Alex: „mehr Conversions durch den Rechner und sehen, ob er überhaupt
 * angefangen oder genutzt wird").
 *
 * DATENSCHUTZ BY DESIGN — bewusst cookielos und ohne Wiedererkennung:
 * - KEINE persistente ID (kein Cookie, kein localStorage): `pageloadId` lebt
 *   nur im Modul-Speicher dieses Seitenaufrufs. Der Funnel (Start → Schritt →
 *   Ergebnis → Report) spielt sich beim Rechner ohnehin in EINEM Seitenaufruf
 *   ab — mehr Verknüpfung brauchen wir nicht und wollen wir nicht.
 * - Klick-Heatmap nur als Prozent-Raster-Buckets (0,5 %-Schritte, also 200
 *   Stufen je Achse) plus Bereichs-Name — weiterhin Buckets statt Pixel, kein
 *   Fingerprinting-Potenzial. Warum feiner als die ursprünglichen 5 %:
 *   Betreiber-Feedback 20.08.2026 („viel zu grob, exakte Punkte oder Heatmap
 *   wie bei Hotjar") — mit 5 % war eine Zelle auf dem Desktop ~70 px breit und
 *   verschluckte den Unterschied zwischen zwei nebeneinander liegenden
 *   Buttons. 0,5 % sind ~7 px: genau genug, um INNERHALB eines Elements zu
 *   sehen, wo geklickt wird, und immer noch ein Bucket, kein Pixel.
 * - Zusätzlich erfasst: welche ANSICHT gerade zu sehen war (Objektart/
 *   Standort/Eckdaten/Analyse/Ergebnis) und ob Desktop oder Mobil. Ohne
 *   diese beiden Angaben ist die Heatmap wertlos, weil x/y relativ zur
 *   Dokumenthöhe gemessen werden — und die ist in jedem Schritt eine andere
 *   (Betreiber-Feedback 20.08.2026: „wie macht die Heatmap Sinn ohne die
 *   einzelnen Steps"). Beides ist keine Personen-, sondern Seitenzustands-
 *   Information.
 * - Kein PII im Payload; die Route verwirft Unbekanntes (Allowlist).
 *
 * Versand: gebatcht über navigator.sendBeacon (überlebt Tab-Schließen),
 * Fallback fetch keepalive. Fail-soft: Tracking darf NIE den Rechner stören.
 */

export type TrackEventName =
  | "rechner_start" // erste echte Interaktion (Objektart/Adresse)
  | "rechner_step" // detail: { step: 1 | 2 | 3 }
  | "rechner_analyse" // Analyse gestartet (Formular komplett)
  | "rechner_ergebnis" // Ergebnis sichtbar
  | "report_form_geoeffnet" // Report-Formular geöffnet; detail: { quelle: "cta" | "badge" }
  | "report_angefordert" // Report erfolgreich angefordert (die Ziel-Conversion)
  | "rechner_klick"; // Heatmap; detail: { xPct, yPct, bereich, ansicht, geraet }

/**
 * Welche Ansicht des Rechners gerade sichtbar ist. Die Heatmap wertet je
 * Ansicht getrennt aus und legt je Ansicht ein eigenes Referenzbild darunter —
 * ein Klick bei „60 % Scrolltiefe" bedeutet in Schritt 1 etwas völlig anderes
 * als auf der Ergebnisseite. `seite` = außerhalb des Rechners (oder bevor der
 * Rechner sich gemeldet hat).
 */
export type Ansicht =
  | "objektart"
  | "standort"
  | "eckdaten"
  | "analyse"
  /** Ergebnisseite, Report-Formular noch zugeklappt. */
  | "ergebnis"
  /** Ergebnisseite mit AUFGEKLAPPTEM Report-Formular. Eigene Ansicht, weil das
   *  Aufklappen die Dokumenthöhe deutlich verändert — und weil genau hier die
   *  Conversion passiert (Betreiber-Hinweis 20.08.2026: „conversion-mäßig ist
   *  nur die letzte Seite relevant, PDF-Report-Anfragen etc."). */
  | "ergebnis-formular"
  | "seite";

interface TrackItem {
  event: TrackEventName;
  detail?: Record<string, string | number | boolean>;
  /** Zufalls-Id NUR dieses Seitenaufrufs (Funnel-Verknüpfung, keine Person). */
  pageloadId: string;
  ts: number;
}

function neueId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const pageloadId = neueId();
/** Aktuelle Ansicht — vom Rechner gesetzt (setAnsicht), von trackKlick gelesen.
 *  Bewusst der SEITENZUSTAND und nicht der geklickte Vorfahr: ein Klick in die
 *  Kopfzeile, während Schritt 2 offen ist, gehört zur Auswertung von Schritt 2. */
let aktuelleAnsicht: Ansicht = "seite";

/** Vom Rechner bei jedem Ansichtswechsel aufrufen. Fail-soft, kein Event. */
export function setAnsicht(a: Ansicht): void {
  aktuelleAnsicht = a;
}
/** Interne Demo-Aufrufe (/rechner?demo=…) NICHT zählen — sonst verfälscht
 * jeder Test von Alex/Team die Funnel-Zahlen im /intern-Conversion-Tab. */
const demoModus = typeof location !== "undefined" && new URLSearchParams(location.search).has("demo");
let queue: TrackItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** Ein Event-Name wird je Seitenaufruf nur EINMAL gezählt (außer Klicks) —
 * macht die Funnel-Zahlen im /intern-Tab direkt lesbar (Uniques statt Spam). */
const gesendet = new Set<string>();

function flush(): void {
  if (queue.length === 0) return;
  const body = JSON.stringify({ items: queue });
  queue = [];
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => {},
  );
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/** Event melden — fail-soft, dedupliziert je Seitenaufruf (außer Klicks). */
export function track(event: TrackEventName, detail?: Record<string, string | number | boolean>): void {
  try {
    if (demoModus) return;
    if (event !== "rechner_klick") {
      const key = event === "rechner_step" ? `${event}:${detail?.step}` : event;
      if (gesendet.has(key)) return;
      gesendet.add(key);
    }
    queue.push({ event, detail, pageloadId, ts: Date.now() });
    if (queue.length >= 12) flush();
    else {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 4000);
    }
  } catch {
    /* Tracking darf den Rechner nie stören */
  }
}

/** Auflösung der Heatmap: 200 Stufen je Achse = 0,5-%-Buckets. Der Wert wird
 *  als Ganzzahl 0–200 übertragen und gespeichert (nicht als Prozentzahl mit
 *  Komma), damit die Spalten weiter schlanke smallint bleiben. */
export const KLICK_STUFEN = 200;
/** Ab dieser Viewport-Breite gilt ein Klick als „desktop" — dieselbe Grenze
 *  wie Tailwinds md-Breakpoint, an dem der Rechner sein Layout umstellt. */
const DESKTOP_AB_PX = 768;

/**
 * Klick für die Heatmap melden — 0,5-%-Raster relativ zum DOKUMENT (x) bzw.
 * zur Dokumenthöhe (y), plus grober Bereichs-Name (data-track-bereich des
 * nächsten Vorfahren, sonst "seite"), aktuelle Ansicht und Geräteklasse.
 */
export function trackKlick(e: { clientX: number; clientY: number; target: EventTarget | null }): void {
  try {
    const doc = document.documentElement;
    const grenze = (v: number) => Math.min(KLICK_STUFEN, Math.max(0, Math.round(v * KLICK_STUFEN)));
    const xPct = grenze((e.clientX + window.scrollX) / doc.scrollWidth);
    const yPct = grenze((e.clientY + window.scrollY) / doc.scrollHeight);
    const bereich =
      (e.target instanceof Element ? e.target.closest("[data-track-bereich]")?.getAttribute("data-track-bereich") : null) ??
      "seite";
    const geraet = window.innerWidth >= DESKTOP_AB_PX ? "desktop" : "mobil";
    track("rechner_klick", { xPct, yPct, bereich, ansicht: aktuelleAnsicht, geraet });
  } catch {}
}

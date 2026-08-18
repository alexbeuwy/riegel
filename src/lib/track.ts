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
 * - Klick-Heatmap nur als GROBE Prozent-Raster-Buckets (5 %-Schritte) plus
 *   Bereichs-Name — keine Pixel-Koordinaten, kein Fingerprinting-Potenzial.
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
  | "rechner_klick"; // Heatmap; detail: { xPct, yPct, bereich }

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

/**
 * Klick für die Heatmap melden — 5 %-Raster relativ zum DOKUMENT (x) bzw.
 * zur Dokumenthöhe (y), plus grober Bereichs-Name (data-track-bereich des
 * nächsten Vorfahren, sonst "seite").
 */
export function trackKlick(e: { clientX: number; clientY: number; target: EventTarget | null }): void {
  try {
    const doc = document.documentElement;
    const xPct = Math.round(((e.clientX + window.scrollX) / doc.scrollWidth) * 20) * 5;
    const yPct = Math.round(((e.clientY + window.scrollY) / doc.scrollHeight) * 20) * 5;
    const bereich =
      (e.target instanceof Element ? e.target.closest("[data-track-bereich]")?.getAttribute("data-track-bereich") : null) ??
      "seite";
    track("rechner_klick", { xPct, yPct, bereich });
  } catch {}
}

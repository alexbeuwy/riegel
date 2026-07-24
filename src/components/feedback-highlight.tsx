"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { buildFeedbackPrompt, decodeFeedbackLocator, FEEDBACK_PARAM, type FeedbackLocator } from "@/lib/feedback-locator";

/**
 * Gegenstück zum Feedback-Widget: Landet man über den „Seite öffnen"-Link aus
 * der Feedback-Mail auf der Seite (Query `?fb=…`), scrollt diese Komponente zur
 * kommentierten Stelle, setzt einen präzisen roten Pin GENAU auf den Klickpunkt
 * (damit unmissverständlich ist, was gemeint ist) und umrandet zusätzlich das
 * konkret angeklickte Element. Ein Popup zeigt den Kommentar plus einen Button,
 * der einen fertigen Claude-Code-Prompt in die Zwischenablage legt (Wunsch Alex).
 *
 * Wiederfinden bewusst präzise: unter allen Elementen, deren Text den
 * gespeicherten Ausschnitt enthält (bzw. den CSS-Pfad treffen), wird das
 * FLÄCHENMÄSSIG KLEINSTE gewählt — sonst würde ein großer Container markiert
 * und man sähe nicht, was genau gemeint ist. Ohne Textanker (z. B. Bild-Klick)
 * greift elementFromPoint an der gespeicherten Klickposition. Der Pin sitzt
 * immer exakt auf der Klickstelle, unabhängig vom gefundenen Element.
 */

const flaeche = (el: Element): number => {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
};

/** Kleinstes sinnvolles Element zur gespeicherten Stelle (s. Kopfkommentar). */
function findElement(loc: FeedbackLocator): HTMLElement | null {
  const wanted = loc.t.trim().toLowerCase();
  const candidates: HTMLElement[] = [];

  if (wanted.length >= 3) {
    // Alle Elemente, deren Text den Ausschnitt enthält — das kleinste ist am
    // präzisesten (Blatt-Element statt Container).
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const t = (el.textContent ?? "").trim().toLowerCase();
      if (t && t.includes(wanted)) candidates.push(el);
    });
  }
  if (loc.p) {
    try {
      document.querySelectorAll<HTMLElement>(loc.p).forEach((el) => candidates.push(el));
    } catch {
      // ungültiger Selektor -> ignorieren
    }
  }

  let best: HTMLElement | null = null;
  let bestArea = Infinity;
  for (const el of candidates) {
    const a = flaeche(el);
    if (a > 0 && a < bestArea) {
      best = el;
      bestArea = a;
    }
  }
  return best;
}

export function FeedbackHighlight() {
  const [data, setData] = useState<{ loc: FeedbackLocator; path: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decoded = decodeFeedbackLocator(params.get(FEEDBACK_PARAM));
    if (!decoded) return;
    const pathname = window.location.pathname;

    // Den fb-Parameter aus der Adresszeile entfernen (sauberer URL-Zustand,
    // ohne Reload/Rerender), damit ein Teilen/Neuladen den Overlay nicht ewig
    // wiederholt — der Zustand hier bleibt über setData erhalten.
    params.delete(FEEDBACK_PARAM);
    const clean = `${pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", clean);

    // Element nach dem ersten Paint suchen (Bilder/Layout gesetzt). setData
    // läuft im rAF-Callback (asynchron) — keine synchrone Effekt-State-Änderung.
    const marks: HTMLElement[] = [];
    const raf = requestAnimationFrame(() => {
      // Absolute Klickposition im Dokument: y ist dokumenthöhen-relativ
      // gespeichert, x viewportbreiten-relativ (Seiten scrollen nie horizontal).
      const doc = document.documentElement;
      const pinX = (decoded.x / 100) * doc.clientWidth;
      const pinY = (decoded.y / 100) * doc.scrollHeight;

      let el = findElement(decoded);
      // Zu grob (mehr als ~50% der Viewportfläche, z. B. ganze Content-Spalte)
      // oder gar nichts gefunden: an der Klickposition nachschärfen.
      const zuGrob = (e: HTMLElement) => {
        const r = e.getBoundingClientRect();
        return r.width * r.height > window.innerWidth * window.innerHeight * 0.5;
      };
      if (!el || zuGrob(el)) {
        window.scrollTo({ top: pinY - window.innerHeight / 2 });
        const hit = document.elementFromPoint(
          Math.min(pinX, window.innerWidth - 2),
          Math.max(0, Math.min(pinY - window.scrollY, window.innerHeight - 2)),
        );
        if (hit instanceof HTMLElement && !zuGrob(hit)) el = hit;
        else if (el && zuGrob(el)) el = null; // lieber nur Pin als riesige Umrandung
      }

      // Umrandung NUR um ein präzises Element — nie um ganze Spalten.
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const rect = el.getBoundingClientRect();
        const outline = document.createElement("div");
        outline.className = "feedback-hl-outline";
        Object.assign(outline.style, {
          position: "absolute",
          left: `${window.scrollX + rect.left - 6}px`,
          top: `${window.scrollY + rect.top - 6}px`,
          width: `${rect.width + 12}px`,
          height: `${rect.height + 12}px`,
        });
        document.body.appendChild(outline);
        marks.push(outline);
      } else {
        window.scrollTo({ top: pinY - window.innerHeight / 2, behavior: "smooth" });
      }

      // Präziser Pin IMMER exakt auf der Klickstelle — damit ist auch bei
      // grobem Element-Match unmissverständlich, was gemeint war.
      const pin = document.createElement("div");
      pin.className = "feedback-hl-pin";
      Object.assign(pin.style, { position: "absolute", left: `${pinX}px`, top: `${pinY}px` });
      document.body.appendChild(pin);
      marks.push(pin);

      setData({ loc: decoded, path: pathname });
    });

    return () => {
      cancelAnimationFrame(raf);
      marks.forEach((m) => m.remove());
    };
  }, []);

  if (!data) return null;
  const { loc, path } = data;

  const prompt = buildFeedbackPrompt(path, loc);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blockiert: Prompt zum manuellen Kopieren markieren.
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        /* aufgeben */
      }
      ta.remove();
    }
  };

  const close = () => {
    document.querySelector(".feedback-hl-outline")?.remove();
    setData(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Feedback-Stelle"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[24rem]"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#e5484d" }}>
            <Icon name="doc" size={13} className="text-white" />
          </span>
          Feedback-Stelle
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Schließen"
          className="press flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      {loc.c && (
        <p className="mb-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg">
          {loc.c}
        </p>
      )}
      <button
        type="button"
        onClick={copy}
        className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Icon name={copied ? "check" : "doc"} size={16} />
        {copied ? "Prompt kopiert" : "Prompt für Claude Code kopieren"}
      </button>
      <p className="mt-2 text-center text-[11px] text-faint">
        In Claude Code einfügen, um die Änderung umsetzen zu lassen.
      </p>
    </div>
  );
}


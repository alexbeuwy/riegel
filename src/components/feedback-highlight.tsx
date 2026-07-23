"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { decodeFeedbackLocator, FEEDBACK_PARAM, type FeedbackLocator } from "@/lib/feedback-locator";

/**
 * Gegenstück zum Feedback-Widget: Landet man über den „Seite öffnen"-Link aus
 * der Feedback-Mail auf der Seite (Query `?fb=…`), scrollt diese Komponente zur
 * kommentierten Stelle, umrandet sie mit einer roten Puls-Animation und zeigt
 * ein Popup mit Sissys Kommentar plus einem Button, der einen fertigen
 * Claude-Code-Prompt in die Zwischenablage legt (Wunsch Alex).
 *
 * Wiederfinden defensiv, in dieser Reihenfolge: (1) CSS-Pfad, davon das Element,
 * dessen Text den gespeicherten Ausschnitt enthält; (2) irgendein Element mit
 * passendem Text; (3) grobes Scrollziel über die gespeicherte y-Position. So
 * bleibt der Sprung nützlich, selbst wenn sich Markup seit dem Kommentar
 * leicht geändert hat.
 */

function findElement(loc: FeedbackLocator): HTMLElement | null {
  const wanted = loc.t.trim().toLowerCase();
  // (1) CSS-Pfad + Textabgleich
  if (loc.p) {
    try {
      const byPath = Array.from(document.querySelectorAll<HTMLElement>(loc.p));
      if (byPath.length === 1 && !wanted) return byPath[0];
      const hit = byPath.find((el) => (el.textContent ?? "").toLowerCase().includes(wanted));
      if (hit) return hit;
      if (byPath.length > 0 && !wanted) return byPath[0];
    } catch {
      // Ungültiger Selektor (z. B. Sonderzeichen in Klassen) — weiter zu (2).
    }
  }
  // (2) Textabgleich über gängige Block-Elemente
  if (wanted.length >= 4) {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("section, article, div, p, h1, h2, h3, figure, img, li, a, button"),
    );
    // Das TEXTLICH kleinste passende Element bevorzugen (präzisere Stelle).
    let best: HTMLElement | null = null;
    let bestLen = Infinity;
    for (const el of candidates) {
      const t = (el.textContent ?? "").toLowerCase();
      if (t.includes(wanted) && t.length < bestLen) {
        best = el;
        bestLen = t.length;
      }
    }
    if (best) return best;
  }
  return null;
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
    let outline: HTMLElement | null = null;
    const raf = requestAnimationFrame(() => {
      const el = findElement(decoded);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const rect = el.getBoundingClientRect();
        outline = document.createElement("div");
        outline.className = "feedback-hl-outline";
        Object.assign(outline.style, {
          position: "absolute",
          left: `${window.scrollX + rect.left - 6}px`,
          top: `${window.scrollY + rect.top - 6}px`,
          width: `${rect.width + 12}px`,
          height: `${rect.height + 12}px`,
        });
        document.body.appendChild(outline);
      } else {
        // Kein Element gefunden: wenigstens grob zur gespeicherten Höhe scrollen.
        window.scrollTo({ top: (document.documentElement.scrollHeight * decoded.y) / 100 - window.innerHeight / 2, behavior: "smooth" });
      }
      setData({ loc: decoded, path: pathname });
    });

    return () => {
      cancelAnimationFrame(raf);
      outline?.remove();
    };
  }, []);

  if (!data) return null;
  const { loc, path } = data;

  const prompt = buildPrompt(path, loc);

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

function buildPrompt(path: string, loc: FeedbackLocator): string {
  const stelle = loc.t ? `„${loc.t}"${loc.p ? ` (${loc.p})` : ""}` : loc.p || "siehe unten";
  const kontext = [`Seite: ${path}`, `Stelle: ${stelle}`];
  if (loc.y) kontext.push(`Ungefähre Position: ${loc.y}% der Seitenhöhe.`);
  return [
    "Änderung auf der RIEGEL-Website umsetzen.",
    "",
    ...kontext,
    "",
    "Feedback vom Team:",
    loc.c || "(kein Kommentartext übermittelt)",
    "",
    "Bitte die zuständige Komponente/Datei finden und die Änderung sauber umsetzen (tsc/eslint/Build grün, dann committen und pushen).",
  ].join("\n");
}

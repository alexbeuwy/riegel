"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Teilen-Button — nutzt navigator.share (Mobile/Safari, nativer Share-Sheet).
 * Ohne dessen Unterstützung (Desktop-Browser) Clipboard-Fallback mit kurzem
 * "Link kopiert"-Hinweis direkt am Button (2 s, dann zurück auf Normal) —
 * ein eigener Toast wäre für so eine kleine Mikro-Aktion Overkill.
 */
export function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleClick = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Abbruch durch den Nutzer (AbortError) o. Ä. — kein Fehlerzustand nötig.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API blockiert (Berechtigung/Kontext) — die URL bleibt in der
      // Adresszeile weiterhin manuell kopierbar, daher kein Fehlerzustand.
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? "Link kopiert" : "Immobilie teilen"}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur transition-colors hover:text-accent ${className}`}
      >
        <Icon name={copied ? "check" : "arrowUpRight"} size={16} />
      </button>
      {/* Feedback direkt am Button statt separatem Toast — kurzlebig, blendet
          per CSS-Transition ein/aus (reduced-motion greift global, s. globals.css). */}
      <span
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-fg shadow-lg transition-opacity duration-200 ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        Link kopiert
      </span>
    </span>
  );
}

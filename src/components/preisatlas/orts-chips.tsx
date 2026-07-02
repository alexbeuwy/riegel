"use client";

import type { MarktOrt } from "@/lib/marktdaten";

export interface OrtsChipsProps {
  orte: MarktOrt[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  ariaLabel?: string;
}

/**
 * Consent-freier Fallback + Schnellzugriff: wrapbare Chip-Leiste aller Orte.
 * Funktioniert ohne Karten-Consent — Pflicht-Interaktionspfad der Seite.
 */
export function OrtsChips({ orte, selectedSlug, onSelect, ariaLabel = "Standort wählen" }: OrtsChipsProps) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label={ariaLabel}>
      {orte.map((ort) => {
        const active = ort.slug === selectedSlug;
        return (
          <button
            key={ort.slug}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(ort.slug)}
            className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
              active
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-muted hover:border-accent/50 hover:text-fg"
            }`}
          >
            {ort.name}
          </button>
        );
      })}
    </div>
  );
}

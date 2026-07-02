"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
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
            className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-[color,border-color,background-color,transform] duration-200 ${
              active
                ? "border-accent bg-accent text-on-accent"
                : "border-border text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:text-fg"
            }`}
          >
            {ort.name}
          </button>
        );
      })}
    </div>
  );
}

export interface OrtsSucheProps {
  orte: MarktOrt[];
  onSelect: (slug: string) => void;
  /** Optionaler Platzhalter-Text, Default deckt den Preisatlas-Fall ab. */
  placeholder?: string;
}

const MAX_TREFFER = 6;

/**
 * Städte-Suche für den Preisatlas — Combobox-Muster wie hero-address-search.tsx
 * (aria, Pfeiltasten, .press), aber lokal auf die 18 Marktorte gefiltert statt
 * gegen eine Geokodierungs-API. Kein Treffer → ehrlicher Hinweis statt stiller
 * Leere: HomeDay deckt bundesweit ab, RIEGEL bewusst nur die eigene Region.
 */
export function OrtsSuche({ orte, onSelect, placeholder = "Stadt suchen …" }: OrtsSucheProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();
  const matches = query.length === 0 ? [] : orte.filter((o) => o.name.toLowerCase().includes(query)).slice(0, MAX_TREFFER);
  const noMatch = query.length >= 2 && matches.length === 0;
  const listboxId = "atlas-orte-listbox";

  // Klick außerhalb schließt die Vorschläge (wie hero-address-search.tsx).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(ort: MarktOrt) {
    onSelect(ort.slug);
    setQ(ort.name);
    setOpen(false);
    setActiveIdx(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pickMatch = activeIdx >= 0 ? matches[activeIdx] : matches[0];
      if (pickMatch) pick(pickMatch);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 transition-colors focus-within:border-accent">
        <Icon name="search" size={16} className="shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => q.trim().length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Stadt im Preisatlas suchen"
          role="combobox"
          aria-expanded={open && (matches.length > 0 || noMatch)}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-fg outline-none placeholder:text-faint"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
              setActiveIdx(-1);
            }}
            aria-label="Suche leeren"
            className="press -m-3 shrink-0 rounded-full p-3 text-faint transition-colors hover:text-fg"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {open && (matches.length > 0 || noMatch) && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Städtevorschläge"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        >
          {matches.map((o, i) => (
            <li key={o.slug} id={`${listboxId}-${i}`} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                onClick={() => pick(o)}
                onMouseEnter={() => setActiveIdx(i)}
                tabIndex={-1}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === activeIdx ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon name="pin" size={14} className="shrink-0 text-faint" />
                <span className="truncate">{o.name}</span>
              </button>
            </li>
          ))}
          {noMatch && (
            <li className="px-4 py-4 text-sm">
              <p className="text-muted">
                Für ‚{q.trim()}&apos; liegen uns noch keine Marktdaten vor — für eine genaue Einschätzung
                nutzen Sie den kostenlosen Rechner.
              </p>
              <Link
                href="/rechner"
                className="press mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                <Icon name="calculator" size={14} />
                Kostenlos berechnen
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

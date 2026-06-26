"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { searchAddress, type GeoResult } from "@/lib/geocode";

/**
 * Hero-Schnelleinstieg: Adresse eingeben → direkt in den Immorechner,
 * der die Lage schon als Satellitenbild zeigt. Kein Zwischen-Button.
 */
export function HeroAddressSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchAddress(q, ctrl.signal);
      setSuggestions(res);
      setOpen(true);
      setSearching(false);
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Klick außerhalb schließt die Vorschläge.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function goToRechner(g: GeoResult) {
    const p = new URLSearchParams({
      address: g.label,
      lat: String(g.lat),
      lng: String(g.lng),
      city: g.city,
      plz: g.postcode,
    });
    router.push(`/rechner?${p.toString()}`);
  }

  function onSubmit() {
    if (suggestions[0]) goToRechner(suggestions[0]);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <div className="t-dropdown-anchor flex items-center gap-2 rounded-full border border-border bg-bg/70 p-1.5 pl-5 shadow-2xl backdrop-blur-md transition-colors focus-within:border-accent">
        <Icon name="pin" size={18} className="shrink-0 text-accent" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Adresse eingeben — Wert in 60 Sekunden"
          aria-label="Adresse Ihrer Immobilie"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-fg outline-none placeholder:text-faint"
        />
        <button
          type="button"
          onClick={onSubmit}
          aria-label="Immobilie bewerten"
          className="press group inline-flex shrink-0 items-center gap-2 rounded-full bg-accent py-2.5 pl-5 pr-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          <span className="hidden sm:inline">Bewerten</span>
          <Icon
            name="arrowRight"
            size={18}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </button>
      </div>

      {open && (suggestions.length > 0 || searching) && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {searching && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-faint">Adressen werden gesucht …</li>
          )}
          {suggestions.map((s) => (
            <li key={`${s.lat},${s.lng}`}>
              <button
                type="button"
                onClick={() => goToRechner(s)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Icon name="pin" size={16} className="shrink-0 text-faint" />
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 pl-2 text-xs text-faint">
        Kostenlos &amp; ohne Anmeldung · inkl. Satellitenansicht Ihrer Lage
      </p>
    </div>
  );
}

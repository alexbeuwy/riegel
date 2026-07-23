"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { searchAddress } from "@/lib/geocode";

/**
 * Ort-Eingabe fürs Portal als Combobox statt Dropdown-Vorauswahl: bekannte
 * Portal-Orte (Objekte im Bestand) UND frei eingetippte Städte per
 * Autocomplete (Photon via /api/geocode, DSGVO-Proxy wie im Hero). Grund
 * (Kundenwunsch): ein Suchauftrag soll auch Orte abdecken, in denen es
 * HEUTE noch kein Objekt gibt — das Matching-Tool benachrichtigt dann,
 * sobald dort etwas online geht.
 *
 * Verhalten: Vorschlag anklicken oder Enter übernimmt den Ort; Escape/Blur
 * verwirft ungespeicherte Tipp-Eingaben (Anzeige springt auf den aktiven
 * Wert zurück — vorhersehbar statt versehentlicher Halb-Filter). Beim
 * Übernehmen eines Photon-Vorschlags wandern dessen Koordinaten mit
 * (onChange geo) — Basis für die Umkreissuche in Orten ohne Bestand.
 */
export interface OrtGeo {
  lat: number;
  lng: number;
}

interface Suggestion {
  city: string;
  /** "Portal" = Ort mit aktuellem Bestand, "geo" = freier Photon-Treffer. */
  source: "portal" | "geo";
  geo?: OrtGeo;
}

export function OrtCombobox({
  value,
  onChange,
  knownOrte,
  variant = "pill",
}: {
  value: string;
  onChange: (city: string, geo?: OrtGeo) => void;
  knownOrte: string[];
  /** "pill" = Desktop-Filterleiste (rund, Icon), "sheet" = Mobil-Sheet (Label + volle Breite). */
  variant?: "pill" | "sheet";
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [hi, setHi] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  // Externen Wert (URL-Param, Chip-Entfernen) in die Anzeige spiegeln.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Anzeige folgt dem URL-Wert (Präzedenz: reveal.tsx/modal.tsx)
    setText(value);
  }, [value]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const suggest = (q: string) => {
    const qn = q.trim().toLowerCase();
    const lokal: Suggestion[] = knownOrte
      .filter((o) => !qn || o.toLowerCase().includes(qn))
      .slice(0, 6)
      .map((o) => ({ city: o, source: "portal" as const }));
    setItems(lokal);
    setHi(0);
    abortRef.current?.abort();
    if (qn.length < 3) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // Photon-Städte dazu mischen (dedupliziert, max. 8 gesamt) — die
    // City-Namen der Adress-Treffer reichen für einen Orts-Filter.
    searchAddress(q, ctrl.signal).then((results) => {
      if (ctrl.signal.aborted) return;
      const seen = new Set(lokal.map((s) => s.city.toLowerCase()));
      const geo: Suggestion[] = [];
      for (const r of results) {
        const c = r.city.trim();
        if (!c || seen.has(c.toLowerCase())) continue;
        seen.add(c.toLowerCase());
        geo.push({ city: c, source: "geo", geo: { lat: r.lat, lng: r.lng } });
      }
      setItems([...lokal, ...geo].slice(0, 8));
    });
  };

  const apply = (s: Suggestion | null, raw?: string) => {
    const city = (s?.city ?? raw ?? "").trim();
    setOpen(false);
    setText(city);
    onChange(city, s?.geo);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      apply(open ? items[hi] ?? null : null, text);
    } else if (e.key === "Escape") {
      setOpen(false);
      setText(value);
    }
  };

  const active = !!value;
  const inputCls =
    variant === "pill"
      ? `press h-11 w-40 rounded-full border bg-surface py-2 pl-9 pr-8 text-sm outline-none transition-colors focus-visible:border-accent lg:h-10 ${
          active ? "border-accent text-fg" : "border-border text-fg hover:border-accent"
        }`
      : "w-full rounded-lg border border-border bg-surface px-4 py-3 pr-9 text-fg outline-none transition-colors focus:border-accent";

  const field = (
    <div ref={wrapRef} className="relative">
      {variant === "pill" && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${active ? "text-accent" : "text-muted"}`}
        >
          <Icon name="pin" size={15} />
        </span>
      )}
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Ort"
        placeholder="Ort"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          suggest(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          suggest(text);
        }}
        onBlur={() => {
          // Klicks auf Vorschläge feuern via onMouseDown VOR dem Blur —
          // hier nur noch aufräumen: Dropdown zu, Anzeige zurück auf den
          // aktiven Wert (kein versehentliches Übernehmen halber Eingaben).
          setTimeout(() => {
            setOpen(false);
            setText((t) => (t.trim() === value ? t : value));
          }, 120);
        }}
        onKeyDown={onKey}
        className={inputCls}
      />
      {active && (
        <button
          type="button"
          aria-label="Ort entfernen"
          onMouseDown={(e) => {
            e.preventDefault();
            apply(null, "");
          }}
          className={`absolute top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-accent ${
            variant === "pill" ? "right-2.5" : "right-3"
          }`}
        >
          <Icon name="close" size={14} />
        </button>
      )}
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-72 w-64 overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {items.map((s, i) => (
            <li key={`${s.source}-${s.city}`} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(s);
                }}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === hi ? "bg-accent/10 text-fg" : "text-fg"
                }`}
              >
                <span className="truncate">{s.city}</span>
                {s.source === "portal" && (
                  <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                    im Angebot
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "sheet") {
    return (
      <label className="block space-y-2">
        <span className="text-sm text-muted">Ort</span>
        {field}
      </label>
    );
  }
  return field;
}

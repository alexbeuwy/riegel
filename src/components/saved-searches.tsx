"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { activeChips, parseFilters } from "@/lib/portal-filter";
import { marketingLabel } from "@/lib/format";

export interface SavedSearch {
  id: string;
  label: string;
  query: string;
  notify: boolean;
  createdAt: number;
}

type Ctx = {
  searches: SavedSearch[];
  add: (query: string, label: string) => void;
  remove: (id: string) => void;
  toggleNotify: (id: string) => void;
  ready: boolean;
};

const C = createContext<Ctx | null>(null);
const KEY = "riegel:searches";

export function SavedSearchesProvider({ children }: { children: ReactNode }) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(KEY);
      if (r) setSearches(JSON.parse(r));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(searches));
    } catch {}
  }, [searches, ready]);

  const add = (query: string, label: string) =>
    setSearches((s) =>
      s.some((x) => x.query === query)
        ? s
        : [{ id: `${Date.now()}-${s.length}`, label, query, notify: true, createdAt: Date.now() }, ...s],
    );
  const remove = (id: string) => setSearches((s) => s.filter((x) => x.id !== id));
  const toggleNotify = (id: string) =>
    setSearches((s) => s.map((x) => (x.id === id ? { ...x, notify: !x.notify } : x)));

  return (
    <C.Provider value={{ searches, add, remove, toggleNotify, ready }}>{children}</C.Provider>
  );
}

export function useSavedSearches() {
  const c = useContext(C);
  if (!c) throw new Error("useSavedSearches must be used within SavedSearchesProvider");
  return c;
}

/** „Suche speichern" — speichert die aktuellen Filter (URL) als Suchauftrag. */
export function SaveSearchButton() {
  const sp = useSearchParams();
  const { add } = useSavedSearches();
  const [saved, setSaved] = useState(false);

  const onSave = () => {
    const obj: Record<string, string> = {};
    sp.forEach((v, k) => {
      obj[k] = v;
    });
    const f = parseFilters(obj);
    const chips = activeChips(f).map((c) => c.label);
    const label = `${marketingLabel(f.typ)}${chips.length ? " · " + chips.join(" · ") : " · alle Objekte"}`;
    add(sp.toString(), label);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={onSave}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
    >
      {saved ? "Suchauftrag gespeichert ✓" : "Suche speichern"}
    </button>
  );
}

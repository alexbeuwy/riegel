"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type FavCtx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
};

const Ctx = createContext<FavCtx | null>(null);
const KEY = "riegel:favorites";

/**
 * Merkliste — vorerst localStorage (anonym). In M3 wird bei Login mit Supabase
 * gemerged. Provider in layout.tsx; Hooks/Buttons sind Client-only.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {}
  }, [ids, ready]);

  const toggle = (id: string) =>
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Ctx.Provider value={{ ids, has: (id) => ids.includes(id), toggle, count: ids.length, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFavorites() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFavorites must be used within FavoritesProvider");
  return c;
}

const HeartPath = (
  <path
    d="M12 20.3 4.2 12.5a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l1.3 1.3 1.3-1.3a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5L12 20.3Z"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export function FavoriteButton({ id, className = "" }: { id: string; className?: string }) {
  const { has, toggle, ready } = useFavorites();
  const active = ready && has(id);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-colors ${
        active ? "bg-accent text-on-accent" : "bg-bg/70 text-fg hover:text-accent"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" width={18} height={18} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden>
        {HeartPath}
      </svg>
    </button>
  );
}

export function FavoritesLink() {
  const { count, ready } = useFavorites();
  return (
    <Link
      href="/merkliste"
      aria-label={`Merkliste${ready && count ? ` (${count})` : ""}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        {HeartPath}
      </svg>
      <span className="t-badge" data-open={ready && count > 0 ? "true" : "false"}>
        <span className="t-badge-dot flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-on-accent">
          {count}
        </span>
      </span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth";
import { Icon } from "@/components/icon";
import { supabase } from "@/lib/supabase";

type FavCtx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Entfernt gemerkte IDs, die es im echten Objektbestand nicht mehr gibt
   *  (verkauft/offline). Nur mit den ECHTEN Live-IDs aufrufen — s. Merkliste. */
  reconcile: (validIds: string[]) => void;
  count: number;
  ready: boolean;
};

const Ctx = createContext<FavCtx | null>(null);
const KEY = "riegel:favorites";
// Alt-Favoriten aus der Mock-Phase: IDs im Format "e1".."e10". Echte OnOffice-
// IDs sind reine Zahlen — diese Alt-IDs matchen kein reales Objekt mehr und
// würden nur den Zähler künstlich hochhalten ("2 Herzen ohne Objekt"-Bug).
const LEGACY_MOCK_ID = /^e\d+$/;
// Einmaliger Hinweis beim allerersten Herz-Klick (Flag bleibt dauerhaft in
// localStorage — daher zeigt sich der Hinweis nie ein zweites Mal an).
const HINT_KEY = "riegel-fav-hint-gesehen";

/**
 * Merkliste — localStorage als Basis (anonym, sofort). Bei Login (Supabase aktiv)
 * werden lokale Favoriten mit dem Konto gemerged und write-through synchronisiert.
 * Fehlt die Tabelle oder die Konfiguration, bleibt alles still auf localStorage.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        // Legacy-Mock-IDs beim Laden aussortieren — sonst zeigt der Header-Zähler
        // Favoriten, zu denen es kein Objekt mehr gibt (Portal ist jetzt live).
        const cleaned = (JSON.parse(raw) as string[]).filter((id) => !LEGACY_MOCK_ID.test(id));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIds(cleaned);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {}
  }, [ids, ready]);

  // Bei Login: Konto-Favoriten laden, mit lokalen mergen, lokale hochschieben.
  useEffect(() => {
    if (!supabase || !user || !ready) return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const { data, error } = await supabase!
          .from("favorites")
          .select("estate_id")
          .eq("user_id", user.id);
        if (error) return; // Tabelle fehlt o. Ä. → lokal bleiben
        const remote = (data ?? []).map((r) => r.estate_id as string);
        const localOnly = ids.filter((id) => !remote.includes(id));
        if (localOnly.length) {
          await supabase!
            .from("favorites")
            .upsert(localOnly.map((estate_id) => ({ user_id: user.id, estate_id })));
        }
        setIds(Array.from(new Set([...remote, ...ids])));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready]);

  useEffect(() => {
    if (!user) syncedFor.current = null;
  }, [user]);

  // Beim allerersten "Hinzufügen"-Klick (nicht beim Entfernen) den Merk-Hinweis
  // zeigen. Das Flag landet dauerhaft in localStorage — der Hinweis erscheint
  // also über die gesamte Lebenszeit dieses Browsers nur ein einziges Mal.
  const maybeShowHint = () => {
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
    setShowHint(true);
  };

  const toggle = (id: string) =>
    setIds((cur) => {
      const has = cur.includes(id);
      if (supabase && user) {
        if (has) {
          supabase.from("favorites").delete().eq("user_id", user.id).eq("estate_id", id).then(undefined, () => {});
        } else {
          supabase.from("favorites").upsert({ user_id: user.id, estate_id: id }).then(undefined, () => {});
        }
      }
      if (!has) maybeShowHint();
      return has ? cur.filter((x) => x !== id) : [...cur, id];
    });

  // Gemerkte IDs entfernen, die nicht mehr im (echten) Bestand sind. Bewusst
  // ohne Merk-Hinweis und mit Supabase-Cleanup pro entfernter ID.
  const reconcile = (validIds: string[]) =>
    setIds((cur) => {
      const valid = new Set(validIds);
      const stale = cur.filter((id) => !valid.has(id));
      if (!stale.length) return cur;
      if (supabase && user) {
        for (const id of stale) {
          supabase.from("favorites").delete().eq("user_id", user.id).eq("estate_id", id).then(undefined, () => {});
        }
      }
      return cur.filter((id) => valid.has(id));
    });

  return (
    <Ctx.Provider value={{ ids, has: (id) => ids.includes(id), toggle, reconcile, count: ids.length, ready }}>
      {children}
      {showHint && <FavHint onDone={() => setShowHint(false)} />}
    </Ctx.Provider>
  );
}

/**
 * Einmaliger Merk-Hinweis-Toast (erster Herz-Klick im Browser) — dezent unten
 * mittig, blendet nach ~5 s von selbst aus. Auto-Hide läuft über die Dauer der
 * .t-fav-hint-Keyframe (globals.css), onAnimationEnd räumt danach den Knoten
 * weg (Muster wie .game-quip: reduced-motion kürzt nur die Dauer statt die
 * Animation abzuschalten, sonst bliebe der Toast dauerhaft stehen).
 */
function FavHint({ onDone }: { onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[70] flex justify-center sm:inset-x-0">
      <div
        onAnimationEnd={onDone}
        className="t-fav-hint pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-surface-2/95 px-4 py-3 text-sm shadow-2xl backdrop-blur-md"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent">
          <Icon name="heart" size={15} />
        </span>
        <p className="text-muted">
          Gemerkt — gespeichert in diesem Browser.{" "}
          <Link href="/konto" className="font-medium text-accent hover:underline">
            Mit Konto: auf jedem Gerät.
          </Link>
        </p>
      </div>
    </div>
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
      className="relative flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
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

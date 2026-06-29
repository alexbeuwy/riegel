"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { activeChips, parseFilters } from "@/lib/portal-filter";
import { marketingLabel } from "@/lib/format";
import { useAuth } from "@/components/auth";
import { supabase } from "@/lib/supabase";

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
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [ready, setReady] = useState(false);
  const syncedFor = useRef<string | null>(null);

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

  // Bei Login: Konto-Suchen laden, lokale (per query) mergen + hochschieben.
  useEffect(() => {
    if (!supabase || !user || !ready) return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const { data, error } = await supabase!
          .from("saved_searches")
          .select("id,label,query,notify,created_at")
          .eq("user_id", user.id);
        if (error) return;
        const remote: SavedSearch[] = (data ?? []).map((r) => ({
          id: r.id as string,
          label: (r.label as string) ?? "",
          query: r.query as string,
          notify: !!r.notify,
          createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
        }));
        const remoteQ = new Set(remote.map((r) => r.query));
        const localOnly = searches.filter((s) => !remoteQ.has(s.query));
        if (localOnly.length) {
          await supabase!
            .from("saved_searches")
            .upsert(
              localOnly.map((s) => ({ user_id: user.id, label: s.label, query: s.query, notify: s.notify })),
              { onConflict: "user_id,query" },
            );
        }
        setSearches([...remote, ...localOnly].sort((a, b) => b.createdAt - a.createdAt));
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready]);

  useEffect(() => {
    if (!user) syncedFor.current = null;
  }, [user]);

  const add = (query: string, label: string) => {
    setSearches((s) =>
      s.some((x) => x.query === query)
        ? s
        : [{ id: `${Date.now()}-${s.length}`, label, query, notify: true, createdAt: Date.now() }, ...s],
    );
    if (supabase && user) {
      supabase
        .from("saved_searches")
        .upsert({ user_id: user.id, label, query, notify: true }, { onConflict: "user_id,query" })
        .then(undefined, () => {});
    }
  };
  const remove = (id: string) =>
    setSearches((s) => {
      const target = s.find((x) => x.id === id);
      if (supabase && user && target) {
        supabase.from("saved_searches").delete().eq("user_id", user.id).eq("query", target.query).then(undefined, () => {});
      }
      return s.filter((x) => x.id !== id);
    });
  const toggleNotify = (id: string) =>
    setSearches((s) =>
      s.map((x) => {
        if (x.id !== id) return x;
        const notify = !x.notify;
        if (supabase && user) {
          supabase.from("saved_searches").update({ notify }).eq("user_id", user.id).eq("query", x.query).then(undefined, () => {});
        }
        return { ...x, notify };
      }),
    );

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

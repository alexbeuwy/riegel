"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { activeChips, type FilterState } from "@/lib/portal-filter";

export function ActiveChips({
  filters,
  resultCount,
}: {
  filters: FilterState;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const chips = activeChips(filters);

  // Das mobile Filter-Sheet (filter-bar.tsx) braucht resultCount für den
  // fixierten "X Objekte anzeigen"-Button. FilterBar bekommt die Zahl nicht
  // als Prop (gemeinsamer Elternteil ist die Server-Component-Seite, die wir
  // laut Auftrag nicht anfassen) — daher Broadcast statt Prop-Drilling.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<number>("riegel:portal-result-count", { detail: resultCount }));
  }, [resultCount]);

  const remove = (param: string) => {
    const p = new URLSearchParams(sp.toString());
    p.delete(param);
    p.delete("seite");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const resetAll = () => {
    const p = new URLSearchParams();
    if (filters.typ === "miete") p.set("typ", "miete");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span aria-live="polite" className="text-sm font-medium text-fg">
        <span key={resultCount} className="t-num-d">
          {resultCount}
        </span>{" "}
        {resultCount === 1 ? "Objekt" : "Objekte"}
      </span>
      {chips.length > 0 && <span className="text-faint">·</span>}
      {chips.map((c) => (
        <button
          key={c.param}
          onClick={() => remove(c.param)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg transition-colors hover:border-accent"
        >
          {c.label}
          <span aria-hidden>×</span>
          <span className="sr-only">entfernen</span>
        </button>
      ))}
      {chips.length > 0 && (
        <button
          onClick={resetAll}
          className="text-xs text-muted underline underline-offset-2 hover:text-fg"
        >
          Alle zurücksetzen
        </button>
      )}
    </div>
  );
}

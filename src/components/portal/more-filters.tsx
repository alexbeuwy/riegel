"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/modal";
import { Icon } from "@/components/icon";
import { ENERGIEKLASSEN, type FilterState } from "@/lib/portal-filter";

const BAUJAHRE = [1950, 1970, 1990, 2000, 2010, 2015, 2020];
const selectCls =
  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none transition-colors focus:border-accent";

export function MoreFilters({ filters }: { filters: FilterState }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = (name: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    p.delete("seite");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const reset = () => {
    const p = new URLSearchParams(sp.toString());
    p.delete("baujahr_min");
    p.delete("energieklasse_max");
    p.delete("seite");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const activeExtra = (filters.energieklasseMax ? 1 : 0) + (filters.baujahrMin != null ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`press inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm ${
          activeExtra ? "border-accent text-accent" : "border-border text-muted hover:text-fg"
        }`}
      >
        <Icon name="layers" size={15} />
        Mehr Filter{activeExtra ? ` (${activeExtra})` : ""}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Mehr Filter">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-muted">Baujahr ab</span>
            <select
              className={selectCls}
              value={filters.baujahrMin?.toString() ?? ""}
              onChange={(e) => set("baujahr_min", e.target.value)}
            >
              <option value="">egal</option>
              {BAUJAHRE.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Energieeffizienzklasse bis</span>
            <select
              className={selectCls}
              value={filters.energieklasseMax ?? ""}
              onChange={(e) => set("energieklasse_max", e.target.value)}
            >
              <option value="">egal</option>
              {ENERGIEKLASSEN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-end gap-4 pt-2">
            <button type="button" onClick={reset} className="text-sm text-muted hover:text-fg">
              Zurücksetzen
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Fertig
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

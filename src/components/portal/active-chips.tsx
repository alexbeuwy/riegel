"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { activeChips, type FilterState } from "@/lib/portal-filter";
import { readRadiusKm, setCity, setRadius, umkreisChipLabel } from "@/components/portal/umkreis";

interface Chip {
  key: string;
  label: string;
  /** Zahlen tabellarisch setzen (gleichmäßige Ziffernbreite). */
  tabular?: boolean;
  onRemove: () => void;
}

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

  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("seite");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const remove = (param: string) => update((p) => p.delete(param));
  const resetAll = () => {
    const p = new URLSearchParams();
    if (filters.typ === "miete") p.set("typ", "miete");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Im Umkreis-Modus steht der Ort in `umkreis_ort` (nicht in `ort`), daher
  // erzeugt activeChips(filters) dafür keinen Chip — Ort + Umkreis werden unten
  // ergänzt (s. umkreis.ts). Umkreis entfernen → zurück auf „Genauer Ort";
  // Ort entfernen → auch der Umkreis fällt weg.
  const umkreisKm = readRadiusKm(sp);
  const umkreisCity = sp.get("umkreis_ort") ?? "";
  const umkreisActive = umkreisKm > 0 && !!umkreisCity;

  const chips: Chip[] = activeChips(filters).map((c) => ({
    key: c.param,
    label: c.label,
    onRemove: () => remove(c.param),
  }));
  if (umkreisActive) {
    chips.push({
      key: "umkreis_ort",
      label: umkreisCity,
      onRemove: () => update((p) => setCity(p, "")),
    });
    chips.push({
      key: "umkreis",
      label: umkreisChipLabel(umkreisKm),
      tabular: true,
      onRemove: () => update((p) => setRadius(p, "")),
    });
  }

  // Sichtbare Treffer-Zahl kommt aus PortalView (Umkreis-korrekt), nicht aus dem
  // serverseitigen resultCount — der zählt im Umkreis-Modus alle Orte, weil
  // `ort` dort bewusst nicht gesetzt ist. Bis der erste Broadcast eintrifft,
  // dient resultCount als Startwert. (Broadcast: PortalView, s. dort.)
  const [liveCount, setLiveCount] = useState<number | null>(null);
  useEffect(() => {
    const onCount = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setLiveCount(detail);
    };
    window.addEventListener("riegel:portal-result-count", onCount);
    return () => window.removeEventListener("riegel:portal-result-count", onCount);
  }, []);
  const shownCount = liveCount ?? resultCount;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span aria-live="polite" className="text-sm font-medium text-fg tabular-nums">
        <span key={shownCount} className="t-num-d">
          {shownCount}
        </span>{" "}
        {shownCount === 1 ? "Objekt" : "Objekte"}
      </span>
      {chips.length > 0 && <span className="text-faint">·</span>}
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.onRemove}
          className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg transition-colors hover:border-accent${
            c.tabular ? " tabular-nums" : ""
          }`}
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

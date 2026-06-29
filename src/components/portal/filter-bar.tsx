"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatEUR } from "@/lib/format";
import { MoreFilters } from "@/components/portal/more-filters";
import { Segmented } from "@/components/segmented";
import { Icon, type IconName } from "@/components/icon";
import type { FilterState } from "@/lib/portal-filter";

const KAUF_PREISE = [100000, 200000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000];
const MIETE_PREISE = [500, 750, 1000, 1250, 1500, 2000, 2500, 3000];
const ZIMMER = [1, 2, 3, 4, 5];
const FLAECHE = [40, 60, 80, 100, 120, 150, 200];

function Select({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  icon?: IconName;
}) {
  // „aktiv", sobald nicht die erste (Platzhalter-/Default-)Option gewählt ist.
  const active = value !== options[0]?.[0];
  return (
    <span className="relative inline-flex shrink-0">
      {icon && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${active ? "text-accent" : "text-muted"}`}
        >
          <Icon name={icon} size={15} />
        </span>
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`press h-11 appearance-none rounded-full border bg-surface py-2 pr-9 text-sm transition-colors focus-visible:border-accent lg:h-10 ${
          icon ? "pl-9" : "pl-4"
        } ${active ? "border-accent text-fg" : "border-border text-fg hover:border-accent"}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-surface text-fg">
            {l}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${active ? "text-accent" : "text-muted"}`}
      >
        <Icon name="chevronDown" size={16} />
      </span>
    </span>
  );
}

export function FilterBar({
  filters,
  orte,
}: {
  filters: FilterState;
  orte: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const update = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mut(p);
      p.delete("seite");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [router, pathname, sp],
  );

  const set = (name: string, value: string) =>
    update((p) => (value ? p.set(name, value) : p.delete(name)));

  const preise = filters.typ === "miete" ? MIETE_PREISE : KAUF_PREISE;
  const priceLabel = (p: number) =>
    filters.typ === "miete" ? `${p} €` : formatEUR(p);

  return (
    <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
      {/* Vermarktungsart — gleitendes Pill (tabs sliding) */}
      <div className="shrink-0">
        <Segmented
          ariaLabel="Vermarktungsart"
          value={filters.typ === "miete" ? "miete" : "kauf"}
          onChange={(v) =>
            // Kauf↔Miete: Preis-Filter zurücksetzen (Kauf- und Mietskalen sind inkompatibel)
            update((p) => {
              if (v === "kauf") p.delete("typ");
              else p.set("typ", "miete");
              p.delete("preis_min");
              p.delete("preis_max");
            })
          }
          options={[
            { value: "kauf", label: "Kaufen" },
            { value: "miete", label: "Mieten" },
          ]}
        />
      </div>

      <Select
        label="Objektart"
        icon="building"
        value={filters.typObj ?? ""}
        onChange={(v) => set("typ_obj", v)}
        options={[
          ["", "Objektart"],
          ["wohnung", "Wohnung"],
          ["haus", "Haus"],
          ["grundstueck", "Grundstück"],
          ["gewerbe", "Gewerbe"],
        ]}
      />
      <Select
        label="Ort"
        icon="pin"
        value={filters.ort ?? ""}
        onChange={(v) => set("ort", v)}
        options={[["", "Alle Orte"], ...orte.map((o) => [o, o] as [string, string])]}
      />
      <Select
        label="Preis ab"
        icon="euro"
        value={filters.preisMin?.toString() ?? ""}
        onChange={(v) => set("preis_min", v)}
        options={[["", "Preis ab"], ...preise.map((p) => [p.toString(), priceLabel(p)] as [string, string])]}
      />
      <Select
        label="Preis bis"
        icon="euro"
        value={filters.preisMax?.toString() ?? ""}
        onChange={(v) => set("preis_max", v)}
        options={[["", "Preis bis"], ...preise.map((p) => [p.toString(), priceLabel(p)] as [string, string])]}
      />
      <Select
        label="Zimmer ab"
        icon="bed"
        value={filters.zimmerMin?.toString() ?? ""}
        onChange={(v) => set("zimmer_min", v)}
        options={[["", "Zimmer"], ...ZIMMER.map((z) => [z.toString(), `${z}+`] as [string, string])]}
      />
      <Select
        label="Wohnfläche ab"
        icon="ruler"
        value={filters.flaecheMin?.toString() ?? ""}
        onChange={(v) => set("flaeche_min", v)}
        options={[["", "Fläche ab"], ...FLAECHE.map((f) => [f.toString(), `${f} m²`] as [string, string])]}
      />
      <Select
        label="Wohnfläche bis"
        icon="ruler"
        value={filters.flaecheMax?.toString() ?? ""}
        onChange={(v) => set("flaeche_max", v)}
        options={[["", "Fläche bis"], ...FLAECHE.map((f) => [f.toString(), `${f} m²`] as [string, string])]}
      />
      <button
        type="button"
        onClick={() => set("provisionsfrei", filters.provisionsfrei ? "" : "1")}
        aria-pressed={!!filters.provisionsfrei}
        className={`press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm lg:h-10 ${
          filters.provisionsfrei
            ? "border-accent text-accent"
            : "border-border text-muted hover:text-fg"
        }`}
      >
        <Icon name="check" size={15} />
        Provisionsfrei
      </button>

      <div className="shrink-0">
        <MoreFilters filters={filters} />
      </div>

      <div className="shrink-0 lg:ml-auto">
        <Select
          label="Sortierung"
          icon="trend"
          value={filters.sort}
          onChange={(v) => set("sort", v === "neu" ? "" : v)}
          options={[
            ["neu", "Neueste"],
            ["preis_asc", "Preis ↑"],
            ["preis_desc", "Preis ↓"],
            ["flaeche", "Fläche"],
            ["zimmer", "Zimmer"],
          ]}
        />
      </div>
    </div>
  );
}

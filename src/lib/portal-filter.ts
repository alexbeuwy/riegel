import type { Estate, MarketingType, ObjectCategory } from "@/lib/mock-estates";
import { categoryLabel, formatEUR } from "@/lib/format";

export type SortKey = "neu" | "preis_asc" | "preis_desc" | "flaeche" | "zimmer";

export interface FilterState {
  typ: MarketingType;
  preisMin?: number;
  preisMax?: number;
  zimmerMin?: number;
  flaecheMin?: number;
  flaecheMax?: number;
  ort?: string;
  typObj?: ObjectCategory;
  provisionsfrei?: boolean;
  energieklasseMax?: string;
  baujahrMin?: number;
  sort: SortKey;
}

export type SearchParamsObj = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const int = (v: string | string[] | undefined) => {
  const n = parseInt(String(one(v) ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
};

const SORTS: SortKey[] = ["neu", "preis_asc", "preis_desc", "flaeche", "zimmer"];
const CATS: ObjectCategory[] = ["wohnung", "haus", "grundstueck", "gewerbe"];
export const ENERGIEKLASSEN = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"];

export function parseFilters(sp: SearchParamsObj): FilterState {
  const typ: MarketingType = one(sp.typ) === "miete" ? "miete" : "kauf";
  const sortRaw = one(sp.sort) as SortKey | undefined;
  const sort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : "neu";
  const typObjRaw = one(sp.typ_obj) as ObjectCategory | undefined;
  const typObj = typObjRaw && CATS.includes(typObjRaw) ? typObjRaw : undefined;

  // Min>Max defensiv tauschen, damit invertierte Spannen kein stilles 0-Ergebnis liefern.
  let preisMin = int(sp.preis_min);
  let preisMax = int(sp.preis_max);
  if (preisMin != null && preisMax != null && preisMin > preisMax) [preisMin, preisMax] = [preisMax, preisMin];
  let flaecheMin = int(sp.flaeche_min);
  let flaecheMax = int(sp.flaeche_max);
  if (flaecheMin != null && flaecheMax != null && flaecheMin > flaecheMax) [flaecheMin, flaecheMax] = [flaecheMax, flaecheMin];

  return {
    typ,
    preisMin,
    preisMax,
    zimmerMin: int(sp.zimmer_min),
    flaecheMin,
    flaecheMax,
    ort: one(sp.ort) || undefined,
    typObj,
    provisionsfrei: one(sp.provisionsfrei) === "1" || undefined,
    energieklasseMax: (() => {
      const v = one(sp.energieklasse_max);
      return v && ENERGIEKLASSEN.includes(v) ? v : undefined;
    })(),
    baujahrMin: int(sp.baujahr_min),
    sort,
  };
}

export function sortEstates(estates: Estate[], sort: SortKey): Estate[] {
  const r = [...estates];
  switch (sort) {
    case "preis_asc":
      return r.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "preis_desc":
      return r.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case "flaeche":
      return r.sort((a, b) => (b.livingArea ?? 0) - (a.livingArea ?? 0));
    case "zimmer":
      return r.sort((a, b) => (b.rooms ?? 0) - (a.rooms ?? 0));
    default:
      return r.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export function filterEstates(estates: Estate[], f: FilterState): Estate[] {
  let r = estates.filter((e) => e.marketingType === f.typ);
  if (f.preisMin != null) r = r.filter((e) => e.price != null && e.price >= f.preisMin!);
  if (f.preisMax != null) r = r.filter((e) => e.price != null && e.price <= f.preisMax!);
  if (f.zimmerMin != null) r = r.filter((e) => e.rooms != null && e.rooms >= f.zimmerMin!);
  if (f.flaecheMin != null) r = r.filter((e) => e.livingArea != null && e.livingArea >= f.flaecheMin!);
  if (f.flaecheMax != null) r = r.filter((e) => e.livingArea != null && e.livingArea <= f.flaecheMax!);
  if (f.ort) r = r.filter((e) => e.city.toLowerCase() === f.ort!.toLowerCase());
  if (f.typObj) r = r.filter((e) => e.category === f.typObj);
  if (f.provisionsfrei) r = r.filter((e) => e.provision.free);
  if (f.energieklasseMax) {
    const max = ENERGIEKLASSEN.indexOf(f.energieklasseMax);
    r = r.filter(
      (e) => e.energy.energyClass != null && ENERGIEKLASSEN.indexOf(e.energy.energyClass) <= max,
    );
  }
  if (f.baujahrMin != null)
    r = r.filter((e) => e.energy.year != null && e.energy.year >= f.baujahrMin!);
  return sortEstates(r, f.sort);
}

/** Aktive Filter als entfernbare Chips (param-Name → Label). */
export function activeChips(f: FilterState): { param: string; label: string }[] {
  const chips: { param: string; label: string }[] = [];
  if (f.preisMin != null) chips.push({ param: "preis_min", label: `ab ${formatEUR(f.preisMin)}` });
  if (f.preisMax != null) chips.push({ param: "preis_max", label: `bis ${formatEUR(f.preisMax)}` });
  if (f.zimmerMin != null) chips.push({ param: "zimmer_min", label: `ab ${f.zimmerMin} Zi.` });
  if (f.flaecheMin != null) chips.push({ param: "flaeche_min", label: `ab ${f.flaecheMin} m²` });
  if (f.flaecheMax != null) chips.push({ param: "flaeche_max", label: `bis ${f.flaecheMax} m²` });
  if (f.ort) chips.push({ param: "ort", label: f.ort });
  if (f.typObj) chips.push({ param: "typ_obj", label: categoryLabel(f.typObj) });
  if (f.provisionsfrei) chips.push({ param: "provisionsfrei", label: "Provisionsfrei" });
  if (f.energieklasseMax) chips.push({ param: "energieklasse_max", label: `bis Klasse ${f.energieklasseMax}` });
  if (f.baujahrMin != null) chips.push({ param: "baujahr_min", label: `ab Baujahr ${f.baujahrMin}` });
  return chips;
}

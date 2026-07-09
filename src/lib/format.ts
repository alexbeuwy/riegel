import type { Estate, MarketingType, ObjectCategory } from "@/lib/mock-estates";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEUR(n: number): string {
  return eur.format(n);
}

export function formatPrice(estate: Estate): string {
  if (estate.price == null) return "Preis auf Anfrage";
  const base = eur.format(estate.price);
  return estate.marketingType === "miete" ? `${base} / Monat` : base;
}

/** Kompaktes Preis-Label für Karten-Pins, z. B. „845 T€“. */
export function formatPriceShort(estate: Estate): string {
  if (estate.price == null) return "k. A.";
  if (estate.marketingType === "miete") return `${Math.round(estate.price)} €`;
  if (estate.price >= 1_000_000)
    return `${(estate.price / 1_000_000).toFixed(1).replace(".", ",")} Mio.`;
  return `${Math.round(estate.price / 1000)} T€`;
}

const CATEGORY: Record<ObjectCategory, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
};

export function categoryLabel(c: ObjectCategory): string {
  return CATEGORY[c];
}

/** Icon-Name je Objektkategorie — u. a. für den "Fotos folgen"-Platzhalter,
 *  damit nicht jede Karte dasselbe generische Haus zeigt. */
export function categoryIcon(c: ObjectCategory): "home" | "building" | "tree" | "layers" {
  switch (c) {
    case "haus":
      return "home";
    case "wohnung":
      return "building";
    case "grundstueck":
      return "tree";
    default:
      return "layers";
  }
}

export function marketingLabel(m: MarketingType): string {
  return m === "kauf" ? "Kauf" : "Miete";
}

export function formatArea(n: number | null): string | null {
  // de-DE + max. 1 Nachkommastelle: OnOffice liefert exakte Werte wie 108.79 —
  // "108,8 m²" statt "108.79 m²" auf Karten/Detailseiten.
  if (n == null) return null;
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} m²`;
}

export function roomsLabel(n: number | null): string | null {
  return n == null ? null : `${n.toString().replace(".", ",")} Zi.`;
}

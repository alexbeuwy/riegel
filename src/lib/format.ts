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

export function marketingLabel(m: MarketingType): string {
  return m === "kauf" ? "Kauf" : "Miete";
}

export function formatArea(n: number | null): string | null {
  return n == null ? null : `${n} m²`;
}

export function roomsLabel(n: number | null): string | null {
  return n == null ? null : `${n.toString().replace(".", ",")} Zi.`;
}

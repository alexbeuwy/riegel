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

/**
 * Kurzbeschreibung für die Karten-Pins, z. B. „Wohnung · 70 m²“.
 *
 * Bewusst KEIN Preis mehr (Vorgabe Sissy RIEGEL). Ein Preisschild an einem
 * Punkt auf der Karte lädt dazu ein, Objekt und Adresse zusammenzubringen, und
 * verrät zusammen mit der Gegend mehr über ein einzelnes Haus, als es soll.
 * Die Objektart mit Fläche sagt dem Suchenden beim Überfliegen ohnehin mehr,
 * der Preis steht in der Karte daneben und auf der Objektseite.
 */
export function formatPinLabel(estate: Estate): string {
  const art = categoryLabel(estate.category);
  // Bei Grundstücken gibt es keine Wohnfläche, dort zählt die Grundstücksgröße.
  const flaeche = formatArea(estate.livingArea ?? estate.plotArea ?? null);
  return flaeche ? `${art} · ${flaeche}` : art;
}

/**
 * Rohes SVG-Markup je Objektkategorie für die Karten-Pins.
 *
 * Die Pins werden direkt im DOM erzeugt (MapLibre-HTML-Marker), dort steht die
 * Icon-Komponente aus components/icon.tsx nicht zur Verfügung. Die Pfade sind
 * daher von dort kopiert und müssen bei einer Änderung dort mitgezogen werden.
 * Der Inhalt ist fest verdrahtet, es fließt nichts aus Objektdaten ein.
 */
const PIN_ICON_PFADE: Record<ObjectCategory, string> = {
  haus: '<path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5M9.5 20v-5h5v5"/>',
  wohnung:
    '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V9h4a1 1 0 0 1 1 1v11M3 21h18"/><path d="M7.5 8h3M7.5 12h3M7.5 16h3"/>',
  grundstueck: '<path d="M12 3 6 11h3l-3 5h12l-3-5h3L12 3ZM12 16v5"/>',
  gewerbe: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 18l9 5 9-5"/>',
};

export function pinIconSvg(c: ObjectCategory): string {
  return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PIN_ICON_PFADE[c]}</svg>`;
}

/** Kompaktes Preis-Label, z. B. „845 T€“. */
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

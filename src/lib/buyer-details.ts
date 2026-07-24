/**
 * Käufer-Stammdaten für den Provisionsnachweis — genau die Angaben, die auch
 * OnOffice/ImmoScout für eine belastbare Provisionsvereinbarung (Nachweis)
 * benötigen: vollständiger Name, Telefon, Anschrift. Werden bei der
 * Registrierung erhoben und in den Supabase-`user_metadata` gespeichert
 * (server-seitig über getUser lesbar, s. /api/expose/confirm).
 *
 * Bewusst ohne Supabase-Import, damit sowohl Client (Formulare) als auch
 * Server-Route dieselbe Definition/Prüfung teilen.
 */
export interface BuyerDetails {
  firstName: string;
  lastName: string;
  phone: string;
  /** Straße + Hausnummer in einem Feld. */
  street: string;
  zip: string;
  city: string;
}

/** Feld-Definitionen für die Formulare (Reihenfolge = Anzeigereihenfolge). */
export const BUYER_FIELDS: {
  key: keyof BuyerDetails;
  label: string;
  autoComplete: string;
  placeholder: string;
  /** Grid-Breite im 2-Spalten-Layout: true = volle Breite. */
  wide?: boolean;
}[] = [
  { key: "firstName", label: "Vorname", autoComplete: "given-name", placeholder: "Max" },
  { key: "lastName", label: "Nachname", autoComplete: "family-name", placeholder: "Mustermann" },
  { key: "phone", label: "Telefon", autoComplete: "tel", placeholder: "0170 1234567", wide: true },
  { key: "street", label: "Straße & Hausnr.", autoComplete: "street-address", placeholder: "Musterstraße 1", wide: true },
  { key: "zip", label: "PLZ", autoComplete: "postal-code", placeholder: "67346" },
  { key: "city", label: "Ort", autoComplete: "address-level2", placeholder: "Speyer" },
];

export const EMPTY_BUYER: BuyerDetails = {
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  zip: "",
  city: "",
};

/** Metadata-Objekt (Supabase user_metadata) → BuyerDetails (fehlende Felder ""). */
export function readBuyerDetails(meta: Record<string, unknown> | null | undefined): BuyerDetails {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const m = meta ?? {};
  return {
    firstName: s(m.first_name),
    lastName: s(m.last_name),
    phone: s(m.phone),
    street: s(m.street),
    zip: s(m.zip),
    city: s(m.city),
  };
}

/** BuyerDetails → flaches metadata-Objekt (inkl. `name` für Abwärtskompatibilität). */
export function buyerToMetadata(b: BuyerDetails): Record<string, string> {
  const trim = (v: string) => v.trim();
  return {
    first_name: trim(b.firstName),
    last_name: trim(b.lastName),
    phone: trim(b.phone),
    street: trim(b.street),
    zip: trim(b.zip),
    city: trim(b.city),
    // `name` bleibt der zusammengesetzte Volle Name (bestehende Aufrufer lesen ihn).
    name: `${trim(b.firstName)} ${trim(b.lastName)}`.trim(),
  };
}

/** Alle Nachweis-Pflichtfelder vorhanden? */
export function buyerComplete(b: BuyerDetails): boolean {
  return (
    b.firstName !== "" &&
    b.lastName !== "" &&
    b.phone !== "" &&
    b.street !== "" &&
    b.zip !== "" &&
    b.city !== ""
  );
}

/** Erste fehlende Angabe als deutsche Fehlermeldung (oder null, wenn vollständig). */
export function buyerValidationError(b: BuyerDetails): string | null {
  if (!b.firstName || !b.lastName) return "Bitte Vor- und Nachnamen angeben.";
  if (!b.phone) return "Bitte eine Telefonnummer angeben.";
  if (!b.street) return "Bitte Straße und Hausnummer angeben.";
  if (!/^\d{4,5}$/.test(b.zip.trim())) return "Bitte eine gültige Postleitzahl angeben.";
  if (!b.city) return "Bitte den Ort angeben.";
  return null;
}

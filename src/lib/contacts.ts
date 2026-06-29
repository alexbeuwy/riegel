import { site } from "@/lib/site";

/**
 * Ansprechpartner:innen für Objektdetail, Kontakt & Termin.
 * Echte Familie Riegel mit echten Porträts — baut „gewohnten" Portal-Trust auf
 * (Avatar + Name + Rolle + Kontakt, wie bei ImmoScout & Co.).
 */
export interface Contact {
  name: string;
  role: string;
  image: string;
  phone: string;
  email: string;
  city?: "Speyer" | "Ludwigshafen";
  /** Vertrautes Trust-Wording. */
  greeting: string;
}

export const contacts: Contact[] = [
  {
    name: "Christoph Riegel",
    role: "Verkauf & Vermarktung",
    image: "/images/team/christoph.jpg",
    phone: site.locations[0].phone,
    email: site.email,
    city: "Speyer",
    greeting: "Ich freue mich auf Ihre Anfrage.",
  },
  {
    name: "Sissy Riegel",
    role: "Marketing & Kundenbetreuung",
    image: "/images/team/sissy.jpg",
    phone: site.locations[1].phone,
    email: site.email,
    city: "Ludwigshafen",
    greeting: "Ich freue mich auf Ihre Anfrage.",
  },
  {
    name: "Manfred Riegel",
    role: "Gründer · Regionaldirektor BVFI",
    image: "/images/team/manfred.jpg",
    phone: site.locations[0].phone,
    email: site.email,
    greeting: "Persönlich für Sie da.",
  },
  {
    name: "Sylwia Riegel",
    role: "Geschäftsleitung",
    image: "/images/team/sylwia.jpg",
    phone: site.locations[1].phone,
    email: site.email,
    city: "Ludwigshafen",
    greeting: "Persönlich für Sie da.",
  },
];

export const defaultContact = contacts[0];

/** Ansprechpartner nach Stadt (Speyer/Ludwigshafen), sonst Default. */
export function contactForCity(city?: string): Contact {
  if (!city) return defaultContact;
  const c = city.toLowerCase();
  const found = contacts.find((x) => x.city && c.includes(x.city.toLowerCase()));
  return found ?? defaultContact;
}

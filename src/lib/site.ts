import type { IconName } from "@/components/icon";

/** Ein Mega-Menü-Eintrag (Icon-Kachel + Titel + 1-Zeilen-Beschreibung). */
export interface NavChild {
  readonly href: string;
  readonly label: string;
  readonly desc: string;
  readonly icon: IconName;
}

/** Primär-Nav-Punkt — optional mit Kindern (→ Mega-Menü statt Direktlink). */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly children?: ReadonlyArray<NavChild>;
}

/**
 * Zentrale Seiten-Konfiguration. TODO-Felder brauchen echte Daten von Sissy/Alex
 * (siehe RELAUNCH-LOG "Nächste Schritte").
 */
export const site = {
  name: "Riegel Immobilien",
  legalName: "Riegel Immobilien",
  tagline: "Immobilien mit regionaler Expertise",
  description:
    "Riegel Immobilien — Ihr Immobilienmakler in Speyer und Ludwigshafen. Verkauf, Bewertung und Beratung mit regionaler Expertise.",
  // TODO: finale Produktions-Domain bestätigen
  url: "https://riegel-immobilien.de",
  locales: "de-DE",
  regions: ["Speyer", "Ludwigshafen", "Vorderpfalz"],

  // Primär-Navigation (Portal = #1)
  nav: [
    { href: "/immobilien", label: "Immobilien" },
    { href: "/verkaufen", label: "Verkaufen" },
    {
      href: "/rechner",
      label: "Immobilienbewertung",
      // Mega-Menü: 4 Einstiege statt Direktlink (siehe SiteHeader-Dropdown)
      children: [
        {
          href: "/rechner",
          label: "Immorechner",
          desc: "Sofort-Bewertung Ihrer Immobilie in 60 Sekunden",
          icon: "calculator",
        },
        {
          href: "/preisatlas",
          label: "Preisatlas Vorderpfalz",
          desc: "Preise, Bodenwerte & Trends für 18 Städte",
          icon: "trend",
        },
        {
          href: "/standorte",
          label: "Standort-Guide",
          desc: "Immobilienmarkt & Leben in Ihrer Stadt",
          icon: "pin",
        },
        {
          href: "/ratgeber",
          label: "Ratgeber",
          desc: "Wissen rund um Verkauf, Steuer & Finanzierung",
          icon: "doc",
        },
      ],
    },
    { href: "/ueber-uns", label: "Über uns" },
    { href: "/kontakt", label: "Kontakt" },
  ] satisfies readonly NavItem[],

  // Aus Live-Seiten-Audit übernommen (verifiziert vorhanden):
  socials: {
    instagram: "https://www.instagram.com/riegelimmobilien/",
    facebook: "https://www.facebook.com/RiegelImmobilien",
    youtube: "https://www.youtube.com/channel/UCwGhTOScKNDqdjFbhTsnf-A",
    linkedin: "", // TODO: LinkedIn-URL von Sissy (Wunsch #7)
  },

  // Echte Daten von der Live-Seite übernommen:
  whatsapp: "", // TODO: WhatsApp-Nummer von Sissy (nur Ziffern, intl.)
  phone: "06232 100 10 10", // Speyer (Hauptnummer)
  email: "info@riegel-immobilien.de",

  locations: [
    {
      city: "Speyer",
      street: "Wormser Straße 13",
      zip: "67346",
      phone: "06232 100 10 10",
    },
    {
      city: "Ludwigshafen",
      street: "Kaiser-Wilhelm-Straße 16",
      zip: "67059",
      phone: "0621 5200 8800",
    },
  ],

  legalNav: [
    { href: "/impressum", label: "Impressum" },
    { href: "/datenschutz", label: "Datenschutz" },
    { href: "/widerruf", label: "Widerruf" },
  ],
} as const;

export function whatsappHref(message?: string): string | null {
  if (!site.whatsapp) return null;
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

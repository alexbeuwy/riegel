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
    { href: "/rechner", label: "Immobilienbewertung" },
    { href: "/ueber-uns", label: "Über uns" },
    { href: "/kontakt", label: "Kontakt" },
  ],

  // Aus Live-Seiten-Audit übernommen (verifiziert vorhanden):
  socials: {
    instagram: "https://www.instagram.com/riegelimmobilien/",
    facebook: "https://www.facebook.com/RiegelImmobilien",
    youtube: "https://www.youtube.com/channel/UCwGhTOScKNDqdjFbhTsnf-A",
    linkedin: "", // TODO: LinkedIn-URL von Sissy (Wunsch #7)
  },

  // TODO: echte Kontaktdaten von Sissy bestätigen (Wunsch #6/#7)
  whatsapp: "", // z. B. "4915123456789" (nur Ziffern, intl. ohne +)
  phone: "", // z. B. "+49 6232 000000"
  email: "", // z. B. "info@riegel-immobilien.de"

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

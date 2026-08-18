import type { IconName } from "@/components/icon";
import { photos } from "@/lib/photos";

/** Ein Mega-Menü-Eintrag (Icon-Kachel + Titel + 1-Zeilen-Beschreibung). */
export interface NavChild {
  readonly href: string;
  readonly label: string;
  readonly desc: string;
  readonly icon: IconName;
}

/** Bild-Karte rechts neben den Icon-Einträgen im Mega-Menü (Feature-Teaser). */
export interface NavFeature {
  readonly href: string;
  readonly label: string;
  readonly desc: string;
  readonly image: string;
}

/** Primär-Nav-Punkt — optional mit Kindern (→ Mega-Menü statt Direktlink). */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly children?: ReadonlyArray<NavChild>;
  readonly feature?: NavFeature;
}

/**
 * Zentrale Seiten-Konfiguration. TODO-Felder brauchen echte Daten von Sissy/Alex
 * (siehe RELAUNCH-LOG "Nächste Schritte").
 */
export const site = {
  name: "RIEGEL Immobilien",
  // Firmierung wie im Handelsregister (HRA 51804 Sp, Amtsgericht Ludwigshafen),
  // NICHT die Marken-Schreibweise: legalName geht in die strukturierten Daten
  // und ist dort ein Identitätsmerkmal, das sich mit Registerauszügen und
  // Branchenverzeichnissen abgleichen lässt. "RIEGEL Immobilien" bleibt der
  // Name, unter dem wir auftreten (site.name).
  legalName: "Riegel Immobilien e.K.",
  // §37a HGB (Pflichtangaben in Geschäftsbriefen — dazu zählen auch E-Mails):
  // Firma, Registergericht und Registernummer müssen z. B. im Mail-Footer
  // stehen (src/lib/email.ts, emailLayout). Freigegeben von Alex am
  // 18.08.2026, Quelle: app/impressum/page.tsx (dort zusätzlich die volle
  // §34c-/Aufsichtsangabe, die §37a HGB nicht verlangt). Werte sind
  // **credential** — rote Liste, siehe docs/white-label-migration.md §5: bei
  // einer Umbrandung trägt der neue Makler seine EIGENEN Registerdaten ein,
  // nie diese kopieren.
  recht: {
    firma: "Riegel Immobilien e.K.",
    registergericht: "Amtsgericht Ludwigshafen am Rhein",
    registernummer: "HRA 51804 Sp",
  },
  /**
   * Markenfarbe für Kontexte OHNE CSS-Zugriff (Mail-HTML, PDF, OG-Bilder,
   * Canvas/Shader) — die Web-Oberfläche nutzt weiterhin ausschließlich
   * `--color-accent` in globals.css. Beim Umbranden BEIDE Stellen ändern
   * (Playbook §3.1). `rgb` ist die pdf-lib-Normalform (0–1) derselben Farbe.
   */
  brandColor: "#015cff",
  brandColorRgb: { r: 1 / 255, g: 92 / 255, b: 255 / 255 },
  /**
   * Öffentlicher CDN-Host für Bild-/Video-Assets (BunnyCDN Pull-Zone).
   * NEXT_PUBLIC_, damit der Wert auch in Client-Komponenten zur Build-Zeit
   * eingebettet wird; Fallback = RIEGEL-Zone. next.config.ts (remotePatterns)
   * MUSS denselben Wert kennen — s. Playbook §3.1 (build-time!).
   */
  cdnHost: process.env.NEXT_PUBLIC_BUNNY_CDN_HOST || "riegel.b-cdn.net",
  tagline: "Immobilien mit regionaler Expertise",
  description:
    "RIEGEL Immobilien — Ihr Immobilienmakler in Speyer und Ludwigshafen. Verkauf, Bewertung und Beratung mit regionaler Expertise.",
  // Kanonische Domain: daraus werden alle canonical-Tags, og:url, die
  // komplette sitemap.xml und die robots.txt gebaut. Die Apex-Domain muss
  // deshalb bei Vercel als Primary Domain gesetzt sein, sonst zeigen alle
  // diese Angaben auf eine Adresse, die selbst nur weiterleitet.
  url: "https://riegel-immobilien.de",
  locales: "de-DE",
  regions: ["Speyer", "Ludwigshafen", "Metropolregion Rhein-Neckar"],

  // Primär-Navigation (Portal = #1)
  nav: [
    { href: "/immobilien", label: "Immobilien" },
    {
      href: "/verkaufen",
      label: "Verkaufen",
      // Mega-Menü (wie Immobilienbewertung): Hub + die 5 Experten-Seiten.
      children: [
        {
          href: "/verkaufen",
          label: "Immobilie verkaufen",
          desc: "Ihr Verkauf in fünf klaren Schritten",
          icon: "handshake",
        },
        {
          href: "/verkaufen/mehrfamilienhaus",
          label: "Mehrfamilienhäuser",
          desc: "Zinshäuser & vermietete Wohnobjekte",
          icon: "building",
        },
        {
          href: "/verkaufen/gewerbeimmobilie",
          label: "Gewerbeimmobilien",
          desc: "Büro, Handel, Logistik & Spezialobjekte",
          icon: "chart",
        },
        {
          href: "/verkaufen/wohn-und-geschaeftshaus",
          label: "Wohn- & Geschäftshäuser",
          desc: "Gemischt genutzte Objekte richtig bewerten",
          icon: "home",
        },
        {
          href: "/verkaufen/anlageimmobilie",
          label: "Anlageimmobilien",
          desc: "Kapitalanlagen bis zum Direktankauf",
          icon: "trend",
        },
        {
          href: "/verkaufen/nachlassimmobilie",
          label: "Nachlass & Erbe",
          desc: "Erbengemeinschaften sicher begleitet",
          icon: "shield",
        },
      ],
      // Bild-Karte rechts neben den 6 Einträgen: die weiteren ~30
      // Spezialgebiete sind sonst nur ganz unten auf /verkaufen auffindbar.
      feature: {
        href: "/verkaufen#spezialgebiete",
        label: "Alle Spezialgebiete",
        desc: "Über 30 Objektarten — von Wohnanlagen bis Projektentwicklung",
        image: photos.hausLightrays,
      },
    },
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
          label: "Preisatlas Rhein-Neckar",
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
    linkedin: "https://www.linkedin.com/company/riegel-immobilien/",
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

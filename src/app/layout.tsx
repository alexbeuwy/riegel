import type { Metadata, Viewport } from "next";
import { inter, akira, akiraOutline } from "@/fonts";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CtaBand } from "@/components/cta-band";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { FeedbackWidget } from "@/components/feedback-widget";
import { FavoritesProvider } from "@/components/favorites";
import { SavedSearchesProvider } from "@/components/saved-searches";
import { AuthProvider } from "@/components/auth";
import { ConsentProvider } from "@/components/consent";
import { TRUST_PLATFORMS } from "@/lib/trust-data";
import "./globals.css";

// Money-Keyword in den Default-Title (Startseite); Unterseiten via Template.
// WICHTIG: kein globales `alternates.canonical` — das würde an alle Seiten
// vererbt und fast die gesamte Site auf „/" kanonisieren (De-Indexierung).
const DEFAULT_TITLE = `Immobilienmakler Speyer & Ludwigshafen — ${site.name}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: site.name,
    title: DEFAULT_TITLE,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

// Dark-first: Browser-Chrome + native Controls dunkel, kein White-Flash.
export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
  viewportFit: "cover",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${site.url}/#organization`,
  name: site.name,
  legalName: site.legalName,
  url: site.url,
  email: site.email,
  telephone: site.phone,
  description: site.description,
  // Starkes, maschinenlesbares Entity-Signal für KI-Antworten („wer ist der Makler in …?")
  award: "ImmoScout24 ImmoAward 2025 — Top 21 Makler des Jahres in Deutschland (von über 25.000)",
  knowsAbout: [
    "Immobilienverkauf", "Immobilienbewertung", "Hausverkauf", "Wohnungsverkauf",
    "Scheidungsimmobilie", "geerbte Immobilie", "Maklerprovision", "Energieausweis",
  ],
  areaServed: [
    "Speyer", "Ludwigshafen", "Metropolregion Rhein-Neckar", "Rhein-Neckar", "Schifferstadt",
    "Frankenthal", "Neustadt an der Weinstraße", "Germersheim", "Haßloch", "Mutterstadt",
  ],
  address: site.locations.map((l) => ({
    "@type": "PostalAddress",
    streetAddress: l.street,
    postalCode: l.zip,
    addressLocality: l.city,
    addressCountry: "DE",
  })),
  image: `${site.url}/images/standorte/buero-1.jpg`,
  logo: `${site.url}/icon.png`,
  // Büro-Koordinaten (straßengenau) für Local-SEO; Öffnungszeiten folgen,
  // sobald RIEGEL sie bestätigt (nicht erfinden).
  location: site.locations.map((l, i) => ({
    "@type": "Place",
    name: `RIEGEL Immobilien ${l.city}`,
    address: { "@type": "PostalAddress", streetAddress: l.street, postalCode: l.zip, addressLocality: l.city, addressCountry: "DE" },
    telephone: l.phone,
    geo: {
      "@type": "GeoCoordinates",
      latitude: i === 0 ? 49.3199 : 49.4806,
      longitude: i === 0 ? 8.4313 : 8.4453,
    },
  })),
  // Bewertungsprofile als Entity-Verknüpfung (sameAs) — bewusst KEIN aggregateRating-
  // Markup mit Fremdplattform-Zahlen: das stuft Google als self-serving ein (kein
  // Sterne-Snippet, Abstrafungsrisiko). Sterne stehen visuell im TrustStrip, hier
  // nur die Verknüpfung für KI-Zitierbarkeit/E-E-A-T.
  sameAs: [
    site.socials.instagram,
    site.socials.facebook,
    site.socials.youtube,
    site.socials.linkedin,
    ...TRUST_PLATFORMS.map((p) => p.url),
  ].filter(Boolean),
  // Echte Personen mit Rolle/Entität (E-E-A-T) — Klarnamen aus /ueber-uns.
  founder: [
    { "@type": "Person", name: "Manfred RIEGEL", jobTitle: "Gründer · Regionaldirektor BVFI" },
    { "@type": "Person", name: "Sylwia RIEGEL", jobTitle: "Geschäftsleitung" },
  ],
  employee: [
    { "@type": "Person", name: "Sissy RIEGEL", jobTitle: "Marketing" },
    { "@type": "Person", name: "Christoph RIEGEL", jobTitle: "Verkauf" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${akira.variable} ${akiraOutline.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {/*
          Schriften vollständig self-hosted (DSGVO): Inter (Body) + Akira (Headlines)
          via next/font/local. Kein externer Adobe-Typekit-Embed mehr → keine
          IP-Übermittlung an Adobe, kein Consent für Fonts nötig.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <ConsentProvider>
          <AuthProvider>
            <FavoritesProvider>
              <SavedSearchesProvider>
                <a
                  href="#content"
                  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-on-accent"
                >
                  Zum Inhalt springen
                </a>
                <SiteHeader />
                <main id="content" className="flex-1">{children}</main>
                <CtaBand />
                <SiteFooter />
                <WhatsappFab />
                {/* Nur fürs Team: rendert `null`, solange kein lokales Flag gesetzt
                    ist (s. feedback-widget.tsx) — für normale Besucher ohne jede Wirkung. */}
                <FeedbackWidget />
              </SavedSearchesProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}

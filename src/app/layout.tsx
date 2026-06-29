import type { Metadata, Viewport } from "next";
import { inter, akira, akiraOutline } from "@/fonts";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CtaBand } from "@/components/cta-band";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { FavoritesProvider } from "@/components/favorites";
import { SavedSearchesProvider } from "@/components/saved-searches";
import { AuthProvider } from "@/components/auth";
import { ConsentProvider } from "@/components/consent";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
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
    "Speyer", "Ludwigshafen", "Vorderpfalz", "Rhein-Neckar", "Schifferstadt",
    "Frankenthal", "Neustadt an der Weinstraße", "Germersheim", "Haßloch", "Mutterstadt",
  ],
  address: site.locations.map((l) => ({
    "@type": "PostalAddress",
    streetAddress: l.street,
    postalCode: l.zip,
    addressLocality: l.city,
    addressCountry: "DE",
  })),
  location: site.locations.map((l) => ({
    "@type": "Place",
    name: `Riegel Immobilien ${l.city}`,
    address: { "@type": "PostalAddress", streetAddress: l.street, postalCode: l.zip, addressLocality: l.city, addressCountry: "DE" },
    telephone: l.phone,
  })),
  sameAs: [site.socials.instagram, site.socials.facebook, site.socials.youtube, site.socials.linkedin].filter(Boolean),
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
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <CtaBand />
                <SiteFooter />
                <WhatsappFab />
              </SavedSearchesProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}

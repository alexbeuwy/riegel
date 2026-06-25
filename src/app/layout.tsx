import type { Metadata } from "next";
import { inter, akira, akiraOutline } from "@/fonts";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
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
          Markenschrift Neuzeit Grotesk (Adobe Fonts, lizenziert von Alex).
          React-19-Hoisting via `precedence`.
          TODO vor Cutover: (1) hinter Consent-Tool laden (externer Embed, TDDDG),
          (2) Vercel-Domain im Adobe-Fonts-Web-Projekt whitelisten, sonst lädt der
          Font nur auf riegel-immobilien.de — Fallback ist self-hosted Inter.
        */}
        <link
          rel="stylesheet"
          href="https://use.typekit.net/atg2aop.css"
          precedence="default"
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <WhatsappFab />
      </body>
    </html>
  );
}

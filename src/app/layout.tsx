import type { Metadata, Viewport } from "next";
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

// Dark-first: Browser-Chrome + native Controls dunkel, kein White-Flash.
export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
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
          Markenschrift Neuzeit Grotesk (Adobe Fonts Web-Projekt, ID atg2aop).
          Der dynamische Kit lädt per Projekt-ID auf JEDER Domain — keine
          Domain-Freigabe nötig. React-19-Hoisting via `precedence`.
          TODO vor Cutover: hinter Consent-Tool laden (externer Embed, TDDDG).
          Fallback bis Kit geladen / falls geblockt: self-hosted Inter.
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

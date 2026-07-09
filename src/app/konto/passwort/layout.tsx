import type { Metadata } from "next";

// page.tsx ist "use client" (braucht sofortigen Zugriff auf die Recovery-
// Session) — Metadata-Exports sind dort verboten, daher hier im Server-Layout.
// /konto* ist zusätzlich global per robots.ts disallow'd; dieser Tag verhindert
// zusätzlich eine Indexierung, falls die Seite irgendwo verlinkt wird.
export const metadata: Metadata = {
  title: "Neues Passwort setzen",
  robots: { index: false, follow: false },
};

export default function KontoPasswortLayout({ children }: { children: React.ReactNode }) {
  return children;
}

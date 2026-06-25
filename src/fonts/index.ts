import localFont from "next/font/local";

/*
 * Typografie-System (siehe docs/design-system.md §3):
 *  - Body/UI: Neuzeit Grotesk (Adobe Fonts, lizenziert, läuft auf der Domain) mit
 *    Inter als self-hosted Fallback. Adobe-Kit wird in layout.tsx eingebunden.
 *  - Headlines: AKIRA Expanded — NUR sparsam für große Headlines. Outline-Schnitt
 *    als gelegentliches Stil-Gimmick.
 *  Alle hier geladenen Schriften sind self-hosted (kein externer Request) =
 *  DSGVO-clean; einzig Neuzeit Grotesk kommt als Adobe-Embed dazu (Consent-Gate).
 */

// Inter (SIL OFL), self-hosted — der "normale" Body-Font / Fallback für Neuzeit Grotesk.
export const inter = localFont({
  src: "./inter-latin-wght.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// AKIRA Expanded Super Bold (lizenziert von Alex) — große Headlines, sparsam.
export const akira = localFont({
  src: "./akira-super-bold.woff2",
  variable: "--font-akira",
  display: "swap",
  weight: "700",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// AKIRA Expanded Outline (lizenziert) — Stil-Gimmick für vereinzelte Headlines.
export const akiraOutline = localFont({
  src: "./akira-outline.woff2",
  variable: "--font-akira-outline",
  display: "swap",
  weight: "700",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

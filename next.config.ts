import type { NextConfig } from "next";

// White-Label (Playbook §3.1): derselbe Env-Name/Fallback wie site.cdnHost in
// src/lib/site.ts — next.config.ts kann site.ts aber nicht importieren (läuft
// außerhalb der App-Modulauflösung, vor dem eigentlichen Next-Build), daher
// hier bewusst dieselbe process.env-Auswertung dupliziert statt eines Imports.
// Build-time ok: next.config.ts wird nur beim Start/Build ausgewertet, ein
// späterer Laufzeit-Wechsel der Env-Variable würde einen Rebuild brauchen.
const BUNNY_CDN_HOST = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST || "riegel.b-cdn.net";

const nextConfig: NextConfig = {
  experimental: {
    // Kritisches CSS direkt ins HTML legen statt als eigene <link>-Datei.
    // Anlass: PageSpeed Mobil meldete die beiden CSS-Chunks als
    // render-blockierend (~270 ms auf dem simulierten Mittelklasse-Handy) —
    // bei nur 24 KiB Nutzlast steckt der Aufwand fast komplett in der
    // ZUSÄTZLICHEN Anfrage, nicht in der Größe. Inlining entfernt die Anfrage
    // ganz, statt sie zu verkleinern; Next liefert dabei nur das CSS der
    // jeweiligen Route aus.
    // Preis: Das HTML wächst um die CSS-Größe und die Datei wird nicht mehr
    // seitenübergreifend gecacht. Für eine SEO-/Lead-Seite mit überwiegend
    // Erstbesuchern ist das der bessere Tausch. Umkehrbar: Flag entfernen.
    inlineCss: true,
  },
  images: {
    // Nur WebP: AVIF-Encoding ist beim ersten (uncachten) Transform um ein
    // Vielfaches langsamer — bei Multi-MB-OnOffice-Originalen war genau das
    // als sekundenlange Bild-Ladezeit im Portal spürbar.
    formats: ["image/webp"],
    // image.onoffice.de antwortet mit "Cache-Control: private" (max-age 0) —
    // ohne explizite Mindest-TTL verwirft Vercel die optimierten Varianten
    // nach kurzer Zeit und transformiert dieselben Originale immer wieder neu.
    // Die Objektfoto-URLs sind stabil (UUID im Pfad, neue Fotos = neue URL),
    // 31 Tage Cache sind daher sicher.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: BUNNY_CDN_HOST },
      // Objektfotos aus OnOffice (estatepictures) — Subdomain je nach Mandant.
      // "**" = beliebig tiefe Subdomains; deckt sich mit dem Host-Filter in
      // onoffice.ts (fetchEstateImages), der Fremd-Hosts vorab verwirft.
      { protocol: "https", hostname: "**.onoffice.de" },
    ],
  },
  // Basis-Security-Header. Bewusst ohne CSP: die Inline-JSON-LD-Skripte und
  // Next-Inline-Bootstrapping bräuchten Nonces — späterer Ausbau.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

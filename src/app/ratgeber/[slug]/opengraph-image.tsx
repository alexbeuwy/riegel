import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/geo";

/**
 * Ratgeber-spezifisches OG-Image (Artikel-Headline) im Hero-Look.
 * Default-Schrift statt Akira (defekte Space-Metriken in satori).
 */
export const alt = "RIEGEL Immobilien — Ratgeber";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle("ratgeber", slug);
  const title = article?.h1 ?? "Immobilien-Ratgeber";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#0b0b0d",
          backgroundImage:
            "radial-gradient(circle at 78% 12%, rgba(1,92,255,0.50), transparent 55%), radial-gradient(circle at 8% 95%, rgba(1,92,255,0.25), transparent 45%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 12, color: "#f4f3f0" }}>
          RIEGEL IMMOBILIEN
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 45 ? 56 : 68,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#f4f3f0",
            maxWidth: 1020,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, color: "#a8a6a0" }}>
          Ratgeber · riegel-immobilien.de
        </div>
      </div>
    ),
    size,
  );
}

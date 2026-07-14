import { ImageResponse } from "next/og";
import { getArticle } from "@/lib/geo";
import { RIEGEL_LOGO_DATAURI } from "@/lib/og-assets";

/**
 * Orts-spezifisches OG-Image: echtes RIEGEL-Wordmark + „Immobilienmakler
 * {Ort}" in normaler Schreibweise (satori-Default-Schrift, keine Akira).
 */
export const alt = "RIEGEL Immobilien — Ihr Immobilienmakler vor Ort";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle("standort", slug);
  const ort = article?.ort ?? "Rhein-Neckar";
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
            "radial-gradient(circle at 78% 12%, rgba(1,92,255,0.45), transparent 55%), radial-gradient(circle at 8% 95%, rgba(1,92,255,0.22), transparent 45%)",
        }}
      >
        <img src={RIEGEL_LOGO_DATAURI} width={300} height={60} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", fontSize: 42, color: "#a8a6a0" }}>
            Ihr Immobilienmakler in
          </div>
          <div
            style={{
              display: "flex",
              fontSize: ort.length > 20 ? 64 : 88,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.12,
              color: "#015CFF",
              maxWidth: 1050,
            }}
          >
            {ort}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#a8a6a0" }}>
          Verkaufen · Bewerten · Beraten · riegel-immobilien.de
        </div>
      </div>
    ),
    size,
  );
}

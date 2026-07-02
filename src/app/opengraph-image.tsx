import { ImageResponse } from "next/og";
import { RIEGEL_LOGO_DATAURI } from "@/lib/og-assets";

/**
 * Site-weites OG-Image: echtes RIEGEL-Wordmark + Claim in normaler
 * Schreibweise. Satori-Default-Schrift (Inter-artig) — Akira ist hier tabu
 * (defekte Space-Metriken lassen Wörter kollabieren).
 */
export const alt = "RIEGEL Immobilien — Immobilienmakler Speyer & Ludwigshafen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RIEGEL_LOGO_DATAURI} width={300} height={60} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.12, color: "#f4f3f0" }}>
            Regionale Expertise.
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.12, color: "#015CFF" }}>
            Alles andere ist Fast Food.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#a8a6a0" }}>
          Immobilienmakler Speyer &amp; Ludwigshafen · riegel-immobilien.de
        </div>
      </div>
    ),
    size,
  );
}

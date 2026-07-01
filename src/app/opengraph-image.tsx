import { ImageResponse } from "next/og";

/**
 * Site-weites OG-Image im Hero-Look (Near-Black + RIEGEL-Blau-Glow).
 * Bewusst die satori-Default-Schrift: Akira hat defekte Space-Metriken,
 * die in satori Wörter kollabieren/überlappen lassen.
 */
export const alt = "RIEGEL Immobilien — Immobilienmakler Speyer & Ludwigshafen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const headline: React.CSSProperties = {
  display: "flex",
  fontSize: 78,
  fontWeight: 700,
  letterSpacing: -1,
  lineHeight: 1.08,
  textTransform: "uppercase",
};

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
            "radial-gradient(circle at 78% 12%, rgba(1,92,255,0.50), transparent 55%), radial-gradient(circle at 8% 95%, rgba(1,92,255,0.25), transparent 45%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 12, color: "#f4f3f0" }}>
          RIEGEL IMMOBILIEN
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ ...headline, color: "#f4f3f0" }}>Regionale Expertise.</div>
          <div style={{ ...headline, color: "#015CFF" }}>Alles andere ist</div>
          <div style={{ ...headline, color: "#f4f3f0" }}>Fast Food.</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, color: "#a8a6a0" }}>
          Immobilienmakler Speyer &amp; Ludwigshafen · riegel-immobilien.de
        </div>
      </div>
    ),
    size,
  );
}

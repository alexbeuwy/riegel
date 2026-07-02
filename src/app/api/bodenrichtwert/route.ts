import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fetchBodenrichtwertWithStatus, isInRlpBbox, BORIS_ATTRIBUTION } from "@/lib/boris";

/**
 * Server-Proxy für den amtlichen Bodenrichtwert (VBORIS RLP) — der Rechner
 * ruft ausschließlich diese Route auf, nie den LVermGeo-Dienst direkt
 * (keine Nutzer-IP an Dritte, zentrale Drossel, ein gemeinsamer Cache in
 * lib/boris.ts für Client- und Server-Rechnung/PDF).
 *
 * Grobe RLP-BBox (Land inkl. Toleranzrand, s. lib/boris.ts) filtert
 * offensichtlichen Unsinn aus, bevor überhaupt der externe Dienst
 * kontaktiert wird — liefert hier zusätzlich eine explizite 422 statt der
 * stillen `null`-Ablehnung in fetchBodenrichtwert().
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (!isInRlpBbox(lat, lng)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (!rateLimit(`boris:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // `confirmed` unterscheidet ein bestätigtes „außerhalb der Zone" (24 h
  // cachebar) von einem transienten Fehler (Timeout/Netzwerk, NICHT cachen —
  // sonst friert ein einzelner Ausfall die Zone fälschlich auf null ein).
  const { value: data, confirmed } = await fetchBodenrichtwertWithStatus(lat, lng);

  return NextResponse.json(
    { ok: true, data, attribution: BORIS_ATTRIBUTION },
    {
      headers: {
        "Cache-Control": confirmed
          ? "public, s-maxage=86400, stale-while-revalidate=604800"
          : "no-store",
      },
    },
  );
}

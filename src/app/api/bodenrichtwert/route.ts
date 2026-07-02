import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fetchBodenrichtwert, BORIS_ATTRIBUTION } from "@/lib/boris";

/**
 * Server-Proxy für den amtlichen Bodenrichtwert (VBORIS RLP) — der Rechner
 * ruft ausschließlich diese Route auf, nie den LVermGeo-Dienst direkt
 * (keine Nutzer-IP an Dritte, zentrale Drossel, ein gemeinsamer Cache in
 * lib/boris.ts für Client- und Server-Rechnung/PDF).
 *
 * Grobe RLP-BBox (Land inkl. Toleranzrand) filtert offensichtlichen Unsinn
 * aus, bevor überhaupt der externe Dienst kontaktiert wird.
 */
const RLP_BBOX = { lngMin: 6.1, lngMax: 8.6, latMin: 48.9, latMax: 50.9 };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (lat < RLP_BBOX.latMin || lat > RLP_BBOX.latMax || lng < RLP_BBOX.lngMin || lng > RLP_BBOX.lngMax) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (!rateLimit(`boris:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const data = await fetchBodenrichtwert(lat, lng);

  return NextResponse.json(
    { ok: true, data, attribution: BORIS_ATTRIBUTION },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}

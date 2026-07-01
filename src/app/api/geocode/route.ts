import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Serverseitiger Geocoding-Proxy (Photon/komoot, OSM-basiert und für
 * Search-as-you-type gedacht — Nominatim verbietet Autocomplete per Policy).
 * Vorteile: keine Nutzer-IP an Dritte (DSGVO), CDN-Cache pro Query,
 * zentrale Drossel. Ergebnis-Shape entspricht `GeoResult` in lib/geocode.ts.
 */

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

function cityOf(p: Record<string, string | undefined>): string {
  return p.city || p.town || p.village || p.municipality || p.district || "";
}

function buildLabel(p: Record<string, string | undefined>): string {
  const street = p.street || (p.type === "street" ? p.name : "") || "";
  const num = p.housenumber ? ` ${p.housenumber}` : "";
  const streetPart = street ? `${street}${num}` : p.name || "";
  const cityPart = [p.postcode, cityOf(p)].filter(Boolean).join(" ");
  return [streetPart, cityPart].filter(Boolean).join(", ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 3) return NextResponse.json({ results: [] });
  if (!rateLimit(`geocode:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ results: [] }, { status: 429 });
  }

  // Bias auf die Region (Speyer) — liefert Vorderpfalz-Treffer zuerst.
  const url =
    "https://photon.komoot.io/api/?lang=de&limit=8&lat=49.317&lon=8.431&q=" +
    encodeURIComponent(q);

  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 });
    const data = (await res.json()) as { features?: PhotonFeature[] };

    const seen = new Set<string>();
    const results = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      if ((p.countrycode ?? "").toUpperCase() !== "DE") continue;
      const [lng, lat] = f.geometry?.coordinates ?? [];
      const label = buildLabel(p);
      if (!label || lat == null || lng == null || seen.has(label)) continue;
      seen.add(label);
      results.push({ label, lat, lng, city: cityOf(p), postcode: p.postcode || "" });
      if (results.length >= 5) break;
    }

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}

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

/**
 * Getippte Hausnummer aus der Suchanfrage ziehen: 1–4 Ziffern plus optionaler
 * Einzelbuchstabe ("14", "14a", "14 B"). Fünfstellige Zahlen (PLZ) bleiben
 * durch die Wortgrenzen außen vor. Heuristik: Straßennamen, die selbst Zahlen
 * tragen („Straße des 17. Juni"), können fälschlich greifen — folgenlos,
 * weil die Nummer nur ergänzt wird, wenn OSM sie ohnehin nicht kennt.
 */
function hausnummerAus(q: string): string | null {
  const m = q.match(/(?:^|[\s,.])(\d{1,4})\s?([a-zA-Z](?![a-zA-Z\d]))?/);
  if (!m) return null;
  return m[2] ? `${m[1]} ${m[2].toUpperCase()}` : m[1];
}

/** Vergleichsnormierung für Hausnummern/Straßen ("14 b" === "14B"). */
function norm(s?: string): string {
  return (s ?? "").replace(/\s+/g, "").toLowerCase();
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
    const hausnummer = hausnummerAus(q);
    const features = data.features ?? [];
    for (const f of features) {
      const p = f.properties ?? {};
      if ((p.countrycode ?? "").toUpperCase() !== "DE") continue;
      const [lng, lat] = f.geometry?.coordinates ?? [];
      let label = buildLabel(p);
      // OSM kennt längst nicht jede Hausnummer (Fall Manfred: Finkenstraße 14
      // Lampertheim — die Straße ist erfasst, die 14 fehlt in den Kartendaten).
      // Der Kundin verschwand dadurch ihre Hausnummer aus dem Vorschlag.
      // Deshalb: liefert Photon die STRASSE, die Eingabe enthält aber eine
      // Nummer, die OSM für diese Straße nirgends kennt, übernehmen wir die
      // getippte Nummer in den Vorschlag (Koordinate = Straßenmitte — für
      // Bodenrichtwert-Zone und Regionszuordnung mehr als genau genug).
      // Kennt OSM das Haus doch, bleibt dessen exakter Treffer unangetastet.
      if (
        hausnummer &&
        p.type === "street" &&
        !features.some((g) => {
          const gp = g.properties ?? {};
          return (
            norm(gp.housenumber) === norm(hausnummer) &&
            norm(gp.street || gp.name) === norm(p.street || p.name) &&
            cityOf(gp) === cityOf(p)
          );
        })
      ) {
        label = buildLabel({ ...p, street: p.street || p.name, housenumber: hausnummer });
      }
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

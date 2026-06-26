/**
 * Adress-Autocomplete + Geocoding über OpenStreetMap Nominatim (kostenlos, CORS-fähig).
 * Hinweis: für Produktion ggf. eigener/lizenzierter Geocoder + Consent (externer Call).
 */
export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  city: string;
  postcode: string;
}

type NominatimAddress = Record<string, string>;

function cityOf(a: NominatimAddress): string {
  return (
    a.city || a.town || a.village || a.municipality || a.city_district || a.suburb || ""
  );
}

/**
 * Sauberes deutsches Label aus den Adress-Komponenten — bewusst OHNE
 * Bundesland, Landkreis und „Deutschland". Format: „Straße Nr., PLZ Ort".
 */
function buildLabel(a: NominatimAddress, fallback: string): string {
  const street = a.road || a.pedestrian || a.footway || a.street || "";
  const num = a.house_number ? ` ${a.house_number}` : "";
  const plz = a.postcode || "";
  const city = cityOf(a);
  const cityPart = [plz, city].filter(Boolean).join(" ");
  const streetPart = street ? `${street}${num}` : "";
  const label = [streetPart, cityPart].filter(Boolean).join(", ");
  if (label) return label;
  // Fallback: nur die ersten beiden Teile der display_name (ohne Land/Bundesland).
  return fallback.split(",").slice(0, 2).join(",").trim();
}

export async function searchAddress(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  if (q.trim().length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=de&limit=6&q=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, { signal, headers: { "Accept-Language": "de" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: NominatimAddress;
    }>;
    const seen = new Set<string>();
    const out: GeoResult[] = [];
    for (const d of data) {
      const a = d.address ?? {};
      const label = buildLabel(a, d.display_name);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({
        label,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        city: cityOf(a),
        postcode: a.postcode || "",
      });
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}

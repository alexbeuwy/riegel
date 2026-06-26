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

export async function searchAddress(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  if (q.trim().length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=de&limit=5&q=" +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, { signal, headers: { "Accept-Language": "de" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;
    return data.map((d) => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      city:
        d.address?.city ||
        d.address?.town ||
        d.address?.village ||
        d.address?.municipality ||
        d.address?.suburb ||
        "",
      postcode: d.address?.postcode || "",
    }));
  } catch {
    return [];
  }
}

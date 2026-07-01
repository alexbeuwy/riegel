/**
 * Adress-Autocomplete über den eigenen Server-Proxy `/api/geocode`
 * (Photon/komoot, OSM-basiert). Bewusst NICHT direkt vom Browser zu einem
 * Drittanbieter: keine Nutzer-IP nach außen (DSGVO), CDN-Cache, zentrale
 * Drossel — und Nominatims Autocomplete-Verbot ist damit vom Tisch.
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
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: GeoResult[] };
    return (data.results ?? []).filter(
      (r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng),
    );
  } catch {
    return [];
  }
}

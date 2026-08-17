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

/**
 * Ortsnamen aus einem Adress-Label ziehen — Sicherheitsnetz, wenn das
 * city-Feld leer ist (Fall Bad Vilbel, 12.08.2026: Hero-URL trug
 * `address=Bad+Vilbel%2C+61118&city=` und die Engine bekam keinen Ort).
 * „Wormser Str. 13, 67346 Speyer" → „Speyer"; „Bad Vilbel, 61118" →
 * „Bad Vilbel" (reine PLZ-Segmente werden übersprungen).
 */
export function ortAusLabel(label: string): string {
  const teile = label.split(",").map((t) => t.trim());
  for (let i = teile.length - 1; i >= 0; i--) {
    const ohnePlz = teile[i].replace(/\b\d{5}\b/g, "").trim();
    if (ohnePlz) return ohnePlz;
  }
  return "";
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

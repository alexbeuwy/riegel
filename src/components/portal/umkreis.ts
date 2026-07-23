/**
 * Umkreissuche (Radius-Suche) fürs Immobilien-Portal.
 *
 * Warum eine eigene Ort-Parameter-Logik?
 * Die Seite filtert serverseitig (src/app/immobilien/page.tsx →
 * filterEstates) nach EXAKTER City, sobald `ort` gesetzt ist. Für einen
 * Umkreis brauchen wir aber auch die Objekte der NACHBARORTE — die serverseitig
 * schon wegfielen, wäre `ort` gesetzt. Deshalb:
 *
 *   - Exakt-Modus („Genauer Ort"): Ort steht in `ort` → Server filtert exakt
 *     wie bisher (unverändertes Verhalten).
 *   - Umkreis-Modus: Ort steht in `umkreis_ort` (Server ignoriert das) plus
 *     `umkreis` = Radius in km. Der Server liefert dann alle Orte, und die
 *     Radius-Auswahl passiert clientseitig (PortalView) rund um den
 *     Schwerpunkt (Centroid) des gewählten Orts.
 *
 * Diese Helfer kapseln das Umschalten zwischen beiden Modi an einer Stelle,
 * damit FilterBar und ActiveChips konsistent bleiben.
 */
import type { Estate } from "@/lib/mock-estates";
import { distanceKm } from "@/lib/geo-distance";

/**
 * Optionen des Umkreis-Selektors. Erste Option (leerer Wert) = „Genauer Ort"
 * (exaktes City-Matching wie bisher), danach die km-Radien.
 */
export const UMKREIS_OPTIONS: [string, string][] = [
  ["", "Genauer Ort"],
  ["5", "5 km"],
  ["10", "10 km"],
  ["25", "25 km"],
  ["50", "50 km"],
];

/** Nur die Lese-Seite von URLSearchParams / ReadonlyURLSearchParams. */
type ReadParams = { get(name: string): string | null };

/**
 * Aktuell gewählter Ort — im Exakt-Modus aus `ort`, im Umkreis-Modus aus
 * `umkreis_ort`. Leerer String = kein Ort gewählt.
 */
export function readCity(sp: ReadParams): string {
  return sp.get("ort") ?? sp.get("umkreis_ort") ?? "";
}

/** Aktueller Umkreis in km (0 = „Genauer Ort"/exakt). */
export function readRadiusKm(sp: ReadParams): number {
  const n = parseInt(sp.get("umkreis") ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Geokoordinaten des gewählten Orts aus der URL (`ort_lat`/`ort_lng`) — von
 * der Ort-Combobox beim Übernehmen eines Photon-Vorschlags gesetzt. Damit
 * funktioniert die Umkreissuche auch um Orte OHNE aktuellen Objektbestand
 * (cityCentroid hätte dort keinen Anker und fiele auf Exakt-Matching zurück).
 */
export function readCenter(sp: ReadParams): LatLng | null {
  const lat = parseFloat(sp.get("ort_lat") ?? "");
  const lng = parseFloat(sp.get("ort_lng") ?? "");
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Ort setzen bzw. entfernen und dabei Exakt-/Umkreis-Modus konsistent halten.
 * Bei aktivem Umkreis bleibt der Ort in `umkreis_ort` (nicht in `ort`, sonst
 * würde der Server wieder exakt filtern).
 */
export function setCity(p: URLSearchParams, city: string, geo?: LatLng): void {
  if (!city) {
    // Kein Ort → auch kein Umkreis, keine Koordinaten
    p.delete("ort");
    p.delete("umkreis_ort");
    p.delete("umkreis");
    p.delete("ort_lat");
    p.delete("ort_lng");
    return;
  }
  // Koordinaten des neuen Orts mitführen (Combobox/Photon) bzw. veraltete
  // des vorherigen Orts entfernen — sie gehören immer zum AKTUELLEN Ort.
  if (geo) {
    p.set("ort_lat", geo.lat.toFixed(5));
    p.set("ort_lng", geo.lng.toFixed(5));
  } else {
    p.delete("ort_lat");
    p.delete("ort_lng");
  }
  if (readRadiusKm(p) > 0) {
    p.set("umkreis_ort", city);
    p.delete("ort");
  } else {
    p.set("ort", city);
    p.delete("umkreis_ort");
    p.delete("umkreis");
  }
}

/**
 * Umkreis setzen bzw. auf „Genauer Ort" zurücknehmen. Verschiebt den Ort je
 * nach Modus zwischen `ort` (exakt) und `umkreis_ort` (Radius). Ohne gewählten
 * Ort passiert nichts (der Selektor ist dann ohnehin nicht sichtbar).
 */
export function setRadius(p: URLSearchParams, km: string): void {
  const city = readCity(p);
  const n = parseInt(km, 10);
  if (!city) {
    p.delete("umkreis");
    p.delete("umkreis_ort");
    return;
  }
  if (Number.isFinite(n) && n > 0) {
    p.set("umkreis", String(n));
    p.set("umkreis_ort", city);
    p.delete("ort");
  } else {
    // „Genauer Ort": zurück auf serverseitiges Exakt-Matching
    p.delete("umkreis");
    p.set("ort", city);
    p.delete("umkreis_ort");
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Schwerpunkt (Centroid) der geo-Koordinaten aller Objekte mit passender City
 * (Mittelwert aus lat/lng). `null`, wenn kein solches Objekt eine geo-Koordinate
 * hat — dann fällt die Umkreissuche auf exaktes City-Matching zurück.
 */
export function cityCentroid(estates: Estate[], city: string): LatLng | null {
  const c = city.trim().toLowerCase();
  if (!c) return null;
  let lat = 0;
  let lng = 0;
  let n = 0;
  for (const e of estates) {
    if (e.geo && e.city.toLowerCase() === c) {
      lat += e.geo.lat;
      lng += e.geo.lng;
      n += 1;
    }
  }
  if (n === 0) return null;
  return { lat: lat / n, lng: lng / n };
}

/**
 * Objekte im km-Umkreis um das Zentrum (Centroid) der gewählten City.
 *
 * - Objekte der gewählten City selbst sind IMMER enthalten (der Umkreis
 *   erweitert die Treffer nur, verkleinert sie nie).
 * - Nachbarobjekte kommen dazu, wenn ihre geo-Koordinate innerhalb des Radius
 *   um das Zentrum liegt.
 * - `fallbackCenter` (Photon-Koordinaten aus der Ort-Combobox, s. readCenter):
 *   greift, wenn der Ort keinen eigenen Bestand hat — so funktioniert die
 *   Umkreissuche auch um bestandsfreie Orte (wichtig für Suchaufträge).
 * - Ohne bestimmbaren Centroid UND ohne fallbackCenter: sauberer Rückfall
 *   auf exaktes City-Matching (bisheriges Verhalten).
 */
export function filterByRadius(
  estates: Estate[],
  city: string,
  km: number,
  fallbackCenter?: LatLng | null,
): Estate[] {
  const c = city.trim().toLowerCase();
  if (!c || km <= 0) return estates;
  const center = cityCentroid(estates, city) ?? fallbackCenter ?? null;
  if (!center) return estates.filter((e) => e.city.toLowerCase() === c);
  return estates.filter((e) => {
    if (e.city.toLowerCase() === c) return true;
    return e.geo != null && distanceKm(center.lat, center.lng, e.geo.lat, e.geo.lng) <= km;
  });
}

/** Chip-Label für den aktiven Umkreis (z. B. „10 km Umkreis"). */
export function umkreisChipLabel(km: number): string {
  return `${km} km Umkreis`;
}

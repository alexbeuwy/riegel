/**
 * Geografische Distanzberechnung (Haversine) — wiederverwendbare, exportierte
 * Hilfsfunktion, u. a. für die Umkreissuche im Immobilien-Portal.
 *
 * Formel und Erdradius sind bewusst identisch zur (dort nicht exportierten)
 * Referenz in src/lib/marktdaten.ts, damit beide Stellen dieselben Distanzen
 * liefern.
 */

/** Erdradius in km — Basis der Haversine-Distanz. */
export const EARTH_RADIUS_KM = 6371;

/** Haversine-Distanz in km zwischen zwei WGS84-Koordinaten. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

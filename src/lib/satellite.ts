/**
 * Luftbild-Beschaffung für RIEGEL-PDF-Reports — server-only. Ausgelagert aus
 * api/report/route.ts, weil die /intern-Regeneration (api/intern/report)
 * exakt dieselbe Funktion braucht (Report aus einer gespeicherten
 * valuation_requests-Zeile neu bauen, statt aus einem Live-Formular).
 */

/**
 * Luftbild des Objekts als Base64-JPEG — Esri World Imagery (u. a. Maxar),
 * dieselbe Quelle wie die Satellitenkarte im Rechner, zentriert auf die
 * vom Nutzer eingegebenen Koordinaten. Fehlertolerant (null bei Problemen).
 */
export async function fetchSatellite(lat: number | null, lng: number | null): Promise<string | null> {
  if (lat == null || lng == null) return null;
  const latRad = (lat * Math.PI) / 180;
  const dLon = 150 / (111320 * Math.cos(latRad)); // ~300 m breit
  const dLat = 90 / 110540; // ~180 m hoch (5:3)
  const bbox = `${lng - dLon},${lat - dLat},${lng + dLon},${lat + dLat}`;
  const url =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=1200,720&format=jpg&f=image`;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null; // kein gültiges Bild
    return buf.toString("base64");
  } catch {
    return null;
  }
}

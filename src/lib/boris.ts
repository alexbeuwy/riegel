/**
 * Amtliche Bodenrichtwerte (VBORIS RLP, Basisdienst) — server-only.
 *
 * Quelle: LVermGeo RLP, WMS-GetFeatureInfo, Open Data (dl-de/by-2.0). Der
 * freie Basisdienst liefert seine Attribute NUR über INFO_FORMAT=text/html
 * (verifiziert: application/json und text/plain liefern keine Werte) —
 * daher zwingend HTML-Parsing statt eines strukturierten Formats.
 *
 * Rechtlich: der Basisdienst ist Open Data; die schriftliche
 * Nutzungsbestätigung des LVermGeo für den produktiven Einsatz auf einer
 * kommerziellen Maklerseite läuft noch (siehe docs/preisatlas-research.md
 * §6, „RLP-WFS-Nutzungsbedingungen"). Bis zur Bestätigung bleibt die
 * Anbindung deshalb strikt fail-soft: JEDES Problem (Timeout, HTTP-Fehler,
 * Parse-Fehler, Lage außerhalb bebauter Zonen/RLP) liefert `null` statt
 * einer Fehlermeldung — der Rechner fällt dann auf den bisherigen
 * Modellwert zurück.
 */

export interface Bodenrichtwert {
  brw: number;
  stichtag: string;
  zone: string;
  nutzung: string;
  gemeinde: string;
}

/** Pflicht-Quellenangabe bei jeder Anzeige/Weitergabe der Werte (dl-de/by-2.0). */
export const BORIS_ATTRIBUTION = "© GeoBasis-DE / LVermGeo RLP (dl-de/by-2.0)";

const ENDPOINT = "https://geo5.service24.rlp.de/wms/RLP_VBORISFREE2026.fcgi";
const TIMEOUT_MS = 6000;

/* ─────────────────────────  In-Memory-Cache  ───────────────────────── */
/**
 * Key = lat/lng gerundet auf 3 Nachkommastellen (~110 m, kleiner als eine
 * Bodenrichtwertzone) — benachbarte Abfragen in derselben Zone landen im
 * selben Cache-Eintrag. TTL 24 h; nur ECHTE Serverantworten werden
 * gecacht (auch ein legitimes „außerhalb der Zone" → null), Netzwerk-/
 * Timeout-Fehler NICHT — sonst würde ein einzelner Ausfall eine ganze Zone
 * für 24 h fälschlich auf null einfrieren.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;
const cache = new Map<string, { value: Bodenrichtwert | null; expires: number }>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function cacheSet(key: string, value: Bodenrichtwert | null): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/* ─────────────────────────  Fail-soft Logging  ───────────────────────── */
// Einmalig knapp warnen statt bei jedem Request die Logs zu fluten.
let warned = false;
function warnOnce(msg: string): void {
  if (warned) return;
  warned = true;
  console.warn(`[boris] ${msg}`);
}

/* ─────────────────────────  HTML-Parsing  ───────────────────────── */

/** Numerische UND benannte HTML-Entities auflösen (Antwort ist Latin-1/UTF-8-HTML). */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&sup2;/gi, "²")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

/**
 * Liest den Wert einer Zeile „<Label>-Zelle → Werte-Zelle" aus der
 * GetFeatureInfo-HTML-Tabelle. Robust gegen zusätzliche Attribute/Tags
 * (z. B. `<b>…</b>`) in der Werte-Zelle — Tags werden nach dem Match entfernt.
 */
function extractField(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*</t[dh]>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return text || null;
}

/** Deutsches Zahlenformat ("1.250" / "540,5") → number, sonst NaN. */
function parseGermanNumber(raw: string): number {
  const match = raw.match(/[\d.,]+/);
  if (!match) return NaN;
  const normalized = match[0].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return parseFloat(normalized);
}

function parseBodenrichtwertHtml(html: string): Bodenrichtwert | null {
  const brwRaw = extractField(html, "Bodenrichtwert");
  if (!brwRaw) return null; // Tabelle fehlt/kein Feature → außerhalb Zone
  const brw = Math.round(parseGermanNumber(brwRaw));
  if (!Number.isFinite(brw) || brw <= 0) return null;

  return {
    brw,
    stichtag: extractField(html, "Wertermittlungsstichtag") ?? "",
    zone: extractField(html, "Nummer der Bodenrichtwertzone") ?? "",
    nutzung: extractField(html, "Nutzungsart") ?? "",
    gemeinde: extractField(html, "Gemeinde") ?? "",
  };
}

/* ─────────────────────────  Öffentliche Funktion  ───────────────────────── */

/**
 * Amtlichen Bodenrichtwert für eine Koordinate abfragen (VBORIS-RLP-Basisdienst).
 * Fail-soft: liefert bei JEDEM Problem `null` (Timeout 6 s, HTTP-Fehler,
 * Parse-Fehler, Lage außerhalb bebauter Zonen oder außerhalb von RLP).
 */
export async function fetchBodenrichtwert(lat: number, lng: number): Promise<Bodenrichtwert | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  const d = 0.001;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const url =
    `${ENDPOINT}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=RLP_1&QUERY_LAYERS=RLP_1` +
    `&STYLES=&SRS=EPSG:4326&BBOX=${bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50&INFO_FORMAT=text/html&FEATURE_COUNT=1`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let result: Bodenrichtwert | null = null;
  let responded = false;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.ok) {
      responded = true;
      result = parseBodenrichtwertHtml(await res.text());
    }
  } catch {
    // Timeout/Netzwerkfehler — NICHT cachen (s. Cache-Kommentar oben).
    warnOnce("Abfrage fehlgeschlagen (Timeout/Netzwerk) — fail-soft, liefere null.");
  } finally {
    clearTimeout(timer);
  }

  if (responded) cacheSet(key, result);
  return result;
}

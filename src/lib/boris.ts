/**
 * Amtliche Bodenrichtwerte — server-only, zwei Provider:
 *
 * RLP — VBORIS-Basisdienst (LVermGeo, WMS-GetFeatureInfo, Open Data
 * dl-de/by-2.0). Der freie Basisdienst liefert seine Attribute NUR über
 * INFO_FORMAT=text/html (verifiziert: application/json und text/plain
 * liefern keine Werte) — daher zwingend HTML-Parsing.
 *
 * HESSEN — BORIS-Hessen-WFS (HVBG, dokumentierter Open-Data-Dienst,
 * https://www.gds.hessen.de/wfs2/boris/…). Die Capabilities erlauben
 * ausdrücklich den automatisierten, kostenfreien Abruf inkl. Einbindung in
 * kommerzielle Produkte (§ 1 Abs. 2 GAKostG, § 17 Abs. 4 BauGB-AV) —
 * die sauberste Rechtsgrundlage aller drei Nachbarländer. Punktabfrage per
 * WFS-2.0-Intersects auf die zonalen Richtwerte (BR_BodenrichtwertZonal).
 *
 * Baden-Württemberg fehlt BEWUSST: kein dokumentierter, frei lizenzierter
 * Dienst; der einzige technische Weg wäre ein Referer-gegateter,
 * undokumentierter ArcGIS-Endpunkt auf IT.NRW-Infrastruktur (Befund und
 * Entscheidung s. docs/preisatlas-research.md).
 *
 * Rechtlich RLP: der Basisdienst ist Open Data; die schriftliche
 * Nutzungsbestätigung des LVermGeo für den produktiven Einsatz auf einer
 * kommerziellen Maklerseite läuft noch (siehe docs/preisatlas-research.md
 * §6, „RLP-WFS-Nutzungsbedingungen"). Beide Provider sind deshalb strikt
 * fail-soft: JEDES Problem (Timeout, HTTP-Fehler, Parse-Fehler, Lage
 * außerhalb bebauter Zonen/außerhalb beider Länder) liefert `null` statt
 * einer Fehlermeldung — der Rechner fällt dann auf den Modellwert zurück.
 */

export type BorisQuelle = "RLP" | "HE";

export interface Bodenrichtwert {
  brw: number;
  stichtag: string;
  zone: string;
  nutzung: string;
  gemeinde: string;
  /** Liefernder Landesdienst — steuert Badge und Quellenvermerk. */
  quelle: BorisQuelle;
}

/**
 * Objektart-Hinweis für die Zonenwahl bei ÜBERLAPPENDEN Richtwertzonen
 * (Hessen führt z. B. in Lampertheim deckungsgleiche W-Zonen für EFH- und
 * MFH-Bebauung mit 260 vs. 490 €/m²). RLP-WMS liefert ohnehin nur ein
 * Feature und ignoriert den Hinweis.
 */
export type BorisNutzungsHint = "wohnen" | "mfh" | "gewerbe";

/** Anzeige-Name + Pflicht-Quellenvermerk je Landesdienst. */
export const BORIS_QUELLEN: Record<BorisQuelle, { name: string; attribution: string }> = {
  RLP: { name: "BORIS-RLP", attribution: "© GeoBasis-DE / LVermGeo RLP (dl-de/by-2.0)" },
  HE: { name: "BORIS Hessen", attribution: "© HVBG — Hessische Verwaltung für Bodenmanagement und Geoinformation" },
};

/** Rückwärtskompatibel: RLP-Quellenvermerk (bestehende Aufrufer/alte PDFs). */
export const BORIS_ATTRIBUTION = BORIS_QUELLEN.RLP.attribution;

/**
 * Grobe Länder-BBoxen (inkl. Toleranzrand) — Vorfilter, damit niemand die
 * externen Landesdienste mit offensichtlich unplausiblen Koordinaten
 * kontaktiert. Die Boxen ÜBERLAPPEN sich am Rhein; die Dispatch-Logik fragt
 * deshalb sequenziell (RLP zuerst, dann Hessen) — ein Punkt liegt real nur
 * in einem Land, das jeweils andere antwortet „außerhalb der Zone".
 */
export const RLP_BBOX = { lngMin: 6.1, lngMax: 8.6, latMin: 48.9, latMax: 50.9 };
const HE_BBOX = { lngMin: 7.75, lngMax: 10.3, latMin: 49.35, latMax: 51.7 };

export function isInRlpBbox(lat: number, lng: number): boolean {
  return lat >= RLP_BBOX.latMin && lat <= RLP_BBOX.latMax && lng >= RLP_BBOX.lngMin && lng <= RLP_BBOX.lngMax;
}

function isInHessenBbox(lat: number, lng: number): boolean {
  return lat >= HE_BBOX.latMin && lat <= HE_BBOX.latMax && lng >= HE_BBOX.lngMin && lng <= HE_BBOX.lngMax;
}

/** Liegt die Koordinate im Einzugsgebiet IRGENDEINES angebundenen Dienstes? */
export function isImBorisGebiet(lat: number, lng: number): boolean {
  return isInRlpBbox(lat, lng) || isInHessenBbox(lat, lng);
}

/** Rechner-Objektart → Zonenwahl-Hinweis (unbekannte Strings → Wohnen). */
export function hintFuerObjektart(objektart?: string): BorisNutzungsHint {
  if (objektart === "gewerbe") return "gewerbe";
  if (objektart === "mehrfamilienhaus") return "mfh";
  return "wohnen";
}

const ENDPOINT = "https://geo5.service24.rlp.de/wms/RLP_VBORISFREE2026.fcgi";
const HE_ENDPOINT_BASE = "https://www.gds.hessen.de/wfs2/boris/cgi-bin/brw";
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

function cacheKey(lat: number, lng: number, hint?: BorisNutzungsHint): string {
  // Der Hint gehört in den Key: bei überlappenden Hessen-Zonen wählt er die
  // Zone aus — derselbe Punkt kann je Objektart einen anderen Wert tragen.
  return `${lat.toFixed(3)},${lng.toFixed(3)},${hint ?? ""}`;
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
// Einmalig knapp warnen statt bei jedem Request die Logs zu fluten — je
// Kategorie eigenes „once", sonst würde z. B. ein Format-Wechsel des Diensts
// von einem früheren Netzwerkfehler-Log verdeckt bleiben.
const warnedCategories = new Set<string>();
function warnOnce(category: string, msg: string): void {
  if (warnedCategories.has(category)) return;
  warnedCategories.add(category);
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
    quelle: "RLP",
  };
}

/* ─────────────────────  Provider Hessen (BORIS-Hessen-WFS)  ───────────────────── */

/**
 * WGS84 → UTM Zone 32N (EPSG:25832), Standard-Transversal-Mercator auf dem
 * GRS80-Ellipsoid. Der Hessen-WFS verlangt seine Filter-Geometrie im
 * Standard-CRS des Dienstes; die Genauigkeit der Reihenentwicklung liegt im
 * Millimeterbereich — mehr als genug für eine Zonenabfrage.
 */
function wgs84ZuUtm32(lat: number, lng: number): { e: number; n: number } {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const k0 = 0.9996;
  const lon0 = Math.PI / 20; // 9° Ost
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const latR = (lat * Math.PI) / 180;
  const lonR = (lng * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(latR) ** 2);
  const T = Math.tan(latR) ** 2;
  const C = ep2 * Math.cos(latR) ** 2;
  const A = Math.cos(latR) * (lonR - lon0);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * latR -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * latR) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * latR) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * latR));
  const e =
    k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  const n =
    k0 *
    (M +
      N *
        Math.tan(latR) *
        (A ** 2 / 2 +
          ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
          ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  return { e, n };
}

/**
 * Hessen veröffentlicht die zonalen Richtwerte je STICHTAGSJAHR unter einem
 * eigenen Pfad (…/brw/2024/wfs, …/brw/2026/wfs sobald freigegeben; alle zwei
 * Jahre, gerade Jahrgänge). Welcher Jahrgang schon existiert, klärt der
 * erste echte Request (404 → nächstältester Jahrgang); das Ergebnis wird
 * 24 h gemerkt, damit der frisch freigegebene Jahrgang automatisch
 * übernommen wird, ohne jede Abfrage doppelt zu schicken.
 */
let heJahrgangMemo: { jahr: number; expires: number } | null = null;

function heJahrgangKandidaten(): number[] {
  const jetzt = new Date().getFullYear();
  const gerade = jetzt % 2 === 0 ? jetzt : jetzt - 1;
  return [gerade, gerade - 2];
}

function heRequestXml(e: number, n: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="10"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:boris="http://www.adv-online.de/namespaces/adv/brm/2.1"
  xmlns:adv="http://www.adv-online.de/namespaces/adv/gid/7.1">
  <wfs:Query typeNames="boris:BR_BodenrichtwertZonal">
    <fes:Filter><fes:Intersects><fes:ValueReference>adv:position</fes:ValueReference>
      <gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::25832"><gml:pos>${e.toFixed(1)} ${n.toFixed(1)}</gml:pos></gml:Point>
    </fes:Intersects></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

interface HeZone {
  brw: number;
  stichtag: string;
  zone: string;
  art: string;
  ergaenzung: string;
  entwicklung: string;
  gemeinde: string;
}

function heFeld(f: string, tag: string): string {
  const m = f.match(new RegExp(`<boris:${tag}>([^<]*)`));
  return m ? m[1].trim() : "";
}

function parseHeZonen(xml: string): HeZone[] {
  const zonen: HeZone[] = [];
  for (const m of xml.matchAll(/<boris:BR_BodenrichtwertZonal[\s\S]*?<\/boris:BR_BodenrichtwertZonal>/g)) {
    const f = m[0];
    const brw = parseFloat(heFeld(f, "bodenrichtwert"));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    const gemeindeBlock = f.match(/<boris:gemeinde>[\s\S]*?<boris:name>([^<]*)/);
    zonen.push({
      brw: Math.round(brw),
      stichtag: heFeld(f, "stichtag"),
      zone: heFeld(f, "bodenrichtwertNummer"),
      art: heFeld(f, "art"),
      ergaenzung: heFeld(f, "ergaenzung"),
      entwicklung: heFeld(f, "entwicklungszustand"),
      gemeinde: gemeindeBlock ? gemeindeBlock[1].trim() : "",
    });
  }
  return zonen;
}

/**
 * Zonenwahl bei überlappenden Richtwertzonen: baureifes Land vor
 * Entwicklungs-/Rohbauland, dann die zur Objektart passende Nutzungsart.
 * Ohne Hinweis gewinnt die generische Wohnbau-Zone (ohne MFH-/GEW-Zusatz) —
 * die konservativere Lesart für den typischen Rechner-Fall.
 */
function heZoneWaehlen(zonen: HeZone[], hint?: BorisNutzungsHint): HeZone | null {
  if (zonen.length === 0) return null;
  const score = (z: HeZone): number => {
    let s = 0;
    if (z.entwicklung === "B") s += 4;
    const istMfh = /MFH|MH|GH/i.test(z.ergaenzung);
    if (hint === "gewerbe") {
      if (z.art === "G") s += 2;
      else if (z.art === "M") s += 1;
    } else if (hint === "mfh") {
      if (z.art === "W") s += 2;
      if (istMfh) s += 1;
    } else {
      if (z.art === "W") s += 2;
      if (!istMfh) s += 1;
    }
    return s;
  };
  return [...zonen].sort((a, b) => score(b) - score(a))[0];
}

/** ISO-Datum ("2024-01-01") → deutsche Anzeige ("01.01.2024"), sonst roh. */
function stichtagDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/**
 * Punktabfrage BORIS Hessen. `responded` = der Dienst hat geantwortet (auch
 * ein leeres „außerhalb jeder Zone") — nur dann darf gecacht werden.
 */
async function fetchHessen(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<{ value: Bodenrichtwert | null; responded: boolean }> {
  const { e, n } = wgs84ZuUtm32(lat, lng);
  const body = heRequestXml(e, n);
  const jetzt = Date.now();
  const jahre =
    heJahrgangMemo && heJahrgangMemo.expires > jetzt ? [heJahrgangMemo.jahr] : heJahrgangKandidaten();

  for (const jahr of jahre) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${HE_ENDPOINT_BASE}/${jahr}/wfs`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body,
        signal: ctrl.signal,
      });
      if (res.status === 404) continue; // Jahrgang (noch) nicht freigegeben → nächstälterer
      if (!res.ok) return { value: null, responded: false };
      heJahrgangMemo = { jahr, expires: jetzt + CACHE_TTL_MS };
      const zone = heZoneWaehlen(parseHeZonen(await res.text()), hint);
      if (!zone) return { value: null, responded: true }; // legitim: außerhalb jeder Zone
      return {
        value: {
          brw: zone.brw,
          stichtag: stichtagDe(zone.stichtag),
          zone: zone.zone,
          nutzung: [zone.art, zone.ergaenzung].filter(Boolean).join(" "),
          gemeinde: zone.gemeinde,
          quelle: "HE",
        },
        responded: true,
      };
    } catch {
      warnOnce("he-network", "BORIS-Hessen-Abfrage fehlgeschlagen (Timeout/Netzwerk) — fail-soft, liefere null.");
      return { value: null, responded: false };
    } finally {
      clearTimeout(timer);
    }
  }
  // Kein Kandidaten-Jahrgang existiert (sollte nie passieren) — bestätigt null.
  warnOnce("he-jahrgang", "Kein BORIS-Hessen-Jahrgang erreichbar (alle Kandidaten 404) — URL-Schema des HVBG prüfen.");
  return { value: null, responded: true };
}

/* ─────────────────────────  Öffentliche Funktion  ───────────────────────── */

/**
 * Wie fetchBodenrichtwert(), liefert aber zusätzlich `confirmed`: true bei
 * einer bestätigten Antwort (Cache-Treffer, HTTP ok — auch wenn `value` dabei
 * null ist, weil die Lage außerhalb einer Zone/RLP liegt), false bei einem
 * transienten Fehler (Timeout/Netzwerk). Aufrufer, die auf HTTP-/CDN-Ebene
 * cachen (z. B. die Bodenrichtwert-Route), dürfen NUR bestätigte Antworten
 * langfristig cachen — sonst würde ein einzelner Ausfall wie ein bestätigtes
 * „außerhalb der Zone" 24 h lang wiederholt ausgeliefert.
 */
async function fetchBodenrichtwertRaw(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<{ value: Bodenrichtwert | null; confirmed: boolean }> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { value: null, confirmed: true };
  // Außerhalb aller angebundenen Länder: bestätigte Ablehnung, kein Netzwerk-Call.
  if (!isImBorisGebiet(lat, lng)) return { value: null, confirmed: true };

  const key = cacheKey(lat, lng, hint);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return { value: hit.value, confirmed: true };

  // Sequenzieller Dispatch: RLP zuerst (Bestandsverhalten), bei „kein
  // Treffer" dann Hessen — die BBoxen überlappen am Rhein, real liegt jeder
  // Punkt nur in einem Land, das andere antwortet leer. `confirmed` ist nur
  // dann true, wenn JEDER kontaktierte Dienst geantwortet hat — sonst würde
  // ein transienter RLP-Ausfall als „kein Wert" 24 h im CDN-Cache landen,
  // obwohl Hessen einen Wert gehabt hätte (und umgekehrt).
  let value: Bodenrichtwert | null = null;
  let allResponded = true;

  if (isInRlpBbox(lat, lng)) {
    const rlp = await fetchRlp(lat, lng);
    value = rlp.value;
    allResponded = rlp.responded;
  }
  if (!value && isInHessenBbox(lat, lng)) {
    const he = await fetchHessen(lat, lng, hint);
    value = he.value;
    allResponded = allResponded && he.responded;
  }

  if (allResponded) cacheSet(key, value);
  return { value, confirmed: allResponded };
}

/** RLP-Provider (VBORIS-WMS): unverändertes Abfrage- und Parse-Verhalten. */
async function fetchRlp(lat: number, lng: number): Promise<{ value: Bodenrichtwert | null; responded: boolean }> {
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
      if (!result) {
        // Kann ein legitimes „außerhalb der Zone" sein — bei dauerhaftem
        // Auftreten aber auch ein Format-Wechsel des Diensts. Einmalig
        // warnen, damit ein schleichender Format-Bruch in den Logs auffällt.
        warnOnce("parse", "HTTP ok, aber kein Bodenrichtwert aus der Antwort extrahiert (normal außerhalb einer Zone — bei dauerhaftem Auftreten Format-Wechsel des LVermGeo-Diensts prüfen).");
      }
    }
  } catch {
    // Timeout/Netzwerkfehler — NICHT cachen (s. Cache-Kommentar oben).
    warnOnce("network", "Abfrage fehlgeschlagen (Timeout/Netzwerk) — fail-soft, liefere null.");
  } finally {
    clearTimeout(timer);
  }

  return { value: result, responded };
}

/**
 * Amtlichen Bodenrichtwert für eine Koordinate abfragen (RLP: VBORIS-WMS,
 * Hessen: BORIS-WFS). Fail-soft: liefert bei JEDEM Problem `null` (Timeout
 * 6 s je Dienst, HTTP-Fehler, Parse-Fehler, Lage außerhalb bebauter Zonen
 * oder außerhalb beider Länder).
 */
export async function fetchBodenrichtwert(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<Bodenrichtwert | null> {
  return (await fetchBodenrichtwertRaw(lat, lng, hint)).value;
}

/** Wie fetchBodenrichtwert(), aber mit `confirmed`-Flag für Cache-Control-Header (s. oben). */
export async function fetchBodenrichtwertWithStatus(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<{ value: Bodenrichtwert | null; confirmed: boolean }> {
  return fetchBodenrichtwertRaw(lat, lng, hint);
}

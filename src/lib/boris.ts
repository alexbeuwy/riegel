/**
 * Amtliche Bodenrichtwerte — server-only, elf aktive Landesdienste.
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
 * NEU (08/2026, Recherche-Leaves R1–R3 + Live-Beweise je Land): neun
 * weitere Länder sind angebunden. Alle laufen unter einer Lizenz, die
 * KOMMERZIELLE Weiterverwendung ausdrücklich erlaubt (dl-de/by-2.0,
 * dl-de/zero-2.0 bzw. CC BY 4.0) — der jeweilige Pflicht-Quellenvermerk
 * steht wörtlich in BORIS_QUELLEN und wird von Rechner-Badge und PDF
 * gezogen:
 *
 *   NI  Niedersachsen  — LGLN-WFS (AdV-BORIS-2.0-Schema), EPSG:4326 direkt
 *   HB  Bremen         — technisch derselbe LGLN-WFS (Bremen lässt seine
 *                        BRW vom niedersächsischen LGLN mitbetreiben);
 *                        Bremerhaven ist im selben Dienst enthalten (live
 *                        gegengeprüft, Zone „Havenwelten")
 *   NW  Nordrhein-Westfalen — Geobasis-NRW-WMS, GetFeatureInfo als GeoJSON
 *   BB  Brandenburg    — LGB-WFS, ZWEISTUFIG (Geometrie und Wert liegen in
 *                        getrennten FeatureTypes, s. fetchBrandenburg)
 *   HH  Hamburg        — LGV-WFS (deegree), ein FeatureType mit allen
 *                        Jahrgängen und je Nutzungsart ein eigener Wert
 *   SN  Sachsen        — GeoSN-WMS, Werte NUR über den Gruppen-Layer und
 *                        NUR als HTML (Sachsens Group-Layer-Falle, s. u.)
 *   TH  Thüringen      — Geoproxy-WFS, alle Stichtage seit 2008 in EINER
 *                        Antwort → jüngsten Stichtag ≤ heute wählen
 *   ST  Sachsen-Anhalt — LVermGeo-ArcGIS-REST (sauberes JSON)
 *   MV  Mecklenburg-Vorpommern — AGVK-WFS, Bauflächenarten als SEPARATE
 *                        FeatureTypes (ein Request mit mehreren Queries)
 *
 * Berlin ist vollständig implementiert, aber DEAKTIVIERT — Begründung und
 * Freischalt-Anleitung stehen direkt bei fetchBerlin().
 *
 * Baden-Württemberg fehlt BEWUSST: kein dokumentierter, frei lizenzierter
 * Dienst; der einzige technische Weg wäre ein Referer-gegateter,
 * undokumentierter ArcGIS-Endpunkt auf IT.NRW-Infrastruktur (Befund und
 * Entscheidung s. docs/preisatlas-research.md). Bayern ist kostenpflichtig.
 * Schleswig-Holstein und Saarland wurden nach Lizenzprüfung ABGELEHNT: SH
 * erlaubt seinen Darstellungsdienst laut eigenen Fees nur für den privaten
 * Gebrauch, das Saarland verbietet die gewerbliche Weiterverwendung
 * ausdrücklich. Beides ist eine Lizenz-, keine Technikfrage — kein
 * Referer-Faking, keine Umgehung (BW-Lehre).
 *
 * Rechtlich RLP: der Basisdienst ist Open Data; die schriftliche
 * Nutzungsbestätigung des LVermGeo für den produktiven Einsatz auf einer
 * kommerziellen Maklerseite läuft noch (siehe docs/preisatlas-research.md
 * §6, „RLP-WFS-Nutzungsbedingungen"). ALLE Provider sind strikt fail-soft:
 * JEDES Problem (Timeout, HTTP-Fehler, Parse-Fehler, Lage außerhalb
 * bebauter Zonen/außerhalb aller Länder) liefert `null` statt einer
 * Fehlermeldung — der Rechner fällt dann auf den Modellwert zurück.
 *
 * Regressionsschutz: nach JEDER Änderung an dieser Datei
 * `node node_modules/.bin/tsx scripts/boris-live-check.mts` laufen lassen —
 * das Skript fragt je aktivem Land die Spec-Testkoordinate live ab.
 */

export type BorisQuelle =
  | "RLP"
  | "HE"
  | "NI"
  | "HB"
  | "NW"
  | "BB"
  | "HH"
  | "SN"
  | "TH"
  | "ST"
  | "MV"
  // Vorbereitet, aber nicht im Dispatcher (s. fetchBerlin).
  | "BE";

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

/**
 * Anzeige-Name + Pflicht-Quellenvermerk je Landesdienst. Die
 * attribution-Strings sind WÖRTLICH aus der jeweiligen Lizenzquelle
 * übernommen (Capabilities-Fees/AccessConstraints bzw. die amtliche
 * Nutzungsbedingungs-Seite) — nicht umformulieren, sie sind die
 * Erfüllung der Namensnennungspflicht.
 */
export const BORIS_QUELLEN: Record<BorisQuelle, { name: string; attribution: string }> = {
  RLP: { name: "BORIS-RLP", attribution: "© GeoBasis-DE / LVermGeo RLP (dl-de/by-2.0)" },
  HE: { name: "BORIS Hessen", attribution: "© HVBG — Hessische Verwaltung für Bodenmanagement und Geoinformation" },
  // ows:Fees des LGLN-WFS: „Dieses Angebot kann gemäß der 'Datenlizenz
  // Deutschland Namensnennung 2.0' … genutzt werden.", Metadatenblock
  // "quelle": "© GDI-NI".
  NI: { name: "BORIS Niedersachsen", attribution: "© GDI-NI (dl-de/by-2.0)" },
  // Bremen läuft auf derselben LGLN-Infrastruktur unter derselben Lizenz —
  // deshalb GDI-NI und ausdrücklich NICHT „© Land Bremen".
  HB: { name: "BORIS Bremen", attribution: "© GDI-NI (dl-de/by-2.0)" },
  // NRW steht unter dl-de/zero-2.0 — rechtlich OHNE Namensnennungspflicht.
  // Wir führen den Herkunftsvermerk trotzdem: der Nutzer soll sehen, wessen
  // amtliche Zahl in seinem Report steht (Transparenz vor Minimalpflicht).
  NW: { name: "BORIS-NRW", attribution: "Bodenrichtwerte: BORIS-NRW / GeoBasis NRW, dl-de/zero-2.0" },
  BB: { name: "BORIS Brandenburg", attribution: "© GeoBasis-DE/LGB, dl-de/by-2-0" },
  HH: {
    name: "BORIS Hamburg",
    attribution: "Freie und Hansestadt Hamburg, Landesbetrieb Geoinformation und Vermessung (dl-de/by-2.0)",
  },
  SN: { name: "BORIS-SN", attribution: "Quelle: GeoSN, dl-de/by-2-0" },
  TH: { name: "BORIS Thüringen", attribution: "© GDI-Th — Geodateninfrastruktur Thüringen (dl-de/by-2.0)" },
  ST: { name: "BORIS Sachsen-Anhalt", attribution: "© LVermGeo Sachsen-Anhalt, dl-de/by-2-0" },
  MV: { name: "BORIS M-V", attribution: "© GeoBasis-DE/M-V (CC BY 4.0)" },
  BE: { name: "BORIS Berlin", attribution: "Bodenrichtwerte: Geoportal Berlin / SenStadt, dl-de/zero-2.0" },
};

/** Rückwärtskompatibel: RLP-Quellenvermerk (bestehende Aufrufer/alte PDFs). */
export const BORIS_ATTRIBUTION = BORIS_QUELLEN.RLP.attribution;

/* ─────────────────────────  Länder-BBoxen  ───────────────────────── */
/**
 * Grobe Länder-BBoxen (inkl. Toleranzrand) — Vorfilter, damit niemand die
 * externen Landesdienste mit offensichtlich unplausiblen Koordinaten
 * kontaktiert. Die Boxen ÜBERLAPPEN sich an jeder Landesgrenze; die
 * Dispatch-Logik fragt deshalb sequenziell in der in PROVIDER festgelegten
 * Reihenfolge — ein Punkt liegt real nur in einem Land, das jeweils andere
 * antwortet „außerhalb der Zone".
 */
interface BorisBbox {
  lngMin: number;
  lngMax: number;
  latMin: number;
  latMax: number;
}

export const RLP_BBOX: BorisBbox = { lngMin: 6.1, lngMax: 8.6, latMin: 48.9, latMax: 50.9 };
const HE_BBOX: BorisBbox = { lngMin: 7.75, lngMax: 10.3, latMin: 49.35, latMax: 51.7 };
const NI_BBOX: BorisBbox = { lngMin: 6.5, lngMax: 11.65, latMin: 51.25, latMax: 53.95 };
// Bremen ist ein Zwei-Städte-Land: Stadtgemeinde Bremen UND Bremerhaven
// (~60 km nördlich). Eine gemeinsame Box deckt beide ab und liegt komplett
// in der NI-Box — deshalb steht HB im Dispatcher VOR NI.
const HB_BBOX: BorisBbox = { lngMin: 8.44, lngMax: 9.0, latMin: 53.0, latMax: 53.63 };
const NW_BBOX: BorisBbox = { lngMin: 5.8, lngMax: 9.5, latMin: 50.28, latMax: 52.55 };
const BB_BBOX: BorisBbox = { lngMin: 11.2, lngMax: 14.8, latMin: 51.33, latMax: 53.6 };
const HH_BBOX: BorisBbox = { lngMin: 8.4, lngMax: 10.35, latMin: 53.38, latMax: 53.75 };
const SN_BBOX: BorisBbox = { lngMin: 11.85, lngMax: 15.1, latMin: 50.15, latMax: 51.7 };
const TH_BBOX: BorisBbox = { lngMin: 9.85, lngMax: 12.7, latMin: 50.15, latMax: 51.7 };
const ST_BBOX: BorisBbox = { lngMin: 10.5, lngMax: 13.25, latMin: 50.9, latMax: 53.1 };
const MV_BBOX: BorisBbox = { lngMin: 10.55, lngMax: 14.45, latMin: 53.05, latMax: 54.75 };
/** Nur für den vorbereiteten, deaktivierten Berlin-Provider (s. fetchBerlin). */
const BE_BBOX: BorisBbox = { lngMin: 13.05, lngMax: 13.8, latMin: 52.32, latMax: 52.7 };

function imBbox(b: BorisBbox, lat: number, lng: number): boolean {
  return lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax;
}

export function isInRlpBbox(lat: number, lng: number): boolean {
  return imBbox(RLP_BBOX, lat, lng);
}

/** Rechner-Objektart → Zonenwahl-Hinweis (unbekannte Strings → Wohnen). */
export function hintFuerObjektart(objektart?: string): BorisNutzungsHint {
  if (objektart === "gewerbe") return "gewerbe";
  if (objektart === "mehrfamilienhaus") return "mfh";
  return "wohnen";
}

const ENDPOINT = "https://geo5.service24.rlp.de/wms/RLP_VBORISFREE2026.fcgi";
const HE_ENDPOINT_BASE = "https://www.gds.hessen.de/wfs2/boris/cgi-bin/brw";
const NI_ENDPOINT = "https://opendata.lgln.niedersachsen.de/doorman/noauth/boris_wfs";
// Der jahrgangslose Alias existiert (live geprüft: liefert dieselben
// 2026er-Werte wie borishb_2026_wfs) — damit entfällt die in der Spec
// befürchtete jährliche Pfadpflege für Bremen.
const HB_ENDPOINT = "https://opendata.lgln.niedersachsen.de/doorman/noauth/borishb_wfs";
const NW_ENDPOINT = "https://www.wms.nrw.de/boris/wms_nw_brw";
const BB_ENDPOINT = "https://isk.geobasis-bb.de/ows/boris_wfs";
const HH_ENDPOINT = "https://geodienste.hamburg.de/HH_WFS_Bodenrichtwerte";
const SN_ENDPOINT_BASE = "https://www.landesvermessung.sachsen.de/fp/httpproxy/svcdep/wms";
const TH_ENDPOINT = "https://www.geoproxy.geoportal-th.de/geoproxy/services/boris/boris_wfs";
const ST_ENDPOINT_BASE =
  "https://www.geodatenportal.sachsen-anhalt.de/arcgis/rest/services/Geobasisdaten/boris/MapServer";
const MV_ENDPOINT = "https://www.geodaten-mv.de/dienste/bodenrichtwerte_wfs";
const BE_ENDPOINT_BASE = "https://gdi.berlin.de/services/wfs/brw";
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
 *
 * Für die neun 2026 dazugekommenen Länder wird sie NICHT gebraucht: alle
 * dortigen Dienste akzeptieren EPSG:4326 direkt (bei Brandenburg und
 * Mecklenburg-Vorpommern trotz UTM33-DefaultCRS, jeweils live verifiziert)
 * — deshalb gibt es hier bewusst KEINE wgs84ZuUtm33()-Schwester: eine
 * ungenutzte Zweitumrechnung wäre nur eine weitere Fehlerquelle.
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

/* ═══════════════  Gemeinsame Bausteine der neuen Provider  ═══════════════ */

/** Ergebnis-Tupel aller Provider: `responded` steuert das confirmed-Flag. */
type ProviderErgebnis = { value: Bodenrichtwert | null; responded: boolean };

/**
 * Ein HTTP-Request mit dem gemeinsamen 6-s-Timeout. `null` = transienter
 * Fehler (Timeout/Netzwerk/HTTP-Fehler) → der Aufrufer meldet
 * `responded: false` und die Antwort darf NICHT gecacht werden.
 */
async function holen(kategorie: string, url: string, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      warnOnce(`${kategorie}-http`, `${kategorie}: HTTP ${res.status} — fail-soft, liefere null.`);
      return null;
    }
    return res;
  } catch {
    warnOnce(`${kategorie}-network`, `${kategorie}: Abfrage fehlgeschlagen (Timeout/Netzwerk) — fail-soft, liefere null.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** WFS-2.0-POST (alle neuen WFS-Provider sprechen Filter Encoding 2.0). */
function wfsPost(kategorie: string, url: string, body: string): Promise<Response | null> {
  return holen(kategorie, url, { method: "POST", headers: { "Content-Type": "application/xml" }, body });
}

/** Alle `<präfix:tag …>…</präfix:tag>`-Blöcke einer XML-Antwort. */
function xmlBloecke(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[0]);
}

/** Textinhalt des ersten `<präfix:tag>`-Elements in einem Block ("" wenn fehlt). */
function xmlWert(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([^<]*)`));
  return m ? m[1].trim() : "";
}

/**
 * Nutzungsfamilie eines VBORIS-/BauNVO-Kürzels. Die Kürzel sind bundesweit
 * einheitlich (AdV-Standard): W/WA/WR/WB/WS = Wohnen, M/MI/MK/MD/MU =
 * gemischt, G/GE/GI/I/SO = gewerblich bzw. Sonderbaufläche. Alles andere
 * (A Acker, GR Grünland, F Forst, …) ist kein Bauland und fällt auf
 * „sonstige" — diese Zonen werden über den Entwicklungszustand ohnehin
 * schon nach hinten sortiert.
 */
type NutzFamilie = "wohnen" | "gemischt" | "gewerbe" | "sonstige";

function vborisFamilie(art: string): NutzFamilie {
  const a = art.trim().toUpperCase();
  if (!a) return "sonstige";
  // GR (Grünland) beginnt zwar mit G, ist aber nie baureifes Land — die
  // Bauland-Prüfung im Score sortiert es zuverlässig aus.
  if (/^W/.test(a)) return "wohnen";
  if (/^M/.test(a)) return "gemischt";
  if (/^(GE|GI|GB|G$|I|SO|SP)/.test(a)) return "gewerbe";
  return "sonstige";
}

/**
 * Wie gut passt eine Nutzungsfamilie zum Objektart-Hinweis? Bewusst weich:
 * gibt es am Punkt keine perfekt passende Zone, ist die verwandte
 * (gemischte) Baufläche immer noch besser als gar kein amtlicher Wert.
 */
function familienScore(fam: NutzFamilie, hint?: BorisNutzungsHint): number {
  if (hint === "gewerbe") {
    return fam === "gewerbe" ? 3 : fam === "gemischt" ? 2 : fam === "wohnen" ? 1 : 0;
  }
  return fam === "wohnen" ? 3 : fam === "gemischt" ? 2 : fam === "gewerbe" ? 1 : 0;
}

/**
 * Ist die Zone BAULAND? Buchstaben-Codes des AdV-Modells: B = baureifes
 * Land, R = Rohbauland, E = Bauerwartungsland; LF = Land-/Forstwirtschaft,
 * SF = sonstige Fläche.
 *
 * Warum das zwingend geprüft werden MUSS: die Landesdienste legen über jede
 * Stadt zusätzlich land- und forstwirtschaftliche Zonen (Hamburg 5,50 €/m²
 * Acker, Hannover 0,70 €/m² Forst, Jena 1 €/m² Grünland). Läge am
 * abgefragten Punkt keine Bauland-Zone und wir gäben stattdessen den
 * Grünland-Wert zurück, würde die Bewertung um Größenordnungen einbrechen —
 * und zwar mit dem Gütesiegel „amtlich". Kein Bauland ⇒ lieber `null` und
 * der Rechner bleibt beim Modellwert.
 */
function istBaulandCode(code: string): boolean {
  return /^[BRE]$/.test(code.trim().toUpperCase());
}

/** Dasselbe für die Dienste, die den Entwicklungszustand ausgeschrieben liefern. */
function istBaulandText(text: string): boolean {
  return /baureifes land|rohbauland|bauerwartungsland/i.test(text);
}

/**
 * MFH-Bonus über die Ergänzungs-/Bebauungsart: mit `mfh`-Hinweis gewinnt die
 * Mehrfamilienhaus-Zone, sonst die konservativere EFH-/Regelzone. Gleiche
 * Logik wie in heZoneWaehlen(), nur für die Länder mit eigenen
 * Ergänzungs-Kürzeln.
 */
function mfhBonus(ergaenzung: string, hint?: BorisNutzungsHint): number {
  const istMfh = /MFH|MH|GH/i.test(ergaenzung) || /mehrfamilien/i.test(ergaenzung);
  if (hint === "mfh") return istMfh ? 1 : 0;
  if (hint === "gewerbe") return 0;
  return istMfh ? 0 : 1;
}

/**
 * „Gutachterausschuss für Grundstückswerte in der Landeshauptstadt Dresden"
 * → „Landeshauptstadt Dresden". Mehrere Dienste (Bremen, Sachsen) führen den
 * Ortsnamen NUR in der Gutachterausschuss-Bezeichnung; für Badge und PDF
 * brauchen wir daraus den lesbaren Ortsteil hinter dem „… in …".
 */
function ortAusGaa(bezeichnung: string): string {
  const roh = bezeichnung.replace(/\s+/g, " ").trim();
  const m = roh.match(/\bin\s+(?:der|dem|den)?\s*(.+)$/i);
  return (m ? m[1] : roh).trim();
}

/** ISO-Datum → Zahl für Vergleiche (fehlt/kaputt → 0). */
function stichtagRang(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Number(`${m[1]}${m[2]}${m[3]}`) : 0;
}

/* ─────────────  Provider Niedersachsen + Bremen (LGLN-WFS)  ───────────── */

/**
 * NI und HB laufen auf derselben LGLN-Infrastruktur mit identischem
 * AdV-BORIS-2.0-Schema — ein Codepfad, zwei Endpunkte.
 *
 * Zwei live geklärte Fallen:
 *  1. Der Filter-Namespace ist `…/adv/gid/6.0` (NICHT 7.1 wie bei Hessen) —
 *     mit 7.1 antwortet der Dienst mit „Unknown Namespace".
 *  2. Eine BBOX-Abfrage liefert Nachbarzonen mit; nur der Punkt-Intersects
 *     ist deterministisch. Deshalb hier Intersects statt BBOX.
 *
 * Der Dienst akzeptiert EPSG:4326 direkt (Achsreihenfolge lat lng) — keine
 * UTM-Umrechnung nötig.
 */
function niRequestXml(lat: number, lng: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="20"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:boris="http://www.adv-online.de/namespaces/adv/boris/2.0"
  xmlns:adv="http://www.adv-online.de/namespaces/adv/gid/6.0">
  <wfs:Query typeNames="boris:BR_BodenrichtwertZonal">
    <fes:Filter><fes:Intersects><fes:ValueReference>adv:position</fes:ValueReference>
      <gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(6)} ${lng.toFixed(6)}</gml:pos></gml:Point>
    </fes:Intersects></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

interface AdvZone {
  brw: number;
  stichtag: string;
  zone: string;
  art: string;
  ergaenzung: string;
  entwicklung: string;
  gemeinde: string;
}

function parseAdvZonen(xml: string): AdvZone[] {
  const zonen: AdvZone[] = [];
  for (const f of xmlBloecke(xml, "boris:BR_BodenrichtwertZonal")) {
    const brw = parseFloat(xmlWert(f, "boris:bodenrichtwert"));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    const gemeindeBlock = f.match(/<boris:gemeinde>[\s\S]*?<boris:name>([^<]*)/);
    // Bremen führt im gemeinde-Block NUR den Schlüssel (land=04, Rest 0) —
    // der Ortsname steht dort ausschließlich in der
    // Gutachterausschuss-Bezeichnung („… in Bremen"). Niedersachsen und
    // Bremerhaven liefern dagegen einen echten Gemeindenamen.
    const gaaBlock = f.match(/<boris:gutachterausschuss>[\s\S]*?<boris:bezeichnung>([^<]*)/);
    zonen.push({
      brw: Math.round(brw),
      stichtag: xmlWert(f, "boris:stichtag"),
      zone: xmlWert(f, "boris:bodenrichtwertNummer"),
      art: xmlWert(f, "boris:art"),
      ergaenzung: xmlWert(f, "boris:ergaenzung"),
      entwicklung: xmlWert(f, "boris:entwicklungszustand"),
      gemeinde: gemeindeBlock ? gemeindeBlock[1].trim() : gaaBlock ? ortAusGaa(gaaBlock[1]) : "",
    });
  }
  return zonen;
}

/**
 * Zonenwahl für NI/HB. Anders als Hessen führt das LGLN am selben Punkt auch
 * die landwirtschaftliche Überlagerungszone (z. B. „F"/0,70 €/m² über der
 * ganzen Stadt) — die wird vorab ausgefiltert (s. istBaulandCode), danach
 * entscheidet die Nutzungsart-Präferenz.
 */
function advZoneWaehlen(zonen: AdvZone[], hint?: BorisNutzungsHint): AdvZone | null {
  const bauland = zonen.filter((z) => istBaulandCode(z.entwicklung));
  if (bauland.length === 0) return null;
  const score = (z: AdvZone): number =>
    (z.entwicklung === "B" ? 4 : 0) + familienScore(vborisFamilie(z.art), hint) * 2 + mfhBonus(z.ergaenzung, hint);
  return [...bauland].sort((a, b) => score(b) - score(a))[0];
}

async function fetchLgln(
  quelle: "NI" | "HB",
  endpoint: string,
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<ProviderErgebnis> {
  const res = await wfsPost(quelle.toLowerCase(), endpoint, niRequestXml(lat, lng));
  if (!res) return { value: null, responded: false };
  const zone = advZoneWaehlen(parseAdvZonen(await res.text()), hint);
  if (!zone) return { value: null, responded: true };
  return {
    value: {
      brw: zone.brw,
      stichtag: stichtagDe(zone.stichtag),
      zone: zone.zone,
      nutzung: [zone.art, zone.ergaenzung].filter(Boolean).join(" "),
      gemeinde: zone.gemeinde,
      quelle,
    },
    responded: true,
  };
}

const fetchNiedersachsen = (lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> =>
  fetchLgln("NI", NI_ENDPOINT, lat, lng, hint);

const fetchBremen = (lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> =>
  fetchLgln("HB", HB_ENDPOINT, lat, lng, hint);

/* ─────────────────  Provider Nordrhein-Westfalen (WMS)  ───────────────── */

/**
 * NRW hat für die Zonen KEINEN WFS, nur ein WMS — dessen GetFeatureInfo
 * liefert aber sauberes GeoJSON. Zwei Eigenheiten aus der Live-Recherche:
 *
 *  1. GetFeatureInfo ist pixel-toleranzbasiert, kein exaktes
 *     Point-in-Polygon. Nur die Kombination sehr kleine BBOX (±0,0002°) +
 *     WIDTH=HEIGHT=1 + I=J=0 + FEATURE_COUNT=1 ist reproduzierbar; mit
 *     größerer BBOX kommen Nachbarzonen zurück.
 *  2. Die Nutzungsart steckt nicht im Attribut, sondern im LAYER: 20 =
 *     ein-/zweigeschossig (EFH-nah), 17 = mehrgeschossig (MFH-nah), 14 =
 *     Gewerbe/Industrie. Der Objektart-Hinweis wählt also die Layer-
 *     Reihenfolge; der erste Layer mit Treffer gewinnt.
 *
 * Layer 2 („sonstige Flächen": Außenbereich, Landwirtschaft) wird bewusst
 * NICHT abgefragt — der Rechner soll einen Bauland-Bodenrichtwert bekommen
 * oder gar keinen, nicht versehentlich einen Ackerwert.
 */
const NW_LAYER_REIHENFOLGE: Record<BorisNutzungsHint, string[]> = {
  wohnen: ["20", "17"],
  mfh: ["17", "20"],
  gewerbe: ["14", "17", "20"],
};

interface NwProperties {
  BRW?: string;
  STAG?: string;
  NUTA?: string;
  WNUM?: string;
  BRWZNR?: string;
  GENA?: string;
  ORTST?: string;
  ENTW?: string;
}

async function fetchNrw(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const d = 0.0002;
  let respondedIrgendwo = false;

  for (const layer of NW_LAYER_REIHENFOLGE[hint ?? "wohnen"]) {
    const url =
      `${NW_ENDPOINT}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${layer}&QUERY_LAYERS=${layer}` +
      `&CRS=CRS:84&BBOX=${lng - d},${lat - d},${lng + d},${lat + d}` +
      `&WIDTH=1&HEIGHT=1&I=0&J=0&INFO_FORMAT=application/geo%2Bjson&FEATURE_COUNT=1`;
    const res = await holen("nw", url);
    if (!res) return { value: null, responded: false };
    respondedIrgendwo = true;

    let props: NwProperties | undefined;
    try {
      const json = (await res.json()) as { features?: { properties?: NwProperties }[] };
      props = json.features?.[0]?.properties;
    } catch {
      warnOnce("nw-parse", "BORIS-NRW: GeoJSON nicht lesbar — Format-Wechsel des Geobasis-NRW-Diensts prüfen.");
      return { value: null, responded: false };
    }
    if (!props) continue; // dieser Layer trägt am Punkt keine Zone → nächster

    const brw = Math.round(parseGermanNumber(props.BRW ?? ""));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    // Die drei abgefragten Layer sind zwar Bauland-Layer, aber der
    // Entwicklungszustand wird trotzdem geprüft — einheitlich mit allen
    // anderen Ländern (s. istBaulandCode).
    if (!istBaulandCode(props.ENTW ?? "")) continue;
    return {
      value: {
        brw,
        stichtag: stichtagDe(props.STAG ?? ""),
        zone: props.BRWZNR || props.WNUM || "",
        nutzung: props.NUTA ?? "",
        gemeinde: [props.GENA, props.ORTST].filter(Boolean).join(" — "),
        quelle: "NW",
      },
      responded: true,
    };
  }
  return { value: null, responded: respondedIrgendwo };
}

/* ─────────────────────  Provider Brandenburg (WFS)  ───────────────────── */

/**
 * Brandenburgs Zwei-Stufen-Falle: `br:BR_Bodenrichtwert` trägt die Werte,
 * hat aber KEINE Geometrie („has no geometry property" laut Dienst) — die
 * Polygone liegen in `br:BR_BodenrichtwertFlaeche`. Der serverseitige
 * Rückwärts-Join (RESOLVE/inversZu_gehoertZu) ist nicht konfiguriert, also
 * muss der Client joinen:
 *
 *   1. Flächen am Punkt holen (Intersects) → gml:id je Zonen-Jahrgang
 *   2. Werte über `br:gehoertZu/@xlink:href = urn:adv:oid:<gml:id>` holen
 *
 * Schritt 1 ist der teure Teil: der FeatureType hält ALLE Jahrgänge seit
 * 2010 (am Testpunkt 68 Polygone ≈ 2 MB). Deshalb filtern wir zusätzlich auf
 * das Lebenszeitintervall und probieren die Jahrgänge absteigend — mit dem
 * aktuellen Jahr sind es 4 Polygone ≈ 180 KB.
 *
 * EPSG:4326 geht direkt (trotz UTM33-DefaultCRS), Achsreihenfolge lat lng —
 * mit lng lat antwortet der Dienst still mit 0 Treffern.
 */
function bbFlaechenXml(lat: number, lng: number, abJahr: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="20"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:br="http://www.adv-online.de/namespaces/adv/br/3.0"
  xmlns:adv="http://www.adv-online.de/namespaces/adv/gid/7.1">
  <wfs:Query typeNames="br:BR_BodenrichtwertFlaeche">
    <fes:Filter><fes:And>
      <fes:Intersects><fes:ValueReference>adv:position</fes:ValueReference>
        <gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(6)} ${lng.toFixed(6)}</gml:pos></gml:Point>
      </fes:Intersects>
      <fes:PropertyIsGreaterThanOrEqualTo>
        <fes:ValueReference>adv:lebenszeitintervall/adv:AA_Lebenszeitintervall/adv:beginnt</fes:ValueReference>
        <fes:Literal>${abJahr}-01-01T00:00:00Z</fes:Literal>
      </fes:PropertyIsGreaterThanOrEqualTo>
    </fes:And></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

function bbWerteXml(ids: string[]): string {
  const klauseln = ids
    .map(
      (id) =>
        `<fes:PropertyIsEqualTo><fes:ValueReference>br:gehoertZu/@xlink:href</fes:ValueReference>` +
        `<fes:Literal>urn:adv:oid:${id}</fes:Literal></fes:PropertyIsEqualTo>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="50"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:br="http://www.adv-online.de/namespaces/adv/br/3.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:adv="http://www.adv-online.de/namespaces/adv/gid/7.1">
  <wfs:Query typeNames="br:BR_Bodenrichtwert">
    <fes:Filter>${ids.length > 1 ? `<fes:Or>${klauseln}</fes:Or>` : klauseln}</fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

/**
 * Nutzungsfamilie aus dem AdV-Codelisten-Code `BR_Art_Nutzung`: 11xx =
 * Wohnbaufläche, 12xx = gemischte Baufläche, 13xx/14xx = gewerbliche bzw.
 * Sonderbaufläche, 2xxx/28xx = Land-/Forstwirtschaft.
 */
function bbFamilie(code: string): NutzFamilie {
  if (/^11/.test(code)) return "wohnen";
  if (/^12/.test(code)) return "gemischt";
  if (/^1[34]/.test(code)) return "gewerbe";
  if (/^1/.test(code)) return "gemischt";
  return "sonstige";
}

async function fetchBrandenburg(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const jetzt = new Date().getFullYear();
  let ids: string[] = [];
  for (const abJahr of [jetzt, jetzt - 1, jetzt - 2]) {
    const res = await wfsPost("bb", BB_ENDPOINT, bbFlaechenXml(lat, lng, abJahr));
    if (!res) return { value: null, responded: false };
    const xml = await res.text();
    ids = [...xml.matchAll(/<br:BR_BodenrichtwertFlaeche gml:id="([^"]+)"/g)].map((m) => m[1]);
    if (ids.length > 0) break;
  }
  if (ids.length === 0) return { value: null, responded: true }; // außerhalb jeder Zone

  const res2 = await wfsPost("bb", BB_ENDPOINT, bbWerteXml(ids));
  if (!res2) return { value: null, responded: false };
  const xml2 = await res2.text();

  interface BbZone {
    brw: number;
    stichtag: string;
    zone: string;
    zoneName: string;
    entwicklung: string;
    artCode: string;
  }
  const zonen: BbZone[] = [];
  for (const f of xmlBloecke(xml2, "br:BR_Bodenrichtwert")) {
    const brw = parseFloat(xmlWert(f, "br:bodenrichtwert"));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    const art = f.match(/<br:art[^>]*xlink:href="[^"]*\/([0-9]+)"/);
    zonen.push({
      brw: Math.round(brw),
      stichtag: xmlWert(f, "br:stichtag"),
      zone: xmlWert(f, "br:bodenrichtwertNummer"),
      zoneName: xmlWert(f, "br:bodenrichtwertzoneName"),
      entwicklung: xmlWert(f, "br:entwicklungszustand"),
      artCode: art ? art[1] : "",
    });
  }
  // 1000 = baureifes Land, 2000/3000 = Roh-/Bauerwartungsland, 4000 = LF.
  // Alles außer Bauland fliegt raus (s. istBaulandCode) — sonst gewönne am
  // Stadtrand die Acker-/Forstzone mit 0,40 €/m².
  const bauland = zonen.filter((z) => /^[123]000$/.test(z.entwicklung));
  if (bauland.length === 0) return { value: null, responded: true };

  const score = (z: BbZone): number =>
    (z.entwicklung === "1000" ? 4 : 0) + familienScore(bbFamilie(z.artCode), hint) * 2;
  const beste = [...bauland].sort(
    (a, b) => score(b) - score(a) || stichtagRang(b.stichtag) - stichtagRang(a.stichtag),
  )[0];

  return {
    value: {
      brw: beste.brw,
      stichtag: stichtagDe(beste.stichtag),
      zone: beste.zone,
      nutzung: beste.artCode,
      // Der Dienst liefert die Gemeinde nur als Schlüssel; der
      // Zonenname beginnt aber verlässlich mit dem Ortsnamen
      // („Potsdam, Brandenburger Straße") — für Badge/PDF ist das die
      // brauchbarere Klartext-Angabe.
      gemeinde: beste.zoneName,
      quelle: "BB",
    },
    responded: true,
  };
}

/* ───────────────────────  Provider Hamburg (WFS)  ─────────────────────── */

/**
 * Hamburgs zwei Fallen (beide live nachgestellt):
 *  1. `lgv_brw_zonen_<jahr>` sieht nach dem richtigen FeatureType aus, hat
 *     aber KEIN `richtwert_euro` — Werte stehen ausschließlich in
 *     `lgv_brw_zoniert_alle` (alle Jahrgänge, Filter über `jahrgang`).
 *  2. `fes:Intersects` mit einem gml:Point liefert bei diesem deegree-Server
 *     konstant 0 Treffer (auch in UTM32); mit einem winzigen gml:Polygon um
 *     denselben Punkt funktioniert es. Deshalb ein ~10 m großes Quadrat —
 *     klein genug für eine eindeutige Zone, groß genug, dass die
 *     Koordinaten-Rundung des Servers es nicht zum Punkt kollabiert.
 *
 * Achsreihenfolge hier lng lat (deegree erzwingt die EPSG-Achsordnung nicht).
 * Je Nutzungsart existiert ein eigener Datensatz mit eigener
 * `richtwertnummer` auf identischer Zonengeometrie — die Objektart-Wahl ist
 * also eine Filterung der Treffer, keine Zonenwahl.
 */
const HH_ERGAENZUNG_REIHENFOLGE: Record<BorisNutzungsHint, string[]> = {
  wohnen: ["EFH", "MFH"],
  mfh: ["MFH", "EFH"],
  gewerbe: ["GH", "LAD", "BH", "PL"],
};

function hhRequestXml(lat: number, lng: number, jahrgang: number): string {
  const d = 0.00005;
  const ecken: [number, number][] = [
    [lng - d, lat - d],
    [lng + d, lat - d],
    [lng + d, lat + d],
    [lng - d, lat + d],
    [lng - d, lat - d],
  ];
  const ring = ecken.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="40"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:app="http://www.deegree.org/app">
  <wfs:Query typeNames="app:lgv_brw_zoniert_alle">
    <fes:Filter><fes:And>
      <fes:Intersects><fes:ValueReference>app:geom_zone</fes:ValueReference>
        <gml:Polygon gml:id="pg1" srsName="EPSG:4326"><gml:exterior><gml:LinearRing>
          <gml:posList>${ring}</gml:posList>
        </gml:LinearRing></gml:exterior></gml:Polygon>
      </fes:Intersects>
      <fes:PropertyIsEqualTo><fes:ValueReference>app:jahrgang</fes:ValueReference><fes:Literal>${jahrgang}</fes:Literal></fes:PropertyIsEqualTo>
    </fes:And></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

/** Erster Jahrgang, der überhaupt Daten liefert (24 h gemerkt, s. Hessen). */
let hhJahrgangMemo: { jahr: number; expires: number } | null = null;

async function fetchHamburg(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const jetzt = Date.now();
  const jahre =
    hhJahrgangMemo && hhJahrgangMemo.expires > jetzt
      ? [hhJahrgangMemo.jahr]
      : [new Date().getFullYear(), new Date().getFullYear() - 1];

  interface HhSatz {
    brw: number;
    erg: string;
    nutzung: string;
    zone: string;
    stadtteil: string;
    entwicklung: string;
    stichtag: string;
    jahrgang: string;
  }

  let saetze: HhSatz[] = [];
  let benutzterJahrgang = 0;
  for (const jahr of jahre) {
    const res = await wfsPost("hh", HH_ENDPOINT, hhRequestXml(lat, lng, jahr));
    if (!res) return { value: null, responded: false };
    const xml = await res.text();
    saetze = xmlBloecke(xml, "app:lgv_brw_zoniert_alle")
      .map((f) => ({
        brw: parseFloat(xmlWert(f, "app:richtwert_euro")),
        erg: xmlWert(f, "app:nutzung_ergaenzung"),
        nutzung: xmlWert(f, "app:nutzung"),
        zone: xmlWert(f, "app:richtwertnummer"),
        stadtteil: xmlWert(f, "app:stadtteil"),
        entwicklung: xmlWert(f, "app:entwicklungszustand"),
        stichtag: xmlWert(f, "app:abweichender_stichtag"),
        jahrgang: xmlWert(f, "app:jahrgang"),
      }))
      .filter((s) => Number.isFinite(s.brw) && s.brw > 0);
    if (saetze.length > 0) {
      benutzterJahrgang = jahr;
      break;
    }
  }
  if (saetze.length === 0) return { value: null, responded: true }; // Zonenlücke (z. B. Wasserfläche)
  hhJahrgangMemo = { jahr: benutzterJahrgang, expires: jetzt + CACHE_TTL_MS };

  // Nur baureifes Land — die LF-Überlagerung (Acker/Grünland/Forst mit
  // 5,50 €/m²) liegt in Hamburg über JEDER Zone und wäre sonst ein
  // katastrophaler Fehlgriff für den Rechner.
  const reihenfolge = HH_ERGAENZUNG_REIHENFOLGE[hint ?? "wohnen"];
  const bauland = saetze.filter((s) => /^B/i.test(s.entwicklung) && reihenfolge.includes(s.erg.toUpperCase()));
  if (bauland.length === 0) return { value: null, responded: true };
  const beste = [...bauland].sort(
    (a, b) => reihenfolge.indexOf(a.erg.toUpperCase()) - reihenfolge.indexOf(b.erg.toUpperCase()),
  )[0];

  return {
    value: {
      brw: Math.round(beste.brw),
      stichtag: beste.stichtag ? stichtagDe(beste.stichtag) : `01.01.${beste.jahrgang || benutzterJahrgang}`,
      zone: beste.zone,
      nutzung: [beste.nutzung, beste.erg].filter(Boolean).join(" "),
      gemeinde: beste.stadtteil,
      quelle: "HH",
    },
    responded: true,
  };
}

/* ───────────────────────  Provider Sachsen (WMS)  ─────────────────────── */

/**
 * Sachsens Group-Layer-Falle: GetFeatureInfo auf die granularen Fach-Layer
 * (`brw_bauland_<jahr>` …) liefert konsequent „Search returned no results."
 * — selbst auf Pixeln, die nachweislich Daten tragen. Werte gibt es NUR über
 * den Gruppen-Layer `brw_<jahr>` und NUR mit INFO_FORMAT=text/html (ein
 * serverseitiges Popup-Template, kein JSON/GML). Also HTML-Parsing wie bei
 * RLP, nur mit mehreren Treffer-Blöcken (`<div id="div_N">`) — je einer pro
 * Flächenart am Punkt (Acker, Grünland, Wohnbaufläche …).
 *
 * Jahrgang steckt in URL UND Layername (`…/wms/boris_2026`, `brw_2026`) und
 * wechselt jährlich. Ein nicht existierender Jahrgang antwortet NICHT mit
 * 404, sondern mit HTTP 200 und einer MapServer-Fehlerseite
 * („msLoadMap(): Unable to access file") — genau daran erkennen wir ihn.
 *
 * Lizenz-Klarstellung: die strengere „nur eigener Gebrauch"-Klausel der
 * sächsischen Nutzungsbedingungen betrifft Präsentationsausgaben aus dem
 * LIEGENSCHAFTSKATASTER, nicht die Geodatendienste — BORIS-SN steht laut
 * derselben Seite unter dl-de/by-2-0. Nicht vermischen.
 */
let snJahrgangMemo: { jahr: number; expires: number } | null = null;

interface SnTreffer {
  brw: number;
  art: string;
  ergaenzung: string;
  entwicklung: string;
  zone: string;
  stichtag: string;
}

function snFamilie(art: string): NutzFamilie {
  const a = art.toLowerCase();
  if (a.includes("wohnbau")) return "wohnen";
  if (a.includes("gemischte")) return "gemischt";
  if (a.includes("gewerbliche") || a.includes("industrie") || a.includes("sonderbau")) return "gewerbe";
  return "sonstige";
}

function parseSnTreffer(html: string): SnTreffer[] {
  const treffer: SnTreffer[] = [];
  // Jeder Treffer ist ein eigenes Tab-Div; am Ende splitten, damit die
  // Label-Suche nicht über Blockgrenzen hinweg greift.
  for (const block of html.split(/<div id="div_\d+"/).slice(1)) {
    const wert = extractField(block, "Wert:");
    if (!wert) continue;
    const brw = Math.round(parseGermanNumber(wert));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    treffer.push({
      brw,
      art: extractField(block, "Art:") ?? "",
      ergaenzung: extractField(block, "Ergänzung:") ?? "",
      entwicklung: extractField(block, "Entwicklungszustand:") ?? "",
      zone: extractField(block, "BRW-Zone:") ?? "",
      stichtag: extractField(block, "Stichtag:") ?? "",
    });
  }
  return treffer;
}

/** Kopfzeile des Popups („Gutachterausschuss … in der Landeshauptstadt Dresden"). */
function snGemeinde(html: string): string {
  const m = html.match(/<div class="druckhead-down">\s*<div>([^<]*)</);
  return m ? ortAusGaa(decodeEntities(m[1])) : "";
}

async function fetchSachsen(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const jetztMs = Date.now();
  const jahr0 = new Date().getFullYear();
  const jahre =
    snJahrgangMemo && snJahrgangMemo.expires > jetztMs ? [snJahrgangMemo.jahr] : [jahr0, jahr0 - 1, jahr0 - 2];

  const d = 0.0003;
  for (const jahr of jahre) {
    const url =
      `${SN_ENDPOINT_BASE}/boris_${jahr}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
      `&LAYERS=brw_${jahr}&QUERY_LAYERS=brw_${jahr}&STYLES=&SRS=EPSG:4326` +
      `&BBOX=${lng - d},${lat - d},${lng + d},${lat + d}` +
      `&WIDTH=101&HEIGHT=101&X=50&Y=50&INFO_FORMAT=text/html&FEATURE_COUNT=10`;
    const res = await holen("sn", url);
    if (!res) return { value: null, responded: false };
    const html = await res.text();
    // Jahrgang existiert nicht (Mapfile fehlt) → nächstälterer Jahrgang.
    if (/MapServer Message/i.test(html) && !/BORIS-SN/i.test(html)) continue;

    snJahrgangMemo = { jahr, expires: jetztMs + CACHE_TTL_MS };
    // Der Gruppen-Layer liefert je Flächenart einen eigenen Tab (Acker,
    // Kleingarten, Grünland, Wohnbaufläche …) — nur die Bauland-Tabs zählen.
    const treffer = parseSnTreffer(html).filter((t) => istBaulandText(t.entwicklung));
    if (treffer.length === 0) return { value: null, responded: true };

    const score = (t: SnTreffer): number =>
      (/baureifes land/i.test(t.entwicklung) ? 4 : 0) +
      familienScore(snFamilie(t.art), hint) * 2 +
      mfhBonus(t.ergaenzung, hint);
    const beste = [...treffer].sort((a, b) => score(b) - score(a))[0];

    return {
      value: {
        brw: beste.brw,
        stichtag: beste.stichtag,
        zone: beste.zone,
        nutzung: [beste.art, beste.ergaenzung].filter(Boolean).join(" · "),
        gemeinde: snGemeinde(html),
        quelle: "SN",
      },
      responded: true,
    };
  }
  warnOnce("sn-jahrgang", "Kein BORIS-SN-Jahrgang erreichbar (alle Kandidaten ohne Mapfile) — URL-Schema des GeoSN prüfen.");
  return { value: null, responded: true };
}

/* ──────────────────────  Provider Thüringen (WFS)  ────────────────────── */

/**
 * Thüringen liefert in EINER Antwort alle Stichtage einer Zone seit 2008
 * (am Testpunkt Erfurt-Fischmarkt zehn Einträge, 1.700 → 2.700 €/m²). Es
 * gibt also keine Jahrgangs-URL — stattdessen client-seitig den jüngsten
 * Stichtag ≤ heute wählen. EPSG:4326 direkt, Achsreihenfolge lat lng.
 */
function thRequestXml(lat: number, lng: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="50"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:boris="http://www.geoproxy.geoportal-th.de/boris">
  <wfs:Query typeNames="boris:bodenrichtwertzone">
    <fes:Filter><fes:Intersects><fes:ValueReference>boris:GEOM</fes:ValueReference>
      <gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(6)} ${lng.toFixed(6)}</gml:pos></gml:Point>
    </fes:Intersects></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

async function fetchThueringen(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const res = await wfsPost("th", TH_ENDPOINT, thRequestXml(lat, lng));
  if (!res) return { value: null, responded: false };
  const xml = await res.text();

  const heute = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  interface ThZone {
    brw: number;
    stichtag: string;
    rang: number;
    zone: string;
    zoneName: string;
    art: string;
    ergaenzung: string;
    entwicklung: string;
    gemeinde: string;
  }
  const zonen: ThZone[] = [];
  for (const f of xmlBloecke(xml, "boris:bodenrichtwertzone")) {
    const brw = parseFloat(xmlWert(f, "boris:BODENRICHTWERT"));
    if (!Number.isFinite(brw) || brw <= 0) continue;
    const stichtag = xmlWert(f, "boris:STICHTAG");
    const rang = stichtagRang(stichtag);
    if (rang > heute) continue; // künftiger Stichtag (noch nicht gültig)
    // Kein Bauland ⇒ verwerfen: Jenas Innenstadtrand liefert sonst eine
    // Grünland-Zone mit 1 €/m² (live beobachtet).
    if (!istBaulandText(xmlWert(f, "boris:ENTWICKLUNGSZUSTAND"))) continue;
    zonen.push({
      brw: Math.round(brw),
      stichtag,
      rang,
      zone: xmlWert(f, "boris:BODENRICHTWERTNUMMER"),
      zoneName: xmlWert(f, "boris:BODENRICHTWERTZONENAME"),
      art: xmlWert(f, "boris:NUTZUNGSART"),
      ergaenzung: xmlWert(f, "boris:NUTZUNG_ERGAENZUNG"),
      entwicklung: xmlWert(f, "boris:ENTWICKLUNGSZUSTAND"),
      gemeinde: xmlWert(f, "boris:GEMEINDENAME"),
    });
  }
  if (zonen.length === 0) return { value: null, responded: true };

  const score = (z: ThZone): number =>
    (/baureifes land/i.test(z.entwicklung) ? 4 : 0) + familienScore(vborisFamilie(z.art), hint) * 2;
  // Erst Eignung, dann Aktualität — dieselbe Zone taucht je Stichtag erneut
  // auf, deshalb entscheidet bei Gleichstand der jüngste Stichtag.
  const beste = [...zonen].sort((a, b) => score(b) - score(a) || b.rang - a.rang)[0];

  return {
    value: {
      brw: beste.brw,
      stichtag: stichtagDe(beste.stichtag),
      zone: [beste.zone, beste.zoneName].filter(Boolean).join(" "),
      nutzung: [beste.art, beste.ergaenzung].filter(Boolean).join(" · "),
      gemeinde: beste.gemeinde,
      quelle: "TH",
    },
    responded: true,
  };
}

/* ───────────────  Provider Sachsen-Anhalt (ArcGIS-REST)  ─────────────── */

/**
 * Der sauberste der neun Dienste: ArcGIS-REST-`/query` mit `inSR=4326` und
 * `f=json` — kein HTML, kein GML, keine Achsreihenfolge-Falle.
 *
 * Einzige Pflege-Falle: der Bauland-Layer heißt jahrgangsbehaftet
 * (`VBORIS_BAUL_20260101`), seine ID kann sich beim Jahreswechsel ändern.
 * Deshalb lösen wir sie zur Laufzeit über die MapServer-Metadaten auf
 * (Kind-Layer des Gruppen-Layers `boris_aktuell_sav`, Name `VBORIS_BAUL_*`)
 * und merken sie 24 h; erst wenn das scheitert, greift die verifizierte
 * Fallback-ID 992.
 */
const ST_FALLBACK_LAYER = 992;
let stLayerMemo: { id: number; expires: number } | null = null;

interface StLayerInfo {
  id: number;
  name: string;
  parentLayerId?: number;
}

async function stBaulandLayer(): Promise<number> {
  const jetzt = Date.now();
  if (stLayerMemo && stLayerMemo.expires > jetzt) return stLayerMemo.id;
  const res = await holen("st", `${ST_ENDPOINT_BASE}?f=json`);
  if (!res) return ST_FALLBACK_LAYER;
  try {
    const json = (await res.json()) as { layers?: StLayerInfo[] };
    const layers = json.layers ?? [];
    const gruppe = layers.find((l) => l.name === "boris_aktuell_sav");
    const bauland = layers.find(
      (l) => /^VBORIS_BAUL_/i.test(l.name) && gruppe !== undefined && l.parentLayerId === gruppe.id,
    );
    const id = bauland?.id ?? ST_FALLBACK_LAYER;
    stLayerMemo = { id, expires: jetzt + CACHE_TTL_MS };
    return id;
  } catch {
    warnOnce("st-layer", "BORIS-ST: MapServer-Metadaten nicht lesbar — nutze Fallback-Layer 992.");
    return ST_FALLBACK_LAYER;
  }
}

interface StAttribute {
  BRW?: number;
  STAG?: number;
  NUTA?: string;
  ENUTA?: string | null;
  WNUM?: string;
  BRZNAME?: string;
  GEM__GENA?: string;
  ENTW?: string;
}

async function fetchSachsenAnhalt(lat: number, lng: number, hint?: BorisNutzungsHint): Promise<ProviderErgebnis> {
  const layer = await stBaulandLayer();
  const url =
    `${ST_ENDPOINT_BASE}/${layer}/query?geometry=${lng.toFixed(6)},${lat.toFixed(6)}` +
    `&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*&returnGeometry=false&f=json`;
  const res = await holen("st", url);
  if (!res) return { value: null, responded: false };

  let attrs: StAttribute[] = [];
  try {
    const json = (await res.json()) as { features?: { attributes?: StAttribute }[]; error?: unknown };
    if (json.error) {
      warnOnce("st-error", "BORIS-ST: ArcGIS meldet einen Fehler — Layer-ID/Service-Struktur prüfen.");
      return { value: null, responded: false };
    }
    attrs = (json.features ?? []).map((f) => f.attributes ?? {});
  } catch {
    warnOnce("st-parse", "BORIS-ST: JSON nicht lesbar — Format-Wechsel des LVermGeo-Diensts prüfen.");
    return { value: null, responded: false };
  }
  const kandidaten = attrs.filter(
    (a) => typeof a.BRW === "number" && a.BRW > 0 && istBaulandCode(a.ENTW ?? ""),
  );
  if (kandidaten.length === 0) return { value: null, responded: true };

  const score = (a: StAttribute): number =>
    (a.ENTW === "B" ? 4 : 0) +
    familienScore(vborisFamilie(a.NUTA ?? ""), hint) * 2 +
    mfhBonus(a.ENUTA ?? "", hint);
  const beste = [...kandidaten].sort((a, b) => score(b) - score(a))[0];

  // STAG ist Unix-Millisekunden (UTC-Mitternacht) — als UTC formatieren,
  // sonst kippt der 01.01. in Zeitzonen westlich von UTC auf den 31.12.
  const stichtag = typeof beste.STAG === "number" ? new Date(beste.STAG).toISOString().slice(0, 10) : "";

  return {
    value: {
      brw: Math.round(beste.BRW as number),
      stichtag: stichtagDe(stichtag),
      zone: [beste.WNUM, beste.BRZNAME].filter(Boolean).join(" "),
      nutzung: [beste.NUTA, beste.ENUTA].filter(Boolean).join(" "),
      gemeinde: beste.GEM__GENA ?? "",
      quelle: "ST",
    },
    responded: true,
  };
}

/* ──────────  Provider Mecklenburg-Vorpommern (WFS, Multi-Query)  ────────── */

/**
 * MV modelliert jede Bauflächenart als EIGENEN FeatureType (statt als
 * Attribut). Statt sie nacheinander abzufragen, steckt eine WFS-2.0-Anfrage
 * mehrere `wfs:Query`-Elemente — ein Request, alle Bauflächenarten am Punkt.
 * EPSG:4326 direkt (trotz UTM33-DefaultCRS), Achsreihenfolge lat lng, das
 * Geometrie-Attribut heißt schlicht `geometry` (ohne Namespace-Präfix).
 *
 * Zwei Eigenheiten: `brwkon` und `stag` sind Strings (Stichtag im Format
 * TT.MM.JJJJ, nicht ISO), und die Aktualität ist NICHT landesweit synchron —
 * die Gutachterausschüsse pflegen dezentral, Rostock stand beim Live-Test
 * auf Stichtag 01.01.2024, andere Kreise schon auf 2026. Deshalb hier
 * bewusst keine Stichtags-Plausibilisierung: der Dienst liefert je Fläche
 * genau den amtlich zuletzt beschlossenen Wert.
 *
 * Wichtig (im Live-Test gefunden, in der Spec noch nicht vermerkt): die
 * historischen Innenstädte liegen NICHT in `wohnbauflaeche` oder
 * `gemischte_bauflaeche`, sondern im eigenen FeatureType
 * `sanierungsgebiet` (Schwerin-Altstadt 850 €/m², Greifswald 620 €/m²) —
 * ohne ihn liefert MV ausgerechnet in den Zentren gar nichts. Analog trägt
 * `bebaute_flaeche_im_aussenbereich` die Werte für bebaute Grundstücke
 * außerhalb der Bauflächen; er zählt als letzte Reserve, damit er nie eine
 * echte Bauflächenzone verdrängt.
 */
const MV_TYPEN: { typ: string; rang: number }[] = [
  { typ: "wohnbauflaeche", rang: 2 },
  { typ: "gemischte_bauflaeche", rang: 2 },
  { typ: "gewerbliche_bauflaeche", rang: 2 },
  { typ: "sonderbauflaeche", rang: 2 },
  { typ: "sanierungsgebiet", rang: 2 },
  { typ: "bebaute_flaeche_im_aussenbereich", rang: 0 },
];

function mvRequestXml(lat: number, lng: number): string {
  const queries = MV_TYPEN.map(
    ({ typ }, i) => `  <wfs:Query typeNames="boris:${typ}">
    <fes:Filter><fes:Intersects><fes:ValueReference>geometry</fes:ValueReference>
      <gml:Point gml:id="p${i + 1}" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(6)} ${lng.toFixed(6)}</gml:pos></gml:Point>
    </fes:Intersects></fes:Filter>
  </wfs:Query>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="10"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:boris="https://www.geodaten-mv.de/dienste/namespaces/boris">
${queries}
</wfs:GetFeature>`;
}

async function fetchMecklenburgVorpommern(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<ProviderErgebnis> {
  const res = await wfsPost("mv", MV_ENDPOINT, mvRequestXml(lat, lng));
  if (!res) return { value: null, responded: false };
  const xml = await res.text();

  interface MvZone {
    brw: number;
    stichtag: string;
    zone: string;
    art: string;
    ergaenzung: string;
    entwicklung: string;
    gemeinde: string;
    rang: number;
  }
  const zonen: MvZone[] = [];
  for (const { typ, rang } of MV_TYPEN) {
    for (const f of xmlBloecke(xml, `boris:${typ}`)) {
      const brw = parseGermanNumber(xmlWert(f, "boris:brwkon"));
      if (!Number.isFinite(brw) || brw <= 0) continue;
      if (!istBaulandCode(xmlWert(f, "boris:entw"))) continue;
      const gid = f.match(/gml:id="([^"]+)"/);
      zonen.push({
        brw: Math.round(brw),
        stichtag: xmlWert(f, "boris:stag"),
        // MV führt keine eigene Zonen-ID als Sachattribut — die gml:id
        // (z. B. „wohnbauflaeche.13003_0000136") ist der einzige stabile
        // Bezeichner; für die Anzeige reicht ihr Zahlenteil.
        zone: gid ? gid[1].replace(/^[a-z_]+\./i, "") : "",
        art: xmlWert(f, "boris:nuta"),
        ergaenzung: xmlWert(f, "boris:ergnuta"),
        entwicklung: xmlWert(f, "boris:entw"),
        gemeinde: [xmlWert(f, "boris:gabe"), xmlWert(f, "boris:ortst")].filter(Boolean).join(" — "),
        rang,
      });
    }
  }
  if (zonen.length === 0) return { value: null, responded: true };

  // Die Nutzungsfamilie kommt aus `nuta` (WA/MI/MK/GE …), nicht aus dem
  // FeatureType — im Sanierungsgebiet steht sie erst dort.
  const score = (z: MvZone): number =>
    z.rang * 4 +
    (z.entwicklung === "B" ? 4 : 0) +
    familienScore(vborisFamilie(z.art), hint) * 2 +
    mfhBonus(z.ergaenzung, hint);
  const beste = [...zonen].sort((a, b) => score(b) - score(a))[0];

  return {
    value: {
      brw: beste.brw,
      // stag kommt schon deutsch (TT.MM.JJJJ) — nicht durch stichtagDe drehen.
      stichtag: beste.stichtag,
      zone: beste.zone,
      nutzung: [beste.art, beste.ergaenzung].filter(Boolean).join(" "),
      gemeinde: beste.gemeinde,
      quelle: "MV",
    },
    responded: true,
  };
}

/* ══════════════  Provider Berlin — VORBEREITET, DEAKTIVIERT  ══════════════ */

/**
 * Berlin ist bewusst NICHT im Dispatcher (PROVIDER) und NICHT in
 * isImBorisGebiet(): die gesamte Berliner Geodateninfrastruktur
 * (gdi.berlin.de, fbinter.stadt-berlin.de inkl. CSW-Katalog) liefert seit
 * der Recherche durchgängig eine statische Wartungsseite — auch beim
 * Gegentest am 18.08.2026 aus der Node-Laufzeit heraus (HTTP 200, Titel
 * „Wartungsarbeiten"). Es konnte daher NIE eine echte WFS-Antwort geprüft
 * werden: weder CRS noch FeatureType-Name noch Attributnamen sind
 * verifiziert; die Werte unten stammen aus dem Katalogeintrag auf
 * daten.berlin.de und dem ADV-Standardmodell, das Brandenburg (gleicher
 * Vermessungs-Kontext) nutzt. Ein solcher Pfad darf nicht scharf laufen —
 * ein ungetesteter Provider, der stillschweigend Unsinn parst, ist
 * schlimmer als gar kein Provider.
 *
 * Die Lizenz ist dagegen live bestätigt: dl-de/zero-2.0 (kommerzielle
 * Nutzung erlaubt, Namensnennung nicht einmal Pflicht).
 *
 * RE-VERIFIKATION (Reihenfolge einhalten, nichts überspringen):
 *  1. `GetCapabilities` auf `${BE_ENDPOINT_BASE}<jahr>` — kommt echtes XML
 *     statt der Wartungsseite? (normale TLS-Verifikation, KEIN curl -k)
 *  2. `DescribeFeatureType`: FeatureType-Name und Attributnamen prüfen.
 *     Trägt der Werte-Typ selbst eine Geometrie oder braucht Berlin — wie
 *     Brandenburg — den zweistufigen Flächen/Wert-Join?
 *  3. CRS prüfen: akzeptiert der Dienst EPSG:4326 direkt (dann bleibt der
 *     Code unten so) oder nur EPSG:25833?
 *  4. Punktabfrage Berlin Mitte (52.520, 13.405) — echter BRW-Wert?
 *  5. Erst danach SCHARFSCHALTEN: (a) die Zeile mit `fetchBerlin` in
 *     PROVIDER einkommentieren, (b) den Berlin-Testfall in
 *     scripts/boris-live-check.mts von PENDING auf aktiv umstellen,
 *     (c) `docs/white-label-migration.md` und `docs/preisatlas-research.md`
 *     nachziehen.
 */
function beRequestXml(lat: number, lng: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:GetFeature service="WFS" version="2.0.0" count="20"
  xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:fes="http://www.opengis.net/fes/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  xmlns:boris="http://www.adv-online.de/namespaces/adv/boris/2.0"
  xmlns:adv="http://www.adv-online.de/namespaces/adv/gid/7.1">
  <wfs:Query typeNames="boris:BR_BodenrichtwertZonal">
    <fes:Filter><fes:Intersects><fes:ValueReference>adv:position</fes:ValueReference>
      <gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(6)} ${lng.toFixed(6)}</gml:pos></gml:Point>
    </fes:Intersects></fes:Filter>
  </wfs:Query>
</wfs:GetFeature>`;
}

export async function fetchBerlin(
  lat: number,
  lng: number,
  hint?: BorisNutzungsHint,
): Promise<ProviderErgebnis> {
  // Eigene BBox-Prüfung, weil der Provider (noch) nicht über den Dispatcher
  // läuft — wer ihn testweise direkt aufruft, soll trotzdem keine
  // Koordinate außerhalb Berlins an den Dienst schicken.
  if (!imBbox(BE_BBOX, lat, lng)) return { value: null, responded: true };

  const jahr0 = new Date().getFullYear();
  for (const jahr of [jahr0, jahr0 - 1, jahr0 - 2]) {
    const res = await wfsPost("be", `${BE_ENDPOINT_BASE}${jahr}`, beRequestXml(lat, lng));
    if (!res) return { value: null, responded: false };
    const text = await res.text();
    // Die Wartungsseite kommt mit HTTP 200 und HTML — als transienten
    // Ausfall behandeln, NICHT als „außerhalb der Zone" (sonst würde ein
    // Wartungsfenster 24 h lang als bestätigtes null gecacht).
    if (!text.includes("<wfs:FeatureCollection") && !text.includes("<FeatureCollection")) {
      warnOnce("be-wartung", "BORIS Berlin: keine WFS-Antwort (Wartungsseite/HTML) — Provider bleibt deaktiviert.");
      return { value: null, responded: false };
    }
    const zone = advZoneWaehlen(parseAdvZonen(text), hint);
    if (!zone) continue; // evtl. falscher Jahrgang → nächstälterer
    return {
      value: {
        brw: zone.brw,
        stichtag: stichtagDe(zone.stichtag),
        zone: zone.zone,
        nutzung: [zone.art, zone.ergaenzung].filter(Boolean).join(" "),
        gemeinde: zone.gemeinde || "Berlin",
        quelle: "BE",
      },
      responded: true,
    };
  }
  return { value: null, responded: true };
}

/* ═════════════════════════  Dispatcher  ═════════════════════════ */

interface LandProvider {
  quelle: BorisQuelle;
  bbox: BorisBbox;
  fetch: (lat: number, lng: number, hint?: BorisNutzungsHint) => Promise<ProviderErgebnis>;
}

/**
 * Dispatch-Reihenfolge. Ein Punkt wird NUR an die Dienste geschickt, in
 * deren Länder-BBox er liegt (meist genau einer, an Grenzen zwei bis drei);
 * der erste Dienst mit einem Wert gewinnt.
 *
 * Die Reihenfolge ist bewusst gewählt, nicht alphabetisch:
 *  1. Stadtstaaten zuerst (HB, HH) — ihre kleinen Boxen liegen vollständig
 *     in der niedersächsischen bzw. schleswig-holsteinischen Umgebung; wer
 *     in Bremen steht, soll nicht erst Niedersachsen fragen.
 *  2. RLP und Hessen unverändert an dritter/vierter Stelle und in dieser
 *     Reihenfolge zueinander — das erhält das Bestandsverhalten am Rhein
 *     (RLP zuerst, Hessen nur bei „kein Treffer") exakt.
 *  3. Danach die Flächenländer. Deren Boxen überlappen die von RLP/Hessen
 *     nur in Randstreifen (Siegburg, Rhön, Werra) — dort ist die
 *     Bestandslogik weiterhin die erste Instanz.
 *
 * Berlin fehlt hier absichtlich (s. fetchBerlin) — zum Scharfschalten die
 * auskommentierte Zeile aktivieren.
 */
const PROVIDER: LandProvider[] = [
  { quelle: "HB", bbox: HB_BBOX, fetch: fetchBremen },
  { quelle: "HH", bbox: HH_BBOX, fetch: fetchHamburg },
  { quelle: "RLP", bbox: RLP_BBOX, fetch: (lat, lng) => fetchRlp(lat, lng) },
  { quelle: "HE", bbox: HE_BBOX, fetch: fetchHessen },
  { quelle: "NW", bbox: NW_BBOX, fetch: fetchNrw },
  { quelle: "NI", bbox: NI_BBOX, fetch: fetchNiedersachsen },
  { quelle: "BB", bbox: BB_BBOX, fetch: fetchBrandenburg },
  { quelle: "ST", bbox: ST_BBOX, fetch: fetchSachsenAnhalt },
  { quelle: "SN", bbox: SN_BBOX, fetch: fetchSachsen },
  { quelle: "TH", bbox: TH_BBOX, fetch: fetchThueringen },
  { quelle: "MV", bbox: MV_BBOX, fetch: fetchMecklenburgVorpommern },
  // { quelle: "BE", bbox: BE_BBOX, fetch: fetchBerlin },  ← erst nach Re-Verifikation, s. fetchBerlin
];

/** Liegt die Koordinate im Einzugsgebiet IRGENDEINES aktiven Dienstes? */
export function isImBorisGebiet(lat: number, lng: number): boolean {
  return PROVIDER.some((p) => imBbox(p.bbox, lat, lng));
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

  // Sequenzieller Dispatch entlang PROVIDER: nur Dienste anfragen, in deren
  // BBox der Punkt liegt, und beim ersten Treffer aufhören. `confirmed` ist
  // nur dann true, wenn JEDER kontaktierte Dienst geantwortet hat — sonst
  // würde ein transienter Ausfall als „kein Wert" 24 h im CDN-Cache landen,
  // obwohl das Nachbarland einen Wert gehabt hätte (und umgekehrt).
  let value: Bodenrichtwert | null = null;
  let allResponded = true;

  for (const p of PROVIDER) {
    if (value) break;
    if (!imBbox(p.bbox, lat, lng)) continue;
    const res = await p.fetch(lat, lng, hint);
    value = res.value;
    allResponded = allResponded && res.responded;
  }

  if (allResponded) cacheSet(key, value);
  return { value, confirmed: allResponded };
}

/**
 * Amtlichen Bodenrichtwert für eine Koordinate abfragen (elf Landesdienste,
 * s. Kopfkommentar). Fail-soft: liefert bei JEDEM Problem `null` (Timeout
 * 6 s je Dienst, HTTP-Fehler, Parse-Fehler, Lage außerhalb bebauter Zonen
 * oder außerhalb aller angebundenen Länder).
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

/**
 * OnOffice-API-Client + Mapping auf unser Estate-Modell — server-only.
 * NUR in Server-Komponenten/Routen importieren (nutzt process.env-Secrets +
 * node:crypto). Niemals ins Client-Bundle ziehen.
 *
 * Spec: docs/onoffice-integration.md. HMAC-Recipe, Feldnamen und Fehlerfälle
 * (0 Records mangels Datensatz-Sichtbarkeitsrecht, errorcode 170 bei
 * estatepictures mangels Bild-Leserecht) sind live gegen api.onoffice.de
 * verifiziert — der Client MUSS diese Fälle fail-soft auf `null` abbilden,
 * damit der Aufrufer (src/lib/estates.ts) sauber auf die Mock-Fixtures
 * zurückfällt. Es wird NIE ein Fehler geworfen und NIE hmac/token/secret
 * geloggt.
 */
import { createHmac } from "node:crypto";
import { inflateSync } from "node:zlib";
import type { Estate, EstateStatus, ObjectCategory, MarketingType, GeoPoint, EnergyCertificate, Provision } from "@/lib/mock-estates";

/** true, wenn Token+Secret gesetzt sind — Aufrufer können damit z. B. Status-Banner steuern. */
export const isOnOfficeEnabled = Boolean(process.env.ONOFFICE_TOKEN && process.env.ONOFFICE_SECRET);

// Override nur für lokale Tests gegen einen Mock-Server — produktiv ungesetzt.
const API_URL = process.env.ONOFFICE_API_URL || "https://api.onoffice.de/api/stable/api.php";
const TIMEOUT_MS = 15000;
const LIST_LIMIT = 200;
const MAX_PAGES = 5; // Sicherheitsdeckel gegen Endlos-Pagination bei kaputter cntabsolute-Angabe
const NEW_THRESHOLD_MS = 21 * 24 * 60 * 60 * 1000;
const FEATURED_COUNT = 3;

/* ─────────────────────────  HMAC v2 + Low-Level-Call  ───────────────────────── */

function signAction(opts: {
  secret: string;
  timestamp: number;
  token: string;
  resourcetype: string;
  actionid: string;
}): string {
  const { secret, timestamp, token, resourcetype, actionid } = opts;
  const message = `${timestamp}${token}${resourcetype}${actionid}`;
  return createHmac("sha256", secret).update(message).digest("base64");
}

interface OnOfficeStatus {
  code?: number;
  errorcode: number;
  message?: string;
}

interface OnOfficeResult<T> {
  data: T;
  status: OnOfficeStatus;
}

interface OnOfficeEnvelope<T> {
  status: OnOfficeStatus;
  response?: {
    results?: OnOfficeResult<T>[];
  };
}

/**
 * Ein Action-Call gegen die stable-API. Wirft NIE nach außen: Netzwerk-/
 * Timeout-Fehler, HTTP-Fehler und errorcode!==0 (egal ob Envelope- oder
 * Action-Ebene) landen alle als einmalig geloggtes `null` beim Aufrufer.
 */
async function callOnOffice<T>(
  resourcetype: string,
  action: string,
  parameters: Record<string, unknown>,
): Promise<T | null> {
  const token = process.env.ONOFFICE_TOKEN;
  const secret = process.env.ONOFFICE_SECRET;
  if (!token || !secret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const actionid = `urn:onoffice-de-ns:smart:2.5:smartml:action:${action}`;
  const hmac = signAction({ secret, timestamp, token, resourcetype, actionid });

  const body = {
    token,
    request: {
      actions: [
        {
          actionid,
          resourceid: "",
          resourcetype,
          identifier: "",
          timestamp,
          hmac,
          hmac_version: 2,
          parameters,
        },
      ],
    },
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[onoffice] HTTP ${res.status} bei ${resourcetype}:${action}`);
      return null;
    }

    const json = (await res.json()) as OnOfficeEnvelope<T>;
    if (json.status?.errorcode !== 0) {
      console.error(`[onoffice] ${resourcetype}:${action} Envelope-Fehler errorcode=${json.status?.errorcode} ${json.status?.message ?? ""}`);
      return null;
    }

    const result = json.response?.results?.[0];
    if (!result) {
      console.error(`[onoffice] ${resourcetype}:${action}: keine Ergebnisse in der Antwort`);
      return null;
    }
    if (result.status?.errorcode !== 0) {
      // z. B. errorcode 170 "No read permission for this user" (estatepictures) —
      // vom Aufrufer als fehlende Berechtigung behandelt, kein harter Fehler.
      console.error(`[onoffice] ${resourcetype}:${action} errorcode=${result.status?.errorcode} ${result.status?.message ?? ""}`);
      return null;
    }

    return result.data;
  } catch (err) {
    console.error(`[onoffice] ${resourcetype}:${action} fehlgeschlagen:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/* ─────────────────────────  Kleine, defensive Parser  ───────────────────────── */

// OnOffice liefert Zahlen teils als String — Number("") wäre 0, deshalb Leerstring
// explizit wie "fehlt" behandeln.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "ja";
  return false;
}

/** "YYYY-MM-DD HH:MM:SS" (OnOffice-typisch) defensiv zu ISO — sonst null. */
function parseOnOfficeDate(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;
  const isoish = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
  const d = new Date(isoish);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSlug(title: string, id: string): string {
  const base = slugify(title);
  return base ? `${base}-${id}` : id;
}

// "buero" -> "büro", "doppelhaushaelfte" -> "doppelhaushälfte" usw. — kleine
// Umlaut-Rückwandlung für die intern üblichen ae/oe/ue-Transliterationen.
const UMLAUT_SUBSTITUTES: [RegExp, string][] = [
  [/ae/g, "ä"],
  [/oe/g, "ö"],
  [/ue/g, "ü"],
];

function prettifyKey(raw: string): string {
  if (!raw) return "";
  return raw
    .split("_")
    .filter(Boolean)
    .map((word) => {
      let w = word.toLowerCase();
      for (const [pattern, repl] of UMLAUT_SUBSTITUTES) w = w.replace(pattern, repl);
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/* ─────────────────────────  Feld-/Wert-Mappings  ───────────────────────── */

const STATUS2_ACTIVE = new Set(["aktive_vermarktung", "passive_vermarktung", "status2obj_aktiv"]);
const STATUS2_SKIP = new Set([
  "status2obj_archiviert",
  "status2obj_inaktiv",
  "auftrag_entzogen",
  "fremd_verkauft_vermietet",
  // Vor-Vermarktungsphasen: Objekt existiert im CRM, ist aber noch nicht
  // vermarktungsreif — gehört nicht auf die öffentliche Website.
  "marktbeobachtung",
  "in_akquise",
  "vorbereitung",
]);

/** null = Datensatz überspringen (archiviert/inaktiv/entzogen/fremdvermarktet/Vor-Vermarktung). */
function mapStatus2(raw: string): EstateStatus | null {
  // Leer/ungepflegt: veroeffentlichen=1 (im Filter) ist das explizite
  // Publish-Signal — ein leeres status2 soll das nicht aushebeln.
  if (!raw) return "aktiv";
  if (STATUS2_SKIP.has(raw)) return null;
  if (STATUS2_ACTIVE.has(raw)) return "aktiv";
  if (raw === "reserviert") return "reserviert";
  if (raw === "verkauft") return "verkauft";
  if (raw === "vermietet") return "vermietet";
  // Unbekannter, gepflegter Wert (z. B. account-spezifische ind_Schl_*-Codes):
  // im Zweifel NICHT veröffentlichen — falsch angezeigte Objekte sind teurer
  // als ein fehlendes.
  return null;
}

function mapCategory(objektart: string): ObjectCategory {
  if (objektart === "wohnung" || objektart === "zimmer") return "wohnung";
  if (objektart === "haus" || objektart === "zinshaus_renditeobjekt") return "haus";
  if (objektart === "grundstueck" || objektart === "land_und_forstwirtschaft") return "grundstueck";
  return "gewerbe";
}

function mapMarketingType(vermarktungsart: string): MarketingType {
  return vermarktungsart === "kauf" ? "kauf" : "miete"; // miete|pacht|erbpacht -> miete
}

/**
 * Ort-Feld normalisieren: RIEGEL pflegt teils "Stadt / Stadtteil" oder
 * "Stadt , Zusatz" in EINEM Feld ("Ludwigshafen am Rhein / Rheingönheim",
 * "Harthausen , Pfalz"). Für Filter-Dropdown & Karten-Gruppierung brauchen
 * wir eine saubere Stadt; der Stadtteil wandert in district (Fallback).
 */
function normalizeOrt(raw: string): { city: string; districtFromOrt?: string } {
  let city = raw;
  let districtFromOrt: string | undefined;
  const slash = raw.indexOf("/");
  if (slash > 0) {
    city = raw.slice(0, slash);
    districtFromOrt = raw.slice(slash + 1).trim() || undefined;
  }
  city = city.split(",")[0].trim();
  // Site-weite Konvention (ESTATE_ORTE, Standorte-Seiten): "Ludwigshafen" ohne Zusatz.
  if (/^ludwigshafen\b/i.test(city)) city = "Ludwigshafen";
  return { city, districtFromOrt };
}

const FEATURE_FLAGS: [string, string][] = [
  ["balkon", "Balkon"],
  ["terrasse", "Terrasse"],
  ["wintergarten", "Wintergarten"],
  ["kamin", "Kamin"],
  ["fahrstuhl", "Aufzug"],
  ["unterkellert", "Keller"],
  ["multiParkingLot", "Stellplätze"],
];

const MAX_TEXT_FEATURE_CHIPS = 14;

/** Zeile besteht nur aus einer Jahreszahl (z. B. "1998", "2005 ."), ohne weiteren
 * Text — typisch für Modernisierungs-Chroniken, für sich genommen kein Ausstattungsmerkmal. */
function isBareYear(line: string): boolean {
  return /^\d{4}\s*\.?$/.test(line);
}

/**
 * ausstatt_beschr in kurze Chip-Segmente (≤45 Zeichen) + einen Rest-Absatz für
 * Fließtext. Die Felder sind zeilenbasiert gepflegt (QA-Samples) — NUR an
 * Zeilenumbrüchen splitten: Kommas gehören zum Text und dürfen dt. Kommazahlen
 * nicht zerreißen (QA-Fund Id 419: "Ca. 120, 54 m² Garten" wurde vorher an der
 * "120,"-Stelle zerschnitten). Reine Struktur-Überschriften (Zeile endet auf
 * ":", z. B. "Angaben laut Verkäufer:") und nackte Jahreszahlen werden
 * verworfen; "Hinweis"/"Angaben laut"-Zeilen mit echtem Inhalt wandern in den
 * Fließtext statt als Chip zu erscheinen. existingLabels (bereits über
 * FEATURE_FLAGS gesetzte Chips wie "Balkon") werden case-insensitiv gegen
 * Dubletten geprüft. Chip-Deckel: MAX_TEXT_FEATURE_CHIPS (Überhang ->
 * extraParagraph), damit die Detailseite nicht in Pillen ertrinkt.
 */
function extractTextFeatures(text: string, existingLabels: string[] = []): { chips: string[]; extraParagraph?: string } {
  if (!text) return { chips: [] };
  const existing = new Set(existingLabels.map((label) => label.toLowerCase()));
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const chips: string[] = [];
  const longParts: string[] = [];

  for (const line of lines) {
    if (line.endsWith(":") || isBareYear(line)) continue; // reine Struktur-Überschrift/Jahreszahl -> verwerfen
    if (/^(hinweis|angaben\s+laut)\b/i.test(line)) {
      longParts.push(line); // Disclaimer mit echtem Inhalt -> Fließtext statt Chip
      continue;
    }
    if (existing.has(line.toLowerCase())) continue; // Dublette zu einem bereits über FEATURE_FLAGS gesetzten Chip

    if (line.length <= 45) chips.push(line);
    else longParts.push(line);
  }

  // Chip-Überhang landet ebenfalls im Fließtext statt einer endlosen Pillen-Wand.
  const overflow = chips.length > MAX_TEXT_FEATURE_CHIPS ? chips.splice(MAX_TEXT_FEATURE_CHIPS) : [];
  longParts.push(...overflow);

  return { chips, extraParagraph: longParts.length ? longParts.join(" ") : undefined };
}

// Erkennt den führenden App-Werbe-Absatz in objektbeschreibung, unabhängig von
// der (variablen) Punktzahl drumherum — z. B. "................Jetzt die neue
// RIEGEL APP, kostenlos im APP Store herunterladen........................"
// oder "........Immer aktuell mit der RIEGEL APP, kostenlos im APP Store
// herunterladen........." (QA-Samples Id 419/6037/7683).
const APP_PROMO_KEYWORDS = [/riegel/i, /\bapp\b/i, /herunterladen/i];

function isAppPromoParagraph(paragraph: string): boolean {
  return APP_PROMO_KEYWORDS.every((re) => re.test(paragraph));
}

// Folgt dem App-Werbe-Absatz oft: "Hallo Zukunft......" mit variabler
// Punktzahl. Manchmal hängt direkt ein ECHTER Untertitel im selben Absatz
// dran ("Hallo Zukunft......Altersgerechte und barrierefreie Wohnung") — nur
// das Präfix fällt weg, der Rest bleibt erhalten.
// Auch "........Hallo Zukunft........" (führende Punktreihe, QA-Fund Id 11431).
const HALLO_ZUKUNFT_RE = /^[.\s]*hallo\s+zukunft[.\s]*/i;

/**
 * Entfernt die RIEGEL-APP-Werbe-Boilerplate + ein optionales "Hallo
 * Zukunft...."-Präfix vom Anfang von objektbeschreibung (QA-verifiziert an
 * echten Ids 419/6037/7683 — Id 5927 hat gar keine Boilerplate und bleibt
 * unverändert durch). \r\n wird zu \n normalisiert, führende/mehrfache
 * Leerzeilen werden aufgeräumt. Die Absatzstruktur (Leerzeile = \n\n) bleibt
 * ansonsten erhalten — die Detailseite rendert sie mit white-space:pre-line.
 */
function cleanDescription(raw: string): string {
  if (!raw) return "";
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim());

  while (paragraphs.length > 0) {
    const head = paragraphs[0];
    if (isAppPromoParagraph(head)) {
      paragraphs.shift(); // kompletter Werbe-Absatz -> weg
      continue;
    }
    if (HALLO_ZUKUNFT_RE.test(head)) {
      const rest = head.replace(HALLO_ZUKUNFT_RE, "").trim();
      if (!rest) {
        paragraphs.shift(); // nur Punkte, kein echter Untertitel -> Absatz komplett weg
        continue;
      }
      paragraphs[0] = rest; // echter Untertitel bleibt, nur Präfix abgeschnitten
    }
    break;
  }

  // Dekorative Punktreihen um Untertitel abstreifen ("......Titel......" —
  // QA-Fund Id 11431); Punkte IM Satz (z. B. "ca. 496,00 m²...") bleiben.
  const stripped = paragraphs.map((p) => p.replace(/^\.{3,}\s*/, "").replace(/\s*\.{4,}$/, "").trim());

  return stripped.filter(Boolean).join("\n\n");
}

const VALID_ENERGY_CLASSES = new Set(["A+", "A", "B", "C", "D", "E", "F", "G", "H"]);

function mapEnergy(el: Record<string, unknown>): EnergyCertificate {
  const typ = str(el.energieausweistyp);

  let base: EnergyCertificate;
  switch (typ) {
    case "Endenergiebedarf":
      base = { type: "bedarf", value: num(el.endenergiebedarf) ?? undefined };
      break;
    case "Energieverbrauchskennwert":
      base = { type: "verbrauch", value: num(el.energieverbrauchskennwert) ?? undefined };
      break;
    case "Bedarfsausweis Gewerbe":
      base = {
        type: "bedarf",
        valueHeating: num(el.endenergiebedarfWaerme) ?? undefined,
        valueElectricity: num(el.endenergiebedarfStrom) ?? undefined,
      };
      break;
    case "Verbrauchsausweis Gewerbe":
      base = {
        type: "verbrauch",
        valueHeating: num(el.endenergieverbrauchWaerme) ?? undefined,
        valueElectricity: num(el.endenergieverbrauchStrom) ?? undefined,
      };
      break;
    case "es besteht keine Pflicht!":
      base = { type: "kein" };
      break;
    default:
      // "ohne Energieausweis" oder leer
      base = { type: "wird_nachgereicht" };
  }

  const energyClassRaw = str(el.energyClass);
  const energyClass = VALID_ENERGY_CLASSES.has(energyClassRaw)
    ? (energyClassRaw as EnergyCertificate["energyClass"])
    : undefined;
  const source = prettifyKey(str(el.energietraeger)) || undefined;
  const year = num(el.baujahr) ?? undefined;

  return { ...base, energyClass, source, year };
}

function mapProvision(el: Record<string, unknown>): Provision {
  const text = str(el.aussen_courtage) || undefined;
  const buyerPct = num(el.prozent_aussenprovision) ?? undefined;
  // "Provisionsfrei" NUR bei explizitem Signal im Courtage-Text. Leere Felder
  // heißen "nicht gepflegt", nicht "provisionsfrei" — eine fälschlich
  // behauptete Provisionsfreiheit wäre eine rechtlich relevante Falschangabe.
  // Ohne Angabe zeigt die Detailseite dann "Auf Anfrage."
  const free = text ? /provisionsfrei|courtagefrei|keine\s+(käufer|aussen|außen)?\s*(provision|courtage)/i.test(text) : false;
  return { free, buyerPct, text };
}

/* ─────────────────────────  estate read  ───────────────────────── */

interface OnOfficeEstateRecord {
  id: string | number;
  type?: string;
  elements: Record<string, unknown>;
}

interface OnOfficeEstateData {
  meta?: { cntabsolute?: number | string };
  records?: OnOfficeEstateRecord[];
}

// Feldliste exakt gemäß Feld-Konfiguration des RIEGEL-Accounts (siehe Spec).
// sonstige_angaben wird zwar angefordert (Konfiguration erlaubt es), aber
// bewusst NIE gemappt/veröffentlicht — oft interne Maklernotizen.
const ESTATE_FIELDS = [
  "Id",
  "objekttitel",
  "objektart",
  "objekttyp",
  "vermarktungsart",
  "kaufpreis",
  "kaltmiete",
  "warmmiete",
  "nebenkosten",
  "kaution",
  "preisAufAnfrage",
  "anzahl_zimmer",
  "anzahl_schlafzimmer",
  "anzahl_badezimmer",
  "wohnflaeche",
  "nutzflaeche",
  "grundstuecksflaeche",
  "plz",
  "ort",
  "strasse",
  "hausnummer",
  "regionaler_zusatz",
  "lage",
  "objektbeschreibung",
  "ausstatt_beschr",
  "sonstige_angaben",
  "baujahr",
  "zustand",
  "energieausweistyp",
  "endenergiebedarf",
  "energieverbrauchskennwert",
  "energietraeger",
  "energyClass",
  "endenergiebedarfWaerme",
  "endenergiebedarfStrom",
  "endenergieverbrauchWaerme",
  "endenergieverbrauchStrom",
  "aussen_courtage",
  "prozent_aussenprovision",
  "status",
  "status2",
  "objektnr_extern",
  "erstellt_am",
  "geaendert_am",
  "balkon",
  "terrasse",
  "wintergarten",
  "kamin",
  "fahrstuhl",
  "unterkellert",
  "multiParkingLot",
  // Systemfelder: nicht in fields:get gelistet, aber als data akzeptiert (verifiziert).
  "breitengrad",
  "laengengrad",
  "veroeffentlichen",
];

async function fetchEstateRecords(): Promise<OnOfficeEstateRecord[]> {
  const records: OnOfficeEstateRecord[] = [];
  let listoffset = 0;
  let cntabsolute = Number.POSITIVE_INFINITY; // erst nach der ersten Antwort bekannt

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await callOnOffice<OnOfficeEstateData>("estate", "read", {
      data: ESTATE_FIELDS,
      filter: {
        veroeffentlichen: [{ op: "=", val: 1 }],
        status: [{ op: "=", val: 1 }],
      },
      listlimit: LIST_LIMIT,
      listoffset,
      sortby: "geaendert_am",
      sortorder: "DESC",
      estatelanguage: "DEU",
    });
    if (!data) break; // Fehler/keine Berechtigung -> mit dem bisher Gelesenen weitermachen

    const pageRecords = data.records ?? [];
    records.push(...pageRecords);

    const total = num(data.meta?.cntabsolute);
    cntabsolute = total ?? records.length;

    listoffset += LIST_LIMIT;
    if (pageRecords.length === 0 || listoffset >= cntabsolute) break;
  }

  return records;
}

function mapEstateRecord(record: OnOfficeEstateRecord, statusOverride?: EstateStatus): Estate | null {
  const el = record.elements ?? {};
  const id = str(record.id ?? el.Id);
  if (!id) return null;

  // statusOverride: für den Verkauft-Referenzen-Pull (fetchVerkaufteReferenzen)
  // — dort sind archivierte/deaktivierte Datensätze mit verkauft=1 gerade
  // erwünscht, mapStatus2 würde sie verwerfen. Der Override erzwingt
  // "verkauft"; die Fremd-/Entzogen-Fälle filtert der Aufrufer vorher raus.
  const status = statusOverride ?? mapStatus2(str(el.status2));
  if (status === null) return null; // archiviert/inaktiv/entzogen/fremdvermarktet -> nicht veröffentlichen

  // IS24-Marketing-Präfix entfernen: "Sie hier? Wir auch!" zielt auf Portal-
  // Konkurrenz-Listen — auf der EIGENEN Website wäre er auf jeder Karte reine
  // Redundanz und killt die Scanbarkeit. (Nur Anzeige hier; CRM bleibt unberührt.)
  // Tolerant ggü. Tippvarianten im CRM: "Sie hier ? Wir auch !" (QA-Fund, 3 Objekte).
  const title = str(el.objekttitel).replace(/^\s*sie\s*hier\s*\?\s*wir\s*auch\s*!\s*/i, "").trim() || "Ohne Titel";
  const marketingType = mapMarketingType(str(el.vermarktungsart));
  const category = mapCategory(str(el.objektart));
  const objectType = prettifyKey(str(el.objekttyp)) || undefined;

  const preisAufAnfrage = bool(el.preisAufAnfrage);
  // Preis + Label MÜSSEN aus derselben Quelle stammen: fällt die Miete auf
  // warmmiete zurück, darf darüber nicht "Kaltmiete" stehen (falsche Angabe
  // bei einer rechtlich relevanten Kennzahl).
  let price: number | null;
  let priceLabel: Estate["priceLabel"];
  if (marketingType === "kauf") {
    price = num(el.kaufpreis);
    priceLabel = "Kaufpreis";
  } else {
    const kalt = num(el.kaltmiete);
    if (kalt) {
      price = kalt;
      priceLabel = "Kaltmiete";
    } else {
      price = num(el.warmmiete);
      priceLabel = price ? "Warmmiete" : "Kaltmiete";
    }
  }
  if (preisAufAnfrage || !price) price = null;

  const nebenkosten = num(el.nebenkosten);
  const ancillaryCosts = nebenkosten && nebenkosten > 0 ? nebenkosten : undefined;

  // "0.00" bedeutet bei OnOffice "nicht gepflegt" (z. B. Zimmer bei Grundstücken) — als fehlend behandeln.
  const rooms = num(el.anzahl_zimmer) || null;
  const livingArea = num(el.wohnflaeche) || num(el.nutzflaeche) || null;
  const grundstuecksflaeche = num(el.grundstuecksflaeche);
  const plotArea = grundstuecksflaeche && grundstuecksflaeche > 0 ? grundstuecksflaeche : undefined;

  const { city, districtFromOrt } = normalizeOrt(str(el.ort));
  const postcode = str(el.plz);
  // regionaler_zusatz ist in diesem Account durchgängig ein interner Feld-
  // Schlüssel ("['indMulti1814Select6511']") statt eines Stadtteils — Technik-
  // Werte verwerfen, echter Stadtteil kommt ggf. aus dem Ort-Feld (Slash-Teil).
  const rawDistrict = str(el.regionaler_zusatz);
  const district = (/^[\["']*ind[A-Z0-9]/i.test(rawDistrict) ? "" : rawDistrict) || districtFromOrt || undefined;

  // DATENSCHUTZ (Vorgabe Sissy RIEGEL): Die genaue Anschrift eines Objekts darf
  // NIRGENDS im Portal auftauchen — auch nicht als exakte Karten-Koordinate im
  // Seiten-Quelltext. Deshalb werden die OnOffice-Koordinaten hier serverseitig
  // (a) auf 2 Nachkommastellen (~1 km) gerundet — verlustbehaftet, also NICHT
  // auf die Hausnummer rückrechenbar — und (b) mit einem kleinen, aus der Id
  // abgeleiteten Versatz (~200–320 m) versehen, damit Objekte derselben
  // Rasterzelle sich auf der Karte nicht exakt überlagern (der Versatz sitzt auf
  // dem bereits gerundeten Wert und verrät daher die echte Lage nicht). Die
  // Karte deckelt zusätzlich den Zoom (portal-map.tsx). Ergebnis: nur die
  // Gegend/der Ort ist sichtbar, nie das einzelne Gebäude.
  const rawLat = num(el.breitengrad);
  const rawLng = num(el.laengengrad);
  let geo: GeoPoint | null = null;
  if (rawLat !== null && rawLng !== null && rawLat !== 0 && rawLng !== 0) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
    const ang = ((((h % 360) + 360) % 360) * Math.PI) / 180;
    const dist = 0.0018 + ((Math.abs(h >> 8) % 120) / 120) * 0.0012; // ~200–320 m
    geo = {
      lat: Math.round(rawLat * 100) / 100 + Math.sin(ang) * dist,
      lng: Math.round(rawLng * 100) / 100 + Math.cos(ang) * dist,
    };
  }
  // Bewusst IMMER false: das Portal zeigt nie die exakte Lage (nur den Ort).
  const showExactLocation = false;

  const flagFeatures = FEATURE_FLAGS.filter(([key]) => bool(el[key])).map(([, label]) => label);
  const { chips: textFeatures, extraParagraph } = extractTextFeatures(str(el.ausstatt_beschr), flagFeatures);
  const features = [...flagFeatures, ...textFeatures];

  let description = cleanDescription(str(el.objektbeschreibung)) || undefined;
  if (extraParagraph) description = description ? `${description}\n\n${extraParagraph}` : extraParagraph;

  const updatedAt = parseOnOfficeDate(el.geaendert_am) ?? parseOnOfficeDate(el.erstellt_am) ?? new Date(0).toISOString();
  const erstelltIso = parseOnOfficeDate(el.erstellt_am);
  const isNew = erstelltIso !== null && Date.now() - new Date(erstelltIso).getTime() < NEW_THRESHOLD_MS;

  return {
    id,
    // "2183 (1/2183)"-Varianten aufs eigentliche Kürzel eindampfen — die Klammer
    // ist interne Mehrfach-Nummerierung, keine Kunden-Objektnummer.
    externalId: str(el.objektnr_extern).split("(")[0].trim() || undefined,
    slug: buildSlug(title, id),
    title,
    marketingType,
    category,
    objectType,
    status,
    isNew,
    isFeatured: false, // wird nach dem Einsammeln aller Seiten anhand von updatedAt gesetzt
    price,
    priceLabel,
    priceReduced: false, // kein Quellfeld in OnOffice
    ancillaryCosts,
    rooms,
    livingArea,
    plotArea,
    city,
    postcode,
    district,
    geo,
    showExactLocation,
    description,
    features,
    locationDescription: str(el.lage) || undefined,
    energy: mapEnergy(el),
    provision: mapProvision(el),
    images: [], // wird unten über estatepictures befüllt (oder bleibt [] bei fehlendem Bild-Leserecht)
    updatedAt,
  };
}

/* ─────────────────────────  estatepictures get  ───────────────────────── */

interface OnOfficePicture {
  estateId: string;
  url: string;
  isTitle: boolean;
  position: number;
}

// Shape von estatepictures:get ist NICHT live verifiziert (Account hat aktuell
// kein Bild-Leserecht, errorcode 170) — deshalb möglichst tolerant lesen:
// sowohl flach ({estateid,url,...}) als auch verschachtelt ({elements:{...}})
// wie bei estate:read.
// Live verifiziert (09.07.2026, nach Rechte-Freischaltung): ein record trägt
// elements als ARRAY von Bild-Objekten ({estateid, type, url, ...}) — nicht
// als Dict wie bei estate:read. Alle drei denkbaren Formen abdecken.
function extractPictureObjects(item: unknown): Record<string, unknown>[] {
  if (!item || typeof item !== "object") return [];
  const obj = item as Record<string, unknown>;
  const el = obj.elements;
  if (Array.isArray(el)) {
    return el.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object");
  }
  if (el && typeof el === "object") return [{ ...obj, ...(el as Record<string, unknown>) }];
  return [obj];
}

// Gemessen (09.07.2026): estatepictures skaliert bei OnOffice linear mit der
// Objektzahl (~0,17 s/Objekt Server-Rendering) — 110 Objekte in EINEM Call
// dauerten 13,8 s und waren der Grund für >15 s Ladezeit beim Cache-Fill.
// 6 parallele Batches à 20 drücken das auf die Zeit des längsten Batches (~3 s).
const PICTURE_BATCH_SIZE = 20;

async function fetchEstateImages(ids: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (ids.length === 0) return result;

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += PICTURE_BATCH_SIZE) {
    batches.push(ids.slice(i, i + PICTURE_BATCH_SIZE));
  }
  const t0 = Date.now();
  const responses = await Promise.all(
    batches.map((batch) =>
      callOnOffice<{ records?: unknown[] } | unknown[]>("estatepictures", "get", {
        estateids: batch,
        categories: ["Titelbild", "Foto"],
        size: "1600x1200",
        language: "DEU",
      }),
    ),
  );
  console.info(`[onoffice] estatepictures: ${batches.length} Batches in ${Date.now() - t0}ms`);

  // z. B. errorcode 170 "No read permission for this user" -> betroffene Estates
  // bekommen unten images:[] (kein Abbruch der gesamten Estate-Ladung).
  const rawRecords = responses.flatMap((data) =>
    data ? (Array.isArray(data) ? data : data.records ?? []) : [],
  );
  const byEstate = new Map<string, OnOfficePicture[]>();

  for (const raw of rawRecords) {
    for (const f of extractPictureObjects(raw)) {
      const estateId = str(f.estateid ?? f.estateMainId ?? f.id);
      const url = str(f.url);
      if (!estateId || !url.startsWith("https://")) continue;
      // Host gegen die next.config-Allowlist absichern: eine URL außerhalb von
      // *.onoffice.de würde next/image hart crashen lassen — lieber verwerfen,
      // das Objekt fällt dann auf den "Fotos folgen"-Platzhalter zurück.
      try {
        const host = new URL(url).hostname;
        if (host !== "onoffice.de" && !host.endsWith(".onoffice.de")) continue;
      } catch {
        continue;
      }
      const category = str(f.type ?? f.category);
      const isTitle = category === "Titelbild";
      const position = num(f.position) ?? Number.MAX_SAFE_INTEGER;

      const list = byEstate.get(estateId) ?? [];
      list.push({ estateId, url, isTitle, position });
      byEstate.set(estateId, list);
    }
  }

  for (const [estateId, pics] of byEstate) {
    pics.sort((a, b) => {
      if (a.isTitle !== b.isTitle) return a.isTitle ? -1 : 1; // Titelbild immer zuerst
      return a.position - b.position;
    });
    result.set(estateId, pics.map((p) => p.url));
  }

  return result;
}

/* ─────────────────────────  PDF-Exposé (pdf get)  ───────────────────────── */

// Live verifiziert (09.07.2026): templates:get {type:"pdf"} liefert u. a.
// "Exposé Riegel neu 2026" und "Exposé Riegel"; pdf:get antwortet mit
// base64(zlib(PDF)). Reihenfolge: neuestes Template zuerst, Fallback altes.
const EXPOSE_TEMPLATES = [
  "urn:onoffice-de-ns:smart:2.5:pdf:expose:lang:Exposé Riegel neu 2026",
  "urn:onoffice-de-ns:smart:2.5:pdf:expose:lang:Exposé Riegel",
];

interface OnOfficePdfData {
  records?: { elements?: { type?: string; document?: string } }[];
}

/**
 * Erzeugt das offizielle RIEGEL-PDF-Exposé zu einer OnOffice-Objekt-Id.
 * `null` bei Fehler/fehlender Konfiguration — der Aufrufer antwortet dann 503.
 */
export async function fetchExposePdf(estateId: string): Promise<Buffer | null> {
  if (!isOnOfficeEnabled) return null;

  for (const template of EXPOSE_TEMPLATES) {
    const data = await callOnOffice<OnOfficePdfData>("pdf", "get", {
      estateid: Number(estateId),
      template,
    });
    const document = data?.records?.[0]?.elements?.document;
    if (!document) continue; // z. B. Template umbenannt -> nächstes probieren

    try {
      const raw = Buffer.from(document, "base64");
      // Dokument kommt zlib-komprimiert (0x78-Header); unkomprimiertes PDF tolerieren.
      const pdf = raw.subarray(0, 4).toString("latin1") === "%PDF" ? raw : inflateSync(raw);
      if (pdf.subarray(0, 4).toString("latin1") !== "%PDF") continue;
      return pdf;
    } catch {
      continue; // kaputte Antwort -> Fallback-Template versuchen
    }
  }
  return null;
}

/* ─────────────────────────  address create (Lead-Übergabe)  ───────────────────────── */

interface OnOfficeAddressCreateRecord {
  id?: string | number;
  elements?: { id?: string | number };
}

interface OnOfficeAddressCreateData {
  records?: OnOfficeAddressCreateRecord[];
}

/**
 * Legt einen Interessenten aus einer Website-Anfrage (Objektanfrage, Kontakt
 * o. Ä.) als Adresse im RIEGEL-CRM an — die Web-Anfrage landet damit direkt
 * in OnOffice statt nur per Mail/Supabase. Fail-soft wie callOnOffice: bei
 * fehlender Konfiguration oder jeglichem Fehler wird NIE geworfen, es kommt
 * immer `{ ok: false }` zurück (kein Secret/HMAC-Logging, siehe Dateikopf).
 *
 * ACHTUNG: bewusst NICHT eigenständig aufrufen/live testen — jeder Aufruf
 * schreibt einen ECHTEN Datensatz in RIEGELs Live-CRM. Das Auslösen eines
 * echten address:create ist dem Orchestrator/Kunden vorbehalten.
 */
export async function createLeadAddress(input: {
  vorname?: string;
  name: string;
  email: string;
  telefon?: string;
  bemerkung?: string;
}): Promise<{ ok: boolean; addressId?: string }> {
  if (!isOnOfficeEnabled) return { ok: false };

  const data = await callOnOffice<OnOfficeAddressCreateData>("address", "create", {
    Vorname: input.vorname,
    Name: input.name,
    Email: input.email,
    Telefon1: input.telefon,
    Bemerkung: input.bemerkung,
    // HerkunftKontakt ist ein Multiselect mit festen Schlüsseln — "Website"
    // wirft Fehler 76. Der gültige Schlüssel dieses Accounts ist
    // "webseite_system" (live verifiziert 09.07.2026 via address:create-Test).
    HerkunftKontakt: "webseite_system",
    checkDuplicate: true,
  });
  if (!data) return { ok: false };

  const record = data.records?.[0];
  const addressId = record ? str(record.id ?? record.elements?.id) : "";
  return { ok: true, addressId: addressId || undefined };
}

/* ─────────────────────────  Live-Ticker: aggregierte Counts  ───────────────────────── */

interface OnOfficeCountData {
  // NUR meta.cntabsolute wird ausgewertet — data:["Id"] + listlimit:1 dient
  // ausschließlich dazu, den Call günstig zu halten (keine echten Records nötig).
  meta?: { cntabsolute?: number | string };
}

/**
 * Gesamtzahl der Objekte, die `filter` erfüllen — OHNE die Records selbst zu
 * laden (listlimit:1, data:["Id"]). Liefert NUR den aggregierten Zähler aus
 * response.results[0].data.meta.cntabsolute. `null` bei jeglichem Fehler
 * (fail-soft wie callOnOffice) — niemals ein geratener/gerundeter Ersatzwert.
 */
async function fetchEstateCount(filter: Record<string, unknown>): Promise<number | null> {
  const data = await callOnOffice<OnOfficeCountData>("estate", "read", {
    data: ["Id"],
    listlimit: 1,
    filter,
  });
  return num(data?.meta?.cntabsolute);
}

/**
 * Aggregierte Live-Zähler für den Start-Ticker ("Zahlen, die man nachprüfen
 * kann") — NUR Counts, NIE einzelne Objekt-Datensätze. `aktuellImAngebot`
 * kommt bewusst NICHT von hier, sondern vom Aufrufer aus derselben
 * getEstateData()-Quelle wie das Portal (Konsistenz: der Ticker muss exakt zu
 * dem passen, was ein Besucher im Portal anklicken kann).
 *
 * `reserviert` wird hier ABSICHTLICH nicht geliefert: das boolesche Feld
 * `reserviert` liefert bei diesem Account durchgängig 0 (der tatsächliche
 * Reservierungsstatus wird über status2 gepflegt, nicht über dieses Feld) —
 * ein Count darauf wäre technisch "erfolgreich", aber inhaltlich falsch.
 * Lieber eine ehrliche Lücke im Ticker als eine falsche Zahl.
 *
 * `null`, wenn OnOffice nicht konfiguriert ist oder IRGENDEINE der beiden
 * Abfragen fehlschlägt — der Aufrufer zeigt dann gar keinen Ticker an.
 */
export async function fetchLiveTickerCounts(): Promise<{
  inVorbereitung: number;
  bisherVerkauft: number;
} | null> {
  if (!isOnOfficeEnabled) return null;

  const [inVorbereitung, bisherVerkauft] = await Promise.all([
    // In Vorbereitung: CRM-Status aktiv, aber noch nicht veröffentlicht.
    fetchEstateCount({
      status: [{ op: "=", val: 1 }],
      veroeffentlichen: [{ op: "=", val: 0 }],
    }),
    // Bisher verkauft: persistentes Boolean-Feld, unabhängig vom Veröffentlichungs-
    // status — deckt auch längst offline genommene Alt-Objekte ab.
    fetchEstateCount({ verkauft: [{ op: "=", val: 1 }] }),
  ]);
  if (inVorbereitung === null || bisherVerkauft === null) return null;

  return { inVorbereitung, bisherVerkauft };
}

/* ─────────────────────────  Public API  ───────────────────────── */

/**
 * Liefert alle aktiven/veröffentlichten Objekte aus OnOffice, gemappt auf das
 * Estate-Modell. `null` bedeutet: nicht konfiguriert, API-/Netzwerkfehler oder
 * 0 sichtbare Objekte — der Aufrufer fällt dann auf `mockEstates` zurück.
 */
export async function fetchOnOfficeEstates(): Promise<Estate[] | null> {
  if (!isOnOfficeEnabled) return null;

  const tStart = Date.now(); // Timing in den Vercel-Logs sichtbar machen
  const records = await fetchEstateRecords();
  console.info(`[onoffice] estate read: ${records.length} Records in ${Date.now() - tStart}ms`);
  if (records.length === 0) return null;

  const mapped: Estate[] = [];
  for (const record of records) {
    const estate = mapEstateRecord(record);
    if (estate) mapped.push(estate);
  }
  if (mapped.length === 0) return null;

  // Defensive Dedup-Stufe: Im CRM existieren real doppelt angelegte Datensätze
  // (QA-Fund 09.07.2026: 5 Titel-Paare mit 2 OnOffice-Ids, identischer Preis/
  // Ort — z. B. objektnr 2068/1769). Bis RIEGEL die Dubletten archiviert,
  // gewinnt je Schlüssel (Titel+Preis+PLZ) der zuletzt geänderte Datensatz.
  const byKey = new Map<string, Estate>();
  for (const estate of mapped) {
    const key = `${estate.title.toLowerCase()}|${estate.price ?? ""}|${estate.postcode}`;
    const existing = byKey.get(key);
    if (!existing || estate.updatedAt > existing.updatedAt) byKey.set(key, estate);
  }
  const deduped = [...byKey.values()];

  // sortby ist server-seitig ggf. nicht unterstützt -> clientseitig zusätzlich
  // absichern (neueste Änderung zuerst).
  deduped.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  deduped.forEach((estate, i) => {
    estate.isFeatured = i < FEATURED_COUNT;
  });

  const imagesByEstate = await fetchEstateImages(deduped.map((e) => e.id));
  for (const estate of deduped) {
    estate.images = imagesByEstate.get(estate.id) ?? [];
  }

  return deduped;
}

/* ─────────────────────  Verkaufte Referenzobjekte  ───────────────────── */

/**
 * Von RIEGEL VERKAUFTE Objekte — unabhängig vom Veröffentlichungs-/CRM-Status,
 * also auch deaktivierte/archivierte Alt-Verkäufe (Filter: persistentes
 * Boolean-Feld verkauft=1, dasselbe wie im „Bisher verkauft"-Zähler des
 * Live-Tickers). Zweck: echte Verkaufs-Referenzen inkl. Fotos für den
 * PDF-Report („wir haben hier gerade verkauft" ist das stärkste Argument,
 * gerade in kleinen Orten wie Kleinkarlbach — Anfrage Inhaberseite).
 *
 * Fremdvermarktete/entzogene Datensätze (status2 fremd_verkauft_vermietet /
 * auftrag_entzogen) werden ausgeschlossen — das sind keine RIEGEL-Erfolge.
 * `null` = nicht konfiguriert oder API-Fehler (Aufrufer cached nur Erfolge).
 *
 * BEWUSST OHNE Bilder: bei bis zu 200 Alt-Verkäufen wäre der
 * estatepictures-Batch unverhältnismäßig teuer (~0,17 s/Objekt serverseitig).
 * Der Report braucht Fotos nur für die ≤3 AUSGEWÄHLTEN Referenzen —
 * dafür gibt es fetchEstateImageUrls() (lazy, s. report-objekte.ts).
 */
export async function fetchVerkaufteReferenzen(limit = LIST_LIMIT): Promise<Estate[] | null> {
  if (!isOnOfficeEnabled) return null;

  const t0 = Date.now();
  const data = await callOnOffice<OnOfficeEstateData>("estate", "read", {
    data: ESTATE_FIELDS,
    filter: { verkauft: [{ op: "=", val: 1 }] },
    listlimit: Math.min(limit, LIST_LIMIT),
    listoffset: 0,
    sortby: "geaendert_am",
    sortorder: "DESC",
    estatelanguage: "DEU",
  });
  if (!data) return null;
  const records = data.records ?? [];
  console.info(`[onoffice] verkauft read: ${records.length} Records in ${Date.now() - t0}ms`);
  if (records.length === 0) return null;

  const NICHT_RIEGEL = new Set(["fremd_verkauft_vermietet", "auftrag_entzogen"]);
  const mapped: Estate[] = [];
  for (const record of records) {
    const status2 = str(record.elements?.status2);
    if (NICHT_RIEGEL.has(status2)) continue;
    const estate = mapEstateRecord(record, "verkauft");
    if (estate) mapped.push(estate);
  }
  if (mapped.length === 0) return null;

  // Gleiche Dedup-Stufe wie fetchOnOfficeEstates (CRM-Dubletten, s. o.).
  const byKey = new Map<string, Estate>();
  for (const estate of mapped) {
    const key = `${estate.title.toLowerCase()}|${estate.price ?? ""}|${estate.postcode}`;
    const existing = byKey.get(key);
    if (!existing || estate.updatedAt > existing.updatedAt) byKey.set(key, estate);
  }
  const deduped = [...byKey.values()];
  deduped.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return deduped;
}

/**
 * Bild-URLs für einzelne Objekt-Ids nachladen (estatepictures) — exportierte
 * dünne Hülle um fetchEstateImages für die Lazy-Foto-Auflösung der
 * Report-Referenzen (funktioniert auch für deaktivierte/archivierte Objekte).
 */
export async function fetchEstateImageUrls(ids: string[]): Promise<Map<string, string[]>> {
  return fetchEstateImages(ids);
}

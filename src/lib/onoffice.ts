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

const FEATURE_FLAGS: [string, string][] = [
  ["balkon", "Balkon"],
  ["terrasse", "Terrasse"],
  ["wintergarten", "Wintergarten"],
  ["kamin", "Kamin"],
  ["fahrstuhl", "Aufzug"],
  ["unterkellert", "Keller"],
  ["multiParkingLot", "Stellplätze"],
];

/** ausstatt_beschr in kurze Chip-Segmente (≤40 Zeichen) + einen Rest-Absatz für Fließtext. */
function extractTextFeatures(text: string): { chips: string[]; extraParagraph?: string } {
  if (!text) return { chips: [] };
  const segments = text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chips: string[] = [];
  const longParts: string[] = [];
  for (const seg of segments) {
    if (seg.length <= 40) chips.push(seg);
    else longParts.push(seg);
  }
  return { chips, extraParagraph: longParts.length ? longParts.join(" ") : undefined };
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

function mapEstateRecord(record: OnOfficeEstateRecord): Estate | null {
  const el = record.elements ?? {};
  const id = str(record.id ?? el.Id);
  if (!id) return null;

  const status = mapStatus2(str(el.status2));
  if (status === null) return null; // archiviert/inaktiv/entzogen/fremdvermarktet -> nicht veröffentlichen

  const title = str(el.objekttitel) || "Ohne Titel";
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

  const rooms = num(el.anzahl_zimmer);
  const livingArea = num(el.wohnflaeche) || num(el.nutzflaeche) || null;
  const grundstuecksflaeche = num(el.grundstuecksflaeche);
  const plotArea = grundstuecksflaeche && grundstuecksflaeche > 0 ? grundstuecksflaeche : undefined;

  const city = str(el.ort);
  const postcode = str(el.plz);
  const district = str(el.regionaler_zusatz) || undefined;

  const lat = num(el.breitengrad);
  const lng = num(el.laengengrad);
  const geo: GeoPoint | null = lat !== null && lng !== null && lat !== 0 && lng !== 0 ? { lat, lng } : null;
  const showExactLocation = geo !== null;

  const flagFeatures = FEATURE_FLAGS.filter(([key]) => bool(el[key])).map(([, label]) => label);
  const { chips: textFeatures, extraParagraph } = extractTextFeatures(str(el.ausstatt_beschr));
  const features = [...flagFeatures, ...textFeatures];

  let description = str(el.objektbeschreibung) || undefined;
  if (extraParagraph) description = description ? `${description}\n\n${extraParagraph}` : extraParagraph;

  const updatedAt = parseOnOfficeDate(el.geaendert_am) ?? parseOnOfficeDate(el.erstellt_am) ?? new Date(0).toISOString();
  const erstelltIso = parseOnOfficeDate(el.erstellt_am);
  const isNew = erstelltIso !== null && Date.now() - new Date(erstelltIso).getTime() < NEW_THRESHOLD_MS;

  return {
    id,
    externalId: str(el.objektnr_extern) || undefined,
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
function pictureFields(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== "object") return {};
  const obj = item as Record<string, unknown>;
  const nested = obj.elements && typeof obj.elements === "object" ? (obj.elements as Record<string, unknown>) : {};
  return { ...obj, ...nested };
}

async function fetchEstateImages(ids: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (ids.length === 0) return result;

  const data = await callOnOffice<{ records?: unknown[] } | unknown[]>("estatepictures", "get", {
    estateids: ids,
    categories: ["Titelbild", "Foto"],
    size: "1600x1200",
    language: "DEU",
  });
  // z. B. errorcode 170 "No read permission for this user" -> alle Estates
  // bekommen unten images:[] (kein Abbruch der gesamten Estate-Ladung).
  if (!data) return result;

  const rawRecords = Array.isArray(data) ? data : data.records ?? [];
  const byEstate = new Map<string, OnOfficePicture[]>();

  for (const raw of rawRecords) {
    const f = pictureFields(raw);
    const estateId = str(f.estateid ?? f.id);
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

  for (const [estateId, pics] of byEstate) {
    pics.sort((a, b) => {
      if (a.isTitle !== b.isTitle) return a.isTitle ? -1 : 1; // Titelbild immer zuerst
      return a.position - b.position;
    });
    result.set(estateId, pics.map((p) => p.url));
  }

  return result;
}

/* ─────────────────────────  Public API  ───────────────────────── */

/**
 * Liefert alle aktiven/veröffentlichten Objekte aus OnOffice, gemappt auf das
 * Estate-Modell. `null` bedeutet: nicht konfiguriert, API-/Netzwerkfehler oder
 * 0 sichtbare Objekte — der Aufrufer fällt dann auf `mockEstates` zurück.
 */
export async function fetchOnOfficeEstates(): Promise<Estate[] | null> {
  if (!isOnOfficeEnabled) return null;

  const records = await fetchEstateRecords();
  if (records.length === 0) return null;

  const mapped: Estate[] = [];
  for (const record of records) {
    const estate = mapEstateRecord(record);
    if (estate) mapped.push(estate);
  }
  if (mapped.length === 0) return null;

  // sortby ist server-seitig ggf. nicht unterstützt -> clientseitig zusätzlich
  // absichern (neueste Änderung zuerst).
  mapped.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  mapped.forEach((estate, i) => {
    estate.isFeatured = i < FEATURED_COUNT;
  });

  const imagesByEstate = await fetchEstateImages(mapped.map((e) => e.id));
  for (const estate of mapped) {
    estate.images = imagesByEstate.get(estate.id) ?? [];
  }

  return mapped;
}

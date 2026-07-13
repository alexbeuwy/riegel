/**
 * Gecachte Objekt-Datenquelle — server-only.
 *
 * Einheitlicher Einstiegspunkt für Komponenten/Seiten: liefert entweder Live-Daten
 * aus OnOffice oder die Mock-Fixtures als Fallback, ohne dass Aufrufer den
 * Unterschied kennen müssen (source-Feld ist nur für Debug-/Hinweisbanner gedacht).
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { fetchOnOfficeEstates, fetchLiveTickerCounts } from "@/lib/onoffice";
import { mockEstates, ESTATE_ORTE, type Estate } from "@/lib/mock-estates";

export type EstateSource = "onoffice" | "mock";

export interface EstateData {
  estates: Estate[];
  source: EstateSource;
}

// Der HMAC-Timestamp im Request-Body ändert sich jede Sekunde — ein fetch-naher
// Cache-Key wäre also nie stabil. Deshalb cachen wir nicht den Request, sondern das
// Ergebnis dieser Funktion über unstable_cache.
//
// WICHTIG: Es wird NUR der Erfolgsfall gecacht. Vorher landete auch der
// Mock-Fallback im Cache — ein einziger fehlgeschlagener OnOffice-Pull
// (Timeout/Hiccup beim Cold Start) wurde dann via stale-while-revalidate
// dauerhaft als „Mock" ausgeliefert, obwohl die API längst wieder gesund war
// (live auf Vercel passiert: /immobilien zeigte Mock, /api/estate-orte echte
// Orte). Ein Throw verhindert das Persistieren des Fehlerfalls; der
// Mock-Fallback passiert pro Request außerhalb des Caches und heilt sich
// beim nächsten erfolgreichen Abruf von selbst. Neuer Cache-Key
// („estates-live" statt „estates-source"), damit ein bereits vergifteter
// Alt-Eintrag sicher ignoriert wird.
const getCachedLiveEstates = unstable_cache(
  async (): Promise<Estate[]> => {
    const live = await fetchOnOfficeEstates();
    if (!live) throw new Error("onoffice_unavailable");
    return live;
  },
  ["estates-live"],
  { revalidate: 300, tags: ["estates"] },
);

// React cache() als Request-Dedup obendrauf: unstable_cache koalesziert
// PARALLELE In-Flight-Aufrufe nicht — bei leerem Cache lösten Liste +
// Orte-Dropdown im selben Request ZWEI volle OnOffice-Pulls aus (gemessen).
export const getEstateData = cache(async (): Promise<EstateData> => {
  try {
    return { estates: await getCachedLiveEstates(), source: "onoffice" };
  } catch {
    // Liegt bereits ein (ggf. abgelaufener) Live-Eintrag im Cache, liefert
    // unstable_cache den weiterhin aus — hier landen wir nur, wenn es noch
    // NIE einen erfolgreichen Abruf gab und der aktuelle auch scheitert.
    return { estates: mockEstates, source: "mock" };
  }
});

export async function getEstateBySlug(
  slug: string,
): Promise<{ estate: Estate; source: EstateSource } | null> {
  const { estates, source } = await getEstateData();

  // Primär: numerische Id am Slug-Ende — übersteht Titeländerungen in OnOffice,
  // die sonst zu 404 bei bestehenden Links führen würden. Bewusst NUR gegen e.id
  // (der Slug wird ausschließlich daraus gebaut) — externalId/objektnr_extern ist
  // eine unabhängige Nummerierung und könnte auf ein falsches Objekt matchen.
  const idMatch = slug.match(/-([0-9]+)$/);
  if (idMatch) {
    const byId = estates.find((e) => e.id === idMatch[1]);
    if (byId) return { estate: byId, source };
  }

  // Sekundär: exakter Slug-Vergleich (deckt Mock-Slugs wie "e1-penthouse-…" ab).
  const bySlug = estates.find((e) => e.slug === slug);
  return bySlug ? { estate: bySlug, source } : null;
}

export async function getFeaturedEstates(n: number): Promise<Estate[]> {
  const { estates } = await getEstateData();
  const byUpdatedDesc = (a: Estate, b: Estate) => b.updatedAt.localeCompare(a.updatedAt);

  // Nur aktive Objekte: Reservierte/Verkaufte/Vermietete würden auf der
  // Startseite ohne Status-Badge (PropertyCard hat keins) als frisches
  // Angebot wirken — im Portal selbst zeigt PortalCard den Status weiterhin.
  const aktiv = estates.filter((e) => e.status === "aktiv");
  const featured = aktiv.filter((e) => e.isFeatured).sort(byUpdatedDesc);
  const rest = aktiv.filter((e) => !e.isFeatured).sort(byUpdatedDesc);

  return [...featured, ...rest].slice(0, n);
}

export async function getEstateOrte(): Promise<string[]> {
  const { estates, source } = await getEstateData();
  if (source === "mock") return ESTATE_ORTE;

  const orte = new Set(estates.map((e) => e.city).filter(Boolean));
  return [...orte].sort((a, b) => a.localeCompare(b, "de"));
}

/* ─────────────────────────  Live-Ticker (Startseite)  ───────────────────────── */

export interface LiveTickerStats {
  /** Aktive, öffentliche Objekte — bewusst dieselbe Quelle wie das Portal
   *  (getEstateData().estates, dedupliziert, Status "aktiv"), damit der
   *  Ticker exakt zu dem passt, was ein Besucher im Portal anklicken kann. */
  aktuellImAngebot: number;
  inVorbereitung: number;
  bisherVerkauft: number;
}

// Gleiches Muster wie getCachedLiveEstates oben: NUR der Erfolgsfall wird
// gecacht (throw statt Platzhalter-Objekt), damit ein einzelner fehlgeschlagener
// Pull nicht dauerhaft als "kein Ticker" einfriert, sobald OnOffice wieder
// gesund ist. Eigener Cache-Key/Tag ("live-ticker" statt "estates"), damit
// beide Caches unabhängig revalidieren.
const getCachedLiveTickerStats = unstable_cache(
  async (): Promise<LiveTickerStats> => {
    // Ehrlichkeitspflicht: der Ticker zeigt NUR echte Live-Zahlen. Läuft die
    // Seite gerade auf dem Mock-Fallback (source !== "onoffice"), gibt es
    // keinen Ticker statt einer mit Beispiel-Objekten "live" wirkenden Zahl.
    const { estates, source } = await getEstateData();
    if (source !== "onoffice") throw new Error("live_ticker_no_live_estates");

    const aktuellImAngebot = estates.filter((e) => e.status === "aktiv").length;

    const counts = await fetchLiveTickerCounts();
    if (!counts) throw new Error("live_ticker_counts_unavailable");

    return { aktuellImAngebot, ...counts };
  },
  ["live-ticker-stats"],
  { revalidate: 600, tags: ["live-ticker"] },
);

/**
 * Live-Zahlen für den Start-Ticker ("Zahlen, die man nachprüfen kann").
 * `null` bei jeglichem Fehler oder Mock-Fallback — die Komponente rendert
 * dann einfach ohne Ticker weiter (siehe Kommentar oben: lieber kein Ticker
 * als erfundene/veraltete Zahlen).
 */
export const getLiveTickerStats = cache(async (): Promise<LiveTickerStats | null> => {
  try {
    return await getCachedLiveTickerStats();
  } catch {
    return null;
  }
});

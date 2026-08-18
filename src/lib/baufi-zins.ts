/**
 * Aktueller Baufinanzierungs-Zins für die Beispielrechnung in Matching-Mails
 * (Wunsch Alex 18.08.2026: „realistische Hochrechnung, was die monatliche
 * Rate sein könnte, beim aktuellen Zins — Quelle finden").
 *
 * Quelle: amtliche Zinsstatistik (Effektivzins Wohnungsbaukredite an private
 * Haushalte, Neugeschäft) — die konkrete Abruf-URL steht in ZINS_QUELLEN und
 * wird zur Laufzeit der Reihe nach probiert. Fail-soft: erreicht keine Quelle
 * einen plausiblen Wert, greift ein konservativer Richtwert — die Mail sagt
 * dann ehrlich „Richtwert" statt eines amtlichen Stands.
 *
 * Aufrufer ist der tägliche Matching-Cron (1 Abruf/Tag) — kein Cache nötig.
 */

export interface BaufiZins {
  /** Effektivzins in Prozent, z. B. 3.74 */
  prozent: number;
  /** Berichtsperiode der Quelle (z. B. "2026-06") oder "Richtwert". */
  periode: string;
  /** Kurzname für die Quellenangabe in der Mail. */
  quelle: string;
}

/** Konservativer Richtwert, falls keine Quelle erreichbar ist (Stand 08/2026). */
const FALLBACK: BaufiZins = { prozent: 3.8, periode: "Richtwert", quelle: "Richtwert" };

/** Plausibilitätsfenster — außerhalb davon ist die Quelle kaputt, nicht der Markt. */
const MIN_PLAUSIBEL = 1;
const MAX_PLAUSIBEL = 8;

interface ZinsQuelle {
  name: string;
  url: string;
  /** Extrahiert (periode, wert) aus dem Antwort-Text — null bei Parse-Fehler. */
  parse: (body: string) => { periode: string; prozent: number } | null;
}

/**
 * ECB Data Portal, MFI-Zinsstatistik Deutschland: Kredite an private Haushalte
 * für Hauskauf, anfängliche Zinsbindung über 10 Jahre, Neugeschäft,
 * effektiver Jahreszinssatz (AAR). Offene API ohne Key; CSV-Format.
 */
const ZINS_QUELLEN: ZinsQuelle[] = [
  {
    name: "EZB/Bundesbank MFI-Zinsstatistik",
    url: "https://data-api.ecb.europa.eu/service/data/MIR/M.DE.B.A2C.P.R.A.2250.EUR.N?lastNObservations=1&format=csvdata",
    parse: (body) => {
      // csvdata: Kopfzeile + eine Datenzeile; Spalten TIME_PERIOD und OBS_VALUE.
      const zeilen = body.trim().split("\n");
      if (zeilen.length < 2) return null;
      const kopf = zeilen[0].split(",");
      const daten = zeilen[zeilen.length - 1].split(",");
      const iZeit = kopf.indexOf("TIME_PERIOD");
      const iWert = kopf.indexOf("OBS_VALUE");
      if (iZeit < 0 || iWert < 0) return null;
      const prozent = parseFloat(daten[iWert]);
      const periode = daten[iZeit];
      return Number.isFinite(prozent) && periode ? { periode, prozent } : null;
    },
  },
];

export async function holeBaufiZins(): Promise<BaufiZins> {
  for (const q of ZINS_QUELLEN) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(q.url, { signal: ctrl.signal, headers: { Accept: "text/csv" } });
      clearTimeout(timer);
      if (!res.ok) continue;
      const parsed = q.parse(await res.text());
      if (parsed && parsed.prozent >= MIN_PLAUSIBEL && parsed.prozent <= MAX_PLAUSIBEL) {
        return { prozent: parsed.prozent, periode: parsed.periode, quelle: q.name };
      }
    } catch {
      /* nächste Quelle bzw. Fallback */
    }
  }
  return FALLBACK;
}

/**
 * Klassische Annuitäten-Beispielrechnung: monatliche Rate bei gegebenem
 * Sollzins und anfänglicher Tilgung, 100 % des Kaufpreises finanziert.
 * Bewusst OHNE Kaufnebenkosten und Eigenkapital — das ist eine Einordnung
 * („grob X €/Monat"), kein Finanzierungsangebot; die Mail sagt das dazu.
 */
export const BEISPIEL_TILGUNG_PROZENT = 2;

export function monatsRate(kaufpreis: number, zinsProzent: number): number {
  return Math.round((kaufpreis * (zinsProzent + BEISPIEL_TILGUNG_PROZENT)) / 100 / 12);
}

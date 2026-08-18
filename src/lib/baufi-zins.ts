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
 * Beide Quellen liefern dieselbe Serie (Bundesbank erhebt, meldet an EZB):
 * Effektivzins besicherter Wohnungsbaukredite an private Haushalte,
 * anfängliche Zinsbindung ÜBER 10 Jahre, Neugeschäft — Bundesbank-Zeitreihe
 * SUD161, die klassische Baufi-Kennzahl. Live verifiziert 18.08.2026: beide
 * Quellen identisch 3,82 % für 2026-06 (vorläufig). Primär die Bundesbank
 * (Primärquelle), EZB Data Portal als unabhängiger technischer Fallback.
 * Beide offen, ohne Key; Quellenangabe genügt.
 */
const ZINS_QUELLEN: ZinsQuelle[] = [
  {
    name: "Deutsche Bundesbank, MFI-Zinsstatistik (SUD161)",
    url: "https://api.statistiken.bundesbank.de/rest/data/BBIM1/M.DE.B.A2CC.P.R.A.2250.EUR.N?format=csv",
    parse: (body) => {
      // CSV mit ';'-Trennung und DEZIMAL-KOMMA; nach den Metadaten-Zeilen
      // folgen Datenzeilen "YYYY-MM;3,82;[Flag]" — letzte nicht-leere zählt.
      const zeilen = body.trim().split("\n");
      for (let i = zeilen.length - 1; i >= 0; i--) {
        const teile = zeilen[i].split(";");
        if (teile.length >= 2 && /^\d{4}-\d{2}$/.test(teile[0].trim())) {
          const prozent = parseFloat(teile[1].trim().replace(",", "."));
          if (Number.isFinite(prozent)) return { periode: teile[0].trim(), prozent };
          // Aktuellster Monat kann noch leer sein — dann die Zeile davor.
        }
      }
      return null;
    },
  },
  {
    name: "EZB Data Portal, MFI-Zinsstatistik",
    url: "https://data-api.ecb.europa.eu/service/data/MIR/M.DE.B.A2CC.P.R.A.2250.EUR.N?lastNObservations=1&format=csvdata",
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

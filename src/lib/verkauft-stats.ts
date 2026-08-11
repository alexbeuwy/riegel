/**
 * Echte Abschluss-Statistik je Ort — server-only.
 *
 * Motivation (Fall Manfred, 11.08.2026, „Landauer Warte"): Der Rechner nannte
 * für eine 1972er-Wohnung in Speyer 4.501 €/m², während die ECHTEN
 * RIEGEL-Abschlüsse im selben Report bei ~3.000–3.700 €/m² lagen. Das Modell
 * kannte die eigenen Verkäufe schlicht nicht. Dieses Modul macht den
 * OnOffice-Verkauft-Pool (getVerkaufteArchiv, echte Kaufpreise) als
 * Kalibrier-Anker verfügbar: n / Median / p25 / p75 in €/m² Wohnfläche je Ort
 * und Kategorie. Die Engine nutzt p75 als Plausibilitäts-Deckel
 * (opts.ortsStats in estimateValue) und n als ehrliche Vergleichsobjekt-Zahl.
 *
 * DATENSCHUTZ: Es verlassen ausschließlich AGGREGATE dieses Modul — keine
 * Einzelpreise, keine Adressen, keine Objekt-Ids. Die Schwelle n >= 5 folgt
 * der bestehenden Konvention (marktdaten.ts / referenzen.ts: unter fünf
 * Abschlüssen keine eigene Marktaussage).
 *
 * White-Label: bewusst makler-neutral — jeder OnOffice-Mandant kalibriert
 * sich damit automatisch an seiner EIGENEN Verkaufshistorie, ohne dass
 * REGION-Basiswerte von Hand nachgezogen werden müssen.
 */
import { cache } from "react";
import { getVerkaufteArchiv } from "@/lib/verkauft";
import type { Objektart } from "@/lib/valuation";

/** Aggregat echter Abschlüsse eines Orts (€/m² Wohnfläche). */
export interface OrtsAbschlussStats {
  n: number;
  medianQm: number;
  p25Qm: number;
  p75Qm: number;
}

/** Mindestfallzahl für eine belastbare Orts-Aussage (Konvention, s. o.). */
const MIN_N = 5;

/**
 * Ausreißer-Schutz, identisch zu scripts/preisanalyse-onoffice.mts: unter
 * 500 bzw. über 15.000 €/m² sind Datenfehler (z. B. Grundstückspreis auf
 * Wohnfläche bezogen), keine Marktpreise.
 */
const QM_MIN = 500;
const QM_MAX = 15_000;

const norm = (s: string) => s.replace(/^\d{5}\s*/, "").replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase();

/**
 * Ort↔City-Vergleich nach dem Muster von ortMatchesCity in referenzen.ts
 * (dort nicht exportiert): exakter Treffer oder Präfix mit Trenner, damit
 * „Speyer" auch „Speyer-West" fängt, aber nicht „Speyerdorf".
 */
function ortTrifft(ort: string, city: string): boolean {
  const o = norm(ort);
  const c = norm(city);
  if (!o || !c) return false;
  return o === c || c.startsWith(`${o} `) || c.startsWith(`${o}-`) || o.startsWith(`${c} `) || o.startsWith(`${c}-`);
}

/**
 * Aggregat der echten Abschlüsse eines Orts für eine Kategorie.
 *
 * Nur "wohnung" und "haus" — für Gewerbe/Grundstück/MFH ist ein €/m²-
 * Wohnflächen-Vergleich fachlich nicht tragfähig (Ertragswert bzw.
 * Bodenwert). null bei zu dünner Datenlage (n < MIN_N), bei Mock-Betrieb
 * oder OnOffice-Fehler (getVerkaufteArchiv ist bereits fail-soft).
 */
export const ortsAbschlussStats = cache(
  async (ort: string, kategorie: Objektart): Promise<OrtsAbschlussStats | null> => {
    if (kategorie !== "wohnung" && kategorie !== "haus") return null;
    if (!ort.trim()) return null;
    try {
      const archiv = await getVerkaufteArchiv();
      const qms = archiv
        .filter((e) => e.category === kategorie && ortTrifft(ort, e.city))
        .map((e) =>
          typeof e.price === "number" && typeof e.livingArea === "number" && e.livingArea >= 20 && e.price >= 20_000
            ? e.price / e.livingArea
            : null,
        )
        .filter((qm): qm is number => qm !== null && qm >= QM_MIN && qm <= QM_MAX)
        .sort((a, b) => a - b);
      if (qms.length < MIN_N) return null;
      const p = (q: number) => qms[Math.min(qms.length - 1, Math.floor(qms.length * q))];
      return {
        n: qms.length,
        medianQm: Math.round(p(0.5)),
        p25Qm: Math.round(p(0.25)),
        p75Qm: Math.round(p(0.75)),
      };
    } catch {
      return null;
    }
  },
);

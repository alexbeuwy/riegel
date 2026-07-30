/**
 * Verkauft-Archiv — server-only.
 *
 * Baut auf getVerkaufteReferenzen() und getEstateData() aus src/lib/estates.ts
 * auf (beide unverändert). Zweck: HTTP 410 für Objekt-Slugs, die RIEGEL
 * verkauft hat und die NICHT mehr im aktiven Vermarktungs-Pool stehen — dafür
 * braucht src/proxy.ts eine reine Id-Liste (getVerkaufteIds) und die
 * Statusseite unter /immobilien/verkauft eine stark reduzierte Objektsicht
 * (getVerkauftesObjektById).
 *
 * Gemessen am 30.07.2026 (Diagnoselauf gegen fetchVerkaufteReferenzen/
 * fetchOnOfficeEstates): 744 Objekte im Verkauft-Pool, davon 743 NICHT mehr im
 * aktiven Pool und genau 1 Id in beiden. Das eine doppelt geführte Objekt wird
 * hier herausgefiltert — das aktive Objekt gewinnt immer, sonst würde eine
 * laufende Vermarktung fälschlich mit 410 abgeschaltet.
 *
 * Die 195 aus der ersten Messung waren nur die Objekte, die in EINE
 * OnOffice-Listenseite passten; seit fetchVerkaufteReferenzen paginiert, deckt
 * das Archiv auch die Alt-Verkäufe bis 2020 ab. Für den Proxy heißt das: alte
 * Objekt-Slugs, die vorher 404 lieferten, antworten jetzt korrekt mit 410.
 */
import { cache } from "react";
import { getEstateData, getVerkaufteReferenzen } from "@/lib/estates";
import type { Estate, ObjectCategory } from "@/lib/mock-estates";

/** Reduzierte Sicht auf ein verkauftes Objekt für die öffentliche Statusseite. */
export interface VerkauftesObjekt {
  id: string;
  kategorie: ObjectCategory;
  /** Aufbereiteter OnOffice-Objekttyp (z. B. "Doppelhaushälfte") — fehlt, wenn im CRM nicht gepflegt. */
  objektart?: string;
  /** Wohnfläche, ersatzweise Grundstücksfläche (z. B. bei unbebauten Grundstücken). */
  flaeche: number | null;
  ort: string;
}

/**
 * Verkauft-Pool MINUS aller Ids, die aktuell im aktiven Pool stehen.
 *
 * cache() dedupliziert parallele Aufrufe innerhalb desselben Requests (analog
 * zu getEstateData/getVerkaufteReferenzen in estates.ts) — sowohl die
 * Statusseite als auch die API-Route für den Proxy können in einem Deploy-
 * Zyklus mehrfach danach fragen, ohne zusätzliche OnOffice-Last zu erzeugen.
 */
export const getVerkaufteArchiv = cache(async (): Promise<Estate[]> => {
  try {
    const [verkauft, { estates: aktive }] = await Promise.all([
      getVerkaufteReferenzen(),
      getEstateData(),
    ]);
    if (verkauft.length === 0) return [];

    const aktiveIds = new Set(aktive.map((e) => e.id));
    return verkauft.filter((e) => !aktiveIds.has(e.id));
  } catch {
    // Fail-soft: lieber ein leeres Archiv (kein 410 irgendwo) als ein
    // geworfener Fehler, der die aufrufende Route/Seite mitreißt.
    return [];
  }
});

/** Nur die Ids aus getVerkaufteArchiv() — Grundlage für den Proxy-Abgleich. */
export async function getVerkaufteIds(): Promise<string[]> {
  try {
    return (await getVerkaufteArchiv()).map((e) => e.id);
  } catch {
    return [];
  }
}

/**
 * Reduzierte Sicht auf ein einzelnes verkauftes Objekt, für die Statusseite
 * unter /immobilien/verkauft. `null`, wenn die Id nicht im Archiv steht.
 *
 * Bewusst OHNE Titel (OnOffice-Titel können Straßennamen enthalten), ohne
 * Preis, ohne PLZ, ohne Koordinaten, ohne Bilder: Die Einwilligung der
 * Verkäufer deckt die Vermarktung des Objekts ab, nicht dessen dauerhafte
 * Veröffentlichung nach dem Verkauf.
 */
export async function getVerkauftesObjektById(id: string): Promise<VerkauftesObjekt | null> {
  try {
    const archiv = await getVerkaufteArchiv();
    const found = archiv.find((e) => e.id === id);
    if (!found) return null;

    return {
      id: found.id,
      kategorie: found.category,
      objektart: found.objectType,
      flaeche: found.livingArea ?? found.plotArea ?? null,
      ort: found.city,
    };
  } catch {
    return null;
  }
}

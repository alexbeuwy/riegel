/**
 * Beispielobjekte für die Experten-Seiten /verkaufen/[typ] — server-only.
 * NUR in Server-Komponenten importieren (zieht getEstateData/OnOffice mit).
 *
 * Trust-Baustein: echte Objekte aus der laufenden Vermarktung als Beleg
 * „wir machen das wirklich". Fail-soft in beide Richtungen — beim
 * Mock-Fallback oder bei jedem Fehler kommt ein leeres Array zurück
 * (die Seite rendert dann einfach ohne Referenz-Sektion), es wird NIE
 * geworfen und NIE ein Fantasie-Objekt gezeigt.
 *
 * Empirischer Befund im Live-Feed (2026-07-20, 107 Objekte, alle mit Fotos):
 * - category: haus 47 / wohnung 36 / gewerbe 17 / grundstueck 7.
 *   Eine category "mehrfamilienhaus" existiert NICHT — OnOffice-objektart
 *   "zinshaus_renditeobjekt" wird in onoffice.ts auf "haus" gemappt. Das
 *   Mehrfamilienhaus-Signal steckt im objectType: 6× "Mehrfamilienhaus"
 *   (alle category "haus").
 * - Wohn- und Geschäftshäuser: 5× objectType "Wohn Und Geschäftshaus" —
 *   ebenfalls alle category "haus", NICHT "gewerbe". Titel tragen das Signal
 *   zusätzlich ("Wohn- und Geschäftshaus", "Wohn & Geschäftshaus").
 * - status: ausschließlich "aktiv". Verkaufte/vermietete Objekte werden bei
 *   RIEGEL depubliziert (veroeffentlichen=0) und erscheinen nicht im Feed —
 *   die Realisiert-zuerst-Sortierung unten greift daher erst, falls künftig
 *   verkaufte Objekte veröffentlicht bleiben. Konsequenz für die Drüber-
 *   Schicht (referenz-objekte.tsx): verkaufte Objekte NICHT verlinken, ihre
 *   Detailseite fällt mit der Depublikation auf 404.
 */
import type { Estate } from "@/lib/mock-estates";
import { getEstateData } from "@/lib/estates";

/** Maximal so viele realisierte Objekte vorn einsortieren (Rest bleibt aktiv). */
const MAX_REALISIERT = 2;

/** Titel+objectType als gemeinsamer Such-Heuhaufen. */
function hay(e: Estate): string {
  return `${e.title} ${e.objectType ?? ""}`;
}

// "Mehrfamilienhaus"/"Zinshaus"/"4 Familienhaus"/"3-Familienhaus" — bewusst mit
// Ziffer vor "Familienhaus", damit "Einfamilienhaus" NICHT matcht (Live-Titel
// wie "4 Familienhaus mit ca. 342 m² Wohnfläche" dagegen schon).
const MFH_RE = /mehrfamilienhaus|zinshaus|wohnanlage|\b\d+\s*[- ]?\s*familienhaus/i;

// Deckt Titel ("Wohn- und Geschäftshaus", "Wohn & Geschäftshaus", "Wohn und
// Geschäftshaus") UND den normalisierten objectType "Wohn Und Geschäftshaus" ab.
const WUG_RE = /wohn[- ]?\s*(?:und|&|u\.)\s*gesch(?:ä|ae)ftsh(?:au|äu)s/i;

// Rendite-Signal im Titel — im Live-Bestand sehr verbreitet ("Kapitalanlage
// oder Eigennutz", "Solide kalkulierbare Kapitalanlage", …).
const ANLAGE_RE = /kapitalanlage|rendite|kapitalanleger|anlageobjekt/i;

// Klassische "solide" Wohnobjekte für die Nachlass-Auswahl.
const KLASSIK_RE = /einfamilienhaus|doppelhaush|reihen(?:mittel|end|haus)|bungalow|villa|zweifamilienhaus/i;

// Einzelne (Tiefgaragen-)Stellplätze sind kein Aushängeschild für eine
// Experten-Seite — Ausschluss NUR über den objectType, damit legitime Objekte
// mit "Stellplätzen" im Titel nicht mitgerissen werden (Live-Fund).
function istStellplatz(e: Estate): boolean {
  return /tiefgarage|stellplatz|^garage$/i.test(e.objectType ?? "");
}

function istMfh(e: Estate): boolean {
  if (e.category !== "haus") return false;
  return (e.objectType ?? "").toLowerCase().includes("mehrfamilienhaus") || MFH_RE.test(hay(e));
}

function istWug(e: Estate): boolean {
  return (e.category === "haus" || e.category === "gewerbe") && WUG_RE.test(hay(e));
}

/**
 * Relevanz je Seiten-Typ: 0 = kommt nicht infrage, >0 = Relevanz-Rang.
 * Die Schwellen sind bewusst grob (3/2/1) — feiner differenziert danach
 * das Sortierkriterium "Fotos vorhanden" + Aktualität.
 */
const SCORER: Record<string, (e: Estate) => number> = {
  mehrfamilienhaus: (e) => (istMfh(e) ? 3 : 0),

  gewerbeimmobilie: (e) => {
    if (e.category !== "gewerbe" || istStellplatz(e)) return 0;
    let score = 1;
    if (e.marketingType === "kauf") score += 2; // Verkaufsmandate zuerst — die Seite richtet sich an Verkäufer
    if (ANLAGE_RE.test(hay(e))) score += 1;
    return score;
  },

  "wohn-und-geschaeftshaus": (e) => (istWug(e) ? 3 : 0),

  anlageimmobilie: (e) => {
    // Anlage = Kauf; Mietflächen sind hier kein Beispiel-Mandat.
    if (e.marketingType !== "kauf") return 0;
    let score = 0;
    if (istMfh(e) || istWug(e)) score = 3;
    else if (e.category === "gewerbe" && !istStellplatz(e)) score = 2;
    if (ANLAGE_RE.test(hay(e))) score += 1; // explizites Rendite-Signal im Titel
    return score;
  },

  nachlassimmobilie: (e) => {
    // Kein Kategorie-Signal im CRM — kleine Auswahl solider Haus/Wohnung-
    // Verkaufsmandate als "aktuelle Mandate" (klassische EFH/DHH zuerst).
    if (e.marketingType !== "kauf") return 0;
    if (e.category !== "haus" && e.category !== "wohnung") return 0;
    if (e.category === "haus") return KLASSIK_RE.test(hay(e)) ? 3 : 1;
    return 2; // Eigentumswohnung
  },
};

/**
 * Pure Auswahl-Logik — separat exportiert, damit sie ohne Next-Cache-Runtime
 * (z. B. tsx-Funktionstest gegen echte fetchOnOfficeEstates-Daten) prüfbar ist.
 *
 * Sortierung: realisierte Objekte (verkauft/vermietet) zuerst (max. 2 —
 * stärkster Trust-Beweis), danach aktive; innerhalb der Gruppen nach
 * Relevanz, dann "hat Fotos", dann Aktualität. Reservierte werden
 * übersprungen: die Karten-Badge-Logik kennt bewusst nur "Erfolgreich
 * vermittelt" und "Aktuell im Angebot" — ein reserviertes Objekt wäre in
 * beiden Schubladen falsch einsortiert.
 */
export function selectExpertenObjekte(estates: Estate[], typ: string, limit = 3): Estate[] {
  const scorer = SCORER[typ];
  if (!scorer || limit <= 0) return [];

  const ranked = estates
    .filter((e) => e.status !== "reserviert")
    .map((e) => ({ e, score: scorer(e) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.e.images.length > 0) - Number(a.e.images.length > 0) ||
        b.e.updatedAt.localeCompare(a.e.updatedAt),
    );

  const realisiert = ranked
    .filter((x) => x.e.status === "verkauft" || x.e.status === "vermietet")
    .slice(0, MAX_REALISIERT);
  const aktiv = ranked.filter((x) => x.e.status === "aktiv");

  return [...realisiert, ...aktiv].slice(0, limit).map((x) => x.e);
}

/**
 * Beispielobjekte für eine Experten-Seite. `typ` ist der /verkaufen/[typ]-Slug
 * (mehrfamilienhaus | gewerbeimmobilie | wohn-und-geschaeftshaus |
 * anlageimmobilie | nachlassimmobilie) — unbekannte Slugs liefern [].
 *
 * Ehrlichkeitspflicht wie beim Live-Ticker: läuft die Seite gerade auf dem
 * Mock-Fallback, gibt es KEINE Referenzobjekte statt „echt" wirkender
 * Fantasie-Inserate.
 */
export async function getExpertenObjekte(typ: string, limit = 3): Promise<Estate[]> {
  try {
    const { estates, source } = await getEstateData();
    if (source !== "onoffice") return [];
    return selectExpertenObjekte(estates, typ, limit);
  } catch {
    return [];
  }
}

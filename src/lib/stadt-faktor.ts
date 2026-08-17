/**
 * Stadt-/Orts-Faktoren — GEMEINSAME Quelle für Preisatlas (marktdaten.ts)
 * und Bewertungs-Engine (valuation.ts).
 *
 * Bis 12.08.2026 kannte nur der Preisatlas diese Dorf-/Kleinstadt-Dämpfung;
 * die Engine rechnete jeden Ort ohne eigenen REGIONS-Eintrag mit dem vollen
 * Regions-Default. Der Backtest gegen 489 echte Abschlüsse zeigte genau dort
 * die größten Ausreißer (Altbauten in Dörfern bis +100 % überbewertet) —
 * seither nutzt auch die Engine diese Tabelle (stadtFaktorFuerOrt).
 *
 * Faktor-Logik: Basis × Faktor. Kleinere/ländliche Umlandgemeinden 0.85–0.98,
 * Landau/Bad Dürkheim als gehobene Kreis-/Kurstädte ~1.0–1.08,
 * Rhein-Neckar-nahe Lagen (Worms) am oberen Rand der „kleiner Ort"-Gruppe.
 * Orte, die NICHT in der Tabelle stehen, bleiben beim Faktor 1 — lieber
 * neutral als einen erfundenen Abschlag (der amtliche Bodenrichtwert wirkt
 * dort als Mikrolagen-Korrektiv, s. lageFaktor in valuation.ts).
 *
 * Schlüssel sind die Standort-Slugs (geo-articles) — `stadtFaktorFuerOrt`
 * normalisiert freie Ortsnamen („Bad Dürkheim", „Hochstadt (Pfalz)") auf
 * dieses Schema.
 */
export const STADT_FAKTOR: Record<string, number> = {
  otterstadt: 0.87, // kleine Rheinauen-Gemeinde, sehr ländlich
  waldsee: 0.88, // kleine Gemeinde, ländliche Lage
  roemerberg: 0.9, // Umlandgemeinde Speyer, eher ländlich geprägt
  dudenhofen: 0.9, // Umlandgemeinde Speyer, eher ländlich geprägt
  "boehl-iggelheim": 0.92, // Wohngemeinde nahe Speyer/Schifferstadt, gute Anbindung
  germersheim: 0.93, // Kreisstadt, aber ländlicher geprägt, Grenzlage zu Baden
  hassloch: 0.94, // größere Gemeinde, gute Anbindung, ohne Stadtstatus-Aufschlag
  limburgerhof: 0.97, // beliebte Pendlergemeinde nahe Ludwigshafen
  mutterstadt: 0.98, // gefragte Wohngemeinde, gute Infrastruktur
  worms: 1.03, // Domstadt, Rhein-Neckar-Nähe, gute Anbindung
  landau: 1.05, // Kreisstadt an der Weinstraße, Universität, gehobene Nachfrage
  "bad-duerkheim": 1.08, // Kur- und Weinstadt, touristisch, gehobenes Segment

  // Neue Standorte (Expansion außerhalb der bisherigen Vorderpfalz-Kernorte):
  elmstein: 0.69, // sehr kleine Gemeinde tief im Pfälzerwald, stark ländlich, kaum Baulandreserven
  neuhemsbach: 0.75, // kleine Landgemeinde im Nordpfälzer Bergland, wenig Nachfragedruck
  gundersheim: 0.78, // kleines Rheinhessen-Weindorf, ländlich geprägt
  otterbach: 0.78, // kleine Stadt bei Kaiserslautern, solide, aber ohne Preisdruck
  lingenfeld: 0.89, // Südpfalz-Gemeinde bei Speyer/Germersheim, ländlich-solide
  "woerth-am-rhein": 0.89, // Südpfalz, Rhein-Grenzlage zu Karlsruhe, gute Anbindung
  hanhofen: 0.94, // direkte Nachbargemeinde von Speyer, gute Anbindung
  harthausen: 0.94, // Pfalz-Gemeinde nahe Speyer, ruhige Wohnlage
  lambsheim: 0.92, // LU-Umland, solide Wohngemeinde ohne Stadtstatus-Aufschlag
  "hochstadt-pfalz": 0.92, // Ortsteil bei Herxheim/Landau, ländlich-solide Weinbaulage
  "sankt-martin": 1.06, // bekanntes Weindorf an der Weinstraße, Tourismus-Prämie
  hockenheim: 0.97, // Mittelstadt, Hockenheimring-Bekanntheit, solide Nachfrage
  bruehl: 1.03, // Rhein-Neckar-Kreis, unmittelbare Mannheim/Schwetzingen-Nähe
  "heppenheim-bergstrasse": 1.0, // hessische Kreisstadt, Bergstraße, gute Anbindung Richtung Rhein-Main
  karlsruhe: 1.19, // Großstadt (~300.000 EW), deutlich höheres Preisniveau als die Umlandgemeinden
};

/** Freien Ortsnamen auf das Slug-Schema der Tabelle normalisieren. */
function slugifyOrt(ort: string): string {
  return ort
    .toLowerCase()
    .replace(/\s*\(([^)]+)\)/g, "-$1") // „Hochstadt (Pfalz)" → „hochstadt-pfalz"
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Orts-Faktor für einen frei eingegebenen Ortsnamen — 1, wenn der Ort nicht
 * in der Tabelle steht (bewusst neutral, s. Kopfkommentar). Nur für Orte
 * OHNE eigenen REGIONS-Eintrag gedacht; die Kernstädte tragen ihre Lage
 * bereits in der kalibrierten Basis.
 */
export function stadtFaktorFuerOrt(ort: string): number {
  return STADT_FAKTOR[slugifyOrt(ort)] ?? 1;
}

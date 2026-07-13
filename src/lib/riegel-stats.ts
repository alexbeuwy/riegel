/**
 * Statische RIEGEL-Kennzahlen für Marketing-Flächen (aktuell: StatStrip auf
 * der Startseite). STRIKT nur Werte, die entweder real/aus der API abgeleitet
 * sind ("real") oder von Alex final als vorläufiger, bekannter Wert
 * vorgegeben wurden ("TODO Sissy") — hier wird NICHTS erfunden oder geschätzt.
 *
 * Bewusst KEINE Gesamt-"vermittelter Wert"-Kachel: der dafür nötige
 * Sissy-Wert steht noch aus — ein Platzhalter dafür wäre eine erfundene Zahl.
 */
export const RIEGEL_STATS = {
  /** real — Familienunternehmen seit über 20 Jahren in der Region. */
  jahreAmMarkt: "20+",

  /** real — Ø Tage bis zum Verkauf; bereits im bestehenden Kennzahlen-Block der
   *  Startseite verwendet (s. src/app/page.tsx). */
  oVermarktungstage: 90,

  /** real — Ø Kaufpreis 2020–2026, aus der Live-API abgeleitet. */
  oKaufpreisEuro: 385_820,

  /** TODO Sissy: finale Bestätigung ausstehend — vorläufiger Wert, KEINE Erfindung. */
  besichtigungen: 16_870,

  /** real — Aufrufe auf ImmoScout24 (12,5 Mio.). */
  immoscoutAufrufe: 12_500_000,

  /** real — Exposé-Aufrufe, Top-Objekt (Spitzenwert). */
  exposeSpitze: 416_897,
} as const;

export type RiegelStats = typeof RIEGEL_STATS;

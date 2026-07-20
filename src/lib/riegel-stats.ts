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

  /** von Alex bestätigt — über 40 Jahre Immobilienerfahrung im Team (mehr als
   *  die reine Firmenlaufzeit; wird in der Hero-Prosa genannt). */
  immobilienErfahrungJahre: 40,

  /** real — Ø Tage bis zum Verkauf; bereits im bestehenden Kennzahlen-Block der
   *  Startseite verwendet (s. src/app/page.tsx). */
  oVermarktungstage: 90,

  /** real — Ø Kaufpreis 2020–2026, aus der Live-API abgeleitet. */
  oKaufpreisEuro: 385_820,

  /** von Alex bestätigt — ca. 6.000 Besichtigungen JÄHRLICH. Bewusst als
   *  Jahreswert statt eines über die Jahrzehnte nicht exakt belegbaren
   *  Gesamtwerts (Sissy: lässt sich über die Jahre nicht genau sagen). */
  besichtigungenProJahr: 6_000,

  /** real — Aufrufe/Ausspielungen auf ImmoScout24: mind. 12,5 Mio., Tendenz
   *  darüber. Bewusst konservativ beim runden Begriff „12,5 Millionen" belassen. */
  immoscoutAufrufe: 12_500_000,

  /** von Alex bestätigt — Exposé-Aufrufe des Anbieterprofils (= RIEGEL-Wert im
   *  Reichweiten-Chart, s. reach-chart.tsx). */
  exposeAufrufe: 416_054,

  /** von Manfred (Inhaber) — über 121.000 aktive Suchaufträge in der eigenen
   *  Käufer-Datenbank (E-Mail 17.07.2026). Verkäufer-Argument: Objekte finden
   *  oft schon vor der Veröffentlichung einen Käufer (Off-Market). */
  aktiveSuchauftraege: 121_000,
} as const;

export type RiegelStats = typeof RIEGEL_STATS;

/**
 * Zentrale Foto-Assets (RIEGEL-Originale, gehostet auf BunnyCDN: riegel.b-cdn.net).
 * Neue Assets einfach dort hochladen und hier referenzieren.
 */
const CDN = "https://riegel.b-cdn.net";

export const photos = {
  /** Landscape, cinematic — Makler am Rechner mit großer Wert-Anzeige (Hero /rechner). */
  rechnerHero: `${CDN}/RIEGEL_Rechner-Hero.webp`,
  /** Landscape — Paar liest WERT-REPORT mit Diagramm, Tageslicht (Bewertung). */
  wertReportDay: `${CDN}/Riegel-Wert-Report.webp`,
  /** Landscape — Paar auf Sofa, abends, RIEGEL-Broschüre, Stadtlichter. */
  wertReportNight: `${CDN}/Riegel-Wert-Report3.webp`,
  wertReport2: `${CDN}/Riegel-Wert-Report2.webp`,
  wertReport4: `${CDN}/Riegel-Wert-Report4.webp`,
  wertReport5: `${CDN}/Riegel-Wert-Report5.webp`,
  /** Portrait — Makler im Penthouse mit RIEGEL-Mappe, Speyer-Blick. */
  broschuerePortrait: `${CDN}/RIEGEL_Broschuere_Portrait_01.webp`,
  /** Portrait — Beratung mit iPad in zu bewertendem Objekt (Bewertung vor Ort). */
  analyse1: `${CDN}/RIEGEL_Home-Analyse-1.webp`,
  analyse2: `${CDN}/RIEGEL_Home-Analyse-2.webp`,
  analyse3: `${CDN}/RIEGEL_Home-Analyse-3.webp`,
} as const;

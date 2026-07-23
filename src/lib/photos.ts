/**
 * Zentrale Foto-Assets (RIEGEL-Originale, gehostet auf BunnyCDN: riegel.b-cdn.net).
 * Neue Assets einfach dort hochladen und hier referenzieren.
 */
const CDN = "https://riegel.b-cdn.net";

export const photos = {
  /** Portrait/Editorial — Model-Mann in Wohnung (Startseiten-Hero; Subjekt rechts,
   *  Textspalte links frei — kein POI hinter der Headline). */
  modelWohnung: `${CDN}/Model-Mann-in-Wohnung.webp`,
  /** Landscape, dunkel/cinematic — Mann mit iPad in Küche, blaues Licht. Als Sektions-/
   *  CTA-Hintergrund geeignet (Haus-POI liegt mittig → nicht hinter Headline setzen). */
  heroKitchen: `${CDN}/Mann-mit-iPad-in-Kueche-blaues-Licht-Haus.webp`,
  /** Wie heroKitchen, aber vorab abgedunkelte Fassung (bessere Textlesbarkeit ohne
   *  starkes CSS-Overlay). Genutzt als Hero-Hintergrund /verkaufen. */
  heroKitchenDark: `${CDN}/Mann-mit-iPad-in-Kueche-blaues-Licht-Haus-abgedunkelte-version.webp`,
  /** Landscape, cinematic — Makler am Rechner mit großer Wert-Anzeige (Hero /rechner). */
  rechnerHero: `${CDN}/RIEGEL_Rechner-Hero.webp`,
  /** Landscape, cinematic — Grundrisse/Immobilienakten + Rechner (Aufbereitung/Unterlagen). */
  dokumente: `${CDN}/Dokumente_RIEGEL.webp`,
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

/**
 * Engagement & Sponsoring + Büro-Impressionen (Über-uns-Bento). Echte RIEGEL-
 * Aufnahmen auf BunnyCDN. Beschriftungen spiegeln nur, was auf den Bildern
 * belegbar ist (Trikot „2016", Fahrzeug-Branding etc.) — nichts erfunden.
 */
export const engagement = {
  /** Echtes Team-Gruppenfoto (Banner 2.3:1) — ersetzt die Platzhalter im Team-Bereich. */
  teamGruppe: `${CDN}/Mitarbeiter-1.webp`,
  hoffenheim: `${CDN}/Riegel-Immobilien-Sponsor-TSG-Hoffenheim.webp`,
  autoGewonnen: `${CDN}/Riegel-Auto-Gewonnen-Immobilien.webp`,
  vwGewinnspiel: `${CDN}/Riegel-Immobilien-VW-UP-Gewinnspiel.webp`,
  bandenwerbung: `${CDN}/Riegel-Immobilien-Bandenwerbung-Bundesliga-scaled.webp`,
  plakat: `${CDN}/Riegel-Plakat-Out-of-Home-scaled.webp`,
  event: `${CDN}/Riegel-Immobilien-Event.webp`,
  wein: `${CDN}/RIEGEL-Wein-scaled.webp`,
  officeWide1: `${CDN}/BEU03470-scaled.webp`,
  officeWide2: `${CDN}/BEU03471-scaled.webp`,
  officeWide3: `${CDN}/BEU03473-scaled.webp`,
  officeWide4: `${CDN}/BEU03474-scaled.webp`,
  officeTall1: `${CDN}/BEU03463-scaled.webp`,
  officeTall2: `${CDN}/BEU03466-scaled.webp`,
} as const;

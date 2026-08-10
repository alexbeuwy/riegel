/**
 * Zentrale Klassifikation KI-generierter Bilder — Grundlage der
 * AI-Act-Kennzeichnung (Art. 50 Abs. 4 EU-VO 2024/1689, Transparenzpflichten
 * anwendbar seit 02.08.2026): fotorealistische KI-Bilder tragen ein dezentes
 * Label direkt am Bild (s. components/ki-hinweis.tsx), NICHT nur einen
 * Sammelhinweis im Footer — die Offenlegung muss dem einzelnen Inhalt
 * zuordenbar sein.
 *
 * Genauso wichtig ist die Gegenrichtung: ECHTE Aufnahmen (Team-Porträts,
 * BEU-Büro-Shooting, Sponsoring-/Eventfotos, ImmoAward, OnOffice-Objektfotos,
 * Esri-Luftbilder) bekommen KEIN Label — eine Falschkennzeichnung würde echte
 * Fotos entwerten und wäre ihrerseits irreführend.
 *
 * Registry per URL-Fragment statt per Import-Symbol: die Bildwelt wird an
 * vielen Stellen als String/Prop durchgereicht — so lässt sich JEDER src
 * unmittelbar vor dem Rendern prüfen (istKiBild), egal auf welchem Weg er
 * ankam. Neue KI-Assets: Fragment hier ergänzen, fertig.
 */

/** Einheitlicher, bewusst dezenter Label-Text (überall identisch). */
export const KI_LABEL = "KI-visualisiert";

/**
 * URL-Fragmente der KI-generierten Marken-Bildwelt (riegel.b-cdn.net).
 * Quelle der Klassifikation: docs/foto-assets.md + lib/photos.ts — die
 * cinematic Bildwelt-Serie ist vollständig KI-generiert, die Dateinamen
 * "-KI" bestätigen es für die Standort-Motive.
 */
const KI_FRAGMENTE = [
  "Model-Mann-in-Wohnung",
  "Mann-mit-iPad-in-Kueche-blaues-Licht-Haus",
  "RIEGEL_Rechner-Hero",
  "Dokumente_RIEGEL",
  "Riegel-Wert-Report",
  "RIEGEL_Broschuere_Portrait",
  "RIEGEL_Home-Analyse",
  "Riegel-Haus-lightrays",
  "RIEGEL-Speyer-KI",
  "RIEGEL-Ludwigshafen-KI",
  // Aus den Experten-Seiten (Workflow-Inventur 08/2026): gleiche KI-Serie.
  "Model-Frau-In-Wohnung",
  "Paar-vor-Haus-schaut-auf-Smartphone",
] as const;

/** Ist dieser Bild-src Teil der KI-generierten Bildwelt? */
export function istKiBild(src: string | undefined | null): boolean {
  if (!src) return false;
  return KI_FRAGMENTE.some((f) => src.includes(f));
}

import { MerklisteClient } from "@/components/merkliste-client";
import { getEstateData } from "@/lib/estates";

// Server-Wrapper: lädt die Objektdaten (Live/Mock) einmal serverseitig,
// die Auswahl nach Favoriten-IDs bleibt aber client-seitig (nur im Browser bekannt).
export default async function MerklistePage() {
  const { estates, source } = await getEstateData();
  // source mitgeben: nur bei echten Live-Daten dürfen "nicht mehr vorhandene"
  // Favoriten aufgeräumt werden — beim Mock-Fallback wäre jedes Nicht-Match ein
  // Fehlalarm (echte gemerkte IDs matchen keine Mock-Objekte).
  return <MerklisteClient estates={estates} source={source} />;
}

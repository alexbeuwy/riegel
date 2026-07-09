import { MerklisteClient } from "@/components/merkliste-client";
import { getEstateData } from "@/lib/estates";

// Server-Wrapper: lädt die Objektdaten (Live/Mock) einmal serverseitig,
// die Auswahl nach Favoriten-IDs bleibt aber client-seitig (nur im Browser bekannt).
export default async function MerklistePage() {
  const { estates } = await getEstateData();
  return <MerklisteClient estates={estates} />;
}

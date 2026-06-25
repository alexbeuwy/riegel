/**
 * INTERIM Mock-Daten für die Portal-/Featured-Ansicht, bis die OnOffice-API
 * angebunden ist. Das kanonische Estate-Modell + der OnOffice-Adapter kommen aus
 * dem Portal-Deep-Dive (siehe docs/onoffice-integration.md / build-plan.md).
 * Bilder sind temporär gezogene Platzhalter (public/images).
 */
export interface Estate {
  slug: string;
  title: string;
  type: string; // Objekttyp (Wohnung, Haus, ...)
  marketingType: "Kauf" | "Miete";
  price: string; // vorformatiert (Demo)
  rooms: number;
  area: number; // m²
  location: string;
  image: string;
  isNew?: boolean;
}

export const mockEstates: Estate[] = [
  {
    slug: "stadtvilla-speyer-altstadt",
    title: "Lichtdurchflutete Stadtvilla mit Garten",
    type: "Haus",
    marketingType: "Kauf",
    price: "1.190.000 €",
    rooms: 6,
    area: 245,
    location: "Speyer · Altstadt",
    image: "/images/prop-2.jpg",
    isNew: true,
  },
  {
    slug: "penthouse-ludwigshafen-rheinblick",
    title: "Penthouse mit Rheinblick & Dachterrasse",
    type: "Wohnung",
    marketingType: "Kauf",
    price: "845.000 €",
    rooms: 4,
    area: 168,
    location: "Ludwigshafen · Süd",
    image: "/images/prop-1.jpg",
    isNew: true,
  },
  {
    slug: "architektenhaus-vorderpfalz",
    title: "Architektenhaus in ruhiger Lage",
    type: "Haus",
    marketingType: "Kauf",
    price: "975.000 €",
    rooms: 5,
    area: 210,
    location: "Vorderpfalz",
    image: "/images/hero.jpg",
  },
];

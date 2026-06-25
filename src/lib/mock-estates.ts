/**
 * Portal-Datenmodell + Mock-Fixtures.
 * Entspricht dem kanonischen Estate-Modell aus dem Portal-Deep-Dive
 * (docs: onoffice-integration). Der OnOffice-Adapter (mapOnOfficeEstate)
 * liefert später exakt diesen Typ → Komponenten bleiben unverändert.
 * Bilder sind temporäre Platzhalter (public/images).
 */
export type MarketingType = "kauf" | "miete";
export type ObjectCategory = "wohnung" | "haus" | "grundstueck" | "gewerbe";
export type EstateStatus = "aktiv" | "reserviert" | "verkauft" | "vermietet";

export interface EnergyCertificate {
  type: "bedarf" | "verbrauch" | "kein" | "wird_nachgereicht";
  value?: number; // Endenergiebedarf/-verbrauch kWh/(m²·a)
  energyClass?: "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  source?: string; // wesentlicher Energieträger
  year?: number; // Baujahr
  valueHeating?: number; // Non-Wohngebäude split
  valueElectricity?: number;
}

export interface Provision {
  free: boolean;
  buyerPct?: number;
  text?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Estate {
  id: string;
  slug: string;
  title: string;
  marketingType: MarketingType;
  category: ObjectCategory;
  objectType?: string;
  status: EstateStatus;
  isNew: boolean;
  isFeatured: boolean;

  price: number | null;
  priceLabel: "Kaufpreis" | "Kaltmiete";
  priceReduced: boolean;
  ancillaryCosts?: number;

  rooms: number | null;
  livingArea: number | null;
  plotArea?: number;

  city: string;
  postcode: string;
  district?: string;
  geo: GeoPoint | null;
  showExactLocation: boolean;

  description?: string;
  features: string[];
  locationDescription?: string;

  energy: EnergyCertificate;
  provision: Provision;

  images: string[];
  updatedAt: string; // ISO
}

const IMG = ["/images/prop-2.jpg", "/images/prop-1.jpg", "/images/hero.jpg"];
const cycle = (i: number, n: number) =>
  Array.from({ length: n }, (_, k) => IMG[(i + k) % IMG.length]);

export const mockEstates: Estate[] = [
  {
    id: "e1", slug: "e1-penthouse-rheinblick-ludwigshafen",
    title: "Penthouse mit Rheinblick & Dachterrasse",
    marketingType: "kauf", category: "wohnung", objectType: "Penthouse",
    status: "aktiv", isNew: true, isFeatured: true,
    price: 845000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: 4, livingArea: 168,
    city: "Ludwigshafen", postcode: "67061", district: "Süd",
    geo: { lat: 49.466, lng: 8.435 }, showExactLocation: true,
    description: "Exklusives Penthouse in bevorzugter Lage mit weitem Blick über den Rhein. Großzügige Raumaufteilung, bodentiefe Fenster und eine umlaufende Dachterrasse.",
    features: ["Dachterrasse", "Einbauküche", "Fußbodenheizung", "Aufzug", "Tiefgarage", "Klimaanlage"],
    locationDescription: "Ruhige, gehobene Wohnlage im Süden, fußläufig zum Rheinufer.",
    energy: { type: "verbrauch", value: 78, energyClass: "B", source: "Gas", year: 1998 },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(1, 4), updatedAt: "2026-06-20T10:00:00Z",
  },
  {
    id: "e2", slug: "e2-stadtvilla-speyer-altstadt",
    title: "Lichtdurchflutete Stadtvilla mit Garten",
    marketingType: "kauf", category: "haus", objectType: "Villa",
    status: "aktiv", isNew: true, isFeatured: true,
    price: 1190000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: 6, livingArea: 245, plotArea: 520,
    city: "Speyer", postcode: "67346", district: "Altstadt",
    geo: { lat: 49.3195, lng: 8.441 }, showExactLocation: true,
    description: "Repräsentative Stadtvilla in der historischen Altstadt. Hohe Decken, edle Materialien und ein gepflegter Garten machen dieses Anwesen einzigartig.",
    features: ["Garten", "Kamin", "Einbauküche", "Fußbodenheizung", "Keller", "Doppelgarage"],
    locationDescription: "Erste Altstadtlage, wenige Gehminuten zum Dom.",
    energy: { type: "bedarf", value: 112, energyClass: "D", source: "Wärmepumpe", year: 1971 },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(0, 5), updatedAt: "2026-06-18T09:00:00Z",
  },
  {
    id: "e3", slug: "e3-architektenhaus-vorderpfalz",
    title: "Architektenhaus in ruhiger Lage",
    marketingType: "kauf", category: "haus", objectType: "Architektenhaus",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 975000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: 5, livingArea: 210, plotArea: 610,
    city: "Vorderpfalz", postcode: "67152", district: "",
    geo: { lat: 49.38, lng: 8.35 }, showExactLocation: false,
    description: "Modernes Architektenhaus mit klarer Formensprache, viel Glas und energieeffizienter Technik in naturnaher Umgebung.",
    features: ["Wärmepumpe", "Photovoltaik", "Smart Home", "Garten", "Carport"],
    locationDescription: "Ruhige Ortsrandlage in der Vorderpfalz.",
    energy: { type: "bedarf", value: 45, energyClass: "A", source: "Wärmepumpe", year: 2019 },
    provision: { free: true, text: "Provisionsfrei für den Käufer." },
    images: cycle(2, 4), updatedAt: "2026-05-30T09:00:00Z",
  },
  {
    id: "e4", slug: "e4-altbau-etw-speyer",
    title: "Charmante Altbauwohnung mit Stuck",
    marketingType: "miete", category: "wohnung", objectType: "Etagenwohnung",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 1450, priceLabel: "Kaltmiete", priceReduced: false, ancillaryCosts: 220,
    rooms: 3, livingArea: 95,
    city: "Speyer", postcode: "67346", district: "Altstadt",
    geo: { lat: 49.315, lng: 8.4435 }, showExactLocation: true,
    description: "Stilvolle Altbauwohnung mit Stuckdecken, Dielenboden und großzügigen Räumen in zentraler Lage.",
    features: ["Stuck", "Dielenboden", "Balkon", "Keller", "Altbau"],
    locationDescription: "Zentral in der Speyerer Altstadt.",
    energy: { type: "verbrauch", value: 145, energyClass: "E", source: "Gas", year: 1932 },
    provision: { free: true, text: "Provisionsfrei." },
    images: cycle(1, 3), updatedAt: "2026-06-10T09:00:00Z",
  },
  {
    id: "e5", slug: "e5-neubau-wohnung-ludwigshafen",
    title: "Neubau-Wohnung mit Effizienzstandard",
    marketingType: "kauf", category: "wohnung", objectType: "Neubau-Wohnung",
    status: "reserviert", isNew: true, isFeatured: false,
    price: 489000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: 2, livingArea: 64,
    city: "Ludwigshafen", postcode: "67059", district: "Mitte",
    geo: { lat: 49.48, lng: 8.448 }, showExactLocation: true,
    description: "Erstbezug in einem modernen Neubauprojekt. Hochwertige Ausstattung, bodentiefe Fenster und ein durchdachter Grundriss.",
    features: ["Erstbezug", "Einbauküche", "Fußbodenheizung", "Balkon", "Aufzug"],
    locationDescription: "Zentrumsnah in Ludwigshafen.",
    energy: { type: "wird_nachgereicht" },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(0, 4), updatedAt: "2026-06-22T09:00:00Z",
  },
  {
    id: "e6", slug: "e6-reihenhaus-schifferstadt",
    title: "Familienfreundliches Reihenhaus",
    marketingType: "kauf", category: "haus", objectType: "Reihenhaus",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 565000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: 4, livingArea: 118, plotArea: 210,
    city: "Schifferstadt", postcode: "67105", district: "",
    geo: { lat: 49.3856, lng: 8.376 }, showExactLocation: true,
    description: "Gepflegtes Reihenmittelhaus mit Garten, ideal für Familien. Ruhige Wohnstraße, gute Infrastruktur.",
    features: ["Garten", "Keller", "Stellplatz", "Einbauküche"],
    locationDescription: "Ruhige Wohnlage in Schifferstadt.",
    energy: { type: "verbrauch", value: 95, energyClass: "C", source: "Fernwärme", year: 2005 },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(2, 3), updatedAt: "2026-06-05T09:00:00Z",
  },
  {
    id: "e7", slug: "e7-grundstueck-speyer-west",
    title: "Baugrundstück in begehrter Lage",
    marketingType: "kauf", category: "grundstueck", objectType: "Grundstück",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 320000, priceLabel: "Kaufpreis", priceReduced: false,
    rooms: null, livingArea: null, plotArea: 640,
    city: "Speyer", postcode: "67346", district: "West",
    geo: { lat: 49.32, lng: 8.42 }, showExactLocation: true,
    description: "Voll erschlossenes Baugrundstück in ruhiger Wohnlage. Bebauung nach §34 BauGB möglich.",
    features: ["Voll erschlossen", "Südausrichtung"],
    locationDescription: "Wohngebiet im Westen von Speyer.",
    energy: { type: "kein" },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(2, 2), updatedAt: "2026-05-20T09:00:00Z",
  },
  {
    id: "e8", slug: "e8-loft-ludwigshafen-mitte",
    title: "Großzügiges Loft im Zentrum",
    marketingType: "miete", category: "wohnung", objectType: "Loft",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 2100, priceLabel: "Kaltmiete", priceReduced: false, ancillaryCosts: 280,
    rooms: 3.5, livingArea: 140,
    city: "Ludwigshafen", postcode: "67059", district: "Mitte",
    geo: null, showExactLocation: false,
    description: "Offen geschnittenes Loft mit Industriecharme, hohen Decken und großen Fensterfronten.",
    features: ["Loft", "Hohe Decken", "Einbauküche", "Stellplatz"],
    locationDescription: "Zentrale Lage in Ludwigshafen-Mitte.",
    energy: { type: "verbrauch", value: 88, energyClass: "C", source: "Fernwärme", year: 2012 },
    provision: { free: true, text: "Provisionsfrei." },
    images: cycle(0, 3), updatedAt: "2026-06-12T09:00:00Z",
  },
  {
    id: "e9", slug: "e9-buero-gewerbe-ludwigshafen",
    title: "Repräsentative Bürofläche",
    marketingType: "miete", category: "gewerbe", objectType: "Büro",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 3400, priceLabel: "Kaltmiete", priceReduced: false, ancillaryCosts: 600,
    rooms: 5, livingArea: 280,
    city: "Ludwigshafen", postcode: "67061", district: "",
    geo: { lat: 49.478, lng: 8.44 }, showExactLocation: true,
    description: "Moderne Bürofläche mit flexibler Aufteilung, Klimatisierung und sehr guter Verkehrsanbindung.",
    features: ["Klimaanlage", "Aufzug", "Stellplätze", "Teeküche", "Glasfaser"],
    locationDescription: "Gut angebundene Gewerbelage.",
    energy: { type: "verbrauch", valueHeating: 120, valueElectricity: 35, source: "Fernwärme", year: 2012 },
    provision: { free: false, buyerPct: 2.38, text: "Provision: 2,38 Monatsmieten inkl. MwSt." },
    images: cycle(1, 3), updatedAt: "2026-06-02T09:00:00Z",
  },
  {
    id: "e10", slug: "e10-bungalow-speyer-nord",
    title: "Ebenerdiger Bungalow mit großem Garten",
    marketingType: "kauf", category: "haus", objectType: "Bungalow",
    status: "aktiv", isNew: false, isFeatured: false,
    price: 720000, priceLabel: "Kaufpreis", priceReduced: true,
    rooms: 4, livingArea: 155, plotArea: 480,
    city: "Speyer", postcode: "67346", district: "Nord",
    geo: { lat: 49.33, lng: 8.443 }, showExactLocation: true,
    description: "Barrierearmer Bungalow auf großzügigem Grundstück. Alles auf einer Ebene, viel Potenzial.",
    features: ["Ebenerdig", "Großer Garten", "Garage", "Keller", "Kamin"],
    locationDescription: "Beliebte Wohnlage im Norden von Speyer.",
    energy: { type: "bedarf", value: 168, energyClass: "F", source: "Öl", year: 1968 },
    provision: { free: false, buyerPct: 3.57, text: "Käuferprovision: 3,57 % inkl. MwSt." },
    images: cycle(2, 4), updatedAt: "2026-06-15T09:00:00Z",
  },
];

export const ESTATE_ORTE = ["Speyer", "Ludwigshafen", "Schifferstadt", "Vorderpfalz"];

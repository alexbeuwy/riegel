import type { IconName } from "@/components/icon";
import { photos } from "@/lib/photos";

/**
 * „Die Experten für [Objektart]" — verkäufergerichtete Spezialisierungs-Seiten
 * unter /verkaufen/[typ]. Inhalte destilliert aus Manfred Riegels Material
 * (Experten-Idee, USP-Profil, Verkäufer-Fragenkatalog) — keine erfundenen
 * Fakten, keine Aussagen über Wettbewerber.
 */

/**
 * BunnyCDN-Assets, die (noch) nicht in photos.ts gemappt sind — hier lokal
 * referenziert, damit diese Seite ohne Änderung an photos.ts auskommt.
 * Existenz aller drei Dateien am 2026-07-20 per HTTP 200 verifiziert.
 */
const CDN = "https://riegel.b-cdn.net";
const fotoHausLightrays = `${CDN}/Riegel-Haus-lightrays.webp`;
const fotoModelFrau = `${CDN}/Model-Frau-In-Wohnung.webp`;
const fotoPaarVorHaus = `${CDN}/Paar-vor-Haus-schaut-auf-Smartphone.webp`;

export interface ExpertenUsp {
  icon: IconName;
  title: string;
  text: string;
}

export interface ExpertenFaq {
  q: string;
  a: string;
}

export interface ExpertenFoto {
  src: string;
  alt: string;
  /** CSS object-position, falls der Bildausschnitt nicht mittig sitzen soll. */
  position?: string;
}

/** Vertiefende Inhalts-Sektion (Zick-Zack-Layout auf der Seite). */
export interface ExpertenVertiefung {
  eyebrow: string;
  titel: string;
  absaetze: string[];
  /** Optionale Checkliste unter den Absätzen. */
  punkte?: string[];
  foto: ExpertenFoto;
}

export interface ExpertenSeite {
  slug: string;
  /** Kurzlabel für Verweise (Hub-Karten, Related-Zeile). */
  label: string;
  /** Eine Zeile für die Hub-Karte auf /verkaufen. */
  teaser: string;
  h1: string;
  /**
   * h1 mit weichen Trennzeichen (­) für die Anzeige — Akira Expanded ist
   * breit, und ohne Soft-Hyphens bricht der Browser lange Komposita hart und
   * ohne Trennstrich um (headless/ältere Browser haben kein de-Wörterbuch).
   * h1 (ohne ­) bleibt die kanonische Fassung für Metadata + JSON-LD.
   */
  h1Display: string;
  metaTitle: string;
  metaDescription: string;
  icon: IconName;
  /**
   * Großer akira-Display-Claim (Wortwitz, ohne „RIEGEL"/„Experten") — rein
   * visuelles Element ÜBER der h1. Die sichtbare h1 bleibt aus SEO-Gründen
   * die Subline („RIEGEL – Die Experten für …").
   */
  claim: string;
  /** Exakter Teilstring des Claims, der im Akzentton gesetzt wird. */
  claimAkzent?: string;
  /** Sichtbare h1 unter dem Claim — Inter/Body-Font, font-medium, text-muted. */
  subline: string;
  /** Hero-Hintergrundfoto (BunnyCDN), je Seite ein anderes Motiv. */
  heroFoto: ExpertenFoto;
  /** Hero-Einordnung (2–3 Sätze) — verkäufergerichtet, seriös. */
  intro: string;
  usps: ExpertenUsp[];
  /** Zwei vertiefende Inhalts-Sektionen (Zick-Zack) — Fakten aus den Quellen. */
  vertiefung: ExpertenVertiefung[];
  /** Überschrift über den Referenzobjekten, je Typ leicht variiert. */
  referenzHeading: string;
  /** Schlagwörter für das Bewertungs-Spotlight (Zitat-Auswahl). */
  spotlightKeywords: string[];
  /** „Wir vermarkten"-Chips, bewusst auf 8–12 Begriffe destilliert. */
  chips: string[];
  faq: ExpertenFaq[];
  /** „Wir suchen laufend"-Satz für vorgemerkte Käufer. */
  suchen: string;
  keywords: string[];
}

/**
 * Letzte inhaltliche Überarbeitung — bei Textänderungen mitziehen
 * (Sitemap + JSON-LD, analog GEO_CONTENT_* in geo.ts).
 */
export const EXPERTEN_PUBLISHED = "2026-07-20";
export const EXPERTEN_UPDATED = "2026-07-20";

/** Wiederkehrende USP-Bausteine (aus dem USP-Profil), je Seite passend gemischt. */
const uspSuchauftraege = (objekte: string): ExpertenUsp => ({
  icon: "search",
  title: "121.000+ aktive Suchaufträge",
  text: `In unserer Datenbank sind über 121.000 aktive Suchaufträge registriert. ${objekte} können wir dadurch häufig vermitteln, noch bevor sie öffentlich gelistet werden.`,
});

const uspDirektankauf: ExpertenUsp = {
  icon: "handshake",
  title: "Direktankauf möglich",
  text: "Zwei angeschlossene Investorenfirmen kaufen Wohnanlagen und größere Objekte aktiv für den eigenen Bestand oder zur Entwicklung an — im passenden Fall tritt RIEGEL selbst als Käufer auf.",
};

const uspInvestorenNetzwerk: ExpertenUsp = {
  icon: "users",
  title: "Netzwerk aus Investoren",
  text: "Private Investoren, Family Offices, institutionelle Anleger und Projektentwickler — wir bringen Ihr Objekt gezielt zu den passenden Käufern, regional verwurzelt und bundesweit vernetzt.",
};

const uspWertermittlung: ExpertenUsp = {
  icon: "calculator",
  title: "Fundierte Marktwertermittlung",
  text: "Lage, Zustand, Flächen, Mieteinnahmen, Mietverträge und Mieterstruktur fließen in die Bewertung ein — auf Wunsch mit schriftlicher, nachvollziehbar hergeleiteter Marktwertanalyse.",
};

export const expertenSeiten: ExpertenSeite[] = [
  {
    slug: "mehrfamilienhaus",
    label: "Mehrfamilienhäuser & Zinshäuser",
    teaser: "Vermietete Wohnobjekte marktgerecht bewertet und an vorgemerkte Kapitalanleger vermittelt.",
    h1: "Die Experten für Mehrfamilienhäuser & Zinshäuser",
    h1Display: "Die Experten für Mehrfamilien\u00ADhäuser & Zins\u00ADhäuser",
    metaTitle: "Die Experten für Mehrfamilienhäuser & Zinshäuser | Riegel Immobilien",
    metaDescription:
      "Mehrfamilienhaus oder Zinshaus verkaufen in der Metropolregion Rhein-Neckar: fundierte Marktwertermittlung, 121.000+ aktive Suchaufträge, auf Wunsch Direktankauf. Riegel Immobilien.",
    icon: "home",
    claim: "Wie Vermieter sein zum Geschäftsmodell wird.",
    claimAkzent: "Geschäftsmodell",
    subline: "RIEGEL – Die Experten für Mehrfamilienhäuser & Zinshäuser",
    heroFoto: {
      src: fotoHausLightrays,
      alt: "Wohnhaus im abendlichen Gegenlicht — Riegel Immobilien",
      position: "50% 42%",
    },
    intro:
      "Sie möchten ein Mehrfamilienhaus oder Zinshaus verkaufen? Wir vermarkten vermietete Wohnobjekte in der Metropolregion Rhein-Neckar — mit fundierter Wertermittlung, vorgemerkten Kaufinteressenten und Begleitung bis zum Notartermin.",
    vertiefung: [
      {
        eyebrow: "Wertermittlung",
        titel: "Was Ihr Mietshaus wirklich wert ist",
        absaetze: [
          "Beim Mehrfamilienhaus zählt mehr als der Quadratmeterpreis: Neben Lage, Grundstück, Baujahr und Zustand fließen die Höhe der Mieteinnahmen, die Inhalte der Mietverträge, die Mieterstruktur und mögliche Entwicklungspotenziale in die Bewertung ein. Erst die Gesamtheit dieser Faktoren ergibt einen realistischen, marktgerechten Angebotspreis.",
          "Methodische Grundlage sind die anerkannten Verfahren der Immobilienwertermittlungsverordnung (ImmoWertV) — insbesondere das Ertragswert-, Vergleichswert- und Sachwertverfahren. Als Datenbasis dienen unter anderem die Kaufpreissammlungen der regionalen Gutachterausschüsse, Bodenrichtwerte (BORIS), aktuelle Grundstücksmarktberichte und professionelle Bewertungssoftware — ergänzt um unsere eigenen Verkaufserfahrungen aus der Metropolregion Rhein-Neckar.",
        ],
        punkte: [
          "Strategischer Angebotspreis und realistisch erzielbarer Verkaufspreis werden getrennt ausgewiesen",
          "Auf Wunsch als schriftliche Marktwertanalyse mit nachvollziehbarer Herleitung",
          "Persönliche Besichtigung vor Ort statt automatisiertem Datenbankwert",
        ],
        foto: {
          src: photos.analyse1,
          alt: "Bewertung vor Ort: Beratung mit iPad im zu bewertenden Objekt",
          position: "50% 30%",
        },
      },
      {
        eyebrow: "Vermarktung",
        titel: "Verkauf im vermieteten Zustand",
        absaetze: [
          "Ein bewohntes Haus verkauft man nicht gegen seine Mieter, sondern mit ihnen. Sämtliche Besichtigungstermine stimmen wir direkt mit den Mietern ab und berücksichtigen deren zeitliche Möglichkeiten — die gesamte Organisation übernehmen wir. Es finden grundsätzlich Einzelbesichtigungen statt; Foto-, Video- oder Drohnenaufnahmen entstehen nur mit Zustimmung der Mieter.",
          "Je nach Objekt und Mietverhältnissen sprechen wir zwei Käufergruppen an: Kapitalanleger, die auf stabile Mieteinnahmen Wert legen — oder Erwerber, die eine Einheit selbst nutzen und die übrigen Wohnungen vermieten möchten. Bei realistischer Preisgestaltung liegt die Vermarktungsdauer in der Regel bei bis zu etwa 14 Wochen; über den Stand informieren wir Sie mindestens einmal pro Woche.",
        ],
        foto: {
          src: fotoModelFrau,
          alt: "Vermietete Wohnung — Besichtigungen in Abstimmung mit den Mietern",
        },
      },
    ],
    referenzHeading: "Aktuelle Mandate aus dieser Objektklasse",
    spotlightKeywords: ["haus", "verkauf", "schnell"],
    usps: [
      uspSuchauftraege("Mehrfamilienhäuser und Zinshäuser"),
      uspWertermittlung,
      uspDirektankauf,
      {
        icon: "star",
        title: "ImmoScout24 Goldpartner",
        text: "Präsenz auf dem marktführenden Immobilienportal plus eigene Interessentendatenbank, Immobilien-App und Social-Media-Kanäle — für qualifizierte Kaufanfragen statt bloßer Reichweite.",
      },
    ],
    chips: [
      "Mehrfamilienhäuser",
      "Zinshäuser",
      "Dreiparteienhäuser",
      "Wohnanlagen",
      "Wohnportfolios",
      "Renditeobjekte",
      "Kapitalanlageobjekte",
      "Wohn- und Geschäftshäuser",
      "Off-Market-Immobilien",
    ],
    faq: [
      {
        q: "Welche Käufer kommen für ein Mehrfamilienhaus infrage?",
        a: "Je nach Objekt und Mietverhältnissen sind das klassische Kapitalanleger, die auf stabile Mieteinnahmen Wert legen — oder private Erwerber, die eine Einheit selbst nutzen und die übrigen Wohnungen vermieten möchten. Die Vermarktung stimmen wir auf die passende Käufergruppe ab.",
      },
      {
        q: "Wie ermitteln Sie den Angebotspreis?",
        a: "Auf Basis einer umfassenden Marktwertanalyse: Lage, Grundstücksgröße, Baujahr, Zustand, Modernisierungen, Wohn- und Nutzfläche sowie die aktuelle Marktsituation. Bei vermieteten Objekten fließen zusätzlich Mieteinnahmen, Mietverträge, Mieterstruktur und Entwicklungspotenziale ein. Auf Wunsch erhalten Sie eine schriftliche Marktwertanalyse.",
      },
      {
        q: "Lassen sich Verkaufspreise anderer Häuser auf mein Objekt übertragen?",
        a: "Nur eingeschränkt. Vergleichspreise bieten eine erste Orientierung, aber jede Immobilie ist ein Unikat: Lage, Zustand, Mieteinnahmen und Mietverhältnisse beeinflussen den Marktwert erheblich. Ziel ist eine fundierte, individuelle Wertermittlung — nicht die Übernahme fremder Preise.",
      },
      {
        q: "Wie lange dauert der Verkauf eines Mehrfamilienhauses?",
        a: "Bei professioneller Vermarktung und realistischer Preisgestaltung liegt die durchschnittliche Vermarktungsdauer in der Regel bei bis zu etwa 14 Wochen. Abweichungen sind je nach Objekt, Zielgruppe und Marktsituation möglich.",
      },
      {
        q: "Wie laufen Besichtigungen im vermieteten Haus ab?",
        a: "Sämtliche Termine stimmen wir direkt mit den Mietern ab und berücksichtigen deren zeitliche Möglichkeiten — die Organisation übernehmen vollständig wir. Wir führen grundsätzlich Einzelbesichtigungen durch, damit jeder Interessent das Objekt in Ruhe kennenlernen kann.",
      },
      {
        q: "Wie werde ich über den Vermarktungsstand informiert?",
        a: "Sie erhalten mindestens einmal pro Woche eine Rückmeldung — auch wenn es keine wesentlichen Veränderungen gab. Über neue Kaufanfragen, Besichtigungen und Preisverhandlungen informieren wir Sie zeitnah.",
      },
    ],
    suchen:
      "Für vorgemerkte Kapitalanleger suchen wir laufend Mehrfamilienhäuser, Zinshäuser und Wohnanlagen in der Metropolregion Rhein-Neckar.",
    keywords: [
      "Mehrfamilienhaus verkaufen",
      "Zinshaus verkaufen",
      "Mehrfamilienhaus Makler",
      "Wohnanlage verkaufen",
      "Renditeobjekt verkaufen",
    ],
  },
  {
    slug: "gewerbeimmobilie",
    label: "Gewerbeimmobilien",
    teaser: "Vom Bürogebäude bis zur Logistikhalle — diskret vermarktet an geprüfte Investoren.",
    h1: "Die Experten für Gewerbeimmobilien",
    h1Display: "Die Experten für Gewerbe\u00ADimmobilien",
    metaTitle: "Die Experten für Gewerbeimmobilien | Riegel Immobilien",
    metaDescription:
      "Gewerbeimmobilie verkaufen: Bürogebäude, Einzelhandel, Logistik, Hotel oder Pflegeimmobilie. Diskrete Off-Market-Vermarktung, bonitätsgeprüfte Investoren, Netzwerk zu Banken und Gutachtern.",
    icon: "layers",
    claim: "Aus Quadratmetern werden Renditen.",
    claimAkzent: "Renditen",
    subline: "RIEGEL – Die Experten für Gewerbeimmobilien",
    heroFoto: {
      src: photos.broschuerePortrait,
      alt: "Beratungsgespräch mit RIEGEL-Mappe über den Dächern von Speyer",
      position: "50% 28%",
    },
    intro:
      "Sie möchten eine Gewerbeimmobilie verkaufen — vom Bürogebäude bis zur Logistikhalle? Wir sprechen gezielt qualifizierte Investoren an, vermarkten auf Wunsch diskret ohne öffentliche Inserate und begleiten Sie von der Bewertung bis zum Notartermin.",
    vertiefung: [
      {
        eyebrow: "Diskretion",
        titel: "Off-Market: Verkauf ohne Schaufenster",
        absaetze: [
          "Nicht jede Gewerbeimmobilie gehört ins Schaufenster: Ein öffentliches Inserat kann Mieter, Mitarbeiter und Geschäftspartner beunruhigen. Auf Wunsch vermarkten wir Ihr Objekt deshalb vollständig off-market — ohne öffentliche Inserate, über die gezielte Ansprache vorgemerkter, bonitätsgeprüfter Kaufinteressenten.",
          "Grundlage sind unsere Datenbank mit über 121.000 aktiven Suchaufträgen und ein über Jahrzehnte gewachsenes Netzwerk aus privaten Investoren, Family Offices, institutionellen Anlegern und Projektentwicklern. So wechseln Objekte häufig den Eigentümer, bevor sie öffentlich gelistet werden.",
        ],
        foto: {
          src: photos.modelWohnung,
          alt: "Diskrete Vermarktung — Objektpräsentation abseits der öffentlichen Portale",
          position: "70% center",
        },
      },
      {
        eyebrow: "Käuferprüfung",
        titel: "Geprüfte Käufer, belastbarer Abschluss",
        absaetze: [
          "Ein Verkauf ist erst so sicher wie sein Käufer. Deshalb qualifizieren wir Kaufinteressenten vor: Wir prüfen Ernsthaftigkeit und grundsätzliche Kaufbereitschaft frühzeitig und fordern — soweit erforderlich — Finanzierungsbestätigungen oder Nachweise der finanzierenden Bank an.",
          "Hinzu kommt die gesetzlich vorgeschriebene Identifizierung der Vertragsparteien nach dem Geldwäschegesetz (GwG), die wir im Verkaufsprozess entsprechend den gesetzlichen Anforderungen dokumentieren. Bis zur notariellen Beurkundung koordinieren wir Käufer, Verkäufer und Notariat — inklusive Vertragsentwurf zur vorherigen Prüfung durch beide Seiten.",
        ],
        punkte: [
          "Vorqualifizierung aller Kaufinteressenten vor der Besichtigung",
          "Finanzierungsnachweis bzw. Bankbestätigung vor dem Abschluss",
          "GwG-Identifizierung und Dokumentation im Verkaufsprozess",
        ],
        foto: {
          src: photos.dokumente,
          alt: "Unterlagen, Grundrisse und Prüfung — Vorbereitung des Verkaufs",
        },
      },
    ],
    referenzHeading: "Aktuelle Gewerbe-Mandate",
    spotlightKeywords: ["kompetent", "professionell", "verkauf"],
    usps: [
      uspInvestorenNetzwerk,
      {
        icon: "lock",
        title: "Diskrete Off-Market-Vermarktung",
        text: "Auf Wunsch ohne öffentliche Inserate: gezielte Ansprache vorgemerkter, bonitätsgeprüfter Kaufinteressenten — für einen geordneten Verkaufsprozess ohne Unruhe bei Mietern und Mitarbeitern.",
      },
      uspSuchauftraege("Gewerbeobjekte"),
      {
        icon: "building",
        title: "Banken- & Gutachter-Netzwerk",
        text: "Jahrzehntelange Marktpräsenz hat ein belastbares Netzwerk zu Banken, Gutachtern und Entscheidungsträgern geschaffen — das erleichtert Bewertung, Prüfung und Finanzierung.",
      },
    ],
    chips: [
      "Bürogebäude",
      "Büro- und Geschäftshäuser",
      "Einzelhandelsimmobilien",
      "Fachmarktzentren",
      "Einkaufszentren",
      "Logistikimmobilien",
      "Lagerhallen",
      "Industrieimmobilien",
      "Produktionshallen",
      "Hotels",
      "Pflegeimmobilien",
      "Gewerbegrundstücke",
    ],
    faq: [
      {
        q: "Wie läuft die Wertermittlung bei einer Gewerbeimmobilie?",
        a: "Grundlage ist eine umfassende Marktwertanalyse: Lage, Zustand, Flächen, Ausstattung sowie Angebot und Nachfrage im jeweiligen Segment. Bei vermieteten Objekten fließen Mieteinnahmen, Mietverträge und Mieterstruktur ein. Auf Wunsch erhalten Sie die Analyse schriftlich mit nachvollziehbarer Herleitung.",
      },
      {
        q: "Ist eine diskrete Vermarktung ohne öffentliche Inserate möglich?",
        a: "Ja. Gewerbeimmobilien vermarkten wir auf Wunsch off-market: Wir sprechen gezielt vorgemerkte, bonitätsgeprüfte Interessenten aus unserer Datenbank und unserem Investorennetzwerk an — ohne dass das Objekt öffentlich sichtbar wird.",
      },
      {
        q: "Wie hoch ist die Provision beim Verkauf einer Gewerbeimmobilie?",
        a: "Die gesetzliche Regelung zur Provisionsteilung gilt vor allem für Einfamilienhäuser und Eigentumswohnungen, die an Verbraucher verkauft werden. Bei Gewerbeimmobilien gelten teilweise andere rechtliche Rahmenbedingungen. Die konkrete Regelung legen wir nach Prüfung des Objekts fest und erläutern sie transparent im persönlichen Gespräch.",
      },
      {
        q: "Wann entsteht der Provisionsanspruch?",
        a: "Erst wenn durch unsere Vermittlung oder unseren Nachweis ein wirksamer Kaufvertrag zustande gekommen ist — maßgeblich ist die notarielle Beurkundung. Vorher fallen keine Provisionskosten an.",
      },
      {
        q: "Wie halten Sie mich während der Vermarktung auf dem Laufenden?",
        a: "Mindestens einmal pro Woche erhalten Sie eine Rückmeldung zum Stand der Vermarktung. Über neue Anfragen, Besichtigungen und Verhandlungen informieren wir Sie darüber hinaus zeitnah — auf Wunsch mit schriftlicher Zusammenfassung der Aktivitäten.",
      },
    ],
    suchen:
      "Für vorgemerkte Investoren suchen wir laufend Bürogebäude, Einzelhandelsflächen, Fachmarktzentren, Industrie- und Logistikimmobilien sowie Hotels und Pflegeimmobilien.",
    keywords: [
      "Gewerbeimmobilie verkaufen",
      "Bürogebäude verkaufen",
      "Gewerbeimmobilien Makler",
      "Logistikimmobilie verkaufen",
      "Einzelhandelsimmobilie verkaufen",
    ],
  },
  {
    slug: "wohn-und-geschaeftshaus",
    label: "Wohn- und Geschäftshäuser",
    teaser: "Wohnen und Gewerbe unter einem Dach — beide Ertragsbausteine realistisch bewertet.",
    h1: "Die Experten für Wohn- und Geschäftshäuser",
    h1Display: "Die Experten für Wohn- und Geschäfts\u00ADhäuser",
    metaTitle: "Die Experten für Wohn- und Geschäftshäuser | Riegel Immobilien",
    metaDescription:
      "Wohn- und Geschäftshaus verkaufen in der Metropolregion Rhein-Neckar: Bewertung gemischter Nutzung, passende Käufergruppen, Vermarktung mit Rücksicht auf Ihre Mieter. Riegel Immobilien.",
    icon: "building",
    claim: "Unten Umsatz. Oben Zuhause.",
    claimAkzent: "Oben Zuhause.",
    subline: "RIEGEL – Die Experten für Wohn- und Geschäftshäuser",
    heroFoto: {
      src: fotoPaarVorHaus,
      alt: "Eigentümerpaar vor seinem Haus mit Blick aufs Smartphone",
      position: "50% 35%",
    },
    intro:
      "Wohnen und Gewerbe unter einem Dach: Wir bewerten beide Ertragsbausteine Ihres Wohn- und Geschäftshauses realistisch, finden die passende Käufergruppe und organisieren die Vermarktung mit Rücksicht auf Ihre Mieter.",
    vertiefung: [
      {
        eyebrow: "Bewertung",
        titel: "Zwei Erträge, ein Marktwert",
        absaetze: [
          "Ladenfläche im Erdgeschoss, Wohnungen darüber: Ein Wohn- und Geschäftshaus hat zwei Ertragsquellen — und beide gehören sauber bewertet. In die Marktwertanalyse fließen die Mieteinnahmen aus Wohn- und Gewerbeeinheiten, die Inhalte der bestehenden Mietverträge, die Mieterstruktur sowie Lage, Zustand und Flächen des Hauses ein.",
          "Methodisch stützen wir uns auf die anerkannten Verfahren der Immobilienwertermittlungsverordnung (ImmoWertV) — bei ertragsorientierten Objekten insbesondere das Ertragswertverfahren — sowie auf die Kaufpreissammlungen der Gutachterausschüsse, Bodenrichtwerte und aktuelle Marktdaten. Auf Wunsch erhalten Sie die Marktwertanalyse schriftlich, mit transparent hergeleitetem Angebotspreis.",
        ],
        foto: {
          src: photos.wertReportDay,
          alt: "Eigentümer lesen die schriftliche Marktwertanalyse im Wert-Report",
        },
      },
      {
        eyebrow: "Zielgruppe",
        titel: "Die richtige Käufergruppe entscheidet",
        absaetze: [
          "Kapitalanleger mit Blick auf stabile Erträge — oder ein Erwerber, der die Gewerbefläche selbst nutzt und die Wohnungen vermietet? Welche Zielgruppe am besten passt, richtet sich nach den individuellen Eigenschaften Ihres Hauses. Und danach richtet sich unsere gesamte Vermarktungsstrategie.",
          "Wir erreichen beide Gruppen: über unsere eigene Interessentendatenbank, das marktführende Immobilienportal, unsere Immobilien-App und Social-Media-Kanäle — bei geeigneten Objekten ergänzt um professionelle Immobilienvideos. Besichtigungen organisieren wir vollständig selbst, ausschließlich einzeln und in Abstimmung mit Ihren Mietern.",
        ],
        foto: {
          src: photos.analyse2,
          alt: "Beratung im Objekt — Vermarktungsstrategie am iPad",
          position: "50% 30%",
        },
      },
    ],
    referenzHeading: "Aktuelle Mandate: Wohnen & Gewerbe",
    spotlightKeywords: ["haus", "verkauf"],
    usps: [
      {
        icon: "calculator",
        title: "Bewertung gemischter Nutzung",
        text: "Wohn- und Gewerbeerträge, Mietverträge und Mieterstruktur fließen gemeinsam in die Marktwertanalyse ein — für einen realistischen, marktgerechten Angebotspreis statt einer Pauschale.",
      },
      uspSuchauftraege("Wohn- und Geschäftshäuser"),
      {
        icon: "users",
        title: "Die passende Käufergruppe",
        text: "Je nach Objekt sprechen wir Kapitalanleger mit Fokus auf stabile Erträge an — oder Erwerber, die einen Teil selbst nutzen und den Rest vermieten möchten. Die Strategie richtet sich nach Ihrer Immobilie.",
      },
      {
        icon: "key",
        title: "Vermarktung mit Rücksicht auf Mieter",
        text: "Besichtigungen stimmen wir direkt mit den Mietern ab und führen grundsätzlich Einzelbesichtigungen durch. Die gesamte Terminorganisation übernehmen wir — Eigentümer und Mieter werden entlastet.",
      },
    ],
    chips: [
      "Wohn- und Geschäftshäuser",
      "Büro- und Geschäftshäuser",
      "Zinshäuser",
      "Mehrfamilienhäuser",
      "Bürogebäude",
      "Einzelhandelsimmobilien",
      "Renditeobjekte",
      "Wohnanlagen",
    ],
    faq: [
      {
        q: "Was macht die Bewertung eines Wohn- und Geschäftshauses besonders?",
        a: "Der erzielbare Kaufpreis hängt von vielen Faktoren ab: Lage, Zustand, Mieteinnahmen aus Wohn- und Gewerbeeinheiten, Mieterstruktur und den Inhalten der bestehenden Mietverträge. Erst die Gesamtheit dieser Faktoren ergibt eine realistische, marktgerechte Preisermittlung.",
      },
      {
        q: "Welche Käufergruppen kommen infrage?",
        a: "Vor allem Kapitalanleger, die auf stabile Mieteinnahmen Wert legen — je nach Mietverhältnissen auch Erwerber, die eine Einheit selbst nutzen möchten. Welche Zielgruppe am besten passt, richtet sich nach den individuellen Eigenschaften Ihrer Immobilie.",
      },
      {
        q: "Was passiert, wenn sich das Objekt zunächst nicht verkauft?",
        a: "Wir stehen während der gesamten Vermarktung in engem Austausch mit Ihnen. Entsteht wider Erwarten keine ausreichende Nachfrage, werten wir die Rückmeldungen der Interessenten aus, analysieren gemeinsam die Gründe und passen Strategie und Angebotspreis marktgerecht an.",
      },
      {
        q: "Erstellen Sie professionelle Vermarktungsunterlagen?",
        a: "Ja. Wir arbeiten mit einem professionellen Immobilienfotografen, lassen bei Bedarf Grundrisse neu erstellen und produzieren bei geeigneten Objekten Immobilienvideos oder Drohnenaufnahmen — bei vermieteten Objekten selbstverständlich nur mit Zustimmung der Mieter.",
      },
      {
        q: "Arbeiten Sie mit einem Alleinauftrag?",
        a: "Ja, ausschließlich mit einem qualifizierten Alleinauftrag, in der Regel mit sechs Monaten Laufzeit. So koordinieren wir alle Marketingmaßnahmen, Besichtigungen und Verhandlungen aus einer Hand — ohne widersprüchliche Preisangaben oder doppelte Inserate.",
      },
    ],
    suchen:
      "Für vorgemerkte Käufer suchen wir laufend Wohn- und Geschäftshäuser sowie Zinshäuser in der Metropolregion Rhein-Neckar.",
    keywords: [
      "Wohn- und Geschäftshaus verkaufen",
      "Wohn- und Geschäftshaus Makler",
      "gemischt genutzte Immobilie verkaufen",
      "Büro- und Geschäftshaus verkaufen",
    ],
  },
  {
    slug: "anlageimmobilie",
    label: "Anlage- & Investmentimmobilien",
    teaser: "Vom einzelnen Renditeobjekt bis zum Portfolio — mit Investorennetzwerk und Direktankauf.",
    h1: "Die Experten für Anlage- & Investmentimmobilien",
    h1Display: "Die Experten für Anlage- & Investment\u00ADimmobilien",
    metaTitle: "Die Experten für Anlage- & Investmentimmobilien | Riegel Immobilien",
    metaDescription:
      "Anlageimmobilie oder Investmentimmobilie verkaufen: exklusives Netzwerk aus Family Offices und institutionellen Anlegern, 121.000+ Suchaufträge, Direktankauf durch angeschlossene Investorenfirmen.",
    icon: "trend",
    claim: "Beton schlägt Sparbuch.",
    claimAkzent: "Beton",
    subline: "RIEGEL – Die Experten für Anlage- & Investmentimmobilien",
    heroFoto: {
      src: photos.heroKitchenDark,
      alt: "Investor prüft Objektdaten am iPad — abendliche Szene mit blauem Licht",
      position: "62% center",
    },
    intro:
      "Vom einzelnen Renditeobjekt bis zum Portfolio: Wir vermarkten Anlage- und Investmentimmobilien gezielt und auf Wunsch diskret — mit eigenem Investorennetzwerk, vorgemerkten Käufern und der Option auf Direktankauf.",
    vertiefung: [
      {
        eyebrow: "Direktankauf",
        titel: "Wenn der Makler selbst kaufen kann",
        absaetze: [
          "Zwei angeschlossene Investorenfirmen kaufen Wohnanlagen und größere Objekte aktiv für den eigenen Bestand oder zur Entwicklung an. Das verändert die Ausgangslage für Verkäufer grundlegend: Im passenden Fall tritt RIEGEL nicht als Vermittler auf, sondern selbst als Käufer.",
          "Die Investorensicht kennen wir dadurch aus eigener Erfahrung — vom Ankaufsprofil bis zur Bestandsentwicklung. Ob eine Vermittlung an unser Netzwerk oder ein Direktankauf für Sie das bessere Ergebnis bringt, besprechen wir offen und ohne Umwege.",
        ],
        foto: {
          src: photos.wertReportNight,
          alt: "Abendliche Beratung mit der RIEGEL-Broschüre vor Stadtlichtern",
        },
      },
      {
        eyebrow: "Datenbank",
        titel: "121.000 Suchaufträge: verkauft, bevor es ein Inserat gibt",
        absaetze: [
          "Bevor eine Anlageimmobilie öffentlich sichtbar wird, gleichen wir sie mit unserer Datenbank ab: über 121.000 aktive Suchaufträge, laufend ergänzt um neue Interessenten über unsere Website, Immobilienportale, Social Media, regionale Netzwerke und Empfehlungen aus dem Kundenstamm.",
          "Passende Kontakte sprechen wir gezielt und persönlich an — abgestimmt auf Suchprofil, Budget und Nutzung. So finden viele Objekte ihren Käufer, bevor sie öffentlich gelistet werden; auf Wunsch bleibt die Vermarktung vollständig diskret.",
        ],
        punkte: [
          "Datenbank-Abgleich vor dem ersten öffentlichen Inserat",
          "Gezielte, persönliche Ansprache passender Suchprofile",
          "Auf Wunsch vollständig diskrete Off-Market-Vermarktung",
        ],
        foto: {
          src: photos.rechnerHero,
          alt: "Makler am Rechner mit großer Wert-Anzeige — Datenbank-Vorvermarktung",
        },
      },
    ],
    referenzHeading: "Aktuelle Anlage-Mandate",
    spotlightKeywords: ["wohnung", "schnell", "verkauf"],
    usps: [
      {
        icon: "handshake",
        title: "Direktankauf durch eigene Investorenfirmen",
        text: "Zwei angeschlossene Investorenfirmen kaufen Wohnanlagen und größere Objekte aktiv für den eigenen Bestand oder zur Entwicklung an. Wir kennen die Investorensicht aus eigener Erfahrung — und können im Zweifel selbst als Käufer auftreten.",
      },
      uspInvestorenNetzwerk,
      uspSuchauftraege("Anlage- und Investmentimmobilien"),
      {
        icon: "doc",
        title: "Transparente Kommunikation",
        text: "Mindestens einmal pro Woche eine Rückmeldung zum Vermarktungsstand — plus zeitnahe Information über Kaufanfragen, Besichtigungen und Preisverhandlungen. Sie entscheiden auf fundierter Grundlage.",
      },
    ],
    chips: [
      "Anlageimmobilien",
      "Investmentimmobilien",
      "Kapitalanlageobjekte",
      "Renditeobjekte",
      "Wohnportfolios",
      "Gewerbeportfolios",
      "Immobilienportfolios",
      "Projektentwicklungen",
      "Neubauprojekte",
      "Entwicklungsgrundstücke",
      "Off-Market-Immobilien",
    ],
    faq: [
      {
        q: "Gibt es bereits vorgemerkte Interessenten für mein Objekt?",
        a: "Häufig ja. Mit über 121.000 aktiven Suchaufträgen in unserer Datenbank prüfen wir schon vor der öffentlichen Vermarktung, ob passende Kaufinteressenten für Ihre Immobilie vorgemerkt sind.",
      },
      {
        q: "Sind Verkaufspreise vergleichbarer Objekte eine gute Orientierung?",
        a: "Nur bedingt. Jede Immobilie ist ein Unikat — Lage, Baujahr, Zustand, Mieteinnahmen und Mietverhältnisse beeinflussen den Marktwert erheblich. Deshalb bewerten wir individuell, statt fremde Verkaufspreise zu übertragen.",
      },
      {
        q: "Kommt auch ein Direktankauf infrage?",
        a: "Ja. Über zwei angeschlossene Investorenfirmen kaufen wir Wohnanlagen und größere Objekte aktiv für den eigenen Bestand oder zur Entwicklung an. Ob eine Vermittlung an unser Netzwerk oder ein Direktankauf sinnvoller ist, besprechen wir offen mit Ihnen.",
      },
      {
        q: "Wie vermarkten Sie Anlageimmobilien?",
        a: "Mit einer individuellen Strategie je Objekt und Zielgruppe: eigene Interessentendatenbank, das marktführende Immobilienportal, unsere Immobilien-App und Social-Media-Kanäle — bei geeigneten Objekten ergänzt um professionelle Immobilienvideos. Auf Wunsch vermarkten wir vollständig diskret off-market.",
      },
      {
        q: "Wie ist die Provision geregelt?",
        a: "Bei Anlage- und Gewerbeobjekten gelten teilweise andere rechtliche Rahmenbedingungen als beim Verkauf an Verbraucher. Die konkrete Regelung legen wir nach Prüfung der Immobilie fest und erläutern sie transparent. Der Provisionsanspruch entsteht erst mit der notariellen Beurkundung des Kaufvertrags.",
      },
    ],
    suchen:
      "Für unsere Investoren und Kapitalanleger suchen wir kontinuierlich Renditeobjekte, Portfolios und Anlageimmobilien jeder Größenordnung.",
    keywords: [
      "Anlageimmobilie verkaufen",
      "Investmentimmobilie verkaufen",
      "Kapitalanlage verkaufen",
      "Renditeobjekt verkaufen",
      "Immobilienportfolio verkaufen",
    ],
  },
  {
    slug: "nachlassimmobilie",
    label: "Nachlass- & Erbimmobilien",
    teaser: "Geordneter Verkauf für Erben und Erbengemeinschaften — in Abstimmung mit Rechtsanwälten und Nachlassverwaltern.",
    h1: "Die Experten für Nachlass- & Erbimmobilien",
    h1Display: "Die Experten für Nachlass- & Erb\u00ADimmobilien",
    metaTitle: "Die Experten für Nachlass- & Erbimmobilien | Riegel Immobilien",
    metaDescription:
      "Geerbte Immobilie verkaufen: Erfahrung mit Erbengemeinschaften und Vor- und Nacherbschaften, Zusammenarbeit mit Rechtsanwälten und Nachlassverwaltern, schriftliche Marktwertanalyse für alle Erben.",
    icon: "shield",
    claim: "Erben heißt entscheiden.",
    claimAkzent: "entscheiden.",
    subline: "RIEGEL – Die Experten für Nachlass- & Erbimmobilien",
    heroFoto: {
      src: photos.dokumente,
      alt: "Grundrisse und Unterlagen einer Nachlassimmobilie",
      position: "50% 45%",
    },
    intro:
      "Eine geerbte Immobilie zu verkaufen heißt oft: mehrere Beteiligte, offene rechtliche Fragen und Entscheidungen in einer ohnehin belastenden Zeit. Wir begleiten Erben und Erbengemeinschaften geordnet durch den gesamten Verkauf — in enger Abstimmung mit Rechtsanwälten und Nachlassverwaltern.",
    vertiefung: [
      {
        eyebrow: "Erbengemeinschaft",
        titel: "Alle Erben, eine Entscheidung",
        absaetze: [
          "In der Praxis benennt eine Erbengemeinschaft häufig eine verantwortliche Person, die die Abstimmung übernimmt — für die notarielle Beurkundung sind dann die erforderlichen Beteiligten oder entsprechend bevollmächtigte Personen einzubinden. Ob bereits eine Vollmacht vorliegt, ein Erbe die Organisation übernimmt oder alle gemeinsam handeln: Wir richten den Verkaufsprozess nach Ihrer Konstellation aus.",
          "Als gemeinsame Entscheidungsgrundlage erstellen wir auf Wunsch eine schriftliche Marktwertanalyse, in der die Bewertungsgrundlagen und die Herleitung des empfohlenen Angebotspreises transparent und nachvollziehbar dargestellt sind — damit alle Erben auf demselben Stand entscheiden.",
        ],
        punkte: [
          "Klare Zuständigkeiten: eine koordinierende Person oder alle gemeinsam",
          "Vollmachten und Beurkundung frühzeitig mitgedacht",
          "Schriftliche Marktwertanalyse als gemeinsame Entscheidungsgrundlage",
        ],
        foto: {
          src: photos.wertReport2,
          alt: "Schriftliche Marktwertanalyse als gemeinsame Entscheidungsgrundlage",
        },
      },
      {
        eyebrow: "Netzwerk",
        titel: "Im Verbund mit Fachanwälten und Nachlassverwaltern",
        absaetze: [
          "Wir arbeiten regelmäßig mit Fachanwälten — insbesondere für Erbrecht — sowie mit Nachlassverwaltern und weiteren Fachleuten der Nachlassabwicklung zusammen. Über diese Netzwerke werden wir empfohlen und mit der Vermarktung von Nachlassimmobilien beauftragt; zahlreiche haben wir bereits erfolgreich vermittelt.",
          "Auch die Besonderheiten von Vor- und Nacherbschaften kennen wir aus begleiteten Verkäufen. Klare Kommunikation und strukturierte Abläufe sorgen dafür, dass alle Beteiligten mindestens einmal pro Woche über den Stand informiert sind — bei Bedarf in direkter Abstimmung mit den beteiligten Anwälten oder dem Nachlassverwalter.",
        ],
        foto: {
          src: photos.analyse3,
          alt: "Abstimmung im Objekt — Begleitung durch den gesamten Verkauf",
          position: "50% 30%",
        },
      },
    ],
    referenzHeading: "Aktuelle Verkaufsmandate",
    spotlightKeywords: ["einschätzung", "beiseite", "verkauf"],
    usps: [
      {
        icon: "shield",
        title: "Erfahrung mit Erbengemeinschaften",
        text: "Wir kennen die rechtlichen und organisatorischen Besonderheiten von Erbengemeinschaften sowie Vor- und Nacherbschaften — und begleiten alle Beteiligten professionell bis zum erfolgreichen Abschluss.",
      },
      {
        icon: "doc",
        title: "Netzwerk aus Rechtsanwälten & Nachlassverwaltern",
        text: "Seit vielen Jahren arbeiten wir eng mit Rechtsanwälten, Nachlassverwaltern und weiteren Fachleuten der Nachlassabwicklung zusammen — zahlreiche Nachlassimmobilien haben wir bereits erfolgreich vermittelt.",
      },
      {
        icon: "calculator",
        title: "Schriftliche Marktwertanalyse",
        text: "Eine nachvollziehbar hergeleitete, schriftliche Wertermittlung schafft eine gemeinsame Entscheidungsgrundlage — gerade wenn mehrere Erben beteiligt sind.",
      },
      {
        icon: "users",
        title: "Feste Ansprechpartner",
        text: "Unser Team ist fest angestellt und verlässlich erreichbar. Alle Beteiligten erhalten mindestens einmal pro Woche eine Rückmeldung zum Stand der Vermarktung.",
      },
    ],
    chips: [
      "Einfamilienhäuser",
      "Eigentumswohnungen",
      "Mehrfamilienhäuser",
      "Zinshäuser",
      "Wohn- und Geschäftshäuser",
      "Baugrundstücke",
      "Vermietete Immobilien",
      "Immobilien aus Erbengemeinschaften",
    ],
    faq: [
      {
        q: "Haben Sie Erfahrung mit dem Verkauf von Nachlassimmobilien?",
        a: "Ja. Wir arbeiten seit vielen Jahren eng mit Rechtsanwälten, Nachlassverwaltern und weiteren Fachleuten der Nachlassabwicklung zusammen und haben in den vergangenen Jahren zahlreiche Nachlassimmobilien erfolgreich vermittelt.",
      },
      {
        q: "Auch bei einer Erbengemeinschaft oder Vor- und Nacherbschaft?",
        a: "Ja. Wir kennen die rechtlichen und organisatorischen Besonderheiten solcher Verkaufsprozesse und begleiten alle Beteiligten professionell bis zum erfolgreichen Abschluss — bei Bedarf in direkter Abstimmung mit den beteiligten Rechtsanwälten oder dem Nachlassverwalter.",
      },
      {
        q: "Wie wird der Wert der geerbten Immobilie ermittelt?",
        a: "Über eine umfassende Marktwertanalyse: Lage, Grundstücksgröße, Baujahr, Zustand, Modernisierungen, Flächen und die aktuelle Marktsituation — bei vermieteten Objekten zusätzlich Mieteinnahmen und Mietverträge. Auf Wunsch erhalten alle Erben die Analyse schriftlich mit nachvollziehbarer Herleitung.",
      },
      {
        q: "Wie lange dauert der Verkauf einer Nachlassimmobilie?",
        a: "Bei professioneller Vermarktung und realistischer Preisgestaltung in der Regel bis zu etwa 14 Wochen. Je nach Objekt, Erbsituation und Marktlage kann es Abweichungen geben — den realistischen Zeitrahmen besprechen wir vorab offen mit Ihnen.",
      },
      {
        q: "Wie bleiben alle Erben über den Stand informiert?",
        a: "Sie erhalten mindestens einmal pro Woche eine Rückmeldung zum Vermarktungsstand und zeitnahe Information über wichtige Entwicklungen. Auf Wunsch stellen wir eine schriftliche Zusammenfassung der bisherigen Vermarktungsaktivitäten zur Verfügung — als gemeinsame Grundlage für Entscheidungen in der Erbengemeinschaft.",
      },
      {
        q: "Wann fällt die Maklerprovision an?",
        a: "Der Provisionsanspruch entsteht erst, wenn durch unsere Vermittlung ein wirksamer Kaufvertrag notariell beurkundet wurde. Vorher entstehen Ihnen keine Provisionskosten — auch die Marktwertermittlung ist kostenfrei.",
      },
    ],
    suchen:
      "Auch für Nachlassimmobilien gilt: Für vorgemerkte Käufer suchen wir laufend Häuser, Wohnungen und Mehrfamilienhäuser in der Metropolregion Rhein-Neckar.",
    keywords: [
      "Nachlassimmobilie verkaufen",
      "geerbte Immobilie verkaufen",
      "Erbengemeinschaft Immobilie verkaufen",
      "Erbimmobilie Makler",
      "Haus aus Nachlass verkaufen",
    ],
  },
];

export function getExpertenSeite(slug: string): ExpertenSeite | undefined {
  return expertenSeiten.find((s) => s.slug === slug);
}

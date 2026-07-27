/**
 * Ergänzt die vier Kern-Wohnobjektarten als Experten-Seiten (Vorgabe Manfred:
 * „Hier würde noch Einfamilienhäuser RH usw. fehlen" — auf /verkaufen gab es
 * 35 Spezialgebiete, aber keine Seite für das eigentliche Kerngeschäft).
 *
 * Inhaltliche Grundlage, nichts davon erfunden:
 * - Preisspannen aus der Auswertung der eigenen Abschlüsse
 *   (scripts/preisanalyse-onoffice.mts, 132 Verkäufe): Speyer 39 Abschlüsse,
 *   Median 3.561 €/m²; Ludwigshafen 15 Abschlüsse, Median 2.467 €/m².
 * - Bewertungsverfahren nach ImmoWertV (Vergleichswert ist bei diesen
 *   Objektarten das Regelverfahren, nicht das Ertragswertverfahren).
 * - Halbteilungsgrundsatz § 656c BGB, Energieausweispflicht § 80 GEG.
 * - RIEGEL-Fakten wie im übrigen Content: zwei Standorte, 121.000+ aktive
 *   Suchaufträge, kostenlose Bewertung, ImmoAward 2025.
 *
 * Idempotent: bereits vorhandene Slugs werden übersprungen.
 */
import { readFileSync, writeFileSync } from "node:fs";

const PATH = new URL("../src/content/experten-seiten.json", import.meta.url);
const CDN = "https://riegel.b-cdn.net";
const seiten = JSON.parse(readFileSync(PATH, "utf8"));

/** Bausteine, die alle vier Seiten teilen (gleiche Leistung, gleiche Fakten). */
const uspSuchauftraege = (was) => ({
  icon: "search",
  title: "121.000+ aktive Suchaufträge",
  text: `In unserer Datenbank sind über 121.000 aktive Suchaufträge registriert. ${was} können wir dadurch häufig vermitteln, noch bevor sie öffentlich gelistet werden.`,
});

const uspBewertung = {
  icon: "calculator",
  title: "Bewertung nach Vergleichswertverfahren",
  text: "Bei selbst genutzten Wohnimmobilien ist das Vergleichswertverfahren nach ImmoWertV das Regelverfahren: Grundlage sind tatsächlich erzielte Kaufpreise vergleichbarer Objekte, ergänzt um Bodenrichtwerte (BORIS Rheinland-Pfalz) und die Daten des Gutachterausschusses.",
};

const uspRegional = {
  icon: "pin",
  title: "Mikrolage statt Stadtdurchschnitt",
  text: "Zwischen einer einfachen Lage mit Sanierungsbedarf und einer sanierten Immobilie in Spitzenlage liegt in Speyer fast das Dreifache pro Quadratmeter. Wir bewerten die konkrete Straße, nicht den Stadtmittelwert.",
};

const uspProvision = {
  icon: "handshake",
  title: "Provision erst im Erfolgsfall",
  text: "Die Erstbewertung ist kostenlos und unverbindlich. Die Provision wird erst mit dem notariell beurkundeten Verkauf fällig und nach dem Halbteilungsgrundsatz (§ 656c BGB) zwischen Käufer und Verkäufer geteilt.",
};

const vertiefungPreis = (objekt) => ({
  eyebrow: "Was Ihr Objekt wert ist",
  titel: `Preisfindung: Was ${objekt} in der Region aktuell erzielen`,
  absaetze: [
    "Aus unseren eigenen abgeschlossenen Verkäufen ergibt sich ein klares Bild: In Speyer liegen die erzielten Kaufpreise je nach Lage und Zustand zwischen rund 2.500 und 7.000 € pro Quadratmeter Wohnfläche, der Mittelwert unserer Abschlüsse bei etwa 3.560 €. In Ludwigshafen reicht die Spanne von rund 1.700 bis 4.000 €, im Mittel etwa 2.470 €. Die Spitzenwerte entstehen in Lagen direkt am Rhein und bei sanierten Objekten, das untere Ende bei einfachen Lagen mit Sanierungsstau.",
    "Diese Bandbreite ist der Grund, warum pauschale Quadratmeterpreise beim Verkauf wenig helfen. Entscheidend sind Mikrolage, Zustand, Baujahr, Energiestandard und Grundstückszuschnitt — und beim Angebotspreis die Frage, ob er Interessenten anzieht oder abschreckt. Ein zu hoch angesetzter Startpreis führt regelmäßig zu langer Standzeit und späteren Reduzierungen, die am Ende unter dem liegen, was ein realistischer Einstieg erzielt hätte.",
  ],
  punkte: [
    "Vergleichswertverfahren auf Basis echter Abschlüsse in Ihrer Lage",
    "Amtliche Bodenrichtwerte (BORIS Rheinland-Pfalz) als zweite Stütze",
    "Energiestandard und Sanierungsstand als eigener Werttreiber",
    "Angebotspreis mit Verhandlungsspielraum, nicht als Wunschzahl",
  ],
  foto: {
    src: `${CDN}/RIEGEL_Rechner-Hero.webp`,
    alt: "Datenbasierte Wertermittlung bei RIEGEL Immobilien",
  },
});

const vertiefungUnterlagen = {
  eyebrow: "Vorbereitung",
  titel: "Unterlagen: Was Sie vor dem ersten Besichtigungstermin brauchen",
  absaetze: [
    "Vollständige Unterlagen sind der am häufigsten unterschätzte Zeitfaktor. Ämter brauchen für Auszüge und Lagepläne oft mehrere Wochen, und die finanzierende Bank des Käufers verlangt sie ohnehin. Fehlt etwas, verzögert sich der Notartermin — im schlechteren Fall springt der Käufer ab.",
    "Der Energieausweis ist dabei keine Formalie: Nach § 80 GEG muss er Kaufinteressenten spätestens bei der Besichtigung unaufgefordert vorgelegt werden, die Pflichtangaben gehören in jede Anzeige. Bei älteren Ein- und Zweifamilienhäusern (Bauantrag vor 1977, unsaniert) ist ein Bedarfsausweis vorgeschrieben. Wir klären für Ihr Objekt, welcher Ausweis nötig ist, und beschaffen die Unterlagen auf Wunsch komplett.",
  ],
  punkte: [
    "Aktueller Grundbuchauszug und Flurkarte",
    "Bemaßte Grundrisse und Wohnflächenberechnung",
    "Energieausweis (Pflicht nach § 80 GEG)",
    "Nachweise zu Modernisierungen und Sanierungen",
  ],
  foto: {
    src: `${CDN}/Dokumente_RIEGEL.webp`,
    alt: "Aufbereitete Objektunterlagen und Grundrisse",
  },
};

const vertiefungAblauf = {
  eyebrow: "Ablauf",
  titel: "Von der Bewertung bis zur Schlüsselübergabe",
  absaetze: [
    "Von der ersten Einschätzung bis zur Übergabe vergehen in der Metropolregion Rhein-Neckar in der Regel drei bis sechs Monate. Wir beginnen mit einer kostenlosen Bewertung — zuerst datenbasiert über unseren Online-Rechner, danach auf Wunsch ausführlich vor Ort. Darauf folgen Unterlagenaufbereitung, professionelle Fotos und Exposé, die gezielte Ansprache passender Interessenten sowie koordinierte Einzelbesichtigungen.",
    "Vor der Zusage prüfen wir die Finanzierbarkeit, damit der Notartermin nicht platzt: Eine Finanzierungsbestätigung der Bank sollte vorliegen, bevor der Vertrag entworfen wird. Bis zur Beurkundung und zur Schlüsselübergabe mit Übergabeprotokoll und dokumentierten Zählerständen bleiben Sie bei einem festen Ansprechpartner — an den Standorten Speyer und Ludwigshafen.",
  ],
  foto: {
    src: `${CDN}/RIEGEL_Home-Analyse-1.webp`,
    alt: "Persönliche Beratung im Objekt",
  },
};

const faqProvision = {
  q: "Was kostet der Verkauf über RIEGEL Immobilien?",
  a: "Die Erstbewertung ist kostenlos und unverbindlich. Beim Verkauf einer Wohnimmobilie an Verbraucher gilt der Halbteilungsgrundsatz nach § 656c BGB: Käufer und Verkäufer teilen sich die Provision. Marktüblich sind in Rheinland-Pfalz insgesamt ca. 7,14 % inkl. MwSt. des Kaufpreises, also rund 3,57 % je Seite. Fällig wird sie erst mit dem notariell beurkundeten Verkauf.",
};

const faqEnergieausweis = {
  q: "Brauche ich einen Energieausweis für den Verkauf?",
  a: "Ja. Nach § 80 GEG muss der Energieausweis Kaufinteressenten spätestens bei der Besichtigung unaufgefordert vorgelegt und dem Käufer nach dem Verkauf ausgehändigt werden; die Pflichtangaben gehören zudem in jede Verkaufsanzeige. Bei älteren Ein- und Zweifamilienhäusern (Bauantrag vor 1977, unsaniert) ist ein Bedarfsausweis vorgeschrieben. Die Kosten liegen bei ca. 100 € online in eigener Verantwortung bis ca. 300 bis 450 € beim professionellen Energieberater.",
};

const faqDauer = {
  q: "Wie lange dauert der Verkauf?",
  a: "Von der Bewertung bis zur Schlüsselübergabe dauert es in der Metropolregion Rhein-Neckar meist drei bis sechs Monate. Gut vorbereitete Objekte in gefragten Lagen verkaufen sich schneller; zwischen Notartermin und Übergabe liegen typischerweise vier bis acht Wochen, abhängig von der Finanzierung des Käufers.",
};

/** Die vier neuen Seiten — Cluster „wohnen". */
const neu = [
  {
    slug: "einfamilienhaus",
    cluster: "wohnen",
    label: "Einfamilienhäuser",
    teaser: "Das klassische Eigenheim marktgerecht bewertet und an geprüfte Käufer vermittelt — unser Kerngeschäft seit über 25 Jahren.",
    h1: "Die Experten für Einfamilienhäuser",
    h1Display: "Die Experten für Einfamilien­häuser",
    metaTitle: "Einfamilienhaus verkaufen & bewerten | RIEGEL Immobilien",
    metaDescription:
      "Einfamilienhaus verkaufen in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar: kostenlose Bewertung nach Vergleichswertverfahren, 121.000+ aktive Suchaufträge, Provision erst im Erfolgsfall.",
    icon: "home",
    claim: "Ein Zuhause verkauft man nicht nebenbei.",
    claimAkzent: "nebenbei",
    subline: "RIEGEL – Die Experten für Einfamilienhäuser",
    heroFoto: {
      src: `${CDN}/Riegel-Haus-lightrays.webp`,
      alt: "Modernes Einfamilienhaus am Abend",
    },
    intro:
      "Das Einfamilienhaus ist für die meisten Eigentümer die größte Transaktion ihres Lebens — und der Markt verzeiht dabei wenig. Zwischen einer einfachen Lage mit Sanierungsstau und einem sanierten Haus in Spitzenlage liegen in Speyer fast 4.500 € pro Quadratmeter Unterschied. Genau deshalb entscheidet die realistische Preisfindung über Erlös und Verkaufsdauer. RIEGEL Immobilien vermittelt Einfamilienhäuser in Speyer, Ludwigshafen und der gesamten Metropolregion Rhein-Neckar, bewertet kostenfrei nach dem Vergleichswertverfahren und begleitet Sie mit einem festen Ansprechpartner bis zur Schlüsselübergabe.",
    usps: [
      uspSuchauftraege("Einfamilienhäuser"),
      uspBewertung,
      uspRegional,
      uspProvision,
    ],
    vertiefung: [vertiefungPreis("Einfamilienhäuser"), vertiefungUnterlagen, vertiefungAblauf],
    referenzHeading: "Häuser aus unserer Vermarktung",
    spotlightKeywords: ["Haus verkaufen", "Einfamilienhaus", "Hausbewertung", "Eigenheim"],
    chips: [
      "Einfamilienhaus",
      "Freistehendes Haus",
      "Stadtvilla",
      "Bungalow",
      "Haus mit Garten",
      "Sanierungsobjekt",
      "Neubau-Einfamilienhaus",
      "Haus mit Einliegerwohnung",
      "Architektenhaus",
      "Haus aus Nachlass",
    ],
    faq: [
      {
        q: "Was ist mein Einfamilienhaus wert?",
        a: "Maßgeblich ist das Vergleichswertverfahren nach ImmoWertV: Wir ziehen tatsächlich erzielte Kaufpreise vergleichbarer Häuser in Ihrer Lage heran und stützen das Ergebnis mit den amtlichen Bodenrichtwerten (BORIS Rheinland-Pfalz). Aus unseren eigenen Abschlüssen liegen die Preise in Speyer je nach Lage und Zustand zwischen rund 2.500 und 7.000 € pro Quadratmeter Wohnfläche, in Ludwigshafen zwischen rund 1.700 und 4.000 €. Eine belastbare Zahl für Ihr Haus ergibt erst die Besichtigung vor Ort — sie ist bei uns kostenlos.",
      },
      {
        q: "Sollte ich vor dem Verkauf noch sanieren?",
        a: "Das lässt sich nur objektbezogen beantworten. Maßnahmen, die den Energiestandard sichtbar verbessern, zahlen sich seit den gestiegenen Energiekosten häufiger aus als kosmetische Renovierungen; umfangreiche Sanierungen kurz vor dem Verkauf rechnen sich dagegen selten. Wir schauen uns Ihr Haus an und sagen Ihnen offen, was den Preis bewegt und was nicht — auch wenn die Antwort lautet, dass Sie nichts investieren sollten.",
      },
      faqEnergieausweis,
      faqProvision,
      faqDauer,
    ],
    suchen:
      "Für vorgemerkte Interessenten suchen wir laufend Einfamilienhäuser in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar — auch sanierungsbedürftige Objekte und Häuser aus Nachlässen.",
    keywords: [
      "Einfamilienhaus verkaufen",
      "Haus verkaufen Speyer",
      "Haus verkaufen Ludwigshafen",
      "Einfamilienhaus bewerten",
      "Hausbewertung Rhein-Neckar",
      "Eigenheim verkaufen",
      "Haus verkaufen Metropolregion Rhein-Neckar",
      "Immobilienmakler Einfamilienhaus",
    ],
  },
  {
    slug: "reihenhaus",
    cluster: "wohnen",
    label: "Reihenhäuser",
    teaser: "Reihen- und Endhäuser sind in der Region besonders gefragt — wir kennen die Käufergruppen und die Preisunterschiede zwischen Mittel- und Endlage.",
    h1: "Die Experten für Reihenhäuser",
    h1Display: "Die Experten für Reihen­häuser",
    metaTitle: "Reihenhaus verkaufen & bewerten | RIEGEL Immobilien",
    metaDescription:
      "Reihenhaus oder Endhaus verkaufen in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar: kostenlose Bewertung, 121.000+ aktive Suchaufträge, Provision erst im Erfolgsfall.",
    icon: "building",
    claim: "Schmaler Grundriss, breite Nachfrage.",
    claimAkzent: "breite Nachfrage",
    subline: "RIEGEL – Die Experten für Reihenhäuser",
    heroFoto: {
      src: `${CDN}/Paar-vor-Haus-schaut-auf-Smartphone.webp`,
      alt: "Interessenten vor einem Reihenhaus",
    },
    intro:
      "Reihenhäuser sind in der Metropolregion Rhein-Neckar der Einstieg ins Eigenheim: bezahlbarer als das freistehende Haus, mit eigenem Garten und meist in etablierten Wohnlagen. Für den Verkauf zählt der Unterschied im Detail — ein Endhaus mit zwei Außenwänden und größerem Grundstücksanteil erzielt regelmäßig mehr als das Mittelhaus in derselben Zeile. RIEGEL Immobilien bewertet Ihr Reihenhaus kostenfrei, ordnet es realistisch in die Zeile ein und vermittelt es an geprüfte Interessenten aus dem eigenen Bestand.",
    usps: [
      uspSuchauftraege("Reihen- und Endhäuser"),
      uspBewertung,
      {
        icon: "ruler",
        title: "Mittel- oder Endhaus macht den Unterschied",
        text: "Endhäuser bringen zwei Außenwände, mehr Tageslicht und in der Regel einen größeren Grundstücksanteil mit — das schlägt sich im Preis nieder. Auch Grundstückstiefe, Ausrichtung des Gartens und Stellplatzsituation bewerten wir einzeln statt pauschal für die ganze Zeile.",
      },
      uspProvision,
    ],
    vertiefung: [vertiefungPreis("Reihenhäuser"), vertiefungUnterlagen, vertiefungAblauf],
    referenzHeading: "Häuser aus unserer Vermarktung",
    spotlightKeywords: ["Reihenhaus", "Haus verkaufen", "Endhaus", "Hausbewertung"],
    chips: [
      "Reihenmittelhaus",
      "Reihenendhaus",
      "Endhaus mit Garten",
      "Reihenhaus mit Garage",
      "Reihenhaus Neubaugebiet",
      "Sanierungsbedürftiges Reihenhaus",
      "Reihenhaus als Kapitalanlage",
      "Reihenhaus aus Nachlass",
      "Stadthaus in Zeile",
      "Reihenhaus mit Keller",
    ],
    faq: [
      {
        q: "Ist ein Endhaus mehr wert als ein Mittelhaus?",
        a: "In der Regel ja. Ein Endhaus hat zwei Außenwände, dadurch mehr Fenster und Tageslicht, und meist einen größeren Grundstücksanteil sowie einen seitlichen Zugang. Wie groß der Unterschied im konkreten Fall ausfällt, hängt von Zuschnitt, Ausrichtung und Lage in der Zeile ab — das bewerten wir bei der Besichtigung objektbezogen.",
      },
      {
        q: "Was ist mein Reihenhaus wert?",
        a: "Grundlage ist das Vergleichswertverfahren nach ImmoWertV mit tatsächlich erzielten Kaufpreisen vergleichbarer Häuser, gestützt auf die amtlichen Bodenrichtwerte. Aus unseren eigenen Abschlüssen ergeben sich in Speyer je nach Lage und Zustand rund 2.500 bis 7.000 € pro Quadratmeter Wohnfläche, in Ludwigshafen rund 1.700 bis 4.000 €. Die kostenlose Bewertung vor Ort präzisiert das für Ihr Objekt.",
      },
      faqEnergieausweis,
      faqProvision,
      faqDauer,
    ],
    suchen:
      "Für vorgemerkte Interessenten suchen wir laufend Reihen- und Endhäuser in Speyer, Ludwigshafen und dem Rhein-Pfalz-Kreis — gepflegt wie sanierungsbedürftig.",
    keywords: [
      "Reihenhaus verkaufen",
      "Endhaus verkaufen",
      "Reihenhaus bewerten",
      "Reihenhaus Speyer",
      "Reihenhaus Ludwigshafen",
      "Reihenmittelhaus Wert",
      "Haus verkaufen Rhein-Neckar",
      "Immobilienmakler Reihenhaus",
    ],
  },
  {
    slug: "doppelhaushaelfte",
    cluster: "wohnen",
    label: "Doppelhaushälften",
    teaser: "Die Doppelhaushälfte verbindet Eigenheim-Gefühl mit moderatem Preis — wir bewerten Grundstücksteilung und Nachbarschaftsregelungen korrekt mit.",
    h1: "Die Experten für Doppelhaushälften",
    h1Display: "Die Experten für Doppelhaus­hälften",
    metaTitle: "Doppelhaushälfte verkaufen & bewerten | RIEGEL Immobilien",
    metaDescription:
      "Doppelhaushälfte verkaufen in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar: kostenlose Bewertung nach Vergleichswertverfahren, 121.000+ aktive Suchaufträge, Provision erst im Erfolgsfall.",
    icon: "home",
    claim: "Halbes Haus, ganzes Zuhause.",
    claimAkzent: "ganzes Zuhause",
    subline: "RIEGEL – Die Experten für Doppelhaushälften",
    heroFoto: {
      src: `${CDN}/Model-Frau-In-Wohnung.webp`,
      alt: "Wohnraum einer Doppelhaushälfte",
    },
    intro:
      "Die Doppelhaushälfte ist bei Familien in der Metropolregion Rhein-Neckar durchgehend gefragt: eigener Eingang, eigener Garten, nur eine gemeinsame Wand — und ein deutlich moderaterer Preis als beim freistehenden Haus. Beim Verkauf lohnt der genaue Blick auf die Details, die Käufer und Banken prüfen: Wie ist das Grundstück geteilt, gibt es Grundbucheintragungen zur Nachbarwand, wie ist der Schallschutz? RIEGEL Immobilien bewertet Ihre Doppelhaushälfte kostenfrei und bringt sie zu Interessenten, die genau diese Objektart suchen.",
    usps: [
      uspSuchauftraege("Doppelhaushälften"),
      uspBewertung,
      {
        icon: "doc",
        title: "Grundbuch und Nachbarwand geprüft",
        text: "Bei Doppelhaushälften entscheiden Details über einen reibungslosen Notartermin: Grundstücksteilung, eingetragene Wege- oder Leitungsrechte, Regelungen zur gemeinsamen Wand und zum Schallschutz. Wir sichten die Unterlagen vorab, damit im Verkaufsprozess nichts nachverhandelt werden muss.",
      },
      uspProvision,
    ],
    vertiefung: [vertiefungPreis("Doppelhaushälften"), vertiefungUnterlagen, vertiefungAblauf],
    referenzHeading: "Häuser aus unserer Vermarktung",
    spotlightKeywords: ["Doppelhaushälfte", "Haus verkaufen", "Hausbewertung", "Familienhaus"],
    chips: [
      "Doppelhaushälfte",
      "Doppelhaus komplett",
      "Doppelhaushälfte mit Garten",
      "Doppelhaushälfte mit Garage",
      "Neubau-Doppelhaushälfte",
      "Sanierungsbedürftige Doppelhaushälfte",
      "Doppelhaushälfte mit Einliegerwohnung",
      "Doppelhaushälfte aus Nachlass",
      "Familienhaus",
      "Haus mit Nachbarwand",
    ],
    faq: [
      {
        q: "Was muss ich beim Verkauf einer Doppelhaushälfte beachten?",
        a: "Neben den üblichen Unterlagen sind drei Punkte typisch: die Grundstücksteilung (ist Ihre Hälfte real geteilt oder liegt Miteigentum vor?), eingetragene Rechte im Grundbuch wie Wege-, Leitungs- oder Überbaurechte, und Regelungen zur gemeinsamen Wand. Käufer und finanzierende Banken fragen das ab — geklärt vorab, kostet es keine Zeit; ungeklärt verzögert es den Notartermin.",
      },
      {
        q: "Was ist meine Doppelhaushälfte wert?",
        a: "Maßgeblich ist das Vergleichswertverfahren nach ImmoWertV mit realen Kaufpreisen vergleichbarer Objekte, gestützt auf die amtlichen Bodenrichtwerte (BORIS). Aus unseren eigenen Abschlüssen liegen die Preise in Speyer je nach Lage und Zustand bei rund 2.500 bis 7.000 € pro Quadratmeter Wohnfläche, in Ludwigshafen bei rund 1.700 bis 4.000 €. Präzise wird es mit der kostenlosen Bewertung vor Ort.",
      },
      faqEnergieausweis,
      faqProvision,
      faqDauer,
    ],
    suchen:
      "Für vorgemerkte Interessenten suchen wir laufend Doppelhaushälften in Speyer, Ludwigshafen und den Umlandgemeinden — auch mit Sanierungsbedarf.",
    keywords: [
      "Doppelhaushälfte verkaufen",
      "Doppelhaushälfte bewerten",
      "Doppelhaus verkaufen",
      "Doppelhaushälfte Speyer",
      "Doppelhaushälfte Ludwigshafen",
      "Haus verkaufen Rhein-Neckar",
      "Familienhaus verkaufen",
      "Immobilienmakler Doppelhaushälfte",
    ],
  },
  {
    slug: "eigentumswohnung",
    cluster: "wohnen",
    label: "Eigentumswohnungen",
    teaser: "Von der Stadtwohnung bis zur vermieteten Kapitalanlage — wir bewerten Teilungserklärung, Rücklage und Beschlusslage mit.",
    h1: "Die Experten für Eigentumswohnungen",
    h1Display: "Die Experten für Eigentums­wohnungen",
    metaTitle: "Eigentumswohnung verkaufen & bewerten | RIEGEL Immobilien",
    metaDescription:
      "Eigentumswohnung verkaufen in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar: kostenlose Bewertung, Prüfung von Teilungserklärung und Rücklage, 121.000+ aktive Suchaufträge.",
    icon: "layers",
    claim: "Vier Wände mit Eigentümerversammlung.",
    claimAkzent: "Eigentümerversammlung",
    subline: "RIEGEL – Die Experten für Eigentumswohnungen",
    heroFoto: {
      src: `${CDN}/Model-Mann-in-Wohnung.webp`,
      alt: "Wohnraum einer Eigentumswohnung",
    },
    intro:
      "Bei der Eigentumswohnung entscheidet nicht nur die Wohnung selbst, sondern die Gemeinschaft: Teilungserklärung, Höhe der Instandhaltungsrücklage, beschlossene oder anstehende Sanierungen und die Hausgeldabrechnung fließen direkt in die Kaufentscheidung ein — und in die Prüfung durch die finanzierende Bank. RIEGEL Immobilien bewertet Ihre Wohnung kostenfrei, sichtet die Unterlagen der Gemeinschaft vorab und vermittelt sowohl an Selbstnutzer als auch an Kapitalanleger aus dem eigenen Bestand.",
    usps: [
      uspSuchauftraege("Eigentumswohnungen"),
      uspBewertung,
      {
        icon: "layers",
        title: "Unterlagen der Gemeinschaft geprüft",
        text: "Teilungserklärung, Protokolle der Eigentümerversammlungen, Wirtschaftsplan und Höhe der Instandhaltungsrücklage sind bei Wohnungen kaufentscheidend. Wir sichten sie vor der Vermarktung, damit beschlossene Sanierungen oder Sonderumlagen nicht erst beim Notar auf den Tisch kommen.",
      },
      uspProvision,
    ],
    vertiefung: [vertiefungPreis("Eigentumswohnungen"), vertiefungUnterlagen, vertiefungAblauf],
    referenzHeading: "Wohnungen aus unserer Vermarktung",
    spotlightKeywords: ["Eigentumswohnung", "Wohnung verkaufen", "Wohnungsbewertung", "Kapitalanlage"],
    chips: [
      "Eigentumswohnung",
      "Etagenwohnung",
      "Erdgeschosswohnung",
      "Dachgeschosswohnung",
      "Maisonette",
      "Penthouse",
      "Vermietete Wohnung",
      "Wohnung als Kapitalanlage",
      "Seniorengerechte Wohnung",
      "Wohnung aus Nachlass",
    ],
    faq: [
      {
        q: "Welche Unterlagen brauche ich für den Verkauf einer Eigentumswohnung?",
        a: "Zusätzlich zu Grundbuchauszug, Grundrissen und Energieausweis benötigen Käufer und Banken die Teilungserklärung mit Aufteilungsplan, die Protokolle der letzten Eigentümerversammlungen, den aktuellen Wirtschaftsplan sowie die Höhe der Instandhaltungsrücklage. Wir sagen Ihnen, was fehlt, und beschaffen es auf Wunsch bei der Verwaltung.",
      },
      {
        q: "Kann ich eine vermietete Wohnung verkaufen?",
        a: "Ja. Ein bestehender Mietvertrag bleibt beim Verkauf unberührt — Kauf bricht nicht Miete (§ 566 BGB), der Käufer tritt in den laufenden Vertrag ein. Für Kapitalanleger ist eine vermietete Wohnung häufig sogar attraktiver, weil die Einnahmen ab dem ersten Tag laufen. Bei Selbstnutzer-Interessenten spielt dagegen der Kündigungsschutz eine Rolle, weshalb wir Ihre Wohnung gezielt an die passende Käufergruppe ansprechen.",
      },
      {
        q: "Was ist meine Eigentumswohnung wert?",
        a: "Bei selbst genutzten Wohnungen ist das Vergleichswertverfahren nach ImmoWertV maßgeblich, bei vermieteten Objekten fließt zusätzlich die erzielbare Miete ein. Aus unseren eigenen Abschlüssen ergeben sich in Speyer je nach Lage und Zustand rund 2.500 bis 7.000 € pro Quadratmeter, in Ludwigshafen rund 1.700 bis 4.000 €. Höhe der Rücklage und beschlossene Sanierungen wirken zusätzlich auf den Preis.",
      },
      faqProvision,
      faqDauer,
    ],
    suchen:
      "Für vorgemerkte Selbstnutzer und Kapitalanleger suchen wir laufend Eigentumswohnungen in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar — vermietet und bezugsfrei.",
    keywords: [
      "Eigentumswohnung verkaufen",
      "Wohnung verkaufen Speyer",
      "Wohnung verkaufen Ludwigshafen",
      "Eigentumswohnung bewerten",
      "Vermietete Wohnung verkaufen",
      "Wohnung Kapitalanlage verkaufen",
      "Wohnungsbewertung Rhein-Neckar",
      "Immobilienmakler Eigentumswohnung",
    ],
  },
];

let added = 0;
for (const s of neu) {
  if (seiten.some((x) => x.slug === s.slug)) {
    console.log(`skip (existiert) ${s.slug}`);
    continue;
  }
  seiten.push(s);
  added++;
  console.log(`neu  ${s.slug} — ${s.label}`);
}

if (added === 0) {
  console.log("Nichts zu tun.");
  process.exit(0);
}
writeFileSync(PATH, JSON.stringify(seiten, null, 1) + "\n");
console.log(`\n${added} Seite(n) ergänzt, jetzt ${seiten.length} Objektart-Seiten.`);

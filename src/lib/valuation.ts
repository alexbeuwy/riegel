/**
 * Bewertungs-Engine v2 (heuristisch, regionale €/m²-Basis + viele Faktoren).
 * Bewusst leicht höher angesetzt (Verkaufsargument); klar als Schätzung
 * deklariert — KEIN Verkehrswertgutachten. Client-seitig.
 *
 * v2.1: Übergroße Grundstücke werden GESTAFFELT angerechnet (nur der
 * baulandtypische Teil trägt den vollen Bodenrichtwert, Mehrflächen
 * reduziert, Restflächen als Gartenland — s. grundstuecksStaffel()), und
 * der amtliche Bodenrichtwert dämpft/hebt als Mikrolagen-Proxy die
 * Gebäude-€/m²-Basis (s. lageFaktor in estimateValue). Beides motiviert
 * durch einen echten Fall: EFH mit 3.247 m² Grundstück (davon nur ~1.300 m²
 * Bauland, Rest Gartenland) wurde zuvor mit vollem BRW auf die Gesamtfläche
 * bewertet — Ergebnis 1,67 Mio. € statt realistischer ~650 Tsd. €.
 */
export type Objektart = "wohnung" | "haus" | "grundstueck" | "gewerbe" | "mehrfamilienhaus";

/** Bauform eines Wohnhauses. Nur relevant für objektart === "haus". */
export type Haustyp =
  | "freistehend"
  | "doppelhaushaelfte"
  | "reihenendhaus"
  | "reihenmittelhaus"
  | "bungalow";

/**
 * Faktor auf den GEBÄUDE-Quadratmeterpreis je Bauform (Frage Manfred: macht es
 * einen Unterschied, ob Einfamilienhaus, Doppelhaushälfte, Reihenhaus oder
 * Bungalow?). Ja, und zwar messbar.
 *
 * QUELLE: Normalherstellungskosten 2010, Anlage 4 der ImmoWertV. Die amtliche
 * Tabelle kennt für diesen Fall genau DREI Gebäudearten, nicht fünf:
 *   freistehende Ein- und Zweifamilienhäuser   900 €/m² BGF   = 1,00
 *   Doppel- UND Reihenendhäuser (eine Zeile!)  845 €/m² BGF   = 0,94
 *   Reihenmittelhäuser                         795 €/m² BGF   = 0,88
 * (Beispiel Keller + Erdgeschoss, Flachdach, Standardstufe 3; nachgerechnet
 * über mehrere Geschoss- und Kellervarianten sowie alle fünf Standardstufen,
 * das Verhältnis bleibt konstant bei rund minus 6 und minus 12 Prozent.)
 *
 * Dass Doppelhaushälfte und Reihenendhaus denselben Wert haben, ist kein
 * Versehen, sondern bautechnisch folgerichtig: beide haben genau eine
 * gemeinsame Trennwand und drei freie Außenwände. Das Reihenmittelhaus mit
 * zwei Trennwänden ist die einzige echte dritte Stufe.
 *
 * WARUM GENAU DIESE ZAHLEN UND KEINE GRÖSSEREN:
 * Im Markt werden oft deutlich größere Abschläge genannt, von minus 20 bis
 * minus 50 Prozent. Diese Zahlen enthalten aber den GRUNDSTÜCKSANTEIL, denn
 * Reihenhausgrundstücke werden von vornherein kleiner zugeschnitten. Unsere
 * Rechnung bewertet das Grundstück bereits getrennt und mit der tatsächlich
 * eingegebenen Fläche (s. grundstuecksStaffel weiter unten). Wer hier einen
 * marktbasierten Abschlag ansetzt, zieht denselben Effekt ein zweites Mal ab
 * und rechnet Reihenhäuser systematisch zu billig. Die NHK-Werte sind reine
 * Baukostenverhältnisse und damit genau das, was auf den Gebäudeanteil gehört.
 *
 * BUNGALOW bewusst neutral bei 1,00: Die NHK kennen dafür keine eigene
 * Gebäudeart, die Bauform wird dort über Geschossigkeit und Dachform
 * abgebildet. Zwei Effekte wirken gegeneinander und heben sich der
 * Größenordnung nach auf: Ein eingeschossiges Haus ohne Keller kostet je
 * Quadratmeter rund 18 Prozent mehr (mehr Dach und mehr Bodenplatte je
 * Quadratmeter Wohnfläche, mit Keller schrumpft der Aufschlag auf etwa 6
 * Prozent), gleichzeitig steigt die Nachfrage nach ebenerdigem Wohnen. Einen
 * Auf- oder Abschlag zu erfinden, wäre hier unseriös; der höhere
 * Grundstücksbedarf schlägt ohnehin über die eingegebene Grundstücksfläche
 * durch.
 *
 * NICHT ABGEBILDET, bewusst: Der zusätzliche Markt- und Lageeffekt über die
 * Baukosten hinaus. Dafür bräuchte es die Vergleichsfaktortabellen der
 * zuständigen Gutachterausschüsse, die kostenpflichtig sind. Sobald die
 * vorliegen, gehören diese Faktoren regional nachkalibriert.
 */
export const HAUSTYP_FAKTOR: Record<Haustyp, number> = {
  freistehend: 1.0,
  doppelhaushaelfte: 0.94,
  reihenendhaus: 0.94,
  reihenmittelhaus: 0.88,
  bungalow: 1.0,
};

/**
 * Zuschlag für ein Zweifamilienhaus, also ein Haus mit zwei abgeschlossenen
 * Wohneinheiten.
 *
 * QUELLE: dieselbe amtliche Tabelle wie HAUSTYP_FAKTOR. Fußnote 2 der Anlage 4
 * ImmoWertV nennt für freistehende Zweifamilienhäuser einen Korrekturfaktor
 * von 1,05 auf den Kostenkennwert des Einfamilienhauses. Ein zweites Bad, eine
 * zweite Küche und getrennte Hausanschlüsse kosten Geld, die zweite Einheit
 * verdoppelt die Baukosten aber bei Weitem nicht.
 *
 * Wie beim Haustyp wirkt der Faktor NUR auf den Gebäudeanteil. Der Wertvorteil
 * aus der zusätzlich vermietbaren Einheit steckt hier bewusst nicht drin: Wer
 * ein Zweifamilienhaus als Kapitalanlage rechnet, ist im Rechner mit der
 * Objektart Mehrfamilienhaus richtig, die über den Ertragswert geht.
 */
export const ZWEIFAMILIEN_FAKTOR = 1.05;

export const HAUSTYPEN: { key: Haustyp; label: string; kurz: string }[] = [
  { key: "freistehend", label: "Freistehendes Haus", kurz: "Freistehend" },
  { key: "doppelhaushaelfte", label: "Doppelhaushälfte", kurz: "Doppelhaus" },
  { key: "reihenendhaus", label: "Reihenendhaus", kurz: "Reihenende" },
  { key: "reihenmittelhaus", label: "Reihenmittelhaus", kurz: "Reihenmitte" },
  { key: "bungalow", label: "Bungalow", kurz: "Bungalow" },
];
export type Zustand = "neuwertig" | "gepflegt" | "renovierungsbeduerftig";
export type Qualitaet = "einfach" | "normal" | "gehoben" | "luxus";
/**
 * Vermietungsstand eines Mehrfamilienhauses. Motiviert durch einen echten
 * Fall (Rückfrage Manfred): leerstehende Zinshäuser ohne Mieteinnahmen
 * ergaben im Ertragswert-Ansatz 0 €, weil die Jahresnettokaltmiete Pflicht
 * war — Eigentümer mussten eine „fiktive Miete" erfinden. Bei "leer" und
 * "teilweise" setzt die Engine für die leerstehenden Flächen selbst eine
 * marktübliche Miete an (s. marktmieteM2).
 */
export type Vermietungsstand = "vermietet" | "teilweise" | "leer";

export interface ValuationInput {
  objektart: Objektart;
  ort: string;
  plz?: string;
  addressLabel?: string;
  lat?: number;
  lng?: number;
  wohnflaeche?: number;
  grundflaeche?: number;
  zimmer?: number;
  badezimmer?: number;
  baujahr?: number;
  zustand: Zustand;
  qualitaet: Qualitaet;
  energieklasse?: string;
  ausstattung: string[];
  /** Bauform, nur für objektart === "haus" (s. HAUSTYP_FAKTOR). */
  haustyp?: Haustyp;
  /** Zweite abgeschlossene Wohneinheit im Haus (s. ZWEIFAMILIEN_FAKTOR). */
  zweifamilienhaus?: boolean;
  /**
   * Nur für objektart === "mehrfamilienhaus" (Zinshaus/Mehrparteienhaus):
   * Ertragswert-Eingaben statt reiner Flächen-Rechnung — s. estimateValue.
   */
  jahresnettokaltmiete?: number;
  wohneinheiten?: number;
  gewerbeeinheiten?: number;
  /**
   * Nur "mehrfamilienhaus": Vermietungsstand. Ohne Angabe "vermietet" —
   * dadurch rechnen bestehende Aufrufe unverändert (Ist-Miete × Faktor).
   */
  vermietungsstand?: Vermietungsstand;
  /** Nur "mehrfamilienhaus" + "teilweise": leerstehende Wohnfläche in m². */
  leerstehendeWohnflaeche?: number;
  /**
   * Nur "gewerbe": Anteil Hallen-/Lagerfläche an der Gesamtnutzfläche in m².
   * Hallen erzielen deutlich niedrigere €/m² als Büroflächen — ohne diese
   * Aufteilung wurde ein Bürogebäude mit Halle wie reine Bürofläche bewertet
   * (Hinweis Manfred: Objekte in Bensheim und Edenkoben).
   */
  hallenflaeche?: number;
  /**
   * Nur "gewerbe": Wohnfläche abgeschlossener Wohneinheiten im Objekt, in m²
   * (Mischobjekt im Misch-/Dorfgebiet — Hinweis Manfred: Halle mit zwei
   * Wohnungen und Büro auf 1.692 m² Grundstück). Wie `hallenflaeche` ein
   * Anteil AN der Gesamtnutzfläche: Büro/Praxis ergibt sich als Rest.
   * Ohne diese Angabe wurden Wohnungen zum (niedrigeren) Büro-Satz bewertet.
   */
  mischWohnflaeche?: number;
  /**
   * Nur "wohnung": monatliches Hausgeld in € (WEG-Kosten). Fall Manfred
   * 11.08.2026 („Landauer Warte", Speyer): 700 €/Monat bei 105 m² — der
   * größte reale Preisdrücker der Wohnung, das Modell kannte ihn nicht.
   * Hohes Hausgeld frisst dem Käufer Finanzierungsspielraum und signalisiert
   * Instandhaltungslast der Anlage (s. hausgeldFaktor in estimateValue).
   */
  hausgeldMonat?: number;
  /**
   * Wohnung/Haus: Kernsanierung (Elektrik, Leitungen, Fenster, Heizung
   * erneuert). Ohne diese Angabe wertet die Engine „neuwertig" bei
   * Altbaujahren als „gepflegt" — eine Renovierung (Böden, Bäder, Malerei)
   * macht aus einem 1972er-Bau kein neuwertiges Objekt, der Zustand-Bonus
   * hebelte sonst den Baujahr-Abschlag aus (derselbe Fall Manfred).
   */
  kernsaniert?: boolean;
}

export interface ValuationFactor {
  label: string;
  effectPct: number; // +/- in %
}

/**
 * Aufschlüsselung der gestaffelten Grundstücksanrechnung (m² je Stufe +
 * resultierender €-Wert) — Grundlage für die Transparenz-Hinweise in
 * Rechner-UI und PDF-Report („übergroßes Grundstück").
 */
export interface GrundstuecksAnrechnung {
  baulandM2: number;
  mehrflaecheM2: number;
  gartenlandM2: number;
  /** Summe der drei Stufen in € (bei Haus inkl. der 0,6-Dämpfung). */
  wert: number;
}

/**
 * Aufteilung der Nutzfläche eines Gewerbe-/Mischobjekts in Büro-, Hallen-
 * und Wohnanteil samt der je Anteil angesetzten €/m² — nur bei objektart
 * "gewerbe" mit Hallen- oder Wohnanteil gesetzt. Grundlage der
 * Transparenz-Hinweise in Rechner-UI und PDF: ohne die Aufschlüsselung ist
 * für den Eigentümer nicht nachvollziehbar, dass die drei Flächenarten
 * unterschiedlich bewertet werden.
 */
export interface FlaechenAufteilung {
  bueroM2: number;
  halleM2: number;
  wohnM2: number;
  /** Angesetzte €/m² je Flächenart (Büro = ausgewiesener pricePerSqm). */
  bueroSatz: number;
  halleSatz: number;
  wohnSatz: number;
}

/**
 * Wie die Miete im Ertragswert-Ansatz zustande kam — nur bei
 * objektart "mehrfamilienhaus" gesetzt. Macht in UI und PDF transparent,
 * welcher Teil tatsächlich erzielte Miete ist und welcher Teil eine von uns
 * angesetzte marktübliche Miete für leerstehende Flächen.
 */
export interface MietAnsatz {
  /** Tatsächlich erzielte Jahresnettokaltmiete (0 bei Vollleerstand). */
  istMiete: number;
  /** Für leerstehende Flächen angesetzte marktübliche Jahresmiete. */
  marktmieteGeschaetzt: number;
  /** Dabei angesetzte Monatsmiete je m² (Neuvermietungsniveau). */
  marktmieteM2: number;
  /** Leerstehende Wohnfläche in m², auf die sich die Schätzung bezieht. */
  leerstandM2: number;
  /** Leerstandsanteil an der Wohnfläche (0–1). */
  leerstandAnteil: number;
  /** Abschlag für Vermietungsrisiko/fehlenden Cashflow in % (0–8). */
  abschlagPct: number;
  /** Bewertungsrelevante Jahresmiete: istMiete + marktmieteGeschaetzt. */
  ansatzMiete: number;
}

/**
 * Aggregat ECHTER Abschlüsse des Orts (€/m² Wohnfläche) — kommt server-seitig
 * aus src/lib/verkauft-stats.ts (OnOffice-Verkauft-Pool) bzw. im Client über
 * /api/marktstats. Die Engine nutzt p75 als Plausibilitäts-Deckel und n als
 * ehrliche Vergleichsobjekt-Zahl. Bewusst als eigener Typ hier (statt Import
 * aus verkauft-stats): valuation.ts läuft im Client, verkauft-stats ist
 * server-only.
 */
export interface OrtsStats {
  n: number;
  medianQm: number;
  p75Qm: number;
}

/**
 * Transparenz-Daten, wenn der Modellwert an den echten Abschlüssen des Orts
 * gedeckelt wurde (s. Plausibilisierung in estimateValue).
 */
export interface Plausibilisierung {
  /** Anzahl echter Abschlüsse, auf denen der Deckel beruht. */
  n: number;
  /** 75 %-Perzentil der echten Abschlüsse in €/m² (der Deckel). */
  p75Qm: number;
  /** Ungedeckelter Modellwert (mid) — für die ehrliche Einordnung im PDF. */
  modellMid: number;
}

export interface ValuationResult {
  low: number;
  mid: number;
  high: number;
  /** Bei "mehrfamilienhaus" nur gesetzt, wenn wohnflaeche vorliegt (mid / wohnflaeche) —
   * ein Ertragswert hat keinen zwingenden €/m²-Bezug. Sonst immer gesetzt. */
  pricePerSqm?: number;
  comparables: number;
  confidence: number;
  trendPct: number;
  bodenrichtwert: number;
  mikrolage: number;
  rentYieldPct: number;
  /** Ertragswert-Vervielfältiger (Jahresnettokaltmiete × Vervielfältiger = Ertragswert),
   * nur bei objektart === "mehrfamilienhaus" gesetzt — s. mfhVervielfaeltiger(). */
  vervielfaeltiger?: number;
  /** Zusammensetzung der angesetzten Miete — nur bei "mehrfamilienhaus". */
  mietAnsatz?: MietAnsatz;
  /** Gestaffelte Grundstücksanrechnung — nur bei objektart "haus" oder
   * "grundstueck" mit grundflaeche > 0 gesetzt (s. grundstuecksStaffel()). */
  grundstuecksAnrechnung?: GrundstuecksAnrechnung;
  /** Büro/Halle/Wohnen-Split beim Gewerbe-/Mischobjekt — nur bei "gewerbe"
   * mit Hallen- oder Wohnanteil gesetzt (s. FlaechenAufteilung). */
  flaechenAufteilung?: FlaechenAufteilung;
  /** Gesetzt, wenn der Modellwert am p75 echter Orts-Abschlüsse gedeckelt wurde. */
  plausibilisierung?: Plausibilisierung;
  /**
   * Modell-Annahmen und -Eingriffe in Klartext (z. B. „neuwertig ohne
   * Kernsanierung als gepflegt gewertet") — Rechner-UI und PDF zeigen sie an,
   * damit der Eigentümer nachvollziehen kann, warum das Modell von seiner
   * Selbsteinschätzung abweicht. Erwartungsmanagement statt Überraschung im
   * Vor-Ort-Termin (Hinweis Manfred, Fall „Landauer Warte").
   */
  annahmen: string[];
  factors: ValuationFactor[];
}

// KALIBRIERT AN ECHTEN ONOFFICE-ABSCHLÜSSEN (Lauf 11.08.2026, Fall Manfred
// „Landauer Warte"; scripts/preisanalyse-onoffice.mts, 774 Verkauft-Records,
// 543 verwertbar, MFH/Zinshäuser aus der Haus-Statistik gefiltert):
//
//   Regel 1: Hartkodiert wird nur ab n >= 20 je Ort+Kategorie — darunter
//     bleibt der Modellwert stehen und der Laufzeit-p75-Deckel
//     (opts.ortsStats / verkauft-stats.ts) regelt allein.
//   Regel 2 (Wohnung): Basis = Median ÷ 0,93 (der Pool ist ein typischer
//     Altbau-Mix, ≈ Baujahr-Faktor) — Speyer 3.200 (n=79) → 3.450;
//     Ludwigshafen 2.550 (n=39) → 2.750.
//   Regel 3 (Haus): Verkaufs-€/m² ENTHALTEN das Grundstück, die Engine
//     addiert es separat → typischen Bodenanteil abziehen (BRW × 0,6 × 3,
//     d. h. 420 m² Grund je 140 m² Wfl.), dann ÷ 0,93 — Speyer 3.950
//     (n=45) → 3.100; Ludwigshafen 2.850 (n=28) → 2.250; Schifferstadt
//     3.050 (n=20) → 2.500.
//
// Frankenthal/Neustadt/Mannheim/Heidelberg/Vorderpfalz: keine belastbare
// eigene Fallzahl im Pool (n < 20) — Modellwerte, bewusst unverändert.
// Neu kalibrieren: preisanalyse-onoffice.mts (gibt den fertigen Vorschlag
// samt Übernahme-Regeln aus; braucht OnOffice-Credentials).
const REGIONS: Record<string, { wohnung: number; haus: number; gewerbe: number; boden: number }> = {
  speyer: { wohnung: 3450, haus: 3100, gewerbe: 2450, boden: 590 },
  ludwigshafen: { wohnung: 2750, haus: 2250, gewerbe: 1950, boden: 430 },
  schifferstadt: { wohnung: 3200, haus: 2500, gewerbe: 1900, boden: 410 },
  frankenthal: { wohnung: 3050, haus: 2900, gewerbe: 1850, boden: 415 },
  neustadt: { wohnung: 3550, haus: 3400, gewerbe: 2050, boden: 490 },
  mannheim: { wohnung: 3800, haus: 3600, gewerbe: 2550, boden: 570 },
  heidelberg: { wohnung: 5000, haus: 4700, gewerbe: 3050, boden: 860 },
  vorderpfalz: { wohnung: 3350, haus: 3200, gewerbe: 1900, boden: 390 },
};
const DEFAULT_REGION = { wohnung: 3350, haus: 3200, gewerbe: 1900, boden: 400 };

const ZUSTAND_FACTOR: Record<Zustand, number> = {
  neuwertig: 1.12,
  gepflegt: 1.0,
  renovierungsbeduerftig: 0.84,
};
const QUALITAET_FACTOR: Record<Qualitaet, number> = {
  einfach: 0.9,
  normal: 1.0,
  gehoben: 1.12,
  luxus: 1.25,
};
const ENERGIE_FACTOR: Record<string, number> = {
  "A+": 1.06, A: 1.05, B: 1.03, C: 1.0, D: 0.98, E: 0.96, F: 0.93, G: 0.9, H: 0.88,
};

// Nach unten nachgeschärft (02.08.2026, Fall Eberle): Bj. 1960 lag mit −8 %
// zu nah am Neubauniveau. Homeday nennt für dieselbe Adresse 3.000 €/m² im
// Schnitt über ALLE Baujahre; ein unsanierter 60er-Bau liegt darunter, nicht
// darüber. Die Stufen bleiben bewusst grob — das Formular fragt keine
// Modernisierungshistorie ab, mehr Präzision wäre vorgetäuscht.
function baujahrFactor(y?: number): number {
  if (!y) return 1.0;
  if (y >= 2015) return 1.1;
  if (y >= 2000) return 1.03;
  if (y >= 1980) return 0.97;
  if (y >= 1960) return 0.9;
  if (y >= 1945) return 0.86;
  return 0.84;
}

/**
 * Flächendämpfung: €/m² sinkt mit der Objektgröße — der Käuferkreis für
 * 240 m² ist klein, der Gesamtpreis deckelt den Quadratmeterpreis.
 *
 * Am eigenen Verkauft-Pool gemessen (Böhl-Iggelheim/Schifferstadt): Objekte
 * mit 235–304 m² erzielten 1.613–2.354 €/m², normale Größen um 2.900–3.000.
 * Der Rechner kannte diesen Effekt überhaupt nicht und bewertete 240 m² zum
 * vollen Satz — Hauptursache (neben dem Faktor-Stapel) der 1.086.000-€-
 * Schätzung im Fall Eberle.
 *
 * Referenzgrößen so gewählt, dass NORMALE Objekte unberührt bleiben: die
 * 106-m²-Wohnungen im Pool verkauften sich am OBEREN Rand der Spanne, erst
 * darüber beginnt die Dämpfung. Exponent 0,45 aus dem gemessenen Verhältnis,
 * Boden bei 0,75 (mehr als −25 % gibt die Datenlage nicht her). Unterhalb der
 * Referenz gibt es bewusst KEINEN Zuschlag (kleine Objekte erzielen zwar oft
 * mehr je m², aber "lieber kleiner nennen" gilt auch hier).
 */
const FLAECHEN_REF_M2: Partial<Record<Objektart, number>> = { wohnung: 110, haus: 160 };
function flaechenFaktor(objektart: Objektart, wohnflaeche?: number): number {
  const ref = FLAECHEN_REF_M2[objektart];
  if (!ref || !wohnflaeche || wohnflaeche <= ref) return 1;
  return Math.max(0.75, Math.pow(ref / wohnflaeche, 0.45));
}

/**
 * Hausgeld-Abschlag für Eigentumswohnungen (Fall Manfred „Landauer Warte":
 * 700 €/Monat bei 105 m² = 6,67 €/m² — real der größte Preisdrücker, das
 * Modell kannte ihn nicht).
 *
 * Herleitung: Bis ~3,50 €/m²/Monat ist Hausgeld marktüblich und bereits im
 * Preisniveau enthalten. Jeder Euro darüber ist dauerhafte Mehrbelastung, die
 * Käufer kapitalisieren (12 Monate × ~11er-Jahresfaktor ≈ 130 € Wertabschlag
 * je €/m²/Monat Mehrbelastung — bei 3.500 €/m²-Niveau knapp 4 %). Linear bis
 * 6,50 €/m², dort gedeckelt bei −12 %: mehr gibt die Heuristik nicht her,
 * extreme Fälle (Sonderumlagen, Sanierungsstau der WEG) gehören in den
 * Vor-Ort-Termin, nicht in ein Online-Modell.
 */
const HAUSGELD_NORMAL_M2 = 3.5;
const HAUSGELD_KAPPE_M2 = 6.5;
const HAUSGELD_MAX_ABSCHLAG = 0.12;
function hausgeldFaktor(objektart: Objektart, hausgeldMonat?: number, wohnflaeche?: number): number {
  if (objektart !== "wohnung" || !hausgeldMonat || !wohnflaeche || wohnflaeche <= 0) return 1;
  const proM2 = hausgeldMonat / wohnflaeche;
  if (proM2 <= HAUSGELD_NORMAL_M2) return 1;
  const anteil = Math.min(proM2 - HAUSGELD_NORMAL_M2, HAUSGELD_KAPPE_M2 - HAUSGELD_NORMAL_M2) /
    (HAUSGELD_KAPPE_M2 - HAUSGELD_NORMAL_M2);
  return 1 - anteil * HAUSGELD_MAX_ABSCHLAG;
}

/**
 * djb2-Hash (XOR-Variante) — BIT-IDENTISCH zu djb2() in marktdaten.ts, damit
 * der Rechner-Trend für z. B. „speyer" exakt dem Preisatlas-Trend entspricht
 * (Rechner und Preisatlas dürfen nicht zwei verschiedene Trends erzählen).
 * Dupliziert statt importiert: marktdaten.ts importiert bereits regionKey von
 * hier, ein Rückimport wäre ein Zirkelbezug (gleiches Muster wie
 * regionalRentYieldPct).
 */
function ortHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// Deal-orientiert bewusst OHNE pauschalen Markt-Aufschlag (früher 1,06):
// leicht konservative Einstiegspreise führen eher zum Abschluss als
// optimistische Wunschwerte, die das Objekt zum Ladenhüter machen
// (Vorgabe Inhaberseite). Konstante bleibt als dokumentierter Stellhebel.
const OPTIMISM = 1.0;

/**
 * Deterministischer Regio-Ansatz für die Mietrendite (Basis für den
 * Ertragswert-Vervielfältiger bei Mehrfamilienhäusern) — sinkt mit
 * steigendem €/m²-Wohnungs-Niveau der Region, dasselbe Muster wie
 * yieldFor() in lib/marktdaten.ts. Bewusst hier lokal nachgebildet statt
 * importiert: marktdaten.ts importiert bereits regionKey() von hier, ein
 * Rückimport würde einen Zirkelbezug erzeugen.
 */
function regionalRentYieldPct(basisWohnung: number): number {
  const raw = 6.4 - (basisWohnung / 1000) * 0.62;
  return Math.min(5.2, Math.max(2.6, raw));
}

/**
 * Ertragswert-Vervielfältiger (Jahresnettokaltmiete × Vervielfältiger ≈
 * Ertragswert) — DEAL-ORIENTIERT kalibriert: tatsächlich abgeschlossene
 * Zinshaus-Deals in der Region liegen realistisch bei 15–16fach, bei
 * Top-Zustand um 18fach, nicht darüber (Vorgabe Inhaberseite; die reine
 * 100/Rendite-Rechnung landete zuvor bei 22–30 und produzierte
 * Wunschpreise ohne Abschlusschance).
 *
 * Aufbau: das regionale Preisniveau (100/Mietrendite, roh 20–30) wird
 * linear auf eine Basis von 14,5–16,5 gestaucht; Zustand und Qualität
 * verschieben gedämpft (+1,3 neuwertig / −1,6 renovierungsbedürftig,
 * ±0,4 Qualität). Harte Bandbreite 12,5–18. Ersetzt KEINE echte
 * Ertragswertermittlung (Bewirtschaftungskosten, Liegenschaftszins etc.).
 */
function mfhVervielfaeltiger(basisWohnung: number, zustand: Zustand, qualitaet: Qualitaet): number {
  const raw = 100 / regionalRentYieldPct(basisWohnung);
  const basis = 14.5 + (Math.min(30, Math.max(20, raw)) - 20) * 0.2;
  const zAdj = zustand === "neuwertig" ? 1.3 : zustand === "renovierungsbeduerftig" ? -1.6 : 0;
  const qAdj = qualitaet === "luxus" ? 0.4 : qualitaet === "gehoben" ? 0.2 : qualitaet === "einfach" ? -0.3 : 0;
  return Math.round(Math.min(18, Math.max(12.5, basis + zAdj + qAdj)) * 10) / 10;
}

/**
 * Marktübliche Netto-Kaltmiete in €/m²/Monat für LEERSTEHENDE Wohnflächen
 * (Neuvermietungsniveau) — die Engine setzt sie selbst an, damit Eigentümer
 * leerstehender Zinshäuser keine „fiktive Miete" schätzen müssen.
 *
 * Abgeleitet aus dem regionalen Wohnungs-Kaufpreisniveau (basisWohnung / 380),
 * geklemmt auf 6,50–16 €/m². Der Divisor ist an plausiblen Regionsmieten
 * kalibriert: Speyer 3.950 → ca. 10,40 €/m², Ludwigshafen 2.850 → ca.
 * 7,50 €/m², Heidelberg 5.000 → ca. 13,15 €/m².
 *
 * Zustand und Qualität wirken bewusst GEDÄMPFTER als bei Kaufpreisen (Mieten
 * streuen schwächer): ein renovierungsbedürftiges Haus erzielt real weniger
 * Miete. Hinweis: beide verschieben zusätzlich den Vervielfältiger (s.
 * mfhVervielfaeltiger). Die kleine Überlappung ist gewollt — sie wirkt in
 * beide Richtungen konservativ und bleibt wegen der schwachen Faktoren klein.
 */
function marktmieteM2(basisWohnung: number, zustand: Zustand, qualitaet: Qualitaet): number {
  const basis = Math.min(16, Math.max(6.5, basisWohnung / 380));
  const zAdj = zustand === "neuwertig" ? 1.1 : zustand === "renovierungsbeduerftig" ? 0.85 : 1;
  const qAdj = qualitaet === "luxus" ? 1.12 : qualitaet === "gehoben" ? 1.06 : qualitaet === "einfach" ? 0.95 : 1;
  return Math.round(basis * zAdj * qAdj * 100) / 100;
}

/**
 * Kleine Mehrfamilienhäuser (2–4 Wohneinheiten) — Fall Manfred 12.08.2026
 * (3-Familienhaus Ludwigshafen, leer, 500 m² Grundstück): Der reine
 * Ertragswert ergab 1.186 €/m², die 57 ECHTEN MFH-Abschlüsse des
 * OnOffice-Pools liegen beim Median 2.273 €/m² (LU 1.942 bei n=14, Speyer
 * 2.313 bei n=9). Zwei Gründe: Käufer kleiner MFH sind überwiegend
 * Eigennutzer (selbst wohnen + vermieten) und zahlen Wohnhaus-Niveau, und
 * der Ertragswert-Zweig ignorierte das Grundstück komplett.
 *
 * Deshalb rechnet die Engine bei 1–4 WE ZUSÄTZLICH einen Vergleichswert wie
 * beim Wohnhaus (gleiche Faktorkette + Grundstücks-Staffel, Gebäudebasis =
 * r.haus × 0,65) und nimmt das MAXIMUM beider Ansätze. 0,65 ist an den
 * Pool-Medianen kalibriert: nach Abzug des typischen Bodenanteils liegt der
 * MFH-Gebäudewert bei ~0,61 (Speyer) bis ~0,73 (LU) des Eigenheim-Niveaus —
 * 0,65 bewusst am unteren Rand („lieber kleiner nennen"). Der Ertragswert
 * bleibt maßgeblich für 5+ WE und immer dann, wenn er höher liegt (voll
 * vermietet mit starker Ist-Miete). Leerstand ist im Vergleichswert bewusst
 * KEIN Abschlag: für den Eigennutzer-Käufer ist „bezugsfrei" ein Vorteil.
 */
const MFH_KLEIN_MAX_WE = 4;
const MFH_KLEIN_GEBAEUDE_FAKTOR = 0.65;

/**
 * Maximaler Abschlag bei Vollleerstand (%). Begründung: der Käufer bekommt ab
 * Tag 1 keinen Cashflow, trägt Vermietungsaufwand und -risiko, und die
 * angesetzte Marktmiete ist ein Neuvermietungswert (also am oberen Rand
 * dessen, was ein Bestandsobjekt real einbringt). Linear nach Leerstandsanteil.
 */
const LEERSTAND_ABSCHLAG_MAX_PCT = 8;

/**
 * Anteil des Büro-Quadratmeterpreises, mit dem Hallen- und Lagerflächen
 * angesetzt werden. Hallen sind einfacher konstruiert, schlechter
 * drittverwendbar und erzielen in der Region regelmäßig nur einen Bruchteil
 * des Büro-Niveaus; 0,45 liegt im üblichen Korridor und ist bewusst
 * konservativ. Heuristik, kein Ersatz für eine Sachwertermittlung.
 */
const HALLEN_FAKTOR = 0.45;

/**
 * Dämpfung des Wohnungs-Quadratmeterpreises für Wohnflächen IN einem
 * Gewerbeobjekt (Mischobjekt: Wohnungen über bzw. neben Halle und Büro).
 * Solche Wohnungen erzielen nicht das Niveau einer reinen Wohnlage: das
 * Umfeld ist gewerblich geprägt (Hof-, Rangier- und Lieferverkehr), der
 * Käuferkreis sind Eigennutzer-Betreiber und Anleger, kein klassischer
 * Wohnungsmarkt. −10 % ist bewusst moderat — die Misch-Nutzung selbst wird
 * nicht doppelt bestraft, das Grundstück läuft ja bereits über die
 * konservativere Gewerbe-Staffel. Heuristik, kein Sachwert-Ersatz.
 */
const MISCH_WOHN_FAKTOR = 0.9;

/**
 * Gartenland-Satz in €/m² für nicht baulandtypische Restflächen — grob am
 * BRW-Niveau orientiert (6 %), geklemmt auf das in der Region übliche
 * Gartenland-Band von 5–15 €/m² (Praxisbeispiel Kleinkarlbach: 7 €/m²).
 */
function gartenlandSatz(brw: number): number {
  return Math.min(15, Math.max(5, Math.round(brw * 0.06)));
}

/** Staffelgrenzen (m²): bis wohin voller Ansatz, bis wohin Mehrfläche. */
const STAFFEL = {
  haus: { voll: 700, mehrBis: 1400, mehrSatz: 0.25 },
  grundstueck: { voll: 1000, mehrBis: 2500, mehrSatz: 0.35 },
  // Gewerbe: Betriebsgrundstücke sind typischerweise deutlich größer als
  // Hausgrundstücke und die Fläche ist betrieblich nutzbar (Hof, Rangier- und
  // Stellflächen, Zufahrt) — daher eine höhere Vollansatz-Grenze und ein
  // höherer Satz für die Mehrfläche als beim Haus. Motiviert durch echte
  // Objekte (Hinweis Manfred: Bürogebäude mit Halle und Grundstück in
  // Bensheim, ehemaliges Autohaus in Edenkoben).
  gewerbe: { voll: 1500, mehrBis: 5000, mehrSatz: 0.45 },
} as const;

/**
 * Gestaffelte Grundstücksanrechnung („übergroßes Grundstück") — Standard-
 * Bewertungspraxis: nur die baulandtypische Teilfläche trägt den vollen
 * Bodenrichtwert, eine begrenzte Mehrfläche (übergroßer Hausgarten,
 * Arrondierung) wird deutlich reduziert angesetzt, alles darüber nur noch
 * zum Gartenland-Satz. Ohne diese Staffel wurde z. B. ein EFH mit 3.247 m²
 * Grundstück (davon real nur ~1.300 m² Bauland) mit BRW × Gesamtfläche
 * bewertet und landete bei 1,67 Mio. € statt ~650 Tsd. €.
 *
 * Bei art "haus" bleibt die bisherige 0,6-Dämpfung auf dem Bauland-Anteil
 * erhalten (der Gebäude-€/m² enthält bereits implizit einen Lageanteil) —
 * Grundstücke bis 700 m² rechnen dadurch exakt wie zuvor, die Kalibrierung
 * normaler Fälle ändert sich nicht.
 *
 * Bei art "gewerbe" wird mit 0,7 gedämpft: etwas weniger als beim Haus, weil
 * der Gewerbe-€/m² den Grundstücksanteil schwächer mitträgt als ein
 * Hauspreis, aber nicht voll wie beim reinen Grundstück.
 */
export function grundstuecksStaffel(
  flaeche: number,
  brw: number,
  art: "haus" | "grundstueck" | "gewerbe",
): GrundstuecksAnrechnung {
  const s = STAFFEL[art];
  const vollSatz = art === "haus" ? 0.6 : art === "gewerbe" ? 0.7 : 1.0;
  const baulandM2 = Math.min(Math.max(flaeche, 0), s.voll);
  const mehrflaecheM2 = Math.min(Math.max(flaeche - s.voll, 0), s.mehrBis - s.voll);
  const gartenlandM2 = Math.max(flaeche - s.mehrBis, 0);
  const wert = Math.round(
    baulandM2 * vollSatz * brw + mehrflaecheM2 * s.mehrSatz * brw + gartenlandM2 * gartenlandSatz(brw),
  );
  return { baulandM2, mehrflaecheM2, gartenlandM2, wert };
}

export function regionKey(ort: string): string {
  const o = (ort || "").toLowerCase();
  for (const k of Object.keys(REGIONS)) if (o.includes(k)) return k;
  if (o.includes("pfalz")) return "vorderpfalz";
  return "";
}

export interface EstimateOptions {
  /**
   * Amtlicher Bodenrichtwert (€/m², z. B. von BORIS-RLP), ersetzt den
   * regionalen Modellwert `r.boden` in der Grundstücks-/Haus-Bodenanteil-
   * Rechnung UND im zurückgegebenen `bodenrichtwert`-Feld. Optional —
   * bestehende Aufrufe ohne `opts` bleiben unverändert gültig.
   */
  bodenrichtwert?: number;
  /**
   * Aggregat echter Orts-Abschlüsse derselben Kategorie (Server:
   * verkauft-stats.ts, Client: /api/marktstats). Wirkt nur bei Wohnung/Haus:
   * p75 deckelt den Modellwert (Plausibilisierung), n wird als ehrliche
   * `comparables`-Zahl ausgewiesen. Ohne Angabe rechnet die Engine wie
   * bisher rein modellbasiert (comparables = 0, UI zeigt „Modellwert").
   */
  ortsStats?: OrtsStats;
}

export function estimateValue(input: ValuationInput, opts?: EstimateOptions): ValuationResult {
  const bekannteRegion = regionKey(input.ort) !== "";
  const r = REGIONS[regionKey(input.ort)] ?? DEFAULT_REGION;
  const boden = opts?.bodenrichtwert ?? r.boden;
  const ausstBonus = Math.min(input.ausstattung.length * 0.012, 0.08);
  const bf = baujahrFactor(input.baujahr);
  const annahmen: string[] = [];

  // SELBSTAUSKUNFT ERDEN (Fall Manfred „Landauer Warte", 11.08.2026): Eine
  // renovierte 1972er-Wohnung wurde als „neuwertig" eingegeben — +7 % Zustand
  // hebelten die −10 % Baujahr fast aus, das Objekt rechnete wie ein Neubau.
  // Renoviert (Böden, Bäder, Malerei) ist aber nicht kernsaniert (Elektrik,
  // Leitungen, Fenster, Heizung): „neuwertig" gilt bei Baujahren vor 1995 nur
  // noch MIT Kernsanierungs-Angabe, sonst wird wie „gepflegt" gerechnet —
  // sichtbar gemacht über `annahmen`, nicht stillschweigend.
  const altbau = (input.baujahr ?? 9999) < 1995;
  const flaechenObjekt = input.objektart === "wohnung" || input.objektart === "haus";
  let zustandEffektiv: Zustand = input.zustand;
  if (flaechenObjekt && input.zustand === "neuwertig" && altbau && !input.kernsaniert) {
    zustandEffektiv = "gepflegt";
    annahmen.push(
      `Zustand „neuwertig" bei Baujahr ${input.baujahr} ohne Kernsanierung: als „gepflegt" gewertet. Mit Kernsanierung (Elektrik, Leitungen, Fenster, Heizung) gilt der volle Zustands-Bonus.`,
    );
  }

  // Fehlende Energieklasse ist bei Altbauten KEINE neutrale Information: ein
  // nicht kernsanierter Bau vor 1980 liegt real fast nie bei C (Faktor 1,0).
  // Konservative Annahme Klasse E — transparent ausgewiesen; die echte
  // Klasse aus dem Energieausweis überschreibt die Annahme jederzeit.
  let energieklasseEffektiv = input.energieklasse;
  if (!energieklasseEffektiv && flaechenObjekt && (input.baujahr ?? 9999) < 1980 && !input.kernsaniert) {
    energieklasseEffektiv = "E";
    annahmen.push(
      `Energieklasse nicht angegeben (Baujahr ${input.baujahr}, keine Kernsanierung): konservative Annahme Klasse E. Der echte Energieausweis präzisiert das Ergebnis.`,
    );
  }
  // AUFWERTUNGS-KOMPRESSION (Fall Eberle, 02.08.2026): Zustand, Qualität,
  // Energieklasse und Ausstattung stapelten sich multiplikativ ungebremst —
  // neuwertig × gehoben × Ausstattung × BRW-Lage ergab +47 % und damit
  // 4.526 €/m² für eine 1960er-Wohnung in Böhl-Iggelheim, über dem lokalen
  // Preisatlas-MAXIMUM (4.325) und weit über jedem echten Abschluss dort
  // (Wohnungs-Median 2.920, gemessen am Verkauft-Pool).
  //
  // Jede Aufwertung über 1 wird deshalb mit Exponent 0,6 gestaucht
  // ((a·b·c)^0,6 = a^0,6·b^0,6·c^0,6 — die Stauchung je Faktor entspricht
  // exakt der Stauchung des Produkts, die angezeigten Prozente bleiben also
  // ehrlich). ABWERTUNGEN bleiben ungestaucht: lieber einen kleineren Preis
  // nennen, der zum Abschluss führt, als einen Wunschwert (Vorgabe Alex,
  // "tendenziell lieber kleineren Preis"). Der BRW-Lagefaktor bleibt voll —
  // er ist amtlich gemessen, keine Selbstauskunft.
  const stauche = (f: number) => (f > 1 ? Math.pow(f, 0.6) : f);
  const zf = stauche(ZUSTAND_FACTOR[zustandEffektiv]);
  const qf = stauche(QUALITAET_FACTOR[input.qualitaet]);
  const efRoh = energieklasseEffektiv ? ENERGIE_FACTOR[energieklasseEffektiv] ?? 1.0 : 1.0;
  const ef = stauche(efRoh);
  const ausstFaktor = stauche(1 + ausstBonus);
  const hgFaktor = hausgeldFaktor(input.objektart, input.hausgeldMonat, input.wohnflaeche);

  let pricePerSqm: number | undefined;
  let mid: number;
  let vervielfaeltiger: number | undefined;
  let mietAnsatz: MietAnsatz | undefined;
  /** true, wenn ein kleines MFH im Vergleichswert-Ansatz bewertet wurde —
   * dann zeigen UI/PDF die Faktor-Zerlegung statt der Ertragswert-Herleitung. */
  let mfhVergleichswert = false;
  let grundstuecksAnrechnung: GrundstuecksAnrechnung | undefined;
  let flaechenAufteilung: FlaechenAufteilung | undefined;

  if (input.objektart === "grundstueck") {
    // Gestaffelte Bodenbewertung (s. grundstuecksStaffel): bis 1.000 m² voll,
    // bis 2.500 m² zu 35 %, darüber Gartenland-Satz. pricePerSqm ist damit
    // das EFFEKTIVE Ø-Niveau über die Gesamtfläche (mid / Fläche) — der rohe
    // amtliche Wert bleibt im Feld `bodenrichtwert` erhalten.
    const flaeche = input.grundflaeche ?? 0;
    grundstuecksAnrechnung = flaeche > 0 ? grundstuecksStaffel(flaeche, boden, "grundstueck") : undefined;
    mid = Math.round((grundstuecksAnrechnung?.wert ?? 0) * (1 + ausstBonus) * OPTIMISM);
    pricePerSqm = flaeche > 0 ? Math.round(mid / flaeche) : Math.round(boden * (1 + ausstBonus) * OPTIMISM);
  } else if (input.objektart === "mehrfamilienhaus") {
    // Ertragswert-Ansatz statt Flächen-Rechnung: Jahresnettokaltmiete ×
    // Vervielfältiger (deal-orientiert 12,5–18, s. mfhVervielfaeltiger()).
    // Zustand/Qualität fließen GEDÄMPFT in den Vervielfältiger selbst ein
    // („Top-Zustand mal 18fach"); die Werttreiber-Faktoren unten bleiben für
    // diesen Objekttyp trotzdem leer, weil ihr Effekt bereits im Faktor
    // steckt und nicht doppelt erscheinen darf.
    //
    // Leerstand: für nicht vermietete Flächen setzen wir eine marktübliche
    // Miete an (s. marktmieteM2) und ziehen anteilig einen Leerstandsabschlag
    // ab. Ohne Angabe ist der Stand "vermietet" — dann ist leerM2 = 0, der
    // Abschlag 0 und die Rechnung identisch zu vorher (Regression F4).
    const stand = input.vermietungsstand ?? "vermietet";
    const istMiete = Math.max(0, input.jahresnettokaltmiete ?? 0);
    const wf = Math.max(0, input.wohnflaeche ?? 0);
    const leerM2 =
      stand === "leer"
        ? wf
        : stand === "teilweise"
          ? Math.min(wf, Math.max(0, input.leerstehendeWohnflaeche ?? 0))
          : 0;
    const mm2 = marktmieteM2(r.wohnung, input.zustand, input.qualitaet);
    const marktmieteGeschaetzt = Math.round(leerM2 * mm2 * 12);
    const leerstandAnteil = wf > 0 ? Math.min(1, leerM2 / wf) : 0;
    const abschlagPct = Math.round(leerstandAnteil * LEERSTAND_ABSCHLAG_MAX_PCT * 10) / 10;
    const ansatzMiete = istMiete + marktmieteGeschaetzt;
    vervielfaeltiger = mfhVervielfaeltiger(r.wohnung, input.zustand, input.qualitaet);
    // Ausstattung wirkte beim Mehrfamilienhaus bisher GAR NICHT: Die Merkmale
    // wurden abgefragt, der Wert blieb identisch. Das war ein Feld ohne Folgen
    // (Hinweis Alex). Jetzt ein bewusst stark gedämpfter Zuschlag auf den
    // Vervielfältiger, nicht auf den Wert.
    //
    // Warum so klein und warum überhaupt gedämpft: Beim Zinshaus steckt der
    // Nutzen einer besseren Ausstattung bereits in der erzielten Miete, und
    // die ist hier Eingabe. Ein voller Zuschlag würde denselben Effekt ein
    // zweites Mal zählen. Übrig bleibt der Teil, der sich NICHT in der
    // aktuellen Miete zeigt: geringerer Instandhaltungsstau und bessere
    // Wiedervermietbarkeit, was Käufer über einen etwas höheren
    // Vervielfältiger honorieren.
    //
    // 0,125 Prozent je Merkmal, gedeckelt bei 1,5 Prozent. Der Satz ist so
    // gewählt, dass die zwölf Merkmale der MFH-Liste den Deckel GENAU
    // ausschöpfen: Bei einem größeren Satz je Merkmal wäre der Deckel schon
    // nach der Hälfte erreicht und die restlichen Häkchen blieben wirkungslos,
    // was schlimmer ist als gar kein Effekt. Zum Vergleich: dieselben Merkmale
    // bewirken bei einer Eigentumswohnung mit 1,2 Prozent je Merkmal fast das
    // Zehnfache.
    const ausstBonusMfh = Math.min(input.ausstattung.length * 0.00125, 0.015);
    vervielfaeltiger = Math.round(vervielfaeltiger * (1 + ausstBonusMfh) * 100) / 100;
    mid = ansatzMiete * vervielfaeltiger * (1 - abschlagPct / 100);
    mietAnsatz = {
      istMiete,
      marktmieteGeschaetzt,
      marktmieteM2: mm2,
      leerstandM2: Math.round(leerM2),
      leerstandAnteil,
      abschlagPct,
      ansatzMiete,
    };
    pricePerSqm = wf ? Math.round(mid / wf) : undefined;

    // Kleines MFH (1–4 WE): Vergleichswert-Anker gegen die Ertragswert-Falle
    // (Begründung + Kalibrierung s. MFH_KLEIN_*-Kommentar oben) — gleiche
    // Faktorkette wie beim Haus, gleiche Grundstücks-Staffel, Maximum gewinnt.
    const we = input.wohneinheiten ?? 0;
    if (we >= 1 && we <= MFH_KLEIN_MAX_WE && wf > 0) {
      const lageFaktorMfh = Math.min(bekannteRegion ? 1.06 : 1.15, Math.max(0.72, Math.sqrt(boden / r.boden)));
      const anrechnung = input.grundflaeche
        ? grundstuecksStaffel(input.grundflaeche, boden, "haus")
        : undefined;
      const vergleichswert =
        wf * r.haus * MFH_KLEIN_GEBAEUDE_FAKTOR * zf * bf * qf * ef * ausstFaktor * lageFaktorMfh +
        (anrechnung?.wert ?? 0);
      if (vergleichswert > mid) {
        annahmen.push(
          `Mehrfamilienhaus mit ${we} Wohneinheiten: bewertet im Vergleichswert-Ansatz wie ein Wohnhaus — Käufer kleiner Mehrfamilienhäuser sind meist Eigennutzer und zahlen Wohnhaus-Niveau (kalibriert an 57 echten Mehrfamilienhaus-Verkäufen). Der reine Ertragswert läge bei ${(Math.round(mid / 1000) * 1000).toLocaleString("de-DE")} € und unterschätzt ein kleines Mehrfamilienhaus mit Grundstück deutlich.`,
        );
        mid = vergleichswert;
        pricePerSqm = Math.round(mid / wf);
        grundstuecksAnrechnung = anrechnung;
        // Ertragswert-Anzeigen zurücknehmen: PDF und Rechner sollen die
        // Faktor-Zerlegung zeigen, keine Miet-Herleitung, die nicht mehr
        // aufs Ergebnis führt.
        vervielfaeltiger = undefined;
        mietAnsatz = undefined;
        mfhVergleichswert = true;
      }
    }
  } else {
    const base = input.objektart === "haus" ? r.haus : input.objektart === "gewerbe" ? r.gewerbe : r.wohnung;
    // Mikrolagen-Faktor: der amtliche Bodenrichtwert (falls via opts geliefert)
    // ist der beste verfügbare Indikator dafür, ob die konkrete Lage über oder
    // unter dem regionalen Modellniveau liegt — gerade für Dörfer, die auf
    // DEFAULT_REGION zurückfallen (Beispiel Kleinkarlbach: BRW 260 vs.
    // Modell 400 → Gebäudebasis sinkt von 3.200 auf ~2.580 €/m², was dem
    // Marktniveau dort entspricht). sqrt dämpft bewusst: Gebäudewerte streuen
    // schwächer als Bodenwerte. Ohne amtlichen Wert ist boden === r.boden und
    // der Faktor exakt 1 — Verhalten dann unverändert.
    //
    // OBERGRENZE NACH REGIONSTYP (11.08.2026, Fall Manfred „Landauer Warte"):
    // Für Orte MIT eigenem REGIONS-Eintrag steckt die Stadt-Lage bereits im
    // Basiswert — nach OBEN darf der BRW dort nur noch die Mikrolage
    // INNERHALB der Stadt verschieben (max. +6 %), nicht die Stadt ein
    // zweites Mal aufwerten: die alte Klemme (bis 1,15) gab praktisch jeder
    // zentralen Speyerer Adresse +15 % auf eine Basis, in der Speyer schon
    // eingepreist war (Modell-Boden 590 ist konservativer kalibriert als die
    // realen Innenstadt-BORIS-Zonen, z. B. 790 in Zone 0602). Die UNTERGRENZE
    // bleibt bewusst für alle bei 0,72: ein niedriger BRW ist echte
    // Information über die konkrete Zone (Gewerbegebiet, schwache Mikrolage
    // — s. F13/F14 der Battery), kein Doppelzählungs-Problem — und
    // Abwertungen nicht zu bremsen passt zur Linie „lieber kleiner nennen".
    // Fallback-Orte ohne eigene Basis behalten die volle Spanne nach oben
    // (dort IST der BRW die beste Ortsinformation).
    const lageFaktor = Math.min(bekannteRegion ? 1.06 : 1.15, Math.max(0.72, Math.sqrt(boden / r.boden)));
    // Bauform wirkt NUR auf den Gebäudeanteil, nie auf den Boden — der wird
    // unten aus der tatsächlich eingegebenen Grundstücksfläche gerechnet.
    // Genau deshalb stehen in HAUSTYP_FAKTOR die reinen Baukostenverhältnisse
    // der NHK 2010 und keine (größeren) marktbasierten Abschläge.
    const htFaktor =
      input.objektart === "haus" && input.haustyp ? HAUSTYP_FAKTOR[input.haustyp] : 1;
    const zfhFaktor =
      input.objektart === "haus" && input.zweifamilienhaus ? ZWEIFAMILIEN_FAKTOR : 1;
    const flFaktor = flaechenFaktor(input.objektart, input.wohnflaeche);
    pricePerSqm = Math.round(
      base * zf * bf * qf * ef * ausstFaktor * OPTIMISM * lageFaktor * htFaktor * zfhFaktor * flFaktor * hgFaktor,
    );
    const flaeche = input.wohnflaeche ?? 0;
    const halleM2 = input.objektart === "gewerbe" ? Math.min(Math.max(input.hallenflaeche ?? 0, 0), flaeche) : 0;
    const wohnM2 =
      input.objektart === "gewerbe"
        ? Math.min(Math.max(input.mischWohnflaeche ?? 0, 0), Math.max(flaeche - halleM2, 0))
        : 0;
    if (halleM2 > 0 || wohnM2 > 0) {
      // Gewerbe-/Mischobjekt: die Nutzfläche zerfällt in Büro (Rest), Halle
      // und Wohnen — jede Flächenart zu ihrem Satz. Halle/Lager mit
      // HALLEN_FAKTOR des Büro-Niveaus; Wohnflächen zum regionalen
      // WOHNUNGS-Satz mit derselben Faktorkette wie der Büro-Satz (Zustand,
      // Baujahr, Energie, Lage …), gedämpft um MISCH_WOHN_FAKTOR. Bewusst
      // OHNE die Flächendämpfung großer Wohnungen (flaechenFaktor): der
      // Wohnanteil sind typischerweise mehrere normal große Einheiten, keine
      // einzelne Großwohnung. pricePerSqm bleibt der ausgewiesene Büro-Satz;
      // das effektive Mittel ergibt sich aus mid / Gesamtfläche.
      const bueroM2 = Math.max(flaeche - halleM2 - wohnM2, 0);
      const halleSatz = Math.round(pricePerSqm * HALLEN_FAKTOR);
      const wohnSatz = Math.round(
        r.wohnung * zf * bf * qf * ef * ausstFaktor * OPTIMISM * lageFaktor * MISCH_WOHN_FAKTOR,
      );
      mid = pricePerSqm * bueroM2 + halleSatz * halleM2 + wohnSatz * wohnM2;
      flaechenAufteilung = { bueroM2, halleM2, wohnM2, bueroSatz: pricePerSqm, halleSatz, wohnSatz };
    } else {
      mid = pricePerSqm * flaeche;
    }
    if (input.objektart === "haus" && input.grundflaeche) {
      // Grundstücksanteil gestaffelt statt pauschal BRW × 0,6 × Gesamtfläche
      // (übergroße Grundstücke, s. grundstuecksStaffel) — bis 700 m² rechnet
      // die Staffel exakt wie die alte Formel.
      grundstuecksAnrechnung = grundstuecksStaffel(input.grundflaeche, boden, "haus");
      mid += grundstuecksAnrechnung.wert;
    } else if (input.objektart === "gewerbe" && input.grundflaeche) {
      // Gewerbe rechnete den Grundstückswert bisher gar nicht mit — bei
      // Betriebsobjekten mit Hof, Stellflächen und Halle ist das ein
      // wesentlicher Teil des Werts (Hinweis Manfred, Freigabe Alex).
      grundstuecksAnrechnung = grundstuecksStaffel(input.grundflaeche, boden, "gewerbe");
      mid += grundstuecksAnrechnung.wert;
    }
  }

  const round = (n: number) => Math.round(n / 1000) * 1000;
  const pct = (x: number) => Math.round((x - 1) * 100);

  // PLAUSIBILITÄTS-DECKEL AN ECHTEN ABSCHLÜSSEN (Fall Manfred „Landauer
  // Warte", 11.08.2026): Das Modell nannte 473.000 €, die echten
  // OnOffice-Abschlüsse desselben Orts lagen bei ~3,0–3,7 T€/m². Liegt der
  // effektive Modell-€/m² (mid/Wohnfläche — beim Haus also inkl. Bodenanteil,
  // genau wie ein realer Kaufpreis) über dem p75 der echten Orts-Abschlüsse,
  // wird auf p75 gedeckelt. p75 statt Median, weil das konkrete Objekt
  // legitim im oberen Viertel liegen kann — aber nicht oberhalb dessen, was
  // vor Ort überhaupt bezahlt wird. Der Eingriff ist voll transparent:
  // eigene Faktor-Zeile + `plausibilisierung` + Annahmen-Text.
  let plausibilisierung: Plausibilisierung | undefined;
  let deckelFaktor = 1;
  const s = opts?.ortsStats;
  const wf = input.wohnflaeche ?? 0;
  if (s && s.n >= 5 && flaechenObjekt && wf > 0 && mid / wf > s.p75Qm) {
    const rawMid = mid;
    plausibilisierung = { n: s.n, p75Qm: Math.round(s.p75Qm), modellMid: round(rawMid) };
    deckelFaktor = (s.p75Qm * wf) / rawMid;
    mid = s.p75Qm * wf;
    // Bei der Wohnung IST mid/Fläche der ausgewiesene €/m² — nachziehen.
    // Beim Haus bleibt pricePerSqm der Gebäudeanteil (mid enthält Boden).
    if (input.objektart === "wohnung") pricePerSqm = Math.round(s.p75Qm);
    annahmen.push(
      `Modellwert an der Realität geerdet: ${s.n} echte Verkäufe in ${input.ort} (OnOffice) erzielten bis ${Math.round(s.p75Qm).toLocaleString("de-DE")} €/m² im oberen Viertel — der Report bleibt innerhalb dieses belegten Niveaus.`,
    );
  }

  const factors: ValuationFactor[] =
    input.objektart === "mehrfamilienhaus" && !mfhVergleichswert
      ? // Zustand und Qualität stecken beim Zinshaus schon im Vervielfältiger
        // und dürfen hier nicht doppelt erscheinen. Die Ausstattung bekommt
        // eine eigene Zeile, damit sichtbar ist, dass sie wirkt — und wie
        // wenig.
        [
          {
            label: "Ausstattung (Vervielfältiger)",
            effectPct: Math.round(Math.min(input.ausstattung.length * 0.125, 1.5) * 10) / 10,
          },
        ].filter((x) => x.effectPct !== 0)
      : [
          { label: "Zustand", effectPct: pct(zf) },
          { label: "Ausstattungsqualität", effectPct: pct(qf) },
          { label: "Baujahr", effectPct: pct(bf) },
          { label: "Energieeffizienz", effectPct: pct(ef) },
          // Nur beim Haus und nur, wenn eine Bauform gewählt wurde. Der Wert
          // bezieht sich auf den Gebäudeanteil, nicht auf den Gesamtwert.
          {
            label: "Zweite Wohneinheit (Gebäudeanteil)",
            effectPct: pct(
              input.objektart === "haus" && input.zweifamilienhaus ? ZWEIFAMILIEN_FAKTOR : 1,
            ),
          },
          {
            label: "Bauform (Gebäudeanteil)",
            effectPct: pct(
              input.objektart === "haus" && input.haustyp
                ? HAUSTYP_FAKTOR[input.haustyp]
                : 1,
            ),
          },
          // Angezeigt wird der GESTAUCHTE Bonus (ausstFaktor), nicht der rohe —
          // sonst summierten sich die Zeilen nicht zum gerechneten Wert.
          { label: "Ausstattung", effectPct: pct(ausstFaktor) },
          {
            label: "Objektgröße (€/m² sinkt mit Fläche)",
            effectPct: pct(flaechenFaktor(input.objektart, input.wohnflaeche)),
          },
          // Hausgeld nur bei der Wohnung (hausgeldFaktor prüft das selbst).
          { label: "Hausgeld (WEG-Kosten)", effectPct: pct(hgFaktor) },
          // Deckelung an echten Orts-Abschlüssen — als eigene Zeile, damit
          // die Wasserfall-Zerlegung im PDF weiterhin exakt auf mid aufgeht.
          {
            label: s ? `Abgleich mit ${s.n} echten Verkäufen vor Ort` : "Abgleich mit echten Verkäufen",
            effectPct: pct(deckelFaktor),
          },
          { label: "Marktoptimismus", effectPct: pct(OPTIMISM) },
        ].filter((x) => x.effectPct !== 0);

  // KENNZAHLEN OHNE WÜRFEL (11.08.2026): comparables/confidence/trendPct/
  // mikrolage/rentYieldPct waren Math.random() — genau die Zahlen, mit denen
  // Kunden dem Makler gegenüber argumentieren („92 Vergleichsobjekte, 86 %
  // Konfidenz"), waren erfunden. Jetzt deterministisch bzw. aus echten Daten:
  //
  // comparables: NUR echte Abschlüsse (ortsStats.n), sonst 0 — UI/PDF zeigen
  //   dann „Modellwert" statt einer erfundenen Zahl.
  // confidence: benannter Score aus der tatsächlichen Datenlage — Basis 62,
  //   +8 kalibrierte Region, +8 amtlicher BRW, +n echte Abschlüsse (max +12),
  //   +3 Energieausweis, +2 Baujahr; Deckel 92 (100 % gäbe es nur mit
  //   Vor-Ort-Termin, und genau dorthin soll der Report führen).
  // trendPct: hash-basiert je Region (dieselbe 2,6–6,2-%-Mechanik wie
  //   trendYoy in marktdaten.ts — Preisatlas und Rechner erzählen dieselbe
  //   Geschichte).
  // mikrolage: aus dem BRW-Verhältnis abgeleitet (amtlich gemessen) statt
  //   gewürfelt; ohne BRW neutral 7,0.
  // rentYieldPct: regionales Renditemodell (s. regionalRentYieldPct).
  const comparables = s?.n ?? 0;
  let confidence = 62;
  if (bekannteRegion) confidence += 8;
  if (opts?.bodenrichtwert != null) confidence += 8;
  confidence += Math.min(12, comparables);
  if (input.energieklasse) confidence += 3;
  if (input.baujahr) confidence += 2;
  confidence = Math.min(92, confidence);
  const trendPct = Math.round((2.6 + ((ortHash(regionKey(input.ort) || input.ort.toLowerCase()) % 1000) / 1000) * 3.6) * 10) / 10;
  const lageRatio = Math.min(1.15, Math.max(0.72, Math.sqrt(boden / r.boden)));
  const mikrolage =
    opts?.bodenrichtwert != null
      ? Math.min(9.5, Math.max(5, Math.round((7 + (lageRatio - 1) * 10) * 10) / 10))
      : 7;

  return {
    low: round(mid * 0.93),
    mid: round(mid),
    high: round(mid * 1.11),
    pricePerSqm,
    comparables,
    confidence,
    trendPct,
    bodenrichtwert: boden,
    mikrolage,
    rentYieldPct: Math.round(regionalRentYieldPct(r.wohnung) * 10) / 10,
    vervielfaeltiger,
    mietAnsatz,
    grundstuecksAnrechnung,
    flaechenAufteilung,
    plausibilisierung,
    annahmen,
    factors,
  };
}

export const QUALITAETEN: { key: Qualitaet; label: string }[] = [
  { key: "einfach", label: "Einfach" },
  { key: "normal", label: "Normal" },
  { key: "gehoben", label: "Gehoben" },
  { key: "luxus", label: "Luxuriös" },
];

/**
 * Ausstattung für HÄUSER.
 *
 * Bis dahin gab es eine gemeinsame Liste für Wohnung und Haus. Das führte zu
 * Unsinn in beide Richtungen: „Aufzug" stand bei einem freistehenden
 * Einfamilienhaus zur Auswahl, während „Einliegerwohnung" und „Gäste-WC"
 * fehlten, obwohl beides bei Häusern echte Werttreiber sind. Getrennte Listen
 * gab es für Gewerbe bereits (s. AUSSTATTUNG_GEWERBE), das ist hier nur
 * konsequent weitergeführt.
 *
 * Reihenfolge nach Wertrelevanz, nicht alphabetisch: was oben steht, wird beim
 * Überfliegen zuerst gesehen.
 *
 * Belegt über die Ausstattungsfelder und Suchkategorien von ImmobilienScout24
 * (öffentliche Import-/Export-API-Dokumentation), die Marktbegriffe von
 * Immowelt sowie die getrennten Erfassungsprotokolle von Sprengnetter für
 * Eigentumswohnung und Ein-/Mehrfamilienhaus.
 *
 * Zur Einordnung, weil es leicht verwechselt wird: „wird abgefragt" und „ist
 * mit Zahlen belegt" sind zwei verschiedene Dinge. Belastbar belegt ist die
 * Wirkung nur bei Photovoltaik und der Heizungsart. Klimaanlage etwa ist bei
 * ImmobilienScout24 eine eigene, bundesweit genutzte Suchkategorie, also
 * nachweislich nachgefragt, eine unabhängige Studie zur Wertwirkung gibt es
 * aber nicht. Das ist unkritisch, weil Ausstattung hier ohnehin nur als
 * gedeckelter Sammelbonus wirkt (s. ausstBonus in estimateValue) und kein
 * Einzelmerkmal einen eigenen Faktor bekommt.
 */
export const AUSSTATTUNG_HAUS = [
  "Garage / Stellplatz",
  "Einliegerwohnung",
  "Keller",
  "Gäste-WC",
  "Garten",
  "Balkon / Terrasse",
  "Photovoltaik",
  // Heizungsart ist neben der Energieklasse das am besten belegte
  // Energiemerkmal (Marktauswertungen zeigen deutliche Aufschläge gegenüber
  // Gasheizung). Die Energieklasse steht im Rechner als eigenes Feld und
  // deckt den Effekt teilweise schon ab, deshalb bewusst nur als eines von
  // vielen Merkmalen im Sammelbonus und nicht als eigener Faktor.
  "Wärmepumpe / moderne Heizung",
  "Fußbodenheizung",
  "Einbauküche",
  "Barrierefrei",
  "Klimaanlage",
  "Kamin",
  "Smart Home",
  // Solarthermie = Warmwasser/Heizung über Sonnenkollektoren, bewusst getrennt
  // von Photovoltaik (Strom) — beides kann parallel vorhanden sein.
  "Solarthermie (Warmwasser)",
  "Pool",
  "Sauna / Wellness",
];

/**
 * Ausstattung für WOHNUNGEN.
 *
 * Umgekehrt zum Haus: Aufzug steht hier weit oben, Einliegerwohnung gibt es
 * nicht. Drei Bezeichnungen sind bewusst anders formuliert als beim Haus, weil
 * die Sache bei einer Eigentumswohnung rechtlich anders liegt: Photovoltaik,
 * Garten und Pool gehören dort fast immer der Eigentümergemeinschaft und nicht
 * der einzelnen Wohnung. Stünde dort schlicht „Photovoltaik", würden Verkäufer
 * reihenweise etwas ankreuzen, das ihnen gar nicht allein gehört. Pool und
 * Solarthermie sind bei der Einzelwohnung deshalb ganz entfallen.
 */
export const AUSSTATTUNG_WOHNUNG = [
  "Balkon / Terrasse",
  "Aufzug",
  "Garage / Stellplatz",
  "Keller",
  "Einbauküche",
  "Barrierefrei",
  "Gäste-WC",
  "Fußbodenheizung",
  "Klimaanlage",
  "Smart Home",
  "Photovoltaik am Gebäude",
  "Kamin",
  "Gartenanteil (Sondernutzung)",
  "Sauna / Wellness",
];

/**
 * Ausstattung für MEHRFAMILIENHÄUSER (Zinshäuser).
 *
 * Eine eigene Liste, weil bei einem ganzen Haus andere Dinge zählen als bei
 * einer einzelnen Wohnung. „Einbauküche" oder „Sauna" sind für ein Zinshaus
 * keine sinnvolle Frage, ein Aufzug, Stellplätze und der Zustand der Technik
 * dagegen sehr wohl: Sie entscheiden über Vermietbarkeit und Instandhaltung.
 */
export const AUSSTATTUNG_MFH = [
  "Aufzug",
  "Balkone / Loggien",
  "Stellplätze / Garagen",
  "Zentralheizung erneuert",
  "Dach saniert",
  "Fenster erneuert",
  "Fassade gedämmt",
  "Elektrik erneuert",
  "Photovoltaik",
  "Glasfaseranschluss",
  "Keller / Abstellräume",
  "Barrierefreier Zugang",
];

/**
 * Ausstattung für GEWERBE — die Wohn-Liste (Balkon, Einbauküche, Sauna …) ist
 * bei einer Halle oder einem Autohaus sinnlos (Hinweis Manfred).
 *
 * Zusammengestellt entlang der Kriterien, die im gewerblichen Immobilienmarkt
 * tatsächlich abgefragt werden — Hallen/Industrie: Rolltor, ausreichend
 * Starkstromanschlüsse, hohe Decken, stützenfreie Flächen, Rampe, Kranbahn,
 * Bodenbelastbarkeit, Sozial- und Sanitärräume, Lüftung, Parkplätze und
 * Wendemöglichkeiten (vgl. ImmobilienScout24, Ratgeber Industriehalle);
 * Büro: Klimatisierung, EDV-Verkabelung, Aufzug, Barrierefreiheit;
 * Handel/Autohaus: Schaufenster, Ausstellungsfläche, Werkstatt mit Hebebühne.
 * Deckt damit beide realen Fälle ab: Bürogebäude mit Halle (Bensheim) und
 * ehemaliges Autohaus mit Büros (Edenkoben).
 */
export const AUSSTATTUNG_GEWERBE = [
  "Laderampe",
  "Sektional- / Rolltor",
  "Ebenerdige Zufahrt",
  "Stützenfreie Halle",
  "Kranbahn",
  "Hohe Bodenbelastbarkeit",
  "Starkstrom (Drehstrom)",
  "Hallenheizung",
  "Klimatisierung",
  "Sozial- & Sanitärräume",
  "Personen- / Lastenaufzug",
  "EDV-Verkabelung / Serverraum",
  "Glasfaseranschluss",
  "Alarm- / Videoüberwachung",
  "Brandmelde- / Sprinkleranlage",
  "Schaufenster / Ausstellungsfläche",
  "Werkstatt / Hebebühne",
  "Stellplätze / Hoffläche",
  "Photovoltaikanlage",
  "E-Ladepunkte",
  "Barrierefrei",
];

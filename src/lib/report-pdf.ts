import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
  type PDFFont,
  type PDFPage,
  type PDFImage,
  type Color,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AKIRA_B64 } from "@/lib/report-assets/akira";
import { RIEGEL_MARK_B64 } from "@/lib/report-assets/mark";
import { PAAR_REPORT_JPG_B64, BROSCHUERE_JPG_B64, BERATUNG_JPG_B64, LADEN_JPG_B64, AWARD_JPG_B64 } from "@/lib/report-assets/gallery";
import { BORIS_QUELLEN, type BorisQuelle } from "@/lib/boris";
import type { ReportContext } from "@/lib/report-context";
import type { ReportVergleichsObjekt } from "@/lib/report-objekte";

/**
 * Mehrseitiger RIEGEL-Marktwert-Report als PDF — als echtes Dokument aufgebaut,
 * als DRUCKFÄHIGE helle Print-Übersetzung des dunklen Website-Designs
 * (Wunsch Manfred: tonerfreundlich; Maßstab Alex: die Dramatik des dunklen
 * Designs behalten). Papierweißer Grund, Tinte in Fast-Schwarz, und das
 * RIEGEL-Blau trägt jetzt die Rolle, die vorher das Schwarz hatte: satte
 * vollblaue Bänder mit weißer Schrift (Wertband, CTA, Stat-Kacheln), ein
 * fast-schwarzes Auszeichnungs-Band, riesige AKIRA-Werte als Held jeder
 * Seite. Die dunklen Markenfotos bleiben als Vollbreite-Bänder — dunkle
 * Fotoflächen auf hellen Seiten drucken gut und wirken editorial.
 * Seitenzahl ist DYNAMISCH
 * (5–9 Seiten, s. `total` in buildReportPdf) — optionale Kapitel fallen bei
 * fehlenden Daten fail-soft weg statt eine leere/kaputte Seite zu zeigen:
 *   1 Deckblatt          — helle Editorial-Seite, zentriertes RIEGEL-Logo + Name
 *   2 Bewertung          — Wert-Hero, Objekt-/Kennzahlen + Objekt-Luftbild (Esri/Maxar)
 *   3 Preis-Zusammensetzung — Wasserfall/Formel-Grafik (immer, best-effort)
 *   4 Ihr Markt           — NUR wenn context.markt vorhanden (Preisatlas-Stadt)
 *   5 Referenzobjekte      — NUR wenn vergleichsobjekte vorhanden
 *   6 Preis-Faktoren      — die 7 allgemeinen Werttreiber
 *   7 Vermarktung & Markt — Listen, Trend, RIEGEL-Ablauf-Timeline, CTA
 *   8 Warum RIEGEL        — NUR wenn context vorhanden (Facts & Figures)
 *   9 Endblatt            — rechtliche Infos, Haftungsausschluss, Ansprechpartner
 * AKIRA für Headlines (fontkit-Embed), echtes RIEGEL-Logo. Pure-JS (serverless-tauglich).
 */
export interface ReportData {
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  objektartLabel?: string;
  wohnflaeche?: string | number;
  grundflaeche?: string | number;
  zimmer?: string | number;
  baujahr?: string | number;
  zustand?: string;
  qualitaet?: string;
  energieklasse?: string;
  /** Gewählte Ausstattungs-Merkmale aus dem Rechner (z. B. Balkon, Garage). */
  ausstattung?: string[];
  /** Werttreiber aus estimateValue (Zustand/Qualität/Baujahr/…, ±%) — Basis
   * der Preis-Zusammensetzungs-Seite. Bei Mehrfamilienhaus/Grundstück leer. */
  factors?: { label: string; effectPct: number }[];
  /** Website-Wissen (Preisatlas-Marktdaten, GEO-Standorttext, RIEGEL-Stats)
   * aus buildReportContext() — s. lib/report-context.ts. */
  context?: ReportContext;
  /** Echte OnOffice-Vergleichsobjekte (max. REFERENZ_MAX, s. lib/report-objekte.ts)
   * — ohne Treffer/Mock-Bestand leer, dann entfällt die Referenzobjekte-Seite. */
  vergleichsobjekte?: ReportVergleichsObjekt[];
  /** Nur bei objektartLabel === "Mehrfamilienhaus" (Ertragswert-Ansatz). */
  jahresnettokaltmiete?: string | number;
  wohneinheiten?: string | number;
  gewerbeeinheiten?: string | number;
  /** Nur bei Gewerbe: Hallen-/Lager- bzw. Wohnanteil an der Nutzfläche in m²
   *  (Mischobjekt, s. FlaechenAufteilung in lib/valuation.ts). */
  hallenflaeche?: string | number;
  mischWohnflaeche?: string | number;
  value: {
    low: number;
    mid: number;
    high: number;
    pricePerSqm?: number;
    comparables?: number;
    trendPct?: number;
    mikrolage?: number;
    confidence?: number;
    /** Ertragswert-Vervielfältiger — nur bei Mehrfamilienhaus gesetzt. */
    vervielfaeltiger?: number;
    /** Zusammensetzung der angesetzten Miete (Ist-Miete + für leerstehende
     * Flächen angesetzte marktübliche Miete, Leerstandsabschlag) — nur bei
     * Mehrfamilienhaus, s. MietAnsatz in lib/valuation.ts. */
    mietAnsatz?: {
      istMiete: number;
      marktmieteGeschaetzt: number;
      marktmieteM2: number;
      leerstandM2: number;
      leerstandAnteil: number;
      abschlagPct: number;
      ansatzMiete: number;
    };
    /** Gestaffelte Grundstücksanrechnung (übergroßes Grundstück) — nur bei
     * Haus/Grundstück mit Fläche gesetzt, s. grundstuecksStaffel() in
     * lib/valuation.ts. Basis des Staffel-Hinweises auf der
     * Preis-Zusammensetzungs-Seite. */
    grundstuecksAnrechnung?: { baulandM2: number; mehrflaecheM2: number; gartenlandM2: number; wert: number };
    /** Büro/Halle/Wohnen-Split beim Gewerbe-/Mischobjekt — nur bei Gewerbe
     * mit Hallen- oder Wohnanteil gesetzt (s. FlaechenAufteilung in
     * lib/valuation.ts). Basis des Misch-Hinweises auf der
     * Preis-Zusammensetzungs-Seite. */
    flaechenAufteilung?: {
      bueroM2: number;
      halleM2: number;
      wohnM2: number;
      bueroSatz: number;
      halleSatz: number;
      wohnSatz: number;
    };
  };
  dateLabel: string;
  /** Luftbild des Objekts (Base64-JPEG, Esri World Imagery an den Rechner-Koordinaten). */
  satelliteB64?: string;
  /**
   * Amtlicher Bodenrichtwert (RLP: BORIS-RLP, Hessen: BORIS Hessen) für die
   * Objekt-Koordinaten, falls ermittelt (s. lib/boris.ts) — optional, da
   * außerhalb der Länder/bebauter Zonen kein Wert vorliegt (fail-soft).
   * Rohwerte; `brw` bleibt Zahl, Zone/Stichtag laufen wie andere
   * Freitextfelder durch den WinAnsi-Sanitizer. `quelle` fehlt bei
   * Alt-Datensätzen (vor der Hessen-Anbindung) → Anzeige fällt auf RLP zurück.
   */
  bodenrichtwert?: { brw: number; stichtag: string; zone: string; quelle?: BorisQuelle };
}

// Helle Print-Palette: Papierweiß als Grund, warme Fast-Schwarz-Tinte,
// RIEGEL-Blau als einziger Akzent. POS/NEG bewusst dunkler abgetönt als im
// Web-Design, damit sie auf Weiß tragen statt auszubleichen.
const BG = rgb(1, 1, 1);
const SURFACE = rgb(0.957, 0.965, 0.984);
const BORDER = rgb(0.902, 0.91, 0.937);
const FG = rgb(0.063, 0.075, 0.125);
const MUTED = rgb(0.337, 0.357, 0.431);
const FAINT = rgb(0.573, 0.588, 0.651);
const ACCENT = rgb(0.004, 0.361, 1);
/** Für kleinen Text/feine Akzente auf Weiß: etwas tieferes Blau als ACCENT —
 * das helle Web-Blau (0.416, 0.631, 1) wäre auf Papier zu blass. */
const ACCENT_SOFT = rgb(0.008, 0.302, 0.82);
/** Schrift AUF vollblauen Flächen: reines Weiß und ein helles Eisblau für
 * Zweitzeilen/Labels — die Umkehrung von FG/MUTED für die blauen Bänder. */
const ON_ACCENT = rgb(1, 1, 1);
const ON_ACCENT_MUTED = rgb(0.792, 0.871, 1);
const POS = rgb(0.055, 0.624, 0.431);
const NEG = rgb(0.851, 0.275, 0.243);
/** Vorberechneter Zwischenton BORDER↔ACCENT — pdf-lib kennt kein CSS
 * color-mix(), also ein fest ausgerechnetes rgb() statt des reinen Grau-Rands.
 * Tönt alle glowPanel-Kacheln (Formel-Boxen, Referenzobjekte …) dezent
 * Richtung Akzentblau statt neutral grau. */
const BORDER_GLOW = rgb(0.78, 0.843, 0.973);

const A4: [number, number] = [595.28, 841.89];
const M = 48;
/**
 * Wie viele Referenzobjekte auf die Referenzseite passen.
 *
 * Von 3 auf 5 erhöht, seit der Verkauft-Pool paginiert wird und statt 196
 * Objekten 744 zur Auswahl stehen (s. fetchVerkaufteReferenzen). Mehr echte
 * Abschlüsse in derselben Straße sind der stärkste Vertrauensbeleg im Report.
 * 5 ist die Obergrenze für EINE A4-Seite: bei 100 pt Kartenhöhe plus 12 pt
 * Abstand endet die letzte Karte rund 110 pt über dem Footer. Wer hier erhöht,
 * muss drawReferenzobjekte neu vermessen — eine zweite Seite ist es nicht wert.
 */
export const REFERENZ_MAX = 5;
// Oberkante des Footer-Bereichs (Trennlinie bei y≈54) — Deko-Bänder müssen
// darüber enden, damit sie den Footer nicht überzeichnen.
const bandFloor = 74;

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
/** Deutsche Dezimalformatierung (Komma statt Punkt) für Kennzahlen wie
 * Mietrendite/Vervielfältiger — bewusst getrennt von eur() (kein Währungszeichen). */
const fmtDe = (n: number, maxFrac = 1) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: maxFrac }).format(n);
/** Ganzzahl deutsch gruppiert (Tausenderpunkt) — für die Facts&Figures-Kacheln. */
const fmtInt = (n: number) => new Intl.NumberFormat("de-DE").format(Math.round(n));

/** Der Bodenrichtwert fließt bei Grundstück, Haus und Gewerbe in
 * mid/pricePerSqm ein (s. estimateValue in lib/valuation.ts) — bei
 * Wohnung/Mehrfamilienhaus ist er im Report rein informativ, die
 * Kennzahlen-Zeile muss das kennzeichnen. */
function brwPriceRelevant(objektartLabel?: string): boolean {
  return objektartLabel === "Haus" || objektartLabel === "Grundstück" || objektartLabel === "Gewerbe";
}

// Helvetica arbeitet mit WinAnsi — Zeichen außerhalb Latin-1 (ą, ł, Emoji …)
// lassen drawText werfen und das GANZE PDF scheitern. Nutzereingaben deshalb
// transliterieren (NFKD) bzw. unbekannte Zeichen still verwerfen.
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ''“”•–—˜™š›œžŸ";
const isWinAnsi = (ch: string) => {
  const c = ch.codePointAt(0)!;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.includes(ch);
};
function toWinAnsi(s: string): string {
  let out = "";
  for (const ch of s) {
    if (isWinAnsi(ch)) {
      out += ch;
      continue;
    }
    const t = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += t && [...t].every(isWinAnsi) ? t : "";
  }
  return out.trim();
}

interface Ctx {
  doc: PDFDocument;
  reg: PDFFont;
  bold: PDFFont;
  akira: PDFFont;
  /** Alle Bild-Assets sind bewusst nullable: EIN korrupter/nicht dekodierbarer
   * Font/Bild-Embed (z. B. durch eine abweichende Laufzeitumgebung) darf NIE
   * den gesamten Report zum Scheitern bringen — s. tryEmbedPng/tryEmbedJpg
   * in buildReportPdf() und die Fallback-Zeichnung an den jeweiligen Stellen. */
  mark: PDFImage | null;
  satellite: PDFImage | null;
  /** Helle Marken-Bänder für Seiten mit viel Weißraum (s. gallery.ts):
   *  Paar mit WERT-REPORT (Deckblatt), Paar mit Broschüre (Vermarktung),
   *  Beratung am Telefon (Warum RIEGEL), Ladenlokal Speyer (Referenzen). */
  paarReport: PDFImage | null;
  broschuere: PDFImage | null;
  beratung: PDFImage | null;
  laden: PDFImage | null;
  /** Christoph & Sissy beim ImmoAward — kleines Foto im Auszeichnungs-Band. */
  award: PDFImage | null;
}

export async function buildReportPdf(input: ReportData): Promise<string> {
  // Freitext-Felder WinAnsi-sicher machen (s. toWinAnsi) — Zahlen bleiben roh.
  const d: ReportData = {
    ...input,
    name: toWinAnsi(input.name) || "Interessent:in",
    address: input.address ? toWinAnsi(input.address) : input.address,
    city: input.city ? toWinAnsi(input.city) : input.city,
    postcode: input.postcode ? toWinAnsi(input.postcode) : input.postcode,
    objektartLabel: input.objektartLabel ? toWinAnsi(input.objektartLabel) : input.objektartLabel,
    bodenrichtwert: input.bodenrichtwert
      ? { ...input.bodenrichtwert, stichtag: toWinAnsi(input.bodenrichtwert.stichtag), zone: toWinAnsi(input.bodenrichtwert.zone) }
      : input.bodenrichtwert,
  };
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("RIEGEL Marktwert-Report");
  doc.setAuthor("RIEGEL Immobilien");

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Fehlertolerantes Embedding für ALLE nicht-essenziellen Assets: schlägt ein
  // einzelnes Bild/Font aus welchem Grund auch immer (Decode-Fehler, in dieser
  // Laufzeitumgebung nicht unterstütztes Encoding …) fehl, bekommt der Kunde
  // trotzdem einen vollständigen, mehrseitigen Report statt GAR keinen —
  // die betroffene Stelle rendert dann mit einem einfachen Fallback (s. u.).
  async function tryEmbedPng(b64: string, label: string): Promise<PDFImage | null> {
    try {
      return await doc.embedPng(Buffer.from(b64, "base64"));
    } catch (e) {
      console.error(`[report-pdf] Bild-Embed fehlgeschlagen (${label}):`, e instanceof Error ? e.message : e);
      return null;
    }
  }
  async function tryEmbedJpg(b64: string, label: string): Promise<PDFImage | null> {
    try {
      return await doc.embedJpg(Buffer.from(b64, "base64"));
    } catch (e) {
      console.error(`[report-pdf] Bild-Embed fehlgeschlagen (${label}):`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  // AKIRA-Headline-Font: bei Embed-Fehler auf Helvetica Bold zurückfallen
  // (kosmetisch abweichend, aber liefert IMMER ein PDF) statt den kompletten
  // Report scheitern zu lassen.
  let akira: PDFFont;
  try {
    akira = await doc.embedFont(Buffer.from(AKIRA_B64, "base64"), { subset: true });
  } catch (e) {
    console.error("[report-pdf] AKIRA-Font-Embed fehlgeschlagen, Fallback auf Helvetica Bold:", e instanceof Error ? e.message : e);
    akira = bold;
  }

  const mark = await tryEmbedPng(RIEGEL_MARK_B64, "Logo");
  let satellite: PDFImage | null = null;
  if (d.satelliteB64) {
    try {
      satellite = await doc.embedJpg(Buffer.from(d.satelliteB64, "base64"));
    } catch {
      satellite = null;
    }
  }

  const paarReport = await tryEmbedJpg(PAAR_REPORT_JPG_B64, "Band:PaarReport");
  const broschuere = await tryEmbedJpg(BROSCHUERE_JPG_B64, "Band:Broschuere");
  const beratung = await tryEmbedJpg(BERATUNG_JPG_B64, "Band:Beratung");
  const laden = await tryEmbedJpg(LADEN_JPG_B64, "Band:Laden");
  const award = await tryEmbedJpg(AWARD_JPG_B64, "Award-Foto");

  const ctx: Ctx = { doc, reg, bold, akira, mark, satellite, paarReport, broschuere, beratung, laden, award };
  const objektTitle = d.address || [d.postcode, d.city].filter(Boolean).join(" ") || "Ihre Immobilie";

  // Vergleichsobjekt-Fotos vorab einbetten: Ctx-Bilder werden beim Zeichnen
  // synchron gebraucht, embedJpg/embedPng sind aber async — daher hier, VOR
  // den draw*()-Aufrufen. Fail-soft wie jedes andere Bild-Embed: ein
  // einzelnes kaputtes Foto kostet nur das Foto, nie die Seite/den Report.
  const vergleichsobjekte = (d.vergleichsobjekte ?? []).slice(0, REFERENZ_MAX);
  const vergleichsFotos: (PDFImage | null)[] = [];
  for (const obj of vergleichsobjekte) {
    if (obj.fotoB64 && obj.fotoKind === "jpg") vergleichsFotos.push(await tryEmbedJpg(obj.fotoB64, "Referenzobjekt-Foto"));
    else if (obj.fotoB64 && obj.fotoKind === "png") vergleichsFotos.push(await tryEmbedPng(obj.fotoB64, "Referenzobjekt-Foto"));
    else vergleichsFotos.push(null);
  }

  // Dynamische Seitenzahl statt fixer PAGES-Konstante: optionale Kapitel
  // fallen bei fehlenden Daten fail-soft weg statt eine leere/kaputte Seite
  // zu zeigen. IMMER vorhanden: Deckblatt, Bewertung, Preis-Faktoren,
  // Vermarktung & Markt, Endblatt (5 Basisseiten).
  const hasComposition = Boolean(
    (d.factors && d.factors.length > 0) || d.objektartLabel === "Mehrfamilienhaus" || d.objektartLabel === "Grundstück",
  );
  const hasMarkt = Boolean(d.context?.markt);
  const hasVergleich = vergleichsobjekte.length > 0;
  const hasContext = Boolean(d.context);
  const total = 5 + (hasComposition ? 1 : 0) + (hasMarkt ? 1 : 0) + (hasVergleich ? 1 : 0) + (hasContext ? 1 : 0);

  let pageNo = 0;
  const next = () => ++pageNo;

  drawCover(ctx, d, objektTitle, next(), total);
  drawValuation(ctx, d, objektTitle, next(), total);
  if (hasComposition) drawComposition(ctx, d, next(), total);
  if (hasMarkt) drawMarketLocal(ctx, d, next(), total);
  if (hasVergleich) drawReferenzobjekte(ctx, d, vergleichsFotos, next(), total);
  drawFactors(ctx, next(), total);
  drawMarketing(ctx, d, objektTitle, next(), total);
  if (hasContext) drawWhyRiegel(ctx, d, next(), total);
  drawLegal(ctx, d, objektTitle, next(), total);

  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

/* ── Zeichen-Helfer ────────────────────────────────────── */
function mkText(page: PDFPage) {
  return (s: string, x: number, y: number, size: number, font: PDFFont, color: Color = FG, spacing = 0) => {
    if (spacing > 0) {
      let cx = x;
      for (const ch of s) {
        page.drawText(ch, { x: cx, y, size, font, color });
        cx += font.widthOfTextAtSize(ch, size) + spacing;
      }
    } else {
      page.drawText(s, { x, y, size, font, color });
    }
  };
}
function textRight(page: PDFPage, s: string, xRight: number, y: number, size: number, font: PDFFont, color: Color = FG) {
  page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y, size, font, color });
}
/** Breite von Text MIT Zeichenabstand (s. mkText-spacing-Parameter) — plain
 * font.widthOfTextAtSize() misst ohne den Spacing-Aufschlag zu schmal und
 * lässt zentrierten Text (Wortmarke, Kicker) optisch aus der Mitte rutschen. */
function textWidthSpaced(font: PDFFont, s: string, size: number, spacing: number): number {
  if (spacing <= 0) return font.widthOfTextAtSize(s, size);
  let w = 0;
  for (const ch of s) w += font.widthOfTextAtSize(ch, size) + spacing;
  return w - spacing;
}
function wrap(s: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      if (line) lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function ellipsize(s: string, font: PDFFont, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out.length > 1 && font.widthOfTextAtSize(out + "…", size) > maxW) out = out.slice(0, -1);
  return out + "…";
}
/** Größtmögliche Schriftgröße (bis `max`, min. `min`), bei der `s` noch in
 * `maxW` passt — für AKIRA-Zahlen/-Werte variabler Länge in Kacheln/Boxen. */
function fitFontSize(font: PDFFont, s: string, maxW: number, max: number, min = 9): number {
  let size = max;
  while (size > min && font.widthOfTextAtSize(s, size) > maxW) size -= 0.5;
  return size;
}
function bg(page: PDFPage, w: number, h: number) {
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: BG });
}
function header(ctx: Ctx, page: PDFPage, w: number, h: number, kicker: string) {
  const t = mkText(page);
  const mh = 16;
  // Logo-Bild optional (s. Ctx-Kommentar): ohne Mark einfach ohne Bild-Offset
  // starten — der Wortmarken-Text "RIEGEL" bleibt immer sichtbar.
  let mw = 0;
  if (ctx.mark) {
    mw = (ctx.mark.width / ctx.mark.height) * mh;
    page.drawImage(ctx.mark, { x: M, y: h - M - mh + 1, width: mw, height: mh });
  }
  t("RIEGEL", M + mw + (ctx.mark ? 7 : 0), h - M - 12, 15, ctx.akira, FG, 1.5);
  textRight(page, kicker, w - M, h - M - 11, 9, ctx.bold, ACCENT_SOFT);
  const y = h - M - 22;
  page.drawLine({ start: { x: M, y }, end: { x: w - M, y }, thickness: 1, color: BORDER });
  return y - 26;
}
function footer(ctx: Ctx, page: PDFPage, w: number, pageNo: number, total: number) {
  const t = mkText(page);
  page.drawLine({ start: { x: M, y: 54 }, end: { x: w - M, y: 54 }, thickness: 0.5, color: BORDER });
  t("RIEGEL Immobilien e.K. · Wormser Straße 13, 67346 Speyer · Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen", M, 40, 7.5, ctx.reg, FAINT);
  textRight(page, `${pageNo} / ${total}`, w - M, 40, 7.5, ctx.reg, FAINT);
}
function heading(ctx: Ctx, page: PDFPage, s: string, x: number, y: number, size = 15) {
  mkText(page)(s.toUpperCase(), x, y, size, ctx.akira, FG, 0.5);
}

/* ── NEUE VISUAL-HELFER (gestufte "Gradients", pdf-lib kann keine echten) ── */

/**
 * "Gradient to nothing"-Fläche der Website-Infografiken: pdf-lib kennt keine
 * echten Farbverläufe, deshalb wird in `steps` schmalen Streifen linear
 * interpolierter Opacity "getreppt" (auf hellem Grund fällt Banding schneller
 * auf als auf dunklem — im Zweifel `steps` erhöhen statt senken). `dir`
 * beschreibt, an welcher Kante `oFrom` sitzt: "down"/"up"
 * beziehen sich auf die Ober-/Unterkante, "right"/"left" auf die Kanten.
 */
function fadeRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
  oFrom: number,
  oTo = 0,
  steps = 32,
  dir: "down" | "up" | "right" | "left" = "down",
) {
  const n = Math.max(1, Math.floor(steps));
  if (w <= 0 || h <= 0) return;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const o = Math.max(0, Math.min(1, oFrom + (oTo - oFrom) * t));
    // Überlappung klein halten (0,15 statt 0,6): auf hellem Grund zeichnet
    // sich die doppelte Deckkraft der Überlapp-Zone sonst als periodisches
    // Streifenmuster ab; 0,15 pt reicht gegen Raster-Fugen zwischen Stufen.
    if (dir === "down" || dir === "up") {
      const sh = h / n;
      const sy = dir === "down" ? y + h - (i + 1) * sh : y + i * sh;
      page.drawRectangle({ x, y: sy, width: w, height: sh + 0.15, color, opacity: o });
    } else {
      const sw = w / n;
      const sx = dir === "right" ? x + i * sw : x + w - (i + 1) * sw;
      page.drawRectangle({ x: sx, y, width: sw + 0.15, height: h, color, opacity: o });
    }
  }
}

/** Radialer Schein hinter Zahlen/Ecken: konzentrische Kreise von außen (rMax,
 * Opacity ~0) nach innen (peak) — pdf-lib kennt keine radialen Farbverläufe. */
function glow(page: PDFPage, cx: number, cy: number, rMax: number, color: Color = ACCENT, peak = 0.045, rings = 14) {
  const n = Math.max(1, Math.floor(rings));
  for (let i = n; i >= 1; i--) {
    const r = (rMax * i) / n;
    const o = peak * (1 - i / n) ** 1.6; // aussen fast 0, innen peak (weicher Rand)
    if (o <= 0.002) continue;
    page.drawCircle({ x: cx, y: cy, size: r, color, opacity: o });
  }
}

/**
 * Dekoratives, dunkles Marken-Bild-Band für Seiten mit Weißraum unten —
 * auf den hellen Seiten wirkt die satte dunkle Fotofläche wie ein
 * Editorial-Bildstreifen aus einem Architektur-Magazin. Das Bild wird auf
 * die Zielhöhe zugeschnitten wirkend eingebettet (pdf-lib kann nicht
 * clippen, daher zeichnen wir das Bild cover-skaliert und maskieren den
 * Überstand mit papierweißen Flächen — ein harter, sauberer Print-Beschnitt
 * statt des früheren Ins-Dunkel-Auslaufens). Eine Akzent-Hairline sitzt als
 * blaue Kante auf der Oberkante. Zeichnet vom oberen Rand `yTop` nach unten
 * und gibt die Unterkante zurück. Fail-soft: ohne Bild passiert nichts
 * (Rückgabe = yTop).
 */
function visualBand(
  ctx: Ctx,
  page: PDFPage,
  img: PDFImage | null,
  x: number,
  yTop: number,
  w: number,
  bandH: number,
  caption?: string,
  /** Vertikaler Bildausschnitt, wenn das Motiv höher ist als das Band:
   *  0 = unterer Bildrand, 0,5 = Mitte (Standard), 1 = oberer Bildrand.
   *  Bei Personen-Motiven höher setzen, sonst schneidet das flache Band
   *  die Köpfe an. */
  fokus = 0.5,
): number {
  if (!img) return yTop;
  const yBottom = yTop - bandH;
  // Bild seitenkorrekt so skalieren, dass es das Band voll deckt (cover):
  // Breite = w, Höhe daraus; ist die zu klein, an der Höhe ausrichten.
  const ratio = img.width / img.height;
  let dw = w;
  let dh = w / ratio;
  if (dh < bandH) {
    dh = bandH;
    dw = bandH * ratio;
  }
  const dx = x + (w - dw) / 2;
  const dy = yBottom - (dh - bandH) * Math.min(1, Math.max(0, fokus));
  // Clip-Ersatz: erst Rahmen-Rechteck als Maske drumherum wäre teuer — wir
  // zeichnen das Bild und maskieren den Überstand oben/unten mit BG-Flächen.
  // Echter Clip auf das Band-Rechteck statt weißer Deck-Masken: Masken
  // übermalten auch Seiteninhalt ÜBER dem Band, sobald das Bild überlief
  // (auf Papierweiß sichtbar — der Diskreter-Verkauf-Kasten wurde so
  // ausradiert). Der Grafikzustand wird nach dem Bild wieder verworfen.
  page.pushOperators(pushGraphicsState(), rectangle(x, yBottom, w, bandH), clip(), endPath());
  page.drawImage(img, { x: dx, y: dy, width: dw, height: dh });
  page.pushOperators(popGraphicsState());
  // Blaue Akzent-Kante auf der Oberkante des Bandes.
  page.drawRectangle({ x, y: yTop - 2, width: w, height: 2, color: ACCENT });
  if (caption) {
    const cs = 8.5;
    // Kräftiger dunkler Scrim unter der Caption: die Bänder sind seit dem
    // Bild-Tausch HELLE Tageslicht-Motive, weiße Schrift braucht dort eine
    // verlässlich dunkle Unterlage statt nur einer Andeutung.
    fadeRect(page, x, yBottom, w, 44, rgb(0, 0, 0), 0.72, 0, 22, "up");
    mkText(page)(caption, x + (w - ctx.reg.widthOfTextAtSize(caption, cs)) / 2, yBottom + 13, cs, ctx.reg, rgb(1, 1, 1), 0.5);
  }
  return yBottom;
}

/* ── Box-Grundbausteine (Website-Regel: runde Ecken, Beam-Kontur, super
 *    subtiler UX-Schatten — gilt für ALLE Boxen des Reports) ─────────── */

/** SVG-Pfad eines Rounded-Rect — Koordinaten laufen y-abwärts, drawSvgPath
 * bekommt daher die OBERKANTE als Anker (dasselbe Muster wie pill()). */
function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M ${rr} 0 H ${w - rr} A ${rr} ${rr} 0 0 1 ${w} ${rr} V ${h - rr} ` +
    `A ${rr} ${rr} 0 0 1 ${w - rr} ${h} H ${rr} A ${rr} ${rr} 0 0 1 0 ${h - rr} ` +
    `V ${rr} A ${rr} ${rr} 0 0 1 ${rr} 0 Z`
  );
}
/** Rounded-Rect mit Füllung und/oder Rand — pdf-lib kennt keinen Eckenradius
 * auf drawRectangle, daher über drawSvgPath. */
function roundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  opts: { color?: Color; opacity?: number; borderColor?: Color; borderWidth?: number } = {},
) {
  page.drawSvgPath(roundedRectPath(w, h, r), {
    x,
    y: y + h,
    ...(opts.color ? { color: opts.color } : {}),
    ...(opts.opacity != null ? { opacity: opts.opacity } : {}),
    ...(opts.borderColor ? { borderColor: opts.borderColor, borderWidth: opts.borderWidth ?? 1 } : {}),
  });
}
/** Superzarter UX-Schatten unter einer Box: drei gestaffelt versetzte,
 * wachsende Rounded-Rects in Tinte mit fallender Deckkraft — pdf-lib kennt
 * weder Blur noch echte Schatten. IMMER VOR der Box zeichnen. */
const SHADOW_INK = rgb(0.16, 0.2, 0.32);
function softShadow(page: PDFPage, x: number, y: number, w: number, h: number, r: number) {
  const layers: [number, number, number][] = [
    [1.5, 2, 0.05],
    [3, 4.5, 0.028],
    [5, 7.5, 0.015],
  ];
  for (const [grow, drop, o] of layers) {
    roundedRect(page, x - grow, y - drop, w + grow * 2, h + grow, r + grow, { color: SHADOW_INK, opacity: o });
  }
}
/** "Beam"-Kontur der Website-Boxen: eine feine Leucht-Hairline auf der
 * Oberkante, zur Mitte hin am hellsten, zu den Ecken hin auslaufend —
 * um den Eckenradius eingerückt, damit sie nicht über die Rundung ragt. */
function beamTop(page: PDFPage, x: number, y: number, w: number, h: number, r: number, color: Color, peak = 0.85) {
  const bx = x + r;
  const bw = w - 2 * r;
  const hairH = 1.4;
  const hy = y + h - hairH;
  // Fünf ineinander liegende, zur Mitte kürzere Segmente statt vieler
  // Mikro-Stufen: fadeRect-Treppen flimmern auf der 1,4pt-Hairline als
  // Punktmuster, gestapelte Deckkraft-Ebenen lesen sich als weicher Beam.
  const ebenen: [number, number][] = [
    [1, 0.16],
    [0.82, 0.1],
    [0.64, 0.1],
    [0.46, 0.12],
    [0.28, 0.16],
  ];
  for (const [anteil, o] of ebenen) {
    page.drawRectangle({ x: bx + (bw * (1 - anteil)) / 2, y: hy, width: bw * anteil, height: hairH, color, opacity: peak * o });
  }
}

/** Helle Print-Übersetzung der "Gradient-glow-Box" der Website: sehr helle
 * SURFACE-Grundfläche mit runden Ecken, blau getönter 1px-Rand, Beam-Kontur
 * oben, subtiler Schatten und ein hauchzarter blauer Schein, der von oben
 * ins Papierweiß ausläuft. */
function glowPanel(page: PDFPage, x: number, y: number, w: number, h: number, opts: { peak?: number } = {}) {
  const peak = opts.peak ?? 0.04;
  const r = 10;
  softShadow(page, x, y, w, h, r);
  roundedRect(page, x, y, w, h, r, { color: SURFACE });
  // Wash läuft bis unter die Beam-Hairline, damit keine harte Oberkante im
  // Panel schwebt — der minimale Übermal-Rest in den Eck-Rundungen ist bei
  // ~4 % Deckkraft unsichtbar.
  fadeRect(page, x + 1, y + h * 0.6, w - 2, h * 0.4 - 1.6, ACCENT, Math.min(peak, 0.05), 0, 26, "down");
  roundedRect(page, x, y, w, h, r, { borderColor: BORDER_GLOW, borderWidth: 1 });
  beamTop(page, x, y, w, h, r, ACCENT);
}

/** Horizontaler Balken mit runden Enden (Kapsel-Form) — Rechteck + 2
 * Randkreise, da pdf-lib keine nativ abgerundeten Balken kennt. */
function roundBarH(page: PDFPage, x: number, y: number, w: number, h: number, color: Color, opacity = 1) {
  const r = h / 2;
  if (w <= h) {
    page.drawCircle({ x: x + w / 2, y: y + r, size: Math.min(r, w / 2), color, opacity });
    return;
  }
  page.drawRectangle({ x: x + r, y, width: w - h, height: h, color, opacity });
  page.drawCircle({ x: x + r, y: y + r, size: r, color, opacity });
  page.drawCircle({ x: x + w - r, y: y + r, size: r, color, opacity });
}

/** Kennzahlen-Kachel in zwei Ausführungen: Vollblau (satte ACCENT-Fläche,
 * weißer Wert — der Hero unter den Kacheln) oder hell im Glass-Look der
 * übrigen Panels (glowPanel-Grund, Wert in Akzentblau). Zu viele
 * Vollblau-Kacheln nebeneinander erschlagen sich gegenseitig — hell ist
 * der Standard fürs Raster, Vollblau das gezielte Highlight. */
function statTile(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  sub?: string,
  opts: { hell?: boolean } = {},
) {
  const r = 10;
  if (opts.hell) {
    glowPanel(page, x, y, w, h, { peak: 0.05 });
  } else {
    softShadow(page, x, y, w, h, r);
    roundedRect(page, x, y, w, h, r, { color: ACCENT });
    beamTop(page, x, y, w, h, r, ON_ACCENT, 0.65);
  }
  const t = mkText(page);
  const cx = x + w / 2;
  const valColor = opts.hell ? ACCENT : ON_ACCENT;
  const subColor = opts.hell ? MUTED : ON_ACCENT_MUTED;
  const lblColor = opts.hell ? FAINT : ON_ACCENT_MUTED;
  // Wert bewusst NICHT in AKIRA: die Display-Schrift ist bei Ziffern schlecht
  // lesbar (schmale, stilisierte Formen) — ctx.bold (Helvetica Bold, der
  // Inter-Extrabold-Ersatz des PDFs). AKIRA bleibt Headlines vorbehalten.
  // Groß und sauber mittig in der oberen Zone, mit klarem Abstand zum Label
  // (und ggf. der Punktreihe) darunter.
  // Label-Größe adaptiv (7,5 → 6 pt), dann Umbruch auf höchstens zwei Zeilen,
  // erst zuletzt kürzen: lange Beschriftungen („Sichtkontakte bei Kauf- und
  // Mietinteressenten") stießen sonst an den Kachelrand. Der Spacing-Aufschlag
  // muss dabei mitgemessen werden (s. textWidthSpaced).
  const spacing = 0.6;
  const maxLabelW = w - 16;
  const rohLabel = label.toUpperCase();
  let lblSize = 7.5;
  while (lblSize > 6 && textWidthSpaced(ctx.reg, rohLabel, lblSize, spacing) > maxLabelW) lblSize -= 0.25;
  // wrap() misst ohne Spacing — die Zeilenbreite deshalb etwas konservativer
  // ansetzen, sonst läuft eine umbrochene Zeile mit Spacing doch über.
  const lblZeilen = (
    textWidthSpaced(ctx.reg, rohLabel, lblSize, spacing) <= maxLabelW
      ? [rohLabel]
      : wrap(rohLabel, ctx.reg, lblSize, maxLabelW - rohLabel.length * spacing * 0.5)
  ).slice(0, 2);
  const lblHoehe = lblZeilen.length * (lblSize + 2.5);

  const valSize = fitFontSize(ctx.bold, value, w - 20, Math.min(26, h * 0.38), 12);
  // Wert vertikal auf den Raum ÜBER dem Label zentrieren, damit ein
  // zweizeiliges Label ihn nach oben schiebt statt ihn zu bedrängen.
  const labelTop = y + 11 + lblHoehe;
  const valY = sub ? y + h - 18 - valSize : labelTop + (y + h - labelTop) / 2 - valSize * 0.42;
  t(value, cx - ctx.bold.widthOfTextAtSize(value, valSize) / 2, valY, valSize, ctx.bold, valColor);
  if (sub) {
    const s = ellipsize(sub, ctx.reg, 8, w - 18);
    t(s, cx - ctx.reg.widthOfTextAtSize(s, 8) / 2, valY - 15, 8, ctx.reg, subColor);
  }
  let ly = y + 11 + (lblZeilen.length - 1) * (lblSize + 2.5);
  for (const zeile of lblZeilen) {
    const l = ellipsize(zeile, ctx.reg, lblSize, maxLabelW);
    t(l, cx - textWidthSpaced(ctx.reg, l, lblSize, spacing) / 2, ly, lblSize, ctx.reg, lblColor, spacing);
    ly -= lblSize + 2.5;
  }
}

/** Sparkline über drawLine-Segmente (Website-MarktPanel-Optik): Fläche
 * darunter als vertikale fadeRect-Streifen (ACCENT, 0.10 → 0), Endpunkt-
 * Marker als glow()+Punkt. `points` sind Index-Werte beliebiger Skala. */
function sparkline(page: PDFPage, x: number, y: number, w: number, h: number, points: number[], color: Color = ACCENT) {
  const n = points.length;
  if (n < 2) return;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.0001, max - min);
  const stepX = w / (n - 1);
  const py = (v: number) => y + ((v - min) / range) * h;
  // Flächenfüllung: je Segment in Sub-Streifen unterteilt, damit die "Treppe"
  // der schrägen Linie sichtbar folgt statt grob zu blocken.
  const sub = 6;
  for (let i = 0; i < n - 1; i++) {
    const y0 = py(points[i]);
    const y1 = py(points[i + 1]);
    for (let s = 0; s < sub; s++) {
      const t0 = s / sub;
      const t1 = (s + 1) / sub;
      const sx = x + i * stepX + t0 * stepX;
      const sw = stepX / sub;
      const sTop = y0 + (y1 - y0) * ((t0 + t1) / 2);
      fadeRect(page, sx, y, sw + 0.5, Math.max(1, sTop - y), color, 0.22, 0, 14, "down");
    }
  }
  for (let i = 0; i < n - 1; i++) {
    page.drawLine({
      start: { x: x + i * stepX, y: py(points[i]) },
      end: { x: x + (i + 1) * stepX, y: py(points[i + 1]) },
      thickness: 1.6,
      color,
      opacity: 0.9,
    });
  }
  const ex = x + w;
  const ey = py(points[n - 1]);
  glow(page, ex, ey, 14, color, 0.09, 8);
  page.drawCircle({ x: ex, y: ey, size: 4.2, color: BG });
  page.drawCircle({ x: ex, y: ey, size: 4.2, borderColor: color, borderWidth: 1.4 });
  page.drawCircle({ x: ex, y: ey, size: 1.8, color });
}

/** Breite/Höhe eines Rundrand-Pills (Chip) VOR dem Zeichnen — für
 * Zeilenumbruch/Rechtsbündigkeit, s. pill()/chipRow(). Die Breite MUSS
 * Textbreite + 2×(Endradius + Mindestabstand) sein: die "flache" Mittelzone
 * zwischen den beiden Randkreisen ist nur `w - h` breit (h = 2×Radius), ein
 * reines "Textbreite + 2×padX" ohne den Kappen-Durchmesser gegenzurechnen
 * lässt den Text in die runden Enden hineinlaufen. */
function pillMeasure(font: PDFFont, label: string, size: number): { w: number; h: number } {
  const h = size + 9;
  const r = h / 2;
  const minPad = 4; // Mindestabstand Text ↔ Kappen-Rand je Seite
  const textW = font.widthOfTextAtSize(label, size);
  const w = Math.max(h, textW + 2 * (r + minPad));
  return { w, h };
}
/** Rundrand-Pill (Chip) als EIN geschlossener Rounded-Rect-Pfad (drawSvgPath).
 * Bewusst kein Rechteck+Vollkreise-Aufbau: bei reiner Outline schneiden die
 * inneren Kreisbögen der Kappen sonst sichtbar durch den Pill-Innenraum.
 * Optional gefüllt (Status-Badges), sonst nur Outline. Gibt die Breite zurück. */
function pill(
  page: PDFPage,
  font: PDFFont,
  label: string,
  x: number,
  y: number,
  size: number,
  opts: { fg?: Color; border?: Color; fill?: Color } = {},
): number {
  const { w, h } = pillMeasure(font, label, size);
  const r = h / 2;
  const fg = opts.fg ?? MUTED;
  const border = opts.border ?? BORDER;
  // SVG-Koordinaten laufen y-abwärts — drawSvgPath bekommt daher die OBERKANTE.
  const path =
    `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} ` +
    `A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} ` +
    `V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(path, {
    x,
    y: y + h,
    ...(opts.fill ? { color: opts.fill } : {}),
    borderColor: border,
    borderWidth: 1,
  });
  page.drawText(label, { x: x + (w - font.widthOfTextAtSize(label, size)) / 2, y: y + r - size * 0.36, size, font, color: fg });
  return w;
}
/** Ausstattungs-Chips: blau getönte Rundrand-Pills mit gezeichnetem Häkchen
 * (die PNG-Icons des dunklen Designs tragen auf Hell nicht) — farblich klar
 * abgesetzt statt grauer Outline. Bricht automatisch um, gibt die y-Position
 * nach der letzten Reihe zurück. */
const CHIP_FILL = rgb(0.906, 0.933, 1);
function featureChipRow(ctx: Ctx, page: PDFPage, items: string[], x: number, yTop: number, maxW: number): number {
  const size = 8.5;
  const h = 22;
  let cx = x;
  let cy = yTop;
  for (const raw of items) {
    if (!raw) continue;
    const label = ellipsize(raw, ctx.bold, size, maxW - 44);
    const wPill = ctx.bold.widthOfTextAtSize(label, size) + 40;
    if (cx > x && cx - x + wPill > maxW) {
      cx = x;
      cy -= h + 7;
    }
    const py = cy - h;
    roundedRect(page, cx, py, wPill, h, h / 2, { color: CHIP_FILL, borderColor: BORDER_GLOW, borderWidth: 1 });
    // Häkchen aus zwei Linien in Akzentblau statt eines Icon-Assets.
    const hx = cx + 14;
    const hy = py + h / 2 - 1;
    page.drawLine({ start: { x: hx - 3, y: hy }, end: { x: hx - 0.5, y: hy - 2.8 }, thickness: 1.5, color: ACCENT });
    page.drawLine({ start: { x: hx - 0.5, y: hy - 2.8 }, end: { x: hx + 4.5, y: hy + 3.6 }, thickness: 1.5, color: ACCENT });
    mkText(page)(label, cx + 25, py + h / 2 - size * 0.36, size, ctx.bold, ACCENT_SOFT);
    cx += wPill + 7;
  }
  return cy - h - 7;
}

/** Chip-Reihe mit automatischem Zeilenumbruch (Ausstattung, Objekt-Details).
 * `yTop` ist die Oberkante der ersten Reihe; gibt die y-Position NACH der
 * letzten Reihe zurück. */
function chipRow(ctx: Ctx, page: PDFPage, items: string[], x: number, yTop: number, maxW: number, size = 8): number {
  let cx = x;
  let cy = yTop;
  let rowH = size + 9;
  for (const raw of items) {
    if (!raw) continue;
    const label = ellipsize(raw, ctx.reg, size, maxW - 20);
    const { w: pw, h: ph } = pillMeasure(ctx.reg, label, size);
    rowH = ph;
    if (cx > x && cx - x + pw > maxW) {
      cx = x;
      cy -= ph + 6;
    }
    pill(page, ctx.reg, label, cx, cy - ph, size, { fg: MUTED, border: BORDER });
    cx += pw + 6;
  }
  return cy - rowH - 6;
}

/* ── Seite 1: DECKBLATT — helle Editorial-Seite, zentriertes Logo ──────── */
/**
 * Helles Deckblatt im Stil eines teuren Geschäftsberichts: viel Papierweiß,
 * das Logo-Ensemble in Fast-Schwarz mit einem vollblauen Kicker-Band als
 * Farbmoment, darunter das dunkle Startseiten-Hero als vollbreites
 * Editorial-Band über dem Footer. Kein header() hier — das Logo ist
 * stattdessen selbst das zentrale, große Element der Seite.
 */
function drawCover(ctx: Ctx, d: ReportData, objektTitle: string, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  const cx = w / 2;

  // Logo-Ensemble, zentriert, Schwerpunkt deutlich ÜBER der Seitenmitte
  // (darunter braucht das Foto-Band Raum): Mark oben, darunter groß die
  // AKIRA-Wortmarke in Tinten-Schwarz als dominantes Element.
  let y = h - 176;
  if (ctx.mark) {
    const mh = 44;
    const mw = (ctx.mark.width / ctx.mark.height) * mh;
    page.drawImage(ctx.mark, { x: cx - mw / 2, y: y - mh, width: mw, height: mh });
    y -= mh + 18;
  }
  const word = "RIEGEL";
  const wordSize = 44;
  const wordSpacing = 4; // Zeichenabstand-Verhältnis wie im header() (dort 1.5 bei 15pt)
  const wordW = textWidthSpaced(ctx.akira, word, wordSize, wordSpacing);
  t(word, cx - wordW / 2, y - wordSize, wordSize, ctx.akira, FG, wordSpacing);
  y -= wordSize + 26;

  // Vollblaues Kicker-Band statt der früheren grauen Zeile: das eine satte
  // Farbmoment der ansonsten weißen Seite (weiße Letterspacing-Schrift auf
  // ACCENT, wie die on-accent-Buttons der Website).
  const kicker = "MARKTWERT-REPORT";
  const kickerSpacing = 2.4;
  const kickerSize = 10.5;
  const kickerW = textWidthSpaced(ctx.reg, kicker, kickerSize, kickerSpacing);
  const bandW = kickerW + 56;
  const bandH = 30;
  page.drawRectangle({ x: cx - bandW / 2, y: y - bandH, width: bandW, height: bandH, color: ACCENT });
  t(kicker, cx - kickerW / 2, y - bandH / 2 - kickerSize * 0.36, kickerSize, ctx.reg, ON_ACCENT, kickerSpacing);
  y -= bandH + 40;

  const praefix = "Erstellt für";
  t(praefix, cx - ctx.reg.widthOfTextAtSize(praefix, 9) / 2, y, 9, ctx.reg, FAINT);
  y -= 22;
  const name = d.name || "Sie";
  t(name, cx - ctx.bold.widthOfTextAtSize(name, 17) / 2, y, 17, ctx.bold, FG);
  y -= 24;
  const infoLine = `Objekt: ${objektTitle} · Stand ${d.dateLabel} · Vertraulich`;
  t(infoLine, cx - ctx.reg.widthOfTextAtSize(infoLine, 9) / 2, y, 9, ctx.reg, MUTED);
  y -= 34;

  // Paar mit dem RIEGEL-WERT-REPORT am Fenster als vollbreites
  // Editorial-Band bis kurz über den Footer — Tageslicht, echte Menschen,
  // und inhaltlich genau das Dokument in der Hand des Empfängers.
  // Vollbreite (x = 0) statt Satzspiegel: das Band darf als einziges
  // Element der Seite randlos wirken. Fail-soft: ohne Bild bleibt die
  // Seite schlicht weiß.
  if (y - 60 > bandFloor) {
    visualBand(ctx, page, ctx.paarReport, 0, y, w, y - bandFloor);
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite 2: BEWERTUNG (Wert + Daten + Objekt-Luftbild) ── */
function drawValuation(ctx: Ctx, d: ReportData, objektTitle: string, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "BEWERTUNG");

  // Wert-Hero als VOLLBLAUES Band über die ganze Seitenbreite (randlos):
  // auf Weiß trägt die satte ACCENT-Fläche die Dramatik, die im dunklen
  // Design Light-Rays und Glow hatten. Der Marktwert steht riesig in
  // weißem AKIRA darauf — der unbestrittene Held der Seite.
  const heroH = 190;
  const heroTop = y;
  const heroBottom = y - heroH;
  page.drawRectangle({ x: 0, y: heroBottom, width: w, height: heroH, color: ACCENT });

  const cx = w / 2;
  // Weicher weißer Schein hinter der großen Wert-Zahl — der fokale Punkt.
  glow(page, cx, heroTop - 66, 150, ON_ACCENT, 0.05, 12);
  const lbl = "GESCHÄTZTER MARKTWERT";
  t(lbl, cx - textWidthSpaced(ctx.reg, lbl, 9, 1.5) / 2, heroTop - 28, 9, ctx.reg, ON_ACCENT_MUTED, 1.5);
  const mid = eur(d.value.mid);
  const midSize = fitFontSize(ctx.akira, mid, w - 2 * M - 60, 42, 24);
  t(mid, cx - ctx.akira.widthOfTextAtSize(mid, midSize) / 2, heroTop - 46 - midSize, midSize, ctx.akira, ON_ACCENT);
  if (d.value.pricePerSqm) {
    const ps = `${eur(d.value.pricePerSqm)} / m²`;
    t(ps, cx - ctx.reg.widthOfTextAtSize(ps, 10) / 2, heroTop - 100, 10, ctx.reg, ON_ACCENT_MUTED);
  }

  // Spannen-Track im Band: weiße Transparenz-Spur, der Glow strahlt
  // SYMMETRISCH vom Marker nach beiden Seiten aus — eine einseitig
  // gefüllte Spur läse sich wie ein halb voller Fortschrittsbalken.
  const trackL = M + 40;
  const trackR = w - M - 40;
  const trackW = trackR - trackL;
  const gaugeY = heroBottom + 62;
  roundBarH(page, trackL, gaugeY - 3, trackW, 6, ON_ACCENT, 0.18);
  const range = Math.max(1, d.value.high - d.value.low);
  let f = (d.value.mid - d.value.low) / range;
  f = Math.min(0.94, Math.max(0.06, Number.isFinite(f) ? f : 0.5));
  const mx = trackL + f * trackW;
  fadeRect(page, trackL + 3, gaugeY - 3, Math.max(6, mx - trackL - 3), 6, ON_ACCENT, 0.85, 0.05, 34, "left");
  fadeRect(page, mx, gaugeY - 3, Math.max(6, trackR - 3 - mx), 6, ON_ACCENT, 0.85, 0.05, 34, "right");
  // Marker (Schein → Ring → Punkt) + dünne Führungslinie
  page.drawLine({ start: { x: mx, y: gaugeY + 12 }, end: { x: mx, y: gaugeY - 12 }, thickness: 1, color: ON_ACCENT, opacity: 0.55 });
  page.drawCircle({ x: mx, y: gaugeY, size: 11, color: ON_ACCENT, opacity: 0.25 });
  page.drawCircle({ x: mx, y: gaugeY, size: 6, color: ACCENT });
  page.drawCircle({ x: mx, y: gaugeY, size: 6, borderColor: ON_ACCENT, borderWidth: 2 });
  page.drawCircle({ x: mx, y: gaugeY, size: 2.5, color: ON_ACCENT });
  // Spannen-Beschriftung (von / bis), tabellarisch ausgerichtet
  t("von", trackL, gaugeY - 30, 7.5, ctx.reg, ON_ACCENT_MUTED, 1);
  t(eur(d.value.low), trackL, gaugeY - 22, 10, ctx.bold, ON_ACCENT);
  textRight(page, "bis", trackR, gaugeY - 30, 7.5, ctx.reg, ON_ACCENT_MUTED);
  textRight(page, eur(d.value.high), trackR, gaugeY - 22, 10, ctx.bold, ON_ACCENT);
  // Annotation, was den Wert innerhalb der Spanne bewegt — mit Beispielen,
  // « » als Richtungspfeile (WinAnsi kennt keine echten Pfeil-Glyphen).
  t("« drückt: Sanierungsstau, Energieklasse F–H", trackL, gaugeY - 46, 7.5, ctx.reg, ON_ACCENT_MUTED);
  textRight(page, "hebt: Modernisierung, Lage, gute Ausstattung »", trackR, gaugeY - 46, 7.5, ctx.reg, ON_ACCENT_MUTED);

  y = heroBottom - 34;

  const colW = (w - 2 * M - 24) / 2;
  const start = y;
  // Zeilen-Tupel: erstes Feld war der Icon-Name des dunklen Designs — die
  // hellen Icon-Assets tragen auf Weiß nicht (zu blass) und sind durch einen
  // kleinen blauen Punktmarker ersetzt; das Feld bleibt für die Zeilendaten
  // erhalten, wird aber nicht mehr gezeichnet.
  const section = (title: string, rows: [string, string, string][], x: number) => {
    let yy = start;
    heading(ctx, page, title, x, yy, 11);
    yy -= 18;
    for (const [, label, value] of rows) {
      if (!value) continue;
      page.drawCircle({ x: x + 3, y: yy + 3.2, size: 1.7, color: ACCENT });
      // Label darf nie in den rechtsbündigen Wert laufen (langes Label +
      // langer Wert kollidierten sonst, z. B. „Bodenrichtwert (amtl.,
      // informativ)" gegen „895 €/m²") — auf die Restbreite kürzen.
      const valW = ctx.bold.widthOfTextAtSize(value, 10);
      t(ellipsize(label, ctx.reg, 10, colW - 13 - valW - 10), x + 13, yy, 10, ctx.reg, MUTED);
      textRight(page, value, x + colW, yy, 10, ctx.bold, FG);
      yy -= 7;
      page.drawLine({ start: { x, y: yy }, end: { x: x + colW, y: yy }, thickness: 0.5, color: BORDER });
      yy -= 14;
    }
    return yy;
  };
  const a = section("Objektdaten", [
    ["building", "Objektart", d.objektartLabel ?? "–"],
    // Bei Gewerbe heißt die Fläche Nutzfläche (wie im Rechner-Formular) —
    // darunter ggf. der Misch-Split (Halle/Wohnen), Büro ist der Rest.
    ["ruler", d.objektartLabel === "Gewerbe" ? "Nutzfläche" : "Wohnfläche", d.wohnflaeche ? `${d.wohnflaeche} m²` : "–"],
    ["building", "davon Halle/Lager", d.hallenflaeche ? `${d.hallenflaeche} m²` : ""],
    ["bed", "davon Wohnfläche", d.mischWohnflaeche ? `${d.mischWohnflaeche} m²` : ""],
    ["tree", "Grundstück", d.grundflaeche ? `${d.grundflaeche} m²` : "–"],
    ["bed", "Zimmer", d.zimmer ? String(d.zimmer) : "–"],
    ["calendar", "Baujahr", d.baujahr ? String(d.baujahr) : "–"],
    ["sparkle", "Zustand", d.zustand || "–"],
    ["star", "Qualität", d.qualitaet || "–"],
    ["bolt", "Energieklasse", d.energieklasse || "–"],
    // Leerstring statt "–": nur bei Mehrfamilienhaus (Ertragswert-Ansatz)
    // gesetzt, section() blendet die Zeile für alle anderen Objektarten aus.
    ["euro", "Jahresnettokaltmiete", d.jahresnettokaltmiete ? `${eur(Number(d.jahresnettokaltmiete))}/Jahr` : ""],
    // Vermietungsstand nur zeigen, wenn Leerstand im Spiel ist — bei voll
    // vermieteten Objekten wäre die Zeile redundant zur Miete darüber.
    [
      "layers",
      "Vermietungsstand",
      d.value.mietAnsatz && d.value.mietAnsatz.leerstandM2 > 0
        ? d.value.mietAnsatz.leerstandAnteil >= 1
          ? "leer stehend"
          : `teilweise vermietet (${fmtDe(d.value.mietAnsatz.leerstandM2)} m² leer)`
        : "",
    ],
    [
      "euro",
      "Angesetzte Marktmiete",
      d.value.mietAnsatz && d.value.mietAnsatz.marktmieteGeschaetzt > 0
        ? `${eur(d.value.mietAnsatz.marktmieteGeschaetzt)}/Jahr (${fmtDe(d.value.mietAnsatz.marktmieteM2)} €/m²)`
        : "",
    ],
    ["layers", "Wohneinheiten", d.wohneinheiten ? String(d.wohneinheiten) : ""],
    ["building", "Gewerbeeinheiten", d.gewerbeeinheiten ? String(d.gewerbeeinheiten) : ""],
  ], M);
  const b = section("Kennzahlen", [
    ["euro", "Preis / m²", d.value.pricePerSqm ? eur(d.value.pricePerSqm) : "–"],
    ["layers", "Vergleichsobjekte", d.value.comparables != null ? String(d.value.comparables) : "–"],
    ["trend", "Markttrend (Lage)", d.value.trendPct != null ? `+${fmtDe(d.value.trendPct)} % p.a.` : "–"],
    ["pin", "Mikrolage", d.value.mikrolage != null ? `${fmtDe(d.value.mikrolage)}/10` : "–"],
    ["chart", "Daten-Konfidenz", d.value.confidence != null ? `${d.value.confidence} %` : "–"],
    // Leerstring statt "–": nur bei Mehrfamilienhaus gesetzt (Ertragswert-
    // Vervielfältiger), Zeile entfällt sonst komplett.
    ["euro", "Vervielfältiger (Ertragswert)", d.value.vervielfaeltiger != null ? `${d.value.vervielfaeltiger}×` : ""],
    // Leerstring statt "–": section() überspringt die Zeile komplett, wenn
    // für die Koordinaten kein amtlicher Wert ermittelt werden konnte.
    [
      "tree",
      brwPriceRelevant(d.objektartLabel) ? "Bodenrichtwert (amtlich)" : "Bodenrichtwert (informativ)",
      // Zone bewusst NICHT in dieser schmalen 2-Spalten-Kachel (Kollision mit
      // dem Label) — sie steht auf dem Ergebnis-Wert-Hero und im Rechtstext.
      d.bodenrichtwert ? `${eur(d.bodenrichtwert.brw)}/m²` : "",
    ],
  ], M + colW + 24);

  let yy = Math.min(a, b) - 8;

  // Ausstattungs-Chips (max. 12) — blau abgesetzte Häkchen-Pills unter den
  // Objektdaten, mit spürbar Luft zum Kleingedruckten darunter.
  if (d.ausstattung && d.ausstattung.length > 0) {
    const items = d.ausstattung.slice(0, 12).map((s) => toWinAnsi(s)).filter(Boolean);
    if (items.length > 0) {
      yy -= 8;
      yy = featureChipRow(ctx, page, items, M, yy, w - 2 * M);
      yy -= 14;
    }
  }

  for (const line of wrap("Datenbasierte Sofort-Einschätzung aus amtlichen Bodenrichtwerten, regionalen Vergleichsobjekten und der RIEGEL-Transaktionsdatenbank.", ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, yy, 9.5, ctx.reg, MUTED);
    yy -= 13;
  }
  yy -= 10;

  // Objekt-Luftbild (Esri/Maxar) — ersetzt das früher hier gezeigte
  // Stimmungsbild (COVER_JPG_B64), das auf w × Resthöhe verzerrt gestreckt
  // wurde. Der Abruf liefert IMMER 1200×720 (5:3) — hier entsprechend im
  // festen Seitenverhältnis statt verzerrt gezeichnet: volle Inhaltsbreite mit
  // Höhe = Breite × 0,6, wenn dafür mindestens 120pt Resthöhe da sind, sonst
  // so schmal, dass Höhe = Resthöhe exakt passt (zentriert). Der zusätzliche
  // "satH > restH"-Check fängt den Grenzfall ab, in dem 120pt Resthöhe
  // rechnerisch NICHT für die volle 5:3-Höhe reichen — ohne ihn würde das Bild
  // nach oben in den Fließtext hineinragen. Bei ctx.satellite == null (Fail-
  // soft, s. Ctx-Kommentar) entfällt der Block ersatzlos.
  const restH = yy - 70;
  if (ctx.satellite && restH >= 40) {
    const contentW = w - 2 * M;
    let satW = contentW;
    let satH = satW * 0.6;
    if (restH < 120 || satH > restH) {
      satH = restH;
      satW = satH / 0.6;
    }
    const satX = M + (contentW - satW) / 2;
    const satY = 70;
    page.drawImage(ctx.satellite, { x: satX, y: satY, width: satW, height: satH });
    // Marker in der Bildmitte (Objekt-Position) — Logik vom alten Deckblatt übernommen.
    const scx = satX + satW / 2;
    const scy = satY + satH / 2;
    page.drawCircle({ x: scx, y: scy, size: 13, color: ACCENT, opacity: 0.22 });
    page.drawCircle({ x: scx, y: scy, size: 7, color: BG });
    page.drawCircle({ x: scx, y: scy, size: 7, borderColor: ACCENT_SOFT, borderWidth: 2.5 });
    page.drawCircle({ x: scx, y: scy, size: 3, color: ACCENT });
    // Adress-Chip unten links
    const chip = ellipsize(objektTitle, ctx.bold, 9.5, satW - 120);
    const cw = ctx.bold.widthOfTextAtSize(chip, 9.5) + 26;
    page.drawRectangle({ x: satX + 12, y: satY + 12, width: cw, height: 24, color: BG, opacity: 0.92 });
    page.drawRectangle({ x: satX + 12, y: satY + 12, width: 3, height: 24, color: ACCENT });
    t(chip, satX + 24, satY + 20, 9.5, ctx.bold, FG);
    // Quelle
    textRight(page, "Luftbild © Esri · Maxar", satX + satW - 10, satY + 9, 7, ctx.reg, rgb(0.85, 0.85, 0.85));
    page.drawRectangle({ x: satX, y: satY, width: satW, height: satH, borderColor: BORDER, borderWidth: 1 });
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite 3: PREIS-ZUSAMMENSETZUNG ────────────────────── */

/** Rechnet Preis-Faktoren zu einem Wasserfall zurück: In estimateValue wirken
 * die Faktoren multiplikativ (mid = Basis × Π(1+effectPct/100)) — hier
 * rückwärts aufgelöst, je Faktor auf volle 1.000 € gerundet. Der letzte
 * Schritt gleicht die Rundungsdifferenz exakt aus: die Summe der Schritte
 * MUSS immer `mid` ergeben, sonst wirkt die Grafik unglaubwürdig/falsch. */
function computeWaterfall(mid: number, factors: { label: string; effectPct: number }[]) {
  const denom = factors.reduce((acc, f) => acc * (1 + f.effectPct / 100), 1);
  const basis = Math.round((denom !== 0 ? mid / denom : mid) / 1000) * 1000;
  let running = basis;
  const steps = factors.map((f) => {
    const before = running;
    let after = before * (1 + f.effectPct / 100);
    after = Math.round(after / 1000) * 1000;
    const delta = after - before;
    running = after;
    return { label: f.label, effectPct: f.effectPct, delta, before, after };
  });
  if (steps.length > 0) {
    const diff = mid - running;
    if (diff !== 0) {
      steps[steps.length - 1].after += diff;
      steps[steps.length - 1].delta += diff;
      running = mid;
    }
  } else {
    running = mid;
  }
  return { basis, steps, total: running };
}

/** Multi-Segment-Balken "Wie sich der Wert zusammensetzt": Basis + Faktoren
 * als Flächen-Anteile nach Betrag (grobe Größenordnung, kein Kreisdiagramm —
 * pdf-lib kann keine echten Pie-Charts ohne aufwendige Bezier-Handarbeit). */
function drawCompositionBar(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  h: number,
  basis: number,
  steps: { label: string; delta: number }[],
) {
  const yBot = yTop - h;
  const pos = steps.filter((s) => s.delta >= 0);
  const neg = steps.filter((s) => s.delta < 0);
  const totalMag = basis + steps.reduce((a, s) => a + Math.abs(s.delta), 0) || 1;
  page.drawRectangle({ x, y: yBot, width: w, height: h, color: SURFACE });
  let cx = x;
  const seg = (val: number, kind: "basis" | "pos" | "neg", opacity: number, labelText: string) => {
    const segW = Math.max(0.6, (Math.abs(val) / totalMag) * w);
    if (kind === "neg") {
      page.drawRectangle({ x: cx, y: yBot, width: segW, height: h, color: BORDER });
      page.drawRectangle({ x: cx, y: yBot, width: segW, height: h, borderColor: NEG, borderWidth: 1 });
    } else {
      page.drawRectangle({ x: cx, y: yBot, width: segW, height: h, color: ACCENT, opacity });
    }
    if (segW >= 26) {
      const l = ellipsize(labelText, ctx.reg, 7.5, segW - 2);
      mkText(page)(l, cx + 2, yBot - 11, 7.5, ctx.reg, MUTED);
      const valTxt = kind === "basis" ? eur(val) : `${val >= 0 ? "+" : "-"}${eur(Math.abs(val))}`;
      const valColor = kind === "basis" ? FG : kind === "neg" ? NEG : ACCENT_SOFT;
      mkText(page)(valTxt, cx + 2, yBot - 21, 8, ctx.bold, valColor);
    }
    if (cx > x) page.drawLine({ start: { x: cx, y: yBot }, end: { x: cx, y: yTop }, thickness: 0.75, color: BG });
    cx += segW;
  };
  seg(basis, "basis", 0.32, "Basiswert Lage & Fläche");
  pos.forEach((s, i) => seg(s.delta, "pos", pos.length <= 1 ? 0.72 : 0.5 + (i / (pos.length - 1)) * 0.45, s.label));
  neg.forEach((s) => seg(s.delta, "neg", 1, s.label));
  page.drawRectangle({ x, y: yBot, width: w, height: h, borderColor: BORDER, borderWidth: 1 });
}

/** Wasserfall-Diagramm: Kategorien Basis → je Faktor → Ergebnis, schwebende
 * Balken je Delta, dünne gestrichelte Verbinderlinien zwischen den Stufen.
 * Gibt die y-Position nach dem Diagramm (inkl. Beschriftungszeilen) zurück. */
function drawWaterfall(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  chartH: number,
  basis: number,
  steps: { label: string; delta: number; before: number; after: number }[],
  mid: number,
): number {
  const cats = steps.length + 2;
  const gap = 8;
  const barW = (w - gap * (cats - 1)) / cats;
  const allVals = [basis, mid, ...steps.flatMap((s) => [s.before, s.after])];
  const vMin = Math.min(...allVals);
  const vMax = Math.max(...allVals);
  const pad = (vMax - vMin) * 0.15 || vMax * 0.05 || 1;
  const domMin = vMin - pad;
  const domMax = vMax + pad;
  const baseY = yTop - chartH;
  const yOf = (v: number) => baseY + ((v - domMin) / (domMax - domMin)) * chartH;

  const barLabel = (label: string, sub: string, bx: number, bw: number, color: Color) => {
    const l = ellipsize(label, ctx.reg, 7.5, bw + 6);
    mkText(page)(l, bx + bw / 2 - ctx.reg.widthOfTextAtSize(l, 7.5) / 2, baseY - 12, 7.5, ctx.reg, MUTED);
    const s = ellipsize(sub, ctx.bold, 8.5, bw + 8);
    mkText(page)(s, bx + bw / 2 - ctx.bold.widthOfTextAtSize(s, 8.5) / 2, baseY - 23, 8.5, ctx.bold, color);
  };

  let cx = x;
  const basisY = yOf(basis);
  page.drawRectangle({ x: cx, y: baseY, width: barW, height: Math.max(1, basisY - baseY), color: ACCENT, opacity: 0.65 });
  barLabel("Basis", eur(basis), cx, barW, FG);
  let prevTopX = cx + barW;
  let prevTopY = basisY;
  cx += barW + gap;

  for (const s of steps) {
    const yBefore = yOf(s.before);
    const yAfter = yOf(s.after);
    const top = Math.max(yBefore, yAfter);
    const bot = Math.min(yBefore, yAfter);
    const positive = s.delta >= 0;
    page.drawLine({ start: { x: prevTopX, y: yBefore }, end: { x: cx, y: yBefore }, thickness: 0.75, color: BORDER, dashArray: [2, 2] });
    if (positive) {
      page.drawRectangle({ x: cx, y: bot, width: barW, height: Math.max(1, top - bot), color: ACCENT, opacity: 0.78 });
    } else {
      page.drawRectangle({ x: cx, y: bot, width: barW, height: Math.max(1, top - bot), color: BORDER });
      page.drawRectangle({ x: cx, y: bot, width: barW, height: Math.max(1, top - bot), borderColor: NEG, borderWidth: 1 });
    }
    barLabel(s.label, `${positive ? "+" : "-"}${eur(Math.abs(s.delta))}`, cx, barW, positive ? ACCENT_SOFT : NEG);
    prevTopX = cx + barW;
    prevTopY = yAfter;
    cx += barW + gap;
  }

  const midY = yOf(mid);
  page.drawLine({ start: { x: prevTopX, y: prevTopY }, end: { x: cx, y: prevTopY }, thickness: 0.75, color: BORDER, dashArray: [2, 2] });
  page.drawRectangle({ x: cx, y: baseY, width: barW, height: Math.max(1, midY - baseY), color: ACCENT, opacity: 0.95 });
  barLabel("Ergebnis", eur(mid), cx, barW, FG);

  page.drawLine({ start: { x, y: baseY }, end: { x: x + w, y: baseY }, thickness: 0.75, color: BORDER });
  return baseY - 26;
}

/** Kompakte Tabelle Faktor | Wirkung ±% | Auswirkung (Δ€), rechtsbündig. */
function drawFactorTable(ctx: Ctx, page: PDFPage, x: number, yTop: number, w: number, steps: { label: string; effectPct: number; delta: number }[]): number {
  let y = yTop;
  const t = mkText(page);
  const col2R = x + w - 130;
  t("FAKTOR", x, y, 8, ctx.bold, FAINT, 0.6);
  textRight(page, "WIRKUNG", col2R, y, 8, ctx.bold, FAINT);
  textRight(page, "AUSWIRKUNG", x + w, y, 8, ctx.bold, FAINT);
  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.5, color: BORDER });
  y -= 14;
  for (const s of steps) {
    t(ellipsize(s.label, ctx.reg, 9.5, w - 220), x, y, 9.5, ctx.reg, FG);
    textRight(page, `${s.effectPct >= 0 ? "+" : ""}${s.effectPct} %`, col2R, y, 9.5, ctx.reg, s.effectPct >= 0 ? POS : NEG);
    textRight(page, `${s.delta >= 0 ? "+" : "-"}${eur(Math.abs(s.delta))}`, x + w, y, 9.5, ctx.bold, FG);
    y -= 8;
    page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.4, color: BORDER, opacity: 0.6 });
    y -= 13;
  }
  return y;
}

/** Branch (a): Faktoren vorhanden — Segment-Balken + Wasserfall + Tabelle. */
function drawFactorComposition(ctx: Ctx, page: PDFPage, factors: { label: string; effectPct: number }[], mid: number, x: number, yTop: number, w: number): number {
  const { basis, steps } = computeWaterfall(mid, factors);
  let y = yTop;
  drawCompositionBar(ctx, page, x, y, w, 26, basis, steps);
  // Die Segment-Beschriftungen (Label + Wert) reichen bis 26(Balken)+21pt
  // unter yTop — mit mindestens 16pt Sicherheitsabstand DARUNTER weiterlesen,
  // sonst überlappt der Caption-Satz mit dem letzten Segment-Wert (z. B. "662.000 €").
  y -= 26 + 21 + 18;
  mkText(page)("Basiswert aus Lage & Fläche plus Ihre individuellen Werttreiber ergeben den Marktwert.", x, y, 9, ctx.reg, MUTED);
  y -= 30;
  heading(ctx, page, "Schritt für Schritt zum Marktwert", x, y, 11);
  y -= 16;
  const chartH = 170;
  y = drawWaterfall(ctx, page, x, y, w, chartH, basis, steps, mid);
  y -= 20;
  heading(ctx, page, "Im Detail", x, y, 11);
  y -= 18;
  y = drawFactorTable(ctx, page, x, y, w, steps);
  return y;
}

/** Formel-Grafik "A × B = C" als vertikales Rechen-Blatt: jede Größe eine
 * volle Satzspiegel-Zeile (Label links, großer AKIRA-Wert rechts), die
 * Operatoren dazwischen mittig in Blau, das Ergebnis als vollblaues Band —
 * gemeinsame Basis für den Ertragswert- und den Grundstücks-Ansatz.
 * Die frühere Boxen-Reihe quetschte bis zu vier Größen nebeneinander,
 * während die Seite nach unten leer blieb; vertikal bekommt jede Zahl
 * Raum und bleibt groß lesbar. */
function drawFormulaGraphic(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  parts: ({ label: string; value: string } | { op: string })[],
): number {
  const boxes = parts.filter((p): p is { label: string; value: string } => "label" in p);
  let y = yTop;
  for (const part of parts) {
    if ("op" in part) {
      mkText(page)(part.op, x + w / 2 - ctx.akira.widthOfTextAtSize(part.op, 18) / 2, y - 20, 18, ctx.akira, ACCENT);
      y -= 30;
      continue;
    }
    const istErgebnis = part === boxes[boxes.length - 1];
    const rowH = istErgebnis ? 72 : 58;
    const r = 10;
    if (istErgebnis) {
      softShadow(page, x, y - rowH, w, rowH, r);
      roundedRect(page, x, y - rowH, w, rowH, r, { color: ACCENT });
      beamTop(page, x, y - rowH, w, rowH, r, ON_ACCENT, 0.65);
    } else {
      glowPanel(page, x, y - rowH, w, rowH);
    }
    const lblLines = wrap(part.label.toUpperCase(), ctx.reg, 8.5, w * 0.5);
    let ly = y - rowH / 2 + ((lblLines.length - 1) * 11) / 2 - 3;
    for (const l of lblLines) {
      mkText(page)(l, x + 20, ly, 8.5, ctx.reg, istErgebnis ? ON_ACCENT_MUTED : FAINT, 0.6);
      ly -= 11;
    }
    const size = fitFontSize(ctx.akira, part.value, w * 0.42, istErgebnis ? 30 : 24, 12);
    textRight(page, part.value, x + w - 20, y - rowH / 2 - size * 0.32, size, ctx.akira, istErgebnis ? ON_ACCENT : FG);
    y -= rowH;
  }
  return y - 20;
}

/** Branch (b): Mehrfamilienhaus — Ertragswert-Formel statt Faktoren-Wasserfall. */
function drawErtragswertGraphic(ctx: Ctx, page: PDFPage, d: ReportData, x: number, yTop: number, w: number): number {
  const ma = d.value.mietAnsatz;
  const hatLeerstand = !!ma && ma.marktmieteGeschaetzt > 0;
  // Bei Leerstand ist die bewertungsrelevante Miete nicht die Ist-Miete,
  // sondern Ist-Miete + von uns angesetzte Marktmiete der leeren Flächen.
  const miete = hatLeerstand ? ma!.ansatzMiete : Number(d.jahresnettokaltmiete ?? 0);
  const verv = d.value.vervielfaeltiger;
  const mid = d.value.mid;
  let y = drawFormulaGraphic(ctx, page, x, yTop, w, [
    { label: hatLeerstand ? "Angesetzte Jahresmiete" : "Jahresnettokaltmiete", value: eur(miete) },
    { op: "×" },
    { label: "Vervielfältiger (regional, zustandsabhängig)", value: verv != null ? `${fmtDe(verv)}×` : "–" },
    // Als Faktor (0,92) statt „−8 %" ausgeben: mit dem ×-Operator davor wäre
    // „× −8 %" mathematisch falsch gelesen.
    ...(hatLeerstand && ma!.abschlagPct > 0
      ? ([
          { op: "×" },
          {
            // Als Faktor mit ZWEI Dezimalstellen (0,92) — fmtDe rundet sonst
            // auf 0,9 und die Formel würde nicht mehr aufgehen. Label kurz
            // halten, sonst bricht es in der schmalen Kachel unschön um.
            label: "Faktor Leerstand",
            value: fmtDe(Math.round((1 - ma!.abschlagPct / 100) * 100) / 100, 2),
          },
        ] as const)
      : []),
    { op: "=" },
    { label: "Ertragswert", value: eur(mid) },
  ]);
  y -= 8;
  // Leerstand transparent machen: welcher Teil ist Ist-Miete, welchen Teil
  // haben WIR angesetzt und mit welchem €/m²-Satz.
  const erklaerung = hatLeerstand
    ? `Ertragswert-Ansatz bei Leerstand: Für ${fmtDe(ma!.leerstandM2)} m² nicht vermietete Wohnfläche haben wir eine marktübliche Miete von ${fmtDe(ma!.marktmieteM2)} €/m² im Monat angesetzt (${eur(ma!.marktmieteGeschaetzt)} im Jahr)${
        ma!.istMiete > 0 ? ` zusätzlich zur aktuellen Miete von ${eur(ma!.istMiete)}` : ""
      }. Für fehlenden Cashflow und Vermietungsrisiko sind ${fmtDe(ma!.abschlagPct)} % abgezogen. Grobe Heuristik, kein Ertragswertgutachten.`
    : "Ertragswert-Ansatz: Wir schätzen aus Ihrer Jahresnettokaltmiete und einem regionalen Vervielfältiger — eine grobe Heuristik, kein Ertragswertgutachten.";
  for (const line of wrap(erklaerung, ctx.reg, 9.5, w)) {
    mkText(page)(line, x, y, 9.5, ctx.reg, MUTED);
    y -= 13;
  }
  y -= 12;
  const woh = Number(d.wohneinheiten ?? 0);
  const gew = Number(d.gewerbeeinheiten ?? 0);
  if (woh > 0 || gew > 0) {
    heading(ctx, page, "Einheiten-Mix", x, y, 11);
    y -= 24;
    const totalUnits = woh + gew || 1;
    const barH = 26;
    // Jede Einheit als eigener Baustein mit weißer Lücke dazwischen — man
    // ZÄHLT die Einheiten, statt Flächenanteile schätzen zu müssen.
    // Wohneinheiten in Vollblau, Gewerbe in Tinte. Bei sehr vielen Einheiten
    // (Blöcke unter ~7 pt) fällt die Grafik auf den durchgehenden Balken
    // zurück, sonst zerfallen die Lücken zu Rauschen.
    const gap = 3;
    const blockW = (w - gap * (totalUnits - 1)) / totalUnits;
    if (blockW >= 7) {
      let bx = x;
      for (let i = 0; i < totalUnits; i++) {
        roundedRect(page, bx, y - barH, blockW, barH, Math.min(5, blockW / 3), { color: i < woh ? ACCENT : FG });
        bx += blockW + gap;
      }
    } else {
      const wWoh = (woh / totalUnits) * w;
      if (woh > 0) roundedRect(page, x, y - barH, wWoh, barH, 5, { color: ACCENT });
      if (gew > 0) roundedRect(page, x + wWoh + 2, y - barH, w - wWoh - 2, barH, 5, { color: FG });
    }
    // Beschriftung DARUNTER statt im Balken — inkl. korrekter Ein-/Mehrzahl.
    const labelY = y - barH - 14;
    if (woh > 0) mkText(page)(`${woh} Wohneinheit${woh === 1 ? "" : "en"}`, x, labelY, 8.5, ctx.bold, ACCENT_SOFT);
    if (gew > 0) textRight(page, `${gew} Gewerbeeinheit${gew === 1 ? "" : "en"}`, x + w, labelY, 8.5, ctx.bold, FG);
    y -= barH + 28;
  }
  return y;
}

/** Branch (c): Grundstück — Fläche × angerechnetes Ø-Niveau = Einschätzung.
 * Seit der gestaffelten Anrechnung (grundstuecksStaffel in lib/valuation.ts)
 * gilt Fläche × amtlicher BRW ≠ mid bei übergroßen Grundstücken — die
 * Formel-Grafik zeigt deshalb das EFFEKTIVE Ø-Niveau (mid / Fläche), damit
 * die Gleichung im PDF rechnerisch aufgeht; der amtliche Rohwert und die
 * Staffel-Aufschlüsselung stehen im erklärenden Text darunter. */
function drawGrundstueckGraphic(ctx: Ctx, page: PDFPage, d: ReportData, x: number, yTop: number, w: number): number {
  const flaeche = Number(d.grundflaeche ?? 0);
  const mid = d.value.mid;
  const amtlich = d.bodenrichtwert;
  const anr = d.value.grundstuecksAnrechnung;
  const gestaffelt = !!anr && (anr.mehrflaecheM2 > 0 || anr.gartenlandM2 > 0);
  const niveau = flaeche > 0 ? Math.round(mid / flaeche) : d.value.pricePerSqm ?? 0;
  const niveauLabel = gestaffelt
    ? "Angerechnetes Bodenwert-Niveau (Ø, gestaffelt)"
    : amtlich
      ? `Bodenwert-Niveau (amtlich, ${BORIS_QUELLEN[amtlich.quelle ?? "RLP"].name})`
      : "Bodenwert-Niveau (Modellwert)";
  let y = drawFormulaGraphic(ctx, page, x, yTop, w, [
    { label: "Grundstücksfläche", value: flaeche ? `${flaeche} m²` : "–" },
    { op: "×" },
    { label: niveauLabel, value: niveau ? `${eur(niveau)}/m²` : "–" },
    { op: "=" },
    { label: "Einschätzung", value: eur(mid) },
  ]);
  y -= 8;
  const staffelSatz = gestaffelt
    ? ` Übergroße Flächen fließen gestaffelt ein: ${anr.baulandM2} m² Bauland voll, ${anr.mehrflaecheM2} m² Mehrfläche anteilig${anr.gartenlandM2 > 0 ? `, ${anr.gartenlandM2} m² als Gartenland` : ""}.${amtlich ? ` Amtlicher Bodenrichtwert: ${eur(amtlich.brw)}/m².` : ""}`
    : "";
  for (const line of wrap(
    `Die Einschätzung nähert sich Ihrem Grundstück über Fläche und Bodenwert-Niveau an. Lage, Zuschnitt und Bebaubarkeit fließen zusätzlich individuell ein.${staffelSatz}`,
    ctx.reg,
    9.5,
    w,
  )) {
    mkText(page)(line, x, y, 9.5, ctx.reg, MUTED);
    y -= 13;
  }
  return y - 8;
}

function drawComposition(ctx: Ctx, d: ReportData, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "PREIS-ZUSAMMENSETZUNG");

  heading(ctx, page, "Wie sich Ihr Wert zusammensetzt", M, y, 16);
  y -= 24;

  const contentW = w - 2 * M;
  const factors = d.factors && d.factors.length > 0 ? d.factors : undefined;
  if (factors) {
    let fy = drawFactorComposition(ctx, page, factors, d.value.mid, M, y, contentW);
    // Gewerbe-/Mischobjekt: die Büro/Halle/Wohnen-Zerlegung offen ausweisen —
    // mit den je Flächenart angesetzten Sätzen. Ohne diese Zeilen sähe der
    // Wert wie „Nutzfläche × ein Preis" aus und wäre gerade bei Mischobjekten
    // (Halle mit Wohnungen und Büro) nicht nachvollziehbar.
    const fa = d.value.flaechenAufteilung;
    if (fa) {
      fy -= 4;
      const teile = [
        fa.bueroM2 > 0 ? `${fmtDe(fa.bueroM2)} m² Büro/Praxis zu ${eur(fa.bueroSatz)}/m²` : "",
        fa.halleM2 > 0 ? `${fmtDe(fa.halleM2)} m² Halle/Lager zu ${eur(fa.halleSatz)}/m²` : "",
        fa.wohnM2 > 0 ? `${fmtDe(fa.wohnM2)} m² Wohnen zu ${eur(fa.wohnSatz)}/m²` : "",
      ].filter(Boolean);
      const grund = d.value.grundstuecksAnrechnung
        ? ` — zzgl. Grundstücksanrechnung von ${eur(d.value.grundstuecksAnrechnung.wert)}`
        : "";
      for (const line of wrap(`Mischobjekt anteilig bewertet: ${teile.join(", ")}${grund}.`, ctx.reg, 9.5, contentW)) {
        t(line, M, fy, 9.5, ctx.reg, MUTED);
        fy -= 13;
      }
    }
  } else if (d.objektartLabel === "Mehrfamilienhaus") {
    drawErtragswertGraphic(ctx, page, d, M, y, contentW);
  } else if (d.objektartLabel === "Grundstück") {
    drawGrundstueckGraphic(ctx, page, d, M, y, contentW);
  }

  // Fußzeile-Hinweis: Modell-Näherungsbild, kein Gutachten.
  let noteY = 82;
  for (const line of wrap(
    "Diese Zerlegung ist ein Modell-Näherungsbild unserer Rechner-Engine zur Veranschaulichung der wichtigsten Werttreiber. Sie ist kein Gutachten und keine Verkehrswertermittlung nach § 194 BauGB.",
    ctx.reg,
    8.5,
    contentW,
  )) {
    t(line, M, noteY, 8.5, ctx.reg, FAINT);
    noteY -= 11;
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite 4: IHR MARKT (nur mit context.markt) ────────── */
function drawMarketLocal(ctx: Ctx, d: ReportData, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  const markt = d.context!.markt!;
  const name = toWinAnsi(d.context!.standortName ?? markt.name);
  let y = header(ctx, page, w, h, "IHR MARKT");

  heading(ctx, page, `Ihr Markt: ${name}`, M, y, 17);
  y -= 26;

  const contentW = w - 2 * M;

  // Zwei Range-Bars: Wohnung, Haus — Track (BORDER) + ACCENT-Segment min→max,
  // Objekt-Marker bei passender Objektart, wenn ein eigener €/m²-Wert vorliegt.
  const rangeRow = (label: string, range: { min: number; max: number }, isMatch: boolean) => {
    t(label, M, y, 10, ctx.bold, FG);
    y -= 20;
    const trackY = y - 5;
    roundBarH(page, M, trackY, contentW, 10, BORDER);
    const scaleMin = range.min * 0.85;
    const scaleMax = range.max * 1.15;
    const span = Math.max(1, scaleMax - scaleMin);
    const fMin = (range.min - scaleMin) / span;
    const fMax = (range.max - scaleMin) / span;
    roundBarH(page, M + fMin * contentW, trackY, Math.max(6, (fMax - fMin) * contentW), 10, ACCENT, 0.85);
    t(`${eur(range.min)} / m²`, M, trackY - 16, 8.5, ctx.reg, MUTED);
    textRight(page, `${eur(range.max)} / m²`, M + contentW, trackY - 16, 8.5, ctx.reg, MUTED);
    if (isMatch && d.value.pricePerSqm) {
      const f = Math.min(0.97, Math.max(0.03, (d.value.pricePerSqm - scaleMin) / span));
      const mx = M + f * contentW;
      const my = trackY + 5;
      glow(page, mx, my, 16, ACCENT, 0.09, 10);
      page.drawCircle({ x: mx, y: my, size: 6, color: BG });
      page.drawCircle({ x: mx, y: my, size: 6, borderColor: ACCENT, borderWidth: 2 });
      page.drawCircle({ x: mx, y: my, size: 2.5, color: ACCENT });
      const ml = "Ihr Objekt";
      t(ml, mx - ctx.bold.widthOfTextAtSize(ml, 7.5) / 2, my + 14, 7.5, ctx.bold, ACCENT_SOFT);
    }
    y = trackY - 32;
  };
  rangeRow("Wohnung, € / m²", markt.wohnung, d.objektartLabel === "Wohnung");
  rangeRow("Haus, € / m²", markt.haus, d.objektartLabel === "Haus");

  // Sparkline + Trend-Badge
  heading(ctx, page, "Preistrend, 12 Monate", M, y, 11);
  const badge = `+${fmtDe(markt.trendYoyPct)} % p.a.`;
  const { w: bw } = pillMeasure(ctx.bold, badge, 9);
  pill(page, ctx.bold, badge, M + contentW - bw, y - 12, 9, { fg: ACCENT_SOFT, border: ACCENT_SOFT });
  y -= 24;
  const sparkH = 56;
  sparkline(page, M, y - sparkH, contentW, sparkH, markt.trend12);
  y -= sparkH + 30;

  // Stat-Zeile: 3 vollblaue statTiles
  const tileGap = 14;
  const tileW = (contentW - tileGap * 2) / 3;
  const tileH = 86;
  statTile(ctx, page, M, y - tileH, tileW, tileH, `${markt.vermarktungszeitTage}`, "Ø Tage bis zum Verkauf");
  statTile(ctx, page, M + tileW + tileGap, y - tileH, tileW, tileH, `${fmtDe(markt.yieldPct)} %`, "Mietrendite (Modell)");
  const tile3X = M + 2 * (tileW + tileGap);
  statTile(ctx, page, tile3X, y - tileH, tileW, tileH, `${markt.nachfrage}/10`, "Nachfrage-Score");
  // 10 kleine Punkte auf der Vollblau-Kachel, davon `nachfrage` in Weiß —
  // mit klarem Abstand zwischen großer Zahl, Punktreihe und Label.
  const dotR = 2.1;
  const dotsW = 10 * (dotR * 2) + 9 * 3;
  let dx = tile3X + tileW / 2 - dotsW / 2 + dotR;
  const dotsY = y - tileH + 28;
  for (let i = 0; i < 10; i++) {
    const active = i < markt.nachfrage;
    page.drawCircle({ x: dx, y: dotsY, size: dotR, color: ON_ACCENT, opacity: active ? 1 : 0.3 });
    dx += dotR * 2 + 3;
  }
  y -= tileH + 30;

  // Bodenrichtwert-Zeile: amtlich (falls vorhanden) neben Modellwert.
  heading(ctx, page, "Bodenrichtwert", M, y, 11);
  y -= 16;
  if (d.bodenrichtwert) {
    t(`Amtlich (${BORIS_QUELLEN[d.bodenrichtwert.quelle ?? "RLP"].name}): ${eur(d.bodenrichtwert.brw)}/m² · Zone ${d.bodenrichtwert.zone || "–"}`, M, y, 9.5, ctx.reg, FG);
    y -= 14;
    t(`Modellwert Region: ${eur(markt.bodenrichtwert)}/m²`, M, y, 9.5, ctx.reg, MUTED);
  } else {
    t(`Modellwert Region: ${eur(markt.bodenrichtwert)}/m² (kein amtlicher Wert für diese Koordinaten ermittelt)`, M, y, 9.5, ctx.reg, MUTED);
  }
  y -= 22;

  // Standorttext (max. 2 Absätze aus dem GEO-Artikel der Stadt)
  if (d.context!.standortText && d.context!.standortText.length > 0) {
    heading(ctx, page, "Über den Standort", M, y, 11);
    y -= 16;
    for (const para of d.context!.standortText.slice(0, 2)) {
      for (const line of wrap(toWinAnsi(para), ctx.reg, 9.5, contentW)) {
        t(line, M, y, 9.5, ctx.reg, MUTED);
        y -= 13;
      }
      y -= 6;
    }
  }

  const src = `RIEGEL Preisatlas · Stand ${toWinAnsi(d.context!.marktStand)} · Modellwerte, keine Verkehrswertermittlung nach § 194 BauGB.`;
  t(ellipsize(src, ctx.reg, 8, contentW), M, 82, 8, ctx.reg, FAINT);

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite: REFERENZOBJEKTE (nur mit vergleichsobjekte) ── */
function drawReferenzobjekte(ctx: Ctx, d: ReportData, fotos: (PDFImage | null)[], pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "REFERENZOBJEKTE");

  const items = (d.vergleichsobjekte ?? []).slice(0, REFERENZ_MAX);
  const contentW = w - 2 * M;

  // Die Überschrift trägt die Aussage, nicht der Fließtext darunter — diese
  // Seite ist der stärkste Vertrauenshebel im Report (Wunsch Inhaberseite).
  // Sie darf aber nie mehr behaupten als die Karten darunter belegen, deshalb
  // hängt sie an zwei Signalen, die ohnehin je Objekt geprüft sind:
  //   verkauft? → "haben wir verkauft" statt "verkaufen wir" (über einem
  //               aktuell inserierten Objekt wäre die Vergangenheit falsch)
  //   nah?      → "Genau hier" statt "in Ihrer Region" (mindestens ein Objekt
  //               muss als "vergleich" eingestuft sein, also Ortstreffer oder
  //               ≤20 km — sonst verspricht die Zeile eine Nähe, die die Karte
  //               selbst verneint)
  // fitFontSize hält auch die längste Variante einzeilig.
  const alleVermittelt = items.length > 0 && items.every((o) => o.vermittelt);
  const nah = items.some((o) => o.einordnung === "vergleich");
  const titel = alleVermittelt
    ? nah
      ? "Genau hier haben wir schon verkauft"
      : "Das haben wir in Ihrer Region verkauft"
    : nah
      ? "Genau hier verkaufen wir"
      : "Das vermarkten wir in Ihrer Region";
  heading(ctx, page, titel, M, y, fitFontSize(ctx.akira, titel.toUpperCase(), contentW, 19, 12));
  y -= 20;

  // KEINE Gesamtzahl vermittelter Objekte mehr (Einwand Sissy): Die Zahl aus
  // OnOffice deckt nur den digital erfassten Bestand ab, nicht die Abschlüsse
  // aus Jahrzehnten davor. „Über 700" liest sich für jemanden, der den Laden
  // kennt, deshalb wie eine Untertreibung — bei realistisch 150 Verkäufen und
  // 50 Vermietungen im Jahr wäre RIEGEL damit rechnerisch drei Jahre am Markt.
  // Lieber gar keine Gesamtzahl als eine, die die eigene Historie kleinredet.

  // Entschärfte Copy (Feedback Manfred): NICHT mehr „derselben Objektklasse"
  // versprechen — die Karten tragen stattdessen eine ehrliche Einordnung je
  // Objekt („Vergleichbares Objekt" vs. „Referenz aus der Region") plus die
  // echte Distanz. Referenzen belegen Vermarktungserfolg, keine Gleichwertigkeit.
  for (const line of wrap(
    "Diese hier kommen Ihrem Objekt am nächsten. Direkt Vergleichbares ist entsprechend gekennzeichnet, alles Übrige belegt unsere Arbeit vor Ort und ist kein Wertermittlungs-Vergleich.",
    ctx.reg,
    9.5,
    contentW,
  )) {
    t(line, M, y, 9.5, ctx.reg, MUTED);
    y -= 13;
  }
  y -= 14;

  // Kartenmaße auf REFERENZ_MAX=5 vermessen (vorher 3 Karten à 118 pt).
  // Foto bleibt im 3:2-Format, damit die OnOffice-Bilder nicht verzerren.
  const cardH = 100;
  const cardGap = 12;
  const photoW = 126;
  const photoH = 84;

  items.forEach((obj, idx) => {
    const cardY = y - cardH;
    glowPanel(page, M, cardY, contentW, cardH);
    const photoX = M + 14;
    const photoY = cardY + (cardH - photoH) / 2;
    const img = fotos[idx] ?? null;
    if (img) {
      page.drawImage(img, { x: photoX, y: photoY, width: photoW, height: photoH });
      page.drawRectangle({ x: photoX, y: photoY, width: photoW, height: photoH, borderColor: BORDER, borderWidth: 1 });
    } else {
      page.drawRectangle({ x: photoX, y: photoY, width: photoW, height: photoH, color: SURFACE, borderColor: BORDER, borderWidth: 1 });
      const mark = "RIEGEL";
      t(mark, photoX + photoW / 2 - ctx.akira.widthOfTextAtSize(mark, 13) / 2, photoY + photoH / 2 - 5, 13, ctx.akira, FAINT, 1);
    }

    const textX = photoX + photoW + 20;
    const textW = M + contentW - textX - 14;
    const badgeLbl = obj.vermittelt ? "Erfolgreich vermittelt" : "Aktuell im Angebot";
    const badgeColor = obj.vermittelt ? POS : ACCENT_SOFT;
    const { w: bw, h: bh } = pillMeasure(ctx.bold, badgeLbl, 8);
    pill(page, ctx.bold, badgeLbl, M + contentW - 14 - bw, cardY + cardH - 12 - bh, 8, { fg: badgeColor, border: badgeColor });

    const objTitel = ellipsize(toWinAnsi(obj.titel), ctx.bold, 11.5, textW - bw - 16);
    t(objTitel, textX, cardY + cardH - 24, 11.5, ctx.bold, FG);
    t(ellipsize(toWinAnsi(obj.ort), ctx.reg, 9, textW), textX, cardY + cardH - 40, 9, ctx.reg, MUTED);

    // Der Preis ist die Zahl, wegen der diese Seite überzeugt — er steht
    // deshalb fett und in Vollkontrast da, nicht als einer von drei
    // gleichrangigen grauen Chips (Wunsch Inhaberseite). Fläche und Zimmer
    // bleiben Chips und ordnen sich damit sichtbar unter.
    //
    // obj.preis kommt als „435.000 € · Kaufpreis" — die Zahl wird groß gesetzt,
    // die Preisart klein daneben. Bei Mietobjekten steht dort „Kaltmiete", die
    // Unterscheidung darf also nicht verloren gehen.
    let cx = textX;
    if (obj.preis) {
      const [betrag, art] = toWinAnsi(obj.preis).split(" · ");
      t(betrag, cx, cardY + cardH - 55, 14, ctx.bold, FG);
      cx += ctx.bold.widthOfTextAtSize(betrag, 14) + 6;
      if (art) {
        t(art, cx, cardY + cardH - 55, 8.5, ctx.reg, FAINT);
        cx += ctx.reg.widthOfTextAtSize(art, 8.5) + 10;
      }
    }
    const chips = [obj.flaeche, obj.zimmer].filter((v): v is string => !!v).map((v) => toWinAnsi(v));
    // Passen die Chips nicht mehr neben den Preis, rutschen sie unter ihn.
    const chipsBreite = chips.reduce((s, c) => s + pillMeasure(ctx.reg, c, 8).w + 6, 0);
    if (chips.length > 0) {
      const passtDaneben = cx + chipsBreite <= textX + textW;
      chipRow(
        ctx,
        page,
        chips,
        passtDaneben ? cx : textX,
        cardY + cardH - (passtDaneben ? 49 : 36),
        textX + textW - (passtDaneben ? cx : textX),
        8,
      );
    }

    // Ehrliche Einordnung unten links (s. ReportVergleichsObjekt.einordnung):
    // „Vergleichbares Objekt" akzentuiert, „Referenz aus der Region" neutral —
    // die Distanz als schlichter Text daneben (eigene Zeile statt Chip-Reihe,
    // sonst bricht die Reihe um und kollidiert mit dem Badge).
    const einLbl = obj.einordnung === "vergleich" ? "Vergleichbares Objekt" : "Referenz aus der Region";
    const einColor = obj.einordnung === "vergleich" ? ACCENT_SOFT : MUTED;
    const { w: ew, h: eh } = pillMeasure(ctx.bold, einLbl, 8);
    pill(page, ctx.bold, einLbl, textX, cardY + 9, 8, { fg: einColor, border: einColor });
    if (obj.distanzKm != null) {
      const distLbl = obj.distanzKm <= 1 ? "direkt vor Ort" : `ca. ${obj.distanzKm} km von Ihrem Objekt`;
      t(distLbl, textX + ew + 10, cardY + 9 + (eh - 8) / 2 + 1, 8, ctx.reg, FAINT);
    }

    y = cardY - cardGap;
  });

  y -= 6;
  for (const line of wrap(`Echte Objekte aus der laufenden RIEGEL-Vermarktung (OnOffice), Stand ${d.dateLabel}.`, ctx.reg, 8.5, contentW)) {
    t(line, M, y, 8.5, ctx.reg, FAINT);
    y -= 11;
  }
  y -= 14;

  // Weißraum unten (bei nur 1-2 Objekten reichlich) mit dem Ladenlokal
  // Speyer füllen — nur, wenn noch spürbar Platz bis zum Footer ist.
  // Passt zur Seitenaussage: der Beleg "vor Ort" als Bild.
  if (y - 90 > bandFloor) {
    visualBand(ctx, page, ctx.laden, M, y, contentW, Math.min(240, y - bandFloor), "Unser Büro in Speyer, Wormser Straße 13.", 0.62);
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite: PREIS-FAKTOREN ─────────────────────────────── */
function drawFactors(ctx: Ctx, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "PREIS-FAKTOREN");

  heading(ctx, page, "Was Ihren Preis beeinflusst", M, y, 16);
  y -= 18;
  // Ohne den Vorspann „Aus über 25 Jahren regionaler Praxis" (Wunsch Alex).
  // Er widersprach ohnehin der Warum-RIEGEL-Seite, die „über 40 Jahren
  // Immobilienerfahrung" nennt — zwei Altersangaben im selben Dokument.
  for (const line of wrap("Diese Faktoren bewegen den erzielbaren Preis am stärksten. Die Bandbreiten sind Erfahrungswerte für die Metropolregion Rhein-Neckar — Ihr Objekt kann je nach Kombination abweichen.", ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, y, 9.5, ctx.reg, MUTED);
    y -= 13;
  }
  y -= 10;

  const factors: { name: string; impact: number; range: string; note: string }[] = [
    { name: "Lage & Mikrolage", impact: 1.0, range: "± bis 20 %", note: "Adresse, Nachbarschaft, Lärm, Anbindung und Aussicht — der mit Abstand stärkste Hebel." },
    { name: "Zustand & Modernisierung", impact: 0.78, range: "± bis 15 %", note: "Sanierungsstau drückt deutlich; neue Heizung, Bäder und Fenster heben den Wert spürbar." },
    { name: "Ausstattung & Qualität", impact: 0.62, range: "± bis 12 %", note: "Böden, Küche, Bäder, Smart-Home: hochwertige Ausstattung zahlt sich im Verkauf aus." },
    { name: "Energieeffizienz", impact: 0.55, range: "± bis 10 %", note: "Seit den Energiekosten hart bewertet: A–C erzielt Aufschläge, F–H spürbare Abschläge." },
    { name: "Baujahr & Bausubstanz", impact: 0.5, range: "± bis 10 %", note: "Solide Substanz senkt das Käuferrisiko und stützt den Preis." },
    { name: "Grundriss & Schnitt", impact: 0.42, range: "± bis 8 %", note: "Helle, gut geschnittene, flexibel nutzbare Grundrisse verkaufen sich schneller und teurer." },
    { name: "Grundstück & Ausrichtung", impact: 0.4, range: "± bis 8 %", note: "Zuschnitt, Süd-/Westausrichtung und Bebaubarkeit zählen — besonders bei Häusern." },
  ];
  const barX = M + 168;
  const barW = w - M - barX - 96;
  for (const f of factors) {
    t(f.name, M, y, 10.5, ctx.bold, FG);
    const barH = 6;
    const barY = y - 3;
    roundBarH(page, barX, barY, barW, barH, BORDER);
    const fillW = barW * f.impact;
    const tail = Math.min(28, fillW * 0.6);
    const r = barH / 2;
    page.drawCircle({ x: barX + r, y: barY + r, size: r, color: ACCENT });
    page.drawRectangle({ x: barX + r, y: barY, width: Math.max(0, fillW - r - tail), height: barH, color: ACCENT });
    // Auslauf nach rechts: die Füllung verblasst ins Nichts statt hart zu enden.
    fadeRect(page, barX + Math.max(r, fillW - tail), barY, tail, barH, ACCENT, 0.95, 0, 14, "right");
    textRight(page, f.range, w - M, y, 9.5, ctx.bold, ACCENT_SOFT);
    y -= 15;
    for (const line of wrap(f.note, ctx.reg, 9, w - 2 * M)) {
      t(line, M, y, 9, ctx.reg, MUTED);
      y -= 12;
    }
    y -= 9;
  }
  footer(ctx, page, w, pageNo, total);
}

/* ── Seite: VERMARKTUNG & MARKT ────────────────────────── */
/** Zeichnet die Ablauf-Timeline und gibt die tiefste tatsächlich benutzte
 * y-Position zurück (über alle Schritte, inkl. Zeilenumbrüche von Label UND
 * Subtext) — der Aufrufer MUSS diese für den Abstand zum nächsten Block
 * (CTA-Box) verwenden, sonst kollidiert ein mehrzeiliger Subtext mit ihr. */
function drawTimeline(ctx: Ctx, page: PDFPage, x: number, y: number, w: number, steps: { label: string; sub: string }[]): number {
  const n = steps.length;
  const segW = w / n;
  page.drawLine({ start: { x: x + segW / 2, y }, end: { x: x + w - segW / 2, y }, thickness: 1, color: BORDER });
  let minY = y;
  steps.forEach((s, i) => {
    const cx = x + segW * i + segW / 2;
    glow(page, cx, y, 12, ACCENT, 0.08, 8);
    page.drawCircle({ x: cx, y, size: 4.5, color: BG });
    page.drawCircle({ x: cx, y, size: 4.5, borderColor: ACCENT, borderWidth: 1.6 });
    page.drawCircle({ x: cx, y, size: 1.8, color: ACCENT });
    let ly = y - 20;
    for (const l of wrap(s.label, ctx.bold, 8.5, segW - 10)) {
      mkText(page)(l, cx - ctx.bold.widthOfTextAtSize(l, 8.5) / 2, ly, 8.5, ctx.bold, FG);
      ly -= 11;
    }
    for (const l of wrap(s.sub, ctx.reg, 7.5, segW - 10)) {
      mkText(page)(l, cx - ctx.reg.widthOfTextAtSize(l, 7.5) / 2, ly, 7.5, ctx.reg, MUTED);
      ly -= 10;
    }
    if (ly < minY) minY = ly;
  });
  return minY;
}

function drawMarketing(ctx: Ctx, d: ReportData, objektTitle: string, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "VERMARKTUNG & MARKT");

  heading(ctx, page, "Wie schnell Sie verkaufen", M, y, 16);
  y -= 20;

  const colW = (w - 2 * M - 24) / 2;
  const list = (title: string, items: string[], x: number, color: Color) => {
    let yy = y;
    mkText(page)(title, x, yy, 10, ctx.bold, color);
    yy -= 16;
    for (const it of items) {
      page.drawCircle({ x: x + 2.5, y: yy + 3, size: 1.8, color });
      const lines = wrap(it, ctx.reg, 9, colW - 12);
      for (let i = 0; i < lines.length; i++) {
        mkText(page)(lines[i], x + 10, yy, 9, ctx.reg, i === 0 ? FG : MUTED);
        yy -= 12;
      }
      yy -= 3;
    }
    return yy;
  };
  const left = list("Verkürzt die Zeit", [
    "Realistischer, marktgerechter Angebotspreis von Anfang an",
    "Professionelle Fotos, Grundrisse & aussagekräftiges Exposé",
    "KI-gestütztes Home Staging und ein aufgeräumter erster Eindruck",
    "Vorgemerkte, geprüfte Interessenten aus dem Netzwerk",
    "Gute Energieklasse & vollständige Unterlagen",
  ], M, POS);
  const right = list("Verlängert die Zeit", [
    "Überhöhter Startpreis — das Objekt wird zum Ladenhüter",
    "Schwache Fotos und lückenhafte Angaben",
    "Sichtbarer Sanierungsstau ohne Preis-Anpassung",
    "Fehlende Unterlagen (Energieausweis, Grundbuch, Pläne)",
    "Ungünstiges Timing & schlechte Erreichbarkeit für Termine",
  ], M + colW + 24, NEG);
  y = Math.min(left, right) - 16;

  heading(ctx, page, "Markttrend Rhein-Neckar", M, y, 13);
  y -= 16;
  // Städte-Einschätzung: deutsches Dezimalkomma (fmtDe) statt JS-Punkt, und
  // GENAU EIN Satzende — "p. a." trägt seinen Punkt schon selbst, ein
  // zusätzliches strukturelles "." dahinter ergäbe "..".
  const cityInsight =
    d.value.trendPct != null ? `rund +${fmtDe(d.value.trendPct)} % p. a.` : "eine stabile Entwicklung.";
  const trend = `Einschätzung ${new Date().getFullYear()}: Die Nachfrage in Speyer, Ludwigshafen und der Metropolregion Rhein-Neckar ist bei gut gelegenen Objekten stabil. Energieeffizienz ist zum preisbestimmenden Faktor geworden; das Zinsniveau bremst die Zahlungsbereitschaft, doch energetisch gute und fair bepreiste Immobilien verkaufen sich weiterhin zügig.${d.city ? ` Für ${d.city} sehen wir aktuell ${cityInsight}` : ""}`;
  for (const line of wrap(trend, ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, y, 9.5, ctx.reg, MUTED);
    y -= 13.5;
  }
  y -= 16;

  // "So läuft es mit RIEGEL" — Ablauf-Timeline zwischen Trend-Absatz und CTA.
  heading(ctx, page, "So läuft es mit RIEGEL", M, y, 12);
  y -= 36;
  const timelineBottom = drawTimeline(ctx, page, M, y, w - 2 * M, [
    { label: "Vor-Ort-Termin (kostenlos)", sub: "Besichtigung und erste Einschätzung direkt vor Ort." },
    { label: "Preisstrategie & Unterlagen", sub: "Realistischer Angebotspreis, Exposé und Energieausweis." },
    { label: "Vermarktung an 121.000+ Suchprofile", sub: "Sichtbarkeit auf ImmoScout24 und in unserer Käuferdatenbank." },
    { label: "Verhandlung bis Notar", sub: "Von der Kaufzusage bis zur Beurkundung an Ihrer Seite." },
  ]);
  // Abstand ab der TATSÄCHLICH tiefsten Zeile (nicht geschätzt) — sonst
  // kollidiert ein zweizeiliger Subtext (z. B. Schritt 3) mit der CTA-Box.
  y = timelineBottom - 18;

  // CTA-Box: vollblaues Rundeck-Band mit Beam-Kontur, Schatten und weißer
  // Schrift — der eine satte Farbmoment dieser Seite, mit sauberem
  // Innenabstand nach unten (die alte 76pt-Box wirkte unten abgeschnitten).
  const ctaH = 88;
  const ctaR = 10;
  softShadow(page, M, y - ctaH, w - 2 * M, ctaH, ctaR);
  roundedRect(page, M, y - ctaH, w - 2 * M, ctaH, ctaR, { color: ACCENT });
  beamTop(page, M, y - ctaH, w - 2 * M, ctaH, ctaR, ON_ACCENT, 0.65);
  t("IHR NÄCHSTER SCHRITT", M + 20, y - 26, 9, ctx.bold, ON_ACCENT_MUTED, 1.2);
  // Adresse kann lang sein (z. B. „Max-Bill-Straße 3, 67061 Ludwigshafen") —
  // die ganze CTA-Zeile auf die Box-Innenbreite kürzen, damit sie nie rechts
  // aus dem Rahmen läuft.
  const ctaLine = `${d.name?.split(" ")[0] || "Wir"}, sichern wir gemeinsam den Bestpreis für ${objektTitle}.`;
  // Erst die Schrift bis 10,5pt schrumpfen lassen, ehe die Adresse mit „…"
  // abgeschnitten wird — eine gekappte Objektadresse wirkt schlampig.
  const ctaSize = fitFontSize(ctx.bold, ctaLine, w - 2 * M - 40, 12.5, 10.5);
  t(ellipsize(ctaLine, ctx.bold, ctaSize, w - 2 * M - 40), M + 20, y - 47, ctaSize, ctx.bold, ON_ACCENT);
  t("Kostenlose Vor-Ort-Bewertung: riegel-immobilien.de/termin   ·   06232 100 10 10", M + 20, y - 67, 9.5, ctx.reg, ON_ACCENT_MUTED);
  y -= ctaH + 28;

  // Diese Seite hat unter der CTA reichlich Weißraum — mit dem Büro-Band
  // füllen (die leerste Report-Seite).
  if (y - 100 > bandFloor) {
    visualBand(ctx, page, ctx.broschuere, M, y, w - 2 * M, Math.min(250, y - bandFloor), "Ihre Immobilie verdient mehr als einen Algorithmus.", 0.72);
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite: WARUM RIEGEL (Facts & Figures, nur mit context) ── */
function drawWhyRiegel(ctx: Ctx, d: ReportData, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "WARUM RIEGEL");

  heading(ctx, page, "Verkaufen mit RIEGEL", M, y, 18);
  y -= 30;

  const stats = d.context!.stats;
  const contentW = w - 2 * M;
  const gap = 14;
  const tileW = (contentW - gap * 2) / 3;
  // Etwas höher als früher (80): das längste Label läuft über zwei Zeilen,
  // der große Wert soll darüber trotzdem frei stehen.
  const tileH = 88;
  // "12,5 Mio." ist bewusst als kompakte Darstellungsform hardcodiert (die
  // erlaubte Ausnahme lt. Auftrag) — sie spiegelt stats.immoscoutAufrufe
  // (>= 12,5 Mio., s. RIEGEL_STATS-Kommentar in lib/riegel-stats.ts).
  const tiles: [string, string][] = [
    [`${fmtInt(stats.aktiveSuchauftraege)}+`, "Aktive Suchaufträge"],
    // „Ausspielungen" war Werbe-Jargon; Manfreds Wunsch war der Bezug zu den
    // Suchenden. Wörtlich „erreichte Kauf- und Mietinteressenten" wäre aber
    // falsch: 12,5 Mio. sind Einblendungen, nicht Personen (das wären mehr
    // Interessenten als Deutschland Einwohner hat). „Sichtkontakte" benennt
    // genau das — die Einblendung bei jemandem, der sucht.
    ["12,5 Mio.", "Sichtkontakte bei Kauf- und Mietinteressenten"],
    [fmtInt(stats.exposeAufrufe), "Exposé-Aufrufe im Monat"],
    [fmtInt(stats.besichtigungenProJahr), "Besichtigungen pro Jahr"],
    [`Ø ${stats.oVermarktungstage} Tage`, "bis zum Verkauf"],
    [fmtInt(stats.googleBewertungen), "Google-Bewertungen"],
  ];
  // Nur EINE Kachel als Vollblau-Highlight (die 12,5 Mio. — die größte
  // Zahl), der Rest im hellen Glass-Look: sechs Vollblau-Flächen
  // nebeneinander wären zu viel Knallblau auf einer Seite.
  tiles.forEach(([value, label], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = M + col * (tileW + gap);
    const ty = y - tileH - row * (tileH + gap);
    statTile(ctx, page, tx, ty, tileW, tileH, value, label, undefined, { hell: i !== 1 });
  });
  y -= tileH * 2 + gap + 28;

  // Auszeichnung-Banner: das eine fast-schwarze Band der Seite — Tinte satt
  // mit blauer Beam-Kontur, weißer Schrift und dem echten Foto von Christoph
  // und Sissy von der ImmoAward-Verleihung als kleinem Bildeinsatz.
  const bannerH = 66;
  const bannerR = 10;
  softShadow(page, M, y - bannerH, contentW, bannerH, bannerR);
  roundedRect(page, M, y - bannerH, contentW, bannerH, bannerR, { color: FG });
  beamTop(page, M, y - bannerH, contentW, bannerH, bannerR, ACCENT);
  let bannerTextX = M + 20;
  if (ctx.award) {
    const ph = bannerH - 16;
    page.drawImage(ctx.award, { x: M + 12, y: y - bannerH + 8, width: ph, height: ph });
    page.drawRectangle({ x: M + 12, y: y - bannerH + 8, width: ph, height: ph, borderColor: rgb(1, 1, 1), borderWidth: 1, borderOpacity: 0.3 });
    bannerTextX = M + 12 + ph + 16;
  }
  t("ImmoScout24 ImmoAward 2025", bannerTextX, y - 29, 11, ctx.bold, ON_ACCENT);
  t("Top 21 Makler des Jahres in Deutschland — von über 25.000", bannerTextX, y - 45, 9, ctx.reg, ON_ACCENT_MUTED);
  y -= bannerH + 26;

  // USP-Häkchen-Liste
  heading(ctx, page, "Ihre Vorteile im Überblick", M, y, 12);
  y -= 20;
  for (const raw of d.context!.usps) {
    const usp = toWinAnsi(raw);
    // Häkchen: zwei Linien in ACCENT statt eines Icon-Assets.
    const hx = M + 4;
    const hy = y + 3;
    page.drawLine({ start: { x: hx - 4, y: hy }, end: { x: hx - 1, y: hy - 4 }, thickness: 1.6, color: ACCENT });
    page.drawLine({ start: { x: hx - 1, y: hy - 4 }, end: { x: hx + 6, y: hy + 6 }, thickness: 1.6, color: ACCENT });
    const lines = wrap(usp, ctx.reg, 9.5, contentW - 24);
    for (let i = 0; i < lines.length; i++) {
      t(lines[i], M + 16, y, 9.5, ctx.reg, i === 0 ? FG : MUTED);
      y -= 13;
    }
    y -= 5;
  }
  y -= 4;

  // Direktankauf-Callout
  const calloutH = 56;
  glowPanel(page, M, y - calloutH, contentW, calloutH);
  t("DISKRETER VERKAUF", M + 18, y - 22, 8.5, ctx.bold, ACCENT_SOFT, 1);
  for (const line of wrap("Diskret verkaufen? RIEGEL kauft ausgewählte Objekte über zwei eigene Investorenfirmen direkt an.", ctx.reg, 10, contentW - 40)) {
    t(line, M + 18, y - 40, 10, ctx.reg, FG);
  }
  y -= calloutH + 22;

  // Restlichen Weißraum bis zum Footer mit dem Beratungs-Band füllen (nur,
  // wenn noch spürbar Platz ist — sonst bleibt es leer).
  if (y - 78 > bandFloor) {
    visualBand(ctx, page, ctx.beratung, M, y, contentW, Math.min(230, y - bandFloor), "Persönliche Beratung aus Speyer und Ludwigshafen.", 0.82);
  }

  footer(ctx, page, w, pageNo, total);
}

/* ── Seite: ENDBLATT (rechtliche Infos) ────────────────── */
function drawLegal(ctx: Ctx, d: ReportData, objektTitle: string, pageNo: number, total: number) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "ANBIETER & RECHTLICHES");

  heading(ctx, page, "RIEGEL Immobilien", M, y, 16);
  y -= 22;

  const colW = (w - 2 * M - 24) / 2;
  // Anbieter-Block (links)
  let yl = y;
  const line = (s: string, x: number, yy: number, size = 9.5, font = ctx.reg, color: Color = MUTED) => t(s, x, yy, size, font, color);
  line("ANBIETER", M, yl, 9, ctx.bold, ACCENT_SOFT); yl -= 16;
  line("RIEGEL Immobilien e.K.", M, yl, 11, ctx.bold, FG); yl -= 15;
  line("Inhaberin: Sylwia RIEGEL", M, yl); yl -= 14;
  line("Wormser Straße 13, 67346 Speyer", M, yl); yl -= 13;
  line("Tel. 06232 100 10 10", M, yl); yl -= 16;
  line("Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen", M, yl); yl -= 13;
  line("Tel. 0621 5200 8800", M, yl); yl -= 16;
  line("info@riegel-immobilien.de", M, yl, 9.5, ctx.reg, ACCENT_SOFT); yl -= 13;
  line("www.riegel-immobilien.de", M, yl, 9.5, ctx.reg, ACCENT_SOFT); yl -= 18;
  line("USt-IdNr. & Registereintrag: siehe Impressum unter", M, yl, 8.5, ctx.reg, FAINT); yl -= 11;
  line("riegel-immobilien.de/impressum", M, yl, 8.5, ctx.reg, FAINT);

  // Auszeichnung-Block (rechts)
  let yr = y;
  const rx = M + colW + 24;
  line("AUSZEICHNUNG", rx, yr, 9, ctx.bold, ACCENT_SOFT); yr -= 16;
  for (const l of wrap("ImmoScout24 ImmoAward 2025 — Top 21 Makler des Jahres in Deutschland (von über 25.000).", ctx.reg, 9.5, colW)) {
    line(l, rx, yr, 9.5, ctx.reg, FG); yr -= 13;
  }
  yr -= 8;
  line("ERSTELLT", rx, yr, 9, ctx.bold, ACCENT_SOFT); yr -= 16;
  for (const l of wrap(`Dieser Report wurde am ${d.dateLabel} für ${d.name || "den Empfänger"} erstellt — Objekt: ${objektTitle}.`, ctx.reg, 9.5, colW)) {
    line(l, rx, yr, 9.5, ctx.reg, MUTED); yr -= 13;
  }

  y = Math.min(yl, yr) - 24;
  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: w - M, y: y + 8 }, thickness: 0.5, color: BORDER });

  heading(ctx, page, "Haftungsausschluss & Datenschutz", M, y, 12);
  y -= 16;
  const disc = [
    "Dieser Marktwert-Report ist eine unverbindliche, datenbasierte Sofort-Einschätzung und stellt KEIN Verkehrswertgutachten im Sinne des § 194 BauGB und keine Rechts-, Steuer- oder Finanzierungsberatung dar. Die Berechnung beruht auf amtlichen Bodenrichtwerten, regionalen Vergleichsdaten und Erfahrungswerten; tatsächlich erzielbare Preise können — abhängig von Objektzustand, Ausstattung, Markt- und Verhandlungslage — abweichen. Eine Haftung für die Richtigkeit und Vollständigkeit der Angaben ist ausgeschlossen.",
    "Das dargestellte Luftbild stammt aus Esri World Imagery (u. a. Maxar) und dient ausschließlich der Veranschaulichung der Lage. Die im Report verarbeiteten Angaben wurden von Ihnen über den Online-Rechner bereitgestellt und werden gemäß unserer Datenschutzerklärung (riegel-immobilien.de/datenschutz) ausschließlich zur Bearbeitung Ihrer Anfrage verwendet. Sie können der Verarbeitung jederzeit widersprechen.",
  ];
  if (d.bodenrichtwert) {
    const stichtag = d.bodenrichtwert.stichtag ? `, Stichtag ${d.bodenrichtwert.stichtag}` : "";
    const q = BORIS_QUELLEN[d.bodenrichtwert.quelle ?? "RLP"];
    disc.push(
      `Bodenrichtwert (amtlich, ${q.name}${stichtag}): ${eur(d.bodenrichtwert.brw)}/m² · Zone ${d.bodenrichtwert.zone || "–"} — ein amtlicher Bodenwert des Gutachterausschusses, kein Objektpreis. ${q.attribution}.`,
    );
  }
  for (const para of disc) {
    for (const l of wrap(para, ctx.reg, 8.5, w - 2 * M)) {
      t(l, M, y, 8.5, ctx.reg, FAINT);
      y -= 11.5;
    }
    y -= 6;
  }

  footer(ctx, page, w, pageNo, total);
}

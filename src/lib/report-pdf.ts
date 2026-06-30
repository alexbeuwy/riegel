import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage, type Color } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AKIRA_B64 } from "@/lib/report-assets/akira";
import { RIEGEL_MARK_B64 } from "@/lib/report-assets/mark";
import { COVER_JPG_B64 } from "@/lib/report-assets/cover";

/**
 * Markenkonformer, mehrseitiger RIEGEL-Marktwert-Report als PDF.
 * - AKIRA für die großen Überschriften, echtes RIEGEL-Logo (Bildmarke)
 * - Personalisiert: „Persönlicher Report für {Name} · Objekt {Adresse}"
 * - Substanz: Wertspanne, Objekt- & Kennzahlen, Preis-Faktoren mit Wirkung,
 *   Vermarktungszeit-Treiber, Markttrend, Methodik, Ansprechpartner-CTA
 * Pure-JS (pdf-lib) → läuft in der Vercel-Serverless-Runtime. Rückgabe: Base64.
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
  value: { low: number; mid: number; high: number; pricePerSqm?: number; comparables?: number; trendPct?: number; mikrolage?: number; confidence?: number };
  dateLabel: string;
}

const BG = rgb(0.043, 0.043, 0.051);
const SURFACE = rgb(0.078, 0.082, 0.094);
const BORDER = rgb(0.165, 0.165, 0.188);
const FG = rgb(0.957, 0.953, 0.941);
const MUTED = rgb(0.659, 0.651, 0.627);
const FAINT = rgb(0.486, 0.478, 0.459);
const ACCENT = rgb(0.004, 0.361, 1);
const ACCENT_SOFT = rgb(0.416, 0.631, 1);
const POS = rgb(0.31, 0.78, 0.47);
const NEG = rgb(0.85, 0.42, 0.4);

const A4: [number, number] = [595.28, 841.89];
const M = 48;

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Ctx {
  doc: PDFDocument;
  reg: PDFFont;
  bold: PDFFont;
  akira: PDFFont;
  mark: PDFImage;
  cover: PDFImage;
}

export async function buildReportPdf(d: ReportData): Promise<string> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("RIEGEL Marktwert-Report");
  doc.setAuthor("Riegel Immobilien");

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const akira = await doc.embedFont(Buffer.from(AKIRA_B64, "base64"), { subset: true });
  const mark = await doc.embedPng(Buffer.from(RIEGEL_MARK_B64, "base64"));
  const cover = await doc.embedJpg(Buffer.from(COVER_JPG_B64, "base64"));

  const ctx: Ctx = { doc, reg, bold, akira, mark, cover };
  const objektTitle = d.address || [d.postcode, d.city].filter(Boolean).join(" ") || "Ihre Immobilie";

  drawCoverPage(ctx, d, objektTitle);
  drawFactorsPage(ctx);
  drawMarketPage(ctx, d, objektTitle);

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
function header(ctx: Ctx, page: PDFPage, w: number, h: number, kicker: string) {
  const t = mkText(page);
  const mh = 16;
  const mw = (ctx.mark.width / ctx.mark.height) * mh;
  page.drawImage(ctx.mark, { x: M, y: h - M - mh + 1, width: mw, height: mh });
  t("RIEGEL", M + mw + 7, h - M - 12, 15, ctx.akira, FG, 1.5);
  textRight(page, kicker, w - M, h - M - 11, 9, ctx.bold, ACCENT_SOFT);
  const y = h - M - 22;
  page.drawLine({ start: { x: M, y }, end: { x: w - M, y }, thickness: 1, color: BORDER });
  return y - 26;
}
function footer(ctx: Ctx, page: PDFPage, w: number, pageNo: number) {
  const t = mkText(page);
  page.drawLine({ start: { x: M, y: 54 }, end: { x: w - M, y: 54 }, thickness: 0.5, color: BORDER });
  t("Riegel Immobilien e.K. · Wormser Straße 13, 67346 Speyer · Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen", M, 40, 7.5, ctx.reg, FAINT);
  textRight(page, `${pageNo} / 3`, w - M, 40, 7.5, ctx.reg, FAINT);
}
function sectionHeading(ctx: Ctx, page: PDFPage, s: string, x: number, y: number, size = 15) {
  mkText(page)(s.toUpperCase(), x, y, size, ctx.akira, FG, 0.5);
}

/* ── Seite 1: Cover + Wert + Daten ─────────────────────── */
function drawCoverPage(ctx: Ctx, d: ReportData, objektTitle: string) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: BG });
  const t = mkText(page);
  let y = header(ctx, page, w, h, "MARKTWERT-REPORT");

  // Cover-Banner (echtes Beratungsfoto)
  const bandH = 104;
  const bandW = w - 2 * M;
  page.drawImage(ctx.cover, { x: M, y: y - bandH, width: bandW, height: bandH });
  page.drawRectangle({ x: M, y: y - bandH, width: bandW, height: bandH, borderColor: BORDER, borderWidth: 1 });
  y -= bandH + 22;

  t("Persönlicher Report für", M, y, 10, ctx.reg, MUTED);
  y -= 22;
  sectionHeading(ctx, page, d.name || "Ihre Immobilie", M, y, 19);
  y -= 16;
  t(`Objekt: ${objektTitle}`, M, y, 10.5, ctx.reg, ACCENT_SOFT);
  textRight(page, d.dateLabel, w - M, y, 9, ctx.reg, FAINT);
  y -= 26;

  const heroH = 116;
  page.drawRectangle({ x: M, y: y - heroH, width: w - 2 * M, height: heroH, color: SURFACE, borderColor: ACCENT, borderWidth: 1 });
  page.drawRectangle({ x: M, y: y - heroH, width: 4, height: heroH, color: ACCENT });
  const cx = w / 2;
  const lbl = "GESCHÄTZTER MARKTWERT";
  t(lbl, cx - ctx.reg.widthOfTextAtSize(lbl, 9) / 2, y - 28, 9, ctx.reg, FAINT, 1.5);
  const mid = eur(d.value.mid);
  t(mid, cx - ctx.akira.widthOfTextAtSize(mid, 30) / 2, y - 70, 30, ctx.akira, FG);
  const span = `Spanne ${eur(d.value.low)} – ${eur(d.value.high)}${d.value.pricePerSqm ? `    ·    ${eur(d.value.pricePerSqm)}/m²` : ""}`;
  t(span, cx - ctx.reg.widthOfTextAtSize(span, 11) / 2, y - 94, 11, ctx.reg, MUTED);
  y -= heroH + 28;

  const colW = (w - 2 * M - 24) / 2;
  const start = y;
  const section = (title: string, rows: [string, string][], x: number) => {
    let yy = start;
    sectionHeading(ctx, page, title, x, yy, 11);
    yy -= 18;
    for (const [label, value] of rows) {
      if (!value) continue;
      t(label, x, yy, 10, ctx.reg, FAINT);
      textRight(page, value, x + colW, yy, 10, ctx.reg, FG);
      yy -= 6;
      page.drawLine({ start: { x, y: yy }, end: { x: x + colW, y: yy }, thickness: 0.5, color: BORDER });
      yy -= 14;
    }
    return yy;
  };
  const a = section("Objektdaten", [
    ["Objektart", d.objektartLabel ?? "–"],
    ["Wohnfläche", d.wohnflaeche ? `${d.wohnflaeche} m²` : "–"],
    ["Grundstück", d.grundflaeche ? `${d.grundflaeche} m²` : "–"],
    ["Zimmer", d.zimmer ? String(d.zimmer) : "–"],
    ["Baujahr", d.baujahr ? String(d.baujahr) : "–"],
    ["Zustand", d.zustand || "–"],
    ["Qualität", d.qualitaet || "–"],
    ["Energieklasse", d.energieklasse || "–"],
  ], M);
  const b = section("Kennzahlen", [
    ["Preis / m²", d.value.pricePerSqm ? eur(d.value.pricePerSqm) : "–"],
    ["Vergleichsobjekte", d.value.comparables != null ? String(d.value.comparables) : "–"],
    ["Markttrend (Lage)", d.value.trendPct != null ? `+${d.value.trendPct} % p.a.` : "–"],
    ["Mikrolage", d.value.mikrolage != null ? `${d.value.mikrolage}/10` : "–"],
    ["Daten-Konfidenz", d.value.confidence != null ? `${d.value.confidence} %` : "–"],
  ], M + colW + 24);

  let yy = Math.min(a, b) - 10;
  for (const line of wrap("Datenbasierte Sofort-Einschätzung aus amtlichen Bodenrichtwerten, regionalen Vergleichsobjekten und der RIEGEL-Transaktionsdatenbank. Auf den Folgeseiten: was Ihren Preis bewegt und wie schnell Sie verkaufen.", ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, yy, 9.5, ctx.reg, MUTED);
    yy -= 13.5;
  }

  footer(ctx, page, w, 1);
}

/* ── Seite 2: Preis-Faktoren ───────────────────────────── */
function drawFactorsPage(ctx: Ctx) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: BG });
  const t = mkText(page);
  let y = header(ctx, page, w, h, "PREIS-FAKTOREN");

  sectionHeading(ctx, page, "Was Ihren Preis beeinflusst", M, y, 16);
  y -= 18;
  for (const line of wrap("Aus über 25 Jahren regionaler Praxis: Diese Faktoren bewegen den erzielbaren Preis am stärksten. Die Bandbreiten sind Erfahrungswerte für die Vorderpfalz — Ihr Objekt kann je nach Kombination abweichen.", ctx.reg, 9.5, w - 2 * M)) {
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
    page.drawRectangle({ x: barX, y: y - 1.5, width: barW, height: 6, color: BORDER });
    page.drawRectangle({ x: barX, y: y - 1.5, width: barW * f.impact, height: 6, color: ACCENT });
    textRight(page, f.range, w - M, y, 9.5, ctx.bold, ACCENT_SOFT);
    y -= 15;
    for (const line of wrap(f.note, ctx.reg, 9, w - 2 * M)) {
      t(line, M, y, 9, ctx.reg, MUTED);
      y -= 12;
    }
    y -= 9;
  }

  footer(ctx, page, w, 2);
}

/* ── Seite 3: Vermarktungszeit + Markt + CTA ───────────── */
function drawMarketPage(ctx: Ctx, d: ReportData, objektTitle: string) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: BG });
  const t = mkText(page);
  let y = header(ctx, page, w, h, "VERMARKTUNG & MARKT");

  sectionHeading(ctx, page, "Wie schnell Sie verkaufen", M, y, 16);
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
    "Home Staging und ein aufgeräumter erster Eindruck",
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

  sectionHeading(ctx, page, "Markttrend Vorderpfalz", M, y, 13);
  y -= 16;
  const trend = `Einschätzung ${new Date().getFullYear()}: Die Nachfrage in Speyer, Ludwigshafen und der Vorderpfalz ist bei gut gelegenen Objekten stabil. Energieeffizienz ist zum preisbestimmenden Faktor geworden; das Zinsniveau bremst die Zahlungsbereitschaft, doch energetisch gute und fair bepreiste Immobilien verkaufen sich weiterhin zügig.${d.city ? ` Für ${d.city} sehen wir aktuell ${d.value.trendPct != null ? `rund +${d.value.trendPct} % p. a.` : "eine stabile Entwicklung"}.` : ""}`;
  for (const line of wrap(trend, ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, y, 9.5, ctx.reg, MUTED);
    y -= 13.5;
  }
  y -= 10;

  sectionHeading(ctx, page, "Methodik & Hinweis", M, y, 13);
  y -= 16;
  const disc = "Grundlage: amtliche Bodenrichtwerte, regionale Vergleichsobjekte und die RIEGEL-Transaktionsdatenbank. Unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB. Für einen belastbaren Verkaufspreis erstellt Riegel Immobilien eine kostenlose, ausführliche Bewertung vor Ort.";
  for (const line of wrap(disc, ctx.reg, 9, w - 2 * M)) {
    t(line, M, y, 9, ctx.reg, FAINT);
    y -= 12.5;
  }
  y -= 12;

  const ctaH = 76;
  page.drawRectangle({ x: M, y: y - ctaH, width: w - 2 * M, height: ctaH, color: SURFACE, borderColor: ACCENT, borderWidth: 1 });
  page.drawRectangle({ x: M, y: y - ctaH, width: 4, height: ctaH, color: ACCENT });
  t("IHR NÄCHSTER SCHRITT", M + 18, y - 24, 9, ctx.bold, ACCENT_SOFT, 1.2);
  t(`${d.name?.split(" ")[0] || "Wir"}, sichern wir gemeinsam den Bestpreis für ${objektTitle}.`, M + 18, y - 43, 12, ctx.bold, FG);
  t("Kostenlose Vor-Ort-Bewertung: riegel-immobilien.de/termin   ·   06232 100 10 10", M + 18, y - 59, 9.5, ctx.reg, MUTED);

  footer(ctx, page, w, 3);
}

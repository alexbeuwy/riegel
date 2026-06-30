import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage, type Color } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AKIRA_B64 } from "@/lib/report-assets/akira";
import { RIEGEL_MARK_B64 } from "@/lib/report-assets/mark";
import { COVER_JPG_B64 } from "@/lib/report-assets/cover";

/**
 * Mehrseitiger RIEGEL-Marktwert-Report als PDF — als echtes Dokument aufgebaut:
 *   1 Deckblatt   — Luftbild des EINGEGEBENEN Objekts (Esri/Maxar, wie im Rechner)
 *   2 Bewertung   — Wert-Hero, Objekt-/Kennzahlen + Stimmungsbild
 *   3 Preis-Faktoren mit Wirkung
 *   4 Vermarktungszeit & Markttrend
 *   5 Endblatt    — rechtliche Infos, Haftungsausschluss, Ansprechpartner
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
  value: { low: number; mid: number; high: number; pricePerSqm?: number; comparables?: number; trendPct?: number; mikrolage?: number; confidence?: number };
  dateLabel: string;
  /** Luftbild des Objekts (Base64-JPEG, Esri World Imagery an den Rechner-Koordinaten). */
  satelliteB64?: string;
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
const PAGES = 5;

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface Ctx {
  doc: PDFDocument;
  reg: PDFFont;
  bold: PDFFont;
  akira: PDFFont;
  mark: PDFImage;
  vibe: PDFImage;
  satellite: PDFImage | null;
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
  const vibe = await doc.embedJpg(Buffer.from(COVER_JPG_B64, "base64"));
  let satellite: PDFImage | null = null;
  if (d.satelliteB64) {
    try {
      satellite = await doc.embedJpg(Buffer.from(d.satelliteB64, "base64"));
    } catch {
      satellite = null;
    }
  }

  const ctx: Ctx = { doc, reg, bold, akira, mark, vibe, satellite };
  const objektTitle = d.address || [d.postcode, d.city].filter(Boolean).join(" ") || "Ihre Immobilie";

  drawCover(ctx, d, objektTitle);
  drawValuation(ctx, d);
  drawFactors(ctx);
  drawMarket(ctx, d, objektTitle);
  drawLegal(ctx, d, objektTitle);

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
function ellipsize(s: string, font: PDFFont, size: number, maxW: number): string {
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out.length > 1 && font.widthOfTextAtSize(out + "…", size) > maxW) out = out.slice(0, -1);
  return out + "…";
}
function bg(page: PDFPage, w: number, h: number) {
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: BG });
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
  textRight(page, `${pageNo} / ${PAGES}`, w - M, 40, 7.5, ctx.reg, FAINT);
}
function heading(ctx: Ctx, page: PDFPage, s: string, x: number, y: number, size = 15) {
  mkText(page)(s.toUpperCase(), x, y, size, ctx.akira, FG, 0.5);
}

/* ── Seite 1: DECKBLATT mit Objekt-Luftbild ────────────── */
function drawCover(ctx: Ctx, d: ReportData, objektTitle: string) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "MARKTWERT-REPORT");

  heading(ctx, page, "Marktwert-Report", M, y, 30);
  y -= 40;
  t("Persönlich erstellt für", M, y, 10, ctx.reg, MUTED);
  t(d.name || "Sie", M + ctx.reg.widthOfTextAtSize("Persönlich erstellt für ", 10) + 4, y, 10.5, ctx.bold, ACCENT_SOFT);
  y -= 18;
  t(`Objekt: ${objektTitle}`, M, y, 11, ctx.reg, FG);
  y -= 24;

  // Luftbild des eingegebenen Objekts (wie im Rechner)
  const bandW = w - 2 * M;
  const bandH = 348;
  const top = y;
  const bottom = top - bandH;
  if (ctx.satellite) {
    page.drawImage(ctx.satellite, { x: M, y: bottom, width: bandW, height: bandH });
    // Marker in der Bildmitte (Objekt-Position)
    const cx = M + bandW / 2;
    const cy = bottom + bandH / 2;
    page.drawCircle({ x: cx, y: cy, size: 13, color: ACCENT, opacity: 0.22 });
    page.drawCircle({ x: cx, y: cy, size: 7, color: BG });
    page.drawCircle({ x: cx, y: cy, size: 7, borderColor: ACCENT_SOFT, borderWidth: 2.5 });
    page.drawCircle({ x: cx, y: cy, size: 3, color: ACCENT });
    // Adress-Chip unten links
    const chip = ellipsize(objektTitle, ctx.bold, 9.5, bandW - 120);
    const cw = ctx.bold.widthOfTextAtSize(chip, 9.5) + 26;
    page.drawRectangle({ x: M + 12, y: bottom + 12, width: cw, height: 24, color: BG, opacity: 0.82 });
    page.drawRectangle({ x: M + 12, y: bottom + 12, width: 3, height: 24, color: ACCENT });
    t(chip, M + 24, bottom + 20, 9.5, ctx.bold, FG);
    // Quelle
    textRight(page, "Luftbild © Esri · Maxar", M + bandW - 10, bottom + 9, 7, ctx.reg, rgb(0.85, 0.85, 0.85));
  } else {
    page.drawRectangle({ x: M, y: bottom, width: bandW, height: bandH, color: SURFACE, borderColor: BORDER, borderWidth: 1 });
    const msg = "Luftbild des Objekts";
    t(msg, M + bandW / 2 - ctx.reg.widthOfTextAtSize(msg, 11) / 2, bottom + bandH / 2, 11, ctx.reg, FAINT);
  }
  page.drawRectangle({ x: M, y: bottom, width: bandW, height: bandH, borderColor: BORDER, borderWidth: 1 });
  y = bottom - 22;

  t(`Stand: ${d.dateLabel}`, M, y, 9.5, ctx.reg, MUTED);
  textRight(page, "Vertraulich · nur für den Empfänger", w - M, y, 9.5, ctx.reg, FAINT);

  footer(ctx, page, w, 1);
}

/* ── Seite 2: BEWERTUNG (Wert + Daten + Stimmungsbild) ─── */
function drawValuation(ctx: Ctx, d: ReportData) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "BEWERTUNG");

  // Wert-Hero
  const heroH = 112;
  page.drawRectangle({ x: M, y: y - heroH, width: w - 2 * M, height: heroH, color: SURFACE, borderColor: ACCENT, borderWidth: 1 });
  page.drawRectangle({ x: M, y: y - heroH, width: 4, height: heroH, color: ACCENT });
  const cx = w / 2;
  const lbl = "GESCHÄTZTER MARKTWERT";
  t(lbl, cx - ctx.reg.widthOfTextAtSize(lbl, 9) / 2, y - 26, 9, ctx.reg, FAINT, 1.5);
  const mid = eur(d.value.mid);
  t(mid, cx - ctx.akira.widthOfTextAtSize(mid, 30) / 2, y - 68, 30, ctx.akira, FG);
  const span = `Spanne ${eur(d.value.low)} – ${eur(d.value.high)}${d.value.pricePerSqm ? `    ·    ${eur(d.value.pricePerSqm)}/m²` : ""}`;
  t(span, cx - ctx.reg.widthOfTextAtSize(span, 11) / 2, y - 90, 11, ctx.reg, MUTED);
  y -= heroH + 26;

  const colW = (w - 2 * M - 24) / 2;
  const start = y;
  const section = (title: string, rows: [string, string][], x: number) => {
    let yy = start;
    heading(ctx, page, title, x, yy, 11);
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

  let yy = Math.min(a, b) - 8;
  for (const line of wrap("Datenbasierte Sofort-Einschätzung aus amtlichen Bodenrichtwerten, regionalen Vergleichsobjekten und der RIEGEL-Transaktionsdatenbank.", ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, yy, 9.5, ctx.reg, MUTED);
    yy -= 13;
  }
  yy -= 10;

  // Stimmungsbild (Vibe) — bewusst hier, nicht auf dem Deckblatt
  const imgH = yy - 70;
  if (imgH > 90) {
    page.drawImage(ctx.vibe, { x: M, y: 70, width: w - 2 * M, height: imgH });
    page.drawRectangle({ x: M, y: 70, width: w - 2 * M, height: imgH, borderColor: BORDER, borderWidth: 1 });
  }

  footer(ctx, page, w, 2);
}

/* ── Seite 3: PREIS-FAKTOREN ───────────────────────────── */
function drawFactors(ctx: Ctx) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "PREIS-FAKTOREN");

  heading(ctx, page, "Was Ihren Preis beeinflusst", M, y, 16);
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
  footer(ctx, page, w, 3);
}

/* ── Seite 4: VERMARKTUNG & MARKT ──────────────────────── */
function drawMarket(ctx: Ctx, d: ReportData, objektTitle: string) {
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

  heading(ctx, page, "Markttrend Vorderpfalz", M, y, 13);
  y -= 16;
  const trend = `Einschätzung ${new Date().getFullYear()}: Die Nachfrage in Speyer, Ludwigshafen und der Vorderpfalz ist bei gut gelegenen Objekten stabil. Energieeffizienz ist zum preisbestimmenden Faktor geworden; das Zinsniveau bremst die Zahlungsbereitschaft, doch energetisch gute und fair bepreiste Immobilien verkaufen sich weiterhin zügig.${d.city ? ` Für ${d.city} sehen wir aktuell ${d.value.trendPct != null ? `rund +${d.value.trendPct} % p. a.` : "eine stabile Entwicklung"}.` : ""}`;
  for (const line of wrap(trend, ctx.reg, 9.5, w - 2 * M)) {
    t(line, M, y, 9.5, ctx.reg, MUTED);
    y -= 13.5;
  }
  y -= 12;

  // CTA-Box
  const ctaH = 76;
  page.drawRectangle({ x: M, y: y - ctaH, width: w - 2 * M, height: ctaH, color: SURFACE, borderColor: ACCENT, borderWidth: 1 });
  page.drawRectangle({ x: M, y: y - ctaH, width: 4, height: ctaH, color: ACCENT });
  t("IHR NÄCHSTER SCHRITT", M + 18, y - 24, 9, ctx.bold, ACCENT_SOFT, 1.2);
  t(`${d.name?.split(" ")[0] || "Wir"}, sichern wir gemeinsam den Bestpreis für ${objektTitle}.`, M + 18, y - 43, 12, ctx.bold, FG);
  t("Kostenlose Vor-Ort-Bewertung: riegel-immobilien.de/termin   ·   06232 100 10 10", M + 18, y - 59, 9.5, ctx.reg, MUTED);

  footer(ctx, page, w, 4);
}

/* ── Seite 5: ENDBLATT (rechtliche Infos) ──────────────── */
function drawLegal(ctx: Ctx, d: ReportData, objektTitle: string) {
  const page = ctx.doc.addPage(A4);
  const { width: w, height: h } = page.getSize();
  bg(page, w, h);
  const t = mkText(page);
  let y = header(ctx, page, w, h, "ANBIETER & RECHTLICHES");

  heading(ctx, page, "Riegel Immobilien", M, y, 16);
  y -= 22;

  const colW = (w - 2 * M - 24) / 2;
  // Anbieter-Block (links)
  let yl = y;
  const line = (s: string, x: number, yy: number, size = 9.5, font = ctx.reg, color: Color = MUTED) => t(s, x, yy, size, font, color);
  line("ANBIETER", M, yl, 9, ctx.bold, ACCENT_SOFT); yl -= 16;
  line("Riegel Immobilien e.K.", M, yl, 11, ctx.bold, FG); yl -= 15;
  line("Inhaberin: Sylwia Riegel", M, yl); yl -= 14;
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
  for (const para of disc) {
    for (const l of wrap(para, ctx.reg, 8.5, w - 2 * M)) {
      t(l, M, y, 8.5, ctx.reg, FAINT);
      y -= 11.5;
    }
    y -= 6;
  }

  footer(ctx, page, w, 5);
}

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Generiert einen markenkonformen RIEGEL-Marktwert-Report als PDF (dark, Blau-Akzent).
 * Pure-JS (pdf-lib) → läuft in der Vercel-Serverless-Runtime ohne Browser/Binärdateien.
 * Rückgabe: Base64-String (für E-Mail-Anhang via Resend).
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

// RIEGEL-Palette
const BG = rgb(0.043, 0.043, 0.051); // #0b0b0d
const SURFACE = rgb(0.078, 0.082, 0.094); // #14151a
const BORDER = rgb(0.165, 0.165, 0.188); // #2a2a30
const FG = rgb(0.957, 0.953, 0.941); // #f4f3f0
const MUTED = rgb(0.659, 0.651, 0.627); // #a8a6a0
const FAINT = rgb(0.486, 0.478, 0.459); // #7c7a75
const ACCENT = rgb(0.004, 0.361, 1); // #015cff
const ACCENT_SOFT = rgb(0.416, 0.631, 1); // #6aa1ff

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export async function buildReportPdf(d: ReportData): Promise<string> {
  const doc = await PDFDocument.create();
  doc.setTitle("RIEGEL Marktwert-Report");
  doc.setAuthor("Riegel Immobilien");
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const M = 48; // Rand
  page.drawRectangle({ x: 0, y: 0, width, height, color: BG });

  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont = reg,
    color = FG,
    spacing = 0,
  ) => {
    // pdf-lib (1.x) kennt kein characterSpacing → Tracking zeichnen wir manuell.
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

  // Rechtsbündig
  const textR = (s: string, xRight: number, y: number, size: number, font: PDFFont = reg, color = FG) => {
    const w = font.widthOfTextAtSize(s, size);
    text(s, xRight - w, y, size, font, color);
  };

  // ── Kopf ─────────────────────────────────────────────
  let y = height - M;
  text("RIEGEL", M, y - 14, 20, bold, FG, 3);
  text("IMMOBILIEN", M + bold.widthOfTextAtSize("RIEGEL", 20) + 8, y - 14, 20, reg, MUTED, 3);
  textR("MARKTWERT-REPORT", width - M, y - 12, 10, bold, ACCENT_SOFT);
  textR(d.dateLabel, width - M, y - 28, 9, reg, FAINT);
  y -= 34;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1, color: BORDER });
  y -= 30;

  // ── Adresse / Objekt-Titel ───────────────────────────
  const titleLine = d.address || [d.postcode, d.city].filter(Boolean).join(" ") || "Ihre Immobilie";
  text(titleLine, M, y, 17, bold, FG);
  y -= 18;
  const sub = [d.objektartLabel, [d.postcode, d.city].filter(Boolean).join(" ")].filter(Boolean).join("  ·  ");
  if (sub) {
    text(sub, M, y, 10, reg, MUTED);
    y -= 8;
  }
  y -= 22;

  // ── Wert-Hero (Box) ──────────────────────────────────
  const heroH = 110;
  page.drawRectangle({ x: M, y: y - heroH, width: width - 2 * M, height: heroH, color: SURFACE, borderColor: ACCENT, borderWidth: 1, opacity: 1 });
  // Akzentbalken links
  page.drawRectangle({ x: M, y: y - heroH, width: 4, height: heroH, color: ACCENT });
  const cx = width / 2;
  const heroLabel = "GESCHÄTZTER MARKTWERT";
  text(heroLabel, cx - reg.widthOfTextAtSize(heroLabel, 9) / 2, y - 26, 9, reg, FAINT, 1.5);
  const midStr = eur(d.value.mid);
  text(midStr, cx - bold.widthOfTextAtSize(midStr, 34) / 2, y - 64, 34, bold, FG);
  const spanStr = `Spanne ${eur(d.value.low)} – ${eur(d.value.high)}${d.value.pricePerSqm ? `   ·   ${eur(d.value.pricePerSqm)}/m²` : ""}`;
  text(spanStr, cx - reg.widthOfTextAtSize(spanStr, 11) / 2, y - 88, 11, reg, MUTED);
  y -= heroH + 30;

  // ── Zwei-Spalten: Objektdaten | Kennzahlen ───────────
  const colW = (width - 2 * M - 24) / 2;
  const startY = y;

  const drawSection = (title: string, rows: [string, string][], x: number) => {
    let yy = startY;
    text(title.toUpperCase(), x, yy, 9, bold, ACCENT_SOFT, 1.5);
    yy -= 18;
    for (const [label, value] of rows) {
      if (!value) continue;
      text(label, x, yy, 10, reg, FAINT);
      textR(value, x + colW, yy, 10, reg, FG);
      yy -= 6;
      page.drawLine({ start: { x, y: yy }, end: { x: x + colW, y: yy }, thickness: 0.5, color: BORDER });
      yy -= 14;
    }
    return yy;
  };

  const objLeftY = drawSection(
    "Objektdaten",
    [
      ["Objektart", d.objektartLabel ?? "–"],
      ["Wohnfläche", d.wohnflaeche ? `${d.wohnflaeche} m²` : "–"],
      ["Grundstück", d.grundflaeche ? `${d.grundflaeche} m²` : "–"],
      ["Zimmer", d.zimmer ? String(d.zimmer) : "–"],
      ["Baujahr", d.baujahr ? String(d.baujahr) : "–"],
      ["Zustand", d.zustand || "–"],
      ["Qualität", d.qualitaet || "–"],
      ["Energieklasse", d.energieklasse || "–"],
    ],
    M,
  );

  const kennLeftY = drawSection(
    "Kennzahlen",
    [
      ["Preis / m²", d.value.pricePerSqm ? eur(d.value.pricePerSqm) : "–"],
      ["Vergleichsobjekte", d.value.comparables != null ? String(d.value.comparables) : "–"],
      ["Markttrend", d.value.trendPct != null ? `+${d.value.trendPct} % p.a.` : "–"],
      ["Mikrolage", d.value.mikrolage != null ? `${d.value.mikrolage}/10` : "–"],
      ["Konfidenz", d.value.confidence != null ? `${d.value.confidence} %` : "–"],
    ],
    M + colW + 24,
  );

  y = Math.min(objLeftY, kennLeftY) - 16;

  // ── Methodik / Disclaimer ────────────────────────────
  const wrap = (s: string, font: PDFFont, size: number, maxW: number): string[] => {
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
  };

  text("METHODIK & HINWEIS", M, y, 9, bold, ACCENT_SOFT, 1.5);
  y -= 16;
  const disc =
    "Diese Einschätzung basiert auf regionalen Vergleichsdaten, Bodenrichtwerten und Markttrends der Vorderpfalz. Es handelt sich um eine unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB. Für einen belastbaren Verkaufspreis erstellt Riegel Immobilien eine kostenlose, ausführliche Bewertung vor Ort.";
  for (const line of wrap(disc, reg, 9.5, width - 2 * M)) {
    text(line, M, y, 9.5, reg, MUTED);
    y -= 14;
  }
  y -= 16;

  // ── Ansprechpartner / CTA-Box ────────────────────────
  const ctaH = 78;
  page.drawRectangle({ x: M, y: y - ctaH, width: width - 2 * M, height: ctaH, color: SURFACE, borderColor: BORDER, borderWidth: 1 });
  text("IHR PERSÖNLICHER NÄCHSTER SCHRITT", M + 18, y - 24, 9, bold, ACCENT_SOFT, 1.2);
  text("Kostenlose Vor-Ort-Bewertung mit Ihrem Riegel-Experten.", M + 18, y - 42, 12, bold, FG);
  text("Termin online: riegel-immobilien.de/termin   ·   06232 100 10 10", M + 18, y - 58, 9.5, reg, MUTED);
  y -= ctaH;

  // ── Fußzeile ─────────────────────────────────────────
  drawFooter(page, reg, M, width);

  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

function drawFooter(page: PDFPage, reg: PDFFont, M: number, width: number) {
  const fy = 40;
  page.drawLine({ start: { x: M, y: fy + 14 }, end: { x: width - M, y: fy + 14 }, thickness: 0.5, color: BORDER });
  page.drawText("Riegel Immobilien e.K. · Wormser Straße 13, 67346 Speyer · Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen", {
    x: M,
    y: fy,
    size: 8,
    font: reg,
    color: FAINT,
  });
}

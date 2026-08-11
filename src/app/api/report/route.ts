import { NextResponse } from "next/server";
import {
  sendMail,
  emailLayout,
  emailRows,
  emailTargets,
  REPORT_HEADING_HTML,
  reportValueHero,
  reportMiniFacts,
  reportPdfTeaser,
  reportPdfCallout,
} from "@/lib/email";
import { buildReportPdf, REFERENZ_MAX } from "@/lib/report-pdf";
import { buildReportContext } from "@/lib/report-context";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  estimateValue,
  type Objektart,
  type Zustand,
  type Qualitaet,
  type Vermietungsstand,
} from "@/lib/valuation";
import { fetchBodenrichtwert, isImBorisGebiet, hintFuerObjektart } from "@/lib/boris";
import { fetchSatellite } from "@/lib/satellite";
import { buildReportObjekte } from "@/lib/report-objekte";
import { createOnOfficeAddress } from "@/lib/onoffice";
import { parseDeZahl } from "@/lib/parse-de-zahl";
import { site } from "@/lib/site";

// pdf-lib/fontkit brauchen echte Node.js-Buffer/Crypto-APIs (kein Edge) UND
// diese Route macht mehrere sequenzielle externe Aufrufe (Bodenrichtwert bis
// 6 s, Satellitenbild bis 9 s) PLUS CPU-lastiges Font-/Bild-Embedding fürs
// PDF — das kann in Summe deutlich über Vercels Standard-Timeout (ohne
// explizite Konfiguration je nach Plan nur 10–15 s) liegen. Beides explizit
// setzen, statt auf implizite Next.js-/Vercel-Defaults zu vertrauen.
export const runtime = "nodejs";
export const maxDuration = 60;

// Nur beim HTML-Rendern escapen — PDF, DB, to/replyTo bekommen Rohwerte
// (sonst landet „Müller &amp; Söhne" im Report und im CSV-Export).
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

const eur = (n: unknown) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
};

const num = (v: unknown): number | null => {
  // Leere Werte vor Number() abfangen: Number(null) und Number("") sind 0 —
  // bei den Koordinaten unten hieße das die Nullinsel im Atlantik statt
  // "keine Koordinate", also falsches Luftbild und falscher Bodenrichtwert.
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Zahl im Bereich [min, max] oder undefined (für Eingaben/Kennzahlen).
 * Nutzt parseDeZahl, damit deutsche Eingaben ("32,35", "1.234") serverseitig
 * genauso akzeptiert werden wie im Rechner-Client. Nicht für Koordinaten
 * verwenden (num unten) — dort wäre die Tausenderpunkt-Heuristik falsch.
 */
const bounded = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "string" || typeof v === "number" ? parseDeZahl(v) : undefined;
  return n != null && n >= min && n <= max ? n : undefined;
};

const OBJEKTARTEN = new Set<Objektart>(["wohnung", "haus", "grundstueck", "gewerbe", "mehrfamilienhaus"]);
const ZUSTAENDE = new Set<Zustand>(["neuwertig", "gepflegt", "renovierungsbeduerftig"]);
const QUALITAETEN = new Set<Qualitaet>(["einfach", "normal", "gehoben", "luxus"]);
const VERMIETUNGSSTAENDE = new Set<Vermietungsstand>(["vermietet", "teilweise", "leer"]);

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

/** Bewertungs-Hero (große Zahl + Spanne) als email-sichere Tabelle. */
function valueHero(mid: number, low: number, high: number, perSqm: number | undefined) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#eef3ff;border:1px solid #dbe5fa;border-radius:16px;">
<tr><td style="padding:22px 24px;text-align:center;">
<div style="color:#6b7590;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Geschätzter Marktwert</div>
<div style="color:#015cff;font-size:40px;font-weight:800;letter-spacing:0.5px;margin:8px 0 4px;">${eur(mid)}</div>
<div style="color:#5a6072;font-size:14px;">Spanne ${eur(low)} – ${eur(high)}${perSqm ? ` · ${eur(perSqm)}/m²` : ""}</div>
</td></tr></table>`;
}

export async function POST(req: Request) {
  if (!rateLimit(`report:${clientIp(req)}`, 6, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  // Honeypot: unsichtbares Feld — von Menschen leer, von Bots gefüllt.
  if (clean(b.website, 200)) {
    return NextResponse.json({ ok: true, delivered: false, skipped: true });
  }

  const name = clean(b.name, 200);
  const email = clean(b.email, 200);
  const phone = clean(b.phone, 80);
  const message = clean(b.message, 2000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const address = clean(b.address, 240);
  const city = clean(b.city, 120);
  const postcode = clean(b.postcode, 20);

  const objektart = String(b.objektart ?? "") as Objektart;
  const zustand = String(b.zustand ?? "") as Zustand;
  const qualitaet = String(b.qualitaet ?? "") as Qualitaet;
  if (!OBJEKTARTEN.has(objektart) || !ZUSTAENDE.has(zustand) || !QUALITAETEN.has(qualitaet)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  const objektartLabel = OBJEKTART_LABEL[objektart];
  const energieklasse = /^(A\+|[A-H])$/.test(String(b.energieklasse ?? ""))
    ? String(b.energieklasse)
    : "";
  const ausstattung = Array.isArray(b.ausstattung)
    ? b.ausstattung.filter((x): x is string => typeof x === "string").slice(0, 12)
    : [];

  // Mehrfamilienhäuser (Zinshäuser) können deutlich über 5000 m² liegen —
  // großzügigere Obergrenze, sonst fällt wohnflaeche bei validen Großobjekten
  // stillschweigend auf undefined (kein Preis/m² mehr im Report).
  const wohnflaeche = bounded(b.wohnflaeche, 10, objektart === "mehrfamilienhaus" ? 30_000 : 5000);
  const grundflaeche = bounded(b.grundflaeche, 20, 200000);
  const zimmer = bounded(b.zimmer, 1, 50);
  const baujahr = bounded(b.baujahr, 1800, 2030);
  const lat = num(b.lat);
  const lng = num(b.lng);

  // Mehrfamilienhaus: Ertragswert-Ansatz statt Flächen-Rechnung. Pflichtangabe
  // ist je nach Vermietungsstand die Ist-Miete ODER die Wohnfläche — bei
  // Leerstand setzt die Engine die marktübliche Miete selbst an, dann ist die
  // Wohnfläche die Rechengrundlage (s. calculator.tsx / valuation.ts).
  const jahresnettokaltmiete = bounded(b.jahresnettokaltmiete, 100, 20_000_000);
  const wohneinheiten = bounded(b.wohneinheiten, 1, 500);
  const gewerbeeinheiten = bounded(b.gewerbeeinheiten, 0, 200);
  const vermietungsstand = VERMIETUNGSSTAENDE.has(b.vermietungsstand as Vermietungsstand)
    ? (b.vermietungsstand as Vermietungsstand)
    : "vermietet";
  const leerstehendeWohnflaeche = bounded(b.leerstehendeWohnflaeche, 1, 30_000);
  // Gewerbe: Hallen-/Lageranteil an der Nutzfläche (s. HALLEN_FAKTOR in valuation.ts).
  const hallenflaeche = bounded(b.hallenflaeche, 1, 100_000);
  // Gewerbe-/Mischobjekt: Wohnfläche abgeschlossener Wohneinheiten im Objekt
  // (s. MISCH_WOHN_FAKTOR in valuation.ts — Hinweis Manfred: Halle mit zwei
  // Wohnungen und Büro).
  const mischWohnflaeche = bounded(b.mischWohnflaeche, 1, 30_000);
  if (objektart === "mehrfamilienhaus") {
    const brauchtMiete = vermietungsstand !== "leer";
    if (brauchtMiete && jahresnettokaltmiete == null) {
      return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
    }
    if (vermietungsstand !== "vermietet" && wohnflaeche == null) {
      return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
    }
  }

  // Amtlichen Bodenrichtwert VOR der Nachrechnung laden (gleicher Cache wie
  // /api/bodenrichtwert) — Client und Server nutzen dadurch dieselbe Zahl,
  // PDF und Anzeige im Rechner widersprechen sich also nie. Fail-soft: bei
  // null (Timeout, außerhalb RLP/Hessen, …) rechnet estimateValue mit dem
  // Modellwert. Dieselben groben Länder-Bboxen wie /api/bodenrichtwert
  // vorschalten, damit sich über diese Route (Rate-Limit 6/10min, aber sonst
  // ohne Bbox-Gate) nicht die externen Landesdienste mit beliebigen
  // Koordinaten anstoßen lassen. Objektart-Hint: wählt bei überlappenden
  // Hessen-Zonen die passende (EFH/MFH/Gewerbe) — gleicher Hint wie im
  // Rechner-Client, sonst widersprechen sich Anzeige und PDF.
  const boris =
    lat != null && lng != null && isImBorisGebiet(lat, lng)
      ? await fetchBodenrichtwert(lat, lng, hintFuerObjektart(objektart))
      : null;

  // Wert SERVERSEITIG nachrechnen (Kern der Engine ist deterministisch) —
  // Client-Zahlen werden nicht übernommen, sonst ließen sich per curl
  // offiziell aussehende RIEGEL-PDFs mit Fantasiewerten erzeugen.
  const calc = estimateValue(
    {
      objektart,
      ort: city,
      plz: postcode,
      wohnflaeche,
      grundflaeche,
      zimmer,
      baujahr,
      zustand,
      qualitaet,
      energieklasse: energieklasse || undefined,
      ausstattung,
      // Bei Vollleerstand eine mitgesendete Miete verwerfen — sonst würde sie
      // trotz "leer stehend" in den Ertragswert einfließen.
      jahresnettokaltmiete: vermietungsstand === "leer" ? undefined : jahresnettokaltmiete,
      wohneinheiten,
      gewerbeeinheiten,
      vermietungsstand: objektart === "mehrfamilienhaus" ? vermietungsstand : undefined,
      leerstehendeWohnflaeche: vermietungsstand === "teilweise" ? leerstehendeWohnflaeche : undefined,
      hallenflaeche: objektart === "gewerbe" ? hallenflaeche : undefined,
      mischWohnflaeche: objektart === "gewerbe" ? mischWohnflaeche : undefined,
    },
    { bodenrichtwert: boris?.brw ?? undefined },
  );
  const { low, mid, high, pricePerSqm: perSqm, vervielfaeltiger, mietAnsatz, grundstuecksAnrechnung, flaechenAufteilung } = calc;
  if (!mid || mid <= 0) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  // Kennzahlen: Client-Werte (gleiche Optik wie im Rechner angezeigt),
  // aber auf plausible Bereiche geklemmt; sonst Server-Fallback.
  const v = (b.valuation ?? {}) as Record<string, unknown>;
  const comparables = Math.round(bounded(v.comparables, 3, 300) ?? calc.comparables);
  const confidence = Math.round(bounded(v.confidence, 50, 96) ?? calc.confidence);
  const trendPct = Math.round((bounded(v.trendPct, 0, 15) ?? calc.trendPct) * 10) / 10;
  const mikrolage = Math.round((bounded(v.mikrolage, 1, 10) ?? calc.mikrolage) * 10) / 10;

  const objektRows = emailRows([
    { label: "Adresse", value: esc(address) },
    { label: "Objektart", value: esc(objektartLabel) },
    {
      label: objektart === "gewerbe" ? "Nutzfläche" : "Wohnfläche",
      value: wohnflaeche ? `${wohnflaeche} m²` : "",
    },
    { label: "davon Halle/Lager", value: objektart === "gewerbe" && hallenflaeche ? `${hallenflaeche} m²` : "" },
    { label: "davon Wohnfläche", value: objektart === "gewerbe" && mischWohnflaeche ? `${mischWohnflaeche} m²` : "" },
    { label: "Grundstück", value: grundflaeche ? `${grundflaeche} m²` : "" },
    { label: "Zimmer", value: zimmer ? String(zimmer) : "" },
    { label: "Baujahr", value: baujahr ? String(baujahr) : "" },
    { label: "Zustand", value: esc(zustand) },
    { label: "Qualität", value: esc(qualitaet) },
    { label: "Energieklasse", value: esc(energieklasse) },
    { label: "Jahresnettokaltmiete", value: jahresnettokaltmiete ? `${eur(jahresnettokaltmiete)}/Jahr` : "" },
    {
      label: "Vermietungsstand",
      value:
        mietAnsatz && mietAnsatz.leerstandM2 > 0
          ? mietAnsatz.leerstandAnteil >= 1
            ? "leer stehend (Marktmiete angesetzt)"
            : `teilweise vermietet (${mietAnsatz.leerstandM2} m² leer)`
          : "",
    },
    {
      label: "Angesetzte Marktmiete",
      value:
        mietAnsatz && mietAnsatz.marktmieteGeschaetzt > 0
          ? `${eur(mietAnsatz.marktmieteGeschaetzt)}/Jahr (${mietAnsatz.marktmieteM2} €/m², −${mietAnsatz.abschlagPct} % Leerstand)`
          : "",
    },
    { label: "Wohneinheiten", value: wohneinheiten ? String(wohneinheiten) : "" },
    { label: "Gewerbeeinheiten", value: gewerbeeinheiten ? String(gewerbeeinheiten) : "" },
  ]);

  const kennzahlen = emailRows([
    { label: "Preis / m²", value: perSqm ? `${eur(perSqm)}` : "" },
    { label: "Vergleichsobjekte", value: String(comparables) },
    { label: "Markttrend", value: `+${trendPct} % p.a.` },
    { label: "Mikrolage", value: `${mikrolage}/10` },
    { label: "Konfidenz", value: `${confidence} %` },
    { label: "Vervielfältiger (Ertragswert)", value: vervielfaeltiger != null ? `${vervielfaeltiger}×` : "" },
  ]);

  const disclaimer = `<p style="margin:18px 0 0;color:#6b7590;font-size:12px;line-height:1.6;">
Unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
Für einen belastbaren Verkaufspreis erstellt RIEGEL Immobilien eine kostenlose, ausführliche Bewertung vor Ort.</p>`;

  // Aus site.url zusammengesetzt statt hartkodiert, damit ein künftiger
  // Domain- oder Schemawechsel automatisch mitzieht (Ziel bleibt unverändert).
  const ctaBtn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>
<td style="border-radius:999px;background:#015cff;"><a href="${site.url}/termin" style="display:inline-block;padding:12px 26px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Vor-Ort-Bewertung vereinbaren</a></td>
</tr></table>`;

  // Luftbild (Esri, wie im Rechner) + echte OnOffice-Vergleichsobjekte parallel
  // holen — beide fail-soft und unabhängig; sequenziell würde der Interessent
  // nur unnötig länger auf seine Mail warten.
  const [satelliteB64, vergleichsobjekte] = await Promise.all([
    fetchSatellite(lat, lng),
    // Ziel-Kontext (Koordinaten + Schätzwert + Wohnfläche) für die Relevanz-
    // Auswahl: nahe, preis- und größenähnliche Referenzen statt beliebiger
    // Verkaufs-Erfolge; Basis der ehrlichen Einordnung im PDF.
    buildReportObjekte(objektart, city, REFERENZ_MAX, { lat: lat ?? undefined, lng: lng ?? undefined, preis: mid, flaeche: wohnflaeche }),
  ]);

  // PDF-Report bauen (markenkonform, dark) — als Anhang an Kunde & RIEGEL.
  let pdfBase64: string | null = null;
  try {
    pdfBase64 = await buildReportPdf({
      name,
      address,
      city,
      postcode,
      objektartLabel,
      satelliteB64: satelliteB64 ?? undefined,
      wohnflaeche,
      grundflaeche,
      zimmer,
      baujahr,
      zustand,
      qualitaet,
      energieklasse,
      ausstattung,
      factors: calc.factors,
      context: buildReportContext({ city, lat, lng }),
      vergleichsobjekte,
      jahresnettokaltmiete,
      wohneinheiten,
      gewerbeeinheiten,
      hallenflaeche,
      mischWohnflaeche,
      value: {
        low,
        mid,
        high,
        pricePerSqm: perSqm,
        comparables,
        trendPct,
        mikrolage,
        confidence,
        vervielfaeltiger,
        mietAnsatz,
        grundstuecksAnrechnung,
        flaechenAufteilung,
      },
      dateLabel: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()),
      bodenrichtwert: boris ? { brw: boris.brw, stichtag: boris.stichtag, zone: boris.zone, quelle: boris.quelle } : undefined,
    });
  } catch (e) {
    // Vollen Stack loggen (nicht nur die Fehlermeldung) — sonst lässt sich ein
    // produktionsspezifischer Fehler (Font-/Bild-Decode, pdf-lib-Aufruf mit
    // unerwartetem Wert …) aus den Vercel-Logs nicht rekonstruieren.
    console.error("[report] PDF-Erstellung fehlgeschlagen:", e instanceof Error ? e.stack ?? e.message : e);
  }

  const pdfName = `RIEGEL-Marktwert-Report${city ? `-${city}` : ""}.pdf`.replace(/\s+/g, "-");
  // Resend akzeptiert Buffer am zuverlässigsten (Base64-String kann je nach Version
  // doppelt kodiert werden) → als Buffer übergeben.
  const attachments = pdfBase64 ? [{ filename: pdfName, content: Buffer.from(pdfBase64, "base64") }] : undefined;

  // 1) Report an den Kunden (mit PDF im Anhang)
  const customer = await sendMail({
    to: email,
    replyTo: emailTargets.TO,
    subject: `Ihr Marktwert-Report${city ? ` · ${city}` : ""} — RIEGEL Immobilien`,
    attachments,
    html: emailLayout({
      heading: REPORT_HEADING_HTML,
      intro: `Vielen Dank, ${esc(name.split(" ")[0]) || "und herzlich willkommen"}! Hier ist Ihre Sofort-Einschätzung${address ? ` für ${esc(address)}` : ""}. Die vollständige Analyse mit allen Grafiken und Kennzahlen liegt als PDF im Anhang.`,
      // Kompakte Kundenmail: Wert-Aufhänger, ein paar Eckdaten in zwei Spalten,
      // PDF-Teaser + deutlicher Anhang-Callout. Alle Detail-Listen stehen im PDF.
      bodyHtml:
        reportValueHero({ mid, low, high, perSqm }) +
        reportMiniFacts([
          { label: "Objektart", value: esc(objektartLabel ?? "") },
          { label: objektartLabel === "Gewerbe" ? "Nutzfläche" : "Wohnfläche", value: wohnflaeche ? `${wohnflaeche} m²` : "" },
          { label: "Baujahr", value: baujahr ? String(baujahr) : "" },
          { label: "Zustand", value: esc(zustand) },
          { label: "Markttrend", value: `+${trendPct} % p.a.` },
          { label: "Mikrolage", value: `${mikrolage}/10` },
        ]) +
        reportPdfTeaser() +
        reportPdfCallout() +
        ctaBtn +
        disclaimer,
    }),
  });

  // 2) Interne Kopie an RIEGEL (das „Backend"/CC, das du sehen willst) — ebenfalls mit PDF
  const internal = await sendMail({
    replyTo: email,
    subject: `📋 Report-Lead: ${name}${city ? ` · ${city}` : ""} (${eur(mid)})`,
    attachments,
    html: emailLayout({
      heading: "Neue Report-Anfrage (Rechner)",
      intro: "Ein Interessent hat über den Immorechner einen Marktwert-Report angefordert. Das versendete PDF hängt an.",
      bodyHtml:
        emailRows([
          { label: "Name", value: esc(name) },
          { label: "E-Mail", value: esc(email) },
          { label: "Telefon", value: esc(phone) },
          { label: "Nachricht", value: esc(message) },
        ]) +
        valueHero(mid, low, high, perSqm) +
        `<div style="color:#6b7590;font-size:13px;margin:0 0 4px;">Objektdaten</div>` + objektRows +
        `<div style="color:#6b7590;font-size:13px;margin:14px 0 4px;">Kennzahlen</div>` + kennzahlen,
    }),
  });

  // 3) In Supabase protokollieren (Nachvollziehbarkeit)
  let logged = false;
  let leadId: string | null = null;
  if (supabaseServer) {
    // Bisheriger Feldstand (heutiges Schema) — als Legacy-Fallback verwendet,
    // falls die neuen Spalten (s. u.) auf dieser Datenbank noch nicht existieren.
    const legacyRow = {
      address: address || null,
      city: city || null,
      postcode: postcode || null,
      lat,
      lng,
      objektart,
      wohnflaeche: wohnflaeche ?? null,
      grundflaeche: grundflaeche ?? null,
      zimmer: zimmer ?? null,
      baujahr: baujahr ?? null,
      zustand,
      qualitaet,
      value_low: low || null,
      value_mid: mid || null,
      value_high: high || null,
      price_per_sqm: perSqm || null,
      confidence,
      report_requested: true,
      name,
      email,
      phone: phone || null,
      message: message || null,
    };
    const fullRow = {
      ...legacyRow,
      energieklasse: energieklasse || null,
      ausstattung: ausstattung.length ? ausstattung : null,
      jahresnettokaltmiete: jahresnettokaltmiete ?? null,
      wohneinheiten: wohneinheiten ?? null,
      gewerbeeinheiten: gewerbeeinheiten ?? null,
      // Gewerbe-Split (Halle/Wohnen): ohne Persistenz rechnete das interne
      // Regenerat (api/intern/report) den Report OHNE die Aufteilung nach —
      // mit anderem Ergebnis als damals kommuniziert.
      hallenflaeche: (objektart === "gewerbe" ? hallenflaeche : null) ?? null,
      misch_wohnflaeche: (objektart === "gewerbe" ? mischWohnflaeche : null) ?? null,
      comparables,
      trend_pct: trendPct,
      mikrolage,
      vervielfaeltiger: vervielfaeltiger ?? null,
    };
    let { data: eingefuegt, error } = await supabaseServer
      .from("valuation_requests")
      .insert(fullRow)
      .select("id")
      .single();
    // Migrations-Resilienz: die neuen Spalten existieren evtl. noch nicht auf
    // dieser Datenbank (Migration noch nicht gelaufen) — dann mit dem
    // bisherigen Feld-Set erneut versuchen, statt den ganzen Lead zu verlieren.
    if (error && /column|schema cache/i.test(error.message)) {
      console.warn("[report] valuation_requests: neue Spalten fehlen noch, Legacy-Insert", error.message);
      ({ data: eingefuegt, error } = await supabaseServer
        .from("valuation_requests")
        .insert(legacyRow)
        .select("id")
        .single());
    }
    if (error) console.error("[report] valuation_requests-Insert fehlgeschlagen:", error.message);
    logged = !error;
    leadId = eingefuegt?.id != null ? String(eingefuegt.id) : null;
  }

  // Automatische CRM-Uebergabe (Freigabe Alex, 04.08.2026): Wer einen
  // PDF-Report anfordert, hat Namen und E-Mail dagelassen und ist damit ein
  // qualifizierter Kontakt — der landet ohne Handarbeit als Adressdatensatz
  // in OnOffice. Ausgenommen sind die Bueroadressen (@riegel-immobilien.de):
  // rund die Haelfte der Reports erfasst RIEGEL selbst im Kundengespraech,
  // eine Automatik wuerde das CRM mit den eigenen Testlaeufen fluten.
  // Doppelte Anfragen derselben Adresse faengt OnOffice ueber checkDuplicate
  // selbst ab. Fail-soft: ein CRM-Fehler kostet nie den Report.
  if (!email.trim().toLowerCase().endsWith("@riegel-immobilien.de")) {
    const teile = name.trim().split(/\s+/);
    const onofficeId = await createOnOfficeAddress({
      vorname: teile.length > 1 ? teile.slice(0, -1).join(" ") : undefined,
      name: teile[teile.length - 1] || name,
      email,
      telefon: phone || undefined,
      strasse: address || undefined,
      plz: postcode || undefined,
      ort: city || undefined,
      bemerkung: `Website-Lead: Marktwert-Report ${objektartLabel}${city ? ` in ${city}` : ""}, Schaetzwert ${eur(mid)} (${new Date().toLocaleDateString("de-DE")})`,
    });
    if (onofficeId && leadId && supabaseServer) {
      // Verknuepfung ins Cockpit: der Knopf zeigt dann direkt "CRM" statt
      // eine zweite Uebergabe anzubieten.
      const { error: bErr } = await supabaseServer
        .from("lead_bearbeitung")
        .upsert(
          { quelle: "report", quelle_id: leadId, onoffice_adresse_id: onofficeId, geaendert_am: new Date().toISOString() },
          { onConflict: "quelle,quelle_id" },
        );
      if (bErr) console.error("[report] lead_bearbeitung-Verknuepfung fehlgeschlagen:", bErr.message);
    } else if (!onofficeId) {
      console.warn("[report] automatische OnOffice-Uebergabe fehlgeschlagen (fail-soft, Lead bleibt im Cockpit).");
    }
  }

  // Observability: Zustellfehler in den Vercel-Logs sichtbar machen.
  if (customer.skipped) {
    console.warn("[report] Mailversand übersprungen — RESEND_API_KEY fehlt.");
  } else if (!customer.ok || !internal.ok) {
    console.error("[report] Resend-Fehler:", { customer: customer.error, internal: internal.error });
  }

  // Weder Mail zugestellt noch in der DB → ehrlich scheitern statt Lead verlieren.
  if (!customer.ok && !internal.ok && !logged) {
    console.error("[report] Lead weder gemailt noch gespeichert — 502.");
    return NextResponse.json({ ok: false, error: "persistence" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    delivered: customer.ok,
    internal: internal.ok,
    logged,
    skipped: customer.skipped ?? false,
  });
}

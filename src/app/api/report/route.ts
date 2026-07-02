import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { buildReportPdf } from "@/lib/report-pdf";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { estimateValue, type Objektart, type Zustand, type Qualitaet } from "@/lib/valuation";
import { fetchBodenrichtwert, isInRlpBbox } from "@/lib/boris";

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
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Zahl im Bereich [min, max] oder undefined (für Eingaben/Kennzahlen). */
const bounded = (v: unknown, min: number, max: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

const OBJEKTARTEN = new Set<Objektart>(["wohnung", "haus", "grundstueck", "gewerbe", "mehrfamilienhaus"]);
const ZUSTAENDE = new Set<Zustand>(["neuwertig", "gepflegt", "renovierungsbeduerftig"]);
const QUALITAETEN = new Set<Qualitaet>(["einfach", "normal", "gehoben", "luxus"]);

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

/**
 * Luftbild des Objekts als Base64-JPEG — Esri World Imagery (u. a. Maxar),
 * dieselbe Quelle wie die Satellitenkarte im Rechner, zentriert auf die
 * vom Nutzer eingegebenen Koordinaten. Fehlertolerant (null bei Problemen).
 */
async function fetchSatellite(lat: number | null, lng: number | null): Promise<string | null> {
  if (lat == null || lng == null) return null;
  const latRad = (lat * Math.PI) / 180;
  const dLon = 150 / (111320 * Math.cos(latRad)); // ~300 m breit
  const dLat = 90 / 110540; // ~180 m hoch (5:3)
  const bbox = `${lng - dLon},${lat - dLat},${lng + dLon},${lat + dLat}`;
  const url =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=3857&size=1200,720&format=jpg&f=image`;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null; // kein gültiges Bild
    return buf.toString("base64");
  } catch {
    return null;
  }
}

/** Bewertungs-Hero (große Zahl + Spanne) als email-sichere Tabelle. */
function valueHero(mid: number, low: number, high: number, perSqm: number | undefined) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#0f1117;border:1px solid #2a2a30;border-radius:12px;">
<tr><td style="padding:22px 24px;text-align:center;">
<div style="color:#7c7a75;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Geschätzter Marktwert</div>
<div style="color:#f4f3f0;font-size:40px;font-weight:800;letter-spacing:0.5px;margin:8px 0 4px;">${eur(mid)}</div>
<div style="color:#a8a6a0;font-size:14px;">Spanne ${eur(low)} – ${eur(high)}${perSqm ? ` · ${eur(perSqm)}/m²` : ""}</div>
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

  // Mehrfamilienhaus: Ertragswert-Ansatz statt Flächen-Rechnung — die
  // Jahresnettokaltmiete ist hier die Pflichtangabe (s. calculator.tsx).
  const jahresnettokaltmiete = bounded(b.jahresnettokaltmiete, 100, 20_000_000);
  const wohneinheiten = bounded(b.wohneinheiten, 1, 500);
  const gewerbeeinheiten = bounded(b.gewerbeeinheiten, 0, 200);
  if (objektart === "mehrfamilienhaus" && jahresnettokaltmiete == null) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  // Amtlichen Bodenrichtwert VOR der Nachrechnung laden (gleicher Cache wie
  // /api/bodenrichtwert) — Client und Server nutzen dadurch dieselbe Zahl,
  // PDF und Anzeige im Rechner widersprechen sich also nie. Fail-soft: bei
  // null (Timeout, außerhalb RLP, …) rechnet estimateValue mit dem Modellwert.
  // Dieselbe grobe RLP-Bbox wie /api/bodenrichtwert vorschalten, damit sich
  // über diese Route (Rate-Limit 6/10min, aber sonst ohne Bbox-Gate) nicht
  // der externe LVermGeo-Dienst mit beliebigen Koordinaten anstoßen lässt.
  const boris =
    lat != null && lng != null && isInRlpBbox(lat, lng) ? await fetchBodenrichtwert(lat, lng) : null;

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
      jahresnettokaltmiete,
      wohneinheiten,
      gewerbeeinheiten,
    },
    { bodenrichtwert: boris?.brw ?? undefined },
  );
  const { low, mid, high, pricePerSqm: perSqm, vervielfaeltiger } = calc;
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
    { label: "Wohnfläche", value: wohnflaeche ? `${wohnflaeche} m²` : "" },
    { label: "Grundstück", value: grundflaeche ? `${grundflaeche} m²` : "" },
    { label: "Zimmer", value: zimmer ? String(zimmer) : "" },
    { label: "Baujahr", value: baujahr ? String(baujahr) : "" },
    { label: "Zustand", value: esc(zustand) },
    { label: "Qualität", value: esc(qualitaet) },
    { label: "Energieklasse", value: esc(energieklasse) },
    { label: "Jahresnettokaltmiete", value: jahresnettokaltmiete ? `${eur(jahresnettokaltmiete)}/Jahr` : "" },
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

  const disclaimer = `<p style="margin:18px 0 0;color:#7c7a75;font-size:12px;line-height:1.6;">
Unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
Für einen belastbaren Verkaufspreis erstellt Riegel Immobilien eine kostenlose, ausführliche Bewertung vor Ort.</p>`;

  const ctaBtn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>
<td style="border-radius:999px;background:#015cff;"><a href="https://riegel-immobilien.de/termin" style="display:inline-block;padding:12px 26px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Vor-Ort-Bewertung vereinbaren</a></td>
</tr></table>`;

  // Luftbild des EINGEGEBENEN Objekts holen (Esri World Imagery, wie im Rechner).
  const satelliteB64 = await fetchSatellite(lat, lng);

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
      jahresnettokaltmiete,
      wohneinheiten,
      gewerbeeinheiten,
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
      },
      dateLabel: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()),
      bodenrichtwert: boris ? { brw: boris.brw, stichtag: boris.stichtag, zone: boris.zone } : undefined,
    });
  } catch (e) {
    console.error("[report] PDF-Erstellung fehlgeschlagen:", e);
  }

  const pdfName = `RIEGEL-Marktwert-Report${city ? `-${city}` : ""}.pdf`.replace(/\s+/g, "-");
  // Resend akzeptiert Buffer am zuverlässigsten (Base64-String kann je nach Version
  // doppelt kodiert werden) → als Buffer übergeben.
  const attachments = pdfBase64 ? [{ filename: pdfName, content: Buffer.from(pdfBase64, "base64") }] : undefined;

  // 1) Report an den Kunden (mit PDF im Anhang)
  const customer = await sendMail({
    to: email,
    replyTo: emailTargets.TO,
    subject: `Ihr Marktwert-Report${city ? ` · ${city}` : ""} — Riegel Immobilien`,
    attachments,
    html: emailLayout({
      heading: "Ihr persönlicher Marktwert-Report",
      intro: `Vielen Dank, ${esc(name.split(" ")[0]) || "und herzlich willkommen"}! Hier ist Ihre Sofort-Einschätzung${address ? ` für ${esc(address)}` : ""} — die vollständige Aufstellung finden Sie zusätzlich im angehängten PDF.`,
      bodyHtml:
        valueHero(mid, low, high, perSqm) +
        `<div style="color:#a8a6a0;font-size:13px;margin:0 0 4px;">Objektdaten</div>` + objektRows +
        `<div style="color:#a8a6a0;font-size:13px;margin:14px 0 4px;">Kennzahlen</div>` + kennzahlen +
        ctaBtn + disclaimer,
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
        `<div style="color:#a8a6a0;font-size:13px;margin:0 0 4px;">Objektdaten</div>` + objektRows +
        `<div style="color:#a8a6a0;font-size:13px;margin:14px 0 4px;">Kennzahlen</div>` + kennzahlen,
    }),
  });

  // 3) In Supabase protokollieren (Nachvollziehbarkeit)
  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("valuation_requests").insert({
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
    });
    if (error) console.error("[report] valuation_requests-Insert fehlgeschlagen:", error.message);
    logged = !error;
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

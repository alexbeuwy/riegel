import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { buildReportPdf } from "@/lib/report-pdf";
import { supabase } from "@/lib/supabase";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const eur = (n: unknown) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
};

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
};

/** Bewertungs-Hero (große Zahl + Spanne) als email-sichere Tabelle. */
function valueHero(mid: number, low: number, high: number, perSqm: number) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#0f1117;border:1px solid #2a2a30;border-radius:12px;">
<tr><td style="padding:22px 24px;text-align:center;">
<div style="color:#7c7a75;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Geschätzter Marktwert</div>
<div style="color:#f4f3f0;font-size:40px;font-weight:800;letter-spacing:0.5px;margin:8px 0 4px;">${eur(mid)}</div>
<div style="color:#a8a6a0;font-size:14px;">Spanne ${eur(low)} – ${eur(high)}${perSqm ? ` · ${eur(perSqm)}/m²` : ""}</div>
</td></tr></table>`;
}

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const name = esc(b.name).slice(0, 200);
  const email = esc(b.email).slice(0, 200);
  const phone = esc(b.phone).slice(0, 80);
  const message = esc(b.message).slice(0, 2000);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const address = esc(b.address).slice(0, 240);
  const city = esc(b.city).slice(0, 120);
  const postcode = esc(b.postcode).slice(0, 20);
  const objektart = esc(b.objektart).slice(0, 40);
  const objektartLabel = OBJEKTART_LABEL[String(b.objektart)] ?? objektart;

  const v = (b.valuation ?? {}) as Record<string, unknown>;
  const mid = num(v.mid) ?? 0;
  const low = num(v.low) ?? 0;
  const high = num(v.high) ?? 0;
  const perSqm = num(v.pricePerSqm) ?? 0;

  const objektRows = emailRows([
    { label: "Adresse", value: address },
    { label: "Objektart", value: objektartLabel },
    { label: "Wohnfläche", value: b.wohnflaeche ? `${esc(b.wohnflaeche)} m²` : "" },
    { label: "Grundstück", value: b.grundflaeche ? `${esc(b.grundflaeche)} m²` : "" },
    { label: "Zimmer", value: esc(b.zimmer) },
    { label: "Baujahr", value: esc(b.baujahr) },
    { label: "Zustand", value: esc(b.zustand) },
    { label: "Qualität", value: esc(b.qualitaet) },
    { label: "Energieklasse", value: esc(b.energieklasse) },
  ]);

  const kennzahlen = emailRows([
    { label: "Preis / m²", value: perSqm ? `${eur(perSqm)}` : "" },
    { label: "Vergleichsobjekte", value: v.comparables != null ? `${esc(v.comparables)}` : "" },
    { label: "Markttrend", value: v.trendPct != null ? `+${esc(v.trendPct)} % p.a.` : "" },
    { label: "Mikrolage", value: v.mikrolage != null ? `${esc(v.mikrolage)}/10` : "" },
    { label: "Konfidenz", value: v.confidence != null ? `${esc(v.confidence)} %` : "" },
  ]);

  const disclaimer = `<p style="margin:18px 0 0;color:#7c7a75;font-size:12px;line-height:1.6;">
Unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
Für einen belastbaren Verkaufspreis erstellt Riegel Immobilien eine kostenlose, ausführliche Bewertung vor Ort.</p>`;

  const ctaBtn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>
<td style="border-radius:999px;background:#015cff;"><a href="https://riegel-immobilien.de/termin" style="display:inline-block;padding:12px 26px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Vor-Ort-Bewertung vereinbaren</a></td>
</tr></table>`;

  // Luftbild des EINGEGEBENEN Objekts holen (Esri World Imagery, wie im Rechner).
  const satelliteB64 = await fetchSatellite(num(b.lat), num(b.lng));

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
      wohnflaeche: b.wohnflaeche as string | number | undefined,
      grundflaeche: b.grundflaeche as string | number | undefined,
      zimmer: b.zimmer as string | number | undefined,
      baujahr: b.baujahr as string | number | undefined,
      zustand: String(b.zustand ?? ""),
      qualitaet: String(b.qualitaet ?? ""),
      energieklasse: String(b.energieklasse ?? ""),
      value: {
        low,
        mid,
        high,
        pricePerSqm: perSqm,
        comparables: num(v.comparables) ?? undefined,
        trendPct: num(v.trendPct) ?? undefined,
        mikrolage: num(v.mikrolage) ?? undefined,
        confidence: num(v.confidence) ?? undefined,
      },
      dateLabel: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()),
    });
  } catch (e) {
    console.error("[report] PDF-Erstellung fehlgeschlagen:", e);
  }

  const pdfName = `RIEGEL-Marktwert-Report${city ? `-${city}` : ""}.pdf`.replace(/\s+/g, "-");
  const attachments = pdfBase64 ? [{ filename: pdfName, content: pdfBase64 }] : undefined;

  // 1) Report an den Kunden (mit PDF im Anhang)
  const customer = await sendMail({
    to: email,
    replyTo: emailTargets.TO,
    subject: `Ihr Marktwert-Report${city ? ` · ${city}` : ""} — Riegel Immobilien`,
    attachments,
    html: emailLayout({
      heading: "Ihr persönlicher Marktwert-Report",
      intro: `Vielen Dank, ${name.split(" ")[0] || "und herzlich willkommen"}! Hier ist Ihre Sofort-Einschätzung${address ? ` für ${address}` : ""} — die vollständige Aufstellung finden Sie zusätzlich im angehängten PDF.`,
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
          { label: "Name", value: name },
          { label: "E-Mail", value: email },
          { label: "Telefon", value: phone },
          { label: "Nachricht", value: message },
        ]) +
        valueHero(mid, low, high, perSqm) +
        `<div style="color:#a8a6a0;font-size:13px;margin:0 0 4px;">Objektdaten</div>` + objektRows +
        `<div style="color:#a8a6a0;font-size:13px;margin:14px 0 4px;">Kennzahlen</div>` + kennzahlen,
    }),
  });

  // 3) In Supabase protokollieren (Nachvollziehbarkeit) — fehlertolerant
  let logged = false;
  if (supabase) {
    try {
      const { error } = await supabase.from("valuation_requests").insert({
        address: address || null,
        city: city || null,
        postcode: postcode || null,
        lat: num(b.lat),
        lng: num(b.lng),
        objektart: objektart || null,
        wohnflaeche: num(b.wohnflaeche),
        grundflaeche: num(b.grundflaeche),
        zimmer: num(b.zimmer),
        baujahr: num(b.baujahr),
        zustand: String(b.zustand ?? "") || null,
        qualitaet: String(b.qualitaet ?? "") || null,
        value_low: low || null,
        value_mid: mid || null,
        value_high: high || null,
        price_per_sqm: perSqm || null,
        confidence: num(v.confidence),
        report_requested: true,
        name,
        email,
        phone: phone || null,
        message: message || null,
      });
      logged = !error;
    } catch {
      logged = false;
    }
  }

  // Observability: Zustellfehler in den Vercel-Logs sichtbar machen.
  if (customer.skipped) {
    console.warn("[report] Mailversand übersprungen — RESEND_API_KEY fehlt.");
  } else if (!customer.ok || !internal.ok) {
    console.error("[report] Resend-Fehler:", { customer: customer.error, internal: internal.error });
  }

  return NextResponse.json({
    ok: true,
    delivered: customer.ok,
    internal: internal.ok,
    logged,
    skipped: customer.skipped ?? false,
  });
}

import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

/**
 * Dev-/Redaktions-Werkzeug: rendert die transaktionalen RIEGEL-Mails im
 * Browser, OHNE zu versenden (kein Resend-Aufruf) — so lässt sich das
 * Corporate Design der Mails (Logo, Superheadline, RIEGEL-Blau) abnehmen,
 * bevor irgendwo echt versendet wird.
 *
 * GET /api/mail-preview?type=<contact|confirm|booking|inquiry|report>
 *   → gerenderte Beispiel-Mail als HTML (Beispiel-Objekt "Stadtvilla Speyer",
 *     Beispiel-Interessentin "Julia Beispiel"). Ohne/unbekannten type →
 *     Übersichtsseite mit Links zu allen Varianten.
 * GET /api/mail-preview?type=<…>&send=1&to=<email>
 *   → versendet dieselbe Vorschau testweise über sendMail(). Lokal fehlt der
 *     RESEND_API_KEY → sendMail() liefert {skipped:true} und wir geben das
 *     als klare JSON-Antwort zurück (kein stiller No-Op). Mit gesetztem Key
 *     (z. B. später beim Orchestrator) geht die Mail wirklich raus — daher
 *     eigenes, strenges Rate-Limit auf diesem Pfad.
 *
 * Bewusst ohne Passwort-Gate (siehe admin-auth.ts/"/intern"-Konvention): es
 * werden nur Beispieldaten gerendert, nie echte Kundendaten. Trotzdem per
 * X-Robots-Tag von der Indexierung ausgeschlossen (robots.ts sperrt /api/
 * ohnehin schon komplett für Crawler — das hier ist zusätzliche Absicherung).
 */

// Gleiche Escape-Konvention wie contact/booking/report — auch bei fest
// verdrahteten Beispieldaten, damit die Vorschau den echten Aufruf spiegelt.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// Beispiel-Objekt & Beispiel-Interessentin — rein fiktiv, für die Vorschau.
const OBJ = {
  titel: "Stadtvilla Speyer",
  adresse: "Wormser Straße 42, 67346 Speyer",
  objektart: "Haus",
  wohnflaeche: 210,
  grundflaeche: 480,
  zimmer: 7,
  baujahr: 1998,
  zustand: "gepflegt",
  qualitaet: "gehoben",
  energieklasse: "C",
  slug: "stadtvilla-speyer",
};
const LEAD = {
  name: "Julia Beispiel",
  email: "julia.beispiel@example.com",
  phone: "0176 12345678",
  message:
    "Ich interessiere mich für die Stadtvilla und würde gerne einen Besichtigungstermin vereinbaren. Wäre nächste Woche etwas frei?",
};
const VALUE = { low: 615_000, mid: 665_000, high: 715_000, perSqm: 3167 };

/** Baut EIN Vorschau-Variante (Subject + HTML) — Struktur je Typ wie im echten Aufrufer. */
function buildVariant(type: string): { subject: string; html: string } | null {
  switch (type) {
    // Spiegelt api/contact/route.ts, Mail 1 (Benachrichtigung an RIEGEL).
    case "contact":
      return {
        subject: `Neue Anfrage: Verkauf — ${LEAD.name}`,
        html: emailLayout({
          heading: "Neue Kontaktanfrage",
          intro: "Über das Kontaktformular ist eine neue Anfrage eingegangen.",
          bodyHtml:
            emailRows([
              { label: "Name", value: esc(LEAD.name) },
              { label: "E-Mail", value: esc(LEAD.email) },
              { label: "Telefon", value: esc(LEAD.phone) },
              { label: "Anliegen", value: "Verkauf" },
            ]) +
            `<p style="margin:14px 0 6px;color:#6b7590;font-size:13px;">Nachricht</p><p style="margin:0;color:#141724;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(LEAD.message)}</p>`,
        }),
      };

    // Spiegelt api/contact/route.ts, Mail 2 (Bestätigung an den Absender).
    case "confirm":
      return {
        subject: "Ihre Anfrage bei RIEGEL Immobilien",
        html: emailLayout({
          heading: `Danke, ${esc(LEAD.name.split(" ")[0])}!`,
          intro:
            "Ihre Nachricht ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktages. Bei dringenden Anliegen erreichen Sie uns unter 06232 100 10 10.",
          bodyHtml: `<p style="margin:8px 0 6px;color:#6b7590;font-size:13px;">Ihre Nachricht</p><p style="margin:0;color:#5a6072;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(LEAD.message)}</p>`,
        }),
      };

    // Spiegelt api/booking/route.ts, Mail 1 (Benachrichtigung an RIEGEL).
    case "booking": {
      const rows = emailRows([
        { label: "Anlass", value: "Besichtigung" },
        { label: "Art", value: "Vor Ort" },
        { label: "Ort", value: esc(OBJ.adresse) },
        { label: "Datum", value: "2026-07-17" },
        { label: "Uhrzeit", value: "15:30 Uhr · 45 Min." },
        { label: "Name", value: esc(LEAD.name) },
        { label: "E-Mail", value: esc(LEAD.email) },
        { label: "Telefon", value: esc(LEAD.phone) },
        { label: "Nachricht", value: esc(LEAD.message) },
      ]);
      return {
        subject: `Terminanfrage: Besichtigung am 2026-07-17 15:30 — ${LEAD.name}`,
        html: emailLayout({
          heading: "Neue Terminanfrage",
          intro: "Über das Buchungstool wurde ein Wunschtermin angefragt.",
          bodyHtml: rows,
        }),
      };
    }

    // NEU: Demonstriert den bulletproof CTA-Button (ctaLabel/ctaHref) am
    // Beispiel einer Objekt-Anfrage — es gibt (noch) keine reale Route dafür,
    // die eigentlichen Aufrufer (contact/booking/report) nutzen bewusst
    // weiter ihre bisherige, unveränderte Struktur.
    case "inquiry":
      return {
        subject: `Objektanfrage: ${OBJ.titel} — ${LEAD.name}`,
        html: emailLayout({
          heading: `Anfrage zu ${OBJ.titel}`,
          intro: `${esc(LEAD.name)} interessiert sich für dieses Objekt und möchte gerne einen Besichtigungstermin vereinbaren.`,
          bodyHtml: emailRows([
            { label: "Objekt", value: esc(OBJ.titel) },
            { label: "Adresse", value: esc(OBJ.adresse) },
            { label: "Wohnfläche", value: `${OBJ.wohnflaeche} m²` },
            { label: "Zimmer", value: String(OBJ.zimmer) },
            { label: "Angebotspreis", value: eur(VALUE.mid) },
            { label: "Interessent:in", value: esc(LEAD.name) },
            { label: "E-Mail", value: esc(LEAD.email) },
            { label: "Telefon", value: esc(LEAD.phone) },
          ]),
          ctaLabel: "Besichtigungstermin anfragen",
          ctaHref: `${site.url}/immobilien/${OBJ.slug}`,
        }),
      };

    // Spiegelt api/report/route.ts (Kunden-Mail): Wert-Hero + Objektdaten +
    // Kennzahlen + CTA + Disclaimer — hier ohne PDF-Anhang (reine HTML-Vorschau).
    case "report": {
      const valueHero = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#eef3ff;border:1px solid #dbe5fa;border-radius:16px;">
<tr><td style="padding:22px 24px;text-align:center;">
<div style="color:#6b7590;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Geschätzter Marktwert</div>
<div style="color:#015cff;font-size:40px;font-weight:800;letter-spacing:0.5px;margin:8px 0 4px;">${eur(VALUE.mid)}</div>
<div style="color:#5a6072;font-size:14px;">Spanne ${eur(VALUE.low)} – ${eur(VALUE.high)} · ${eur(VALUE.perSqm)}/m²</div>
</td></tr></table>`;
      const objektRows = emailRows([
        { label: "Adresse", value: esc(OBJ.adresse) },
        { label: "Objektart", value: esc(OBJ.objektart) },
        { label: "Wohnfläche", value: `${OBJ.wohnflaeche} m²` },
        { label: "Grundstück", value: `${OBJ.grundflaeche} m²` },
        { label: "Zimmer", value: String(OBJ.zimmer) },
        { label: "Baujahr", value: String(OBJ.baujahr) },
        { label: "Zustand", value: esc(OBJ.zustand) },
        { label: "Qualität", value: esc(OBJ.qualitaet) },
        { label: "Energieklasse", value: esc(OBJ.energieklasse) },
      ]);
      const kennzahlen = emailRows([
        { label: "Preis / m²", value: eur(VALUE.perSqm) },
        { label: "Vergleichsobjekte", value: "14" },
        { label: "Markttrend", value: "+3,2 % p.a." },
        { label: "Mikrolage", value: "8,4/10" },
        { label: "Konfidenz", value: "86 %" },
      ]);
      const disclaimer = `<p style="margin:18px 0 0;color:#6b7590;font-size:12px;line-height:1.6;">
Unverbindliche, datenbasierte Sofort-Einschätzung — kein Verkehrswertgutachten i. S. d. § 194 BauGB.
Für einen belastbaren Verkaufspreis erstellt RIEGEL Immobilien eine kostenlose, ausführliche Bewertung vor Ort.</p>`;
      return {
        subject: `Ihr Marktwert-Report · Speyer — RIEGEL Immobilien`,
        html: emailLayout({
          heading: "Ihr persönlicher Marktwert-Report",
          intro: `Vielen Dank, ${esc(LEAD.name.split(" ")[0])}! Hier ist Ihre Sofort-Einschätzung für ${esc(OBJ.adresse)} — die vollständige Aufstellung finden Sie zusätzlich im angehängten PDF.`,
          bodyHtml:
            valueHero +
            `<div style="color:#6b7590;font-size:13px;margin:0 0 4px;">Objektdaten</div>` + objektRows +
            `<div style="color:#6b7590;font-size:13px;margin:14px 0 4px;">Kennzahlen</div>` + kennzahlen +
            disclaimer,
          ctaLabel: "Vor-Ort-Bewertung vereinbaren",
          ctaHref: `${site.url}/rechner`,
        }),
      };
    }

    default:
      return null;
  }
}

const TYPES = ["contact", "confirm", "booking", "inquiry", "report"] as const;
const TYPE_LABEL: Record<(typeof TYPES)[number], string> = {
  contact: "Kontaktformular · Benachrichtigung an RIEGEL",
  confirm: "Kontaktformular · Bestätigung an den Absender",
  booking: "Terminbuchung · Benachrichtigung an RIEGEL",
  inquiry: "Objektanfrage · Kunden-Mail mit CTA-Button (neu)",
  report: "Marktwert-Report · Kunden-Mail (Wert-Hero, Kennzahlen, CTA)",
};

/** Übersichtsseite, wenn kein/unbekannter type angegeben ist. */
function overviewHtml(): string {
  const links = TYPES.map(
    (t) =>
      `<li style="margin:0 0 10px;"><a href="/api/mail-preview?type=${t}" style="color:#5b9bff;text-decoration:none;font-weight:600;">${t}</a><span style="color:#8a8a90;"> — ${TYPE_LABEL[t]}</span></li>`,
  ).join("");
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>RIEGEL — Mail-Vorschau</title></head>
<body style="margin:0;padding:40px 20px;background:#0b0b0d;color:#f4f3f0;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;">
<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Mail-Vorschau</h1>
<p style="margin:0 0 24px;color:#a8a6a0;font-size:14px;line-height:1.6;">Rendert transaktionale RIEGEL-Mails mit Beispieldaten, ohne zu versenden. Wähle eine Variante:</p>
<ul style="margin:0 0 28px;padding:0;list-style:none;font-size:14px;">${links}</ul>
<p style="margin:0;color:#7c7a75;font-size:12px;line-height:1.6;">Test-Versand: <code style="color:#a8a6a0;">?type=&lt;variante&gt;&amp;send=1&amp;to=deine@adresse.de</code> — ruft <code style="color:#a8a6a0;">sendMail()</code> wirklich auf (rate-limitiert). Ohne RESEND_API_KEY liefert das eine klare JSON-Antwort statt eines echten Versands.</p>
</div>
</body></html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const send = url.searchParams.get("send") === "1";
  const to = url.searchParams.get("to") ?? "";

  const variant = buildVariant(type);

  // Test-Versand-Pfad: ruft sendMail() wirklich auf — eigenes, strengeres
  // Rate-Limit, weil hier (mit gesetztem RESEND_API_KEY) tatsächlich Mails
  // rausgehen könnten, anders als beim reinen HTML-Rendern oben.
  if (send) {
    if (!rateLimit(`mail-preview-send:${clientIp(req)}`, 3, 10 * 60_000)) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    if (!variant) {
      return NextResponse.json(
        { ok: false, error: `Unbekannter type. Erlaubt: ${TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ ok: false, error: "Ungültige oder fehlende ?to=<email>." }, { status: 422 });
    }

    const result = await sendMail({ to, subject: `[Vorschau] ${variant.subject}`, html: variant.html });

    if (result.skipped) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        message: "RESEND_API_KEY fehlt — nichts gesendet. Mit gesetztem Key sendet dieser Pfad echt.",
      });
    }
    return NextResponse.json({ ok: result.ok, error: result.error, from: emailTargets.FROM, to });
  }

  const html = variant ? variant.html : overviewHtml();
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Reine Beispiel-Mails, aber trotzdem nicht für Suchmaschinen gedacht.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

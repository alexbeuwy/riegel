import { Resend } from "resend";
import { site } from "./site";

/**
 * Transaktions-E-Mails via Resend (serverseitig). Aktiv, sobald RESEND_API_KEY
 * gesetzt ist. Ohne Key wird nichts versendet (kein Crash) — Daten bleiben dann
 * nur lokal. FROM/TO über Env überschreibbar.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM = process.env.EMAIL_FROM || "RIEGEL Immobilien <onboarding@resend.dev>";
const TO = process.env.EMAIL_TO || "info@riegel-immobilien.de";

// Absolute Basis-URL für Assets in Mails — E-Mail-Clients laden nie relative
// Pfade, das Logo bräuchte sonst eine volle URL pro Client-Render. site.ts hat
// bereits die kanonische Produktions-Domain (site.url) — die nutzen wir als
// Fallback, bevor wir "irgendeine" Vercel-URL erfinden.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || site.url;
// PNG statt SVG: SVG rendert in Gmail/Outlook unzuverlässig. Das PNG enthält
// Marke + „RIEGEL IMMOBILIEN"-Schriftzug (weiß, transparent) — passt auf die
// dunkle Mail-Karte. Absolute URL nötig (E-Mail hat keinen Origin-Kontext).
const LOGO_URL = `${SITE_URL}/email-logo-riegel.png`;

/**
 * E-Mail-Realität, die dieses Layout berücksichtigt (bitte beim Ändern im Kopf
 * behalten):
 *
 * 1) Custom-Fonts (Akira, Webfonts allgemein) werden in den meisten Mail-
 *    Clients (Gmail, Outlook, viele mobile Clients) beim Rendern GESTRIPPT —
 *    @font-face/<link>-Fonts sind in HTML-Mails unzuverlässig bis wirkungslos.
 *    Der markenkonforme, e-mail-sichere Ersatz für den Akira-"Superheadline"-
 *    Look: eine große, fette, GROSSBUCHSTABEN-Headline mit Letter-Spacing in
 *    Helvetica/Arial Bold (System-Font, überall verfügbar).
 * 2) SVG-Bilder werden von Outlook Desktop (Win32, Word-Rendering-Engine)
 *    GAR NICHT dargestellt — nicht "manchmal", sondern grundsätzlich nicht.
 *    Zusätzlich blocken viele Clients (Gmail, Outlook.com) extern verlinkte
 *    Bilder standardmäßig, bis der Empfänger sie freigibt. Ein <img alt="…">
 *    reicht daher NICHT als Fallback: manche Clients zeigen bei blockiertem/
 *    gebrochenem Bild ein hässliches Broken-Image-Icon + alt-Text, der sich
 *    mit eigenem Markup überlappt (in Chrome selbst beobachtet, als die
 *    Produktions-Domain aus site.ts das Logo noch nicht auslieferte).
 *    Robuste Lösung hier: Logo als rein dekoratives <img alt=""> (für
 *    Outlook per MSO-Kommentar komplett ausgeblendet, da dort ohnehin nie
 *    darstellbar), PLUS ein immer sichtbarer Text-Wordmark ("RIEGEL
 *    IMMOBILIEN") als echtes HTML direkt darunter — unabhängig vom
 *    Bild-Ladezustand. So wirkt die Mail nie "leer", auch ganz ohne Bilder,
 *    und nie doppelt/kaputt, wenn das Bild fehlschlägt.
 */

/**
 * Bulletproof CTA-Button: kein reiner `<a style="background:…">`-Button (den
 * ignoriert Outlook Desktop teils, v. a. bei abgerundeten Ecken), sondern das
 * Standard-E-Mail-Pattern aus Tabelle + MSO-VML-Roundrect-Fallback für Outlook
 * und einem echten `<a>` für alle anderen Clients (Gmail, Apple Mail, mobil).
 */
function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td>
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="#015cff">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" style="background:#015cff;border-radius:999px;color:#ffffff;display:inline-block;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;line-height:46px;padding:0 28px;text-align:center;text-decoration:none;-webkit-text-size-adjust:none;">${label}</a>
<!--<![endif]-->
</td></tr></table>`;
}

/**
 * Dark, markenkonformer RIEGEL-Mail-Rahmen (email-safe, Inline-Styles).
 *
 * Neue Parameter (optional, Default-Verhalten für bestehende Aufrufer aus
 * booking/contact/report unverändert):
 * - ctaLabel/ctaHref: rendert einen blauen Bulletproof-Button unter bodyHtml.
 */
export function emailLayout(opts: {
  heading: string;
  intro?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const cta = opts.ctaLabel && opts.ctaHref ? ctaButton(opts.ctaLabel, opts.ctaHref) : "";
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head>
<body style="margin:0;padding:0;background:#0b0b0d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141417;border:1px solid #2a2a30;border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
<tr><td style="padding:28px 32px 0;">
<!--[if !mso]><!-->
<!-- Echtes Logo-PNG; alt trägt den Markennamen, falls Bilder blockiert sind. -->
<img src="${LOGO_URL}" width="240" alt="RIEGEL Immobilien" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:240px;max-width:70%;margin:0;">
<!--<![endif]-->
<!--[if mso]>
<div style="color:#f4f3f0;font-size:17px;font-weight:800;letter-spacing:3px;line-height:1;">RIEGEL<span style="color:#8a8f99;font-weight:400;">&nbsp;IMMOBILIEN</span></div>
<![endif]-->
</td></tr>
<tr><td style="padding:14px 32px 24px;border-bottom:1px solid #2a2a30;"><div style="width:56px;height:4px;line-height:4px;font-size:0;background:#015cff;border-radius:2px;">&nbsp;</div></td></tr>
<tr><td style="padding:34px 32px 8px;"><h1 style="margin:0 0 14px;color:#f4f3f0;font-size:30px;font-weight:800;line-height:1.25;text-transform:uppercase;letter-spacing:1px;">${opts.heading}</h1>${
    opts.intro ? `<p style="margin:0 0 18px;color:#a8a6a0;font-size:15px;line-height:1.6;">${opts.intro}</p>` : ""
  }${opts.bodyHtml ?? ""}${cta}</td></tr>
<tr><td style="padding:22px 32px;border-top:1px solid #2a2a30;"><p style="margin:0;color:#7c7a75;font-size:12px;line-height:1.6;">Riegel Immobilien &middot; Wormser Stra&szlig;e 13, 67346 Speyer &middot; 06232 100 10 10</p></td></tr>
</table></td></tr></table></body></html>`;
}

/** Label/Wert-Zeilen als Tabelle. */
export function emailRows(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 8px;">${rows
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #2a2a30;color:#7c7a75;font-size:13px;width:38%;vertical-align:top;">${r.label}</td><td style="padding:7px 0;border-bottom:1px solid #2a2a30;color:#f4f3f0;font-size:14px;">${r.value}</td></tr>`,
    )
    .join("")}</table>`;
}

export async function sendMail(opts: {
  to?: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string | Buffer }[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!resend) return { ok: false, skipped: true };
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to || TO,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    });
    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export const emailTargets = { FROM, TO, SITE_URL };

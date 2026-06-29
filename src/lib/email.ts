import { Resend } from "resend";

/**
 * Transaktions-E-Mails via Resend (serverseitig). Aktiv, sobald RESEND_API_KEY
 * gesetzt ist. Ohne Key wird nichts versendet (kein Crash) — Daten bleiben dann
 * nur lokal. FROM/TO über Env überschreibbar.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export const emailEnabled = Boolean(resend);

const FROM = process.env.EMAIL_FROM || "RIEGEL Immobilien <onboarding@resend.dev>";
const TO = process.env.EMAIL_TO || "info@riegel-immobilien.de";

/** Dark, markenkonformer RIEGEL-Mail-Rahmen (email-safe, Inline-Styles). */
export function emailLayout(opts: { heading: string; intro?: string; bodyHtml?: string }): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;padding:0;background:#0b0b0d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141417;border:1px solid #2a2a30;border-radius:16px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
<tr><td style="padding:26px 32px;border-bottom:1px solid #2a2a30;"><span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:3px;">RIEGEL</span><span style="color:#a8a6a0;font-size:18px;letter-spacing:3px;">&nbsp;IMMOBILIEN</span></td></tr>
<tr><td style="padding:34px 32px 8px;"><h1 style="margin:0 0 12px;color:#f4f3f0;font-size:22px;font-weight:700;line-height:1.3;">${opts.heading}</h1>${
    opts.intro ? `<p style="margin:0 0 18px;color:#a8a6a0;font-size:15px;line-height:1.6;">${opts.intro}</p>` : ""
  }${opts.bodyHtml ?? ""}</td></tr>
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
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!resend) return { ok: false, skipped: true };
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to || TO,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export const emailTargets = { FROM, TO };

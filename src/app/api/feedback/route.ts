import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Nur beim HTML-Rendern escapen — DB bekommt Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

/**
 * „Auf der Seite kommentieren" (feedback-widget.tsx, nur fürs Team sichtbar).
 * Persistiert best effort in Supabase UND schickt immer eine interne Mail —
 * beides darf unabhängig voneinander fehlschlagen, ohne dass Sissys Kommentar
 * verloren geht oder die Route wegen fehlender Infra mit 500 antwortet.
 */
export async function POST(req: Request) {
  if (!rateLimit(`feedback:${clientIp(req)}`, 30, 60 * 60_000)) {
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
    return NextResponse.json({ ok: true, logged: false, delivered: false, skipped: true });
  }

  const comment = clean(b.comment, 4000);
  const pageUrl = clean(b.pageUrl, 500);
  const area = clean(b.area, 500);

  if (!comment) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const path = pageUrl || "/";
  // ASSET_BASE (riegel.vercel.app) statt SITE_URL (riegel-immobilien.de) —
  // SITE_URL liefert laut email.ts aktuell 404, der Link in der Mail muss
  // aber tatsächlich anklickbar sein.
  const ctaHref = `${emailTargets.ASSET_BASE.replace(/\/$/, "")}${path}`;
  // Seiten-Kommentare gehen an Alex, Sissy im CC (per Env überschreibbar).
  const to = process.env.FEEDBACK_TO || "alex@beuwy.com";
  const cc = process.env.FEEDBACK_CC || "sissy.riegel@riegel-immobilien.de";

  const internal = await sendMail({
    to,
    cc,
    subject: "Neuer Seiten-Kommentar",
    html: emailLayout({
      heading: "Neuer Seiten-Kommentar",
      intro: "Über das Feedback-Widget auf der Live-Seite ist ein Kommentar eingegangen.",
      bodyHtml:
        emailRows([
          { label: "Seite", value: esc(path) },
          { label: "Stelle", value: area ? esc(area) : "Allgemein (keine Stelle ausgewählt)" },
          { label: "Zeit", value: esc(new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })) },
        ]) +
        `<p style="margin:14px 0 6px;color:#6b7590;font-size:13px;">Kommentar</p><p style="margin:0;color:#141724;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(comment)}</p>`,
      ctaLabel: "Seite öffnen",
      ctaHref,
    }),
  });

  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("feedback").insert({
      page_url: path,
      comment,
      area: area || null,
      user_agent: clean(req.headers.get("user-agent"), 300) || null,
    });
    if (error) console.error("[feedback] Insert fehlgeschlagen:", error.message);
    logged = !error;
  }

  return NextResponse.json({ ok: true, logged, delivered: internal.ok });
}

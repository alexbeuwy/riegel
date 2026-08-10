import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { encodeFeedbackLocator, FEEDBACK_PARAM } from "@/lib/feedback-locator";

// Nur beim HTML-Rendern escapen — DB bekommt Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

/**
 * Nutzergelieferte `pageUrl` auf einen SICHEREN, gleich-origin Pfad einengen,
 * bevor sie in den Mail-CTA-`href` eingesetzt wird (Sicherheits-Audit 08/2026).
 * Ohne diese Prüfung war die unauth. Feedback-Route zweifach angreifbar:
 *   - HTML-/Attribut-Injection: ein `"` in pageUrl brach aus dem href-Attribut
 *     der internen Mail aus (`href="${href}"` in ctaButton) → beliebiges HTML
 *     im Postfach von Alex/Sissy.
 *   - Open Redirect/Phishing: `@boese.tld/x` ergab
 *     `https://riegel-immobilien.de@boese.tld/x` → der „Seite öffnen"-Link zeigte
 *     auf eine Fremddomain.
 * Regeln (analog zur next-Prüfung in konto/page.tsx): genau ein führender „/",
 * kein „//" (protokoll-relativ), keine Zeichen, die aus dem Attribut ausbrechen
 * oder den Host verbiegen. Alles andere → „/".
 */
function safePath(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return "/";
  if (/[\s"'<>`\\]/.test(s)) return "/";
  return s.slice(0, 500);
}

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
  // Strukturierter Locator (optional, nur wenn eine Stelle gewählt wurde) —
  // baut den Deep-Link, der auf der Live-Seite direkt zur Stelle scrollt,
  // sie rot markiert und einen Claude-Code-Prompt anbietet.
  const locRaw = (b.loc ?? null) as { text?: unknown; path?: unknown; y?: unknown; x?: unknown } | null;
  const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v)) || 0));
  const loc =
    locRaw && typeof locRaw === "object"
      ? {
          text: clean(locRaw.text, 120),
          path: clean(locRaw.path, 240),
          y: pct(locRaw.y),
          x: pct(locRaw.x),
        }
      : null;

  if (!comment) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const path = safePath(pageUrl);
  // SITE_URL (aus site.url, riegel-immobilien.de) statt ASSET_BASE: die
  // kanonische Domain ist erreichbar, der "Seite öffnen"-Link soll auf die
  // echte Produktionsseite zeigen und nicht auf die Vorschau-Domain.
  const base = emailTargets.SITE_URL.replace(/\/$/, "");
  let ctaHref = `${base}${path}`;
  if (loc) {
    const fb = encodeFeedbackLocator({ y: loc.y, x: loc.x, text: loc.text, path: loc.path, comment });
    // URL sauber zusammensetzen (path kann bereits eine Query enthalten).
    const u = new URL(ctaHref);
    u.searchParams.set(FEEDBACK_PARAM, fb);
    ctaHref = u.toString();
  }
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

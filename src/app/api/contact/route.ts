import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Nur beim HTML-Rendern escapen — DB, replyTo & PDF bekommen Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) {
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
  const topic = clean(b.topic, 120);
  const message = clean(b.message, 5000);

  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  // 1) Benachrichtigung an Riegel
  const internal = await sendMail({
    subject: `Neue Anfrage: ${topic || "Kontakt"} — ${name}`,
    replyTo: email,
    html: emailLayout({
      heading: "Neue Kontaktanfrage",
      intro: "Über das Kontaktformular ist eine neue Anfrage eingegangen.",
      bodyHtml:
        emailRows([
          { label: "Name", value: esc(name) },
          { label: "E-Mail", value: esc(email) },
          { label: "Telefon", value: esc(phone) },
          { label: "Anliegen", value: esc(topic) },
        ]) +
        `<p style="margin:14px 0 6px;color:#7c7a75;font-size:13px;">Nachricht</p><p style="margin:0;color:#f4f3f0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`,
    }),
  });

  // 2) Bestätigung an den Absender (best effort)
  await sendMail({
    to: email,
    subject: "Ihre Anfrage bei Riegel Immobilien",
    html: emailLayout({
      heading: `Danke, ${esc(name.split(" ")[0]) || "schön"}!`,
      intro:
        "Ihre Nachricht ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktages. Bei dringenden Anliegen erreichen Sie uns unter 06232 100 10 10.",
      bodyHtml: message
        ? `<p style="margin:8px 0 6px;color:#7c7a75;font-size:13px;">Ihre Nachricht</p><p style="margin:0;color:#a8a6a0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`
        : "",
    }),
  });

  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("leads").insert({
      kind: "contact",
      name,
      email,
      phone: phone || null,
      subject: topic || "Kontakt",
      message: message || null,
    });
    if (error) console.error("[contact] leads-Insert fehlgeschlagen:", error.message);
    logged = !error;
  }

  // Weder Mail zugestellt noch in der DB → ehrlich scheitern statt Lead verlieren.
  if (!internal.ok && !logged) {
    console.error("[contact] Lead weder gemailt noch gespeichert — 502.");
    return NextResponse.json({ ok: false, error: "persistence" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: internal.ok, logged, skipped: internal.skipped ?? false });
}

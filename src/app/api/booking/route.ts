import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Nur beim HTML-Rendern escapen — DB & replyTo bekommen Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  if (!rateLimit(`booking:${clientIp(req)}`, 5, 10 * 60_000)) {
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

  const type = clean(b.type, 120);
  const mode = clean(b.mode, 60);
  const location = clean(b.location, 160);
  const duration = clean(b.duration, 10);
  const date = clean(b.date, 40);
  const time = clean(b.time, 20);
  const name = clean(b.name, 200);
  const email = clean(b.email, 200);
  const phone = clean(b.phone, 80);
  const messageTxt = clean(b.message, 2000);

  if (
    !name ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  ) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const rows = emailRows([
    { label: "Anlass", value: esc(type) },
    { label: "Art", value: esc(mode) },
    { label: "Ort", value: esc(location) },
    { label: "Datum", value: esc(date) },
    { label: "Uhrzeit", value: `${esc(time)} Uhr${duration ? ` · ${esc(duration)} Min.` : ""}` },
    { label: "Name", value: esc(name) },
    { label: "E-Mail", value: esc(email) },
    { label: "Telefon", value: esc(phone) },
    { label: "Nachricht", value: esc(messageTxt) },
  ]);

  const internal = await sendMail({
    subject: `Terminanfrage: ${type || "Termin"} am ${date} ${time} — ${name}`,
    replyTo: email,
    html: emailLayout({
      heading: "Neue Terminanfrage",
      intro: "Über das Buchungstool wurde ein Wunschtermin angefragt.",
      bodyHtml: rows,
    }),
  });

  await sendMail({
    to: email,
    subject: "Ihr Wunschtermin bei Riegel Immobilien",
    html: emailLayout({
      heading: "Terminanfrage erhalten",
      intro: `Vielen Dank! Wir bestätigen Ihren Wunschtermin (${esc(type) || "Termin"} am ${esc(date)} um ${esc(time)} Uhr) in Kürze persönlich.`,
      bodyHtml: rows,
    }),
  });

  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("leads").insert({
      kind: "booking",
      name,
      email,
      phone: phone || null,
      subject: `${type || "Termin"} · ${mode}`,
      message: messageTxt || null,
      detail: { type, mode, location, duration, date, time },
    });
    if (error) console.error("[booking] leads-Insert fehlgeschlagen:", error.message);
    logged = !error;
  }

  // Weder Mail zugestellt noch in der DB → ehrlich scheitern statt Lead verlieren.
  if (!internal.ok && !logged) {
    console.error("[booking] Lead weder gemailt noch gespeichert — 502.");
    return NextResponse.json({ ok: false, error: "persistence" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: internal.ok, logged, skipped: internal.skipped ?? false });
}

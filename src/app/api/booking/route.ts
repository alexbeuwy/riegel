import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows } from "@/lib/email";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const type = esc(b.type).slice(0, 120);
  const mode = esc(b.mode).slice(0, 60);
  const location = esc(b.location).slice(0, 160);
  const duration = esc(b.duration).slice(0, 10);
  const date = esc(b.date).slice(0, 40);
  const time = esc(b.time).slice(0, 20);
  const name = esc(b.name).slice(0, 200);
  const email = esc(b.email).slice(0, 200);
  const phone = esc(b.phone).slice(0, 80);
  const messageTxt = esc(b.message).slice(0, 2000);

  if (!name || !date || !time || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const rows = emailRows([
    { label: "Anlass", value: type },
    { label: "Art", value: mode },
    { label: "Ort", value: location },
    { label: "Datum", value: date },
    { label: "Uhrzeit", value: `${time} Uhr${duration ? ` · ${duration} Min.` : ""}` },
    { label: "Name", value: name },
    { label: "E-Mail", value: email },
    { label: "Telefon", value: phone },
    { label: "Nachricht", value: messageTxt },
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
      intro: `Vielen Dank! Wir bestätigen Ihren Wunschtermin (${type || "Termin"} am ${date} um ${time} Uhr) in Kürze persönlich.`,
      bodyHtml: rows,
    }),
  });

  return NextResponse.json({ ok: true, delivered: internal.ok, skipped: internal.skipped ?? false });
}

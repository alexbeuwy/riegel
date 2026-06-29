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
  const date = esc(b.date).slice(0, 40);
  const time = esc(b.time).slice(0, 20);
  const name = esc(b.name).slice(0, 200);
  const email = esc(b.email).slice(0, 200);
  const phone = esc(b.phone).slice(0, 80);

  if (!name || !date || !time || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const rows = emailRows([
    { label: "Anlass", value: type },
    { label: "Datum", value: date },
    { label: "Uhrzeit", value: `${time} Uhr` },
    { label: "Name", value: name },
    { label: "E-Mail", value: email },
    { label: "Telefon", value: phone },
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

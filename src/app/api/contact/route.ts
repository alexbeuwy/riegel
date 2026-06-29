import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows } from "@/lib/email";
import { supabase } from "@/lib/supabase";

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
  const name = esc(b.name).slice(0, 200);
  const email = esc(b.email).slice(0, 200);
  const phone = esc(b.phone).slice(0, 80);
  const topic = esc(b.topic).slice(0, 120);
  const message = esc(b.message).slice(0, 5000);

  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.email))) {
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
          { label: "Name", value: name },
          { label: "E-Mail", value: email },
          { label: "Telefon", value: phone },
          { label: "Anliegen", value: topic },
        ]) +
        `<p style="margin:14px 0 6px;color:#7c7a75;font-size:13px;">Nachricht</p><p style="margin:0;color:#f4f3f0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${message}</p>`,
    }),
  });

  // 2) Bestätigung an den Absender (best effort)
  await sendMail({
    to: email,
    subject: "Ihre Anfrage bei Riegel Immobilien",
    html: emailLayout({
      heading: `Danke, ${name.split(" ")[0] || "schön"}!`,
      intro:
        "Ihre Nachricht ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktages. Bei dringenden Anliegen erreichen Sie uns unter 06232 100 10 10.",
      bodyHtml: message
        ? `<p style="margin:8px 0 6px;color:#7c7a75;font-size:13px;">Ihre Nachricht</p><p style="margin:0;color:#a8a6a0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${message}</p>`
        : "",
    }),
  });

  if (supabase) {
    try {
      await supabase.from("leads").insert({
        kind: "contact",
        name,
        email,
        phone: phone || null,
        subject: topic || "Kontakt",
        message: message || null,
      });
    } catch {}
  }

  // skipped = kein RESEND_API_KEY → Formular zeigt trotzdem Erfolg (Daten lokal)
  return NextResponse.json({ ok: true, delivered: internal.ok, skipped: internal.skipped ?? false });
}

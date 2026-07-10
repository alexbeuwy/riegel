import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createLeadAddress } from "@/lib/onoffice";

// Nur beim HTML-Rendern escapen — DB, replyTo & OnOffice bekommen Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

// "Max Mustermann" -> Vorname "Max", Name "Mustermann"; "Anna Maria Musterfrau"
// -> Vorname "Anna Maria", Name "Musterfrau". Einzelnes Wort -> nur Name.
function splitName(full: string): { vorname?: string; nachname: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nachname: full };
  return { vorname: parts.slice(0, -1).join(" "), nachname: parts[parts.length - 1] };
}

export async function POST(req: Request) {
  if (!rateLimit(`inquiry:${clientIp(req)}`, 5, 10 * 60_000)) {
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
  const phone = clean(b.telefon, 80);
  const message = clean(b.nachricht, 2000);
  const objektTitel = clean(b.objektTitel, 200);
  const objektId = clean(b.objektId, 80);

  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }

  const rows = emailRows([
    { label: "Name", value: esc(name) },
    { label: "E-Mail", value: esc(email) },
    { label: "Telefon", value: esc(phone) },
    { label: "Objekt", value: esc(objektTitel) },
    { label: "Objekt-ID", value: esc(objektId) },
  ]);

  // 1) Erst durabel speichern: Supabase-Insert in public.leads (analog
  // booking/contact) — das gilt als "angenommen", unabhängig davon, ob Mail
  // oder OnOffice im Anschluss klappen.
  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("leads").insert({
      kind: "inquiry",
      name,
      email,
      phone: phone || null,
      subject: objektTitel || "Objektanfrage",
      message: message || null,
      detail: { objektId, objektTitel },
    });
    if (error) console.error("[inquiry] leads-Insert fehlgeschlagen:", error.message);
    logged = !error;
  }

  // 2) Benachrichtigung an Riegel + Bestätigung an den Absender (best effort).
  const internal = await sendMail({
    subject: `Objektanfrage: ${objektTitel || "Immobilie"}`,
    replyTo: email,
    html: emailLayout({
      heading: "Neue Objektanfrage",
      intro: `Über die Objekt-Detailseite ist eine neue Anfrage zu „${esc(objektTitel) || "einer Immobilie"}“ eingegangen.`,
      bodyHtml:
        rows +
        (message
          ? `<p style="margin:14px 0 6px;color:#6b7590;font-size:13px;">Nachricht</p><p style="margin:0;color:#141724;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`
          : ""),
    }),
  });

  await sendMail({
    to: email,
    subject: "Ihre Anfrage bei Riegel Immobilien",
    html: emailLayout({
      heading: `Danke, ${esc(name.split(" ")[0]) || "schön"}!`,
      intro: `Ihre Anfrage zu „${esc(objektTitel) || "der Immobilie"}“ ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktages.`,
      bodyHtml: message
        ? `<p style="margin:8px 0 6px;color:#6b7590;font-size:13px;">Ihre Nachricht</p><p style="margin:0;color:#5a6072;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`
        : "",
    }),
  });

  // 3) OnOffice-Übergabe best effort — NUR loggen, die Antwort an den Client
  // hängt nicht davon ab (Supabase-Insert bzw. der lokale Fallback im Formular
  // reichen bereits als "angenommen").
  const { vorname, nachname } = splitName(name);
  const idSuffix = objektId ? ` (ID ${objektId})` : "";
  const lead = await createLeadAddress({
    vorname,
    name: nachname,
    email,
    telefon: phone || undefined,
    bemerkung: `Objektanfrage über Website: ${objektTitel || "unbekanntes Objekt"}${idSuffix}. Nachricht: ${message || "–"}`,
  });
  console.info(`[inquiry] OnOffice-Adresse ${lead.ok ? `angelegt (${lead.addressId ?? "ohne Id"})` : "übersprungen/fehlgeschlagen"}`);

  return NextResponse.json({ ok: true, delivered: internal.ok, logged, skipped: internal.skipped ?? false });
}

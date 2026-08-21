import { NextResponse } from "next/server";
import { site } from "@/lib/site";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { kontaktSchema, pruefeFormular, leadQualitaet, qualitaetDetail } from "@/lib/validierung";
import { domainZustellbar } from "@/lib/validierung-server";

// Nur beim HTML-Rendern escapen — DB, replyTo & PDF bekommen Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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

  // Eine Prüfung für Honeypot, Pflichtfelder und Formate (s. lib/validierung.ts).
  // Der Honeypot-Fall antwortet bewusst mit „ok", damit ein Bot keinen
  // Unterschied merkt; Feldnamen (`objekt`, `phone`) sind die, die das
  // Formular seit jeher sendet.
  const geprueft = pruefeFormular(kontaktSchema, b);
  if (!geprueft.ok) {
    return NextResponse.json({ ok: false, error: geprueft.fehler, feld: geprueft.feld }, { status: 422 });
  }
  if (geprueft.bot) {
    return NextResponse.json({ ok: true, delivered: false, skipped: true });
  }
  const { name, email, phone, topic, message, objekt: objektTitel, objektId } = geprueft.daten;

  // Existiert die Domain überhaupt? Nur ein definitiv toter Name wird
  // abgewiesen — DNS-Aussetzer und Domains ohne MX laufen durch (fail-open),
  // ein verlorener Eigentümer wäre teurer als ein unsauberer Eintrag.
  const domain = await domainZustellbar(email);
  if (domain === "existiert-nicht") {
    return NextResponse.json(
      { ok: false, error: "Diese E-Mail-Domain existiert nicht — bitte prüfen.", feld: "email" },
      { status: 422 },
    );
  }
  const qualitaet = leadQualitaet({ name, email, telefon: phone, domain });

  // 1) Benachrichtigung an RIEGEL
  const internal = await sendMail({
    subject: `Neue Anfrage: ${topic || "Kontakt"} — ${name}${objektTitel ? ` · ${objektTitel.slice(0, 60)}` : ""}`,
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
          {
            label: "Objekt",
            value: objektTitel ? `${esc(objektTitel)}${objektId ? ` · ID ${esc(objektId)}` : ""}` : "",
          },
        ]) +
        `<p style="margin:14px 0 6px;color:#6b7590;font-size:13px;">Nachricht</p><p style="margin:0;color:#141724;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`,
    }),
  });

  // 2) Bestätigung an den Absender (best effort)
  await sendMail({
    to: email,
    // Reply-To aufs echte Postfach: sonst liefe eine Kundenantwort an die
    // Versand-Subdomain (MX = Resend-Eingang) statt nach Speyer.
    replyTo: emailTargets.TO,
    subject: "Ihre Anfrage bei RIEGEL Immobilien",
    html: emailLayout({
      heading: `Danke, ${esc(name.split(" ")[0]) || "schön"}!`,
      intro:
        "Ihre Nachricht ist bei uns angekommen. Wir melden uns in der Regel innerhalb eines Werktages. Bei dringenden Anliegen erreichen Sie uns unter " + site.phone + ".",
      bodyHtml: message
        ? `<p style="margin:8px 0 6px;color:#6b7590;font-size:13px;">Ihre Nachricht</p><p style="margin:0;color:#5a6072;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`
        : "",
    }),
  });

  const objektDetail =
    objektTitel || objektId ? { objektTitel: objektTitel || null, objektId: objektId || null } : null;
  const qDetail = qualitaetDetail(qualitaet);
  const leadDetail = objektDetail || qDetail ? { ...objektDetail, ...qDetail } : null;

  let logged = false;
  if (supabaseServer) {
    const { error } = await supabaseServer.from("leads").insert({
      kind: "contact",
      name,
      email,
      phone: phone || null,
      subject: topic || "Kontakt",
      message: message || null,
      // Objektbezug nur setzen, wenn vorhanden — bestehende Kontakt-Leads
      // haben kein detail, das bleibt so (null statt leerem Objekt).
      // Objektbezug (12.08.2026, Fall Maik Steinert) plus — falls es etwas zu
      // sagen gibt — die Qualitäts-Hinweise, die /intern am Lead anzeigt.
      // Beides nur setzen, wenn vorhanden: bestehende Leads ohne detail
      // sollen nicht plötzlich ein leeres Objekt bekommen.
      detail: leadDetail,
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

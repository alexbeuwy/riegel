import { NextResponse } from "next/server";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { terminSchema, pruefeFormular, leadQualitaet, qualitaetDetail } from "@/lib/validierung";
import { domainZustellbar } from "@/lib/validierung-server";

// Nur beim HTML-Rendern escapen — DB & replyTo bekommen Rohwerte.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Duplikat-Schutz (12.08.2026, Fall Maik Steinert): Die Route braucht für
 * eine Anfrage mehrere Sekunden (zwei Resend-Calls + Supabase sequenziell).
 * Bricht währenddessen die Verbindung des Kunden ab, zeigt der Client
 * „bitte erneut versuchen", obwohl der Server längst versendet hat — der
 * zweite Klick erzeugte dann Mail UND Lead doppelt.
 *
 * Zwei Schichten, beide auf ein 15-Minuten-Fenster begrenzt:
 * 1. In-Memory je Serverless-Instanz (fängt schnelle Retries ohne DB-Roundtrip),
 * 2. Supabase-Abgleich über Instanzen hinweg (gleiche requestId aus derselben
 *    Formular-Session ODER gleicher Slot email+date+time).
 * Ein Duplikat antwortet idempotent mit ok — der Erstversand war ja erfolgreich.
 */
const DEDUPE_FENSTER_MS = 15 * 60_000;
const zuletztGesehen = new Map<string, number>();

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

  // Honeypot, Pflichtfelder, Formate UND Datums-Plausibilität in einem Schritt
  // (s. lib/validierung.ts). Neu gegenüber vorher: Ein Termin in der
  // Vergangenheit oder in fünfzig Jahren wird jetzt abgewiesen, und „25:99"
  // ist keine gültige Uhrzeit mehr. Objektbezug als echtes Datenfeld
  // (12.08.2026, Fall Maik Steinert) — Feldnamen wie bei /api/inquiry, damit
  // /intern alle Anfrage-Arten einheitlich auflösen kann.
  const geprueft = pruefeFormular(terminSchema, b);
  if (!geprueft.ok) {
    return NextResponse.json({ ok: false, error: geprueft.fehler, feld: geprueft.feld }, { status: 422 });
  }
  if (geprueft.bot) {
    return NextResponse.json({ ok: true, delivered: false, skipped: true });
  }
  const {
    type,
    mode,
    location,
    duration,
    date,
    time,
    name,
    email,
    phone,
    message: messageTxt,
    objekt: objektTitel,
    objektId,
    requestId,
  } = geprueft.daten;

  // Nur eine definitiv nicht existierende Domain wird abgewiesen (fail-open,
  // s. domainZustellbar) — bei einer Terminanfrage wäre ein verlorener
  // Interessent besonders teuer.
  const domain = await domainZustellbar(email);
  if (domain === "existiert-nicht") {
    return NextResponse.json(
      { ok: false, error: "Diese E-Mail-Domain existiert nicht — bitte prüfen.", feld: "email" },
      { status: 422 },
    );
  }
  const qDetail = qualitaetDetail(leadQualitaet({ name, email, telefon: phone, domain }));

  // Duplikat-Prüfung VOR jedem Versand (Begründung s. oben am Modul).
  const jetzt = Date.now();
  for (const [k, t] of zuletztGesehen) if (jetzt - t > DEDUPE_FENSTER_MS) zuletztGesehen.delete(k);
  const slotKey = `slot:${email.toLowerCase()}|${date}|${time}`;
  const ridKey = requestId ? `rid:${requestId}` : null;
  let duplikat = zuletztGesehen.has(slotKey) || (ridKey !== null && zuletztGesehen.has(ridKey));
  if (!duplikat && supabaseServer) {
    const seit = new Date(jetzt - DEDUPE_FENSTER_MS).toISOString();
    const { data: vorhanden } = await supabaseServer
      .from("leads")
      .select("detail")
      .eq("kind", "booking")
      .eq("email", email)
      .gte("created_at", seit)
      .limit(10);
    duplikat = (vorhanden ?? []).some((r) => {
      const d = (r.detail ?? {}) as Record<string, unknown>;
      return (requestId !== "" && d.requestId === requestId) || (d.date === date && d.time === time);
    });
  }
  if (duplikat) {
    // Idempotent ok: der Kunde sieht seine Bestätigung, Sissy bekommt KEINE
    // zweite Mail und KEINEN zweiten Lead.
    return NextResponse.json({ ok: true, delivered: true, logged: true, duplicate: true });
  }

  const rows = emailRows([
    {
      label: "Objekt",
      value: objektTitel ? `${esc(objektTitel)}${objektId ? ` · ID ${esc(objektId)}` : ""}` : "",
    },
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
    subject: `Terminanfrage: ${type || "Termin"} am ${date} ${time} — ${name}${objektTitel ? ` · ${objektTitel.slice(0, 60)}` : ""}`,
    replyTo: email,
    html: emailLayout({
      heading: "Neue Terminanfrage",
      intro: "Über das Buchungstool wurde ein Wunschtermin angefragt.",
      bodyHtml: rows,
    }),
  });

  await sendMail({
    to: email,
    // Reply-To aufs echte Postfach: sonst liefe eine Kundenantwort an die
    // Versand-Subdomain (MX = Resend-Eingang) statt nach Speyer.
    replyTo: emailTargets.TO,
    subject: "Ihr Wunschtermin bei RIEGEL Immobilien",
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
      detail: {
        type,
        mode,
        location,
        duration,
        date,
        time,
        // Objektbezug + Idempotenz-Schlüssel (12.08.2026) — Feldnamen wie
        // bei kind "inquiry", damit /intern einheitlich rendert.
        objektTitel: objektTitel || null,
        objektId: objektId || null,
        requestId: requestId || null,
        ...qDetail,
      },
    });
    if (error) console.error("[booking] leads-Insert fehlgeschlagen:", error.message);
    logged = !error;
  }

  // Weder Mail zugestellt noch in der DB → ehrlich scheitern statt Lead verlieren.
  if (!internal.ok && !logged) {
    console.error("[booking] Lead weder gemailt noch gespeichert — 502.");
    return NextResponse.json({ ok: false, error: "persistence" }, { status: 502 });
  }

  // Erst NACH erfolgreicher Verarbeitung als „gesehen" markieren — ein
  // komplett fehlgeschlagener Versand (502 oben) darf einen echten Retry
  // nicht blockieren.
  zuletztGesehen.set(slotKey, jetzt);
  if (ridKey) zuletztGesehen.set(ridKey, jetzt);

  return NextResponse.json({ ok: true, delivered: internal.ok, logged, skipped: internal.skipped ?? false });
}

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getEstateBySlug } from "@/lib/estates";
import { sendMail, emailLayout, emailRows, emailTargets } from "@/lib/email";

/**
 * Aktive Bestätigung der Provisionsvereinbarung VOR dem Exposé-Download
 * (Pre-Exposé-Onboarding, analog OnOffice/ImmoScout). Der Client zeigt bei
 * provisionspflichtigen Objekten zuerst einen Bestätigungs-Dialog und ruft
 * diese Route auf; erst bei { ok: true } startet der eigentliche Download
 * (GET /api/expose).
 *
 * Wirkung hier: eine automatisierte E-Mail mit der Provisionsvereinbarung an
 * den Anbieter (TO) mit dem bestätigenden Nutzer in Kopie (CC) versenden. Die
 * konkrete Provisionshöhe stammt ausschließlich aus dem Objekt
 * (provision.text / provision.buyerPct).
 */

// Nur beim HTML-Rendern escapen (gleiche Vorgehensweise wie /api/inquiry).
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function POST(req: Request) {
  if (!rateLimit(`expose-confirm:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen, bitte kurz warten." },
      { status: 429 },
    );
  }

  // Konto-Gate: gleiche Token-Prüfung wie /api/expose.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !supabaseServer) {
    return NextResponse.json(
      { ok: false, error: "Bitte einloggen, um die Provisionsvereinbarung zu bestätigen." },
      { status: 401 },
    );
  }
  const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json(
      { ok: false, error: "Bitte einloggen, um die Provisionsvereinbarung zu bestätigen." },
      { status: 401 },
    );
  }
  const user = userData.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";

  const found = slug ? await getEstateBySlug(slug) : null;
  if (!found || found.source !== "onoffice") {
    // Mock-Objekte haben kein echtes Exposé; unbekannte Slugs sowieso nicht.
    return NextResponse.json(
      { ok: false, error: "Für dieses Objekt ist kein Exposé verfügbar." },
      { status: 404 },
    );
  }
  const { estate } = found;

  // Provisionsfreie Objekte laden direkt herunter — hier hätte der Client gar
  // nicht bestätigen dürfen.
  if (estate.provision.free) {
    return NextResponse.json(
      { ok: false, error: "Für dieses Objekt ist keine Provisionsbestätigung erforderlich." },
      { status: 400 },
    );
  }

  const provisionText =
    estate.provision.text ??
    (estate.provision.buyerPct != null ? `${estate.provision.buyerPct} %` : "Auf Anfrage.");
  const objectUrl = `${emailTargets.ASSET_BASE}/immobilien/${estate.slug}`;
  const userEmail = user.email ?? "";
  const userName =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    "";
  const timestamp =
    new Date().toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      dateStyle: "long",
      timeStyle: "short",
    }) + " Uhr";

  const rows = emailRows([
    { label: "Objekt", value: esc(estate.title) },
    { label: "Ort", value: esc([estate.postcode, estate.city].filter(Boolean).join(" ")) },
    { label: "Objekt-ID", value: esc(estate.externalId ?? estate.id) },
    { label: "Provision", value: esc(provisionText) },
    { label: "Bestätigt von", value: esc(userName) },
    { label: "E-Mail", value: esc(userEmail) },
    { label: "Zeitpunkt", value: esc(timestamp) },
  ]);

  const html = emailLayout({
    heading: "Provisionsvereinbarung bestätigt",
    intro:
      "Die aktive Bestätigung der Provisionsvereinbarung zu folgendem Objekt wird hiermit dokumentiert. Die Provisionsvereinbarung kommt nur zwischen dem bestätigenden Nutzer und dem Anbieter zustande.",
    bodyHtml:
      `<p style="margin:0 0 6px;color:#141724;font-size:14px;line-height:1.6;">Der Anbieter erhält bei Abschluss eines durch ihn vermittelten notariell beurkundeten Kaufvertrages zu dieser Immobilie von Ihnen die unten angegebene Provision.</p>` +
      rows +
      `<p style="margin:0;color:#5a6072;font-size:13px;line-height:1.6;">Die Provision wird selbstverständlich nur dann fällig, wenn Sie die Immobilie tatsächlich kaufen.</p>`,
    ctaLabel: "Objekt ansehen",
    ctaHref: objectUrl,
  });

  const sent = await sendMail({
    to: emailTargets.TO,
    cc: userEmail || undefined,
    subject: `Provisionsvereinbarung bestätigt: ${estate.title}`,
    html,
  });

  // Fail-soft: Ist der Mailversand gar nicht konfiguriert (kein RESEND_API_KEY),
  // ist das kein Fehler des Nutzers — Bestätigung gilt, Download darf starten.
  if (sent.skipped) {
    console.warn(
      `[expose-confirm] Mailversand übersprungen (nicht konfiguriert) für Objekt ${estate.id} / Nutzer ${userEmail}`,
    );
    return NextResponse.json({ ok: true, mailed: false });
  }
  // Echter Versandfehler: NICHT durchwinken — sonst „verpufft" die Bestätigung.
  if (!sent.ok) {
    console.error(
      `[expose-confirm] Mailversand fehlgeschlagen für Objekt ${estate.id} / Nutzer ${userEmail}: ${sent.error ?? "unbekannt"}`,
    );
    return NextResponse.json(
      { ok: false, error: "Bestätigung konnte nicht versendet werden, bitte erneut versuchen." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, mailed: true });
}

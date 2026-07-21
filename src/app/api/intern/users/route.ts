import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess, internFixedEmails, internInvitedEmails } from "@/lib/intern-access";
import { INTERN_INVITED_KEY } from "@/lib/site-settings-keys";
import { sendMail, emailLayout } from "@/lib/email";

/**
 * Nutzerverwaltung fürs /intern-Portal:
 *  - action "list": feste + eingeladene E-Mail-Adressen anzeigen.
 *  - action "invite": E-Mail zur dynamischen Zusatz-Freischaltung hinzufügen
 *    (site_settings, s. intern-access.ts) und eine Einladungs-Mail verschicken.
 *  - action "remove": eine eingeladene Adresse wieder entziehen (feste Adressen
 *    sind NICHT entfernbar).
 *  - action "delete-account": ein Supabase-Auth-Konto endgültig löschen (feste
 *    Adressen und das eigene, gerade per E-Mail eingeloggte Konto sind geschützt).
 * Zugriff/Rate-Limit wie die übrigen /intern-Routen; service_role-Client für
 * DB-Schreibzugriff UND die Supabase-Auth-Admin-API. Fehlermeldungen bleiben
 * nach außen generisch, Details nur in den Logs.
 */
export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Body = {
  password?: string;
  accessToken?: string;
  action?: string;
  email?: string;
  userId?: string;
};

// Nur beim HTML-Rendern escapen (Konvention wie in api/contact): die
// E-Mail-Adresse ist zwar bereits regex-geprüft, landet aber roh in der Mail.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Eingeladene Liste als JSON-Array in site_settings ablegen: direkter Upsert
 *  (wie im Hero-Bild-Pendant api/intern/hero-image), kein zusätzlicher Layer. */
async function saveInvited(admin: SupabaseClient, list: string[]): Promise<void> {
  const { error } = await admin
    .from("site_settings")
    .upsert({ key: INTERN_INVITED_KEY, value: JSON.stringify(list), updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/**
 * Einladungs-Mail: ausführlich, damit auch ohne Vorwissen klar ist, wie der
 * Zugang funktioniert (Konto unter genau dieser Adresse, kein separates
 * Passwort) und was im Portal steckt. Aufbau/Optik wie scripts/report-manfred.mts
 * (Titel in #141724, Fließtext in #5a6072, Links im RIEGEL-Blau #015cff).
 */
function inviteMailHtml(email: string): string {
  const section = (title: string, html: string) =>
    `<div style="margin:0 0 20px;">
      <div style="color:#141724;font-size:15px;font-weight:700;line-height:1.4;">${title}</div>
      ${html}
    </div>`;

  const bodyHtml =
    section(
      "So kommen Sie rein",
      `<ol style="margin:6px 0 0;padding-left:20px;color:#5a6072;font-size:14px;line-height:1.7;">
        <li>Unter <a href="https://riegel.vercel.app/konto" style="color:#015cff;text-decoration:none;">riegel.vercel.app/konto</a> ein Konto mit genau dieser E-Mail-Adresse anlegen (oder anmelden, falls dort schon eines besteht).</li>
        <li>Danach <a href="https://riegel.vercel.app/intern" style="color:#015cff;text-decoration:none;">riegel.vercel.app/intern</a> öffnen. Ein zusätzliches Passwort ist nicht nötig, die Freischaltung hängt an der E-Mail-Adresse.</li>
      </ol>`,
    ) +
    section(
      "Was Sie dort sehen",
      `<ul style="margin:6px 0 0;padding-left:20px;color:#5a6072;font-size:14px;line-height:1.7;">
        <li>Übersicht mit Kennzahlen</li>
        <li>Bewertungs-Reports (alle Immobilienbewertungen der Website, je Bewertung als PDF herunterladbar)</li>
        <li>Anfragen (Termin- und Kontaktanfragen)</li>
        <li>Objekte (live aus OnOffice)</li>
        <li>Medien</li>
        <li>Website-Feedback</li>
        <li>Konten</li>
      </ul>`,
    ) +
    `<p style="margin:0 0 18px;color:#5a6072;font-size:14px;line-height:1.6;">
      <span style="color:#141724;font-weight:700;">Wohin gehen Leads und Daten:</span> Jede Bewertungs-, Kontakt- und Terminanfrage geht per E-Mail an info@riegel-immobilien.de und wird zusätzlich in der geschützten RIEGEL-Datenbank gespeichert. Die Kundschaft erhält ihren Marktwert-Report als PDF per E-Mail. Website-Feedback bleibt rein intern.
    </p>
    <p style="margin:0;color:#5a6072;font-size:14px;line-height:1.6;">
      <span style="color:#141724;font-weight:700;">Vertraulichkeit:</span> Es handelt sich um personenbezogene Kundendaten. Bitte den Zugang nicht weitergeben und Auswertungen nur intern verwenden.
    </p>`;

  return emailLayout({
    heading: "Willkommen im RIEGEL Intern-Portal",
    intro: `Der Zugang wurde für genau diese E-Mail-Adresse freigeschaltet: <strong style="color:#141724;">${esc(email)}</strong>.`,
    bodyHtml,
    ctaLabel: "Intern-Portal öffnen",
    ctaHref: "https://riegel.vercel.app/intern",
  });
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-users:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche, bitte später erneut." },
      { status: 429 },
    );
  }

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const admin = adminClient();
  if (!admin) {
    console.error("[intern/users] SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  if (b.action === "list") {
    const invited = await internInvitedEmails();
    return NextResponse.json({ ok: true, fixed: Array.from(internFixedEmails()), invited });
  }

  if (b.action === "invite") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Bitte eine gültige E-Mail angeben." }, { status: 400 });
    }

    let next: string[];
    try {
      const current = await internInvitedEmails();
      // Idempotent: bereits enthaltene Adresse ist kein Fehler, die Mail geht
      // trotzdem erneut raus (z. B. wenn sie beim ersten Mal nicht ankam).
      next = current.includes(email) ? current : [...current, email];
      await saveInvited(admin, next);
    } catch (e) {
      console.error("[intern/users] Einladen fehlgeschlagen:", e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
    }

    const mail = await sendMail({
      to: email,
      subject: "Ihr Zugang zum RIEGEL Intern-Portal",
      html: inviteMailHtml(email),
    });
    if (!mail.ok) {
      // Zugang ist bereits freigeschaltet (site_settings ist gespeichert):
      // ein Mail-Fehler darf das nicht rückgängig machen, nur gemeldet werden.
      console.error("[intern/users] Einladungs-Mail fehlgeschlagen:", mail.error ?? (mail.skipped ? "RESEND_API_KEY fehlt" : "unbekannt"));
      return NextResponse.json({ ok: true, invited: next, mailError: true });
    }
    return NextResponse.json({ ok: true, invited: next });
  }

  if (b.action === "remove") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "E-Mail fehlt." }, { status: 400 });
    // Feste Adressen (Sissy/Alex bzw. INTERN_EMAILS) sind aus der dynamischen
    // Liste heraus nicht entfernbar: sie stehen dort ohnehin nicht drin, aber
    // ein Versuch soll klar scheitern statt still nichts zu tun.
    if (internFixedEmails().has(email)) {
      return NextResponse.json({ ok: false, error: "Dieser Zugang kann nicht entfernt werden." }, { status: 403 });
    }

    let next: string[];
    try {
      const current = await internInvitedEmails();
      next = current.filter((e) => e !== email);
      await saveInvited(admin, next);
    } catch (e) {
      console.error("[intern/users] Entfernen fehlgeschlagen:", e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, invited: next });
  }

  if (b.action === "delete-account") {
    const userId = String(b.userId ?? "").trim();
    if (!userId) return NextResponse.json({ ok: false, error: "userId fehlt." }, { status: 400 });

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Konto nicht gefunden." }, { status: 404 });
    }
    const targetEmail = userData.user.email?.toLowerCase();

    // Schutz 1: feste Zugänge dürfen aus /intern heraus nie gelöscht werden.
    if (targetEmail && internFixedEmails().has(targetEmail)) {
      return NextResponse.json({ ok: false, error: "Dieses Konto kann nicht gelöscht werden." }, { status: 403 });
    }
    // Schutz 2: das eigene, gerade per E-Mail eingeloggte Konto, sonst könnte
    // sich die handelnde Person aus Versehen selbst aussperren. Gilt nur für
    // den E-Mail-Weg: beim Passwort-Weg (geteiltes ADMIN_PASSWORD) hängt kein
    // Konto am handelnden Nutzer.
    if (auth.via === "email" && auth.email && targetEmail === auth.email) {
      return NextResponse.json({ ok: false, error: "Das eigene Konto kann hier nicht gelöscht werden." }, { status: 403 });
    }

    const { error: delError } = await admin.auth.admin.deleteUser(userId);
    if (delError) {
      console.error("[intern/users] Konto-Löschung fehlgeschlagen:", delError.message);
      return NextResponse.json({ ok: false, error: "Löschung fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unbekannte Aktion." }, { status: 400 });
}

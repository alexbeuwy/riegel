import { NextResponse } from "next/server";
import { runMatching } from "@/lib/matching";
import { sendMail, emailLayout, emailTargets } from "@/lib/email";

/**
 * Matching-Lauf für Suchaufträge (s. lib/matching.ts) — getriggert vom
 * Vercel-Cron (vercel.json) oder manuell/extern mit Secret.
 *
 * Auth: Vercel-Crons senden `Authorization: Bearer ${CRON_SECRET}`, sobald
 * die Env-Var CRON_SECRET im Projekt gesetzt ist. Externe Trigger (z. B.
 * cron-job.org für höhere Frequenz als der tägliche Hobby-Plan-Cron) nutzen
 * dasselbe Secret als `?secret=`-Query. Ohne gesetztes CRON_SECRET bleibt
 * die Route bewusst zu (503) — fail-closed statt öffentlich triggerbar.
 *
 * `?dry=1` = Probelauf: matcht und listet, schreibt/verschickt aber nichts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Interne Info-Mail bei Fehler ODER echtem Mail-Versand — der dokumentierte
 * Resend-Vorfall (EMAIL_FROM kaputt formatiert → zwei Tage stiller
 * Totalausfall, kein sichtbarer Fehler irgendwo, s. lib/email.ts) darf sich
 * beim Cron-Matching nicht wiederholen: ein Cron-Fehler läuft sonst tage-
 * oder wochenlang unbemerkt im Log durch, ohne dass es je jemand sieht.
 *
 * Bewusst NUR bei ok===false oder mails>0 — ein täglicher "0 Mails, alles
 * gut"-Lauf verschickt NICHTS, sonst entsteht tägliches Rauschen, das nach
 * kurzer Zeit ignoriert wird (und damit den eigentlichen Fehlerfall wieder
 * unsichtbar macht).
 *
 * Fail-soft: geht der Info-Mail-Versand selbst schief (z. B. Resend down),
 * darf das die Antwort der Route NICHT verändern — der Cron-Aufrufer soll
 * weiterhin den echten Matching-Status sehen, nicht einen Mail-Fehler.
 */
async function benachrichtigeBeiAuffaelligkeit(summary: Awaited<ReturnType<typeof runMatching>>) {
  const auffaellig = summary.ok === false || (summary.mails ?? 0) > 0;
  if (!auffaellig) return;
  try {
    const subject = summary.ok === false
      ? `[Matching] Fehler: ${summary.error ?? "unbekannt"}`
      : `[Matching] ${summary.mails} Mail(s) verschickt`;
    const html = emailLayout({
      heading: subject,
      bodyHtml: `<pre style="white-space:pre-wrap;word-break:break-word;background:#f5f7fc;border-radius:12px;padding:16px;font-size:12px;color:#141724;">${JSON.stringify(summary, null, 2)}</pre>`,
    });
    const result = await sendMail({ to: emailTargets.TO, subject, html });
    if (!result.ok && !result.skipped) {
      console.error("[matching/run] Info-Mail-Versand fehlgeschlagen:", result.error);
    }
  } catch (e) {
    console.error("[matching/run] Info-Mail-Versand geworfen:", e instanceof Error ? e.message : e);
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_secret_missing" }, { status: 503 });
  }
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";
  const ok = auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const dry = url.searchParams.get("dry") === "1";
  const summary = await runMatching({ dry });
  await benachrichtigeBeiAuffaelligkeit(summary);
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

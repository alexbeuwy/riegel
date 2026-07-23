import { NextResponse } from "next/server";
import { runMatching } from "@/lib/matching";

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
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getEstateData } from "@/lib/estates";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Health-Check für die drei Kern-Integrationen (OnOffice/Supabase/Resend) —
 * gedacht für externes Monitoring (z. B. UptimeRobot/cron-job.org), damit ein
 * stiller Ausfall auffällt, bevor ihn ein Kunde oder Sissy bemerkt (s. den
 * dokumentierten Resend-Vorfall: zwei Tage Totalausfall ohne sichtbaren
 * Fehler, CLAUDE.md/lib/email.ts). Bewusst OHNE Auth: die Antwort enthält
 * keine Secrets, nur Booleans/Zahlen — ein offener Health-Endpoint ist der
 * Standard für Uptime-Monitore, die i. d. R. keine Header setzen können.
 *
 * `ok` ist streng: nur wahr, wenn ALLE drei Integrationen wirklich laufen
 * (OnOffice = Live-Quelle, nicht der Mock-Fallback). Ein Monitoring-Alarm
 * bei `ok:false` ist damit immer ein echtes Signal, kein Rauschen.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkSupabase(): Promise<boolean> {
  if (!supabaseServer) return false;
  try {
    // Leichtester denkbarer Roundtrip: nur der Row-Count (head:true → kein
    // Payload), limit 0 spart selbst das Zählen von Zeileninhalten. Prüft
    // ausschließlich Erreichbarkeit + Auth des Keys, keine fachliche Aussage.
    const { error } = await supabaseServer
      .from("site_settings")
      .select("key", { head: true, count: "exact" })
      .limit(0);
    return !error;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!rateLimit(`health:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // getEstateData() ist über unstable_cache/react-cache gecacht (s. lib/estates.ts)
  // — im Normalfall schnell; ein Cold-Miss löst einen echten OnOffice-Pull aus.
  // Das ist hier akzeptabel (Vorgabe): der Health-Check soll den echten Zustand
  // sehen, kein isoliertes Ping ohne Aussagekraft.
  const [estateData, supabase] = await Promise.all([getEstateData(), checkSupabase()]);

  const resend = Boolean(process.env.RESEND_API_KEY);
  const onoffice = { source: estateData.source, objekte: estateData.estates.length };
  const ok = onoffice.source === "onoffice" && supabase && resend;

  return NextResponse.json(
    { ok, onoffice, supabase, resend, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkAdminPassword } from "@/lib/admin-auth";

/**
 * Internes Lead-Dashboard-Backend. Liest Bewertungs-Reports + Termin-/Kontakt-Leads
 * über den service_role-Key (umgeht RLS) — NUR nach Passwort-Prüfung.
 * Env (serverseitig, secret): ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY,
 * plus NEXT_PUBLIC_SUPABASE_URL.
 * Fehlermeldungen bleiben nach außen generisch — Details nur in den Logs.
 */

export async function POST(req: Request) {
  if (!rateLimit(`intern:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche — bitte später erneut." },
      { status: 429 },
    );
  }

  let b: { password?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = checkAdminPassword(b.password);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern] SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [reportsRes, leadsRes] = await Promise.all([
    admin.from("valuation_requests").select("*").order("created_at", { ascending: false }).limit(300),
    admin.from("leads").select("*").order("created_at", { ascending: false }).limit(300),
  ]);

  if (reportsRes.error || leadsRes.error) {
    console.error("[intern] DB-Fehler:", reportsRes.error?.message || leadsRes.error?.message);
    return NextResponse.json(
      { ok: false, error: "Daten konnten nicht geladen werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reports: reportsRes.data ?? [],
    leads: leadsRes.data ?? [],
  });
}

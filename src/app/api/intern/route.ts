import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Internes Lead-Dashboard-Backend. Liest Bewertungs-Reports + Termin-/Kontakt-Leads
 * über den service_role-Key (umgeht RLS) — NUR nach Passwort-Prüfung.
 * Env (serverseitig, secret): ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY,
 * plus NEXT_PUBLIC_SUPABASE_URL.
 */
export async function POST(req: Request) {
  let b: { password?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD ist in Vercel noch nicht gesetzt." },
      { status: 503 },
    );
  }
  if (!b.password || b.password !== expected) {
    return NextResponse.json({ ok: false, error: "Falsches Passwort." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY (oder URL) ist in Vercel noch nicht gesetzt." },
      { status: 503 },
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [reportsRes, leadsRes] = await Promise.all([
    admin.from("valuation_requests").select("*").order("created_at", { ascending: false }).limit(300),
    admin.from("leads").select("*").order("created_at", { ascending: false }).limit(300),
  ]);

  if (reportsRes.error || leadsRes.error) {
    return NextResponse.json(
      { ok: false, error: reportsRes.error?.message || leadsRes.error?.message || "DB-Fehler" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reports: reportsRes.data ?? [],
    leads: leadsRes.data ?? [],
  });
}

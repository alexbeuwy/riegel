import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import { FEEDBACK_STATUS_ROW_ID, parseFeedbackStatus } from "@/lib/intern-feedback";
import { getEstateData } from "@/lib/estates";
import { formatPrice } from "@/lib/format";

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

  let b: { password?: string; accessToken?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern] SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const [reportsRes, leadsRes, feedbackRes] = await Promise.all([
    admin.from("valuation_requests").select("*").order("created_at", { ascending: false }).limit(300),
    admin.from("leads").select("*").order("created_at", { ascending: false }).limit(300),
    admin
      .from("feedback")
      .select("id, created_at, page_url, area, comment")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (reportsRes.error || leadsRes.error) {
    console.error("[intern] DB-Fehler:", reportsRes.error?.message || leadsRes.error?.message);
    return NextResponse.json(
      { ok: false, error: "Daten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
  // Feedback ist optional — fehlt die Tabelle, bleibt das Dashboard nutzbar.
  if (feedbackRes.error) console.error("[intern] Feedback-Load-Fehler:", feedbackRes.error.message);

  // Status liegt in einer Sentinel-Zeile derselben Tabelle -> herausfiltern.
  const allFeedback = feedbackRes.data ?? [];
  const statusRow = allFeedback.find((r) => r.id === FEEDBACK_STATUS_ROW_ID);
  const comments = allFeedback.filter((r) => r.id !== FEEDBACK_STATUS_ROW_ID);

  // Registrierte Auth-Nutzerkonten. Fail-soft: bei Fehler leere Liste, damit
  // das restliche Dashboard nutzbar bleibt. Nur nicht-sensible Felder nach außen.
  let accounts: {
    id: string;
    email: string | null;
    created_at?: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
  }[] = [];
  try {
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) {
      console.error("[intern] Konten-Load-Fehler:", usersError.message);
    } else {
      accounts = (usersData?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? u.confirmed_at ?? null,
      }));
    }
  } catch (e) {
    console.error("[intern] Konten-Load-Ausnahme:", e instanceof Error ? e.message : String(e));
  }

  // Live-Objekte aus OnOffice (cached). Fail-soft: bei Fehler leere Liste.
  let objekte: {
    id: string;
    title: string;
    city: string;
    postcode: string;
    slug: string;
    status: string;
    price: string;
    priceValue: number;
    image: string | null;
    rooms: number | null;
    livingArea: number | null;
    category: string;
    marketingType: string;
    provision: string;
  }[] = [];
  try {
    const { estates } = await getEstateData();
    objekte = estates.map((e) => ({
      id: e.id,
      title: e.title,
      city: e.city,
      postcode: e.postcode,
      slug: e.slug,
      status: e.status,
      price: formatPrice(e),
      priceValue: e.price ?? 0,
      image: e.images?.[0] ?? null,
      rooms: e.rooms,
      livingArea: e.livingArea,
      category: e.category,
      marketingType: e.marketingType,
      provision: e.provision.free ? "Provisionsfrei" : e.provision.text ?? "",
    }));
  } catch (e) {
    console.error("[intern] Objekte-Load-Fehler:", e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    ok: true,
    reports: reportsRes.data ?? [],
    leads: leadsRes.data ?? [],
    feedback: comments,
    feedbackStatus: parseFeedbackStatus(statusRow?.comment),
    accounts,
    objekte,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import {
  FEEDBACK_STATUS_ROW_ID,
  FEEDBACK_STATUS_MARKER,
  parseFeedbackStatus,
  type FeedbackState,
} from "@/lib/intern-feedback";

/**
 * Setzt/ändert den Bearbeitungsstatus eines On-Page-Feedback-Kommentars (Sissy)
 * im /intern-Board. Der Status liegt als JSON-Karte in site_settings — keine
 * Schema-Änderung an der feedback-Tabelle nötig. Zugriff wie beim übrigen
 * /intern (Passwort ODER freigeschaltete E-Mail).
 */
export async function POST(req: Request) {
  if (!rateLimit(`intern-feedback:${clientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche — bitte später erneut." },
      { status: 429 },
    );
  }

  let b: {
    password?: string;
    accessToken?: string;
    id?: string;
    status?: FeedbackState;
    note?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const id = String(b.id ?? "").trim();
  if (!id || id === FEEDBACK_STATUS_ROW_ID) {
    return NextResponse.json({ ok: false, error: "id fehlt/ungültig" }, { status: 400 });
  }
  const status: FeedbackState = b.status === "done" ? "done" : "open";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern-feedback] Supabase-Env fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  // Status liegt in einer Sentinel-Zeile der feedback-Tabelle (kein extra SQL nötig).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const current = await admin
    .from("feedback")
    .select("comment")
    .eq("id", FEEDBACK_STATUS_ROW_ID)
    .maybeSingle();
  const map = parseFeedbackStatus(current.data?.comment);

  const note = typeof b.note === "string" ? b.note.slice(0, 500) : undefined;
  map[id] = { status, ...(note ? { note } : {}), at: new Date().toISOString() };

  const { error } = await admin.from("feedback").upsert({
    id: FEEDBACK_STATUS_ROW_ID,
    page_url: FEEDBACK_STATUS_MARKER,
    comment: JSON.stringify(map),
  });
  if (error) {
    console.error("[intern-feedback] Speichern fehlgeschlagen:", error.message);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, feedbackStatus: map });
}

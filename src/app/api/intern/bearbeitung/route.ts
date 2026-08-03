import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import { LEAD_STATUS_VALUES, type LeadQuelle, type LeadStatus } from "@/lib/lead-bearbeitung";

/**
 * Setzt/ändert den Bearbeitungsstand (Status, Notiz, Wiedervorlage) eines
 * Reports oder einer Anfrage im /intern-Cockpit — Tabelle lead_bearbeitung,
 * ein Datensatz je (quelle, quelle_id), per Upsert (Primary Key deckt den
 * Konflikt ab). Zugriff wie beim übrigen /intern (Passwort ODER freigeschaltete
 * E-Mail). Fehlermeldungen bleiben nach außen generisch, Details nur in den Logs.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-bearbeitung:${clientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche — bitte später erneut." },
      { status: 429 },
    );
  }

  let b: {
    password?: string;
    accessToken?: string;
    quelle?: string;
    quelle_id?: string;
    /** Alias: die Schwester-Route /api/intern/onoffice nutzt camelCase. Beide
     *  Routen akzeptieren beide Schreibweisen, damit kein Aufrufer raten muss. */
    quelleId?: string;
    status?: string;
    notiz?: string | null;
    wiedervorlage?: string | null;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  if (b.quelle !== "report" && b.quelle !== "lead") {
    return NextResponse.json({ ok: false, error: "quelle ungültig" }, { status: 400 });
  }
  const quelle: LeadQuelle = b.quelle;

  const quelleId = String(b.quelle_id ?? b.quelleId ?? "").trim();
  if (!quelleId) {
    return NextResponse.json({ ok: false, error: "quelle_id fehlt" }, { status: 400 });
  }

  const update: {
    quelle: LeadQuelle;
    quelle_id: string;
    geaendert_am: string;
    status?: LeadStatus;
    notiz?: string | null;
    wiedervorlage?: string | null;
  } = { quelle, quelle_id: quelleId, geaendert_am: new Date().toISOString() };

  if (b.status !== undefined) {
    if (!LEAD_STATUS_VALUES.includes(b.status as LeadStatus)) {
      return NextResponse.json({ ok: false, error: "status ungültig" }, { status: 400 });
    }
    update.status = b.status as LeadStatus;
  }

  if (b.notiz !== undefined) {
    if (b.notiz !== null && typeof b.notiz !== "string") {
      return NextResponse.json({ ok: false, error: "notiz ungültig" }, { status: 400 });
    }
    if (typeof b.notiz === "string" && b.notiz.length > 2000) {
      return NextResponse.json(
        { ok: false, error: "notiz zu lang (max. 2000 Zeichen)" },
        { status: 400 },
      );
    }
    update.notiz = b.notiz;
  }

  if (b.wiedervorlage !== undefined) {
    if (b.wiedervorlage !== null && !isValidDate(b.wiedervorlage)) {
      return NextResponse.json(
        { ok: false, error: "wiedervorlage ungültig (YYYY-MM-DD oder null erwartet)" },
        { status: 400 },
      );
    }
    update.wiedervorlage = b.wiedervorlage;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern-bearbeitung] Supabase-Env fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("lead_bearbeitung")
    .upsert(update, { onConflict: "quelle,quelle_id" })
    .select("status, notiz, wiedervorlage, onoffice_adresse_id")
    .maybeSingle();

  if (error) {
    console.error("[intern-bearbeitung] Speichern fehlgeschlagen:", error.message);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bearbeitung: data });
}

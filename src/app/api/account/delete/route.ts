import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Konto-Löschung (DSGVO Art. 17, Recht auf Löschung). Verifiziert den
 * eingeloggten Nutzer über seinen Access-Token und löscht den Auth-User via
 * Admin-API. Profile, Favoriten und Suchaufträge hängen per
 * `on delete cascade` an `auth.users` → sie werden automatisch mitgelöscht
 * (valuation_requests/game_scores: `on delete set null` — Geschäfts-/
 * Lead-Datensätze bleiben, aber ohne Personenbezug zum Konto).
 *
 * Erfordert den SUPABASE_SERVICE_ROLE_KEY (Admin-API). Ohne ihn kann die
 * Löschung nicht serverseitig erfolgen → klare 503-Antwort.
 */
export async function POST(req: Request) {
  if (!rateLimit(`account-delete:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Zu viele Versuche — bitte später erneut." }, { status: 429 });
  }
  if (!supabaseServer) {
    return NextResponse.json({ ok: false, error: "Konten sind nicht konfiguriert." }, { status: 503 });
  }
  // Admin-Löschung braucht den service_role-Key; mit reinem anon-Key nicht möglich.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Löschung serverseitig nicht möglich — bitte kurz per E-Mail an uns wenden." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: "Sitzung ungültig — bitte neu anmelden." }, { status: 401 });
  }

  const { error: delError } = await supabaseServer.auth.admin.deleteUser(data.user.id);
  if (delError) {
    console.error("[account-delete] Löschung fehlgeschlagen:", delError.message);
    return NextResponse.json({ ok: false, error: "Löschung fehlgeschlagen — bitte erneut versuchen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

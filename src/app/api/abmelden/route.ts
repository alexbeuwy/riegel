import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * One-Click-Abmeldung von den automatischen Objekt-Mails (Matching-Tool,
 * s. lib/matching.ts). Der Link steht klein im Footer jeder Matching-Mail
 * UND als List-Unsubscribe(-Post)-Header (RFC 8058) — deshalb GET (Klick im
 * Mail-Client) UND POST (One-Click-Button von Gmail/Outlook/Apple Mail).
 *
 * Auth ohne eigenes Nutzer-Login: `t` ist ein HMAC-SHA256(CRON_SECRET, u)-Hex
 * über die Nutzer-Id `u` — dieselbe Env-Variable, die schon /api/matching/run
 * schützt, spart ein weiteres Secret. Ohne CRON_SECRET bleibt die Route
 * fail-closed (503) — sonst ließe sich ohne jede Prüfung irgendein Nutzer
 * "abmelden" (Denial-of-Service auf fremde Konten). Der Vergleich läuft über
 * timingSafeEqual, damit sich der Token nicht per Timing-Seitenkanal erraten
 * lässt (kurze, öffentlich klickbare Mail-Links sind ein realistisches Ziel).
 *
 * Wirkung bei gültigem Token:
 *   1. ALLE saved_searches des Nutzers auf notify=false (Portal-Suchaufträge).
 *   2. profiles.preferences.benachrichtigung=false (Konto-Suchprofil,
 *      s. matchProfil in lib/matching.ts) — bestehende preferences bleiben
 *      erhalten, nur das eine Feld wird gemergt/überschrieben.
 * Beides zusammen deckt beide Matching-Quellen ab (matchQuery + matchProfil).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, message: string): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#f3f4f8;color:#1a1d29;font-family:Helvetica,Arial,sans-serif;}
  .card{max-width:440px;margin:72px auto;background:#ffffff;border:1px solid #e2e5ec;border-radius:14px;padding:32px 28px;text-align:center;}
  h1{margin:0 0 12px;font-size:19px;font-weight:700;}
  p{margin:0;font-size:14px;line-height:1.6;color:#565c6d;}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

function html(body: string, status: number): NextResponse {
  return new NextResponse(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

const OK_PAGE = page(
  "Abmeldung bestätigt",
  "Sie erhalten keine automatischen Objekt-Vorschläge mehr per E-Mail. Sie können sie in Ihrem Konto jederzeit wieder aktivieren.",
);
const INVALID_PAGE = page("Link ungültig", "Dieser Abmeldelink ist ungültig oder nicht mehr aktuell.");
const UNAVAILABLE_PAGE = page(
  "Nicht verfügbar",
  "Die Abmeldung ist derzeit technisch nicht möglich. Bitte versuchen Sie es später erneut oder wenden Sie sich an uns.",
);
const RATE_LIMIT_PAGE = page("Zu viele Anfragen", "Bitte versuchen Sie es in ein paar Minuten erneut.");

/** Gegenstück zu abmeldeLink(userId) in lib/matching.ts. */
function verifyToken(secret: string, userId: string, token: string): boolean {
  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  // Buffer.from(…, "hex") parst ungültige Hex-Eingaben nicht mit einem Throw,
  // sondern bricht die Konvertierung an der ersten ungültigen Stelle ab —
  // ein zu kurzer/verstümmelter Token erzeugt dadurch schlicht einen kürzeren
  // Buffer. Der Längen-Check VOR timingSafeEqual fängt das sauber ab (gleiche
  // Länge ist Voraussetzung für timingSafeEqual, sonst wirft es selbst).
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handleAbmeldung(req: Request): Promise<NextResponse> {
  if (!rateLimit(`abmelden:${clientIp(req)}`, 30, 10 * 60_000)) {
    return html(RATE_LIMIT_PAGE, 429);
  }

  // Fail-closed: ohne CRON_SECRET gibt es keinen validierbaren Token — die
  // Route öffentlich zu lassen würde bedeuten, JEDEN Nutzer anhand seiner Id
  // ungeprüft abmelden zu können.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return html(UNAVAILABLE_PAGE, 503);
  }

  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!UUID_RE.test(u) || !t || !verifyToken(secret, u, t)) {
    return html(INVALID_PAGE, 403);
  }

  if (!supabaseServer) {
    return html(UNAVAILABLE_PAGE, 503);
  }

  // 1) Portal-Suchaufträge: ALLE des Nutzers auf notify=false — nicht nur
  //    die aktuell benachrichtigenden, auch künftig angelegte sollen mit
  //    dieser Abmeldung stumm bleiben, bis der Nutzer aktiv wieder anschaltet.
  const searchErr = (
    await supabaseServer.from("saved_searches").update({ notify: false }).eq("user_id", u)
  ).error;

  // 2) Konto-Suchprofil: preferences.benachrichtigung=false MERGEN, nicht die
  //    Spalte überschreiben — sonst gingen z. B. rolle/objektarten/regionen
  //    verloren, die matchProfil weiterhin für andere Zwecke liest (und die
  //    der Nutzer beim nächsten Login im Formular vorfindet).
  const { data: profilRow, error: profilLeseErr } = await supabaseServer
    .from("profiles")
    .select("preferences")
    .eq("id", u)
    .maybeSingle();
  let profilErr = profilLeseErr;
  if (!profilLeseErr) {
    const bestehend = (profilRow?.preferences ?? {}) as Record<string, unknown>;
    profilErr = (
      await supabaseServer
        .from("profiles")
        .upsert({ id: u, preferences: { ...bestehend, benachrichtigung: false } }, { onConflict: "id" })
    ).error;
  }

  if (searchErr && profilErr) {
    // Beide Schreibversuche gescheitert (z. B. Tabellen/Spalten fehlen noch) —
    // ehrlich als Fehler melden statt eine Abmeldung vorzutäuschen, die nicht
    // gewirkt hat.
    console.error(
      `[abmelden] beide Updates fehlgeschlagen für ${u}: saved_searches=${searchErr.message}, profiles=${profilErr.message}`,
    );
    return html(UNAVAILABLE_PAGE, 500);
  }
  if (searchErr) console.error(`[abmelden] saved_searches-Update fehlgeschlagen für ${u}: ${searchErr.message}`);
  if (profilErr) console.error(`[abmelden] profiles-Update fehlgeschlagen für ${u}: ${profilErr.message}`);

  return html(OK_PAGE, 200);
}

export async function GET(req: Request): Promise<NextResponse> {
  return handleAbmeldung(req);
}

// RFC 8058 One-Click-Unsubscribe: Mail-Clients rufen bei gesetztem
// List-Unsubscribe-Post-Header diese URL per POST (ohne Body-Auswertung) auf
// — identische Logik wie GET, damit ein Klick im Client UND der automatische
// Ein-Klick-Button dasselbe Ergebnis liefern.
export async function POST(req: Request): Promise<NextResponse> {
  return handleAbmeldung(req);
}

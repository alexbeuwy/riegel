import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import { getEstateData } from "@/lib/estates";
import { formatEUR } from "@/lib/format";

/**
 * Kontakt-Akte fürs /intern-Cockpit: alle Berührungspunkte einer E-Mail-Adresse
 * an einem Ort (Bewertungen, Anfragen, Merkliste, Suchaufträge, Auth-Konto).
 * Zugriff/Rate-Limit wie die übrigen /intern-Routen; Fehlermeldungen bleiben
 * nach außen generisch, Details nur in den Logs.
 *
 * favorites/saved_searches tragen KEINE E-Mail-Spalte, nur user_id (FK auf
 * auth.users, s. docs/supabase-schema.sql). Die Zuordnung zur gesuchten
 * Adresse läuft also über das per Auth-Admin aufgelöste Konto. Ohne Konto zu
 * dieser Adresse bleiben beide Listen leer (kein Fehler, nur keine Zuordnung
 * möglich).
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Ereignis = {
  typ: "bewertung" | "anfrage" | "favorit" | "suchauftrag";
  datum: string;
  titel: string;
  details: string;
};

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

const KIND_LABEL: Record<string, string> = {
  booking: "Terminanfrage",
  contact: "Kontaktanfrage",
  archiv: "Alt-Kontakt",
};

function fmtEur(n?: number | string | null): string {
  const v = Number(n);
  return n != null && Number.isFinite(v) ? formatEUR(v) : "–";
}

/** Postgres-LIKE-Sonderzeichen escapen, damit ilike() eine exakte (nur
 *  case-insensitive) Übereinstimmung prüft statt ungewollt als Muster
 *  zu wirken (z. B. bei "_" in vielen E-Mail-Adressen). */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-akte:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche, bitte später erneut." },
      { status: 429 },
    );
  }

  let b: { password?: string; accessToken?: string; email?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Bitte eine gültige E-Mail angeben." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern/akte] Supabase-Env fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const pattern = escapeLike(email);

  const [bewertungenRes, anfragenRes, usersRes] = await Promise.all([
    admin
      .from("valuation_requests")
      .select(
        "id, created_at, address, city, postcode, objektart, value_mid, price_per_sqm, report_requested",
      )
      .ilike("email", pattern)
      .order("created_at", { ascending: false }),
    admin
      .from("leads")
      .select("id, created_at, kind, subject, message")
      .ilike("email", pattern)
      .order("created_at", { ascending: false }),
    // Kein getUserByEmail() in dieser @supabase/supabase-js-Version, darum
    // Konten wie in api/intern/route.ts über listUsers() laden und hier
    // passend filtern (dieselbe Seitengröße wie dort, keine Extra-Pagination nötig).
    admin.auth.admin.listUsers(),
  ]);

  if (bewertungenRes.error || anfragenRes.error) {
    console.error(
      "[intern/akte] DB-Fehler:",
      bewertungenRes.error?.message || anfragenRes.error?.message,
    );
    return NextResponse.json({ ok: false, error: "Daten konnten nicht geladen werden." }, { status: 500 });
  }
  if (usersRes.error) {
    console.error("[intern/akte] Konten-Load-Fehler:", usersRes.error.message);
  }

  const matchedUser = (usersRes.data?.users ?? []).find((u) => u.email?.toLowerCase() === email);

  // favorites/saved_searches: nur zuordenbar, wenn ein Auth-Konto zu dieser
  // Adresse existiert (s. Kommentar oben), sonst fail-soft leer.
  let favoritenRes: { data: { estate_id: string; created_at: string | null }[] | null; error: { message: string } | null } = {
    data: [],
    error: null,
  };
  let suchauftraegeRes: {
    data: { label: string | null; query: string; notify: boolean | null; created_at: string | null }[] | null;
    error: { message: string } | null;
  } = { data: [], error: null };
  if (matchedUser) {
    [favoritenRes, suchauftraegeRes] = await Promise.all([
      admin.from("favorites").select("estate_id, created_at").eq("user_id", matchedUser.id),
      admin
        .from("saved_searches")
        .select("label, query, notify, created_at")
        .eq("user_id", matchedUser.id),
    ]);
  }
  if (favoritenRes.error) console.error("[intern/akte] Favoriten-Load-Fehler:", favoritenRes.error.message);
  if (suchauftraegeRes.error) {
    console.error("[intern/akte] Suchauftrags-Load-Fehler:", suchauftraegeRes.error.message);
  }

  // Objekttitel für die Merkliste anreichern (live aus OnOffice, gecacht),
  // fail-soft: ohne das klappt die Akte trotzdem, nur ohne Objekt-Titel/-Ort.
  let estateById = new Map<string, { title: string; city: string; postcode: string }>();
  if ((favoritenRes.data ?? []).length > 0) {
    try {
      const { estates } = await getEstateData();
      estateById = new Map(estates.map((e) => [e.id, { title: e.title, city: e.city, postcode: e.postcode }]));
    } catch (e) {
      console.error("[intern/akte] Objekte-Load-Fehler:", e instanceof Error ? e.message : String(e));
    }
  }

  const bewertungen = bewertungenRes.data ?? [];
  const ereignisse: Ereignis[] = [];

  for (const r of bewertungen) {
    const adresse =
      [r.address, r.postcode && r.city ? `${r.postcode} ${r.city}` : r.city].filter(Boolean).join(", ") ||
      "ohne Adresse";
    ereignisse.push({
      typ: "bewertung",
      datum: r.created_at,
      titel: `${OBJEKTART_LABEL[r.objektart ?? ""] ?? r.objektart ?? "Bewertung"} · ${adresse}`,
      details: `Richtwert ${fmtEur(r.value_mid)}${r.price_per_sqm ? ` (${fmtEur(r.price_per_sqm)}/m²)` : ""}${
        r.report_requested ? " · PDF-Report angefordert" : ""
      }`,
    });
  }

  for (const l of anfragenRes.data ?? []) {
    ereignisse.push({
      typ: "anfrage",
      datum: l.created_at,
      titel: l.subject || KIND_LABEL[l.kind] || "Anfrage",
      details: `${KIND_LABEL[l.kind] ?? l.kind}${l.message ? ` · ${l.message.slice(0, 300)}` : ""}`,
    });
  }

  for (const f of favoritenRes.data ?? []) {
    const estate = estateById.get(f.estate_id);
    ereignisse.push({
      typ: "favorit",
      datum: f.created_at ?? new Date(0).toISOString(),
      titel: estate?.title ?? `Objekt (ID ${f.estate_id})`,
      details: estate ? `${estate.postcode} ${estate.city}`.trim() : `Objekt-ID: ${f.estate_id}`,
    });
  }

  for (const s of suchauftraegeRes.data ?? []) {
    ereignisse.push({
      typ: "suchauftrag",
      datum: s.created_at ?? new Date(0).toISOString(),
      titel: s.label || "Suchauftrag",
      details: `${s.query}${s.notify ? " · Benachrichtigung aktiv" : ""}`,
    });
  }

  // Neueste zuerst, konsistent mit der übrigen Sortierung im Cockpit.
  ereignisse.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());

  return NextResponse.json({
    ok: true,
    ereignisse,
    konto: {
      existiert: Boolean(matchedUser),
      bestaetigt: Boolean(matchedUser?.email_confirmed_at ?? matchedUser?.confirmed_at ?? null),
      letzterLogin: matchedUser?.last_sign_in_at ?? null,
    },
    dublette: bewertungen.length > 1,
  });
}

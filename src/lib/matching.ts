/**
 * Matching-Tool für Suchaufträge — server-only.
 *
 * Erkennt NEU online gegangene Objekte und benachrichtigt Konto-Nutzer, deren
 * gespeicherte Suchen (saved_searches, notify=true) darauf passen, per Mail
 * mit Objektkarte + Link auf die Objektseite (Kundenwunsch: „Matching-Tool").
 *
 * Ablauf (runMatching, idempotent, von /api/matching/run per Cron getriggert):
 *   1. Aktive Live-Objekte laden (nur echte OnOffice-Quelle, nie Mock).
 *   2. Abgleich mit `matching_seen` (Supabase): Ids, die dort fehlen, sind
 *      NEU online. Erster Lauf überhaupt (Tabelle leer) seedet nur und
 *      verschickt nichts — sonst würde der komplette Bestand als „neu" gelten.
 *   3. Suchaufträge mit notify=true laden, je Nutzer matchen
 *      (parseFilters/filterEstates — exakt dieselbe Logik wie das Portal,
 *      inkl. Umkreis über umkreis_ort/umkreis + ort_lat/ort_lng).
 *   4. Bereits Verschicktes überspringen (`matching_sent`, ein Eintrag je
 *      Nutzer+Objekt), EINE Sammel-Mail je Nutzer senden, Versand loggen.
 *
 * Fail-soft überall: fehlende Tabellen/kein Supabase/kein Resend führen zu
 * einer klaren Fehlermeldung im Summary, nie zu einem Throw in der Route.
 */
import { getEstateData } from "@/lib/estates";
import { filterEstates, parseFilters } from "@/lib/portal-filter";
import { filterByRadius, readCenter, readRadiusKm } from "@/components/portal/umkreis";
import { supabaseServer } from "@/lib/supabase-server";
import { sendMail, emailLayout, emailTargets } from "@/lib/email";
import { formatEUR } from "@/lib/format";
import type { Estate } from "@/lib/mock-estates";

export interface MatchingSummary {
  ok: boolean;
  /** "seeded" = Erstlauf (nur Baseline geschrieben), "ran" = normaler Lauf. */
  mode?: "seeded" | "ran";
  error?: string;
  aktiveObjekte?: number;
  neueObjekte?: number;
  gepruefteSuchen?: number;
  /** Konto-Suchprofile mit gesetzten Präferenzen (seit 18.08.2026 gematcht). */
  gepruefteProfile?: number;
  mails?: number;
  details?: { email: string; objekte: string[] }[];
}

/** Suchauftrag-Query (URL-Querystring) gegen einen Objekt-Pool matchen. */
export function matchQuery(estates: Estate[], query: string): Estate[] {
  const sp = new URLSearchParams(query);
  const obj: Record<string, string> = {};
  sp.forEach((v, k) => {
    obj[k] = v;
  });
  const f = parseFilters(obj);
  // Umkreis-Modus: Ort liegt in umkreis_ort (parseFilters kennt ihn nicht) —
  // erst die übrigen Filter, dann der Radius um den Ort (mit Photon-Fallback-
  // Zentrum aus ort_lat/ort_lng, s. umkreis.ts). Exakt-Modus: filterEstates
  // filtert bereits über f.ort.
  const km = readRadiusKm(sp);
  const umkreisOrt = sp.get("umkreis_ort") ?? "";
  let r = filterEstates(estates, f);
  if (km > 0 && umkreisOrt) {
    r = filterByRadius(r, umkreisOrt, km, readCenter(sp));
  }
  return r;
}

/**
 * Suchprofil aus /konto (profiles.preferences) — seit 18.08.2026 ans Matching
 * angeschlossen (Fall Alex: Profil „Objektart Haus" gespeichert, nie eine Mail
 * bekommen — das Profil versprach Benachrichtigungen, war aber an NICHTS
 * angebunden; nur Portal-Suchaufträge lösten Mails aus).
 */
interface ProfilPrefs {
  rolle?: string;
  objektarten?: string[];
  regionen?: string[];
  preisMax?: string;
  zimmerMin?: string;
}

/** Profil-Labels → Portal-Kategorien (OBJEKTARTEN in profile-form.tsx). */
const OBJEKTART_SLUG: Record<string, string> = {
  Wohnung: "wohnung",
  Haus: "haus",
  "Grundstück": "grundstueck",
  Gewerbe: "gewerbe",
};

/** „800.000" → 800000; „1.500.000+" = nach oben offen → null (kein Limit). */
function parseProfilPreisMax(s?: string): number | null {
  if (!s || s.includes("+")) return null;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Profil-Präferenzen gegen einen Objekt-Pool matchen. Bewusst NUR
 * Kaufobjekte: das Profil fragt „Budget bis (€)" — gegen eine Kaltmiete
 * verglichen wäre jeder Mietpreis „im Budget". Mietinteressenten speichern
 * ihre Suche im Portal (Suchauftrag), der beides sauber trennt.
 *
 * Ohne jedes Kriterium (weder Objektart noch Region gewählt) wird NICHT
 * gematcht — sonst bekäme ein leeres Profil jeden Neuzugang (Spam-Schutz).
 * Leere Regionen bei gewählter Objektart heißen dagegen bewusst „überall":
 * genau der Fall, in dem die Umkreis-Falle exakter Ort-Suchaufträge entfällt.
 */
export function matchProfil(estates: Estate[], p: ProfilPrefs): Estate[] {
  if (p.rolle === "verkauf") return [];
  const arten = (p.objektarten ?? []).map((a) => OBJEKTART_SLUG[a]).filter(Boolean);
  const regionen = (p.regionen ?? []).map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (arten.length === 0 && regionen.length === 0) return [];
  const preisMax = parseProfilPreisMax(p.preisMax);
  const zimmerMin = parseInt(p.zimmerMin ?? "", 10) || null;
  return estates.filter((e) => {
    if (e.marketingType !== "kauf") return false;
    if (arten.length > 0 && !arten.includes(e.category)) return false;
    if (regionen.length > 0 && !regionen.includes(e.city.trim().toLowerCase())) return false;
    if (zimmerMin != null && !(e.rooms != null && e.rooms >= zimmerMin)) return false;
    // Preis unbekannt („auf Anfrage") passiert den Budget-Filter bewusst —
    // lieber ein relevanter Treffer mit Preis auf Anfrage als gar keiner.
    if (preisMax != null && e.price != null && e.price > 0 && e.price > preisMax) return false;
    return true;
  });
}

const eurOrLabel = (e: Estate) =>
  e.price != null && e.price > 0 ? `${formatEUR(e.price)} · ${e.priceLabel}` : "Preis auf Anfrage";

/** E-Mail-sichere Objektkarte (Tabelle, Inline-Styles, absolute URLs). */
function estateCard(e: Estate, base: string): string {
  const href = `${base}/immobilien/${e.slug}`;
  const img = e.images[0]
    ? `<a href="${href}"><img src="${e.images[0]}" width="536" alt="" style="display:block;width:100%;height:auto;border:0;border-radius:12px 12px 0 0;"></a>`
    : "";
  const facts = [
    e.livingArea ? `${e.livingArea} m² Wohnfläche` : null,
    e.rooms ? `${e.rooms} Zimmer` : null,
    [e.postcode, e.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" &middot; ");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #e4e8f0;border-radius:12px;">
<tr><td>${img}</td></tr>
<tr><td style="padding:16px 18px 6px;"><a href="${href}" style="color:#141724;font-size:16px;font-weight:700;text-decoration:none;line-height:1.4;">${e.title}</a></td></tr>
<tr><td style="padding:0 18px;color:#6b7590;font-size:13px;line-height:1.6;">${facts}</td></tr>
<tr><td style="padding:8px 18px 16px;color:#015cff;font-size:15px;font-weight:700;">${eurOrLabel(e)}</td></tr>
</table>`;
}

/**
 * Betreff + HTML der Matching-Mail — separat exportiert, damit
 * scripts/preview-matching-mail.mts dieselbe Mail als Preview verschicken
 * kann (etabliertes Muster wie beim Report).
 */
export function buildMatchingMail(zuSenden: Estate[]): { subject: string; html: string } {
  const base = emailTargets.ASSET_BASE;
  const mehrzahl = zuSenden.length > 1;
  return {
    subject: mehrzahl
      ? `${zuSenden.length} neue Objekte passend zu Ihrem Suchauftrag`
      : `Neu online: ${zuSenden[0]?.title ?? "Ihr Suchauftrag hat einen Treffer"}`,
    html: emailLayout({
      heading: mehrzahl ? `${zuSenden.length} neue Objekte für Ihre Suche` : "Neues Objekt für Ihre Suche",
      intro:
        "Zu Ihrem Suchauftrag ist soeben etwas Passendes online gegangen. Schnell sein lohnt sich: gute Objekte sind in unserer Region oft nach wenigen Tagen vergeben.",
      bodyHtml: zuSenden.map((e) => estateCard(e, base)).join(""),
      ctaLabel: "Alle Objekte im Portal ansehen",
      ctaHref: `${base}/immobilien`,
    }),
  };
}

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseServer!.auth.admin.getUserById(userId);
    if (error) return null;
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function runMatching(opts?: { dry?: boolean }): Promise<MatchingSummary> {
  if (!supabaseServer) return { ok: false, error: "supabase_not_configured" };

  const { estates, source } = await getEstateData();
  if (source !== "onoffice") return { ok: false, error: "estates_not_live" };
  const aktive = estates.filter((e) => e.status === "aktiv");
  if (aktive.length === 0) return { ok: false, error: "no_active_estates" };

  // Baseline lesen — Tabellenfehler (Migration fehlt) klar melden.
  const seenRes = await supabaseServer.from("matching_seen").select("estate_id");
  if (seenRes.error) return { ok: false, error: `matching_seen: ${seenRes.error.message}` };
  const seen = new Set((seenRes.data ?? []).map((r) => r.estate_id as string));

  const neue = aktive.filter((e) => !seen.has(e.id));

  // Baseline fortschreiben — außer im dry-Modus: ein Probelauf lässt alles
  // unangetastet und „verbraucht" den echten Lauf nicht.
  if (!opts?.dry && neue.length > 0) {
    const { error } = await supabaseServer
      .from("matching_seen")
      .upsert(neue.map((e) => ({ estate_id: e.id })), { onConflict: "estate_id" });
    if (error) return { ok: false, error: `matching_seen upsert: ${error.message}` };
  }

  // Erstlauf: nur Baseline schreiben, keine Mails (sonst gilt ALLES als neu).
  if (seen.size === 0) {
    return { ok: true, mode: "seeded", aktiveObjekte: aktive.length, neueObjekte: 0, mails: 0 };
  }
  if (neue.length === 0) {
    return { ok: true, mode: "ran", aktiveObjekte: aktive.length, neueObjekte: 0, gepruefteSuchen: 0, mails: 0 };
  }

  const searchRes = await supabaseServer
    .from("saved_searches")
    .select("user_id,label,query,notify")
    .eq("notify", true);
  if (searchRes.error) return { ok: false, error: `saved_searches: ${searchRes.error.message}` };
  const searches = searchRes.data ?? [];

  // Je Nutzer: Treffer über alle Suchen vereinigen (eine Mail pro Lauf).
  const byUser = new Map<string, Map<string, Estate>>();
  for (const s of searches) {
    const treffer = matchQuery(neue, (s.query as string) ?? "");
    if (treffer.length === 0) continue;
    const m = byUser.get(s.user_id as string) ?? new Map<string, Estate>();
    for (const e of treffer) m.set(e.id, e);
    byUser.set(s.user_id as string, m);
  }

  // Suchprofile aus /konto zusätzlich matchen (seit 18.08.2026) — dieselbe
  // Nutzer-Vereinigung + derselbe matching_sent-Dedupe: Wer Suchauftrag UND
  // Profil hat, bekommt trotzdem nur EINE Mail je Objekt.
  const profRes = await supabaseServer
    .from("profiles")
    .select("id,email,preferences")
    .not("preferences", "is", null);
  if (profRes.error) return { ok: false, error: `profiles: ${profRes.error.message}` };
  const profile = profRes.data ?? [];
  const emailByUser = new Map<string, string>();
  for (const p of profile) {
    if (p.email) emailByUser.set(p.id as string, p.email as string);
    const treffer = matchProfil(neue, (p.preferences ?? {}) as ProfilPrefs);
    if (treffer.length === 0) continue;
    const m = byUser.get(p.id as string) ?? new Map<string, Estate>();
    for (const e of treffer) m.set(e.id, e);
    byUser.set(p.id as string, m);
  }

  const details: { email: string; objekte: string[] }[] = [];
  let mails = 0;

  for (const [userId, matchMap] of byUser) {
    // Doppelversand-Schutz: je Nutzer+Objekt nur einmal, über Läufe hinweg.
    const sentRes = await supabaseServer
      .from("matching_sent")
      .select("estate_id")
      .eq("user_id", userId);
    if (sentRes.error) return { ok: false, error: `matching_sent: ${sentRes.error.message}` };
    const already = new Set((sentRes.data ?? []).map((r) => r.estate_id as string));
    const zuSenden = [...matchMap.values()].filter((e) => !already.has(e.id));
    if (zuSenden.length === 0) continue;

    // profiles.email spart den Admin-Lookup; Fallback für reine Suchauftrag-
    // Nutzer ohne Profilzeile bleibt die Auth-Admin-API.
    const email = emailByUser.get(userId) ?? (await emailForUser(userId));
    if (!email) continue;

    details.push({ email, objekte: zuSenden.map((e) => e.title) });
    if (!opts?.dry) {
      const { subject, html } = buildMatchingMail(zuSenden);
      const res = await sendMail({ to: email, subject, html });
      if (!res.ok) continue; // Versandfehler: nicht als gesendet loggen, nächster Lauf versucht es erneut
      const { error } = await supabaseServer
        .from("matching_sent")
        .upsert(zuSenden.map((e) => ({ user_id: userId, estate_id: e.id })), { onConflict: "user_id,estate_id" });
      if (error) return { ok: false, error: `matching_sent upsert: ${error.message}` };
    }
    mails++;
  }

  return {
    ok: true,
    mode: "ran",
    aktiveObjekte: aktive.length,
    neueObjekte: neue.length,
    gepruefteSuchen: searches.length,
    gepruefteProfile: profile.length,
    mails,
    details,
  };
}

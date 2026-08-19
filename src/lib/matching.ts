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
import { createHmac } from "node:crypto";
import { getEstateData } from "@/lib/estates";
import { filterEstates, parseFilters } from "@/lib/portal-filter";
import { filterByRadius, readCenter, readRadiusKm } from "@/components/portal/umkreis";
import { supabaseServer } from "@/lib/supabase-server";
import { sendMail, emailLayout, emailTargets } from "@/lib/email";
import { site } from "@/lib/site";
import { formatEUR } from "@/lib/format";
import { BEISPIEL_TILGUNG_PROZENT, holeBaufiZins, monatsRate, type BaufiZins } from "@/lib/baufi-zins";
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
  /** Abmelde-Flag aus /api/abmelden (One-Click-Unsubscribe der Matching-Mail,
   *  18.08.2026): `false` = Nutzer hat aktiv abbestellt, NICHT mehr matchen.
   *  Fehlt das Feld (alte/unbetroffene Profile), gilt weiter „an". */
  benachrichtigung?: boolean;
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
  // Abmeldung über /api/abmelden gewinnt immer — kein Re-Matching, egal was
  // sonst im Profil steht.
  if (p.benachrichtigung === false) return [];
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

/**
 * E-Mail-sichere Objektkarte (Tabelle, Inline-Styles, absolute URLs) —
 * Redesign 18.08.2026 (Wunsch Alex, „Niveau der PDF-Reportings"): großes
 * Hero-Bild, bis zu 4 Innen-Thumbnails horizontal darunter, Fakten-Spalten
 * im Report-Stil (VERSAL-Labels + fette Werte), Preis prominent in RIEGEL-
 * Blau und bei Kaufobjekten eine Monatsraten-Beispielrechnung zum aktuellen
 * amtlichen Effektivzins (s. baufi-zins.ts).
 */
function estateCard(e: Estate, base: string, zins?: BaufiZins | null): string {
  const href = `${base}/immobilien/${e.slug}`;
  // Hero flach im Querformat halten (Wunsch Alex): Höhen-Deckel 320 px +
  // object-fit:cover — moderne Clients (Apple Mail, Gmail) croppen sauber,
  // Outlook ignoriert object-fit und zeigt das natürliche Seitenverhältnis.
  const hero = e.images[0]
    ? `<a href="${href}"><img src="${e.images[0]}" width="536" height="320" alt="" style="display:block;width:100%;height:320px;object-fit:cover;border:0;border-radius:12px 12px 0 0;"></a>`
    : "";
  // Bis zu 4 weitere Bilder (Innenbereich) als horizontale Reihe — feste
  // Zellbreiten, damit Outlook nicht umbricht; einheitliche 76-px-Höhe.
  const thumbs = e.images.slice(1, 5);
  const thumbRow =
    thumbs.length > 0
      ? `<tr><td style="padding:4px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${thumbs
          .map(
            (src, i) =>
              `<td width="${Math.floor(536 / thumbs.length)}" style="${i > 0 ? "padding-left:4px;" : ""}"><a href="${href}"><img src="${src}" width="${Math.floor(536 / thumbs.length) - (i > 0 ? 4 : 0)}" height="76" alt="" style="display:block;width:100%;height:76px;object-fit:cover;border:0;"></a></td>`,
          )
          .join("")}</tr></table></td></tr>`
      : "";
  const ortszeile = [[e.postcode, e.city].filter(Boolean).join(" "), e.district, e.objectType]
    .filter(Boolean)
    .join(" &middot; ");
  // Fakten-Spalten im Report-Stil: nur belegte Werte, max. 4 Spalten.
  const fakten: { label: string; wert: string }[] = [];
  if (e.livingArea) fakten.push({ label: "Wohnfl&auml;che", wert: `${e.livingArea} m&sup2;` });
  if (e.rooms) fakten.push({ label: "Zimmer", wert: String(e.rooms) });
  if (e.plotArea) fakten.push({ label: "Grundst&uuml;ck", wert: `${e.plotArea} m&sup2;` });
  if (e.energy.energyClass) fakten.push({ label: "Energie", wert: e.energy.energyClass });
  if (fakten.length < 4 && e.energy.year) fakten.push({ label: "Baujahr", wert: String(e.energy.year) });
  const faktenRow =
    fakten.length > 0
      ? `<tr><td style="padding:14px 18px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${fakten
          .slice(0, 4)
          .map(
            (f, i) =>
              `<td style="${i > 0 ? "border-left:1px solid #dbe5fa;padding-left:14px;" : ""}${i < fakten.length - 1 ? "padding-right:14px;" : ""}"><div style="color:#8a90a3;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${f.label}</div><div style="margin-top:3px;color:#141724;font-size:15px;font-weight:700;">${f.wert}</div></td>`,
          )
          .join("")}</tr></table></td></tr>`
      : "";
  // Bis zu 3 Ausstattungs-Highlights — mehr „interessante Facts" ohne Wand aus Text.
  const highlights = (e.features ?? []).slice(0, 3).join(" &middot; ");
  // Monatsraten-Einordnung nur beim Kaufobjekt mit bekanntem Preis: klassische
  // Annuität zum aktuellen amtlichen Effektivzins. Bewusst als „Einordnung"
  // mit vollem Kleingedruckten — kein Finanzierungsangebot (PAngV).
  const rate =
    zins && e.marketingType === "kauf" && e.price != null && e.price > 0
      ? `<tr><td style="padding:14px 18px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3ff;border-radius:12px;"><tr><td style="padding:14px 16px;">
<div style="color:#141724;font-size:15px;font-weight:700;">&asymp; ${formatEUR(monatsRate(e.price, zins.prozent))} monatliche Rate<span style="color:#6b7590;">*</span></div>
<div style="margin-top:4px;color:#6b7590;font-size:11.5px;line-height:1.55;">*Unverbindliche Beispielrechnung, kein Finanzierungsangebot: ${zins.prozent.toString().replace(".", ",")} % effektiver Jahreszins (Wohnungsbaukredite mit &uuml;ber 10 Jahren Zinsbindung, ${zins.quelle}${zins.periode !== "Richtwert" ? `, Stand ${zins.periode}` : ""}) und ${BEISPIEL_TILGUNG_PROZENT} % anf&auml;nglicher Tilgung bei Finanzierung des vollen Kaufpreises, ohne Kaufnebenkosten. Ihre Kondition h&auml;ngt von Eigenkapital und Bonit&auml;t ab.</div>
</td></tr></table></td></tr>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border:1px solid #e4e8f0;border-radius:12px;">
<tr><td>${hero}</td></tr>
${thumbRow}
<tr><td style="padding:16px 18px 0;"><a href="${href}" style="color:#141724;font-size:17px;font-weight:700;text-decoration:none;line-height:1.35;">${e.title}</a></td></tr>
<tr><td style="padding:4px 18px 0;color:#6b7590;font-size:13px;line-height:1.6;">${ortszeile}</td></tr>
${faktenRow}
<tr><td style="padding:12px 18px 0;color:${site.brandColor};font-size:19px;font-weight:800;">${eurOrLabel(e)}</td></tr>
${highlights ? `<tr><td style="padding:6px 18px 0;color:#6b7590;font-size:13px;line-height:1.6;">${highlights}</td></tr>` : ""}
${rate}
<tr><td style="padding:14px 18px 18px;"><a href="${href}" style="display:inline-block;background:${site.brandColor};color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:9px 18px;border-radius:999px;">Objekt ansehen&nbsp;&rarr;</a></td></tr>
</table>`;
}

/**
 * Bis zu `n` „ähnliche Objekte" aus dem aktiven Bestand — Cross-Sell-Sektion
 * unter den Treffer-Karten (Wunsch Alex 18.08.2026). Ähnlichkeit bewusst
 * simpel und erklärbar: gleiche Vermarktungsart ist Pflicht, dann zählen
 * gleiche Kategorie, gleicher Ort und Preisnähe (±40 %) — Objekte ohne Foto
 * fallen raus (die Mini-Karte lebt vom Bild).
 */
export function aehnlicheObjekte(pool: Estate[], zuSenden: Estate[], n = 3): Estate[] {
  const gesendetIds = new Set(zuSenden.map((e) => e.id));
  const ref = zuSenden[0];
  if (!ref) return [];
  const refPreis = ref.price ?? null;
  const bewertet = pool
    .filter((e) => !gesendetIds.has(e.id) && e.status === "aktiv" && e.images.length > 0 && e.marketingType === ref.marketingType)
    .map((e) => {
      let score = 0;
      if (e.category === ref.category) score += 3;
      if (e.city.trim().toLowerCase() === ref.city.trim().toLowerCase()) score += 2;
      if (refPreis != null && e.price != null && e.price > 0 && Math.abs(e.price - refPreis) / refPreis <= 0.4) score += 1;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);
  return bewertet.slice(0, n).map((x) => x.e);
}

/** Kompakte Mini-Karte (Thumb links, Titel/Ort/Preis rechts) für „ähnliche Objekte". */
function miniCard(e: Estate, base: string): string {
  const href = `${base}/immobilien/${e.slug}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid #e4e8f0;border-radius:10px;"><tr>
<td width="150" style="padding:0;"><a href="${href}"><img src="${e.images[0]}" width="150" height="100" alt="" style="display:block;width:150px;height:100px;object-fit:cover;border:0;border-radius:10px 0 0 10px;"></a></td>
<td style="padding:10px 14px;vertical-align:top;">
<a href="${href}" style="display:block;color:#141724;font-size:13.5px;font-weight:700;text-decoration:none;line-height:1.35;">${e.title}</a>
<div style="margin-top:2px;color:#6b7590;font-size:12px;">${[[e.postcode, e.city].filter(Boolean).join(" "), e.livingArea ? `${e.livingArea} m&sup2;` : null, e.rooms ? `${e.rooms} Zi.` : null].filter(Boolean).join(" &middot; ")}</div>
<div style="margin-top:4px;color:${site.brandColor};font-size:13.5px;font-weight:800;">${eurOrLabel(e)}</div>
</td></tr></table>`;
}

/** Kategorie → „Neues Haus" / „Neue Wohnung" (Singular) bzw. Plural-Wort. */
const KATEGORIE_MAIL: Record<string, { singular: string; plural: string }> = {
  haus: { singular: "Neues Haus", plural: "neue Häuser" },
  wohnung: { singular: "Neue Wohnung", plural: "neue Wohnungen" },
  grundstueck: { singular: "Neues Grundstück", plural: "neue Grundstücke" },
  gewerbe: { singular: "Neues Gewerbeobjekt", plural: "neue Gewerbeobjekte" },
};

/**
 * Individuelle Headline direkt aufs Objekt (Wunsch Alex 18.08.2026):
 * „Neues Haus in Ludwigshafen" statt generisch „Neues Objekt für Ihre Suche".
 * Mehrere Treffer: „3 neue Häuser in Speyer & Ludwigshafen"; gemischte
 * Kategorien oder >2 Orte fallen auf „Objekte … in Ihrer Region" zurück.
 */
export function mailHeadline(zuSenden: Estate[]): string {
  const erste = zuSenden[0];
  if (!erste) return "Neues Objekt für Ihre Suche";
  if (zuSenden.length === 1) {
    const k = KATEGORIE_MAIL[erste.category];
    return `${k ? k.singular : "Neues Objekt"} in ${erste.city}`;
  }
  const kategorien = new Set(zuSenden.map((e) => e.category));
  const wort =
    kategorien.size === 1 ? (KATEGORIE_MAIL[erste.category]?.plural ?? "neue Objekte") : "neue Objekte";
  const orte = [...new Set(zuSenden.map((e) => e.city))];
  const wo = orte.length === 1 ? `in ${orte[0]}` : orte.length === 2 ? `in ${orte[0]} & ${orte[1]}` : "in Ihrer Region";
  return `${zuSenden.length} ${wort} ${wo}`;
}

/**
 * Betreff + HTML der Matching-Mail — separat exportiert, damit
 * scripts/preview-matching-mail.mts dieselbe Mail als Preview verschicken
 * kann (etabliertes Muster wie beim Report).
 */
export function buildMatchingMail(
  zuSenden: Estate[],
  zins?: BaufiZins | null,
  aehnliche?: Estate[],
  /** Signierter Link aus abmeldeLink(userId) — fehlt er (kein CRON_SECRET),
   *  wird schlicht keine Abmeldezeile gerendert (fail-soft, s. abmeldeLink). */
  abmeldeUrl?: string,
): { subject: string; html: string } {
  const base = emailTargets.ASSET_BASE;
  const mehrzahl = zuSenden.length > 1;
  const aehnlichHtml =
    aehnliche && aehnliche.length > 0
      ? `<div style="margin:26px 0 10px;color:#8a90a3;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Das k&ouml;nnte Sie auch interessieren</div>${aehnliche
          .map((e) => miniCard(e, base))
          .join("")}`
      : "";
  // Kleine, unaufdringliche Abmeldezeile unter dem CTA (Wunsch: One-Click-
  // Unsubscribe UND ein sichtbarer Link im Mail-Text, nicht nur im
  // List-Unsubscribe-Header — der ist für die meisten Nutzer unsichtbar).
  const belowCta = abmeldeUrl
    ? `<p style="margin:14px 0 0;color:#a3a9ba;font-size:11px;line-height:1.5;"><a href="${abmeldeUrl}" style="color:#a3a9ba;text-decoration:underline;">Diese Objekt-Benachrichtigungen abbestellen</a></p>`
    : "";
  return {
    subject: mehrzahl
      ? `${zuSenden.length} neue Objekte passend zu Ihrem Suchauftrag`
      : `Neu online: ${zuSenden[0]?.title ?? "Ihr Suchauftrag hat einen Treffer"}`,
    html: emailLayout({
      heading: mailHeadline(zuSenden),
      badge: "Vorab-Zugriff für RIEGEL-Kunden &middot; vor allen anderen informiert",
      intro:
        "Zu Ihrem Suchauftrag ist soeben etwas Passendes online gegangen. Schnell sein lohnt sich: gute Objekte sind in unserer Region oft nach wenigen Tagen vergeben.",
      bodyHtml: zuSenden.map((e) => estateCard(e, base, zins)).join("") + aehnlichHtml,
      ctaLabel: "Alle Objekte im Portal ansehen",
      ctaHref: `${base}/immobilien`,
      belowCta,
    }),
  };
}

/**
 * Signierter Abmeldelink für /api/abmelden (One-Click-Unsubscribe der
 * Matching-Mail, 18.08.2026). Kein eigenes Secret nötig — CRON_SECRET schützt
 * bereits /api/matching/run und ist damit serverseitig ohnehin vorhanden.
 * Token = HMAC-SHA256(CRON_SECRET, userId) als Hex, von /api/abmelden mit
 * timingSafeEqual gegengeprüft (s. dort).
 *
 * Fail-soft: fehlt CRON_SECRET (z. B. lokale Entwicklung ohne Env), liefert
 * die Funktion `null` — buildMatchingMail lässt den Abmeldelink dann einfach
 * weg, statt eine kaputte URL zu verschicken.
 */
export function abmeldeLink(userId: string): string | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const token = createHmac("sha256", secret).update(userId).digest("hex");
  return `${emailTargets.ASSET_BASE}/api/abmelden?u=${encodeURIComponent(userId)}&t=${token}`;
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

  /**
   * Baseline fortschreiben — bewusst NICHT hier oben, sondern erst ganz am
   * Ende jedes Erfolgspfads aufgerufen (Fix 18.08.2026, vorher Datenverlust-
   * Bug): stand der Upsert schon VOR Suchauftrags-/Profil-Abgleich und
   * Versand, riss ein danach abbrechender Lauf (z. B. saved_searches- oder
   * matching_sent-Query schlägt fehl) die Tages-Objekte für immer aus dem
   * Matching — sie galten ab dann als „schon gesehen", ohne je gematcht oder
   * verschickt worden zu sein. Jetzt gilt: nur ein Lauf, der bis zum Ende
   * durchläuft, schreibt die Baseline fort. Bricht er vorher mit ok:false ab,
   * sieht der nächste Lauf dieselben Objekte erneut als „neu" — Doppel-Mails
   * verhindert weiterhin matching_sent (Versand ist idempotent), nur die
   * Baseline-Fortschreibung wiederholt sich dann harmlos.
   *
   * Dry-Modus: kein Write, ein Probelauf lässt alles unangetastet und
   * „verbraucht" den echten Lauf nicht.
   */
  const commitBaseline = async (): Promise<string | undefined> => {
    if (opts?.dry || neue.length === 0) return undefined;
    const { error } = await supabaseServer!
      .from("matching_seen")
      .upsert(neue.map((e) => ({ estate_id: e.id })), { onConflict: "estate_id" });
    return error ? `matching_seen upsert: ${error.message}` : undefined;
  };

  // Erstlauf: nur Baseline schreiben, keine Mails (sonst gilt ALLES als neu).
  if (seen.size === 0) {
    const baselineError = await commitBaseline();
    if (baselineError) return { ok: false, error: baselineError };
    return { ok: true, mode: "seeded", aktiveObjekte: aktive.length, neueObjekte: 0, mails: 0 };
  }
  if (neue.length === 0) {
    // neue ist hier leer → commitBaseline ist ein No-Op; der Aufruf bleibt
    // trotzdem stehen, damit dieser Rückgabepfad strukturell wie alle
    // anderen aussieht (kein Sonderfall, an den man beim nächsten Umbau
    // denken müsste).
    const baselineError = await commitBaseline();
    if (baselineError) return { ok: false, error: baselineError };
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

  // Aktuellen Baufi-Effektivzins EINMAL je Lauf holen (nur wenn überhaupt
  // Mails anstehen) — speist die Monatsraten-Beispielrechnung der Objektkarten.
  const zins = byUser.size > 0 ? await holeBaufiZins() : null;

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
      // Abmeldelink je Nutzer (HMAC über userId, s. abmeldeLink) — `undefined`
      // statt `null`, damit buildMatchingMail/sendMail einfach ohne Header
      // bzw. ohne Abmeldezeile weiterlaufen (fail-soft ohne CRON_SECRET).
      const abmeldeUrl = abmeldeLink(userId) ?? undefined;
      const { subject, html } = buildMatchingMail(zuSenden, zins, aehnlicheObjekte(aktive, zuSenden), abmeldeUrl);
      const res = await sendMail({
        to: email,
        // ANTWORTEN MÜSSEN ANKOMMEN (Frage Sissy 19.08.2026): Ohne Reply-To
        // geht eine Kundenantwort an die Absenderadresse auf der Versand-
        // Subdomain — deren MX zeigt auf den Resend-Eingang, nicht auf ein
        // RIEGEL-Postfach; die Antwort wäre praktisch verloren. Reply-To auf
        // das echte Postfach (EMAIL_TO, MX auf Microsoft 365) macht aus jeder
        // Objekt-Mail einen funktionierenden Rückkanal.
        replyTo: emailTargets.TO,
        subject,
        html,
        // RFC 8058 One-Click-Unsubscribe: Gmail/Outlook/Apple Mail zeigen bei
        // gesetztem List-Unsubscribe(-Post) einen eigenen „Abbestellen"-Button
        // im Client-UI, der die URL per POST aufruft — /api/abmelden nimmt
        // dafür GET UND POST an (identische Logik).
        ...(abmeldeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${abmeldeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      });
      if (!res.ok) continue; // Versandfehler: nicht als gesendet loggen, nächster Lauf versucht es erneut
      const { error } = await supabaseServer
        .from("matching_sent")
        .upsert(zuSenden.map((e) => ({ user_id: userId, estate_id: e.id })), { onConflict: "user_id,estate_id" });
      if (error) return { ok: false, error: `matching_sent upsert: ${error.message}` };
    }
    mails++;
  }

  // Erst hier, nach vollständig durchgelaufener Versand-Schleife, die
  // Baseline fortschreiben (s. Kommentar bei commitBaseline weiter oben).
  const baselineError = await commitBaseline();
  if (baselineError) return { ok: false, error: baselineError };

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

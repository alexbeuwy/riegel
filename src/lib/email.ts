import { Resend } from "resend";
import { site } from "./site";

/**
 * Transaktions-E-Mails via Resend (serverseitig). Aktiv, sobald RESEND_API_KEY
 * gesetzt ist. Ohne Key wird nichts versendet (kein Crash) — Daten bleiben dann
 * nur lokal. FROM/TO über Env überschreibbar.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Absender. Der Fallback ist Resends Sandbox-Domain und damit eine STILLE
 * FALLE: Von `onboarding@resend.dev` stellt Resend ausschließlich an die
 * Adresse des Kontoinhabers zu. Fehlt EMAIL_FROM in der Produktion, verschickt
 * die Seite also weiter fehlerfrei aussehende Mails, die bei keinem einzigen
 * Kunden ankommen — kein Fehlercode, kein Bounce, nichts.
 *
 * Der Fallback bleibt trotzdem stehen, weil lokale Entwicklung sonst gar nicht
 * mehr senden könnte. Aber in der Produktion wird er einmal beim Laden des
 * Moduls laut protokolliert, statt lautlos zu greifen.
 *
 * Produktiv gehört hier eine Adresse auf der bei Resend VERIFIZIERTEN Domain
 * hinein: `m.riegel-immobilien.de` (nicht die Hauptdomain, die weist Resend ab
 * — nachgemessen). Die Antworten der Kunden landen unabhängig davon richtig,
 * dafür sorgt das Reply-To auf TO weiter unten.
 */
const FROM_FALLBACK = "RIEGEL Immobilien <onboarding@resend.dev>";
/**
 * EMAIL_FROM defensiv parsen statt roh durchreichen.
 *
 * Anlass (02.08.2026): Die Variable wurde im Vercel-Dashboard ohne die
 * schließende spitze Klammer gespeichert ("RIEGEL Immobilien <info@…de").
 * Resend versucht dann, die verstümmelte Domain aufzulösen, und beantwortet
 * JEDEN Versand mit 503 "DNS resolution failure" — zwei Tage lang kam kein
 * einziger Report mehr an, ohne dass es irgendwo sichtbar wurde (gegen die
 * Resend-API nachgestellt: identischer Wert mit Klammer → 200, ohne → 503).
 *
 * Der Parser zieht Name und Adresse aus dem Wert heraus, egal ob die Klammer
 * fehlt, doppelt ist oder Anführungszeichen drumhängen, und baut den Header
 * neu. Nur wenn sich gar keine Adresse finden lässt, greift der Fallback —
 * dann laut, denn von der Sandbox-Adresse stellt Resend nur an den
 * Kontoinhaber zu.
 */
function parseFrom(roh: string | undefined): string {
  if (!roh || !roh.trim()) return FROM_FALLBACK;
  const s = roh.trim().replace(/^["']|["']$/g, "");
  const m = s.match(/([^\s<>"']+@[^\s<>"',;]+)/);
  if (!m) {
    console.error(`[email] EMAIL_FROM enthält keine E-Mail-Adresse ("${s.slice(0, 40)}…") — Fallback auf die Sandbox-Adresse, die NUR an den Kontoinhaber zustellt.`);
    return FROM_FALLBACK;
  }
  const adresse = m[1].replace(/\.+$/, "");
  const name = s.slice(0, s.indexOf(m[1])).replace(/[<>"']/g, "").trim();
  const gebaut = name ? `${name} <${adresse}>` : adresse;
  if (gebaut !== s) console.warn(`[email] EMAIL_FROM war fehlerhaft formatiert und wurde zu "${gebaut}" repariert.`);
  return gebaut;
}
const FROM = parseFrom(process.env.EMAIL_FROM);
if (!process.env.EMAIL_FROM && process.env.NODE_ENV === "production") {
  console.error(
    "[email] EMAIL_FROM ist nicht gesetzt. Es wird die Resend-Sandbox-Adresse verwendet, " +
      "die NUR an den Kontoinhaber zustellt — Kundenmails kommen damit nicht an.",
  );
}
/**
 * Empfänger der internen Benachrichtigungen und zugleich Reply-To der
 * Kundenmails. Bewusst die HAUPTdomain: dort liegen die echten Postfächer
 * (MX auf Microsoft 365). Die Versand-Subdomain m.riegel-immobilien.de nimmt
 * zwar Mail an, ihr MX zeigt aber auf Resends Eingang, nicht auf ein Postfach
 * bei RIEGEL — eine Antwort dorthin liefe ins Leere.
 */
const TO = process.env.EMAIL_TO || "info@riegel-immobilien.de";

// Absolute Basis-URL für Assets in Mails — E-Mail-Clients laden nie relative
// Pfade, das Logo bräuchte sonst eine volle URL pro Client-Render. site.ts hat
// bereits die kanonische Produktions-Domain (site.url) — die nutzen wir als
// Fallback, bevor wir "irgendeine" Vercel-URL erfinden.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || site.url;
// E-Mail-Assets (Logo etc.) leiten sich jetzt von site.url ab: die kanonische
// Domain ist erreichbar und liefert email-logo-riegel-dark.png verifiziert mit
// 200/image-png aus (per curl geprüft). Eine absolute URL ist hier zwingend,
// ein Mail-Client hat beim Rendern keinen Origin-Kontext und könnte einen
// relativen Bildpfad nicht auflösen (PNG statt SVG, weil SVG in Gmail/Outlook
// unzuverlässig rendert, s. Kommentarblock unten). EMAIL_ASSET_BASE bleibt als
// Notausstieg per Env erhalten, falls Mail-Assets künftig doch von einer
// anderen Domain als die Website selbst ausgeliefert werden sollen.
const EMAIL_ASSET_BASE = process.env.EMAIL_ASSET_BASE || site.url;
// PNG statt SVG: SVG rendert in Gmail/Outlook unzuverlässig. Seit dem Redesign
// (helle Karte, weißer Hintergrund) brauchen wir die DUNKLE Logo-Variante —
// das alte weiße "email-logo-riegel.png" wäre auf Weiß unsichtbar. Absolute
// URL nötig (E-Mail hat keinen Origin-Kontext).
const LOGO_URL = `${EMAIL_ASSET_BASE}/email-logo-riegel-dark.png`;

/**
 * E-Mail-Realität, die dieses Layout berücksichtigt (bitte beim Ändern im Kopf
 * behalten):
 *
 * 1) Custom-Fonts (Akira, Webfonts allgemein) werden in den meisten Mail-
 *    Clients (Gmail, Outlook, viele mobile Clients) beim Rendern GESTRIPPT —
 *    @font-face/<link>-Fonts sind in HTML-Mails unzuverlässig bis wirkungslos.
 *    Der markenkonforme, e-mail-sichere Ersatz für den Akira-"Superheadline"-
 *    Look: eine große, fette, GROSSBUCHSTABEN-Headline mit Letter-Spacing in
 *    Helvetica/Arial Bold (System-Font, überall verfügbar).
 * 2) SVG-Bilder werden von Outlook Desktop (Win32, Word-Rendering-Engine)
 *    GAR NICHT dargestellt — nicht "manchmal", sondern grundsätzlich nicht.
 *    Zusätzlich blocken viele Clients (Gmail, Outlook.com) extern verlinkte
 *    Bilder standardmäßig, bis der Empfänger sie freigibt. Ein <img alt="…">
 *    reicht daher NICHT als Fallback: manche Clients zeigen bei blockiertem/
 *    gebrochenem Bild ein hässliches Broken-Image-Icon + alt-Text, der sich
 *    mit eigenem Markup überlappt (in Chrome selbst beobachtet, als die
 *    Produktions-Domain aus site.ts das Logo noch nicht auslieferte).
 *    Robuste Lösung hier: Logo-<img> mit alt="RIEGEL Immobilien" (für
 *    Outlook per MSO-Kommentar komplett ausgeblendet, da dort ohnehin nie
 *    darstellbar), PLUS ein immer sichtbarer Text-Wordmark ("RIEGEL
 *    IMMOBILIEN") als echtes HTML direkt darunter — unabhängig vom
 *    Bild-Ladezustand. So wirkt die Mail nie "leer", auch ganz ohne Bilder,
 *    und nie doppelt/kaputt, wenn das Bild fehlschlägt.
 * 3) Redesign auf helles Karten-Layout (weiße Karte auf pastelligem
 *    Blaugrau-Hintergrund, RIEGEL-Blau #015cff als einziger Farbakzent): dafür
 *    jetzt die DUNKLE Logo-Variante (statt der alten weißen), da Weiß-auf-
 *    Weiß unsichtbar wäre. `color-scheme: light` im <head> ist ein Hinweis an
 *    Clients, die ihn respektieren (Apple Mail, iOS/Android-Mail-Apps,
 *    neueres Outlook Desktop) — Gmail-Webmail und Outlook.com ignorieren
 *    dieses Meta-Tag komplett und wenden ggf. ihre eigene Dark-Mode-Heuristik
 *    an. Das ist hier unkritischer als beim alten dunklen Layout: diese
 *    Heuristiken invertieren vor allem dunkle/transparente Layouts, ein
 *    echtes helles Layout (weiße Karte, dunkler Text) lassen die meisten
 *    Clients ohnehin weitgehend in Ruhe. Eine 100%-Garantie gegen
 *    Dark-Mode-Eigenmächtigkeiten einzelner Clients gibt es aber ehrlicherweise
 *    nicht.
 */

/**
 * Geometrisch anmutender, e-mail-sicherer Font-Stack für Headlines. Spotifys
 * „Circular"-Look lässt sich in HTML-Mails nicht einbetten (Webfonts werden
 * gestrippt, s. Realitäts-Kommentar oben); Helvetica Neue ist die nächste
 * überall vorhandene geometrische Annäherung. Der eigentliche „Circular"-
 * Charakter entsteht hier ohnehin mehr aus Bold + engem Tracking (-0.02em) +
 * normaler Groß-/Kleinschreibung als aus der exakten Schrift.
 */
const HEADING_FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

/** de-DE Euro ohne Nachkommastellen — für die Report-Bausteine unten. */
const eur0 = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/**
 * Bulletproof CTA-Button: kein reiner `<a style="background:…">`-Button (den
 * ignoriert Outlook Desktop teils, v. a. bei abgerundeten Ecken), sondern das
 * Standard-E-Mail-Pattern aus Tabelle + MSO-VML-Roundrect-Fallback für Outlook
 * und einem echten `<a>` für alle anderen Clients (Gmail, Apple Mail, mobil).
 */
function ctaButton(label: string, href: string): string {
  // Defense-in-Depth (Sicherheits-Audit 08/2026): href wird für den
  // Attribut-Kontext escaped, damit ein „ aus einer (idealerweise schon am
  // Ursprung validierten) URL nie aus dem href-Attribut ausbrechen kann.
  // Schützt ALLE Mail-Aufrufer, nicht nur den Feedback-CTA. Eine legitime URL
  // enthält keines dieser Zeichen roh; nur die kaufmännische Und-Verknüpfung
  // (&) mehrerer Query-Parameter wird korrekt als &amp; kodiert.
  const safeHref = String(href)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td>
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="#015cff">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${safeHref}" style="background:#015cff;border-radius:999px;color:#ffffff;display:inline-block;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;padding:14px 28px;text-align:center;text-decoration:none;-webkit-text-size-adjust:none;">${label}</a>
<!--<![endif]-->
</td></tr></table>`;
}

/**
 * Heller, markenkonformer RIEGEL-Mail-Rahmen (email-safe, Inline-Styles):
 * weiße Karte mit großen Radien auf pastelligem Blaugrau-Hintergrund,
 * RIEGEL-Blau (#015cff) als einziger Farbakzent — bewusst kein Pink/Grün.
 *
 * Neue Parameter (optional, Default-Verhalten für bestehende Aufrufer aus
 * booking/contact/report unverändert):
 * - ctaLabel/ctaHref: rendert einen blauen Bulletproof-Button unter bodyHtml.
 */
export function emailLayout(opts: {
  heading: string;
  intro?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaHref?: string;
}): string {
  const cta = opts.ctaLabel && opts.ctaHref ? ctaButton(opts.ctaLabel, opts.ctaHref) : "";
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#eef1f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4e8f0;border-radius:20px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
<tr><td style="padding:28px 32px 0;">
<!--[if !mso]><!-->
<!-- Echtes Logo-PNG (dunkle Variante fürs helle Layout); alt trägt den Markennamen, falls Bilder blockiert sind. -->
<img src="${LOGO_URL}" width="220" alt="RIEGEL Immobilien" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:220px;max-width:70%;margin:0;">
<!--<![endif]-->
<!--[if mso]>
<div style="color:#141724;font-size:17px;font-weight:800;letter-spacing:3px;line-height:1;">RIEGEL<span style="color:#6b7590;font-weight:400;">&nbsp;IMMOBILIEN</span></div>
<![endif]-->
</td></tr>
<tr><td style="padding:14px 32px 24px;border-bottom:1px solid #e4e8f0;"><div style="width:56px;height:4px;line-height:4px;font-size:0;background:#015cff;border-radius:2px;">&nbsp;</div></td></tr>
<tr><td style="padding:34px 32px 8px;"><h1 style="margin:0 0 14px;color:#141724;font-family:${HEADING_FONT};font-size:28px;font-weight:800;line-height:1.16;letter-spacing:-0.02em;">${opts.heading}</h1>${
    opts.intro ? `<p style="margin:0 0 18px;color:#5a6072;font-size:15px;line-height:1.6;">${opts.intro}</p>` : ""
  }${opts.bodyHtml ?? ""}${cta}</td></tr>
<tr><td style="padding:22px 32px;border-top:1px solid #e4e8f0;"><p style="margin:0;color:#8a90a3;font-size:12px;line-height:1.6;">RIEGEL Immobilien &middot; Wormser Stra&szlig;e 13, 67346 Speyer &middot; 06232 100 10 10</p></td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Label/Wert-Zeilen als Tabelle — liegt jetzt in einem weich getönten,
 * abgerundeten RIEGEL-Blau-Info-Block (statt nackter Zeilen direkt auf der
 * weißen Kartenfläche). API unverändert (Array aus {label, value} → HTML-
 * String) — die bestehenden Aufrufer in contact/booking/inquiry/report
 * bauen weiterhin exakt dieselben Arrays, nur die Optik ändert sich.
 */
export function emailRows(rows: { label: string; value: string }[]): string {
  const filled = rows.filter((r) => r.value);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;background:#eef3ff;border-radius:16px;"><tr><td style="padding:6px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filled
    .map((r, i) => {
      // Letzte Zeile ohne Trennlinie — sonst sitzt eine Linie direkt vor dem
      // unteren Innenabstand des Info-Blocks.
      const border = i < filled.length - 1 ? "border-bottom:1px solid #dbe5fa;" : "";
      return `<tr><td style="padding:12px 0;${border}color:#6b7590;font-size:13px;width:38%;vertical-align:top;">${r.label}</td><td style="padding:12px 0;${border}color:#141724;font-size:14px;">${r.value}</td></tr>`;
    })
    .join("")}</table>
</td></tr></table>`;
}

/* ─────────────────────  Bausteine der Kunden-Report-Mail  ─────────────────────
 * Zentral hier, damit die echte Versand-Route (api/report) und die HTML-
 * Vorschau (api/mail-preview) garantiert dasselbe rendern. Ziel des Redesigns
 * (Wunsch Alex): Die Mail soll das angehängte PDF nicht verstecken, sondern
 * aktiv darauf hinführen — die vollständigen Objekt-/Kennzahl-Listen stehen im
 * PDF, die Mail zeigt nur den Aufhänger (Wert), ein paar kompakte Eckdaten und
 * einen deutlichen Callout zum Anhang. */

/** Report-Headline mit „als PDF-Anhang"-Akzent (HTML, wird als heading übergeben). */
export const REPORT_HEADING_HTML =
  `Ihr persönlicher Marktwert-Report` +
  `<span style="display:block;margin-top:8px;color:#015cff;font-size:16px;font-weight:700;letter-spacing:-0.01em;">als PDF-Anhang</span>`;

/** Wert-Hero: der große geschätzte Marktwert samt Spanne — der Aufhänger. */
export function reportValueHero(v: { mid: number; low: number; high: number; perSqm?: number }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;background:#eef3ff;border:1px solid #dbe5fa;border-radius:16px;">
<tr><td style="padding:22px 24px;text-align:center;">
<div style="color:#6b7590;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Geschätzter Marktwert</div>
<div style="color:#015cff;font-family:${HEADING_FONT};font-size:40px;font-weight:800;letter-spacing:-0.02em;margin:8px 0 4px;">${eur0(v.mid)}</div>
<div style="color:#5a6072;font-size:14px;">Spanne ${eur0(v.low)} – ${eur0(v.high)}${v.perSqm ? ` · ${eur0(v.perSqm)}/m²` : ""}</div>
</td></tr></table>`;
}

/**
 * Kompakte Eckdaten in ZWEI Spalten (statt der langen Objektdaten-/Kennzahl-
 * Tabellen — die stehen vollständig im PDF). Nimmt {label,value}-Paare, zeigt
 * nur die befüllten, klein und dicht. Ungerade Anzahl → letzte Zelle leer.
 */
export function reportMiniFacts(rows: { label: string; value: string }[]): string {
  const f = rows.filter((r) => r.value);
  if (!f.length) return "";
  const cell = (r?: { label: string; value: string }) =>
    r
      ? `<td width="50%" style="padding:9px 10px;vertical-align:top;">
<div style="color:#8a90a3;font-size:10px;letter-spacing:1px;text-transform:uppercase;">${r.label}</div>
<div style="color:#141724;font-size:14px;font-weight:700;letter-spacing:-0.01em;margin-top:2px;">${r.value}</div></td>`
      : `<td width="50%" style="padding:9px 10px;">&nbsp;</td>`;
  let body = "";
  for (let i = 0; i < f.length; i += 2) body += `<tr>${cell(f[i])}${cell(f[i + 1])}</tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 16px;background:#f5f7fc;border-radius:14px;"><tr><td style="padding:8px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
</td></tr></table>`;
}

/**
 * PDF-Teaser: deutet die Grafiken/Fakten des PDF an (eine kleine, farblich
 * ausblendende Balken-Andeutung — „gefadeter" Chart als Preview) und listet in
 * zwei Spalten, was drinsteht. Der Fade entsteht über die Balken-FARBE (von
 * Vollton zu hellem Blau), nicht über CSS-Masken — die rendern in Outlook nicht.
 */
export function reportPdfTeaser(): string {
  const bars = [22, 34, 28, 44, 38, 52, 46, 60];
  const barColors = ["#015cff", "#1f6bff", "#3d7dff", "#5f93ff", "#82abff", "#a6c3ff", "#c4d7fb", "#dbe6fb"];
  const chart = bars
    .map(
      (h, i) =>
        `<td style="padding:0 2px;vertical-align:bottom;"><div style="height:${h}px;line-height:${h}px;font-size:0;background:${barColors[i]};border-radius:3px 3px 0 0;">&nbsp;</div></td>`,
    )
    .join("");
  const inhalt = [
    "📊 Werttreiber-Analyse",
    "📈 Preis-Zusammensetzung",
    "🗺️ Lage &amp; Bodenrichtwert",
    "🏘️ Vergleichsobjekte aus Ihrer Region",
  ];
  let rowsHtml = "";
  for (let i = 0; i < inhalt.length; i += 2) {
    rowsHtml += `<tr><td width="50%" style="padding:5px 8px 5px 0;color:#3a4150;font-size:13px;">${inhalt[i]}</td><td width="50%" style="padding:5px 0;color:#3a4150;font-size:13px;">${inhalt[i + 1] ?? ""}</td></tr>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;background:#f5f7fc;border:1px solid #e4e8f0;border-radius:16px;"><tr><td style="padding:18px 20px;">
<div style="color:#8a90a3;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">Ein Blick ins PDF</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:60px;"><tr valign="bottom">${chart}</tr></table>
<div style="height:1px;line-height:1px;font-size:0;background:#dbe5fa;margin:2px 0 12px;">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
</td></tr></table>`;
}

/**
 * Großer, dunkler Callout ganz unten mit Pfeil nach unten — der klare
 * Fingerzeig „öffne den PDF-Anhang". Der Pfeil ist ein echtes Unicode-Zeichen
 * in einem runden blauen Kreis (kein Bild → immer sichtbar, auch bei
 * geblockten Grafiken).
 */
export function reportPdfCallout(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;background:#141724;border-radius:16px;"><tr><td style="padding:26px 24px;text-align:center;">
<div style="width:44px;height:44px;line-height:44px;border-radius:999px;background:#015cff;color:#ffffff;font-size:22px;font-weight:700;margin:0 auto 14px;text-align:center;">&#8595;</div>
<div style="color:#ffffff;font-family:${HEADING_FONT};font-size:19px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;">Alle Informationen im Detail im PDF</div>
<div style="color:#9aa3b8;font-size:13px;line-height:1.6;margin-top:8px;">Öffnen Sie den <strong style="color:#c4d3ff;">PDF-Anhang</strong> dieser E-Mail — mit Lagekarte, Werttreibern, Vergleichsobjekten und der vollständigen Aufstellung.</div>
</td></tr></table>`;
}

export async function sendMail(opts: {
  to?: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string | Buffer }[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!resend) return { ok: false, skipped: true };
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to || TO,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      ...(opts.cc ? { cc: opts.cc } : {}),
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    });
    // Resend liefert ein Fehler-OBJEKT ({name, message, statusCode}) — ein
    // nacktes String(error) ergäbe nur "[object Object]" und hat beim ersten
    // Prod-Versand die eigentliche Ursache verschluckt.
    if (error) return { ok: false, error: error.message || JSON.stringify(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// ASSET_BASE bleibt als eigener Export bestehen (u. a. für matching.ts und
// api/expose/confirm): SITE_URL und ASSET_BASE zeigen per Default beide auf
// site.url, sind aber über getrennte Env-Variablen unabhängig voneinander
// überschreibbar, falls Seiten-Links und Mail-Assets doch einmal
// unterschiedliche Domains brauchen.
export const emailTargets = { FROM, TO, SITE_URL, ASSET_BASE: EMAIL_ASSET_BASE };

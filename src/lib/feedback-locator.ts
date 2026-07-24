/**
 * Kompakter Payload für den Deep-Link aus der Feedback-Mail: er trägt genug,
 * damit feedback-highlight.tsx die kommentierte Stelle auf der Live-Seite
 * wiederfindet (Text-Ausschnitt + grober CSS-Pfad + Scrollposition) und
 * Sissys Kommentar + einen fertigen Claude-Code-Prompt anzeigen kann.
 *
 * Kodierung: URL-sicheres Base64 (base64url) von JSON — isomorph (Server-Route
 * kodiert, Client-Komponente dekodiert), UTF-8-fest (Umlaute) über
 * TextEncoder/TextDecoder, kein Node-Buffer (läuft auch im Client-Bundle).
 * Kurze Schlüssel halten die URL mailclient-tauglich klein.
 */
export interface FeedbackLocator {
  /** yPct: vertikale Position (0..100) der Klickstelle (Pin + Fallback-Scroll). */
  y: number;
  /** xPct: horizontale Position (0..100, viewport-relativ) der Klickstelle (Pin). */
  x: number;
  /** Text-Ausschnitt des Elements (Primär-Anker fürs Wiederfinden). */
  t: string;
  /** Grober CSS-Pfad (max. 4 Ebenen, s. feedback-widget.tsx cssPath). */
  p: string;
  /** Kommentar (gekürzt) für Popup + Prompt. */
  c: string;
}

/** Query-Parametername des Deep-Links. */
export const FEEDBACK_PARAM = "fb";
const COMMENT_CAP = 500;

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFeedbackLocator(loc: {
  y: number;
  x: number;
  text: string;
  path: string;
  comment: string;
}): string {
  const payload: FeedbackLocator = {
    y: Math.round(loc.y) || 0,
    x: Math.round(loc.x) || 0,
    t: (loc.text || "").slice(0, 120),
    p: (loc.path || "").slice(0, 240),
    c: (loc.comment || "").slice(0, COMMENT_CAP),
  };
  return b64urlEncode(JSON.stringify(payload));
}

/**
 * Fertiger Claude-Code-Prompt zu einer Feedback-Stelle — geteilt zwischen dem
 * Deep-Link-Popup (feedback-highlight.tsx) und dem Intern-Ticket-Board.
 */
export function buildFeedbackPrompt(path: string, loc: FeedbackLocator): string {
  const stelle = loc.t ? `„${loc.t}"${loc.p ? ` (${loc.p})` : ""}` : loc.p || "siehe unten";
  const kontext = [`Seite: ${path}`, `Stelle: ${stelle}`];
  if (loc.y) kontext.push(`Ungefähre Klickposition: ${loc.x}% von links, ${loc.y}% der Seitenhöhe.`);
  return [
    "Änderung auf der RIEGEL-Website umsetzen.",
    "",
    ...kontext,
    "",
    "Feedback vom Team:",
    loc.c || "(kein Kommentartext übermittelt)",
    "",
    "Bitte die zuständige Komponente/Datei finden und die Änderung sauber umsetzen (tsc/eslint/Build grün, dann committen und pushen).",
  ].join("\n");
}

/**
 * Sammel-Prompt über MEHRERE offene Feedback-Tickets — ein Kopiervorgang, eine
 * Claude-Code-Session für alle Punkte (token-effizienter als Einzel-Aufträge:
 * der Codebase-Kontext wird nur einmal aufgebaut, ein Build/Commit am Ende).
 */
export function buildFeedbackBatchPrompt(
  tickets: { pageUrl: string; area: string; comment: string }[],
): string {
  const bloecke = tickets.map((t, i) => {
    const parsed = t.area ? parseFeedbackArea(t.area) : null;
    const stelle = parsed?.t
      ? `„${parsed.t}"${parsed.p ? ` (${parsed.p})` : ""}`
      : parsed?.p || t.area || "keine Stelle markiert (allgemeiner Kommentar)";
    const pos = parsed ? `Ungefähre Klickposition: ${parsed.x}% von links, ${parsed.y}% der Seitenhöhe.` : null;
    return [
      `--- Ticket ${i + 1} von ${tickets.length} ---`,
      `Seite: ${t.pageUrl || "/"}`,
      `Stelle: ${stelle}`,
      ...(pos ? [pos] : []),
      "Kommentar:",
      t.comment,
    ].join("\n");
  });
  return [
    `Feedback-Tickets von der RIEGEL-Website umsetzen (${tickets.length} offene Kommentare vom Team).`,
    "",
    ...bloecke.flatMap((b) => [b, ""]),
    "Bitte alle Tickets nacheinander umsetzen: je Ticket die zuständige Komponente/Datei finden und die Änderung sauber machen. Am Ende einmal tsc/eslint/Build grün, dann committen und pushen. Tickets, die unklar oder mehrdeutig sind, NICHT raten, sondern am Ende gesammelt als Rückfragen auflisten.",
  ].join("\n");
}

/**
 * Menschlichen `area`-String des Feedback-Widgets (z. B.
 * `<span> "Text…" · main#content > section.py-24 · ca. 34%/87% der Seite`)
 * zurück in Locator-Bausteine parsen — für Alt-Tickets im Intern-Board, deren
 * strukturierter Locator nur in der Mail steckt. `null`, wenn das Format nicht
 * passt (dann gibt es im Board nur den Prompt ohne Deep-Link).
 */
export function parseFeedbackArea(area: string): { t: string; p: string; x: number; y: number } | null {
  const m = area.match(/^<[^>]+>(?:\s+"([^"]*)")?\s+·\s+(.+?)\s+·\s+ca\.\s+(\d+)%\/(\d+)%/);
  if (!m) return null;
  return { t: m[1] ?? "", p: m[2] ?? "", x: Number(m[3]) || 50, y: Number(m[4]) || 0 };
}

export function decodeFeedbackLocator(raw: string | null | undefined): FeedbackLocator | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(b64urlDecode(raw));
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    return {
      y: typeof o.y === "number" ? o.y : 0,
      x: typeof o.x === "number" ? o.x : 50,
      t: typeof o.t === "string" ? o.t : "",
      p: typeof o.p === "string" ? o.p : "",
      c: typeof o.c === "string" ? o.c : "",
    };
  } catch {
    return null;
  }
}

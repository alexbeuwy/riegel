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
  /** yPct: vertikale Position (0..100) der Stelle als Fallback-Scrollziel. */
  y: number;
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
  text: string;
  path: string;
  comment: string;
}): string {
  const payload: FeedbackLocator = {
    y: Math.round(loc.y) || 0,
    t: (loc.text || "").slice(0, 120),
    p: (loc.path || "").slice(0, 240),
    c: (loc.comment || "").slice(0, COMMENT_CAP),
  };
  return b64urlEncode(JSON.stringify(payload));
}

export function decodeFeedbackLocator(raw: string | null | undefined): FeedbackLocator | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(b64urlDecode(raw));
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    return {
      y: typeof o.y === "number" ? o.y : 0,
      t: typeof o.t === "string" ? o.t : "",
      p: typeof o.p === "string" ? o.p : "",
      c: typeof o.c === "string" ? o.c : "",
    };
  } catch {
    return null;
  }
}

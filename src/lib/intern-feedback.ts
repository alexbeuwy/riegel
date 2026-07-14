/**
 * Status-Verwaltung der On-Page-Feedback-Kommentare (Sissy) fürs /intern-Board.
 *
 * Persistenz OHNE Schema-Änderung: In dieser Datenbank existiert KEINE
 * key/value-Tabelle (site_settings fehlt). Der Bearbeitungsstatus liegt daher
 * in EINER Sentinel-Zeile der bestehenden `feedback`-Tabelle — feste id +
 * page_url-Marker, deren `comment`-Feld die JSON-Statuskarte
 * { feedbackId: { status, note, at } } hält. Diese Zeile wird beim Anzeigen aus
 * der Kommentar-Liste herausgefiltert. So braucht es kein zusätzliches SQL.
 */

/** Feste id der Status-Sentinel-Zeile in der feedback-Tabelle. */
export const FEEDBACK_STATUS_ROW_ID = "00000000-0000-0000-0000-000000000001";
/** page_url-Marker der Sentinel-Zeile (zur Sicherheit zusätzlich zur id). */
export const FEEDBACK_STATUS_MARKER = "__feedback_status__";

export type FeedbackState = "done" | "open";

export interface FeedbackStatusEntry {
  status: FeedbackState;
  /** Kurze Notiz, was erledigt wurde (optional). */
  note?: string;
  /** ISO-Zeitpunkt der letzten Statusänderung. */
  at?: string;
}

export type FeedbackStatusMap = Record<string, FeedbackStatusEntry>;

/** Robustes Parsen der im comment-Feld der Sentinel-Zeile gespeicherten JSON-Karte. */
export function parseFeedbackStatus(value: unknown): FeedbackStatusMap {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as FeedbackStatusMap) : {};
  } catch {
    return {};
  }
}

/**
 * Deutsche Zahleneingaben tolerant parsen — Kundenfall Manfred: "32,35" m²
 * ergab über Number() NaN und der Rechner "warf keinen Preis raus".
 *
 * Akzeptiert: "32,35" (Dezimal-Komma), "1.234" / "1.234,56" (Tausenderpunkt),
 * "32.35" (Dezimal-Punkt), Einheiten-Reste wie "120 m²" oder "450 €".
 * `undefined` bei leer/unlesbar — Aufrufer behandeln das wie ein leeres Feld.
 * Geteilt zwischen Rechner-Client (calculator.tsx) und Server-Nachrechnung
 * (/api/report), damit beide identisch interpretieren.
 */
export function parseDeZahl(raw: string | number | undefined | null): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  const s = (raw ?? "").trim();
  if (!s) return undefined;
  const normalized = s.includes(",")
    ? // Komma = Dezimaltrenner, alle Punkte davor sind Tausenderpunkte.
      s.replace(/\./g, "").replace(/,/g, ".")
    : // Ohne Komma: Punkte nur als Tausenderpunkte werten, wenn exakt 3
      // Ziffern folgen (1.234 → 1234), sonst Dezimalpunkt lassen (32.35).
      s.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const cleaned = normalized.replace(/[^\d.+-]/g, "");
  // Ohne Ziffer wäre Number("") = 0 — reine Buchstaben-Eingaben ("abc")
  // sollen aber als unlesbar gelten, nicht als 0.
  if (!/\d/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

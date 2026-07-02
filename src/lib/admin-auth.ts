import { createHash, timingSafeEqual } from "crypto";

// SHA-256 beider Seiten → gleiche Länge, damit timingSafeEqual nutzbar ist.
const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** Konstante-Zeit-Vergleich gegen ADMIN_PASSWORD. Gibt eine generische Fehlermeldung
 *  zurück (kein Unterschied zwischen "falsches Passwort" und "nicht konfiguriert"
 *  nach außen) — Details nur in den Server-Logs. */
export function checkAdminPassword(given: string | undefined): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin-auth] ADMIN_PASSWORD ist nicht gesetzt.");
    return { ok: false, status: 503, error: "Zugriff derzeit nicht möglich." };
  }
  if (!given || !timingSafeEqual(sha256(given), sha256(expected))) {
    return { ok: false, status: 401, error: "Zugriff verweigert." };
  }
  return { ok: true };
}

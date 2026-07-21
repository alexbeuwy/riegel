/** Zentrale Schlüssel für die "site_settings"-Tabelle — von der API-Route
 *  UND der Seite gemeinsam genutzt, damit kein Tippfehler den Bezug zerreißt. */
export const HERO_IMAGE_KEY = "home_hero_image";

/** Dynamisch über /intern eingeladene E-Mail-Adressen fürs Intern-Portal.
 *  Wert ist ein JSON-Array aus lowercase-E-Mails (als String gespeichert).
 *  Ergänzt die feste Allowlist in intern-access.ts, ohne dass dafür ein neues
 *  Deploy nötig ist (s. internInvitedEmails dort). */
export const INTERN_INVITED_KEY = "intern_invited_emails";

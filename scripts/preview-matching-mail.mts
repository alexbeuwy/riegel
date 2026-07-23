/**
 * Preview der Suchauftrag-Matching-Mail an alex@beuwy.com — echte Objekte aus
 * OnOffice (die 2 zuletzt geänderten aktiven Kauf-Objekte mit Foto), dieselbe
 * Mail wie im echten Matching-Lauf (buildMatchingMail in lib/matching.ts).
 *
 *   npx tsx --env-file=.env.local scripts/preview-matching-mail.mts
 */
import { fetchOnOfficeEstates } from "../src/lib/onoffice";
import { buildMatchingMail, matchQuery } from "../src/lib/matching";
import { sendMail } from "../src/lib/email";

const estates = (await fetchOnOfficeEstates()) ?? [];
if (estates.length === 0) {
  console.error("Keine Live-Objekte — Abbruch.");
  process.exit(1);
}

// Matching-Logik einmal echt ausführen (Beispiel-Suchauftrag: Häuser, Kauf).
const treffer = matchQuery(estates.filter((e) => e.status === "aktiv"), "typ_obj=haus");
const auswahl = treffer.filter((e) => e.images.length > 0).slice(0, 2);
if (auswahl.length === 0) {
  console.error("Kein aktives Haus mit Foto gefunden — Abbruch.");
  process.exit(1);
}
console.log("Preview-Objekte:", auswahl.map((e) => `${e.title} (${e.city})`));

const { subject, html } = buildMatchingMail(auswahl);
const res = await sendMail({ to: "alex@beuwy.com", subject: `[PREVIEW] ${subject}`, html });
console.log(res.ok ? "Preview-Mail an alex@beuwy.com versendet." : `Versand fehlgeschlagen: ${res.error}`);

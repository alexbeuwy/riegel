/**
 * Erzeugt die drei Supabase-Auth-Mailvorlagen nach docs/supabase-mails/.
 *
 * Sie entstehen aus GENAU demselben Layout wie alle uebrigen RIEGEL-Mails
 * (emailLayout in src/lib/email.ts). Von Hand nachgebaut waeren sie beim ersten
 * Layoutwechsel auseinandergelaufen; so genuegt ein erneuter Lauf.
 *
 * Die Vorlagen selbst werden im Supabase-Dashboard eingetragen (Authentication
 * -> Emails -> Templates), nicht vom Code verschickt — Supabase versendet die
 * Bestaetigungs- und Passwortmails selbst. Vorgehen: docs/supabase-auth-mail.md.
 *
 * Die {{ .ConfirmationURL }}-Platzhalter sind Supabase-Syntax und bleiben roh
 * stehen; Supabase ersetzt sie beim Versand.
 *
 *   npx tsx scripts/gen-supabase-mails.mts
 */
import { writeFile } from "node:fs/promises";
import { emailLayout } from "@/lib/email";

const vorlagen: { datei: string; betreff: string; html: string }[] = [
  {
    datei: "bestaetigung",
    betreff: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
    html: emailLayout({
      heading: "Nur noch ein Klick",
      intro:
        "Sie haben ein Konto bei RIEGEL Immobilien angelegt. Bitte bestätigen Sie Ihre E-Mail-Adresse, dann steht Ihnen Ihre Merkliste und der Exposé-Zugang offen.",
      bodyHtml:
        '<p style="margin:0 0 4px;color:#5a6072;font-size:15px;line-height:1.6;">Der Link ist 24 Stunden gültig.</p>',
      ctaLabel: "E-Mail-Adresse bestätigen",
      ctaHref: "{{ .ConfirmationURL }}",
    }).replace(
      "</table></td></tr></table></body>",
      `</table></td></tr></table>
<div style="max-width:600px;margin:14px auto 0;padding:0 16px;color:#8a90a3;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;text-align:center;">
Falls der Button nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
<span style="color:#5a6072;word-break:break-all;">{{ .ConfirmationURL }}</span><br><br>
Sie haben sich nicht registriert? Dann ignorieren Sie diese E-Mail einfach, es wird kein Konto aktiviert.
</div></body>`,
    ),
  },
  {
    datei: "passwort-zuruecksetzen",
    betreff: "Neues Passwort für Ihr RIEGEL-Konto",
    html: emailLayout({
      heading: "Passwort zurücksetzen",
      intro:
        "Sie haben ein neues Passwort für Ihr Konto bei RIEGEL Immobilien angefordert. Über den Button vergeben Sie es direkt.",
      bodyHtml:
        '<p style="margin:0 0 4px;color:#5a6072;font-size:15px;line-height:1.6;">Der Link ist eine Stunde gültig. Ihr bisheriges Passwort bleibt gültig, bis Sie ein neues vergeben.</p>',
      ctaLabel: "Neues Passwort vergeben",
      ctaHref: "{{ .ConfirmationURL }}",
    }).replace(
      "</table></td></tr></table></body>",
      `</table></td></tr></table>
<div style="max-width:600px;margin:14px auto 0;padding:0 16px;color:#8a90a3;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;text-align:center;">
Falls der Button nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
<span style="color:#5a6072;word-break:break-all;">{{ .ConfirmationURL }}</span><br><br>
Sie haben das nicht angefordert? Dann ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.
</div></body>`,
    ),
  },
  {
    datei: "adresse-aendern",
    betreff: "Neue E-Mail-Adresse bestätigen",
    html: emailLayout({
      heading: "Neue Adresse bestätigen",
      intro:
        "Für Ihr Konto bei RIEGEL Immobilien wurde eine neue E-Mail-Adresse hinterlegt. Bitte bestätigen Sie die Änderung.",
      bodyHtml:
        '<p style="margin:0 0 4px;color:#5a6072;font-size:15px;line-height:1.6;">Bisher: {{ .Email }}<br>Neu: {{ .NewEmail }}</p>',
      ctaLabel: "Änderung bestätigen",
      ctaHref: "{{ .ConfirmationURL }}",
    }).replace(
      "</table></td></tr></table></body>",
      `</table></td></tr></table>
<div style="max-width:600px;margin:14px auto 0;padding:0 16px;color:#8a90a3;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;text-align:center;">
Sie haben das nicht veranlasst? Dann melden Sie sich bitte bei uns: 06232 100 10 10.
</div></body>`,
    ),
  },
];

for (const v of vorlagen) {
  const pfad = `docs/supabase-mails/${v.datei}.html`;
  await writeFile(pfad, v.html + "\n");
  console.log(`${pfad}  (${v.html.length} Zeichen)  Betreff: ${v.betreff}`);
}

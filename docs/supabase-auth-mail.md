# Supabase-Auth: Mailversand auf Resend umstellen

Stand 31.07.2026. Zu erledigen im Supabase-Dashboard, Projekt `xbtpadxnesqrzhnhfcyx`.
Aus dem Code heraus nicht machbar: Projekteinstellungen laufen über die
Management-API, und die verlangt einen persönlichen Zugriffstoken (`sbp_…`).
Weder der Publishable Key noch der Secret Key noch der Service-Role-Key reichen
dafür — alle drei nachgemessen, alle drei HTTP 401.

## Was passiert ist

Sissy bekam beim Anlegen eines Kontos `email rate limit exceeded` zu sehen.
Resend stand zeitgleich bei 170 von 3.000 Mails im Monat und 1 von 100 am Tag,
war also nicht die Ursache. Der Deckel kommt von Supabase selbst.

Über die Auth-Admin-API nachgemessen:

| Zeitpunkt | Konto | Zustand |
| --- | --- | --- |
| 31.07. 07:10 | ein Kundenkonto | bestätigt, eingeloggt |
| 31.07. 07:17 | ein Kundenkonto | bestätigt, eingeloggt |
| danach | Sissys Versuch | abgewiesen |

In der Datenbank steht **kein einziges unbestätigtes Konto**. Die Registrierung
wurde also abgelehnt, bevor überhaupt ein Nutzer angelegt wurde. Zwei Mails
raus, die dritte blockiert: Das ist der eingebaute Mailversand von Supabase, der
bei zwei Mails pro Stunde deckelt und laut Supabase ausdrücklich nicht für den
Produktivbetrieb gedacht ist. `mailer_autoconfirm` steht auf `false`, jede
Registrierung löst also eine Mail aus.

## 1. Eigenen SMTP-Versand einschalten

**Authentication → Emails → SMTP Settings → Enable Custom SMTP**

| Feld | Wert |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | der Resend-API-Key (derselbe wie `RESEND_API_KEY` in Vercel) |
| Sender email | dieselbe Adresse wie `EMAIL_FROM` in Vercel |
| Sender name | `RIEGEL Immobilien` |

Die Absenderadresse MUSS auf der bei Resend verifizierten Domain liegen, sonst
weist Resend die Mail ab. Resend zeigt unter Settings → Usage „Domains 1 / 1“.

## 2. Das Stundenlimit anheben

**Authentication → Rate Limits → „Rate limit for sending emails“**

Der Wert bleibt auch nach dem Umstellen auf eigenen SMTP niedrig (Standard 30
pro Stunde). Auf **100 pro Stunde** setzen. Nicht höher: Das Limit ist auch ein
Schutz davor, dass jemand über ein Formular massenhaft Mails auslöst.

## 3. Reicht das für hunderte Registrierungen im Monat?

Ja, mit einer Einschränkung, die man im Auge behalten muss.

| Grenze | Wert | Bewertung |
| --- | --- | --- |
| Supabase eingebaut | 2 / Stunde | unbrauchbar, heute bewiesen |
| Resend Free, Monat | 3.000 | reichlich Luft |
| Resend Free, **Tag** | **100** | der eigentliche Engpass |
| Supabase nach Umstellung | frei wählbar | auf 100 / Stunde setzen |

Die Website verschickt aktuell rund 170 Mails im Monat (Wertreports,
Kontaktformulare, Matching). 300 Registrierungen im Monat kämen auf etwa 500
Mails gesamt, also ein Sechstel des Monatskontingents. Unkritisch.

Der Tagesdeckel von 100 ist die Stelle, die kippen kann: Alle Mails der Seite
teilen sich dieses Kontingent. Ein Werbeschub, eine Portal-Kampagne oder ein
Newsletter, der an einem Tag mehr als 100 Mails auslöst, legt ab dann auch die
Registrierungen still. Sobald ein Tag über 60 Mails geht, ist der Wechsel auf
Resend Pro fällig (20 $/Monat, 50.000 Mails, kein Tageslimit).

## 4. Mailvorlagen auf Deutsch umstellen

Supabase verschickt sonst seine englischen Standardvorlagen („Confirm your
signup“). Bei hunderten Nutzern ist das die erste Mail, die jemand von RIEGEL
bekommt.

Unter `docs/supabase-mails/` liegen drei fertige Vorlagen. Sie sind **aus
demselben Layout erzeugt** wie alle übrigen RIEGEL-Mails (`emailLayout` in
`src/lib/email.ts`), nicht nachgebaut — sie sehen also identisch aus und
verändern sich mit, wenn das Layout je angepasst wird (Generator:
`scripts/gen-supabase-mails.mts`).

**Authentication → Emails → Templates**, je Vorlage Betreff und HTML eintragen:

| Supabase-Vorlage | Datei | Betreff |
| --- | --- | --- |
| Confirm signup | `bestaetigung.html` | Bitte bestätigen Sie Ihre E-Mail-Adresse |
| Reset password | `passwort-zuruecksetzen.html` | Neues Passwort für Ihr RIEGEL-Konto |
| Change email address | `adresse-aendern.html` | Neue E-Mail-Adresse bestätigen |

Magic Link und Invite bleiben ungenutzt: Die Seite meldet ausschließlich per
Passwort an, und Einladungen werden nicht verschickt.

Das Logo kommt als absolute URL von `riegel-immobilien.de` (HTTP 200,
`image/png`, geprüft). Ohne `www` — die `www`-Variante antwortet mit 308, und
eine Weiterleitung überleben nicht alle Mail-Clients beim Bildabruf.

## 5. Danach prüfen

Eine Testregistrierung mit einer frischen Adresse durchführen und kontrollieren:

- Die Mail kommt an, auf Deutsch, mit Logo.
- In Resend erscheint der Versand unter Emails (bei Supabase-Bordmitteln stünde
  dort nichts).
- Der Bestätigungslink führt zurück auf `/konto` und nicht auf `localhost`.
  Falls doch: **Authentication → URL Configuration → Site URL** auf
  `https://www.riegel-immobilien.de` setzen.

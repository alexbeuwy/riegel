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
raus, die dritte blockiert.

Die Auth-Konfiguration bestätigt das Wort für Wort:

| Einstellung | Wert am 31.07. | Bedeutung |
| --- | --- | --- |
| `smtp_host` | `null` | kein eigener Versand, Supabase-Bordmittel |
| `rate_limit_email_sent` | `2` | zwei Mails pro Stunde |
| `mailer_autoconfirm` | `false` | jede Registrierung löst eine Mail aus |

## Zwei weitere Fehler, dabei gefunden

Beide betreffen den Live-Betrieb und sind unabhängig vom Mailversand.

**`site_url` zeigt auf die Vercel-Vorschaudomain**
(`https://riegel-alexbeuwys-projects.vercel.app/`), nicht auf
`riegel-immobilien.de`.

**Die echte Domain fehlt in `uri_allow_list` vollständig.** Dort stehen nur
Vercel-Adressen. Der Rechner übergibt beim Registrieren aber
`emailRedirectTo = <origin>/konto` (s. `src/app/konto/page.tsx`), und auf der
Live-Seite ist das `https://riegel-immobilien.de/konto`. Steht ein Ziel nicht
auf der Liste, verwirft Supabase es und fällt auf `site_url` zurück — jeder
Bestätigungslink führt Kundinnen und Kunden derzeit also auf die
Vercel-Vorschaudomain statt auf die Website. Der `?next=`-Parameter aus dem
Exposé-Flow geht dabei ebenfalls verloren.

Zu setzen sind:

```
site_url        https://riegel-immobilien.de
uri_allow_list  https://riegel-immobilien.de,https://riegel-immobilien.de/**,
                https://www.riegel-immobilien.de,https://www.riegel-immobilien.de/**,
                + die bestehenden Vercel-Einträge (sonst brechen Preview-Deployments)
```

Kanonisch ist die **Apex-Domain ohne `www`**: `www.riegel-immobilien.de`
antwortet mit 308 und leitet auf `riegel-immobilien.de` weiter (nachgemessen).
`site.url` im Code führt dieselbe Adresse.

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

**Welche Domain das ist, war von hier aus nicht feststellbar.** Der
Resend-Schlüssel, der in dieser Sitzung vorlag, ist versandbeschränkt (kann
senden, aber keine Domains auflisten), und er akzeptiert als Absender
ausschließlich Resends Sandbox-Domain `resend.dev` — `riegel-immobilien.de`,
`beuwy.com` und die geprüften Subdomains weist er mit „domain is not verified“
ab. Er gehört also zu einem anderen Resend-Konto als das aus dem Dashboard.
Der produktive Schlüssel liegt in Vercel, ist dort aber (wie `EMAIL_FROM`) als
sensitiv markiert und lässt sich über die API nicht zurücklesen.

Beim Eintragen deshalb den Wert aus dem Resend-Dashboard nehmen und die
Absenderadresse gegen die dort verifizierte Domain prüfen. `EMAIL_FROM` in
Vercel führt bereits die richtige Adresse — beide müssen übereinstimmen, sonst
kommen die Auth-Mails von einer anderen Adresse als die übrigen Mails der Seite.

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
- Der Bestätigungslink führt auf `https://riegel-immobilien.de/konto` — nicht
  auf die Vercel-Vorschaudomain. Tut er das noch, ist Schritt „site_url und
  uri_allow_list“ oben nicht vollständig angekommen.

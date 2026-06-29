# RIEGEL E-Mail-Templates (Supabase Auth)

High-End, dark, markenkonform (RIEGEL-Blau #015CFF). Table-basiertes HTML mit
Inline-Styles → läuft in Gmail, Outlook, Apple Mail. Kein externes Bild nötig
(Wortmarke als Text → 100 % zustellbar).

## „Ich bekomme keine Mail!" — zuerst das fixen

Standardmäßig nutzt Supabase einen **eingebauten Test-Mailer mit sehr niedrigem
Limit** (wenige Mails/Stunde) — Mails kommen oft gar nicht oder landen im Spam.
Zwei Wege:

**A) Schnell zum Testen — Bestätigung aus:**
Supabase → **Authentication → Sign In / Providers → Email** → „**Confirm email**" **deaktivieren**.
Dann ist man nach der Registrierung sofort eingeloggt (keine Mail nötig). Unser
Code erkennt das automatisch (kein „Bitte bestätigen"-Hinweis mehr).

**B) Produktiv — eigenes SMTP (empfohlen, zuverlässig + gebrandet):**
Supabase → **Authentication → Emails → SMTP Settings** → eigenen Anbieter eintragen
(z. B. **Resend**, Postmark, Brevo, SendGrid). Absender z. B. `no-reply@riegel-immobilien.de`.
Erst damit sind Zustellung + Marken-Absender verlässlich.

**Außerdem zwingend:** Authentication → **URL Configuration** → *Site URL* =
`https://riegel.vercel.app` (später die echte Domain) und unter *Redirect URLs*
dieselbe Domain ergänzen — sonst zeigen die Bestätigungslinks ins Leere.

## Templates einspielen

Supabase → **Authentication → Emails → Templates**. Pro Vorlage den HTML-Inhalt
der jeweiligen Datei einfügen und den Betreff setzen:

| Supabase-Template | Datei | Betreff-Vorschlag |
|---|---|---|
| Confirm signup | `confirm-signup.html` | RIEGEL Immobilien – E-Mail bestätigen |
| Magic Link | `magic-link.html` | Ihr Login-Link für RIEGEL Immobilien |
| Reset Password | `reset-password.html` | Passwort zurücksetzen – RIEGEL Immobilien |
| Change Email Address | `change-email.html` | Neue E-Mail-Adresse bestätigen – RIEGEL |
| Invite user | `invite.html` | Ihre Einladung zu RIEGEL Immobilien |

Die Templates nutzen die Supabase-Variablen `{{ .ConfirmationURL }}` und
`{{ .Email }}` — bitte unverändert lassen.

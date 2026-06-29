# DSGVO-Check — Stand & offene Punkte

> Kein Rechtsrat. Vor Go-Live anwaltlich prüfen lassen.

## Abgedeckt ✅

- **Datenschutzerklärung** (`/datenschutz`) deckt ab: Verantwortlicher, Betroffenenrechte
  (inkl. Widerruf, Art. 7 Abs. 3), Hosting (Vercel, US + SCC), TLS, Cookies/TDDDG,
  Kontakt, Wertrechner (ohne Kontakt-Gate, direkte Berechnung), **Geokodierung
  (Nominatim/OSM)**, **Karten (CARTO + Esri)**, **Benutzerkonten (Supabase, EU/Frankfurt,
  AVV)**, onOffice-CRM, Adobe Fonts, Social-Links (nur Verlinkung, keine Einbettung),
  Speicherdauer.
- **Impressum** (`/impressum`) und **Widerrufsbelehrung** (`/widerruf`) vorhanden.
- **Kontaktformular**: aktive, widerrufbare Einwilligungs-Checkbox.
- **Social Media**: nur einfache Links (kein Tracking-Embed) → kein Datenabfluss vor Klick.
- **Supabase**: Daten in EU-Region (Frankfurt); Passwörter werden gehasht; RLS aktiv
  (siehe `supabase-schema.sql`) → Nutzer sehen nur eigene Daten.
- **Keine Secrets im Code**; `service_role`-Key nur serverseitig (nicht im Bundle).

## Offen / vor Go-Live zwingend ⚠️

1. **Consent-Banner (CMP) fehlt noch.** Aktuell laden externe Dienste (Adobe Fonts,
   CARTO/Esri-Kacheln, Nominatim) **ohne vorherige Opt-in-Abfrage**. Die
   Datenschutzerklärung formuliert „nach Ihrer Einwilligung" — technisch muss dafür
   ein Consent-Tool davor. Optionen:
   - **CMP einbauen** (Usercentrics/Cookiebot/Klaro oder schlanker Eigenbau) und die
     externen Aufrufe erst nach Opt-in auslösen, **oder**
   - **Fonts self-hosten** (Adobe-Embed entfernen — Inter ist bereits lokal) und
     Karte/Geocoding erst nach aktivem Klick laden („Karte laden"-Platzhalter).
   → Empfehlung: schlanker Consent-Banner + Karten/Geocoding-Click-to-Load. *Baue ich auf Zuruf.*
2. **AV-Verträge (Art. 28 DSGVO)** abschließen: Vercel, Supabase, onOffice, Adobe,
   ggf. SMTP-Anbieter (Resend o. Ä.).
3. **US-Transfer** (Vercel): DPF/SCC dokumentieren.
4. **E-Mail-Versand**: bei externem SMTP den Anbieter als Auftragsverarbeiter ergänzen.
5. **Impressum** mit endgültigen Pflichtangaben final prüfen (USt-IdNr., Aufsichtsbehörde,
   Berufshaftpflicht, ggf. § 34c GewO-Erlaubnis).
6. **Domain-Wechsel**: Verantwortlicher-Adresse + Site-URL/Redirects auf finale Domain.

## Empfohlene nächste Schritte (technisch)

- Consent-Banner implementieren + externe Dienste gaten (1 Tag Arbeit).
- Optional Adobe-Fonts durch self-hosted ersetzen → ein externer Dienst weniger.

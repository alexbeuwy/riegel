# DSGVO-Check — Stand & offene Punkte

> Kein Rechtsrat. Vor Go-Live anwaltlich prüfen lassen.

## Abgedeckt ✅

- **Datenschutzerklärung** (`/datenschutz`) deckt ab: Verantwortlicher, Betroffenenrechte
  (inkl. Widerruf, Art. 7 Abs. 3), Hosting (Vercel, US + SCC), TLS, Cookies/TDDDG,
  Kontakt, Wertrechner (ohne Kontakt-Gate, direkte Berechnung), Geokodierung,
  **Karten (CARTO + Esri)**, **Benutzerkonten (Supabase, EU/Frankfurt, AVV)**,
  onOffice-CRM, Social-Links (nur Verlinkung, keine Einbettung), **Schriftarten
  self-hosted** (§21), Speicherdauer.
- **Impressum** (`/impressum`) und **Widerrufsbelehrung** (`/widerruf`) vorhanden.
- ✅ **Consent-Banner existiert** (`src/components/consent.tsx`): schlanke
  Einwilligungsverwaltung (localStorage, „Alle akzeptieren" / „Nur notwendige",
  jederzeit änderbar) + `MapConsentGate` — **CARTO-/Esri-Karten laden erst nach
  Opt-in bzw. per Click-to-Load** („Karte laden"-Platzhalter).
- ✅ **Fonts self-hosted** (Inter + AKIRA via `next/font/local`): der frühere
  **Adobe-Typekit-Embed ist entfernt** → keine IP-Übermittlung an Adobe, kein
  Consent für Schriften nötig. Adobe ist damit **kein aktiver Dienst mehr**
  (auch kein AVV mit Adobe erforderlich).
- **Kontaktformular**: aktive, widerrufbare Einwilligungs-Checkbox.
- **Social Media**: nur einfache Links (kein Tracking-Embed) → kein Datenabfluss vor Klick.
- **Reels**: self-hosted MP4s (kein Instagram-Embed) → nicht consent-pflichtig.
- **Supabase**: Daten in EU-Region (Frankfurt); Passwörter gehasht; RLS aktiv
  (siehe `supabase-schema.sql`) → Nutzer sehen nur eigene Daten.
- **Keine Secrets im Code**; `service_role`-Key nur serverseitig (nicht im Bundle).

## Offen / vor Go-Live zwingend ⚠️

1. **Geocoding — in Arbeit 🔧**: Die Adress-Autovervollständigung rief OSM-Nominatim
   bisher **direkt aus dem Client** auf (vor Consent, gegen die Nominatim-Usage-Policy —
   Autocomplete verboten). Wird gerade auf einen **serverseitigen Photon-Proxy
   `/api/geocode`** umgestellt (`src/lib/geocode.ts` → eigener Route-Handler; keine
   Client-IP an Dritte, Policy-konform, Rate-Limit). Nach Abschluss:
   Datenschutzerklärung §13 (Nominatim) auf Photon/Proxy anpassen.
   **Vor Ads-Start zwingend** (siehe `optimierung.md`).
2. **AV-Verträge (Art. 28 DSGVO)** abschließen: Vercel, Supabase, onOffice,
   Resend (sobald Versand scharf), BunnyCDN.
3. **US-Transfer** (Vercel, Resend): DPF/SCC dokumentieren.
4. **Impressum** mit endgültigen Pflichtangaben final prüfen (USt-IdNr., Aufsichtsbehörde,
   Berufshaftpflicht, ggf. § 34c GewO-Erlaubnis).
5. **Domain-Wechsel**: Verantwortlicher-Adresse + Site-URL/Redirects auf finale Domain
   (Checkliste in [betrieb.md](./betrieb.md)).

## Erledigt (ehemals offen) ✅

- ~~Consent-Banner (CMP) fehlt~~ → schlanker Eigenbau-Banner + Karten-Click-to-Load live.
- ~~Adobe Fonts als externer Dienst~~ → Embed entfernt, alle Schriften self-hosted;
  „Adobe Fonts" aus der Liste aktiver Dienste gestrichen.

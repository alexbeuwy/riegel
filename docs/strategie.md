# RIEGEL — Produkt- & Technikstrategie

Konsolidierte Strategie zum Relaunch. Ergänzt: `current-state.md`, `build-plan.md`,
`architecture.md`, `fortschritt.md`, `onoffice-integration.md`, `geo-prinzipien.md`.

## 1. Positionierung

> **„Regionale Expertise. Alles andere ist Fast Food."**

Inhabergeführtes Familienunternehmen (Familie Riegel), Standorte Speyer + Ludwigshafen,
Gebiet Vorderpfalz + Rhein-Neckar. Differenzierung: **lokale Tiefe + persönliche Betreuung +
moderne Vermarktung** (Reels/Social, ImmoAward 2025 Top 21 von 25.000+). Gegenpol zu
anonymen Portal-Maklern.

## 2. Drei strategische Säulen

1. **Portal (Akquise & Bindung)** — Airbnb/Zillow-Style: Karte+Liste, Instant-Filter,
   teilbare URLs, „search this area". Ziel: längere Sessions, Wiederkehr über Konten
   (Favoriten, Suchaufträge, Benachrichtigungen).
2. **Conversion-Funnel** — Hero-**Adresseingabe → Immorechner (mit Satellit) → Termin/Kontakt**.
   Der Rechner ist der Lead-Magnet (Bewertung als Einstieg in den Verkäufer-Funnel).
3. **GEO/SEO-Dominanz** — auffindbar bei „Immobilie verkaufen/Makler {Ort}" in allen
   RIEGEL-Orten, klassisch **und** in LLMs (ChatGPT/Perplexity). 28 Standort-/Ratgeberseiten,
   FAQ/Article/Breadcrumb-JSON-LD, `llms.txt`. Skaliert per Content-Workflow.

## 3. Zielgruppen & Funnel

- **Verkäufer (Priorität, Marge):** Rechner → kostenlose Bewertung → Termin. Trust:
  Ø-Vermarktungszeit, Award, Familien-Story, Prozess-Transparenz.
- **Käufer/Mieter:** Portal → Merkliste/Suchauftrag (Konto) → Besichtigungsanfrage.
- **Empfehler/Partner:** Tippgeber, Social Proof.

## 4. Technische Architektur (Ist)

- **Next.js (App Router) + Vercel**, Tailwind v4, dark-first, RIEGEL-Blau #015CFF.
- Fonts **self-hosted** (Inter + Akira) → DSGVO-arm.
- **Daten:** aktuell Mock (`Estate`-Modell) → bald **OnOffice → Supabase `estates`** (Single Source);
  UI bleibt unverändert (siehe `onoffice-integration.md` §8).
- **Konten:** Supabase Auth (env-gated), Favoriten/Suchen-Sync, localStorage-Fallback.
- **Mails:** Resend (`/api/contact`, `/api/booking`) + Supabase-Auth-Mails (SMTP=Resend, Templates da).
- **Consent:** TDDDG-Banner, externe Karten/Luftbilder Click-to-Load.
- **Motion:** transitions-dev-Tokens + t-*-Patterns (Dropdown, Modal, Tabs, Success-Check,
  Error-Shake, Badge, Avatar-Hover, Tilt, Tooltip).

## 5. Roadmap (priorisiert)

**Jetzt / kurzfristig**
- Portal-Politur (dieser Audit): Filter-Edgecases (Min>Max, Miet-/Kauf-Preisraster), Motion-Lücken
  (Chip-Entfernen, Treffer-Pop-in, Skeleton→Reveal), A11y, Mobile-Feinschliff.
- Supabase scharf schalten: SQL-Schema, Auth-Mails (SMTP=Resend), `RESEND_API_KEY`.
- Reels-Quelle wählen (Behold.so / MP4).

**Sobald Keys/Assets da**
- **OnOffice**: 108 Objekte importieren → Mock ersetzen → **Karten-Clustering** aktivieren.
- Echte Team-Porträts + Reel-MP4s.

**Mittelfristig**
- Suchauftrag-**Mail-Benachrichtigung** (Edge-Function + Cron gegen neue Objekte).
- Bewertungs-Engine schärfen (ggf. PriceHubble/Sprengnetter, siehe `preisatlas-research.md`).
- GEO weiter skalieren (mehr Orte/Themen, interne Verlinkung, Aktualität).
- Consent für Geocoding (Nominatim) hart gaten; AV-Verträge; Domain-Cutover.

## 6. Erfolgsmessung (Vorschlag)

- Bewertungs-Starts & -Abschlüsse (Rechner-Funnel), Termin-/Kontaktanfragen.
- Portal-Engagement (Sessions, Favoriten, Suchaufträge, Konten).
- GEO-Sichtbarkeit: Rankings + LLM-Zitationen für „… {Ort}"-Prompts.
- Vermarktungszeit & Lead→Mandat-Quote (CRM/OnOffice).

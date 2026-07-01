# Betrieb & Übergabe — riegel-immobilien.de

Betriebs-Doku für Deploy, Environment, Domain-Cutover. Stand: Juli 2026, App live auf
**riegel.vercel.app** (Production = `main`).
Querverweise: [architecture.md](./architecture.md) · [bunny-cdn.md](./bunny-cdn.md) · [email-templates/README.md](./email-templates/README.md) · [dsgvo-check.md](./dsgvo-check.md)

---

## 1. Environment-Variablen (vollständig, alle `process.env.*` in `src/` + `scripts/`)

| Variable | Zweck | Pflicht? | Wo gesetzt |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL — Auth/Konten, Favoriten-Sync, Suchaufträge, Lead-/Report-Logging (`src/lib/supabase.ts`, `/api/intern`) | Pflicht für Konten & Lead-Speicherung (ohne: App läuft, aber kein Login, alles nur localStorage, kein DB-Log) | Vercel (alle Environments) + lokal `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key (RLS schützt Daten) | wie oben | Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Nur `/api/intern`: liest `valuation_requests` + `leads` unter Umgehung der RLS | Pflicht für das `/intern`-Dashboard | Vercel, **server-only, nie `NEXT_PUBLIC_`** |
| `ADMIN_PASSWORD` | Passwort-Gate des internen Lead-Dashboards (`/intern` → `/api/intern`) | Pflicht für `/intern` (sonst 503 mit Hinweis) | Vercel, server-only |
| `RESEND_API_KEY` | Transaktionsmails via Resend (`/api/contact`, `/api/booking`, `/api/report` inkl. PDF-Anhang) | Optional — ohne Key wird Versand „geskippt" (kein Crash), Leads landen weiter in Supabase. **Aktuell zurückgestellt** (Alex richtet Resend-Account später ein) | Vercel, server-only |
| `EMAIL_FROM` | Mail-Absender; Default `RIEGEL Immobilien <onboarding@resend.dev>` | Optional (für Produktion: verifizierte Domain-Adresse) | Vercel |
| `EMAIL_TO` | Interner Empfänger für Lead-/Report-Mails; Default `info@riegel-immobilien.de` | Optional | Vercel |
| `BUNNY_STORAGE_ZONE` | BunnyCDN-Storage-Zone (`riegel-immobilien`) für Asset-Upload | Nur für `scripts/bunny-upload.mjs` | **nur lokal** `.env.local` (gitignored) |
| `BUNNY_STORAGE_HOST` | Storage-Endpoint; Default `storage.bunnycdn.com` | Optional (Default ok) | `.env.local` |
| `BUNNY_STORAGE_ACCESS_KEY` | **Schreib-/Lösch-Schlüssel** der Storage-Zone | Nur fürs Upload-Script | **nur lokal** `.env.local`, nie ins Repo |
| `BUNNY_CDN_HOST` | Öffentlicher CDN-Host; Default `riegel.b-cdn.net` | Optional (Default ok) | `.env.local` |

**Zukunft (OnOffice-Anbindung, noch nicht im Code):** `ONOFFICE_TOKEN`, `ONOFFICE_SECRET`,
`ONOFFICE_WEBHOOK_SECRET` — server-only, Least-Privilege-API-User (siehe
[onoffice-integration.md](./onoffice-integration.md)).

---

## 2. Deploy-Prozess

- **Push auf `main` → Vercel baut & deployt Production** (riegel.vercel.app). Branches/PRs
  bekommen Preview-Deploys.
- Node **≥ 20.9** (in `package.json` `engines` gepinnt). Lokal: `npm run dev` / `npm run build`
  / `npm run lint`.
- Vercel-Projekt: Framework „Next.js" (war nach dem Import fälschlich „Other" — nicht
  zurückstellen), Deployment-Protection aus.
- Env-Änderungen in Vercel erfordern ein Re-Deploy, um wirksam zu werden.
- Kein CI/Test-Gate; `next build` (inkl. tsc) ist der Qualitäts-Check vor Live.

---

## 3. Domain-Cutover-Checkliste (riegel.vercel.app → riegel-immobilien.de)

Die alte WordPress-Seite (Raidboxes) bleibt bis zum Cutover live. Reihenfolge:

1. **Vorbereitung**
   - [ ] Finale Domain bestätigen; `src/lib/site.ts` → `url` prüfen (steht schon auf
     `https://riegel-immobilien.de`, trägt aber ein TODO „finale Produktions-Domain bestätigen").
     Canonicals, Sitemap, JSON-LD und `llms.txt` hängen alle an `site.url`.
   - [ ] Alte WordPress-URLs für 301-Redirects sammeln (Menü lt. `current-state.md`: Über uns,
     Immobilienverkauf, Finanzierung, Immobilienangebote, Kontakt, Immobilienbewertung; dazu
     rankende Unterseiten aus GSC ziehen).
   - [ ] TODOs in `site.ts` füllen: WhatsApp-Nummer, LinkedIn-URL (nicht cutover-kritisch).
2. **DNS & Redirects**
   - [ ] Domain im Vercel-Projekt hinzufügen, DNS (A/CNAME) von Raidboxes auf Vercel umstellen.
   - [ ] **301-Redirects** der WP-Bestands-URLs auf die neuen Routen einrichten
     (`next.config.ts` `redirects()`), z. B. `/immobilienangebote/*` → `/immobilien`,
     alte Bewertungs-/Rechner-URLs → `/rechner`.
3. **Hartkodierte Links prüfen** (zeigen bereits auf die Zieldomain — bei anderer Domain anpassen)
   - [ ] `/api/report`-Mail: CTA-Button `https://riegel-immobilien.de/termin`.
   - [ ] `src/lib/report-pdf.ts` (PDF-Endblatt): `riegel-immobilien.de/termin`,
     `www.riegel-immobilien.de`, `info@riegel-immobilien.de`, `/impressum`, `/datenschutz`.
   - [ ] `EMAIL_TO`-Default (`src/lib/email.ts`) = `info@riegel-immobilien.de`.
4. **Supabase Auth**
   - [ ] Authentication → URL Configuration → **Site URL** von `https://riegel.vercel.app`
     auf die finale Domain umstellen + Redirect-URLs ergänzen (sonst zeigen
     Bestätigungs-/Reset-Links ins Leere — siehe [email-templates/README.md](./email-templates/README.md)).
   - [ ] Supabase-SMTP auf eigenen Anbieter (Resend) umstellen, Absender `no-reply@riegel-immobilien.de`.
5. **Resend**
   - [ ] Account anlegen (zurückgestellt, macht Alex), Domain `riegel-immobilien.de`
     verifizieren (SPF/DKIM — kostenlose Stufe reicht, 3.000 Mails/Monat).
   - [ ] `RESEND_API_KEY` + `EMAIL_FROM` in Vercel setzen → Versand wird automatisch scharf.
6. **Search/Tracking**
   - [ ] **Google Search Console**: bestehende Property (WP nutzt Google Site Kit) sichern,
     neue Domain-Property verifizieren, `sitemap.xml` einreichen, Indexierung der Kernseiten
     beobachten; ggf. GA-Umzug klären.
7. **Nach dem Cutover**
   - [ ] Datenschutz/Impressum auf Domain-/Anbieterangaben prüfen ([dsgvo-check.md](./dsgvo-check.md)).
   - [ ] Redirects + Canonicals stichprobenartig testen (alte URLs → 301 → neue Seite).
   - [ ] WordPress/Raidboxes erst nach stabiler Indexierung kündigen (Redirect-Quelle!).

---

## 4. Route `/merkliste` („Mein Bereich")

Client-Seite mit zwei Blöcken:

- **Gemerkte Immobilien**: Favoriten (Herz an den Portal-Karten) — Basis ist localStorage
  (`riegel:favorites`, anonym, sofort). Bei Login werden lokale Favoriten mit der
  Supabase-Tabelle `favorites` **gemerged und write-through synchronisiert** (geräteübergreifend).
- **Suchaufträge**: im Portal gespeicherte Filter (`saved_searches` bzw. localStorage), mit
  Link „Suche öffnen" (`/immobilien?<query>`), Entfernen und einem **E-Mail-Alarm-Toggle** —
  der Versand der Alerts (Cron) ist noch nicht gebaut, der Toggle speichert nur `notify`.

Fehlt Supabase-Konfiguration oder ist der Nutzer nicht eingeloggt, funktioniert alles rein
lokal im Browser (kein Crash, Hinweis im Intro-Text der Seite).

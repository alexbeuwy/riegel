# Architektur – riegel-immobilien.de (Ist-Stand)

Greenfield Next.js App auf Vercel (Push-to-`main` = Production, live als **riegel.vercel.app**).
Immobiliendaten laufen aktuell über typisierte **Mock-Fixtures**; OnOffice kommt später über einen Adapter.
Supabase (EU/Frankfurt) ist der Support-Layer (Konten, Favoriten, Suchaufträge, Leads, Bewertungs-Logs).
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) · [betrieb.md](./betrieb.md) · [onoffice-integration.md](./onoffice-integration.md) · [design-system.md](./design-system.md) · [build-plan.md](./build-plan.md) · [bewertungsreport.md](./bewertungsreport.md)

---

## 1. Stack (real, aus `package.json`)

| Layer | Wahl | Anmerkung |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript, React 19** | Server Components + kleine Client-Islands. |
| Hosting | **Vercel** | Git-Push auf `main` = Production-Deploy. |
| Styling | **Tailwind CSS v4** (CSS-first `@theme` in `globals.css`, kein `tailwind.config.ts`) | Token-getrieben, dark-first. **Kein shadcn/ui.** |
| UI/Motion | **Eigene Komponenten** (`src/components/`) + CSS-Transitions (transitions-dev-Tokens in `globals.css`) | **Kein Motion/Framer Motion.** Reveals/Dropdowns/Modals rein per CSS + kleine Hooks, `prefers-reduced-motion`-gated. |
| Icons | **Eigenes Icon-System** (`src/components/icon.tsx`, Inline-SVG) | Keine Icon-Library-Dependency. |
| Fonts | **Inter** (Body, variabel) + **AKIRA Expanded/Outline** (Headlines, sparsam) — self-hosted via `next/font/local` (`src/fonts/`) | Kein Adobe-Typekit-Embed mehr → DSGVO-clean, kein Consent nötig. |
| Karte | **maplibre-gl 5** (Portal-Split-Karte, GEO-Explorer) | Client-only, code-gesplittet (nicht im Startseiten-Bundle). CARTO-Dark-Tiles + Esri-Luftbild, hinter Consent-Gate. |
| PDF | **pdf-lib + @pdf-lib/fontkit** | Serverseitiger Marktwert-Report (`src/lib/report-pdf.ts`), Assets Base64-embedded (`src/lib/report-assets/`). |
| DB/Auth | **Supabase** (`@supabase/supabase-js`, EU Frankfurt, RLS an) | Konten/Login, Favoriten-Sync, Suchaufträge, `valuation_requests`, `leads`. Siehe §5. |
| E-Mail | **Resend** (`src/lib/email.ts`) | Transaktionsmails (Kontakt, Termin, Report mit PDF-Anhang). Ohne `RESEND_API_KEY` wird „geskippt", kein Crash. |
| Formulare/Validation | Eigene Client-Forms + manuelle Validierung in den Route-Handlern | **Kein zod, kein react-hook-form.** |
| Bilder | **next/image**, AVIF→WebP; `remotePatterns`: `riegel.b-cdn.net` (BunnyCDN) + `beuwy.com` | Foto-Assets auf BunnyCDN, Reels-MP4s auf beuwy.com/riegel/. |
| Sprache | de only | `<html lang="de">`. |

---

## 2. Routen (real, `src/app/`)

| Route | Typ | Inhalt |
|---|---|---|
| `/` | SSG | Home: Hero (Adress-Suche), Leistungen, Featured-Angebote, Reels, Award. |
| `/immobilien` | SSG-Shell + Client-Portal | Airbnb/Zillow-Split: Liste + MapLibre-Karte, URL-Filter, Favoriten, „Suche speichern". Mock-Daten. |
| `/immobilien/[slug]` | SSG (`generateStaticParams` über Mocks) | Detailseite: Galerie, Fakten, Energieausweis (§87 GEG), Provision (§656c), `RealEstateListing`-JSON-LD, Besichtigungs-Anfrage. |
| `/rechner` | SSG-Shell + Client-Wizard | Bewertungsrechner (Engine `src/lib/valuation.ts`, client-seitig) → Report-Anfrage an `/api/report`. |
| `/verkaufen` | SSG | Verkaufsprozess/Leistungen. |
| `/standorte` · `/standorte/[slug]` | SSG | GEO-Explorer + **18 Standort-Artikel** (aus `src/content/geo-articles.json`). |
| `/ratgeber` · `/ratgeber/[slug]` | SSG | **16 Ratgeber-Artikel** (gleiche Quelle), FAQ-JSON-LD, Rechner-CTAs. |
| `/ueber-uns` | SSG | Team/Familie Riegel. |
| `/kontakt` | SSG-Shell + Client-Form | Kontaktformular → `/api/contact`. |
| `/termin` | SSG-Shell + Client-Tool | Wunschtermin-Anfrage (Anlass/Ort/Datum/Zeit) → `/api/booking`. Kein Slot-Kalender (geplant). |
| `/konto` | Client | Supabase-Auth (Login/Registrierung), Profil/Suchprofil (`profiles`). |
| `/merkliste` | Client | „Mein Bereich": Merkliste + Suchaufträge (localStorage, bei Login Supabase-Sync). |
| `/intern` | Client, `noindex` | Internes Lead-Dashboard (Passwort) → `/api/intern`. |
| `/impressum` · `/datenschutz` · `/widerruf` | SSG | Legal-Seiten (Entwurf, anwaltlich zu prüfen). **Kein `/agb`.** |
| `/llms.txt` | Route-Handler (`force-static`) | GEO/KI-Index: Direktantworten, Kernseiten, alle Standort-/Ratgeber-Links. |
| `sitemap.xml` · `robots.txt` | `sitemap.ts` / `robots.ts` | Sitemap inkl. Estates + GEO-Artikel; robots erlaubt KI-Crawler explizit. |

**API-Route-Handler** (alle POST, Secrets nur serverseitig):

| Route | Zweck |
|---|---|
| `/api/contact` | Kontaktformular → Resend-Mail (intern + Bestätigung) + Insert `leads`. |
| `/api/booking` | Terminanfrage → Resend-Mail (intern + Bestätigung) + Insert `leads`. |
| `/api/report` | Marktwert-Report: Esri-Luftbild holen → PDF bauen (`report-pdf.ts`) → Mail an Kunde **+** interne Kopie (je mit PDF-Anhang) → Insert `valuation_requests`. |
| `/api/intern` | Lead-Dashboard-Backend: Passwort-Check (`ADMIN_PASSWORD`) → liest `valuation_requests` + `leads` per `service_role`. |
| `/api/geocode` | **In Arbeit:** serverseitiger Photon-Geocoding-Proxy (ersetzt das direkte Client-Nominatim in `src/lib/geocode.ts`). |

---

## 3. Datenfluss (Route-Handler; Server Actions nur geplant)

**Ist:** Client-Formulare posten JSON an die Route-Handler oben. Muster überall gleich:
Escapen/Längen-Limits → Validierung → Resend-Mail(s) → Supabase-Insert (fehlertolerant; ohne Env-Config wird still geloggt/geskippt).

**Geplant (existiert noch nicht):**
- **OnOffice-Client** (`lib/onoffice/`, HMAC-signiert) — Estates statt Mocks; Umschaltung nur über den `mapOnOfficeEstate()`-Adapter (D16).
- **Webhook** `app/api/webhooks/onoffice` → `revalidateTag`/ISR für Live-Listings.
- **Server Actions** für Formulare (aktuell bewusst Route-Handler).
- **Lead-Sync nach OnOffice** (`create address`) inkl. Retry/`onoffice_synced`-Flag.
- **E-Mail-Alerts** für Suchaufträge (Cron).

---

## 4. Secrets / Environment (Ist vs. Zukunft)

Alle Nutzungen von `process.env.*` im Code — vollständige Tabelle mit Zweck/Pflicht in [betrieb.md](./betrieb.md):

```
IST (Vercel):
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   (Client ok, anon + RLS)
SUPABASE_SERVICE_ROLE_KEY                                  (nur /api/intern, server-only)
ADMIN_PASSWORD                                             (/intern-Dashboard)
RESEND_API_KEY, EMAIL_FROM, EMAIL_TO                       (Transaktionsmails)

IST (nur lokal, scripts/bunny-upload.mjs via .env.local):
BUNNY_STORAGE_ZONE, BUNNY_STORAGE_HOST, BUNNY_STORAGE_ACCESS_KEY, BUNNY_CDN_HOST

ZUKUNFT (OnOffice-Anbindung, noch nicht im Code):
ONOFFICE_TOKEN, ONOFFICE_SECRET, ONOFFICE_WEBHOOK_SECRET
```

Regeln: Secrets nie `NEXT_PUBLIC_`, nie im Client-Bundle. Der `service_role`-Key umgeht RLS
und bleibt ausschließlich in Route-Handlern.

---

## 5. Supabase-Datenmodell (real, `docs/supabase-schema.sql`)

EU-Region (Frankfurt), **RLS auf allen Tabellen**.

| Tabelle | Zweck / Kernfelder | Zugriff |
|---|---|---|
| `profiles` | Spiegelt `auth.users` (Trigger `handle_new_user`); `email`, `full_name`, `preferences` (jsonb: Rolle/Objektarten/Regionen/Budget), `early_access` | nur eigenes Profil (`auth.uid() = id`) |
| `favorites` | Merkliste: `user_id` + `estate_id` (PK), Sync mit localStorage bei Login | nur eigene Zeilen |
| `saved_searches` | Suchaufträge: `label`, `query` (Filter-URL-Params), `notify` bool | nur eigene Zeilen |
| `valuation_requests` | Jede Rechner-/Report-Anfrage: Adresse+Geo, Objektdaten, Wertspanne (`value_low/mid/high`), `price_per_sqm`, `confidence`, Kontaktdaten, `report_requested` | Insert für alle (auch anonym); **Lesen nur `service_role`** |
| `leads` | Termin- & Kontaktanfragen: `kind` (`booking`\|`contact`), Name/E-Mail/Telefon, `subject`, `message`, `detail` jsonb | Insert für alle; **Lesen nur `service_role`** |

Auswertung über `/intern` (Passwort + service_role) oder das Supabase-Dashboard.
Auth-Mail-Templates: [email-templates/](./email-templates/README.md).

---

## 6. SEO / GEO (Ist)

- **JSON-LD:** `RealEstateAgent` (inkl. Award, `knowsAbout`, `areaServed`, beide Standorte) im Root-Layout; `RealEstateListing` auf Detailseiten; FAQ-Schema auf GEO-Artikeln.
- **`sitemap.ts`** (statische Routen + Estates + 34 GEO-Artikel), **`robots.ts`** (KI-Crawler explizit erlaubt), `generateMetadata`/Canonicals pro Seite.
- **`/llms.txt` als Route-Handler** (nicht statisch in `public/`): Direktantworten + vollständiger Seitenindex aus `site.ts`/`geo.ts`.
- Build: ~70 Seiten statisch/SSG; MapLibre + pdf-lib code-gesplittet; Fonts self-hosted mit `display:swap`.

---

## 7. Projektstruktur (real, Auszug)

```
src/
  app/                    (Routen, siehe §2; api/{contact,booking,report,intern})
  components/             (Portal, Calculator, GEO-Explorer, Consent, Auth, Reels, Icon-System …)
  lib/
    mock-estates.ts       (10 Fixtures, kanonisches Estate-Modell — OnOffice-Swap via Adapter)
    valuation.ts          (Bewertungs-Engine, client-seitig)
    report-pdf.ts         (+ report-assets/: PDF-Report, pdf-lib)
    email.ts  supabase.ts  site.ts  geo.ts  geocode.ts  portal-filter.ts  photos.ts
  content/geo-articles.json  (18 Standorte + 16 Ratgeber)
  fonts/                  (inter, akira, akira-outline — woff2 self-hosted)
scripts/bunny-upload.mjs  (Asset-Upload BunnyCDN)
docs/supabase-schema.sql  (Schema, im Supabase SQL-Editor ausführen)
```

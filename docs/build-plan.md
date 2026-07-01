# Build-Plan – riegel-immobilien.de

Priorisierte Roadmap, gemappt auf Sissys Wünsche — **Status-Matrix auf Ist-Stand** (die App läuft
auf riegel.vercel.app; Mock-Daten, OnOffice-Anbindung offen).
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) · [architecture.md](./architecture.md) · [fortschritt.md](./fortschritt.md) · [optimierung.md](./optimierung.md) · [betrieb.md](./betrieb.md)

> Effort grob: **S** ≤1 Tag · **M** 2–4 Tage · **L** ~1 Woche · **XL** >1 Woche.

---

## ⛔ Blocker — Stand

| # | Blocker | Status | Blockiert noch |
|---|---|---|---|
| B1 | **OnOffice `TOKEN`+`SECRET`** (Least-Privilege), Write-Access, Webhooks, Bild-CDN-Host | **offen** | Live-Immobiliendaten (Portal läuft auf Mocks), Lead-Sync ins CRM |
| B2 | **BFSG-Status** schriftlich (< 10 MA UND ≤ 2 Mio. €?) | offen | Pflicht-Umfang Barrierefreiheitserklärung (WCAG-AA wird trotzdem gebaut, D9) |
| B3 | **AVM-Lizenz** (PriceHubble/Sprengnetter) | offen — Rechner läuft mit eigener heuristischer Engine (`valuation.ts`) | optionales Engine-Upgrade |
| B4 | **Anwalt** (Impressum, Datenschutz, Widerruf, §656a-d) | offen — Entwürfe sind live, anwaltlich ungeprüft | rechtssicherer Go-Live |
| B5 | **OnOffice-AVV** | offen | erster CRM-synchronisierter Lead |
| B6 | **Foto-Budget** / Bildqualität | teilentschärft — echte RIEGEL-Fotos + Reels via BunnyCDN/beuwy.com | weitere Objektfotos |
| B7 | **E-Mail-Provider** | ✅ **entschieden: Resend** — Code live (`src/lib/email.ts`), aber **zurückgestellt**: Alex richtet Account + Domain-Verifizierung später ein; bis dahin Versand „skipped", Leads landen in Supabase | produktiver Mailversand |
| B8 | **Map-Tile-Provider** | ✅ entschieden: CARTO dark-matter + Esri World Imagery (Consent-gated) | — |
| B9 | **Cutover/Redirect-Plan** (Bestands-URLs, DNS) | offen — Checkliste in [betrieb.md](./betrieb.md) | Go-Live auf riegel-immobilien.de |

---

## Phase 1 – MUST (Kern-Relaunch)

| Aufgabe | Wunsch | Status |
|---|---|---|
| Projekt-Setup (Next.js 16, TS, Tailwind v4, Vercel) | — | ✅ gebaut (ohne shadcn/Motion — eigene Komponenten) |
| **Design-System-Tokens** (RIEGEL-Blau, Inter+Akira self-hosted, Focus-Ring, Reduced-Motion) | #1, #8 | ✅ gebaut ([design-system.md](./design-system.md)) |
| Layout/Header/Footer + Kontakt-Link, WhatsApp-FAB, Social-Links | #6, #7 | ✅ gebaut (WhatsApp-Nummer + LinkedIn-URL in `site.ts` noch TODO) |
| **OnOffice-Client** (HMAC, read estate, estatepictures) | — | ⛔ offen (B1) — Portal Mock-first mit Adapter (D16) |
| **Portal `/immobilien`** — Liste+Karte-Split, URL-Filter, Chips, Skeleton, Galerie | #2 | ✅ gebaut |
| **Detailseite** + JSON-LD + Energie-/Provisionsangaben | #2, #13 | ✅ gebaut (ISR/Webhook erst mit OnOffice) |
| **Homepage-Redesign** (Hero, Featured, Premium-Dark) | #1 | ✅ gebaut |
| **Kontaktformular** → `/api/contact` → Resend + Supabase `leads` | #6 | ✅ gebaut (CRM-Sync erst mit B1/B5) |
| **Consent-Banner** (schlanker Eigenbau, Karten/Luftbild click-to-load) | #10 | ✅ gebaut (`consent.tsx`) |
| **Legal-Seiten** Impressum / Datenschutz / Widerruf | #9, #10 | ✅ gebaut — Entwürfe, Anwalt (B4) offen |
| **A11y-Baseline** (Keyboard, Focus, Kontrast, Labels, reduced-motion) | #8 | ✅ gebaut |
| **SEO/GEO-Basis**: JSON-LD, `sitemap.ts`, `robots.ts`, Metadata, `llms.txt` | #13 | ✅ gebaut |
| Bilder-Pipeline (next/image, BunnyCDN) | #3 | ✅ gebaut |

---

## Phase 2 – SHOULD

| Aufgabe | Wunsch | Status |
|---|---|---|
| **Buchungstool** `/termin` (Wunschtermin-Anfrage → Mail + Lead) | #5 | ✅ gebaut — ersetzt Calendly; echter Slot-Kalender (availability_rules, .ics, OnOffice-Sync) = späterer Ausbau |
| **Saved Searches** (Suche speichern, Mein Bereich `/merkliste`, Supabase-Sync bei Login) | #2 | ✅ gebaut — E-Mail-Alerts (Cron) offen |
| **Konten** `/konto` (Supabase-Auth, Profil/Suchprofil) | #2 | ✅ gebaut (nicht ursprünglich geplant) |
| Erweiterte Schema.org (`RealEstateListing`, FAQ) | #13 | ✅ gebaut |
| OG-Image-Route pro Listing | #13 | offen (P1-SEO-Paket in [optimierung.md](./optimierung.md)) |
| CWV-Tuning + Speed Insights | #13 | teilweise (Build ~70 statische Seiten; Monitoring offen) |

---

## Phase 3 – Preis-Tool

| Aufgabe | Wunsch | Status |
|---|---|---|
| **Bewertungsrechner `/rechner`** (Wizard, Range-Output, Disclaimer) | #11, #6 | ✅ gebaut — eigene Engine `valuation.ts` |
| **Report-Funnel**: `/api/report` → PDF-Anhang (pdf-lib) + interne Kopie + `valuation_requests`-Log | #11 | ✅ gebaut ([bewertungsreport.md](./bewertungsreport.md)) |
| Engine-Upgrade AVM-API (PriceHubble/Sprengnetter) | #11 | offen (B3) |
| Geocoding auf Server-Proxy (Photon, `/api/geocode`) umstellen | #11 | **in Arbeit** — Nominatim-Client-Calls ablösen (Policy/Consent) |

---

## Phase 4 – NICE (regionale Karte)

| Aufgabe | Wunsch | Status |
|---|---|---|
| **BORIS-RLP-Choropleth** auf MapLibre | #11 | geplant (braucht LVermGeo-Bestätigung) |
| GENESIS/Europace-Trend-Charts | #11 | geplant |

---

## Wunsch-Abdeckungs-Matrix

| # | Wunsch | Status |
|---|---|---|
| 1 | Homepage-Redesign dark/edel | ✅ gebaut |
| 2 | Portal + Filter, shareable, kein Redirect (+ Saved Searches, Merkliste, Konto) | ✅ gebaut (Mock-Daten; OnOffice = B1) |
| 3 | Höherwertige Bilder | ✅ echte RIEGEL-Assets (BunnyCDN); weitere Objektfotos = B6 |
| 4 | Chatbot | **gestrichen (D4)** |
| 5 | Custom Booking statt Calendly | ✅ gebaut (Anfrage-Flow; Slot-Kalender später) |
| 6 | Kontaktformular global → CRM | ✅ gebaut (Mail + Supabase; CRM-Sync = B1/B5) |
| 7 | WhatsApp + Socials sauber | ✅ gebaut (WhatsApp-Nummer/LinkedIn-URL fehlen in `site.ts`) |
| 8 | Barrierefreiheit WCAG 2.1 AA | ✅ Baseline gebaut (formales Audit offen, B2) |
| 9 | Widerruf-Button sichtbar | ✅ gebaut |
| 10 | Legal-Review + echtes Consent | ✅ Consent gebaut; Anwalt (B4) offen |
| 11 | Immorechner / Preis-Tool | ✅ Rechner + PDF-Report gebaut; regionale Karte = P4 |
| 13 | SEO + AI/GEO | ✅ gebaut (34 GEO-Artikel, llms.txt, Schema; Feinschliff in [optimierung.md](./optimierung.md)) |

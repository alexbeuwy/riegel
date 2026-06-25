# Build-Plan – riegel-immobilien.de

Priorisierte Roadmap (Must/Should/Nice), gemappt auf Sissys Wünsche, gruppiert in Phasen, mit grobem Effort.
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) · [architecture.md](./architecture.md) · [onoffice-integration.md](./onoffice-integration.md) · [legal-checklist.md](./legal-checklist.md) · [design-system.md](./design-system.md) · [preisatlas-research.md](./preisatlas-research.md)

> Effort grob: **S** ≤1 Tag · **M** 2–4 Tage · **L** ~1 Woche · **XL** >1 Woche.

---

## ⛔ Braucht GO / Credentials von Alex bzw. Sissy, bevor Start

| # | Blocker | Blockiert |
|---|---|---|
| B1 | **OnOffice `TOKEN`+`SECRET`** (Least-Privilege), Bestätigung Write-Access + Webhooks + Rate-Limits, Image-CDN-Host | gesamte Listing-/Lead-/Booking-Funktionalität |
| B2 | **BFSG-Status** schriftlich (< 10 MA UND ≤ 2 Mio. €?) | Pflicht-Umfang Barrierefreiheitserklärung |
| B3 | **AVM-Lizenz** (PriceHubble/Sprengnetter im Tarif? Public-Web erlaubt?) | Preis-Tool-Engine Phase A1 vs. A2 |
| B4 | **Anwalt** (Impressum, Datenschutz, Widerruf wortgleich, §656a-d) | Legal-Seiten Go-Live |
| B5 | **OnOffice-AVV** unterschrieben | erster Live-Lead |
| B6 | **Foto-Budget** + OnOffice-Bildqualität | „edel"-Wirkung (Wunsch #3) |
| B7 | **E-Mail-Provider** (Resend vs. EU-SMTP) | Lead-/Booking-Mails |
| B8 | **Map-Tile-Provider** + geografischer Scope | Phase B Karte |
| B9 | **Cutover/Redirect-Plan** (Bestands-URLs) | Go-Live |

---

## Phase 1 – MUST (Kern-Relaunch, Go-Live-fähig)

| Aufgabe | Wunsch | Effort | Notiz |
|---|---|---|---|
| Projekt-Setup (Next.js 16, TS, Tailwind v4, shadcn, Motion, ESLint, Vercel-Projekt, EU-Region) | — | M | |
| **Design-System-Tokens** (Farben, Type self-hosted, Spacing, Focus-Ring, Reduced-Motion) | #1, #8 | M | [design-system.md](./design-system.md) |
| Layout/Header/Footer + **globaler Kontakt-Link, WhatsApp-FAB, Social-Links** (IG/FB/LinkedIn/YouTube **+ WhatsApp**) | #6, #7 | M | simple-icons; LinkedIn+WhatsApp neu |
| **OnOffice-Client** (HMAC-v2, read estate, estatepictures) | — | M | [onoffice-integration.md](./onoffice-integration.md) · braucht B1 |
| **Listing-Liste** SSR + URL-Filter (typ/preis/ort/zimmer/fläche), shareable, canonical, kein SmartSite-Redirect | #2 | L | |
| **Listing-Detail** ISR + Webhook-Revalidation + JSON-LD | #2, #13 | M | |
| **Homepage-Redesign** (Hero, Featured-Listings, Premium-Dark) | #1 | L | braucht B6 |
| **Kontaktformular** global (eigene Seite + Footer) → Server Action → Supabase → OnOffice | #6 | M | braucht B1/B5 |
| **Consent-CMP** (Opt-in, blockt Embeds, Reject auf 1. Ebene) | #10 | M | [legal-checklist.md](./legal-checklist.md) |
| **Legal-Seiten** Impressum / Datenschutz / Widerruf + **Widerruf-Button** (zweistufig) | #9, #10 | M | Texte von Anwalt (B4) |
| **A11y-Baseline** (Keyboard, Focus, Kontrast-Audit, Alt-Texte, Form-Labels) | #8 | M | |
| **SEO/GEO-Basis**: `RealEstateAgent`-JSON-LD, `sitemap.ts`, `robots.ts`, `generateMetadata`, llms.txt | #13 | M | |
| **Höherwertige Bilder** integrieren / next/image-Pipeline | #3 | S–M | braucht B6 |

---

## Phase 2 – SHOULD

| Aufgabe | Wunsch | Effort | Notiz |
|---|---|---|---|
| **Buchungstool** (availability_rules → Slots, requestBooking, .ics, OnOffice-Sync, Cancel) | #5 | L–XL | ersetzt Calendly (D5) |
| **Saved Searches** (Filter speichern, optional E-Mail-Alerts via Cron) | #2 | M | |
| Erweiterte Schema.org (`RealEstateListing`+`Offer`+`Residence`, `FAQPage`) | #13 | S–M | |
| OG-Image-Route pro Listing | #13 | S | |
| CWV-Tuning + Vercel Speed Insights | #13 | S | |

---

## Phase 3 – Preis-Tool (SHOULD; Engine je nach B3)

| Aufgabe | Wunsch | Effort | Notiz |
|---|---|---|---|
| **Bewertungs-Rechner** (Premium-UI, Range-Output, Disclaimer) → Lead in OnOffice | #11, #6 | L | [preisatlas-research.md](./preisatlas-research.md) Phase A |
| Engine A1: AVM-API server-seitig (PriceHubble/Sprengnetter) + eigenes Result-UI | #11 | M | wenn B3 = Lizenz da |
| Engine A2: transparenter Schätzer aus freien Daten (LGMB/GENESIS + Bodenrichtwert) | #11 | M | Fallback |
| `price_data`-Tabelle seeden | #11 | S | |

---

## Phase 4 – NICE (regionale Karte)

| Aufgabe | Wunsch | Effort | Notiz |
|---|---|---|---|
| **BORIS-RLP-Choropleth** auf MapLibre (WFS → PostGIS → Vector-Tiles, dl-de/by-2.0 Attribution) | #11 | L–XL | [preisatlas-research.md](./preisatlas-research.md) Phase B · braucht B8 + LVermGeo-Bestätigung |
| GENESIS/Europace-Trend-Charts | #11 | M | |

---

## Wunsch-Abdeckungs-Matrix

| # | Wunsch | Phase | Status |
|---|---|---|---|
| 1 | Homepage-Redesign dark/edel | P1 | geplant |
| 2 | Listing + Filter, shareable, kein Redirect | P1 (+Saved Search P2) | geplant |
| 3 | Höherwertige Bilder | P1 | braucht Foto-Budget B6 |
| 4 | Chatbot | — | **gestrichen (D4)** |
| 5 | Custom Booking statt Calendly | P2 | geplant (D5) |
| 6 | Kontaktformular global → CRM | P1 | geplant |
| 7 | WhatsApp + Socials sauber | P1 | geplant |
| 8 | Barrierefreiheit WCAG 2.1 AA | P1 | geplant (Status B2) |
| 9 | Widerruf-Button sichtbar | P1 | geplant |
| 10 | Legal-Review + echtes Consent | P1 | geplant (Anwalt B4) |
| 11 | Immorechner / Preis-Tool | P3 (Rechner) + P4 (Karte) | **Calculator-first (D7)** |
| 13 | SEO + AI/GEO | P1 (Basis) + P2 | geplant |

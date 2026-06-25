# Architektur – riegel-immobilien.de

Greenfield Next.js App auf Vercel, headless gegen OnOffice CRM, mit Supabase (EU) als Support-Layer.
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) · [onoffice-integration.md](./onoffice-integration.md) · [legal-checklist.md](./legal-checklist.md) · [design-system.md](./design-system.md) · [preisatlas-research.md](./preisatlas-research.md) · [build-plan.md](./build-plan.md)

---

## 1. Stack-Entscheidungen

| Layer | Wahl | Begründung |
|---|---|---|
| Framework | **Next.js 16, App Router, TypeScript** | RSC, gemischtes Rendering pro Seitentyp, Server Actions für Secrets. |
| Hosting | **Vercel** | Git-Push-to-Production, ISR/On-demand-Revalidation, Image Optimization, EU-Edge. |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, kein `tailwind.config.ts`) + **shadcn/ui** | Token-getriebenes Design-System, siehe [design-system.md](./design-system.md). Hinweis: `tailwindcss-animate` ist in v4 deprecated. |
| Motion | **Motion** (ehem. Framer Motion, `motion/react`) | Scroll-Reveals + Sticky-Nav-Morph, hart hinter `prefers-reduced-motion` gegated. |
| Bilder | **next/image**, AVIF→WebP | CWV auf fotolastiger Seite; OnOffice-CDN-Host in `remotePatterns`. |
| Fonts | **next/font/local** bzw. `@fontsource-variable` (Fraunces + Hanken Grotesk) | Vollständig self-hosted = DSGVO-clean (kein Google-CDN-Call). |
| Icons | **Lucide** (UI) + **simple-icons** (WhatsApp/IG/FB/LinkedIn/YouTube) | tree-shakeable. |
| DB / Support | **Supabase** (Region Frankfurt/EU, PostGIS) | Leads, Bookings, Saved Searches, Preisdaten. Siehe §5. |
| Karte (später) | **MapLibre GL JS** (MIT, OSS-Fork von Mapbox GL) | Keine nutzungsbasierten Mapbox-Gebühren. Tiles via MapTiler/Stadia/self-hosted OSM. |
| E-Mail | **Resend** (oder EU-SMTP – DSGVO-Frage offen) | Transaktionsmails (Lead-Notify, Booking-Bestätigung mit .ics). |
| Validation | **react-hook-form + zod** | Gleiche zod-Schemata client + Server Action. |
| Sprache | **de only** | Keine i18n-Routing-Lib; `<html lang="de">`, getypte String-Dictionary optional. |

---

## 2. Rendering-Strategie pro Seitentyp

| Route | Strategie | Begründung |
|---|---|---|
| `/` (Home) | **SSG** + ISR ~stündlich | Premium-Hero, kuratierte Featured-Listings server-seitig aus OnOffice. Hero-Bild `priority`. |
| `/immobilien` (Liste) | **SSR** (request-time) | Filter (`typ`, `minPreis`, `maxPreis`, `ort`, `zimmer`, `flaeche`) in **URL-searchParams** → shareable + crawlbar, **kein** SmartSite-Redirect (Wunsch #2). ISR pro Filterkombi würde Cache sprengen. OnOffice-Fetch mit kurzem Tag-TTL gecacht. Ergebnis-HTML im Initialdokument (SEO/AI). `<link rel=canonical>` auf sauberen Pfad, `noindex` auf leere/überfilterte States. |
| `/immobilien/[slug]` (Detail) | **ISR + On-demand-Revalidation** | `slug = ${id}-${kebab-title}`. `generateStaticParams` für aktive Estates, Fetch getaggt `estate-${id}`. Webhook invalidiert bei Änderung. Zeitbasierter Fallback (z. B. 3600 s) falls Webhook verpasst. Volles JSON-LD hier. |
| `/immobilienbewertung` (Preis-Tool) | **STATIC Shell + Client-Island** | Calculator/Map als `dynamic(..., { ssr:false })` – blockieren nie SEO-Content. Textueller/FAQ-Teil server-rendered. Submit → Server Action → Lead. |
| `/kontakt` | STATIC Shell + Client-Form → Server Action | Global erreichbar (Wunsch #6). |
| `/termin` (Booking) | STATIC Shell + Client-Kalender → Server Action | Ersetzt Calendly (D5). |
| `/impressum` `/datenschutz` `/widerruf` `/agb` | **STATIC** | `/widerruf` hostet Belehrungstext + zweistufigen Widerruf-Button (Server Action → Supabase + Mail). Siehe [legal-checklist.md](./legal-checklist.md). |

---

## 3. Route-Handler & Server Actions (Secrets nur server-seitig)

- **`lib/onoffice/client.ts`** – einziger signierter Client. Baut Envelope, berechnet `hmac = base64(HMAC_SHA256(secret, timestamp+token+resourcetype+actionid))`, POST an `https://api.onoffice.de/api/stable/api.php`. Liest `ONOFFICE_TOKEN`/`ONOFFICE_SECRET` aus `process.env`. **Nie `NEXT_PUBLIC`.** Recipe: [onoffice-integration.md](./onoffice-integration.md).
- **`app/api/webhooks/onoffice/route.ts`** (POST) – verifiziert Shared-Webhook-Secret → `revalidateTag('estate-${id}')` + `revalidateTag('estate-list')` + `revalidatePath('/sitemap.xml')`. Antwortet schnell 200.
- **Server Action `submitContactForm()`** – zod-validate → Insert in Supabase `leads` (`status='new'`) → OnOffice `create address` → optional Estate-Relation → Notify-Mail (Resend). **Supabase-Write zuerst** ⇒ kein verlorener Lead bei OnOffice-Fehler (Retry-Queue, `onoffice_synced` Flag).
- **Server Action `requestBooking()`** – siehe §6.
- **Server Action `submitWithdrawal()`** – Widerruf-Datensatz → Supabase + Mail.
- **Optional `app/api/og/route.tsx`** – dynamische OpenGraph-Bilder pro Listing.

---

## 4. Secrets-Handling

- Alle OnOffice-/AVM-Keys, Webhook-Secret, Supabase-Service-Role-Key, Resend-Key: **Vercel Encrypted Env Vars**, scoped auf Production/Preview, nur server-seitig.
- **Niemals** im Client-Bundle, niemals `NEXT_PUBLIC_` für Secrets, niemals signierte Payloads loggen.
- OnOffice-HMAC-Key **ist** das API-Secret → ein Leak kompromittiert das CRM. Least-Privilege-API-User anfordern.
- Genuine Public-Werte (Public-Map-Style-URL, ggf. Supabase Anon Key) dürfen `NEXT_PUBLIC_` sein.

```
ENV (Vercel, server-only):
ONOFFICE_TOKEN, ONOFFICE_SECRET, ONOFFICE_WEBHOOK_SECRET,
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
RESEND_API_KEY, NOTIFY_EMAIL,
PRICEHUBBLE_API_KEY (falls Phase 2), MAP_STYLE_URL/MAPTILER_KEY (falls Karte)
```

---

## 5. Supabase – JA (Support-Layer; OnOffice bleibt kanonisch für Immobilien)

EU-Region (Frankfurt). **RLS an**, Writes nur über Service-Role-Key in Server Actions (nie Client).

| Tabelle | Zweck / Felder (Auszug) |
|---|---|
| `leads` | id, created_at, name, email, phone, message, listing_id?, source, onoffice_address_id?, onoffice_synced bool, status, **consent_at, consent_text** (DSGVO-Log). Durable Lead-Capture + Retry. |
| `bookings` | id, created_at, name, email, phone, type[`besichtigung`\|`beratung`], listing_id?, slot_id, status[`requested`\|`confirmed`\|`cancelled`], notes, ical_uid. |
| `availability_rules` | weekday, start_time, end_time, slot_minutes, buffer_minutes. |
| `booking_slots` | starts_at, ends_at, status[`open`\|`held`\|`booked`] – Unique-Constraint gegen Doppelbuchung. |
| `saved_searches` | created_at, email?, filter_json, notify bool – speichert Filter-URL-Params, optional E-Mail-Alerts (Cron + OnOffice-Query). |
| `price_data` | region/plz, asset_type, eur_per_sqm, source[`BORIS-RLP`\|`manual`], valid_from – Backing-Store für Calculator/Karte, gespeist aus BORIS-RLP (dl-de/by-2.0) + lokalen Werten. Entkoppelt das Tool vom externen Runtime-Call. |
| `estate_cache` | **OPTIONAL** – id, payload jsonb, updated_at. Nur falls OnOffice-Latenz/Rate-Limits messbar wehtun. Default: erst messen, dann hinzufügen. |

---

## 6. Buchungstool (ersetzt Calendly)

- **Availability-Modell:** Maklerin definiert `availability_rules` → Server generiert offene Slots für N Wochen, minus bestehende Bookings + Buffer.
- **`requestBooking()`:** zod-validate → Slot transaktional `held`/`booked` (Unique-Constraint gegen Races) → `bookings`-Row → OnOffice `address` + optional Kalendereintrag/Task im CRM → Bestätigungsmail an Kunde + Notify an Sissy (Resend) mit **.ics** → Confirmation.
- **Cancellation** via signiertem Token-Link → Status flip + Slot frei.
- **DSGVO:** minimale Daten, explizite Consent-Checkbox + `consent_at/text` geloggt, Daten in EU-Supabase, Retention (stale `requested` nach X Tagen löschen), in Datenschutzerklärung gelistet. Kein Drittanbieter = kein extra Prozessor / US-Transfer.

---

## 7. Deployment (Vercel)

- Git-Push-to-Production (D6). Preview-Deploys pro PR.
- **Image Optimization Kostenkontrolle:** `images.formats:['image/avif','image/webp']`, explizite `sizes`/`deviceSizes`, hoher `minimumCacheTTL` für OnOffice-Bilder (ändern selten), `remotePatterns` eng auf OnOffice-Image-Host + Customer-Pfad, `priority` nur auf LCP-Hero, `unoptimized` für SVG-Icons/Mini-Thumbs.
- Vercel Analytics / Speed Insights zur CWV-Überwachung (LCP < 2,5 s).
- WP bleibt parallel live bis Cutover; 301-Redirects für Bestands-URLs am Cutover (siehe RELAUNCH-LOG „Nächste Schritte").

---

## 8. Projektstruktur (Skizze)

```
app/
  layout.tsx              (lang=de, RealEstateAgent JSON-LD, Header/Footer mit WhatsApp+Socials, Consent-Banner)
  page.tsx                (Home, static)
  immobilien/page.tsx     (SSR-Liste, searchParams-Filter)
  immobilien/[slug]/page.tsx (ISR-Detail + JSON-LD)
  immobilienbewertung/page.tsx (static shell + Client-Island Calculator/Map)
  kontakt/page.tsx
  termin/page.tsx         (Booking)
  impressum/ datenschutz/ widerruf/ agb/  (static legal)
  sitemap.ts  robots.ts
  api/webhooks/onoffice/route.ts
  api/og/route.tsx        (optional)
components/               (ui, listing-card, filter-bar, booking-calendar, price-calculator, map[client], consent-banner, json-ld, whatsapp-fab)
lib/onoffice/             (client.ts, hmac.ts, estates.ts, addresses.ts, types.ts)
lib/supabase/             (server.ts [service role], queries.ts)
lib/validation/           (contact.ts, booking.ts, filters.ts)  [zod]
lib/email/resend.ts
actions/                  (contact.ts, booking.ts, withdrawal.ts, saved-search.ts)
public/llms.txt
```

---

## 9. SEO / GEO (Kurzfassung; Detail in build-plan)

- **JSON-LD:** site-weit `RealEstateAgent` (Name, Adresse Speyer/Ludwigshafen, areaServed, sameAs[IG/FB/LinkedIn/YouTube], telephone, WhatsApp) im Root-Layout; pro Listing `RealEstateListing` mit `Offer` (price, businessFunction sell/lease, availability) + `Residence/Apartment/House`; `FAQPage` auf Bewertungs-/Service-Seiten. Typed `<JsonLd>` Server-Component.
- **`app/sitemap.ts`** dynamisch (statische Routen + 1 Eintrag pro aktivem Estate, Webhook-revalidiert), `app/robots.ts`, `generateMetadata` pro Seite.
- **Core Web Vitals:** server-render Content, next/image, next/font (kein CLS), MapLibre/Calculator lazy client-only, kleine JS-Islands.
- **llms.txt:** statische `/public/llms.txt` (Index der Kernseiten) – geringer Aufwand, **near-zero ROI** (Google nutzt es nicht). Realer GEO-Effekt kommt aus semantischem HTML + Schema + Entity-Signalen.
  Quelle: <https://ahrefs.com/blog/what-is-llms-txt/>

### Quellen
- Next.js revalidateTag/Path/ISR: <https://nextjs.org/docs/app/api-reference/functions/revalidateTag> · <https://nextjs.org/docs/app/guides/incremental-static-regeneration>
- Vercel Image Optimization: <https://vercel.com/docs/image-optimization>
- Schema.org RealEstateListing: <https://schema.org/RealEstateListing>
- MapLibre GL JS: <https://maplibre.org/maplibre-gl-js/docs/>

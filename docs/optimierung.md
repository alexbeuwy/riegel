# RIEGEL — Optimierungspotenzial (Projekt-Audit)

Stand: 2026-07-01, Commit `1951532`. Drei parallele Audits (Code/Sicherheit ·
SEO/Performance/Conversion · Doku-Konsistenz) + Prod-Build-Härtetest
(**grün, 70 Seiten**, `tsc` sauber). Priorisiert nach Business-Impact
(Leads/Geld/Recht zuerst). Datei:Zeile jeweils als Einstiegspunkt.

## ✅ Umsetzungsstand (gleiche Session, 2026-07-01)

**Alle P0–P3-Punkte und der komplette Doku-Backlog sind umgesetzt** — mit diesen
bewussten Ausnahmen:

- **P0 #4 (Zufalls-Kennzahlen)**: bleibt wie gehabt — Entscheidung Alex: ohne echte
  BORIS-/Marktdaten wäre jede Ableitung weiterhin nur Annäherung. Absicherung trotzdem
  eingebaut: `/api/report` rechnet den **Kernwert serverseitig nach** und **klemmt** die
  Kennzahlen auf plausible Bereiche (keine Fantasie-PDFs per curl mehr).
- **openingHours im JSON-LD**: erst wenn Riegel echte Öffnungszeiten liefert (nicht erfinden).
- **Reels-Poster**: `preload="metadata"` statt echter Poster-JPEGs (Ausbau: Bunny-Thumbnails).
- **CSP**: Basis-Security-Header gesetzt; vollwertige CSP bräuchte Nonces (Ausbau).
- **WhatsApp/LinkedIn**: wartet weiter auf Daten (`site.ts`).
- **OG-Images**: bewusst Default-Font statt Akira — Akiras defekte Space-Metriken lassen
  satori Wörter kollabieren (Detail im Code-Kommentar).
- Vorbestehende **ESLint-Altlasten** (20 Errors, u. a. `set-state-in-effect` in Alt-Komponenten)
  waren nicht Teil des Audits und bleiben unangetastet (Baseline unverändert).

## P0 — Kritisch (kostet jetzt Leads, Geld oder Vertrauen)

1. **Terminbuchung sendet falsches Datum (verifiziert).** `booking-tool.tsx:74`:
   `toISOString().slice(0,10)` auf lokaler Mitternacht → in TZ Europe/Berlin wird der
   **Vortag** gebucht (Mail, .ics, Google-Kalender, Wochenend-Filter betroffen).
   Fix: ISO aus `getFullYear/getMonth/getDate` bauen.
2. **Stiller Lead-Verlust (3 Stellen).**
   a) `report-request.tsx:91–106`: bei API-Fehler wird trotzdem „Anfrage eingegangen"
   angezeigt, Lead liegt nur im localStorage des Nutzers → RIEGEL erfährt nie davon.
   b) `api/contact/route.ts:60–71` + c) `api/booking/route.ts:65–77`: Supabase-Insert-`error`
   wird verworfen; da Resend „skipped" ist, ist die DB die **einzige** Persistenz.
   Fix: Fehler auswerten, `logged`-Flag zurückgeben, UI-Fehlerzustand mit Retry + Telefon-Fallback.
3. **Canonical-Bug: fast alle Seiten kanonisieren auf „/".** `layout.tsx:21` vererbt
   `alternates.canonical:"/"` an /rechner, /verkaufen, /immobilien(/slug), /kontakt … →
   De-Indexierungs-Risiko für die halbe Site. Fix: aus dem Layout entfernen, pro Seite setzen.
4. **Zufallszahlen als „Daten-Konfidenz" im offiziellen Report.** `valuation.ts:132–137`:
   `comparables/confidence/trendPct/mikrolage` sind `Math.random()`, landen aber in DB,
   CSV und PDF unter Berufung auf „amtliche Bodenrichtwerte/BORIS" → Abmahn-/Vertrauensrisiko.
   Fix: deterministisch aus Inputs ableiten oder entfernen/als Illustration kennzeichnen.
5. **Rechner-Ergebnis ist eine Conversion-Sackgasse.** Nach dem Ergebnis nur Report-CTA
   (Telefon = Pflichtfeld → weiches Gate) oder „Neue Bewertung"; CTA-Band auf /rechner
   ausgeblendet, kein Termin-/tel:-Link. Fix: sekundäre CTAs „Termin vereinbaren" + tel:
   im Result, Telefon optional machen.
6. **`/intern` brute-force-bar.** `api/intern/route.ts:25`: Passwortvergleich `!==`
   (nicht timing-safe), kein Rate-Limit — dahinter Service-Role-Zugriff auf alle
   personenbezogenen Leads. Fix: `crypto.timingSafeEqual` (SHA-256) + Rate-Limit/Delay.

## P1 — Hoch

- **og:image existiert nicht** (kein `openGraph.images`, kein `twitter`-Block, keine
  `opengraph-image.*`) → jede geteilte URL ohne Vorschaubild. Fix: `opengraph-image.tsx`
  im Hero-Look (Blau-Gradient + Akira-Claim), dynamisch je Standort/Ratgeber.
- **robots.ts ohne Disallow** für `/api/`, `/intern`, `/konto`, `/merkliste` (`robots.ts`).
- **Öffentliche POST-Routen ungeschützt** (contact/booking/report): kein Rate-Limit,
  kein Honeypot; Bestätigungsmails an beliebige Adressen mit Angreifer-Inhalt + PDF →
  Mail-Bombing/Kosten, sobald Resend live. Dazu: offene RLS-Insert-Policy erlaubt
  Spam-Inserts direkt an Supabase vorbei. Fix: IP-Rate-Limit + Honeypot + Policy prüfen.
- **Nominatim-Autocomplete verstößt gegen OSM-Policy** (max 1 req/s, Autocomplete verboten)
  und feuert **vor** jeder Consent-Einwilligung (`geocode.ts:44–48`; Karten sind gegated,
  Geocoding nicht) — der zentrale Verkäufer-Funnel hängt an einem abschaltbaren Dienst.
  Fix: Photon/MapTiler oder eigener cachender Server-Proxy + Consent-Gate.
- **Mock-Immobilien werden als echte Angebote indexiert** (`sitemap.ts:26–29`,
  `immobilien/[slug]` mit `RealEstateListing`-JSON-LD inkl. Fake-Preisen). Fix: bis
  OnOffice-Live `robots:{index:false}` + aus Sitemap nehmen.
- **/api/report akzeptiert Client-Werte ungeprüft** → per curl offiziell aussehende
  RIEGEL-PDFs mit Fantasiewerten (`report/route.ts:90–94`). Fix: serverseitig mit
  `estimateValue()` nachrechnen. Dazu: doppeltes HTML-Escaping („Müller &amp;amp; Söhne")
  in PDF/DB/`replyTo` (`route.ts:76–88`) — nur beim HTML-Rendern escapen.
- **Hero-Suche: Enter vor Debounce = toter Klick** im wichtigsten CTA
  (`hero-address-search.tsx:59–61`). Fix: Fallback `router.push("/rechner?query=…")`.

## P2 — Mittel

- **LCP-Delay ~0,8–1 s**: Hero-H1 (jetzt LCP-Element) startet durch `.reveal` mit
  `opacity:0` + Delay (`page.tsx:91–101`, `globals.css:107–109`). Fix: above-the-fold
  nur `transform` animieren oder Reveal im Hero weglassen.
- **JSON-LD ohne Local-Substanz**: `RealEstateAgent` ohne `geo`/`openingHours`/`image`/
  `priceRange`; Standortseiten wiederholen den globalen Node statt Orts-Node mit `@id`
  + `areaServed` (`layout.tsx:40–74`, `geo-article-view.tsx:213–228`).
- **Homepage-Title ohne Money-Keyword**: „Immobilienmakler Speyer & Ludwigshafen" fehlt
  im Title (`site.ts:8`).
- **WhatsApp-Kanal tot** (`site.ts:34`, leerer String → FAB rendert nie) + Kontakt-Telefon
  als Plaintext statt `tel:`-Link (`kontakt/page.tsx:38–40`).
- **A11y**: Modal ohne Fokus-Trap/-Rückgabe (`modal.tsx:45–55`); Hero-Suche ohne
  Combobox-ARIA/Pfeiltasten (Muster existiert im Rechner!); kein Skip-Link (`layout.tsx`).
- **GeoMap (CARTO) auf /standorte + /ratgeber ohne Consent-Gate** — inkonsistent zur
  eigenen TDDDG-Linie (`geo-explorer.tsx:112` vs. `MapConsentGate` überall sonst).
- **/api/intern leakt Interna** in Fehler-Responses (fehlende Env-Namen, rohe
  Postgres-Fehler) an Unauthentifizierte (`route.ts:21,33,46`).

## P3 — Niedrig / Politur

- WebGL-Hero rendert per rAF **offscreen endlos weiter** (GPU/Akku, auch im
  Rechner-Analyzing wiederverwendet) → IntersectionObserver-Pause (`hero-backdrop.tsx:99–115`).
- Reels ohne `poster` → leere Kacheln bis Autoplay, iOS-Low-Power dauerhaft leer
  (`reels-grid.tsx:98–108`).
- Sitemap meldet bei jedem Build `lastModified: now`; Article-JSON-LD ohne
  `datePublished/dateModified` → echte Daten pflegen.
- PDF wirft bei Nicht-Latin-1-Zeichen (ą, ł, Emoji) — WinAnsi-Helvetica für Freitext
  (`report-pdf.ts:73–74,177`) → säubern/transliterieren oder Unicode-Font.
- Keine Security-Header/CSP in `next.config.ts`.
- Dead Code: `emailEnabled` (`email.ts:11`), devDependency `playwright-core` ungenutzt.

## Doku-Backlog (aus dem Doku-Audit; Widersprüche in fortschritt/wachstum/strategie bereits gefixt)

- **architecture.md** auf Ist-Stand umschreiben: Stack-Tabelle (kein shadcn/motion/zod;
  real Inter+Akira, pdf-lib, MapLibre), Routen (real: /rechner, /konto, /merkliste,
  /standorte, /ratgeber, /intern; kein /agb), Server-Actions/Webhooks als „geplant"
  kennzeichnen (real: Route-Handler), Datenmodell (real: profiles/favorites/
  saved_searches/valuation_requests/leads), Env-Namen korrigieren.
- **build-plan.md**: Status-Matrix eingefroren auf „geplant" — Portal, Rechner, Booking,
  Consent, SEO/GEO etc. sind gebaut; Blocker B7 (Mail-Provider) entschieden.
- **design-system.md**: Champagner-Gold `#C9A227` + Neuzeit Grotesk obsolet — real
  RIEGEL-Blau `#015CFF` + Inter/Akira (auch Kommentar-Altlasten in `fonts/index.ts`/
  `globals.css` zum Adobe-Embed bereinigen).
- **pitchdeck/README.md**: sagt „14 Slides, 34.800 €" — `deck.html` hat 18 Slides,
  29.800 € − 16.000 € = **13.800 € pauschal, 290 €/Mon**.
- **instagram-integration.md**: „Quelle offen" ersetzen — Option 3 (5 self-hosted MP4s)
  ist umgesetzt.
- **bewertungsreport.md**: „PDF als Ausbaustufe" veraltet — PDF-Anhang ist live;
  beschriebene `/report/...`-Seite existiert nicht.
- **betrieb.md NEU anlegen**: vollständige Env-Referenz (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`,
  `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, Upload: `BUNNY_STORAGE_*`, `BUNNY_CDN_HOST`)
  + Deploy-Prozess + **Domain-Cutover-Checkliste** (DNS, 301s, Supabase-Site-URL,
  hartkodierte Links in Report-Mails, GSC).
- **Undokumentiert**: `valuation.ts` (Bewertungs-Engine), `report-pdf.ts` + `report-assets/`,
  Route `/merkliste`.

## Positiv bestätigt ✅

Service-Role-Key nur serverseitig (kein Client-Leak) · alle `dangerouslySetInnerHTML`
= statisches JSON-LD · maplibre-gl & pdf-lib sauber code-gesplittet (nicht im
Startseiten-Bundle) · Fonts self-hosted, klein, `display:swap`, preload ·
GEO-Content ohne Duplicate-Risiko (max. Ähnlichkeit 0,51; 850–1.050 Wörter/Artikel) ·
interne Verlinkung + Breadcrumbs + Rechner-CTAs in Artikeln gut · `llms.txt` stark ·
Build: 70 Seiten statisch/SSG, tsc 0 Fehler.

## Empfohlene Reihenfolge

1. **P0 komplett** (Termin-Datum, Lead-Verlust, Canonical, Random-Konfidenz, Result-CTAs,
   /intern-Härtung) — direkt umsetzbar, kein Input nötig.
2. P1 SEO-Paket (og:image, robots, Mock-noindex, Title) + Formular-Schutz.
3. Geocoding-Migration (Photon/Proxy) — vor Ads-Start zwingend (Funnel-Abhängigkeit!).
4. P2/P3 in Politur-Runden; Doku-Backlog parallel.

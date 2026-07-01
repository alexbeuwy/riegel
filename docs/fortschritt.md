# Fortschritt — RIEGEL Relaunch

Stand: laufend. Live auf Vercel (Push auf `main` → Deploy). Branch: `claude/zealous-newton-88eff9`.

## Erledigt ✅

- **Portal** (Airbnb/Zillow-Style): Karte + Liste, Instant-Filter, teilbare URL-States, „Bei Kartenbewegung suchen", aufgeräumte Filterleiste (Swipe mobil / Wrap desktop).
- **Immorechner v2**: Adress-Autocomplete (DE, ohne Bundesland/Landkreis), Satellitenbild, viele Faktoren, 10 Datenquellen-Animation, große Akira-Ergebniszahl, Error-Shake bei fehlenden Angaben, **kein** Kontakt-Gate.
- **Hero**: Headline „Regionale Expertise. *Alles andere ist* (blau) *Fast Food.* (outline)" + **Adress-CTA → direkt in den Rechner mit Satellit**. Dropdown-Overlap (z-index) gefixt.
- **Design**: Icon-System (~35), Bento-Layouts, Kennzahlen-Band, Pre-Footer-CTA, **Wavy-Blue-Shader-CTA** (#015CFF).
- **Mikro-UX (transitions-dev)**: Dropdown, Modal, Icon-Swap, Card-Tilt, Tooltip, Success-Check, Error-Shake, Notification-Badge, Tabs-Slide, Avatar-Group-Hover, `.press`.
- **Über uns**: Familie Riegel korrekt (Manfred=Vater, Sylwia=Mutter, Sissy+Christoph=Kinder), echte Fotos, **18 Expert:innen** (4 + 14 Platzhalter), Standorte mit echten Bürofotos.
- **Verkäufer-Facts**: Ø Vermarktungszeit, Ø bis Kaufpreis, **Top 21 von über 25.000 Maklern bundesweit** (ImmoAward 2025).
- **Termin**: „So läuft eine Besichtigung" (Bild-Platzhalter).
- **News/Award**: ImmoAward-2025-Sektion mit echten Bildern.
- **Instagram-Reels**: Autoplay-in-View-Grid (MP4-ready) — siehe `instagram-integration.md`.
- **GEO-Programm**: **28 Artikel** (18 Standorte + 10 Ratgeber) + Article/FAQPage/Breadcrumb-JSON-LD, `/standorte`, `/ratgeber`, Sitemap, dynamische `/llms.txt`. Standorte: Speyer, Ludwigshafen, Germersheim, Frankenthal, Neustadt, Schifferstadt, Haßloch, Mutterstadt, Limburgerhof, Mannheim, Worms, Landau, Bad Dürkheim, Böhl-Iggelheim, Dudenhofen, Römerberg, Otterstadt, Waldsee.

## Update — Konten, E-Mail, Consent, DSGVO, Fonts ✅

- **Konten/Login** (Supabase, env-gated) live: `/konto` Registrierung/Login, Header-Konto-Link.
  **Favoriten- & Suchauftrag-Sync** (Merge bei Login, Write-through, fehlertolerant).
- **Resend-Transaktionsmails**: `/api/contact` + `/api/booking` senden echte gebrandete Mails
  (Benachrichtigung an Riegel + Bestätigung an Absender). Env: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`.
- **High-End-Mail-Templates** für Supabase-Auth: `docs/email-templates/` (5 Stück) + README.
- **Consent-Banner** (TDDDG): externe Karten/Luftbilder (CARTO/Esri) laden erst nach Einwilligung
  (Click-to-Load). **Fonts self-hosted** (Adobe-Embed entfernt) → ein externer Dienst weniger.
- **DSGVO** erweitert (Supabase/Geocoding/Esri) — Check in `docs/dsgvo-check.md`.
- **Header**: kurzes „RIEGEL"-Logo (lesbar), Nav ohne Umbruch, Hero vertikal zentriert.
- **OnOffice**: Import-Plan für alle ~108 Objekte dokumentiert (`onoffice-integration.md` §8).

## Update — Suchprofil, Verkaufsablauf, Termin-Klon, Pitchdeck ✅

- **Suchprofil nach Login** (`/konto`): Rolle (Eigennutzer/Kapitalanlage/Verkauf), Objektarten,
  Regionen, Budget, Zimmer, **Vorab-Zugang** (vor Veröffentlichung informiert) → speichert in
  Supabase `profiles.preferences`/`early_access` (Schema: `supabase-schema.sql`), LS-Fallback.
- **Verkaufsablauf** als animierte **ProcessTimeline** (Connector füllt sich beim Scrollen,
  gestaffeltes Reveal, Bild-Slots bereit) statt 5 statischer Boxen.
- **Termin = Calendly-Klon ausgebaut**: Termin-Modus (Vor Ort/Video-Call/Telefonisch),
  Standortwahl (sanft via `.t-collapse`), Dauer 30/45/60 als Segmented, Anlass +Finanzierung,
  Datum als Kalender-Zellen, Uhrzeit Vormittag/Nachmittag, **Live-Summary-Schiene**,
  Fortschrittsleiste, Absende-Spinner, reichere Bestätigung (t-success-check + .ics + Google-Kalender).
  Buchungs-API übernimmt Modus/Ort/Dauer/Nachricht in die Mails.
- **transitions-dev** durchgängig gewired (Segmented-Pill, t-collapse, t-success-check, t-num-d,
  t-input-shake, press, Progress-Fill) + **make-interfaces-feel-better** (Live-Feedback, Spinner,
  Smart Defaults, aria-pressed).
- **Pitchdeck v2** (`docs/pitchdeck/deck.html`, 15 Slides): beuwy-Adresse Max-Bill-Str. 3,
  kein „Prototyp"-Claim, Icon-Badges in Argument-Boxen, **growsta-Style KI-Sichtbarkeits-Check**
  („heute: andere / Ziel: RIEGEL"), neue **Wirkung-Slide** (leuchtender Graph, illustrativ),
  3D-Shader-Wellen als Design-Asset. PDF via Playwright gerendert.

## Offen / wartet auf Input 🔧

- **OnOffice**: Token+Secret (serverseitig) → 108 Objekte importieren, Live-Listings statt
  Mock (Plan: `onoffice-integration.md` §8). Bis dahin: Mock-Detailseiten `noindex` setzen
  (s. `optimierung.md` P1).
- **Resend**: neuer Account durch Alex (s. Notiz unten) — bis dahin Versand „skipped".
- **Geocoding**: Nominatim-Autocomplete verstößt gegen OSM-Policy + feuert vor Consent →
  auf Photon/MapTiler oder Server-Proxy umstellen, **vor Ads-Start zwingend** (`optimierung.md` P1).
- **GEO-Texte**: KI-Entwürfe mit ca.-Zahlen — fachlich gegenlesen vor großer Bewerbung.
- **WhatsApp-Nummer + LinkedIn-URL** (`site.ts` — FAB rendert bis dahin nicht).
- **Team-Klarnamen + Porträts** (aktuell Platzhalter).
- **Audit-Befunde P0–P3** abarbeiten → priorisierte Liste in `optimierung.md`.

## Sicherheit

- Keine Secrets im Repo (SFTP/Vercel-Token/OnOffice nur außerhalb).
- Fremde Supabase-Projekte (beuwy/dieudonne/Saadi/Gym) werden nicht angefasst.

## Update — Portal-Trust, Report-Funnel, Pitchdeck v3/v4, Fotos ✅

- **Ansprechpartner-Block** (Avatar + Kontakt + "Ich freue mich auf Ihre Anfrage") auf Objektdetail
  & Kontaktseite; Objekt-ID/"Online seit"/Vermarktung (ImmoScout-Trust-Muster). `lib/contacts.ts`.
- **Rechner-Report-Funnel**: CTA "Report als PDF anfordern" → `/api/report` → Report an Kunde
  **+ CC an RIEGEL**, Supabase `valuation_requests` protokolliert jede Anfrage. (PDF-Anhang
  inzwischen **live** via `report-pdf.ts`/pdf-lib — `bewertungsreport.md` dazu veraltet.)
- **Pitchdeck v3**: Headlines im Copywriting-Stil ("Fast Food"-Closing, "Erben von morgen").
- **Pitchdeck v4**: Preis tabellarisch (21.800 € − 3.000 € Rabatt = **18.800 €** pauschal,
  Betrieb 290 €/Mon) + Vision-Slide "Fundament → nächstes Level → Nr. 1" ("Nachahmer können einpacken").
- **Echte Fotos eingebaut**: Team-Gruppenfoto (Home), Büro-Exterieurs (Über-uns/Kontakt),
  Innenaufnahmen-Galerie (Über-uns). ~~Hero bleibt Unsplash~~ → inzwischen ersetzt
  (s. Update „Hero ohne Stockfoto" unten).
- **Recherche dokumentiert**: ImmoScout-Features, HomeDay Preisatlas, Bewertungsreport, Insta-Reels,
  Foto-Assets (siehe jeweilige `docs/*.md`).
- **Supabase-Schema** (inkl. `valuation_requests`) ausgeführt. (Resend-Status: s. Notiz
  unten — **zurückgestellt**, Versand wird aktuell übersprungen, Leads landen in Supabase.)

## Update — Video-Reels & internes Lead-Dashboard ✅

- **Video-Reels**: 5 echte RIEGEL-Objekt-MP4s (selbst gehostet auf beuwy.com/riegel/),
  Autoplay stumm in View, Hover → Ton, Mute-Toggle unten links. (`reels-grid.tsx`)
- **Internes Dashboard `/intern`** (noindex): Passwort-Gate → zeigt Bewertungs-Reports
  (`valuation_requests`) + Termin-/Kontakt-Leads (`leads`) in Tabellen. Liest serverseitig
  über `SUPABASE_SERVICE_ROLE_KEY` (umgeht RLS, Key bleibt secret). `/api/intern` prüft `ADMIN_PASSWORD`.
- **Leads-Tabelle**: `/api/booking` + `/api/contact` protokollieren jetzt auch in Supabase `leads`.

### Env in Vercel (für Dashboard + Mails scharf)
- `ADMIN_PASSWORD` — Passwort für `/intern`.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API → service_role (secret!).
- `EMAIL_FROM` = `RIEGEL Immobilien <noreply@<verifizierte-domain>>`, `EMAIL_TO` = Lead-Postfach.
- Resend: **kostenlose** Domain-Verifizierung reicht (3.000 Mails/Monat frei) — kein Upgrade nötig.
- Alternativ ohne Dashboard: Leads direkt im **Supabase Table Editor** (`valuation_requests`, `leads`).

## Notiz — Resend (zurückgestellt)
- Alex erstellt einen **neuen Resend-Account** und richtet Domain + Versand in Ruhe ein (später).
- Bis dahin: Mails werden serverseitig „skipped" (kein Crash), Daten landen in Supabase `leads`/`valuation_requests`
  und lokal. Sobald Account + Domain stehen: `RESEND_API_KEY`, `EMAIL_FROM` (verifizierte Domain), `EMAIL_TO` setzen → Redeploy.

## Update — Hero ohne Stockfoto + Wachstumsplan ✅

- **Hero**: Unsplash-`hero.jpg` ersetzt durch den vorhandenen **HeroBackdrop** (WebGL-Mesh-Gradient
  Near-Black → #015CFF, CSS- & reduced-motion-Fallback). Dezente Links-Abdunklung für die Textspalte,
  Bottom-Fade in die Folge-Sektion. `HERO_BLUR`-Platzhalter entfernt — **kein Foto mehr im LCP-Pfad**.
  `hero.jpg` bleibt nur noch als Objektbild in `mock-estates.ts`. (`foto-assets.md`-Punkt damit erledigt.)
- **Entscheidung Video-Hero**: Objekt-Reels (9:16 hochkant) ungeeignet als Landscape-Hintergrund.
  Falls Video-Hero, dann eigenes 8–12s-Landscape-Footage via **Bunny Stream** (Poster-first,
  Mobil/reduced-motion → Gradient bleibt Fallback). Basis steht.
- **Bunny Database geprüft**: SQLite/libSQL-Edge-DB (Public Preview, gratis) — **kein** Supabase-Ersatz
  (kein Auth/RLS/Realtime); allenfalls später als Read-Cache für öffentliche Listen interessant.
- **Wachstumsplan dokumentiert** → `wachstum.md`: Mandate-Kernrechnung, Speed-to-Lead-Alarm,
  €-Pipeline im Cockpit, Report-Funnel-Ausbau, Follow-up-Automatik, Käufer-Flywheel, Ads-Modell,
  Tippgeber — inkl. Status-Abgleich mit bereits Gebautem (`/api/report`, `/intern`, `leads`).

## Update — Audit-Fixes P0–P3 umgesetzt ✅

- **P0**: Termin-Datums-Bug behoben (lokale ISO statt UTC-Vortag); **stiller Lead-Verlust**
  beseitigt (Report-Formular zeigt echte Fehler + Retry + Anruf-Fallback; contact/booking/report
  prüfen den DB-Insert und antworten 502, wenn weder Mail noch DB den Lead haben);
  **Canonical-Bug** gefixt (Root-Canonical raus, jede Seite eigene); Rechner-Result mit
  tel:-/Termin-CTAs + Telefon optional; `/intern` gehärtet (timingSafeEqual + Rate-Limit +
  generische Fehler).
- **P1**: **OG-Images** (Root + dynamisch je Standort/Ratgeber via next/og, Hero-Look);
  robots-Disallow (api/intern/konto/merkliste); Mock-Objekte noindex + aus Sitemap;
  Geocoding auf eigenen **Photon-Proxy `/api/geocode`** umgestellt (OSM-Policy + DSGVO:
  keine Nutzer-IP an Dritte; Datenschutz §13 angepasst); **Rate-Limit + Honeypot** auf allen
  drei Formularen; `/api/report` **rechnet Werte serverseitig nach** (keine Fake-PDFs per curl)
  + Escaping-Fix (kein „&amp;amp;" mehr in PDF/DB/replyTo); Hero-Suche mit Enter-Fallback
  `/rechner?query=` + Combobox-ARIA/Pfeiltasten.
- **P2/P3**: Homepage-Title mit „Immobilienmakler Speyer & Ludwigshafen"; JSON-LD geo je Büro,
  Article datePublished/Modified, @id-Entity-Verknüpfung; **LCP-Fix** (Hero-Reveals nur noch
  transform); Modal-Fokus-Falle + -Rückgabe; Skip-Link; GeoMap hinter Consent-Gate; WebGL-Hero
  pausiert offscreen (IntersectionObserver); Reels `preload="metadata"`; Kontakt-Telefon als
  tel:-Link; PDF WinAnsi-sicher (kein Crash bei ą/ł/Emoji); Security-Header; Dead Code raus
  (`emailEnabled`, `playwright-core`); Lead-Inserts laufen über Service-Role (`supabase-server.ts`).
- **Doku-Backlog komplett**: architecture/build-plan/design-system/pitchdeck-README/
  instagram-integration/bewertungsreport/dsgvo-check auf Ist-Stand + **`betrieb.md` neu**
  (Env-Referenz, Deploy, Domain-Cutover-Checkliste).
- **Verifiziert**: `tsc` 0 Fehler, ESLint exakt auf Vor-Stand (nur Altlasten), Prod-Build grün,
  Runtime-Smoke-Test (OG-Images gerendert, Geocode-Proxy liefert Büroadresse, robots korrekt).
- **Bewusste Ausnahmen** (Details im Status-Block von `optimierung.md`): Zufalls-Kennzahlen
  bleiben (nur serverseitig geklemmt — ohne BORIS-Daten keine Scheinpräzision), openingHours
  & WhatsApp warten auf echte Daten, Reels-Poster/CSP als Ausbau.

## Update — Projekt-Audit: Code · SEO/Funnel · Doku ✅

- **3 parallele Audits + Prod-Build** auf Stand `1951532`: Build grün (**70 Seiten**), `tsc` 0 Fehler.
- Ergebnisse priorisiert in **`optimierung.md`** (P0–P3 + Doku-Backlog + Positiv-Bestätigungen).
  Kritischste Funde (P0): **Termin-Datums-Bug** (Zeitzone → Vortag, verifiziert), **stiller
  Lead-Verlust** an 3 Stellen, **Canonical-Bug** (fast alle Seiten → „/"), **Zufallswerte als
  „Daten-Konfidenz"** im PDF-Report, **/intern ohne Brute-Force-Schutz**, Rechner-Ergebnis
  als Conversion-Sackgasse.
- **Doku-Widersprüche direkt gefixt**: Resend-Status vereinheitlicht (zurückgestellt),
  erledigte „Offen"-Punkte entfernt (Reels, Schema, Accounts), PDF-Report-Status korrigiert
  (live statt „Ausbaustufe") — in `fortschritt.md`, `wachstum.md`, `strategie.md`.
- Größere Doku-Überarbeitungen (architecture, build-plan, design-system, pitchdeck-README,
  instagram-integration, `betrieb.md` neu) → Backlog in `optimierung.md`.

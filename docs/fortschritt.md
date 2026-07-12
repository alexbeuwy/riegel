# Fortschritt — RIEGEL Relaunch

Stand: laufend. Live auf Vercel (Push auf `main` → Deploy). Branch: `claude/zealous-newton-88eff9`.

## Standing Rules — gilt ab sofort für jedes Update (nicht mehr wiederholen)

- **Transitions-dev & Mikro-Animationen sind Standard, nicht optional.** Jede neue UI nutzt die
  vorhandenen `.t-*`-Klassen/Skills (`transitions-dev`, `make-interfaces-feel-better`). Kein
  Feature ohne Hover-/Reveal-/Press-Polish gilt als fertig.
- **`interpolate-size: allow-keywords`** ist global in `:root` gesetzt (`globals.css`, im
  transitions-dev-Tokens-Block) — natives `height:auto`-Animieren für einfache Ein-/Ausklapp-
  Fälle. Für komplexere Fälle (dynamischer Inhalt, SSR-Erstzustand) bleibt die bestehende
  `.t-collapse`-Grid-Technik (`grid-template-rows: 0fr → 1fr`) die robustere Wahl.
- **Foto-Hero-Overlays nicht überdunkeln.** Die BunnyCDN-Fotos sind bereits dunkel/kontrastarm
  fotografiert. Neue Foto-Hero-Sektionen starten mit leichten Gradienten (Richtwert
  `from-bg/50–60` statt `/80–90`) und werden nur bei echtem Lesbarkeits-Problem nachgeschärft.
- **Sterne-Icons für Bewertungen**: IMMER als EINE Ebene rendern — jeder der 5 Sterne mit
  `fill="currentColor"`, „volle" Sterne in `text-accent`, „leere" nur blasser (`text-faint`),
  NIE `fill="none"` (dünne Outline = andere Silhouette) und NIE eine zweite, per `width%`
  geklippte Overlay-Ebene (Schnittkante mitten durch einen Stern wirkt „doppelt"/unscharf).
  Bei Teilwertungen auf ganze Sterne runden (die exakte Zahl steht ohnehin daneben). Referenz:
  `trust-strip.tsx`/`testimonials.tsx`.

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

## Update — RIEGEL Preisatlas Vorderpfalz (`/preisatlas`) ✅

- **Neues Lead-Asset im Rechner/Portal-Kaliber**: interaktiver Markt-Überblick für alle
  18 GEO-Städte — €/m²-**Spannen** Wohnung/Haus (Count-up, tabular-nums), Bodenrichtwert
  (immer als „Bodenwert, kein Objektpreis" gelabelt + Tooltip), 12-Monats-Trend als
  animierte SVG-Sparkline, Rendite, Ø-Vermarktungszeit, Nachfrage-Badge.
- **Karte**: MapLibre mit preis-eingefärbten Markern (CARTO, hinter MapConsentGate);
  Seite funktioniert komplett ohne Karten-Consent (Orts-Chips als Fallback). Deep-Links
  `?ort=slug` werden **serverseitig** aufgelöst (kein Content-Flash), URL teilbar.
- **Städte-Vergleich** (2 Orte, animierte Balken, Tilt-Cards) + **CTA-Sektion mit
  eingebetteter Hero-Adresssuche** → direkter Funnel in den Rechner.
- **Integration**: Markt-Widget in der Sidebar jeder Standort-Seite (→ `/preisatlas?ort=`),
  Bento-Tile auf der Home, Footer-Link, Sitemap, CollectionPage/Breadcrumb-JSON-LD.
- **Daten**: `src/lib/marktdaten.ts` — deterministisch aus der Rechner-Engine abgeleitet
  (Spannen rahmen die valuation.ts-Basiswerte ein), kein Math.random, Pflicht-Disclaimer
  (§ 194 BauGB) auf Seite + Panel. **Kein Scraping, kein BORIS-WFS** — bewusst gemäß
  `preisatlas-research.md`; BORIS-Choropleth bleibt Ausbaustufe nach LVermGeo-Freigabe.
- **Qualität**: 3 Bau- + 3 Review-Agenten (Build/Runtime · UX gegen
  make-interfaces-feel-better/transitions-dev · Code) + Fix-Runde — 16 Findings gefixt
  (u. a. Bento-Grid-Lücke auf der Home, Kontraste, Token-Dauern statt Hardcodes,
  aria-live beim Panelwechsel). tsc 0 Fehler, Lint auf Baseline, Build 73 Seiten grün,
  Desktop + Mobil per Screenshot verifiziert.

## Update — BORIS live im Rechner, systematischer Mobile-Pass, Trust-Elemente, Hero-Wave-Shader ✅

- **Amtliche Bodenrichtwerte live** (`src/lib/boris.ts`, `/api/bodenrichtwert`): Rechner holt
  während der Analyzing-Animation den echten VBORIS-RLP-Wert der eingegebenen Adresse
  (WMS GetFeatureInfo, HTML-Parse, 24h-Cache, fail-soft mit Timeout) — SOURCES-Zeile zeigt
  bei Erfolg den echten Wert + „amtlich"-Pill, sonst unverändert den Modellwert. Fließt in
  `estimateValue()` (neuer optionaler `bodenrichtwert`-Override) und in die **Server-
  Nachrechnung** im Report ein — Client und PDF nutzen denselben amtlichen Wert. PDF +
  Datenschutzerklärung (§13) entsprechend ergänzt. Weitere SOURCES-Zeilen (Vergleichspreise,
  Trend, Nachfrage) personalisiert aus `marktdaten.ts` je Stadt statt Zufallszahl.
  **Deckung: nur Rheinland-Pfalz** (VBORIS-Dienst) — außerhalb (z. B. Mannheim/Heidelberg,
  Baden-Württemberg) bewusst stiller Fallback auf den Modellwert.
- **Systematischer Mobile-Pass**: Root-Cause des Akira-H1-Overflows (lange Ratgeber-/
  Standort-Headlines sprengten den Viewport, siehe User-Screenshots) behoben; 390px-Audit
  über alle Kernrouten via CDP-Screenshots (echte Mobile-Emulation, `--window-size` allein
  reicht bei diesem Chromium-Build nicht — Erkenntnis dokumentiert), mehrere Fixes verifiziert.
- **Trust-Elemente** (`trust-data.ts`, `trust-strip.tsx`, `testimonials.tsx`): recherchierte,
  kreuzverifizierte Bewertungen (ImmoScout24 4,7/148, Trustpilot 4,6/34, Trustlocal 8,6/10/30,
  golocal 4,5/17) als endlos laufender Marquee-Streifen (Home + `/verkaufen`) + echte,
  öffentlich einsehbare Kundenzitate als Kartensektion. **IVD bewusst nicht enthalten**
  (nicht belegbar); Kununu nicht enthalten (kein Profil auffindbar).
- **Echte Auszeichnungs-Siegel** (`awards-grid.tsx`): Original-Grafiken direkt von
  riegel-immobilien.de geholt (BVFI, ImmoScout24 Verkaufsprofi 2021/Premium Partner
  2013–2021/Experte seit 2009, IDA-Siegel 2022, Bellevue 2022) — unverändert wie live
  geführt; zwei Badges sind datiert und mehrere Jahre alt (Hinweis an Alex gegeben).
- **JSON-LD erweitert**: `sameAs` um alle Bewertungsprofile, `Person`-Entities für die
  Familie Riegel (E-E-A-T) — bewusst **kein** `aggregateRating` (Google wertet
  Fremdplattform-Zahlen sonst als self-serving).
- **Hero-Redesign**: `WaveShader` (Shadertoy lfsBzB, wie in der Sofort-Bewertung-CTA-Box)
  ersetzt den flachen Mesh-Gradient im echten Homepage-Hero — Feedback: der Wave-Look sollte
  auch oben stehen. Rechner-/Preisatlas-Analyzing-Screens bleiben bewusst beim ruhigen
  `HeroBackdrop` (andere Nutzungskontexte, noch nicht umgestellt — offen, s. u.).
- **Report-CTA psychologisch verstärkt** (`report-request.tsx`): Nutzenargumente (Was der
  Report enthält, häufigster Preis-Fehler, Datenexklusivität ggü. Portalen) bleiben immer
  sichtbar; Formular öffnet jetzt über `.t-collapse` (grid-template-rows) statt hartem Pop.
- **Reels auf BunnyCDN umgezogen**: `riegel.b-cdn.net` statt `beuwy.com` (Alex hat die 5 MP4s
  dort neu hochgeladen) — kein Fremddomain-Traffic mehr; `next.config.ts`-remotePattern für
  `beuwy.com` entfernt.
- **Verifiziert**: tsc 0 Fehler, ESLint exakt auf Vor-Stand (25 Probleme, alles Altlasten),
  Build grün, BORIS-API live getestet (Speyer → 540 €/m², außerhalb RLP → saubere 422),
  Awards-Bilder + Testimonial-Inhalte im gerenderten HTML verifiziert.

## Offen aus diesem Update 🔧

- **CTA-Boxen vereinheitlichen**: `cta-band.tsx` (sitewide Pre-Footer) nutzt noch ein
  statisches `wave-2.svg`-Bild (12 % Deckkraft) statt des `WaveShader` — soll ersetzt werden,
  ebenso die Preisatlas-CTA-Sektion (aktuell `HeroBackdrop`).
- **Preisatlas-Politur**: Preis-Marker überdecken die Ortsnamen der CARTO-Basiskarte (Fix:
  `dark-matter-nolabels`-Style + eigenes Label je Marker); fehlende Such-Eingabe für Städte
  außerhalb der 18 abgedeckten Orte (ehrlicher „keine Marktdaten"-Fallback nötig);
  transitions-dev-Hover-Politur/Paddings nachziehen.
- **Preisatlas-Homepage-Teaser**: aktuell nur eine Bento-Kachel — soll ein prominenter,
  eigenständiger Content-Block werden.
- **Navigation**: bei der wachsenden Feature-Zahl (Preisatlas, Rechner, Standortguide,
  Ratgeber) ein Mega-Menü für „Immobilienbewertung" statt Einzellinks/Footer-Verstecken.
- **Mehrfamilienhaus** als eigener Objekttyp im Rechner (Jahresnettokaltmiete, Einheiten-/
  Gewerbeanzahl, Ertragswert-Berechnung) — fehlt komplett, Verkäufer von MFH aktuell schlecht
  bedient.
- **Kontakt-Seite**: prominenter CTA zur Direktbuchung (`/termin`) unter der Headline fehlt
  — Calendly-Klon ist aktuell zu versteckt.
- **BW-Bodenrichtwerte**: kurze Prüfung, ob es für Baden-Württemberg (Mannheim/Heidelberg-
  Nähe) einen vergleichbar freien Dienst gibt; sonst bleibt der Modell-Fallback (laut Alex
  „Annäherung reicht, vor Ort wird ohnehin exakt bewertet").

## Update — Mega-Menü, Wave-Shader vereinheitlicht, Preisatlas-Politur, Mehrfamilienhaus, Kontakt-CTA ✅

- **Mega-Menü** für „Immobilienbewertung": Desktop-Dropdown (2×2-Icon-Grid: Immorechner,
  Preisatlas Vorderpfalz, Standort-Guide, Ratgeber) + mobiles Akkordeon (`.t-collapse`,
  Chevron dreht) — vorher waren diese Features nur im Footer auffindbar. `site.ts` trägt
  jetzt eine `NavItem.children`-Struktur.
- **Wave-Shader vereinheitlicht**: `cta-band.tsx` (sitewide Pre-Footer) nutzte nur ein
  statisches `wave-2.svg`-Bild (12 % Deckkraft) — jetzt der echte `WaveShader`, ebenso die
  Preisatlas-CTA-Sektion (`HeroBackdrop` ersetzt). Konsistenter Look mit der Sofort-
  Bewertung-Box auf der Startseite.
- **Preisatlas-Fixes**: Ursache für „Punkte überdecken Städtenamen" behoben — labelfreier
  CARTO-Style (`dark-matter-nolabels`) + eigene Ortsnamen-Labels je Marker mit
  Kollisionsvermeidung (Screen-Position-Tracking, Prioritäts-Ausblendung bei Überlappung).
  Neue **Städte-Suche** (Combobox, wie Hero-Adresssuche) mit ehrlichem Fallback „Für '{Stadt}'
  liegen uns noch keine Marktdaten vor" + Link zum Rechner. transitions-Polish (Hover,
  Paddings) auf Panel/Vergleich/Chips.
- **Preisatlas-Homepage-Teaser**: eigenständige, prominente Sektion (`preisatlas-teaser.tsx`)
  mit Top-6-Städte-Chips (Spannen, `?ort=slug`-Links) statt nur der kleinen Bento-Kachel.
- **Mehrfamilienhaus** als neuer Objekttyp im Rechner: Ertragswert-Berechnung
  (Jahresnettokaltmiete × regionaler Vervielfältiger, gedeckelt 18–30), eigene Formularfelder
  (Miete Pflicht, Wohn-/Gewerbeeinheiten optional), Server-Nachrechnung + PDF/E-Mail-Ausgabe.
- **Kontakt-Seite**: prominenter blauer CTA „Direkt zur Terminbuchung — ohne Formular" direkt
  unter der Headline (Link `/termin`) + Anker zum Formular darunter.
- **BW-Bodenrichtwerte geprüft**: funktionierender ArcGIS-Endpoint für Mannheim gefunden,
  aber bewusst **nicht** angebunden — kein dokumentierter API-Vertrag, nur ein spoofbarer
  Referer-Check, lückenhafte Abdeckung (Heidelberg/Weinheim ohne Wert). Modell-Fallback bleibt
  für BW; Befund inkl. Testkoordinaten in `preisatlas-research.md` dokumentiert.
- **Qualität**: 6 Bau- + 2 Review-Agenten + Fix-Runde — 7 Findings, 6 gefixt (u. a. fehlendes
  Mobile-Akkordeon nachgebaut, MFH-Validierung/Karten-Label-Kollision behoben), 1 als reines
  Sandbox-Env-Limit (fehlende Resend/Supabase-Keys lokal) identifiziert. tsc 0 Fehler, Lint auf
  Baseline, Build 74 Seiten grün. Eigene Verifikation: Mega-Menü Desktop+Mobil, Preisatlas-
  Suche-Fallback, Kontakt-CTA je per Screenshot bestätigt.

## Update — Foto-Pass: Hero-Foto, Bento-Lücke, Rechner-Header ✅

- **Rechner-Header umgebaut**: vorher zwang eine separate Foto-Karte + `PageIntro` zum
  Scrollen, bevor der Rechner sichtbar war. Jetzt: Report-Foto als Hintergrund hinter der
  Headline „Was ist Ihre Immobilie wert?", Trust-Chips, Rechner direkt im Anschluss —
  Schritt 1 ist auf Desktop ohne Scrollen sichtbar.
- **Startseiten-Hero**: Wave-Shader ersetzt durch das Foto „Mann mit iPad, blaues Licht"
  (BunnyCDN) — dezente Gradienten, da das Foto bereits dunkel ist.
- **Bento-Lücke gefüllt**: neue `BentoPhoto`-Kachel (Foto statt Leerraum, Hover-Zoom) —
  füllt die leere Zelle neben „Beratung" mit einem echten RIEGEL-Beratungsfoto.
- Verifiziert: tsc/Build grün, Desktop- und echter Mobile-CDP-Screenshot (kein horizontaler
  Overflow, `scrollWidth === clientWidth`).

## Update — Foto-Pass Teil 2, Sterne-Bug, Reel-Sound, Bento-Lücke, Trust-Ausbau ✅

- **Startseiten-Hero**: Foto gewechselt auf `Model-Mann-in-Wohnung.webp` — Subjekt steht
  rechts, Textspalte links bleibt frei (kein Haus-POI mehr hinter der Headline wie zuvor bei
  „Mann mit iPad"). Gradienten dabei gleich aufgehellt (Regel s. o.).
- **Sterne-Bug behoben**: `trust-strip.tsx` (Marquee) und `testimonials.tsx` zeigten trotz
  Bestnoten (4,6/5, 8,6/10 …) fast leere Sterne — Ursache: das Icon-System zeichnet Sterne rein
  als Outline (`fill="none"`), Farbwechsel allein macht sie nicht „voll". Fix: `fill=
  "currentColor"` an den gefüllten Sternen. Jetzt sichtbar korrekt gefüllt (screenshot-geprüft).
- **Reel-Hover-Sound zuverlässiger**: `reels-grid.tsx` setzte beim Hover `muted=false` **vor**
  `play()` — das kann als „Autoplay mit Ton ohne User-Geste" vom Browser abgelehnt werden
  (Hover zählt nicht als User-Activation). Jetzt: zuerst (stumm) sicherstellen, dass das Video
  läuft, danach erst entstummen — das ist die robuste, browserseitig erlaubte Reihenfolge.
- **`/verkaufen`**: PageIntro ersetzt durch echten Foto-Hero (`Mann-mit-iPad…abgedunkelte-
  version.webp`, neu in `photos.ts` als `heroKitchenDark`) — damit hat auch das ursprüngliche
  „Mann mit iPad"-Motiv jetzt eine sinnvolle Platzierung. Bento-Lücke am Zeilenende („Warum
  Riegel") mit `BentoPhoto` gefüllt statt Leerraum.
- **`/rechner`-Hero aufgehellt**: Overlay-Gradienten von `/80–90` auf `/50–60` reduziert (war
  das explizit genannte Negativ-Beispiel für „zu stark abgedunkelt").
- **Startseite — „Persönlich begleitet"-Sektion ausgebaut**: echtes Testimonial (golocal,
  5★, Frau Redmann) jetzt groß als Pull-Quote neben den Fotos, dazu eine kompakte
  Bewertungs-Liste aller 4 Plattformen (Sterne + Wert). Trust-Testimonial-Signal ist stark —
  jetzt auch hier zusätzlich zur separaten Kundenstimmen-Sektion prominent sichtbar.
- **CTA-Shader-Audit**: Verdacht „`/immobilien/[slug]`-CTA ohne WaveShader" geprüft — Fix aus
  dem vorherigen Batch (`cta-band.tsx`) ist bereits auf `main` und live (verifiziert per curl
  gegen die Produktions-URL, Response enthält den neuen Shader-Wrapper, kein `wave-2.svg`
  mehr). Der Screenshot des Nutzers war vermutlich vor dem Deploy dieses Fixes entstanden.
  `process-timeline.tsx`/`termin/page.tsx` nutzen `wave-2.svg` bewusst nur als dezentes
  Deko-Muster in kleinen Bild-Slot-Platzhaltern — kein CTA, keine Änderung nötig.
- Verifiziert: tsc 0 Fehler, Lint clean, Build (74 Seiten) grün, Desktop-Screenshots von
  Startseite/Rechner/Verkaufen (Hero, Bento-Lücke, Sterne, Begleitung-Sektion) bestätigt.

## Update — Mega-Menü-Hover-Fix, Sterne-Formmismatch, GEO-Chart-Bugs, Hero-Bild per /intern ✅

- **Mega-Menü-Hover-Bug**: Panel sitzt `mt-3` unterhalb des Trigger-Buttons — beim
  Runterfahren verließ die Maus kurz jede Hover-Fläche (Lücke zwischen Button und Panel),
  `mouseleave` schloss das Menü dadurch fälschlich sofort. Fix: 200 ms Grace-Period
  (`scheduleClose`) vor dem tatsächlichen Schließen in `site-header.tsx`, per CDP mit
  echter langsamer Mausbewegung durch die Lücke verifiziert (Menü bleibt offen).
- **Sterne-Bug (Runde 2, der eigentliche Fehler)**: der erste Fix (`fill="currentColor"`
  nur auf der gefüllten Ebene) reichte nicht — die Outline-Ebene darunter hatte dadurch
  eine ANDERE Silhouette (Stroke allein wirkt schmaler als Stroke+Fill), beide Ebenen lagen
  sichtbar nicht bündig übereinander. Fix: **beide** Ebenen in `trust-strip.tsx` bekommen
  `fill="currentColor"` — identische Form, nur unterschiedliche Farbe, damit deckt sich die
  gefüllte Ebene exakt mit der Hintergrund-Ebene.
- **Foto-Tausch**: Startseiten-Hero → `heroKitchenDark` (abgedunkelte Kamera-Küche-Fassung),
  `/verkaufen`-Hero → `modelWohnung` (dafür freigeworden).
- **GEO-Content-Balkendiagramme grundlegend gefixt**: `cellNumber()` akzeptierte jede
  Ziffernfolge in der letzten Tabellenspalte blind — dadurch wurden u. a. **Telefonnummern**
  (Standort-Tabellen bei `bester-immobilienmakler-speyer`/`geerbtes-haus-verkaufen-speyer`),
  **Jahreszahlen/Quartalsangaben** (`bester-immobilienmakler-ludwigshafen`) und eine
  Mischung aus Ranking+Jahr+Anzahl gemittelt und als Chart-Balken dargestellt — sinnlose
  bis peinliche Ergebnisse. Neue Logik: `cellMetric()` verlangt ein erkennbares
  Einheiten-Signal (€/%/m²/Zeitdauer — Zeitdauern werden auf Tage normiert, damit „3 Wochen"
  und „75 Tage" vergleichbar werden), `pickChartColumn()` wählt die am besten geeignete
  Spalte statt blind die letzte, und Rechenschritt-Tabellen (Zeilen mit −/=/+-Präfix, z. B.
  die Spekulationssteuer-Beispielrechnung) bekommen bewusst **keinen** Balken mehr — ein
  flacher Größenvergleich ist bei einer laufenden Subtraktion irreführend.
- **Fehlende Rechenbeispiele ergänzt**: Workflow-Audit über alle 16 Ratgeber-Artikel
  (Frage: hat das Thema eine Formel/Berechnung, aber KEIN durchgerechnetes Zahlenbeispiel?).
  9 Sections bekamen ein neues „Rechenbeispiel zur Orientierung" mit echten €-Beträgen
  (u. a. Maklerprovision Ludwigshafen, Erbschaftsteuer-Freibeträge, Mietrendite,
  Verkaufskosten-Aufstellung) — im selben Stil wie die bereits vorhandenen Referenzbeispiele
  (Spekulationssteuer, Notarkosten), konsistent mit bereits im Projekt verwendeten Sätzen
  (5,95 %/7,14 % Provision, 35 % Grenzsteuersatz, Erbschaftsteuer-Freibeträge) — keine neuen
  Rechtswerte erfunden.
- **Neu: Hero-Bild der Startseite per `/intern` austauschbar** (Tab „Medien"): Bild per
  Klick aus dem BunnyCDN-Storage übernehmen oder per Drag & Drop hochladen. Architektur:
  neue Supabase-Tabelle `site_settings` (Key-Value, öffentlich lesbar, Schreiben nur
  `service_role`), `page.tsx` liest den Wert serverseitig mit Fallback auf das feste
  Default-Foto (Seite bricht nie, auch ohne Supabase/Bunny-Konfiguration). Eine Änderung
  geht per `revalidatePath("/")` **sofort** live, zusätzlich `revalidate = 300` als
  ISR-Sicherheitsnetz. Passwort-Prüfung aus `/api/intern` in `admin-auth.ts` extrahiert und
  von der neuen Route mitgenutzt (gleicher zeitkonstanter Vergleich, gleiches Rate-Limit).
  **Für den Produktivbetrieb nötig** (in Vercel als Env eintragen + SQL-Migration
  ausführen): `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ACCESS_KEY` (Werte aus dem Bunny-Dashboard
  wie bei `scripts/bunny-upload.mjs`), sowie den neuen `site_settings`-Block aus
  `docs/supabase-schema.sql` (Abschnitt „6) Site-Settings") einmal im Supabase-SQL-Editor
  ausführen. Ohne diese Konfiguration bleibt die Startseite unverändert beim festen Foto.
- **Gründungsjahr-Recherche** (Workflow, 6 unabhängige Web-Rechercheagenten + Kreuzprüfung):
  kein von der Firma selbst schriftlich bestätigtes Jahr auffindbar — die eigene Website
  vermeidet bewusst eine Zahl. Amtlicher Handelsregistereintrag (Nordata, HRA 51804 Sp,
  AG Ludwigshafen): Ersteintragung **14.11.2005**, Inhaberin Sylwia Riegel. Eine
  Presseangabe (Rheinpfalz 2022, Zitat Manfred Riegel) deutet auf informellen Start ca. 2002
  hin. Die kursierende Zahl „seit 1989" wurde als Artefakt entlarvt (generischer
  JACASA-Vorlagentext, identisch bei fremden Maklerbetrieben, rechnerisch aus einer
  statischen „37-Jahre"-Marketingphrase von 2021 hochgerechnet) — **nicht verwenden**.
  Empfehlung: entweder unscharf „seit über 20 Jahren" (deckt beide Daten ab, kein Risiko),
  oder mit Verweis auf die Registereintragung „seit 2005". Vor einer festen Jahreszahl auf
  der Website am besten kurz bei Manfred/Sylwia Riegel direkt nachfragen.

## Update — „RIEGEL Blitzverkauf": Three.js-3D-Spiel auf /spiel (Easter Egg) ✅

- **Idee (Alex)**: „Mit einer Kanone Würfel auf Häuser schießen beim Vorbeifliegen —
  bei Treffer steht das Haus verkauft, +500.000 € — lustig, aber visuell super cool und
  nahtlos im Seiten-Stil." Umgesetzt als 45s-Arcade unter `/spiel` (noindex, Footer-Link
  „Blitzverkauf (Spiel)"), Endscreen verlinkt augenzwinkernd auf `/verkaufen`.
- **Stack**: three ^0.185 + @react-three/fiber ^9.6 (React-19-kompatibel), bewusst OHNE
  drei/postprocessing/Physik-Engine — alles pure Geometrie + eigene Shader, kein Asset-Load.
- **Gameplay**: Kameraflug auf Schienen über nächtliche Vorderpfalz; sichtbare Kanone
  unten im Bild folgt dem Fadenkreuz (geglättet), schießt RIEGEL-blaue **Würfel** in
  ballistischer Parabel (Raycast-Hitscan beim Klick entscheidet, Würfelflug ist visuell;
  onHit erst beim Einschlag, claimedIds verhindert Doppel-Beschuss). Treffer: Haus bleibt
  stehen, **VERKAUFT-Makler-Schild** (CanvasTexture, geteilt) federt ein, Trümmer-Burst
  (InstancedMesh), Emissive-Blitz mit Rest-Glühen, Fenster dimmen. **Hauswerte kommen aus
  den echten regionalen €/m²-Spannen** (marktdaten.ts) — Datenbezug wie gewünscht.
- **Game-Feel**: 3-2-1-LOS-Countdown, Combo-Multiplikator ×2–×5 (2,5s-Fenster),
  Highscore in localStorage („Neuer Rekord!" + Konfetti), 2px-Timer-Bar, Score-Count-up im
  Endscreen, WebAudio-Synth-Sounds (Shot/Hit/Miss, mutebar+persistiert, kein Asset),
  Touch-Support (Fadenkreuz nur bei Maus). prefers-reduced-motion überall respektiert.
- **Umgebung**: 70 Bäume + 24 Laternen als InstancedMeshes, 350-Sterne-Band, Stadt-
  Silhouette mit stilisiertem Speyerer Dom, die per Kamera-Sync dauerhaft im Fog-Horizont
  steht; Boden-Shader = gedämpfte wave-shader-Formel + dunkle Straße. Keine PointLights.
- **Prozess**: v1-Fundament direkt gebaut & committed, dann Workflow mit 4 parallelen
  Bau-Agenten auf disjunkten Dateien (eingefrorene Interfaces), 2 Verify-Agenten
  (Build-Check + Integrations-Review) und 1 Fix-Agent. Review fand 6 echte Findings
  (u. a. Kamera-Ruck beim Rundenstart, doppelt definierte FLIGHT_SPEED, Canvas rendert
  im Endscreen weiter) — alle 6 gefixt. Eigene End-Verifikation: tsc 0 Fehler, Lint clean,
  Build 76 Seiten grün, Startscreen-Screenshot bestätigt.
- **Wichtig fürs Testen**: WebGL ist in der Sandbox nicht darstellbar (headless-Limit) —
  die 3D-Szene selbst bitte einmal im echten Browser auf Vercel gegenspielen.

## Update — Blitzverkauf: Mobile-Fix + Humor-Paket (Manfred-Edition) ✅

- **Mobile-Bug behoben** (Alex-Screenshot: Start-Button unsichtbar, Spiel nicht startbar):
  `aspect-[4/3]` ergab auf schmalen Screens nur ~290px Container-Höhe, der zentrierte
  Start-Inhalt war höher und `overflow-hidden` schnitt Badge UND Button ab. Fix:
  Hochformat `aspect-[3/4]` auf Mobile (gibt dem Flug zugleich mehr Sicht nach vorn),
  kompaktere Start-/Endscreen-Abstände, `touch-action: manipulation` gegen
  Doppeltipp-Zoom. Programmatisch verifiziert (Button `fullyInside: true` bei 390×844).
- **Konkurrenz-Ladenhüter** (~jedes 7. Haus, nie in den ersten Reihen): graues Haus,
  dunkle Fenster, schiefes Schild „ZU VERKAUFEN · SEIT 379 TAGEN" (echte Ø-Standzeit
  bei ~20 % Überpreisung aus dem Ratgeber — bewusst KEIN realer Konkurrenz-Name).
  Abschuss = Rettung: doppelte Punkte, RIEGEL-Schild ersetzt das graue, Dach wird blau.
- **Bissige Einzeiler** (Quips, unten eingeblendet): bei Fehlschuss gedrosselt rotierend
  („Daneben — das verkauft jetzt die Konkurrenz. In 379 Tagen.", „Knapp vorbei. Passiert.
  Uns halt selten."), bei Rettung („Ladenhüter gerettet — 379 Tage waren genug.") und bei
  Combo-Meilensteinen („×5! Top 21 von 25.000 — man merkt's.").
- **Karriere-Zeugnis im Endscreen**: Rang nach Score — Kaltakquise → Praktikum bestanden
  → Junior-Makler:in → Verkaufsprofi → Top 21 von 25.000 → **„Der Manfred™"** („Out of
  the box. Über den Dächern. Ausverkauft.") — der Familien-Lacher zum Weiterreichen.
- tsc/Lint/Build grün; Mobile-Startscreen per CDP-Screenshot (echte Mobile-Emulation)
  verifiziert.

## Update — Blitzverkauf: Bestenliste mit Namenseingabe & Monats-Reset ✅

- **Neue Tabelle `game_scores`** (`docs/supabase-schema.sql` §7, RLS: nur `insert` für
  anon, KEINE `select`-Policy) — Lesen läuft ausschließlich über `/api/game-scores` mit
  dem service_role-Key, der die E-Mail nie in der Antwort mitschickt.
- **`/api/game-scores`** (GET/POST): liefert die Top-20 des laufenden Monats (Reset rein
  über `WHERE created_at >= Monatsanfang` — nichts wird gelöscht, Alex behält die volle
  Historie für die Gewinner-Auswertung). Eingeloggte Spieler:innen verifizieren ihre
  E-Mail server-seitig per `access_token` (`supabaseServer.auth.getUser`) — eine im Body
  mitgeschickte E-Mail wird in dem Fall ignoriert, ganz nach „eingeloggt heißt schon
  eingeloggt". Name-Sanitizing entfernt nur Steuerzeichen (`/[\x00-\x1F\x7F]/g`), Leer-
  zeichen/Bindestriche in Namen wie „Anna-Lena" bleiben erhalten.
- **Rundenende-Formular** (nur bei `score > 0`): Name/Spielername, optionales E-Mail-Feld
  (nur wenn nicht eingeloggt — sonst Hinweistext mit der Konto-Mail), Consent-Checkbox
  blendet sich erst per `.t-collapse` ein, sobald eine E-Mail eingetippt wird. Icon-Box
  erklärt den monatlichen Reset und dass Platz 1–5 eine kleine Überraschung bekommen.
  „Ohne Eintrag weiter" überspringt komplett.
- **`Leaderboard`-Komponente** (`components/game/leaderboard.tsx`): Rangliste mit
  Medaillen-Badges (Platz 1 solid, 2–3 akzentuiert, Rest outline), eigener Eintrag farblich
  hervorgehoben, tabular-nums.
- Der Endscreen ist jetzt intern scrollbar (`overflow-y-auto`, `justify-start` statt
  `justify-center`) — mit Formular/Bestenliste passt der Inhalt auf kleinen Screens sonst
  nicht mehr in die feste Spielfläche.
- Anders als sonst in dieser Sandbox üblich **konnte WebGL diesmal per
  `--use-gl=swiftshader` doch headless laufen** — der komplette Ablauf (Runde spielen,
  Formular, Validierungsfehler, echte + gemockte Bestenlisten-Antwort) wurde live per
  Playwright durchgespielt und screenshotet, nicht nur code-verifiziert.
- tsc/Lint/Build grün.
- **Für Alex/Familie Riegel zu klären, bevor die Migration live geht:** echte Preise für
  Platz 1–5 sind ein Gewinnspiel — dafür braucht es i. d. R. kurze Teilnahmebedingungen
  (Teilnahmeberechtigung, Ausschluss Rechtsweg, Gewinnbenachrichtigung/-frist). Sag
  Bescheid, wenn ich einen Entwurf dafür schreiben soll.

## Update — Blitzverkauf: Hintergrundmusik (ElevenLabs-Loop) ✅

- Alex' generierter 45s-Loop (`Riegel_Arcade_Loop`) liegt als
  `public/audio/blitzverkauf-loop.mp3` im Projekt (kein BunnyCDN nötig — einzelnes,
  kleines Spiel-Asset, gleiche Behandlung wie die Logo-SVGs).
  `src/lib/game-audio.ts` bekam dafür `playMusic()`/`stopMusic()`: Track startet exakt
  beim „LOS!" (Rundenlänge == Tracklänge, kein `loop` nötig), Lautstärke bewusst auf `0.28`
  gedeckelt („nicht allzu laut", Schuss/Treffer-Blips sollen durchkommen), Rundenende
  faded ihn in 250ms sanft statt hart abzuschneiden. Der bestehende Mute-Button steuert
  jetzt Musik + SFX gemeinsam; beim Verlassen der Seite wird der Track sofort gestoppt
  (er lebt als Modul-Singleton, nicht am Komponenten-Lifecycle).
- **Live per Playwright verifiziert** (nicht nur code-geprüft): `play()` feuert exakt
  ~2,8 s nach Klick auf „Los geht's" (passt zum 3-2-1-LOS-Countdown), Lautstärke beim Start
  `0.28`/unmuted, `pause()` nach dem Fade bei `currentTime≈45,04 s` — Musik und Rundenlänge
  laufen praktisch deckungsgleich. Mute-Toggle mittendrin verifiziert: schaltet
  `musicEl.muted` sofort um.
- tsc/Lint/Build grün.

## Update — Blitzverkauf: Ergebnis-Screen ohne gefangene Mini-Scrollbar ✅

- Alex' Live-Test: Formular + Bestenliste passten nicht mehr in die feste Spielfläche,
  eine eigene `overflow-y-auto`-Box darin fühlte sich „gefangen" an. Fix: Die Box hat in
  der Ergebnis-Phase gar keine feste Höhe mehr (`aspect-[3/4]`/`aspect-video` nur noch
  während Countdown/Spiel aktiv) — sie wächst einfach mit dem Inhalt, und bei Bedarf
  scrollt ganz normal die Seite statt einer kleinen Box-in-der-Box.
- Ehrlich dazu: bei viel Inhalt (Name + optionale E-Mail + Info-Box + Bestenliste +
  zwei Buttons) auf einem Handy-Bildschirm lässt sich Scrollen nicht komplett vermeiden —
  aber jetzt ist es normales Seiten-Scrollen statt einer verwirrenden Mini-Scrollbar.
- Live per Playwright verifiziert: Formular- und Bestenliste-Zustand wachsen sauber in
  den Fluss, „Nochmal spielen" bleibt direkt darunter erreichbar.

## Update — OnOffice-Live-Anbindung des Portals ✅

- **Client** (`src/lib/onoffice.ts`, server-only): `isOnOfficeEnabled` (Token+Secret gesetzt?),
  `fetchOnOfficeEstates()` signiert Requests per HMAC v2 gegen `api.onoffice.de`, mappt
  `estate`-Records aufs bestehende `Estate`-Modell (`mock-estates.ts`, unverändert bis auf das
  neue optionale Feld `externalId`) und zieht pro Objekt die Bilder über `estatepictures` nach —
  fehlt dafür das Leserecht, bekommt das Objekt einfach `images: []` statt die ganze Ladung
  abzubrechen. Liefert `null` bei fehlender Konfiguration, API-/Netzwerkfehler oder 0 sichtbaren
  Objekten — der Aufrufer fällt dann auf Mock zurück.
- **Quelle** (`src/lib/estates.ts`): `getEstateData()`/`getEstateBySlug()`/`getFeaturedEstates()`/
  `getEstateOrte()` als einheitlicher Einstiegspunkt, gecacht über `unstable_cache` (300 s TTL,
  Tag `estates`) — cached wird das **Ergebnis** (inkl. Mock-Fallback), nicht der Request, weil
  der HMAC-Timestamp sich jede Sekunde ändert und sonst nie ein stabiler Fetch-Cache-Key
  entstünde. `EstateData.source` (`"onoffice" | "mock"`) macht die aktive Quelle für
  Debug-/Hinweisbanner sichtbar.
- **Portal/Detail/Merkliste/Home/Sitemap umgezogen**: `/immobilien`, `/immobilien/[slug]`,
  `/merkliste`, Homepage-Featured-Sektion und `sitemap.ts` lesen jetzt alle über
  `src/lib/estates.ts` statt direkt `mockEstates` zu importieren — Umschalten auf Live-Daten
  passiert für alle fünf Stellen gemeinsam, ohne UI-Änderung.
- **Slug-Schema** stabil gegen Titeländerungen: `slugify(objekttitel) + "-" + Id`,
  `getEstateBySlug` matcht primär über die numerische Id am Slug-Ende, sekundär exakter
  Slug-Vergleich (deckt bestehende Mock-Slugs wie `e1-penthouse-…` weiter ab) — alte Links
  bleiben also auch nach einer Titel-Änderung in OnOffice gültig.
- **next.config.ts**: `*.onoffice.de` als `remotePatterns`-Host ergänzt, damit `next/image`
  künftige OnOffice-CDN-Bilder optimieren darf.

### Probe-Ergebnisse (09.07.2026)

Mit den von Sissy erhaltenen Live-Credentials verifiziert: Auth/HMAC funktioniert
einwandfrei (`errorcode 0`), `fields:get` liefert 251 Felder — aber der API-Nutzer hat noch
**kein Sichtbarkeitsrecht auf Immobilien-Datensätze** (`estate read` liefert `cntabsolute: 0`)
und **kein Leserecht auf Objektbilder** (`estatepictures` → `errorcode 170`). Solange das so
ist, greift der oben beschriebene Fallback: Das Portal zeigt weiterhin die Mock-Objekte, ohne
Deploy schaltet es auf Live um, sobald Sissy die Rechte in onOffice enterprise freischaltet
(Details + To-do-Liste: [onoffice-integration.md](./onoffice-integration.md) §9).

## Update — Portal LIVE mit 110 echten Objekten + Exposé-Flow + Filterleiste ✅

Sissy hat die Objekt-Sichtbarkeit freigeschaltet — `estate read` liefert jetzt **110 echte
Objekte** (92 Kauf / ~17 Miete, 41 Orte). Der komplette Live-Pfad läuft lokal verifiziert:

- **Daten-Feinschliff nach Analyse aller 110 Datensätze**: `rooms` 0→null (Grundstücke zeigen
  keine „0 Zi." mehr), **Ort-Normalisierung** („Ludwigshafen am Rhein / Rheingönheim" → Stadt
  „Ludwigshafen" + Stadtteil als district; „Harthausen , Pfalz" → „Harthausen") — Filter-Dropdown
  ist damit sauber (32 statt 41 wirre Einträge), `objektnr_extern` „2183 (1/2183)" → „2183",
  `formatArea` de-DE mit max. 1 Nachkommastelle („108,8 m²" statt „108.79 m²").
- **Titel-Präfix entfernt**: Jeder CRM-Titel beginnt mit „Sie hier? Wir auch!" — das ist
  IS24-Konkurrenz-Marketing und auf der EIGENEN Website Redundanz auf jeder Karte. Wird beim
  Mapping abgeschnitten (CRM unberührt). **Falls Manfred den Spruch auch auf riegel.de will:
  eine Zeile in `onoffice.ts` — bitte Feedback.**
- **PDF-Exposé-Flow (Konto-Anreiz)**: onOffice `pdf:get` mit Template „Exposé Riegel neu 2026"
  live verifiziert (base64+zlib → echtes 4-MB-PDF). Neue Route `/api/expose` (Konto-Gate über
  Supabase-Access-Token, Rate-Limit, **nur öffentlich gelistete Objekte** — keine Id-Enumeration
  auf unveröffentlichte Exposés) + `ExposeCta` auf der Detailseite: eingeloggt = Download-Button,
  ausgeloggt = „Konto erstellen & Exposé erhalten" mit `?next=`-Rücksprung nach Login
  (Open-Redirect-sicher, nur interne Pfade).
- **Filterleiste neu angeordnet** (Sonnet-Agent auf Sissys Feedback): Desktop — Pills links
  sauber umbrechend, „Neueste" fest rechts oben, Zähler + „Suche speichern" auf einer
  horizontalen Achse; Mobil — Swipe-Reihe + kompakte Zähler/Speichern-Zeile. Vorher/Nachher-
  Screenshots im Scratchpad geprüft.
- Ein separater QA/Journey-Workflow (Daten-Kreuzcheck gegen die IS24-Zweitquelle + 3
  Journey-Linsen) lief parallel — Ergebnisse im nächsten Update.

## Update — QA-/Journey-Orchestrierung: 14 Findings umgesetzt ✅

Nach dem Live-Gang: 5 Sonnet-Agents (Daten-Kreuzcheck gegen unabhängige IS24-Zweitquelle,
Render-Grenzfälle, Käufer-/Konto-/Trust-Journey) + 3 Fix-Agents parallel. Kreuzcheck-Ergebnis:
**96 % Match, 0 Wert-Abweichungen** bei Preis/Zimmer/Fläche/Ort auf allen vergleichbaren Karten
— die Mapping-Pipeline stimmt. Umgesetzt:

- **Karten-Clustering** (MapLibre-nativ, RIEGEL-blaue Cluster-Kreise, sanfter Expansion-Zoom) —
  vorher überlappten ~1/3 der 100+ Pins unklickbar. Fallback: ohne Tile-Netz bleiben Einzel-Pins.
- **„Weitere Objekte anzeigen"** — Liste lädt 24er-Chunks statt 92 Karten auf einmal; Karte
  zeigt weiter den Gesamtbestand. Mobile-FAB „Karte anzeigen" kollidiert nicht mehr mit dem
  Consent-Banner (nach rechts + erscheint erst nach Consent-Entscheidung).
- **CRM-Dubletten-Schutz**: 5 real doppelt angelegte Objekte im OnOffice-CRM (identischer
  Titel/Preis/PLZ, 2 Ids) werden serverseitig dedupliziert — es gewinnt der jüngere Datensatz.
- **Beschreibungs-Qualität**: App-Werbe-Boilerplate („…RIEGEL APP… / Hallo Zukunft……") wird
  beim Mapping entfernt (3 Varianten, QA-verifiziert), Absätze bleiben erhalten
  (whitespace-pre-line statt 3000-Zeichen-Textwurst), Ausstattungs-Chips zerreißen keine
  Kommazahlen mehr und zeigen keine Überschriften/Jahreszahlen als Pillen.
- **Rechtlich (kritisch)**: Terminbuchung (/termin) sammelte Name/E-Mail/Telefon OHNE
  Datenschutz-Einwilligung — Checkbox + /datenschutz-Link ergänzt (Muster der anderen
  Formulare); Kontaktformular-Datenschutz jetzt verlinkt.
- **Objektbezug bleibt erhalten**: „Besichtigung anfragen" reicht den Objekttitel als
  `?objekt=` an /termin und /kontakt durch (Nachricht vorbefüllt); Modal-Text ehrlich gemacht.
- **Detailseite**: Merken-Herz am Preis (fehlte komplett!), Google-Maps-Routen-Link im
  Lage-Abschnitt, **mobile Sticky-CTA-Leiste** (Preis + Anfrage unten fixiert — der Button lag
  sonst 60 % der Seite tief), Objekt-ID aus objektnr_extern.
- **Konto-Journey**: `signUp` mit `emailRedirectTo` (Bestätigungslink führt zurück zum Objekt),
  Vorab-Zugang-Argument jetzt VOR dem Login sichtbar (Konto-Intro, Merkliste-CTA), Exposé-CTA-
  Wortlaut vom kostenlosen Merken entkoppelt. Kategorie-Icons im „Fotos folgen"-Platzhalter.

**CRM-Pflege für Sissy** (Portal fängt es ab, sauber wäre es an der Quelle):
Dubletten-Paare objektnr 2068/1769, RIEGEL-2157/2163, RIEGEL-2322/2350, RIEGEL-2386/2464,
RIEGEL-2430/2487 (je eins archivieren) · Objekt RIEGEL-2457: Kaltmiete-Feld leer (Portal zeigt
korrekt „Warmmiete") · App-Werbe-Textbausteine in objektbeschreibung könnten raus.

**Bewusst zurückgestellt** (nächster Batch): Teilen-/Druck-Button Detailseite, Mini-Lagekarte,
Rückruf-CTA, Header-Login-Status, Toast beim ersten Herz-Klick, „Passwort vergessen"-Link,
Karten-Fehlerhinweis bei Tile-Ausfall.

## Update — Portal FINAL: echte Objektfotos + Polish-Batch + Passwort-Reset ✅

- **Echte Fotos live**: Sissy hat das `estatepictures`-Recht freigeschaltet. Wichtiger Fix
  dabei: Die echte API-Antwort trägt `elements` als **Array** von Bild-Objekten (nicht als
  Dict wie bei `estate:read`) — der Parser hätte sonst alle Bilder stumm verworfen. Verifiziert:
  Liste + Galerie rendern `image.onoffice.de`-Fotos, 0 Platzhalter. Host war in
  `next.config.ts` (`**.onoffice.de`) schon freigegeben.
- **district-Leak gefixt**: `regionaler_zusatz` enthält account-weit nur interne Schlüssel
  (`['indMulti…']`) — wird verworfen, Stadtteil kommt ggf. aus dem Ort-Feld.
- **Polish-Batch** (Sonnet-Agent): Teilen-Button (navigator.share + „Link kopiert"-Fallback)
  neben dem Herz, `@media print`-Regeln, Login-Punkt am Header-Konto-Icon, einmaliger
  Merk-Hinweis-Toast beim ersten Herz-Klick (mit Konto-Link), Karten-Fehlhinweis bei
  Tile-Ausfall.
- **Passwort-vergessen-Flow** (Sonnet-Agent): „Passwort vergessen?" auf /konto (Inline,
  konto-agnostische Erfolgsmeldung), neue Seite `/konto/passwort` für den Reset-Link
  (Recovery-Session → neues Passwort setzen, t-success-check, noindex).
- tsc/Build grün; Fotos/Detail per Screenshot verifiziert.

## Update — Portal-Feinschliff: Sterne, Karte-DE, Galerie-Dots, Mobil-Filter, Anfrageformular, Mails ✅

- **Sterne-Bug endgültig**: Die doppelte Overlay-Ebene (accent per width% über faint geklippt)
  ist weg — jetzt EINE Ebene, auf ganze Sterne gerundet, alle gleich gefüllt. Betraf
  `trust-strip.tsx` (Overlay) + `testimonials.tsx` (Outline-Silhouette). **Neue Standing Rule:
  Sterne immer als eine gefüllte Ebene, nie Overlay-Klipp, nie Outline für „leere" Sterne.**
- **Karte auf Deutsch**: MapLibre-Symbol-Layer nach `load` auf `name:de` umgestellt
  (Bundesländer/Städte deutsch statt Landessprache).
- **Galerie-Dots + Pfeile nur bei Hover** (Objektkarten + Detail-Galerie) — auf Touch bleiben
  sie sichtbar (`@media(hover:hover)`).
- **Mobil-Filter neu** (make-interfaces-feel-better): statt endlosem Seitwärts-Scrollen jetzt
  ein „Filter"-Button mit Aktiv-Badge → Vollbild-Bottom-Sheet, alle Filter untereinander mit
  Labels, fixierter „N Objekte anzeigen"-Button, Escape/Backdrop-Close, Scroll-Lock. Desktop
  unverändert. (Sonnet-Agent, per Screenshot verifiziert.)
- **Echtes Anfrageformular** auf der Detailseite ersetzt den „in Vorbereitung"-Platzhalter:
  Name/E-Mail/Telefon/Nachricht (vorbefüllt), Consent, POST an neue Route `/api/inquiry`
  (Supabase-Lead + Mail + **best-effort OnOffice `create address`**). Route liefert auch ohne
  Supabase/Resend sauber `ok:true` (lokaler Fallback). `createLeadAddress()` in `onoffice.ts`
  ist eingebaut, aber **NICHT live getestet** (schreibt ins CRM — Freigabe nötig).
- **Markenkonforme Mails**: `emailLayout()` mit echtem Logo-PNG (`public/email-logo-riegel.png`,
  aus dem SVG gerastert — SVG rendert in Gmail/Outlook nicht), RIEGEL-blaue Akzentlinie, große
  Uppercase-„Superheadline" (Akira-Approximation, echte Fonts gehen in E-Mail nicht), optionaler
  blauer CTA-Button. Neue Vorschau-Route `/api/mail-preview?type=…` rendert die Mails im Browser
  OHNE Versand. Per Screenshot verifiziert (Logo, Headline, Tabelle, CTA).

## Update — Konto/Merkliste an echte Daten + DSGVO-Löschung ✅

- **„2 Herzen"-Bug**: Alt-Favoriten aus der Mock-Phase (IDs `e1`…`e10`) werden beim
  Laden aussortiert — der Header-Zähler zeigte sonst Favoriten ohne Objekt. Zusätzlich
  neue `reconcile()`-Methode + „Aufräumen"-Button in der Merkliste für echte, nicht mehr
  verfügbare Objekte (nur bei Live-Daten, nicht im Mock-Fallback).
- **Suchprofil an echte Möglichkeiten**: Objektarten auf die real existierenden vier
  Kategorien reduziert (Mehrfamilienhaus raus), Regionen kommen jetzt live über neue Route
  `/api/estate-orte` aus dem OnOffice-Bestand (Fallback-Liste bleibt).
- **Konto-Löschung (DSGVO Art. 17)**: neue Route `/api/account/delete` (verifiziert Token,
  löscht Auth-User via service_role → Profile/Favoriten/Suchen kaskadieren), Danger-Zone in
  `/konto` mit zweistufiger Bestätigung, räumt lokale Spuren auf, meldet ab, leitet weiter.
  Braucht `SUPABASE_SERVICE_ROLE_KEY` in Vercel (sonst klare 503-Meldung).

## Update — E-Mail-Redesign: helles Karten-Layout + Resend live ✅

- **Resend produktionsbereit**: Domain-Strategie auf Subdomain **`m.riegel-immobilien.de`**
  umgestellt (DNS-Dienstleister war mit der Hauptdomain überfordert). MX/SPF/DKIM gesetzt,
  Resend-Verifizierung **grün** — erste echte Mails erfolgreich an alex@beuwy.com versendet.
  `EMAIL_FROM=RIEGEL Immobilien <mail@m.riegel-immobilien.de>` lokal in `.env.local`.
- **Redesign nach Alex' Design-Referenz** (helle Pastell-Card-Optik, RIEGEL-Blau statt
  Pink/Grün): Body `#eef1f7`, weiße Karte (Radius 20, Border `#e4e8f0`), **dunkles**
  Logo-PNG (`public/email-logo-riegel-dark.png`, 220px, per Playwright aus dem SVG
  gerastert) + MSO-Text-Wordmark-Fallback, blaue Akzentlinie, 30px/800-Uppercase-Headline
  `#141724`, Label/Wert-Zeilen in weichem `#eef3ff`-Info-Block (Radius 16, Trenner
  `#dbe5fa`), Bulletproof-VML-Pill-CTA `#015cff`, Footer `#8a90a3`, `color-scheme: light`.
- **Farb-Patch der echten Mail-Routen** (kritischer Agent-Fund): `contact`, `inquiry` und
  `report` bauten eigenes HTML mit den alten Dunkel-Farben — auf der neuen weißen Karte
  wäre der Text fast unsichtbar gewesen. Mapping: `#f4f3f0→#141724`, `#a8a6a0→#5a6072`,
  `#7c7a75→#6b7590`, Wert-Hero-Box `#0f1117→#eef3ff` (Border `#dbe5fa`), Hero-Zahl im
  Report jetzt RIEGEL-Blau `#015cff`. Identisch zur Vorschau in `/api/mail-preview`.
- Verifiziert: tsc 0, Lint 0, Screenshots aller 5 Varianten (inquiry/contact/confirm/
  booking/report) spec-konform; die 3 Dunkel-Reste in `mail-preview` sind die interne
  Browser-Übersichtsseite (dunkler Hintergrund, keine E-Mail) — bewusst so.

## Update — Incident „plötzlich Mock" + Bild-Performance-Batch ✅

- **Incident (Prod zeigte Mock statt Live)**: Ein einzelner fehlgeschlagener
  OnOffice-Pull (kalter Start) wurde vom `unstable_cache` als Mock-Ergebnis
  persistiert und via stale-while-revalidate dauerhaft ausgeliefert — die
  Revalidation heilte sich auf Vercel nicht selbst (parallel bewiesen:
  `/api/estate-orte` lieferte echte Orte, `/immobilien` Mock; OnOffice-API
  direkt in ~1s gesund). **Fix**: In `estates.ts` wird NUR der Erfolgsfall
  gecacht (Throw statt Mock im Fehlerfall, Mock-Fallback pro Request außerhalb
  des Caches), neuer Cache-Key `estates-live` evakuierte den vergifteten
  Eintrag. Nach Deploy in ~75s verifiziert geheilt. Standing Rule:
  **Fail-Soft-Fallbacks niemals in einen persistenten Cache schreiben.**
- **Bild-Performance Root Cause**: `image.onoffice.de` sendet
  `Cache-Control: private` → Vercel verwarf optimierte Varianten und
  transformierte die Originale (URLs tragen bereits `@1600x1200`-Suffix)
  ständig neu; dazu langsames AVIF-Encoding. **Fix in `next.config.ts`**:
  `minimumCacheTTL: 2678400` (31 Tage — sicher, da Foto-URLs UUID-stabil sind)
  + nur noch WebP. Live gemessen: optimierte Antwort jetzt
  `cache-control: public, max-age=2678400`, Edge-HIT ~0,3s, Kartenbild
  (w=640) ~40 KB.
- **„Nur 1 Bild im Preview, Rest auf Klick"** (Alex' Wunsch): Detailseite
  lädt nur noch den Galerie-Hero (Thumbnail-4er-Grid entfernt, `sizes`
  präzisiert, „Alle N Fotos"-Pill prominenter, ausgeblendet bei nur 1 Foto);
  Lightbox lädt on demand + lädt unsichtbar das jeweils nächste Bild vor.
  Portal-Karten: fester 480px-`sizes`-Bucket statt 40vw; bei >8 Fotos
  kompakter Zähler statt Dot-Reihe. Netzwerk-verifiziert: Detailseite vor
  Lightbox-Öffnung nur noch 1 Galerie-Request (vorher 5).

## Update — Karten-Klick, Anfrage-Modal, GEO-Ausbau (3 parallele Agenten) ✅

- **Karten-Pill → Liste** (Alex' Bug „passiert gar nichts außer kleiner Zoom"):
  Die gechunkte Liste (24er-Blöcke) hatte für Objekte dahinter keine Karte im
  DOM — `onActivate` klappt die Liste jetzt bis zum Objekt auf, scrollt
  zentriert hin (Re-Scroll-Guard), mobil wechselt die Ansicht zur Liste,
  Pill-Doppelklick zoomt nicht mehr. E2E gegen Live-Daten verifiziert.
- **Anfrage-Modal-Fix** (Alex: „am Desktop nicht verwendbar, brutal
  abgeschnitten"): modal.tsx hatte keine max-Höhe/kein Overflow → jetzt
  `max-h-[calc(100dvh-2rem)]` + internes Scrollen, `maxWidthClassName`-Prop
  (Anfrage: max-w-xl), Formular kompakter (Name/E-Mail nebeneinander,
  Sekundär-Links als 3er-Reihe). ROOT CAUSE mobil: die Sticky-CTA-Leiste mit
  `backdrop-blur` wurde per CSS-Spec zum Containing Block des fixed-Modals →
  Fix via `createPortal(document.body)`. Verifiziert in 1440×900 (passt ohne
  Scroll), 1280×720, 390×844 + „Mehr Filter"-Regression.
- **Standing Rule (Alex' Auflage)**: Interaktive UI (v. a. Modals/Overlays)
  wird vor JEDEM Deploy per Playwright in min. 3 Viewports (1440×900,
  1280×720, 390×844) mit Geometrie-Assertions (Dialog vollständig im
  Viewport) getestet — kein Ship ohne diesen Beweis.
- **GEO-Ausbau nach realem Bestand**: Abgleich der 31 echten OnOffice-Orte
  mit den 18 Standort-Seiten → 15 neue Seiten (Brühl, Hockenheim, Lambsheim,
  Lingenfeld, Hanhofen, Harthausen, Hochstadt, Sankt Martin, Wörth am Rhein,
  Elmstein, Neuhemsbach, Otterbach, Gundersheim, Heppenheim, Karlsruhe) —
  erscheinen automatisch im Preisatlas (Koordinaten/Region/Stadt-Faktoren in
  geo-taxonomy/marktdaten, ehrlich hergeleitet und kommentiert). Ostsee-
  Ausreißer (Dahme, Middelhagen) bewusst OHNE „Makler vor Ort"-Seite.
- **Echte Objekte in GEO-Seiten**: neue Server-Komponente `EstatesTeaser`
  (nur aktive Objekte, Featured zuerst, `null` bei 0 Treffern) — Standort-
  Seiten zeigen „Aktuelle Angebote in {Ort}" (robustes City-Matching inkl.
  „Römerberg Heiligenstein"/„Heppenheim (Bergstraße)"), Ratgeber-Artikel
  2er-Teaser am Ende, Preisatlas-Panel verlinkt ins Portal. PropertyCard
  wiederverwendet.
- Bekannter Feinschliff (dokumentiert, bewusst nicht angefasst): Der
  PreisRECHNER (`valuation.ts`) schätzt Karlsruhe zu niedrig (DEFAULT-Basis)
  und kleine Pfalz-Orte über den „pfalz"-Substring-Fallback leicht zu hoch —
  Preisatlas ist davon unabhängig (eigener Stadt-Faktor-Pfad).

## Update — Mail-Versand auf Produktion LIVE ✅

- Alex hat `RESEND_API_KEY` + `EMAIL_FROM` in Vercel gesetzt. Erster Versuch
  schlug mit „domain is not verified" fehl — Ursache: Key aus einem ANDEREN
  Resend-Konto als dem mit der verifizierten Subdomain (DKIM ist
  kontospezifisch!). Diagnose-Weg dokumentiert: sendMail() serialisierte
  Resend-Fehler als `[object Object]` → Fix (error.message), danach war die
  Ursache sofort lesbar. Nach Key-Tausch auf den Send-Key des
  riegelimmo@gmail.com-Kontos + Redeploy: **Produktions-Mail erfolgreich an
  alex@beuwy.com versendet** (`ok:true`, Absender
  `RIEGEL Immobilien <mail@m.riegel-immobilien.de>`). Damit versenden
  Kontakt/Termin/Anfrage/Report auf der Live-Seite echte On-Brand-Mails.

## Offen 🔧
- **OnOffice-Test-Lead löschen (Sissy)**: Der Live-Test der Lead-Übergabe hat Adresse
  **83519** („TEST-Fable BITTE-LOESCHEN") im CRM angelegt und den Multiselect-Fix
  (`HerkunftKontakt: webseite_system`) bewiesen. Der API-Nutzer hat bewusst kein
  Löschrecht (Least Privilege) — Sissy löscht den Datensatz bitte manuell in OnOffice.
- **Blitzverkauf einmal im echten Browser testen** (auf Vercel, mit echtem Supabase-Env):
  Kanonen-Gefühl, Trefferzonen-Größe, Musik/SFX-Balance, Mobile-Performance, und jetzt auch
  der komplette Bestenlisten-Flow mit einem echten Account. (Die `game_scores`-Migration
  hat Alex ausgeführt — `/api/game-scores` liefert live `ok:true`.)
- **Bunny/Supabase-Env für das Hero-Bild-Feature**: siehe Update weiter oben — ohne
  `BUNNY_STORAGE_ZONE`/`BUNNY_STORAGE_ACCESS_KEY` in Vercel + die SQL-Migration bleibt der
  Medien-Tab in `/intern` funktionslos (zeigt Fehlermeldung, Startseite bleibt unverändert).
- **Portal-Filter**: `mehrfamilienhaus` ist noch keine wählbare Kategorie im Immobilien-Portal
  (`ObjectCategory`/`CATS` in `mock-estates.ts`/`portal-filter.ts` nicht erweitert — bewusst
  zurückgestellt, siehe Batch-Protokoll).

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

- **Dashboard-Schritte Supabase**: `docs/supabase-schema.sql` ausführen; Auth „Confirm email" + Site-URL
  setzen; für Mails **SMTP = Resend** (siehe `email-templates/README.md`).
- **`RESEND_API_KEY`** in Vercel setzen, damit Kontakt/Termin-Mails rausgehen.
- **Reels**: echte MP4s (Behold.so-Feed oder Export) — Grid ist vorbereitet.
- **OnOffice-Keys** → 108 Objekte importieren (Plan steht).
- **Consent**: Geocoding (Nominatim) ist aktuell funktional-on-use disclosed; bei Bedarf hart gaten.

- **Echte Reel-Videos**: Quelle wählen (Behold.so / Instagram Graph API / MP4-Export) → siehe `instagram-integration.md`. Grid ist vorbereitet.
- **Accounts/Login (Supabase)**: RIEGEL-Org angelegt; nach Aufräumen Project-URL + anon-Key liefern → Login/Registrierung + Favoriten-/Suchauftrag-Sync. Läuft bis dahin über localStorage.
- **GEO-Texte**: KI-Entwürfe mit ca.-Zahlen — fachlich gegenlesen vor großer Bewerbung.
- **Echte Objektdaten**: OnOffice-Token+Secret (serverseitig) → Live-Listings statt Mock.
- **WhatsApp-Nummer + LinkedIn-URL**.
- **Team-Klarnamen + Porträts** (aktuell Platzhalter).

## Sicherheit

- Keine Secrets im Repo (SFTP/Vercel-Token/OnOffice nur außerhalb).
- Fremde Supabase-Projekte (beuwy/dieudonne/Saadi/Gym) werden nicht angefasst.

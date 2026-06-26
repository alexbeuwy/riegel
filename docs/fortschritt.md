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

## Offen / wartet auf Input 🔧

- **Echte Reel-Videos**: Quelle wählen (Behold.so / Instagram Graph API / MP4-Export) → siehe `instagram-integration.md`. Grid ist vorbereitet.
- **Accounts/Login (Supabase)**: RIEGEL-Org angelegt; nach Aufräumen Project-URL + anon-Key liefern → Login/Registrierung + Favoriten-/Suchauftrag-Sync. Läuft bis dahin über localStorage.
- **GEO-Texte**: KI-Entwürfe mit ca.-Zahlen — fachlich gegenlesen vor großer Bewerbung.
- **Echte Objektdaten**: OnOffice-Token+Secret (serverseitig) → Live-Listings statt Mock.
- **WhatsApp-Nummer + LinkedIn-URL**.
- **Team-Klarnamen + Porträts** (aktuell Platzhalter).

## Sicherheit

- Keine Secrets im Repo (SFTP/Vercel-Token/OnOffice nur außerhalb).
- Fremde Supabase-Projekte (beuwy/dieudonne/Saadi/Gym) werden nicht angefasst.

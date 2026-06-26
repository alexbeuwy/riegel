# Instagram-Reels-Einbindung — Lösungen & Empfehlung

> Kontext: Die Reels sollen „super smooth" auf der Seite laufen (Autoplay-Grid),
> damit Interessenten sehen, wie Riegel vermarktet. Direktes Scrapen der
> Instagram-Videos ist **nicht möglich/erlaubt** — daher hier die echten Optionen.

## Warum direktes Scraping nicht geht

- Instagram liefert auf `/p/<id>/` **keine** offenen `og:video`-Tags mehr und
  antwortet Bots häufig mit **HTTP 429 / Login-Wall**.
- Die Video-Dateien liegen auf `*.cdninstagram.com` mit **signierten, ablaufenden
  Tokens** — eine heute gezogene URL ist morgen tot.
- Automatisiertes Scrapen verstößt gegen die **Instagram-AGB** → für eine
  Kundenseite rechtlich/markenseitig keine Option.

## Die realen Lösungen (sortiert nach Empfehlung)

### 1. Offizielle Instagram Graph API  ⭐ robust & kostenlos (Erstanbieter)
- Voraussetzung: IG **Business/Creator-Account** + verknüpfte Facebook-Seite +
  Meta-App (Basic Display API ist abgekündigt → **Instagram Graph API**).
- Endpoint `GET /<ig-user-id>/media` liefert `media_url` (bei Videos die MP4),
  `thumbnail_url`, `permalink`, `caption`. Long-Lived-Token (~60 Tage, erneuerbar).
- Wir holen die Liste **serverseitig** (ISR/Revalidate) und rendern sie **nativ**
  in unserem Grid → volle Kontrolle, on-brand, Autoplay.
- Aufwand: einmalig Meta-App + Token. Danach automatisch aktuell.

### 2. Feed-as-a-Service (z. B. Behold.so)  ⭐ schnellster „smooth + auto-aktuell"
- Behold.so / Curator.io / EmbedSocial verbinden den IG-Account per OAuth und
  stellen einen **JSON-Feed** der letzten Posts bereit (inkl. Medien-URLs).
- Wir fetchen das JSON serverseitig und rendern es in **unserem** Grid (kein
  fremdes iFrame, kein fremdes Styling) → smooth & on-brand.
- Behold hat eine **kostenlose Stufe**. Aufwand: Account anlegen → Feed-ID an mich.

### 3. Manueller MP4-Export  ⭐ sofort, ohne Abhängigkeit, 100 % smooth
- Riegel exportiert die eigenen Reels (Eigentum) als MP4 + ein Poster-JPG.
- Ablegen unter `public/reels/<name>.mp4` und `public/images/reels/<name>.jpg`.
- In `src/components/reels-grid.tsx` beim jeweiligen Eintrag `video: "/reels/<name>.mp4"`
  setzen → das Grid spielt es automatisch ab (nur sichtbare Kacheln, stummgeschaltet,
  geloopt). **Bereits vorbereitet.**

### 4. Offizielles oEmbed / embed.js (Blockquote-iFrame)  — Notlösung
- Rendert den Original-Post als iFrame. **Kein** Autoplay, fremdes Styling,
  Consent-pflichtig (TDDDG/DSGVO, da externer Embed). Nicht „smooth". Nur Fallback.

### ❌ Inoffizielle Scraper / RapidAPI-IG-APIs
- Gegen die AGB, brüchig (brechen bei IG-Änderungen), DSGVO-/Marken-Risiko.
  **Für eine Kundenseite nicht empfohlen.**

## Aktueller Stand im Code

`src/components/reels-grid.tsx` ist ein **Autoplay-in-View-Grid**:
- Mit `video`-Feld → `<video autoPlay(muted) loop playsInline>` via IntersectionObserver
  (nur sichtbare Kacheln spielen → flüssig, akkuschonend).
- Ohne `video` → Poster (echtes Riegel-Bild) + Play-Overlay + Link zum echten Reel.

→ Sobald **Option 1, 2 oder 3** gewählt ist, ist die Einbindung in <1 h erledigt.

## Empfehlung

- **Schnell & dauerhaft aktuell:** Behold.so (Option 2) — Feed-ID schicken, Rest mache ich.
- **Voll Erstanbieter:** Instagram Graph API (Option 1) — wenn ein Business-Account + Meta-App ok ist.
- **Sofort für den Launch:** ein paar MP4s exportieren (Option 3) — läuft ohne jede Abhängigkeit.

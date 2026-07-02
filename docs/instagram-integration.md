# Instagram-Reels-Einbindung — Lösungen & Stand

> Kontext: Die Reels sollen „super smooth" auf der Seite laufen (Autoplay-Grid),
> damit Interessenten sehen, wie Riegel vermarktet. Direktes Scrapen der
> Instagram-Videos ist **nicht möglich/erlaubt** — daher hier die echten Optionen.
>
> **Status: Option 3 (self-hosted MP4s) ist umgesetzt und live** (siehe „Aktueller
> Stand im Code"). Optionen 1/2 bleiben als späterer Ausbau für einen automatisch
> aktuellen Feed.

## Warum direktes Scraping nicht geht

- Instagram liefert auf `/p/<id>/` **keine** offenen `og:video`-Tags mehr und
  antwortet Bots häufig mit **HTTP 429 / Login-Wall**.
- Die Video-Dateien liegen auf `*.cdninstagram.com` mit **signierten, ablaufenden
  Tokens** — eine heute gezogene URL ist morgen tot.
- Automatisiertes Scrapen verstößt gegen die **Instagram-AGB** → für eine
  Kundenseite rechtlich/markenseitig keine Option.

## Die realen Lösungen (sortiert nach Empfehlung)

### 1. Offizielle Instagram Graph API  — späterer Ausbau (robust & kostenlos, Erstanbieter)
- Voraussetzung: IG **Business/Creator-Account** + verknüpfte Facebook-Seite +
  Meta-App (Basic Display API ist abgekündigt → **Instagram Graph API**).
- Endpoint `GET /<ig-user-id>/media` liefert `media_url` (bei Videos die MP4),
  `thumbnail_url`, `permalink`, `caption`. Long-Lived-Token (~60 Tage, erneuerbar).
- Wir holen die Liste **serverseitig** (ISR/Revalidate) und rendern sie **nativ**
  in unserem Grid → volle Kontrolle, on-brand, Autoplay.
- Aufwand: einmalig Meta-App + Token. Danach automatisch aktuell.

### 2. Feed-as-a-Service (z. B. Behold.so)  — späterer Ausbau („smooth + auto-aktuell")
- Behold.so / Curator.io / EmbedSocial verbinden den IG-Account per OAuth und
  stellen einen **JSON-Feed** der letzten Posts bereit (inkl. Medien-URLs).
- Wir fetchen das JSON serverseitig und rendern es in **unserem** Grid (kein
  fremdes iFrame, kein fremdes Styling) → smooth & on-brand.
- Behold hat eine **kostenlose Stufe**. Aufwand: Account anlegen → Feed-ID an mich.

### 3. Manueller MP4-Export  ⭐ **UMGESETZT** — sofort, ohne Abhängigkeit, 100 % smooth
- Riegels eigene Reels (Eigentum) als MP4 exportiert und self-hosted eingebunden
  (aktuell unter `https://riegel.b-cdn.net/`, siehe unten).

### 4. Offizielles oEmbed / embed.js (Blockquote-iFrame)  — Notlösung
- Rendert den Original-Post als iFrame. **Kein** Autoplay, fremdes Styling,
  Consent-pflichtig (TDDDG/DSGVO, da externer Embed). Nicht „smooth". Nur Fallback.

### ❌ Inoffizielle Scraper / RapidAPI-IG-APIs
- Gegen die AGB, brüchig (brechen bei IG-Änderungen), DSGVO-/Marken-Risiko.
  **Für eine Kundenseite nicht empfohlen.**

## Aktueller Stand im Code ✅ (Option 3 umgesetzt)

`src/components/reels-grid.tsx` zeigt **5 echte, selbst gehostete RIEGEL-Reels**
(MP4s auf `https://riegel.b-cdn.net/`: Doppelhaushälfte Schifferstadt, Einfamilienhaus,
Wohnung Bad Dürkheim, Einfamilienhaus mit Carina, Miete Speyer mit Sissy):

- **Autoplay-in-View, stumm**: `<video muted loop playsInline preload="none">` spielt nur,
  wenn die Kachel sichtbar ist (IntersectionObserver, threshold 0.35) — flüssig, akkuschonend.
- **Hover → Ton an**: `onMouseEnter` schaltet genau dieses Video laut, alle anderen stumm;
  `onMouseLeave` → wieder alle stumm.
- **Mute/Unmute-Toggle** unten links pro Kachel (Klick = sichere User-Geste für Ton,
  `aria-pressed`/`aria-label` gesetzt).
- Respektiert `prefers-reduced-motion` (dann kein Autoplay).
- Kein Instagram-Embed, kein externer Feed → kein Consent nötig, keine Abhängigkeit.

## Späterer Ausbau (wenn „automatisch aktuell" gewünscht)

- **Behold.so (Option 2)** — Feed-ID einrichten (Konto-Verbindung durch RIEGEL), Rest <1 h.
- **Instagram Graph API (Option 1)** — wenn Business-Account + Meta-App ok sind.
- Neue Reels heute: MP4 liefern → Upload → Eintrag in `REELS` in `reels-grid.tsx`.

---

## Update — Reels-Lösung (Recherche) & „Kann der Agent sssinstagram bedienen?"

**Kurzantwort:** Für **eigene** RIEGEL-Reels → Original-MP4 selbst hosten (max. Qualität, keine
Abhängigkeit). Für einen **automatisch live gekoppelten** Instagram-Feed → **Behold.so** (ab 10 $/Mon,
reels-only Filter, offizielle Graph-API, Token-Refresh + ToS-Compliance inklusive).

**sssinstagram & ähnliche Downloader:**
- **Technisch** kann ein Agent das bedienen (URL → MP4, kein Login). Ebenso `yt-dlp`/`gallery-dl`.
- **Rechtlich NICHT** für **fremde** Reels: Re-Upload auf eine Firmenseite ist kommerzielle öffentliche
  Wiedergabe ohne Lizenz → Verstoß gegen Instagram-ToS **und** deutsches UrhG (+ GEMA/Musik), Abmahnrisiko.
  Die Tools deklarieren selbst „nur Privatgebrauch". (hiQ v. LinkedIn betrifft nur US-CFAA/Scraping
  öffentlicher Daten, **nicht** Urheberrecht — legitimiert kein Re-Upload.)
- Für **eigene** RIEGEL-Reels (RIEGEL = Rechteinhaber) ist das Ziehen des eigenen MP4 unproblematisch —
  besser aber direkt das Originalvideo aus der Produktion verwenden.

**Optionen im Überblick:** oEmbed/Meta Graph (gratis, aber App Review + Business-Verifizierung nötig) ·
Behold.so (Empfehlung, ab 10 $) · Elfsight (ab 5 $) · EmbedSocial (Reels ab ~29 $) · SnapWidget (ab ~8 $).
Alle Managed-Dienste brauchen einen **menschlichen** OAuth-/App-Setup-Schritt; der Agent kann danach nur
den fertigen Embed-Code integrieren.

**Stand RIEGEL:** ✅ genau so umgesetzt — 5 eigene Reels als MP4 self-hosted (Option 3, s. o.).
Wenn „immer aktuell" gewünscht: Behold.so-Feed-ID einrichten (Konto-Verbindung durch RIEGEL).

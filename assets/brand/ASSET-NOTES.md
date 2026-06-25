# Riegel — Brand & Live-Stack Intel (aus Black-Box-Audit der Live-Seite)

## Font (DAS besondere Schriftbild)
- **Neuzeit Grotesk** via Adobe Fonts / Typekit Kit `atg2aop`
  - Loader: `//use.typekit.com/atg2aop.js`, CSS: `https://use.typekit.net/atg2aop.css`
  - 4 @font-face (vermutl. Regular/Bold + ggf. Light/Medium)
- Lizenz-Implikation: Adobe Fonts darf NICHT selbst gehostet werden (ToS) + ist externer Embed (DSGVO-Consent).
  - Option A: Adobe Fonts beibehalten (Consent nötig).
  - Option B: Neuzeit Grotesk Webfont-Lizenz bei Monotype/MyFonts kaufen -> self-hosted, DSGVO-clean, schneller.
  - Option C: freie self-hostbare Nähe (z.B. Space Grotesk / Archivo / Hanken Grotesk) — Alex will aber Original ("besonders").

## Logo
- Primär: `https://riegel-immobilien.de/wp-content/uploads/2022/02/Riegel_Immobilien_Logo_Zeichenfläche-1-Kopie-56.svg` (+ -61, 2021/12 -62/-63)
- SVG, aber ~850 KB (enthält wohl komplexe Pfade/Embeds) -> für neue Seite re-exportieren/optimieren.
- Lokal gezogen: scratchpad/brand/*.svg

## Weitere Brand-SVGs (auf der Seite, bei Bedarf ziehen)
- Objekttyp-Icons: Haus2, Wohnung, Gewerbe, Grundstueck (+ *-wide) in /uploads/2022/02/
- Trust-Badges: Google-50-lightBG, ImmoScout-43-Sterne, BVFI_Siegel, VP-badge, PP2013-2021, ImmoScout24-Siegel_Experte-digital, Speyer-darkBG
- Deko: Waves-1, Waves-2

## Live-Stack (KORRIGIERT ggü. Briefing)
- WordPress + **Uncode** Theme + **uncode-child** (Child-Theme vorhanden)
- **OnOffice = offizielles Plugin `onoffice-for-wp-websites` v6.9.4** (nutzt **Leaflet** Karten) + custom `onoffice-personalized`
  -> KEIN SmartSite-Redirect wie im Briefing angenommen. Daten kommen schon per OnOffice-Plugin/API.
- Custom-Plugins von beuwy: **`riegel-immo-system`**, **`riegel-marketing-funnel`** (PHP nur serverseitig/2GB; nur public CSS/JS fetchbar)
- **Borlabs Cookie** CMP vorhanden (v2.2.67) -> "kein echtes Opt-in" aus Briefing ist überholt
- **WooCommerce** v10.8.1 installiert
- **Google Site Kit** v1.181.0 (GA/Search Console)
- Hosting: Raidboxes

## Konsequenz für Relaunch
- Portal ist Kundenfokus: Airbnb/Zillow-Style Such-/Filter-Erlebnis (Karte+Liste, Instant-Filter, alles durchsuchbar).
- OnOffice-API-Anbindung ist Pflicht-Kern (read estate + Filter + Bilder + Lead-create).

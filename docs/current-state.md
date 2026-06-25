# Ist-Zustand & Live-Stack-Audit (riegel-immobilien.de)

Black-Box-Audit der **öffentlichen** Live-Seite (HTTPS, nur lesend) — kein Quellzugriff nötig.
Korrigiert mehrere Annahmen aus dem ursprünglichen Briefing.
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) · [onoffice-integration.md](./onoffice-integration.md) · [legal-checklist.md](./legal-checklist.md) · [design-system.md](./design-system.md)

> Hinweis: Die WordPress-Installation ist **technisch irrelevant** für den Relaunch (Pfad B, Neubau) und wird nicht migriert (Dateigröße ~2 GB, nicht gezogen). Dieses Dokument hält den Ist-Zustand nur als Referenz für Inhalte, Branding, Redirects und Cutover fest.

---

## 1. Tatsächlicher Stack (vs. Briefing)

| Briefing-Annahme | Realität (Audit) | Konsequenz |
|---|---|---|
| OnOffice via **SmartSite-Redirect** (Fremddomain) | **Offizielles Plugin `onoffice-for-wp-websites` v6.9.4** (nutzt **Leaflet**-Karten) + custom `onoffice-personalized` | Kein Redirect-Problem im Altbestand; Daten kommen schon per OnOffice. Für Neubau zählt nur die **API**-Strategie. |
| Cookie-Hinweis **ohne echtes Opt-in** | **Borlabs Cookie** CMP v2.2.67 installiert | „Nicht konform" ist überholt. Im Neubau eigene CMP/Consent sicherstellen (s. legal-checklist). |
| (nicht erwähnt) | **Custom-Plugins von beuwy:** `riegel-immo-system`, `riegel-marketing-funnel` | Eigene Logik existiert serverseitig (PHP, nur im 2-GB-Bestand). Für Neubau nicht benötigt, aber Funktions-/Content-Referenz. |
| (nicht erwähnt) | **WooCommerce** v10.8.1, **Google Site Kit** v1.181.0 (GA/Search Console) | WooCommerce-Zweck klären (Funnel?). Site Kit = bestehendes Analytics/GSC — beim Cutover berücksichtigen. |
| Uncode-Theme | Uncode + **`uncode-child`** (Child-Theme) | Bestätigt; Child-Theme-Customizing existiert (irrelevant für Neubau). |
| Hosting | **Raidboxes** (managed WP) | Bietet Staging; für Pfad A relevant gewesen, für Pfad B nur Quelle für Cutover/DNS. |

## 2. Seitenstruktur (Menü der Live-Seite)
Über uns · Immobilienverkauf · Finanzierung · **Immobilienangebote** (= Portal) · Kontakt · Kostenlose Immobilienbewertung (Rechner).
- `/immobilien/` aktuell **passwortgeschützt** (Listing läuft über „Immobilienangebote").
- Bestehender Rechner unter `b10etwg.myraidbox.de/rechner/` (Raidboxes-Boxhost).
- Kontaktformular nur eingeschränkt erreichbar (Verlinkung `/kontakt/`) → Client-Wunsch #6.
- Social: Facebook, Instagram, YouTube vorhanden; **WhatsApp + LinkedIn fehlen** → Client-Wunsch #7.
- Impressum + Datenschutz verlinkt; **kein Widerruf-Link** → Client-Wunsch #9.

## 3. Markenschrift (DAS „Besondere")
- **`Neuzeit Grotesk`** via **Adobe Fonts / Typekit** Kit `atg2aop` (Loader `//use.typekit.com/atg2aop.js`, CSS `https://use.typekit.net/atg2aop.css`), 4 Schnitte.
- **Lizenz-Implikation:** Adobe Fonts darf **nicht** self-gehostet werden (ToS) und ist ein **externer Embed** (DSGVO-Consent).
  - Empfehlung: Neuzeit-Grotesk-**Webfont-Lizenz** (Monotype/MyFonts) kaufen → self-hosted via `next/font/local`, DSGVO-clean, bestes LCP.
  - Bis dahin Dev-Platzhalter (freie geometrische Grotesk), kein Adobe-Embed im Repo. Siehe [design-system.md](./design-system.md) §3.

## 4. Brand-Assets (gesichert / lokalisiert)
- **Logo (SVG):** `…/wp-content/uploads/2022/02/Riegel_Immobilien_Logo_Zeichenfläche-1-Kopie-56.svg` (+ -61; 2021/12 -62/-63). Gezogen nach `assets/brand/` — **~850 KB pro SVG**, für Web re-exportieren/optimieren.
- **Objekttyp-Icons (SVG):** Haus2, Wohnung, Gewerbe, Grundstueck (+ `*-wide`) in `/uploads/2022/02/`.
- **Trust-Badges (SVG):** Google-50, ImmoScout-43-Sterne, BVFI_Siegel, VP-badge, PP2013-2021, ImmoScout24-Siegel_Experte-digital, Speyer-darkBG.
- **Deko:** Waves-1, Waves-2.
- Alle öffentlich per HTTPS abrufbar → beim Scaffolding selektiv nach `public/` übernehmen.

## 5. Asset-Zugang in dieser Umgebung
- **SFTP (sftp.raidboxes.de) nicht erreichbar:** kein SSH-Client installiert + ausgehender Port 22 durch Netzwerk-Policy blockiert (nur HTTPS über Agent-Proxy). → Assets über öffentliche HTTPS-URLs gezogen.
- Falls Assets benötigt werden, die **nicht** öffentlich ausgeliefert werden (z. B. Originaldateien, PSDs), bitte als ZIP-Upload bereitstellen.
- **Sicherheit:** Die übermittelten SFTP-Zugangsdaten werden **nirgends im Repo/Code** abgelegt und nach dem Projekt zu rotieren empfohlen.

## 6. Konsequenzen für den Relaunch
- **Portal (Airbnb/Zillow-Style) = #1-Fokus** → OnOffice-API-Anbindung (read estate + Filter + estatepictures + Lead-create) ist Pflicht-Kern.
- OnOffice-Integrationsspezifikation ([onoffice-integration.md](./onoffice-integration.md)) ist **vor Implementierung zu verifizieren** (Foundation-Lens lieferte Dummy).
- Bestehende GA/GSC-Property (Site Kit) und WP-URLs für **301-Redirects/Cutover** sichern.

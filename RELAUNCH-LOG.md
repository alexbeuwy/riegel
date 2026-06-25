# Riegel Immobilien – Relaunch-Log

Kanonisches Projekt-Changelog für den Greenfield-Relaunch von **riegel-immobilien.de**
(Sylwia „Sissy" Riegel, Immobilienmaklerin, Speyer / Ludwigshafen).

> Dieses Dokument ist das fortlaufende Projekttagebuch. **Neue Einträge oben** unter „Verlauf",
> Entscheidungen unter „Entscheidungen", offene Punkte unter „Nächste Schritte".
> Die Detaildokumente liegen unter [`/docs`](./docs):
> [architecture.md](./docs/architecture.md) ·
> [preisatlas-research.md](./docs/preisatlas-research.md) ·
> [onoffice-integration.md](./docs/onoffice-integration.md) ·
> [legal-checklist.md](./docs/legal-checklist.md) ·
> [design-system.md](./docs/design-system.md) ·
> [build-plan.md](./docs/build-plan.md)

---

## Status (Stand 2026-06-25)

**Phase:** Foundation/Architektur abgeschlossen + Live-Stack-Audit durchgeführt; **Portal (Airbnb/Zillow-Style) = #1-Kundenfokus**; Scaffolding der Next.js-App als nächster Schritt.
**Bestehende Seite:** WordPress (Uncode-Theme) auf Raidboxes – bleibt unverändert live bis zum Cutover, wird **nicht** migriert.
**Ziel-Stack:** Next.js (App Router) + TypeScript auf Vercel, OnOffice CRM als Quelle der Immobiliendaten, Supabase (EU) als Support-Layer.

---

## Entscheidungen

| # | Entscheidung | Begründung |
|---|---|---|
| D1 | **Path B – Full Greenfield Rebuild** als headless Next.js-App auf Vercel | Bestehendes WordPress technisch irrelevant; saubere Basis statt Migration. WP bleibt bis Cutover live. |
| D2 | **Immobiliendaten aus OnOffice JSON-API** (server-seitig), nicht aus WP | OnOffice ist das CRM/Single Source of Truth. HMAC-Secret darf nie an den Client. Siehe [onoffice-integration.md](./docs/onoffice-integration.md). |
| D3 | **Keine SmartSite-Weiterleitung** – User bleiben auf der eigenen Domain | Client-Wunsch #2. Listing + Filter laufen vollständig auf riegel-immobilien.de. |
| D4 | **Chatbot gestrichen** (out of scope) | Entscheidung Entwickler. Falls später reaktiviert: eigene Einwilligung + AVV nötig. |
| D5 | **Eigenes Buchungstool statt Calendly** | Volle Designkontrolle, keine US-Drittanbieter-Übertragung, Daten in EU-Supabase, sauber DSGVO-konform. Siehe [architecture.md](./docs/architecture.md). |
| D6 | **Push-to-Production-Workflow** über Vercel (Git-Deploy) | Standard-Vercel-Flow. Secrets als Encrypted Env Vars (Production/Preview scoped), nie `NEXT_PUBLIC`. |
| D7 | **Preis-Tool: Premium-CALCULATOR zuerst, regionale Karte später (Phased Hybrid)** | Ein echter Homeday-Preisatlas (ML-AVM über ~10 Mio. gescrapte Angebotspreise) ist für eine Einzelmaklerin **weder technisch noch wirtschaftlich noch rechtlich** machbar. Stattdessen: hochwertiger Bewertungsrechner mit Lead-Capture in OnOffice, optional unterlegt durch lizenziertes AVM (PriceHubble/Sprengnetter, beide bereits im OnOffice-Marketplace), plus später eine **regionale Karte aus FREIEN amtlichen BORIS-RLP-Bodenrichtwerten** (dl-de/by-2.0) auf MapLibre. Volle Begründung: [preisatlas-research.md](./docs/preisatlas-research.md). |
| D8 | **Kein Scraping von Portalen** (ImmoScout24/Immowelt etc.) | Verstößt gegen Datenbankherstellerrecht §87a-e UrhG, Portal-AGB/robots.txt und UWG. Nicht verteidigbar für eine Einzelmaklerin. |
| D9 | **WCAG 2.1 AA wird unabhängig vom BFSG-Status gebaut** | Kleinstunternehmer-Ausnahme (§3 Abs.3 BFSG) greift für eine Solo-Maklerin **wahrscheinlich** – muss aber schriftlich bestätigt werden. Barrierefreier Code ist günstige Versicherung + GEO/SEO-Vorteil. Siehe [legal-checklist.md](./docs/legal-checklist.md). |
| D10 | **Echtes Opt-in-Consent-Tool (CMP)** statt einfachem Cookie-Hinweis | DSGVO + §25 TDDDG. Aktueller WP-Hinweis nicht konform. Blockiert alle externen Embeds bis zur Einwilligung. |
| D11 | **Design: dark/edel, token-getrieben, champagner-gold als einziger Akzent** | Client-Wunsch #1. Near-Black-Basis, eine Akzentfarbe, editorial Serif + ruhiger Grotesque, großzügiger Whitespace, professionelle Fotografie. Siehe [design-system.md](./docs/design-system.md). |
| D12 | **Supabase = JA**, aber nur als Support-Layer (Leads, Bookings, Saved Searches, Preisdaten-Cache). Immobiliendaten bleiben kanonisch in OnOffice. | Durable Lead-Capture (kein verlorener Lead bei OnOffice-Ausfall), DSGVO-Kontrolle, EU-Region Frankfurt. |
| D13 | **Markenschrift = Neuzeit Grotesk beibehalten** (Original der Live-Seite) | Alex: „das Besondere" behalten. Self-Host via Webfont-Lizenz (Monotype/MyFonts) empfohlen statt Adobe-Fonts-Embed (DSGVO/CWV). Optionale Display-Serif (Fraunces) für Headlines noch offen. Siehe [design-system.md](./docs/design-system.md) §3. |
| D14 | **Immobilien-Portal = #1-Priorität** (Airbnb/Zillow-Style Suche/Filter) | Expliziter Kundenfokus (Sissy via Alex): Karte+Liste-Split, Instant-Facetten-Filter, „alles durchsuchbar", teilbare/SEO-fähige URL-States. Eigener Portal-UX/Architektur-Deep-Dive als nächste Ultracode-Phase. |

---

## Verlauf

### 2026-06-25 (später) – Live-Stack-Audit + Korrekturen + Portal-Fokus
- Black-Box-Audit der Live-Seite (öffentliche HTTPS-Requests) → mehrere Briefing-Annahmen korrigiert (Details: [current-state.md](./docs/current-state.md)).
  - **OnOffice ist KEIN SmartSite-Redirect**, sondern das offizielle Plugin `onoffice-for-wp-websites` v6.9.4 (nutzt Leaflet) + custom `onoffice-personalized`. Ändert nichts an Pfad B, präzisiert die API-Strategie.
  - **Cookie-Consent existiert bereits** (Borlabs Cookie CMP) — „kein echtes Opt-in" aus dem Briefing ist überholt (Konformität trotzdem im Neubau sicherstellen).
  - Bereits vorhanden: Custom-Plugins `riegel-immo-system` + `riegel-marketing-funnel`, WooCommerce, Google Site Kit, Uncode-**Child**-Theme.
- **Markenschrift identifiziert: Neuzeit Grotesk** (Adobe Fonts/Typekit `atg2aop`) → D13. Logo + Brand-SVGs gesichert (`assets/brand/`).
- **Portal als #1-Kundenfokus bestätigt** (Airbnb/Zillow-Style) → D14.
- SFTP (Raidboxes) in dieser Umgebung nicht erreichbar (Port 22 blockiert) → Brand-Assets über öffentliche HTTPS-URLs gezogen.
- **Caveat:** Im Foundation-Run lieferte die `onoffice`-Research-Lens nur ein Dummy-Ergebnis. [onoffice-integration.md](./docs/onoffice-integration.md) ist daher aus Synthese-Wissen + echten apidoc.onoffice.de-URLs gebaut, aber **vor der Client-Implementierung zu verifizieren** (dedizierte Re-Research läuft). `maptech`-Lens ebenfalls fehlgeschlagen (Phase 4, von Synthese abgedeckt).

### 2026-06-25 – Foundation-Docs erstellt
- Research-Bundle aus 7 Lenses (preisatlas, pricedata, maptech, onoffice, legal, design, nextstack) zu Foundation-Dokumenten synthetisiert.
- Große Architektur-Entscheidung getroffen: **Calculator-first, Karte später** (D7).
- Alle Kern-Docs unter `/docs` angelegt + dieser Log.
- Stack final: Next.js 16 App Router + TS + Tailwind v4 + shadcn/ui + Motion + MapLibre, Vercel + Supabase (EU) + OnOffice + Resend.

---

## Nächste Schritte

### Blockiert – braucht GO / Zugänge von Alex bzw. Sissy
(Reihenfolge = Priorität. Volle Liste mit Effort in [build-plan.md](./docs/build-plan.md).)

1. **OnOffice API-Zugang**: API-User mit Least-Privilege (read `estate` + `estatepictures`, create `address`), `ONOFFICE_TOKEN` + `ONOFFICE_SECRET`, Bestätigung dass Marketplace-Webhooks + Write-Access im Vertrag enthalten sind, Rate-Limits erfragen.
2. **BFSG-Status schriftlich bestätigen**: < 10 Mitarbeiter **UND** ≤ 2 Mio. € Umsatz/Bilanz? (Entscheidet, ob Barrierefreiheitserklärung Pflicht ist.)
3. **AVM-Lizenz klären**: Ist PriceHubble oder Sprengnetter im OnOffice-Plan bereits enthalten, und erlaubt der Tarif **Public-Website/Widget-Nutzung** oder nur In-CRM-Reports? Entscheidet Calculator-Engine Phase 1 vs. 2.
4. **Anwalt beauftragen**: Impressum (§5 DDG mit §34c-GewO-Aufsichtsbehörde + MaBV), Datenschutzerklärung (Art. 13), Widerrufsbelehrung + Muster-Widerrufsformular (Anlage 2 EGBGB, **wortgleich**), §656a-d-Provisionstexte.
5. **OnOffice AVV (Art. 28 DSGVO) unterschreiben** + Sub-Prozessor-/Drittlandliste prüfen (vor erstem Live-Lead).
6. **Domain-/Cutover-Strategie**: Bestehende WP-URLs für 301-Redirects sammeln; DNS-Cutover-Plan.
7. **Foto-Budget** klären (harte Abhängigkeit für „edel"-Wirkung, Client-Wunsch #3). Reichen OnOffice-Bilder in Auflösung/Qualität?
8. **E-Mail-Provider** festlegen (Resend vs. EU-SMTP) – DSGVO-Drittland-Frage.
9. **Map-Tile-Provider**: MapTiler (keyed, free tier) vs. reine OSM-Tiles – für die spätere Karte.
10. **Geografischer Scope** des Preis-Tools: nur Speyer + Ludwigshafen, oder ganze Vorderpfalz/Rhein-Neckar (Achtung: BW-Seite = anderes Bundesland-Portal BORIS-BW)?

### Implementierungs-Reihenfolge (sobald Zugänge da)
- **P1 (Must):** Setup + Design-System-Tokens → Listing-Liste (SSR, URL-Filter) + Detail (ISR) → OnOffice-Proxy → Schema.org/Sitemap → Legal (Consent, Impressum, Datenschutz, Widerruf-Button) → Kontaktformular → OnOffice → WhatsApp/Socials → A11y-Baseline.
- **P2 (Should):** Buchungstool + Saved Searches.
- **P3 (Nice→Should):** Bewertungs-Calculator → Lead in OnOffice.
- **P4 (Nice):** Regionale BORIS-Karte (MapLibre).

Details, Effort-Schätzungen und Mapping auf die Client-Wünsche: [build-plan.md](./docs/build-plan.md).

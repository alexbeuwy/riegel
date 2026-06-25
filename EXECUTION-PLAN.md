# Riegel Relaunch — Ultracode Execution Plan (autonom)

> Arbeitsmodus: **autonom, ohne Rückfragen**. Entscheidungen treffe ich selbst und
> dokumentiere sie hier + in RELAUNCH-LOG.md. Nach jedem Task: `next build` muss grün
> sein → commit → push `main` (Vercel deployt automatisch, Framework=nextjs, SSO aus).
> Live: **riegel.vercel.app**. Daten: Mock + glaubhafte Simulation, OnOffice-Swap später via Adapter.

## Leitplanken (immer einhalten)
- Dark-first, Accent = **RIEGEL-Blau `#015CFF`**, Logo (weiß) im Header. „Waves"-Motiv (Marken-SVGs) als wiederkehrendes Gestaltungselement.
- WCAG 2.1 AA anpeilen: Fokus-Ringe, Kontrast, `prefers-reduced-motion` (Shader/Animationen sauber gegated).
- Secrets nur server-seitig. Externe Embeds (Map-Tiles, Adobe-Fonts, künftige) → Consent-Gate (M8).
- Kleine, einzeln committbare Schritte; `RELAUNCH-LOG.md` fortschreiben.

## Meilensteine

### M1 — Branding-Finish + WOW-Layer  ✅ (in Arbeit)
- [x] Accent → `#015CFF`, Logo (weiß) im Header
- [x] Echte Kontaktdaten (Speyer/Ludwigshafen, info@riegel-immobilien.de)
- [ ] „Waves"-SVGs ziehen + als Section-Divider/Backdrop einsetzen
- [ ] WebGL/Shader-Hero (subtiler animierter dunkler Mesh-Gradient mit Blau-Akzent), reduced-motion → statisch
- [ ] Micro-Transitions aus transitions-dev breiter ausrollen (texts-reveal Hero, number-pop-in, etc.)

### M2 — DER Bewertungsrechner („Hammer")  ★ Headline-Feature
- [ ] Mehrstufiger Wizard: Objektart → Adresse/PLZ → Fläche/Zimmer/Baujahr → Zustand/Ausstattung → Kontakt
- [ ] Dramatische „Analyse"-Sequenz mit Preloadern, die das Ziehen aus VIELEN Quellen simulieren
      (Bodenrichtwerte, Vergleichsobjekte, Marktindex, Lage-Score, Angebots-/Nachfrage, eigene DB …)
      — gestaffelte Status-Logs, Fortschritt, „live"-Datenströme.
- [ ] Bewertungs-Engine (server-seitig, eigene „Datenbank"/Heuristik): plausibler Verkehrswert als RANGE,
      tendenziell **höher** angesetzt (transparenter Aufschlag-Faktor), mit Konfidenz + Vergleichswerten.
- [ ] Ergebnis-Reveal (Count-up, Charts), Lead-Capture → Supabase (`valuations`/`leads`), später OnOffice.
- [ ] Disclaimer (kein Verkehrswertgutachten) + DSGVO.

### M3 — Accounts: Registrierung/Login, Merkliste, Suchaufträge (Supabase)
- [ ] Supabase-Projekt (EU) + Auth (E-Mail/Magic-Link), RLS.
- [ ] Registrierung/Login + „Mein Konto".
- [ ] Favoriten/Merkliste (Herz auf Cards, persistiert; anonym via localStorage → bei Login gemerged).
- [ ] Suchaufträge: Filter speichern + Benachrichtigung-Opt-in (E-Mail-Alerts, Cron-getriggert/simuliert).
- [ ] `saved_searches`, `favorites`, `profiles` Tabellen + RLS-Policies.

### M4 — Portal-Feinschliff (Airbnb/Zillow-Niveau)
- [ ] Marker-Clustering, „Beim Bewegen der Karte suchen" (Radius), „Mehr Filter"-Modal.
- [ ] In-Card-Bildergalerie + Detail-Lightbox, Skeleton-Loading, Sticky-Sync verfeinern.
- [ ] Sortier-/Ergebnis-Animationen (tabs-sliding, number-pop-in, skeleton-reveal).

### M5 — Eigenes Buchungstool (statt Calendly)
- [ ] Verfügbarkeits-Modell + Slot-Anfrage → Supabase + E-Mail (.ics), Bestätigung/Storno.

### M6 — Inhalte, Team, SEO/GEO
- [ ] Echte Inhalte/Bilder von Live-Seite (Team: Sissy/Manfred/Christoph, Leistungen, USPs).
- [ ] Über-uns/Verkaufen/Finanzierung mit echtem Content; FAQ + FAQPage-Schema.
- [ ] `sitemap.ts`, `robots.ts`, RealEstateAgent-Org-JSON-LD, OG-Images, `llms.txt`.

### M7 — OnOffice Live-Anbindung (wenn Keys da)
- [ ] `lib/onoffice/*` (HMAC v2, read estate + estatepictures GET, create address + relation), `Get Field Configuration`.
- [ ] Facade-Swap Mock→Live, `remotePatterns` für Bild-CDN, ISR + Webhook-Revalidate.

### M8 — Recht & Consent
- [ ] Echte Opt-in-CMP (blockt Map-Tiles/Adobe-Fonts/externe Embeds bis Einwilligung).
- [ ] Impressum/Datenschutz/Widerruf finalisieren (Entwurf, Hinweis: anwaltlich prüfen).

### M9 — Qualität
- [ ] A11y-Pass (axe), CWV/Performance (LCP/INP), Lighthouse, Cross-Browser, Fehlerzustände.

## Entscheidungs-Log (autonom getroffen)
- Rechner-Engine: **simuliert/heuristisch** (kein bezahltes AVM nötig); Preis-Range tendenziell höher (Verkaufsargument), klar als Schätzung deklariert.
- Auth/Favoriten/Suchaufträge: **Supabase** (EU), RLS.
- Map: MapLibre (dark). Shader-Hero: leichte eigene WebGL/Canvas-Lösung (keine schwere Lib), reduced-motion-fallback.

## Was „live" vs. „simuliert/mock" ist (Transparenz)
- Objektdaten: Mock (10 Fixtures) bis OnOffice-Keys.
- Rechner: simulierte Datenquellen-Pulls + heuristische Bewertung (nicht echte amtliche Live-Daten).
- Accounts/Favoriten/Suchaufträge/Buchung: **echt** (Supabase).

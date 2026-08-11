# Migration-Orchestrator — beuwy Makler-System in ein leeres Repo klonen & umbranden

> **Zweck:** Alex (beuwy) soll einen neuen OnOffice-Makler mit **einem einzigen Auftrag**
> an einen Fable-5-Orchestrator aufsetzen können: leeres Ziel-Repo + ausgefülltes
> Intake-Formular rein → fertig umgebrandete, baubare, rechtlich saubere Instanz raus.
>
> Dieses Dokument ist der **ausführbare Teil** des Playbooks. Die Wissensbasis (alle
> Touchpoints, Fallen, rote Liste) liegt in `docs/white-label-migration.md` — der
> Orchestrator arbeitet **gegen dieses Playbook**, nicht aus dem Gedächtnis.

---

## 1. Ablauf aus beuwy-Sicht (Alex' Checkliste)

1. **Intake ausfüllen:** `docs/migration-intake.md` kopieren, mit dem Makler durchgehen,
   als `intake.yaml` ablegen (im Ziel-Repo oder als Anhang der Session). Credential-Felder
   (§5 Playbook) kommen **nur vom Makler selbst** — was fehlt, bleibt explizit `TODO`.
2. **Infrastruktur anstoßen (Phase A, Playbook §2):** OnOffice-API-Freischaltung,
   Supabase-Projekt, Resend + DNS, Bunny-Zone, Vercel-Projekt. Der Orchestrator kann
   Supabase (MCP) und Code-Seite übernehmen; Verträge/DNS/Konten sind beuwy-Handarbeit.
3. **Leeres GitHub-Repo anlegen** (z. B. `beuwy/<makler>-immobilien`) und der
   Orchestrator-Session Zugriff auf **beide** Repos geben: Quelle (`alexbeuwy/riegel`,
   privat — ohne Zugriff scheitert Schritt 0 des Prompts) und Ziel.
4. **Mega-Prompt aus §2 unten** in eine frische Fable-5-Session (Claude Code) geben —
   nur zwei Dinge einsetzen: Ziel-Repo und Intake. **Alles andere zieht sich die
   Session selbst über den Quell-Repo-Link** (Code, Doku, Design-System, die
   versionierten Claude-Skills unter `.claude/skills/`). Bei großem Umfang:
   „ultracode" / Workflow-Modus erlauben, damit der Orchestrator Subagenten
   parallel fährt.
5. **Abschlussbericht lesen:** Der Orchestrator liefert am Ende einen Migrationsreport
   mit drei Listen — *erledigt*, *offene Makler-Zulieferungen (credential)*,
   *bewusste Abweichungen*. Erst wenn die Credential-Liste leer ist, ist Go-Live erlaubt.

**Faustregel:** Der Orchestrator darf alles Technische entscheiden. Er darf **niemals**
Inhalte der roten Liste (Playbook §5) erfinden oder von RIEGEL übernehmen — fehlende
Angaben werden sichtbare `TODO`-Platzhalter plus Eintrag im Report, nie „plausible" Werte.

---

## 2. Der Mega-Prompt (Copy-Paste, selbst-bootstrappend)

Den folgenden Block als Erstauftrag in die neue Session geben. **Nur zwei Platzhalter
ersetzen:** `<ZIEL-REPO>` und das Intake. Alles Weitere holt sich die Session selbst
über den Quell-Repo-Link — inkl. der im Repo versionierten Claude-Skills, des
Design-Systems und der kompletten Doku. Der Prompt ist bewusst redundant zum Playbook:
er muss auch funktionieren, wenn die Session mit **null Vorwissen** startet.

```text
Du bist der Migrations-Orchestrator der beuwy agency (Dienstleister für
white-label Immobilienmakler-Websites auf OnOffice-Basis).

AUFTRAG
Kopiere das beuwy Makler-System in das leere Ziel-Repo <ZIEL-REPO> und brande
es vollständig auf den neuen Makler um. Instanz #1 des Systems war RIEGEL
Immobilien (Speyer/Ludwigshafen) — im Ziel darf davon NICHTS
Markenspezifisches, Personenbezogenes oder Regionsgebundenes übrig bleiben.
Ergebnis: baubare, rechtlich saubere, deploybare Instanz + Abschlussreport.

QUELLE (dein einziger Einstiegspunkt — alles andere ziehst du dir selbst)
https://github.com/alexbeuwy/riegel  (privates Repo, Branch main; dein
Session-Zugriff ist eingerichtet — falls nicht: STOPP, beuwy informieren)

SCHRITT 0 — SELBST-BOOTSTRAP (vor jeder inhaltlichen Arbeit)
a) Quell-Repo klonen. Damit hast du automatisch:
   - den kompletten Code (src/, content/, public/, scripts/, supabase/),
   - die gesamte Doku (docs/),
   - die versionierten Claude-Skills (.claude/skills/ + skills-lock.json) —
     16 Design-/UX-/Frontend-Skills (design-taste-frontend,
     make-interfaces-feel-better, transitions-dev, high-end-visual-design,
     redesign-existing-projects, brandkit, animate-text, u. a.). Sie laden
     aus dem Repo-Root; nutze sie bei allen visuellen Arbeiten (Logo-
     Platzhalter, OG-Images, Farbwelt-Umbau, UI-Anpassungen).
b) Selbst-Briefing — diese Dateien in DIESER Reihenfolge lesen, bevor du
   irgendetwas änderst:
   1. CLAUDE.md                          — Arbeitsregeln, beuwy-Brille,
                                           zentrale Orte, Konventionen
   2. docs/white-label-migration.md      — DAS Playbook: Migrations-Typen,
                                           Runbook, alle ~140 Touchpoints (§3),
                                           Env-Fallen (§4), rote Liste (§5),
                                           Security (§6), Region-Abhängig-
                                           keiten (§7). Jeder Paragraph ist
                                           eine Checkliste, die du abarbeitest.
   3. docs/migration-orchestrator.md     — dein Phasenplan 0–9 mit Abnahme-
                                           Kriterien (§3) + Reportformat (§4)
   4. docs/architecture.md               — Stack, Routen, Datenflüsse
   5. docs/design-system.md              — verbindliche UX-/Design-Regeln
   6. docs/onoffice-integration.md       — API-Anbindung, Feld-Mapping
   7. docs/betrieb.md + docs/legal-checklist.md — Betrieb, Recht, BFSG/WCAG
   8. docs/preisatlas-research.md        — Bodenrichtwert-Quellen je Bundesland
c) Stack verifizieren: package.json ist die Wahrheit. Zur Orientierung:
   Next.js 16 (App Router) + React 19 + TypeScript; Tailwind v4 CSS-first
   (@theme in src/app/globals.css, KEIN tailwind.config); KEIN shadcn/ui,
   KEIN Framer Motion (eigene Komponenten + CSS-Transitions mit
   transitions-dev-Tokens); eigenes Inline-SVG-Icon-System; maplibre-gl
   (Karten, consent-gated); pdf-lib + fontkit (Server-PDF-Report, Assets
   Base64); Supabase (EU, RLS an); Resend (Mail); BunnyCDN (Bilder);
   Fonts self-hosted via next/font/local (Inter + AKIRA — Akira-Lizenz je
   Makler klären!). Diese Entscheidungen NICHT umwerfen — du migrierst,
   du re-architektierst nicht.
d) UX-Regeln (aus design-system.md, verbindlich auch nach Umbrand):
   - Dark-first, Near-Black-Basis, EINE Akzentfarbe (kommt aus dem Intake,
     ersetzt RIEGEL-Blau #015CFF überall — zentralisiert, s. Regel 3).
   - Akzent-Text auf Dark braucht die helle Tönung (accent-strong-Muster),
     Voll-Akzent nur als Fläche mit weißem Text; WCAG-Kontraste der
     Token-Tabelle einhalten (BFSG!).
   - Display-Font nur sparsam für Headlines; ruhige Grotesk für Body/UI.
   - Langsame, subtile Scroll-Reveals; prefers-reduced-motion respektieren;
     keine Effekt-Feuerwerke, keine neuen UI-Libraries.
   - Deutschsprachige Code-Kommentare erklären das Warum (Repo-Konvention).
e) Baseline: npm install && npm run build im geklonten Stand — muss grün
   sein, BEVOR du änderst (sonst sind spätere Fehler nicht zuordenbar).

INTAKE (deine EINZIGE Datenquelle für Makler-Angaben; Schema:
docs/migration-intake.md im Quell-Repo)
<INHALT DER AUSGEFÜLLTEN intake.yaml HIER EINFÜGEN — oder Pfad/Anhang>

EISERNE REGELN
1. Rote Liste (Playbook §5): Impressum-/Registerdaten, §34c, Auszeichnungen,
   Kundenstimmen, Team-Personen/Fotos, Plattform-Bewertungen, Secrets — NIE
   erfinden, NIE von RIEGEL übernehmen. Fehlt etwas im Intake: sichtbarer
   TODO-Platzhalter im Code/Text + Eintrag in den Abschlussreport.
2. Kein RIEGEL-Asset shippen: Logos, Fotos (auch Base64 in
   src/lib/report-assets/* und og-assets.ts), Ladenlokal-Bilder, Porträts,
   die Speyer-Landmarke. Ersatz aus dem Intake; sonst neutraler Platzhalter
   + Report-Eintrag.
3. Zentral vor hart (CLAUDE.md): Literale nicht 1:1 durch neue Literale
   ersetzen, sondern die Refactor-Backlog-Tabelle (Playbook §3.1)
   abarbeiten — Werte nach site.ts/Env ziehen. Das Ziel-Repo soll billiger
   zu migrieren sein als das Quell-Repo.
4. Secrets niemals ins Repo — nur Env-Namen dokumentieren (.env.example).
5. Nichts gilt als fertig ohne Nachweis: npm run build grün + Grep-Sweeps
   und Checks aus Phasenplan Phase 8. Jedes Phasenende = ein Commit.
6. Die Doku wandert MIT ins Ziel-Repo und wird dort auf die neue Instanz
   umgestellt: CLAUDE.md, Playbook (erledigte §3.1-Punkte abhaken),
   design-system.md (neue Farb-/Font-Werte), .claude/skills unverändert.
   RIEGEL-Projektjournale (RELAUNCH-LOG.md, EXECUTION-PLAN.md) bleiben
   zurück. Git-Historie der Quelle NICHT übernehmen (frische Historie).

ARBEITSWEISE
Arbeite die Phasen 0–9 aus docs/migration-orchestrator.md §3 der Reihe
nach ab. Parallelisiere innerhalb der Phasen mit Subagenten, wo die
Arbeitspakete unabhängig sind (Assets ∥ Content ∥ Recht), aber halte
Phasen-Reihenfolge und Abnahme-Kriterien strikt ein. Committe auf den
Default-Branch des Ziel-Repos mit klaren deutschen Commit-Messages.
Am Ende: Abschlussreport nach §4 (drei Listen: erledigt / offene
Makler-Zulieferungen / bewusste Abweichungen) als
docs/migrationsreport-<makler>.md — Go-Live erst, wenn Liste 2 leer ist.
```

---

## 3. Phasenplan mit Abnahme-Kriterien (für den Orchestrator)

Jede Phase endet mit einem Commit und den genannten Checks. **Abnahme nicht erfüllt →
Phase nicht verlassen.**

### Phase 0 — Basis kopieren & Baseline

- Quell-Repo klonen, Arbeitsstand von `main` **ohne Git-Historie** ins Ziel-Repo
  übernehmen (frische Historie; erster Commit: „beuwy Makler-System Basis (Quelle:
  riegel@<commit-sha>)"). RIEGELs Historie enthält Marken-/Personendaten und gehört
  nicht zum Produkt.
- Mitkopieren: kompletter Code, `content/`, `docs/` (inkl. Playbook), `supabase/`,
  `scripts/`. `RELAUNCH-LOG.md`/`EXECUTION-PLAN.md` sind RIEGEL-Projektjournale →
  nicht mitnehmen.
- `npm install && npm run build` — **Baseline muss grün sein, bevor irgendetwas
  geändert wird** (sonst sind spätere Fehler nicht zuordenbar).
- Intake validieren: alle Pflichtfelder da? Credential-Lücken als TODO-Liste anlegen.

**Abnahme:** Build grün, Intake-Lückenliste existiert.

### Phase 1 — Zentrale Config

- `src/lib/site.ts` vollständig aus dem Intake befüllen (name, legalName, tagline,
  description, url, regions, nav-Texte, socials, phone, email, whatsapp, locations).
- `.env.example` anlegen: **alle** Variablen aus Playbook §4 mit Kommentar je Falle
  (`EMAIL_FROM`-Stille-Falle, `INTERN_EMAILS`/`FEEDBACK_*`-Pflicht usw.).
- `package.json` name, `README.md`-Kopf, `CLAUDE.md` auf neue Instanz umstellen.

**Abnahme:** Build grün; `site.ts` enthält keinen RIEGEL-Wert mehr.

### Phase 2 — Refactor-Backlog statt Find&Replace (Playbook §3.1)

Die Tabelle §3.1 Zeile für Zeile abarbeiten — **zentralisieren, nicht patchen**:

- `site.brandColor` (Hex + rgb-Triple) einführen; Mail/PDF/OG/Shader/Confetti/Spiel/
  Karten-Pins darauf umstellen. `globals.css --color-accent` aus demselben Wert.
- CDN-Host überall aus `process.env.BUNNY_CDN_HOST` (inkl. `next.config.ts`
  remotePatterns — build-time!).
- Logo-Pfade, Mail-Fußzeile, ICS-Export, Spiel-Canvas, WhatsApp-Text, JSON-LD,
  Rechner-Quellenzeile, interne Domain-Ausnahme → alles auf `site.ts`.
- PDF-Cover (`report-pdf.ts`): Wortmarken-Positionierung **dynamisch** nach
  Namenslänge rechnen (RIEGEL-Layout ist auf 6 Zeichen kalibriert).
- localStorage-/Event-Präfix `riegel:` → neutraler Präfix; **gleichzeitig**
  `datenschutz/page.tsx` anpassen (nennt die Keys wörtlich).
- `INTERN_EMAILS`/`FEEDBACK_*`-Fallbacks: konkrete Personen raus → fail-closed
  (Fehler/Leerlauf statt Sissy/Alex).
- `riegel-stats.ts` → `makler-stats.ts` mit Intake-Kennzahlen (nur belegbare!).
- `llms.txt` defensiv gegen `locations.length === 1`.
- Erledigte Zeilen im mitkopierten Playbook §3.1 als erledigt markieren.

**Abnahme:** Build grün; `grep -rniE "riegel" src/ public/ next.config.ts` liefert
nur noch bewusst dokumentierte Reste (Ziel: 0).

### Phase 3 — Assets

- Logos (`public/logo-*`, `email-logo-*` als PNG, `icon.png`/`apple-icon.png`) aus
  Intake; OG-Logo-Base64 in `og-assets.ts` **neu erzeugen**.
- Bildwelt: `photos.ts`-Keys auf die neue Bunny-Zone; fehlende Motive → neutrale
  Platzhalter + Report. Lokale Bilder (`public/images/team|standorte|news|regio`)
  ersetzen — `speyer-dom.svg` ist eine Orts-Landmarke, für die neue Region neu.
- PDF-Report-Assets (`report-assets/cover|gallery|visuals.ts`): Base64 aus den neuen
  Bildern regenerieren (Node-Einzeiler; Vorgehen als Kommentar in die Datei).
- Font `Akira` (Base64): **Lizenzfrage in den Report** — bis zur Klärung ggf.
  Fallback-Font.
- `ki-bilder.ts` `KI_FRAGMENTE` auf die **neuen Dateinamen** umstellen — sonst fehlen
  AI-Act-Labels lautlos (Playbook §3.3).

**Abnahme:** Build grün; kein `riegel.b-cdn.net`, keine RIEGEL-Base64-Bilder mehr im
Code; KI-Register matcht die neuen Dateinamen (Stichprobe über `istKiBild()`).

### Phase 4 — Region & Marktdaten-Engine

- `geo-taxonomy.ts`: Kernstädte der neuen Region mit **echten Koordinaten** (Intake +
  Recherche) und Nachfragefaktoren.
- `marktdaten.ts` REGION_BASIS **und** `valuation.ts` REGIONS **synchron** neu befüllen
  (zwei Dateien, Playbook-Warnung!). Startwerte aus seriösen Quellen; Kalibrierung auf
  Makler-Abschlüsse via `scripts/preisanalyse-onoffice.mts` als TODO in den Report,
  bis dessen OnOffice-Historie verfügbar ist. `STADT_FAKTOR`/`SPANNE_BELEGT` ohne
  eigene Abschlussdaten: konservative Modellwerte, `n=`-Belege entfernen.
- `kaufseiten.ts`-Slugs für die neuen Orte; `boris.ts`-Abdeckung je Bundesland prüfen
  (Beispiel Darmstadt = Hessen → BORIS-Hessen-WFS ist angebunden; außerhalb RLP/HE →
  Entscheidung „ohne amtlich-Badge" in den Report, Playbook §7).
- Content regenerieren (kein Find&Replace!): `content/geo-articles.json` und
  `content/experten-seiten.json` für die neuen Städte neu generieren
  (`scripts/build-experten-content.mjs` als Muster), die 5 handkuratierten
  Flaggschiff-Seiten in `experten.ts` neu texten, Redaktionsdaten setzen.

**Abnahme:** Build grün; `scripts/valuation-battery.mts` läuft plausibel für die neue
Region; kein „Speyer/Ludwigshafen/Rhein-Neckar" mehr außerhalb historischer Doku.

### Phase 5 — Team & Trust (nur Intake-Daten)

- Team an **allen drei** Stellen synchron: `ueber-uns/page.tsx`, `lib/contacts.ts`,
  `layout.tsx` JSON-LD. Narrativ („Familienbetrieb") nur, wenn es stimmt.
- `trust-data.ts`, `awards-grid`, `award-highlight`, `reach-chart`: **nur** belegte
  eigene Auszeichnungen/Bewertungen/Zahlen des Maklers; Rest der Sektionen entfernen
  oder neutral umbauen — niemals leere Behauptungen.

**Abnahme:** Kein Name/Bild/Award aus der roten Liste im Ziel-Repo (Grep auf
RIEGEL-Personennamen und Badge-Assets).

### Phase 6 — Rechtstexte

- `impressum/datenschutz/widerruf/page.tsx` aus dem Intake-Rechtsblock neu erstellen.
  Widerrufsbelehrung **wortgleich** zum gesetzlichen Muster (Anlage EGBGB), nur
  Inhaber/Adresse einsetzen. Verantwortliche Person ersetzt „Sylwia Riegel" an allen
  ~6 Stellen (impressum, datenschutz, widerruf, contacts, layout-JSON-LD).
- Datenschutz: localStorage-Keys (nach Phase-2-Umbenennung), Verantwortlicher-Block,
  GwG-Abschnitt auf den Makler.

**Abnahme:** Anwalts-/Makler-Review als expliziter TODO im Report (der Orchestrator
liefert den Entwurf, die Freigabe ist menschlich).

### Phase 7 — Integrationen & Datenbank

- Supabase: `docs/supabase-schema.sql` + **alle** `supabase/migrations/*` ins neue
  Projekt einspielen (RLS-Härtung + §312j-Gate sind Pflicht, Playbook §6). Danach
  anon-Key-Test: PII-Reads = 0 Zeilen, anon-Writes = 401.
- OnOffice (`onoffice.ts`): gegen den **neuen** Account verifizieren — `fields:get`
  für die 36 `ESTATE_FIELDS`, `STATUS2_ACTIVE/SKIP`-Statuskeys, `EXPOSE_TEMPLATES`
  (exakte Vorlagen-Titel), `webseite_system`-HerkunftKontakt-Key, `APP_PROMO_KEYWORDS`
  auf die Boilerplate des neuen Maklers.
- Resend: Testversand über den Rechner-Flow; Absender = Makler-Domain.

**Abnahme:** Objektliste zeigt Objekte des neuen Accounts; Test-Report-Mail kommt mit
korrektem PDF/Absender an (oder: als blockierter Punkt im Report, falls Konten fehlen).

### Phase 8 — Verifikation (Playbook §2 Phase F komplett)

- `npm run build` grün.
- Grep-Sweeps, alle müssen leer sein (bzw. jede Ausnahme im Report begründet):
  `grep -rniE "riegel|015cff|b-cdn|speyer|ludwigshafen" src/ public/ content/ next.config.ts`
  plus Sweep auf RIEGEL-Personennamen (Sissy/Sylwia/Manfred Riegel) und
  `riegel-immobilien.de`.
- `scripts/security-check.mts` ausführen; Go-Live-Checkliste Phase F Punkt für Punkt
  abhaken und Ergebnis dokumentieren.
- Visuell: Startseite, Rechner-Flow, ein Geo-Artikel, Impressum im lokalen Run prüfen
  (Screenshots in den Report).

**Abnahme:** Checkliste vollständig, jede offene Zeile hat einen Grund + Besitzer.

### Phase 9 — Abschluss

- Playbook + `CLAUDE.md` im Ziel-Repo final auf die neue Instanz umgestellt
  (erledigte §3.1-Punkte abgehakt, neue Instanz-Besonderheiten ergänzt).
- Abschlussreport (§4) als `docs/migrationsreport-<makler>.md` committen, pushen.

---

## 4. Abschlussreport — Pflichtformat

Drei Listen, nichts weglassen:

1. **Erledigt** — pro Playbook-Paragraph, mit Nachweis (Check/Grep/Screenshot).
2. **Offen: Makler-Zulieferung (credential)** — jede Lücke aus der roten Liste mit
   Fundstelle des TODO-Platzhalters im Code. *Diese Liste muss leer sein, bevor die
   Seite live geht.*
3. **Bewusste Abweichungen** — z. B. „kein amtlicher Bodenrichtwert (Bundesland BW)",
   „Award-Sektion entfernt (keine eigenen Auszeichnungen)", Font-Ersatz.

---

## 5. Bekannte Grenzen der Automatisierung

Ehrlich bleiben — diese Punkte kann der Orchestrator **nicht** allein:

- **Konten/Verträge** (OnOffice-Freischaltung, Resend-DNS, Bunny, Vercel-Domain) —
  beuwy-Handarbeit, Phase A des Playbooks.
- **Rote-Liste-Inhalte** — kommen nur vom Makler (Intake), sonst TODO.
- **Foto-Shooting/Bildwelt** — Platzhalter ja, echte Markenbilder nein.
- **Rechtstext-Freigabe** — Entwurf ja, Verantwortung liegt beim Makler/Anwalt.
- **Marktdaten-Kalibrierung** — erst mit OnOffice-Abschlusshistorie des neuen Maklers
  (`preisanalyse-onoffice.mts`) wirklich belastbar.

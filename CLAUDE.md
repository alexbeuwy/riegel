# CLAUDE.md — Arbeitskontext für dieses Repo

## Was dieses Repo ist

Next.js 15 (App Router) Immobilienmakler-Website. **Erste Live-Instanz** ist RIEGEL
Immobilien (Speyer/Ludwigshafen). Betreiber/Dienstleister ist **beuwy agency**.

**beuwy-Brille — stets mitdenken:** Dieses System ist ein **white-label Produkt**, das an
weitere OnOffice-Makler verkauft und umgebrandet wird. RIEGEL ist Instanz #1, nicht „das
Produkt". Bei jeder Änderung fragen: *Ist das RIEGEL-spezifisch — und wenn ja, steht es an
einer Stelle, die eine spätere Migration/Umbrandung sauber mitnimmt (Config/Env), oder
klebt es hart im Code (Refactor-Schuld)?*

## Stehende Regeln

1. **Doku immer nachziehen.** Wer Branding, zentrale Config, Integrationen (OnOffice/
   Supabase/Resend/Bunny/Vercel), Rechtstexte oder region-/marktspezifische Daten anfasst,
   aktualisiert im selben Zug **`docs/white-label-migration.md`** (das Migrations-Playbook)
   — neuer Touchpoint rein, geänderter Ort korrigieren, behobene Refactor-Schuld abhaken.
2. **Zentral vor hart.** Neue Marken-/Kontaktwerte gehören nach `src/lib/site.ts` bzw. in
   eine Env-Variable — nicht als Literal in Komponenten, Mails, PDF oder OG. Wenn ein Wert
   doch hart muss (Mail/PDF/OG haben keinen CSS-Var-Zugriff), im Playbook §3.1 als
   Refactor-Kandidat vermerken.
3. **Die rote Liste respektieren.** Impressum-Angaben (HRA, §34c, USt-IdNr, verantwortliche
   Person), Auszeichnungen/Siegel (ImmoScout/ImmoAward/BVFI/IDA/Bellevue), echte
   Kundenstimmen, Team-Personen/Porträts und alle Secrets sind **credential** — nie
   erfinden, nie über Makler hinweg kopieren. Details: `white-label-migration.md` §5.

## Zentrale Orte

- **Config/Branding:** `src/lib/site.ts` (Name, Domain, Kontakt, Standorte, Nav, Socials).
- **Farbe:** `src/app/globals.css` `--color-accent` (Web); Mail/PDF/OG duplizieren `#015cff`
  hart (Refactor-Backlog).
- **Bildwelt:** `src/lib/photos.ts` + BunnyCDN; PDF-Bilder als Base64 in
  `src/lib/report-assets/*`.
- **OnOffice:** `src/lib/onoffice.ts` (+ `docs/onoffice-integration.md`).
- **Bewertungs-/Marktengine:** `src/lib/valuation.ts` + `src/lib/marktdaten.ts`
  (⚠️ Region-Basiswerte in **beiden** synchron halten) + `src/lib/geo-taxonomy.ts`;
  Laufzeit-Anker an echten Abschlüssen: `src/lib/verkauft-stats.ts` + `/api/marktstats`.
  Regressionsschutz: `scripts/valuation-battery.mts` nach jeder Engine-Änderung laufen lassen.
- **Recht:** `src/app/{impressum,datenschutz,widerruf}/page.tsx`.
- **DB/Security:** `docs/supabase-schema.sql`, `supabase/migrations/*` (RLS-Härtung + §312j
  Exposé-Gate — bei jedem Klon mit einspielen).

## Doku-Wegweiser

- `docs/white-label-migration.md` — **das Migrations-/Umbrand-Playbook** (Runbook, alle
  Touchpoints, Env-Fallen, rote Liste, Region-Abhängigkeiten, Produktisierungs-Roadmap).
- `docs/migration-orchestrator.md` + `docs/migration-intake.md` — **der ausführbare
  Migrations-Workflow**: Orchestrator-Prompt (leeres Repo → neue Makler-Instanz),
  Phasenplan mit Abnahme-Kriterien, Makler-Datenblatt. Ändert man Touchpoints im
  Playbook, diese beiden mitprüfen.
- `docs/onoffice-integration.md`, `docs/preisatlas-research.md` (Bodenrichtwerte RLP/HE/BW),
  `docs/architecture.md`, `docs/betrieb.md`, `docs/legal-checklist.md`.

## Konventionen

- Deutschsprachige Code-Kommentare erklären das **Warum** (Fallstricke, Vorgaben von
  Alex/Manfred/Sissy), nicht das Offensichtliche — diesem Stil folgen.
- Änderungen bauen (`npm run build`) und, wo sinnvoll, live/visuell verifizieren, bevor
  sie als fertig gelten. Migrations-relevante DB-Schritte liegen als versionierte Dateien
  unter `supabase/migrations/`.

# RIEGEL Relaunch-Pitchdeck

`deck.html` = Quelle des Angebots-Pitchdecks (**18 Slides**, A4-Landscape, dark, AKIRA).
Inhalt: Cover → Vertrauen/Problem → Plattform-Idee → KI/GEO → Web-App statt Baukasten →
Portal → Rechner (60 Sek.) → Funnel → Konto/Stammkunden → Sichtbarkeit (Google + ChatGPT) →
Premium-Auftritt → Fundament → Leistungsumfang → Phasen (2 Wochen bis v1) → Investition → Ausblick → Schluss.

## Neu rendern
1. Live-Screenshots ziehen (lokaler `npm run start` + Playwright, Viewport 1440×900, deviceScaleFactor 2)
   in `shots/` — referenziert werden: `home`, `portal`, `rechner`, `konto`, `detail`, `shader`.
2. `deck.html` referenziert `shots/*.png` relativ + die AKIRA-TTF per file://.
3. PDF: Chromium `page.pdf({ preferCSSPageSize:true, printBackground:true })`.

## Preis (Slide 16, verifiziert gegen `deck.html`)
- Regulärer Projektwert (aufgeschlüsselt): **29.800 € netto**
- Partner-/Referenz-Rabatt: **−16.000 €**
- **Pauschal: 13.800 € zzgl. MwSt.**
- Optional Betrieb & Pflege: **290 €/Monat** (Hosting, Updates, Monitoring, OnOffice-Sync, laufende GEO-Inhalte)
- Referenz: WordPress-Relaunch 2021 lag bei 12.700 € netto; vergleichbare Agentur-Projekte 25.000–35.000 €.

Zahlen ändern → Slide 16 in `deck.html` (Preistabelle + `.totalbox`/`.amt`/`.rabatt`).

# RIEGEL Relaunch-Pitchdeck

`deck.html` = Quelle des Angebots-Pitchdecks (14 Slides, A4-Landscape, dark, AKIRA).

## Neu rendern
1. Live-Screenshots ziehen (lokaler `npm run start` + Playwright, Viewport 1440×900, deviceScaleFactor 2)
   in `shots/` (home, portal, rechner, detail, verkaufen, ueberuns, standort, termin, konto, portal-mobile).
2. `deck.html` referenziert `shots/*.png` relativ + die AKIRA-TTF per file://.
3. PDF: Chromium `page.pdf({ preferCSSPageSize:true, printBackground:true })`.

## Preis (anpassbar)
- Einmalig Komplettpaket: **34.800 € netto** (Slide 13)
- Optional Betrieb/Pflege: **390 €/Monat**
- Referenz: WordPress-Relaunch 2021 lag bei 12.700 € netto.
Zahl ändern → Slide 13 in `deck.html` (`.amt`).

# Icon-Liste für 3-D-Renderings (matte Textur, Softlight-Optik)

Du wolltest die Wahl: Entweder ich statte die Seite mit einem stylischen
Icon-Set aus **oder** ich gebe dir eine Liste zum Selbst-Generieren in
3-D-Render-Optik. **Beides ist erledigt:**

1. Die Seite läuft jetzt durchgängig mit einem eigenen, kohärenten
   **Line-Art-Icon-System** (`src/components/icon.tsx`) — passt perfekt zur
   dunklen, reduzierten Marken-Ästhetik und ist superschnell (kein externes
   Paket, skaliert verlustfrei, nimmt automatisch das RIEGEL-Blau an).
2. Falls du zusätzlich **3-D-Render-Icons** als Hingucker willst (z. B. für
   die Bento-Kacheln auf der Startseite oder die Leistungsseite), findest du
   hier eine fertige Prompt-Liste. Render-Icons liefere ich dann als
   transparente PNGs nach (`public/icons-3d/`), und ich tausche sie pro
   Kachel gegen die Line-Icons aus.

---

## Einheitlicher Basis-Prompt (für jedes Icon vorne anstellen)

> **3D rendered icon, soft matte clay texture, subtle soft studio lighting,
> gentle soft shadows, rounded geometry, single object centered, isolated on
> transparent background, minimal, premium, slight top-light, accent color
> RIEGEL blue (#015CFF) with white/light-grey neutrals, no text, high detail,
> 1:1, product-render look.**

Danach jeweils das konkrete Motiv anhängen (siehe unten). Empfohlene Größe:
**1024×1024 px, transparenter Hintergrund (PNG)**. Bei jedem Icon dieselbe
Kameraperspektive (leicht von oben, ~15°) und denselben Lichtaufbau wählen,
damit das Set konsistent wirkt.

| # | Verwendung | Motiv-Zusatz zum Basis-Prompt |
|---|------------|-------------------------------|
| 1 | Verkauf / Vermarktung | `a minimalist house with a small key floating beside it` |
| 2 | Online-Bewertung (Immorechner) | `a sleek calculator with an upward bar chart, euro symbol glowing softly` |
| 3 | Beratung | `two abstract rounded figures / a friendly handshake, soft and approachable` |
| 4 | Vermietung | `a house with a small contract document and a pen` |
| 5 | Immobilienportal | `a magnifying glass over a stylized map pin, search vibe` |
| 6 | Termin buchen | `a clean calendar with a checkmark and a small clock` |
| 7 | Standort / Mikrolage | `a glossy location map pin on a soft terrain disc` |
| 8 | Wertentwicklung / Markt | `a rising line graph with a small arrow, euro coins stacked` |
| 9 | Energieeffizienz | `an energy-efficiency label badge with a leaf and a lightning bolt` |
| 10 | Sicherheit / Diskretion | `a rounded shield with a subtle checkmark` |
| 11 | Favoriten / Merkliste | `a soft 3D heart, glossy` |
| 12 | Gespeicherte Suche / Benachrichtigung | `a bell with a small magnifying glass` |
| 13 | Finanzierung | `a stack of euro coins with a small house on top` |
| 14 | Notartermin / Abschluss | `a document with an official seal and a fountain pen` |
| 15 | WhatsApp / Direktkontakt | `a rounded chat bubble with a soft phone glyph` |
| 16 | Telefon | `a modern handset / phone receiver, glossy` |
| 17 | E-Mail | `a soft rounded envelope, slightly open` |
| 18 | Schlüsselübergabe | `a hand offering a key, minimal` |
| 19 | Fotografie / Exposé | `a camera lens with a small house reflected` |
| 20 | Region / Pfalz | `a stylized vineyard hill with a sun, soft pastel` |

## Hinweise

- **Konsistenz vor allem:** gleicher Stil, gleiches Licht, gleiche Blaunote.
  Lieber alle 20 in **einem** Tool/Modell-Lauf generieren.
- **Transparenz:** unbedingt transparenter Hintergrund, sonst sieht man auf
  Dark-Mode einen Kasten. Falls dein Tool keine Transparenz kann: rein
  schwarzer Hintergrund (#0b0b0d) als Notlösung — sagt mir Bescheid, dann
  baue ich die Kacheln darauf aus.
- **Lieferung an mich:** PNGs in `public/icons-3d/` mit den Dateinamen
  `01-verkauf.png`, `02-bewertung.png` … (Nummern wie oben). Ich übernehme
  Einbindung, Größen, `next/image`-Optimierung und Alt-Texte.
- Für reine UI-Elemente (Buttons, Listen, Formfelder) bleiben die feinen
  Line-Icons — 3-D-Renderings setze ich **nur als Akzent** in den großen
  Kacheln ein, sonst wird es zu „laut".

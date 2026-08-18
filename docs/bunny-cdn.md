# BunnyCDN — RIEGEL Asset-Hosting

Bilder/Reels für die Website, das Pitchdeck und den Report liegen auf **BunnyCDN**.

## Zugang

| | |
|---|---|
| CDN (öffentliche Lese-URLs) | `https://riegel.b-cdn.net/<datei>` |
| Storage Zone | `riegel-immobilien` |
| Storage-Endpoint | `https://storage.bunnycdn.com/riegel-immobilien/` |
| Region | Frankfurt (DE) |
| Access Key | **nur in `.env.local`** (gitignored) und in den Vercel-Env-Variablen — **nicht im Repo** |

> Der Storage-Access-Key ist ein **Schreib-/Lösch-Schlüssel**. Er steht bewusst nur in
> `.env.local` (per `.gitignore` ausgeschlossen), damit er nicht im öffentlichen Repo landet.
> Für die Website werden ausschließlich die **öffentlichen** `riegel.b-cdn.net`-URLs verwendet
> (kein Key nötig). In `next.config.ts` ist `riegel.b-cdn.net` als `images.remotePatterns` erlaubt.

### Read-only-Key für Agent-Sessions (Freigabe Alex, 18.08.2026)

Damit Claude-Sessions den Storage **listen/lesen** können, ohne jedes Mal nach Zugängen zu
fragen, steht hier bewusst das **Read-only-Passwort** der Storage-Zone (Alex' explizite
Entscheidung — es kann nichts schreiben/löschen, und alle Dateien sind über den Pull-Zone-Host
ohnehin öffentlich abrufbar; nur das Listing ist sonst nicht möglich). Der Schreib-Key bleibt
weiterhin **ausschließlich** in `.env.local`/Vercel.

```
# Nur LESEN/LISTEN (kein Upload/Delete möglich):
curl -H "AccessKey: afe5399e-76e7-4518-bc59d83b6fd7-105a-4df0" \
  "https://storage.bunnycdn.com/riegel-immobilien/<ordner>/"
```

Bei einem White-Label-Klon: eigener Storage + eigene Keys, dieser Abschnitt wird NICHT
mitkopiert (s. `white-label-migration.md` §5 rote Liste).

## Asset hochladen

```bash
node --env-file=.env.local scripts/bunny-upload.mjs ./pfad/zur/datei.webp RIEGEL_Name.webp
# → https://riegel.b-cdn.net/RIEGEL_Name.webp
```

Danach die Datei einfach in `src/lib/photos.ts` referenzieren (oder direkt per URL).

## Aktuelle Assets (Auswahl)

- `PDF Report Visuals/pdf-report-visual-04-clean.webp` — 3D-Seitenfächer des Reports auf
  Markenblau (Alex' Favorit) — eingebaut im Report-CTA (`report-request.tsx`); Varianten
  01 (stapel), 02 (Serif), 03 (clean) + `Marktwertbericht-2026-3x4.webp` liegen daneben.
- `RIEGEL_Rechner-Hero.webp` — Hero /rechner (Makler am Rechner, Wert-Anzeige)
- `RIEGEL_Broschuere_Portrait_01.webp` — Porträt (Verkaufen-Hero)
- `RIEGEL_Home-Analyse-1..3.webp` — Beratung/Bewertung vor Ort
- `Riegel-Wert-Report.webp` (+ `…3.webp` u. a.) — Wert-Report-Stimmungsbilder
- Reels (MP4) liegen zusätzlich auf `riegel.b-cdn.net/`

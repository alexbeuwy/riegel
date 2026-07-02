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

## Asset hochladen

```bash
node --env-file=.env.local scripts/bunny-upload.mjs ./pfad/zur/datei.webp RIEGEL_Name.webp
# → https://riegel.b-cdn.net/RIEGEL_Name.webp
```

Danach die Datei einfach in `src/lib/photos.ts` referenzieren (oder direkt per URL).

## Aktuelle Assets (Auswahl)

- `RIEGEL_Rechner-Hero.webp` — Hero /rechner (Makler am Rechner, Wert-Anzeige)
- `RIEGEL_Broschuere_Portrait_01.webp` — Porträt (Verkaufen-Hero)
- `RIEGEL_Home-Analyse-1..3.webp` — Beratung/Bewertung vor Ort
- `Riegel-Wert-Report.webp` (+ `…3.webp` u. a.) — Wert-Report-Stimmungsbilder
- Reels (MP4) liegen zusätzlich auf `riegel.b-cdn.net/`

#!/usr/bin/env node
/**
 * RIEGEL — Asset-Upload zu BunnyCDN Storage.
 * Zugangsdaten kommen aus der Umgebung (.env.local, NICHT im Repo):
 *   BUNNY_STORAGE_ZONE, BUNNY_STORAGE_HOST, BUNNY_STORAGE_ACCESS_KEY, BUNNY_CDN_HOST
 *
 * Nutzung:
 *   node --env-file=.env.local scripts/bunny-upload.mjs <lokale-datei> [zielname]
 * Beispiel:
 *   node --env-file=.env.local scripts/bunny-upload.mjs ./hero.webp RIEGEL_Neu-Hero.webp
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const [, , localPath, targetName] = process.argv;
const zone = process.env.BUNNY_STORAGE_ZONE;
const host = process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
const key = process.env.BUNNY_STORAGE_ACCESS_KEY;
const cdn = process.env.BUNNY_CDN_HOST || "riegel.b-cdn.net";

if (!localPath) {
  console.error("Usage: node --env-file=.env.local scripts/bunny-upload.mjs <file> [targetName]");
  process.exit(1);
}
if (!zone || !key) {
  console.error("Fehlende Env: BUNNY_STORAGE_ZONE / BUNNY_STORAGE_ACCESS_KEY (siehe .env.local).");
  process.exit(1);
}

const name = targetName || basename(localPath);
const body = await readFile(localPath);
const url = `https://${host}/${zone}/${name}`;
const res = await fetch(url, {
  method: "PUT",
  headers: { AccessKey: key, "Content-Type": "application/octet-stream" },
  body,
});
if (res.ok) {
  console.log(`✓ hochgeladen → https://${cdn}/${name}`);
} else {
  console.error(`✗ Fehler ${res.status}: ${await res.text()}`);
  process.exit(1);
}

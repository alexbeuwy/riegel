/**
 * Serverseitige BunnyCDN-Storage-Helfer für /api/intern/hero-image (Listen +
 * Hochladen vorhandener/neuer Foto-Assets). Env (secret, server-only):
 * BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, optional BUNNY_STORAGE_HOST,
 * BUNNY_CDN_HOST (siehe scripts/bunny-upload.mjs — dieselben Namen).
 */
const IMAGE_EXT = /\.(webp|jpe?g|png|avif)$/i;

function bunnyEnv() {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const host = process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
  const cdn = process.env.BUNNY_CDN_HOST || "riegel.b-cdn.net";
  if (!zone || !key) return null;
  return { zone, key, host, cdn };
}

export interface BunnyImage {
  name: string;
  url: string;
  lastChanged?: string;
}

/** Listet vorhandene Bild-Dateien im Storage-Root, neueste zuerst. */
export async function listBunnyImages(): Promise<BunnyImage[]> {
  const env = bunnyEnv();
  if (!env) throw new Error("BunnyCDN nicht konfiguriert (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY fehlen).");
  const res = await fetch(`https://${env.host}/${env.zone}/`, {
    headers: { AccessKey: env.key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Bunny-Listing fehlgeschlagen (${res.status}).`);
  const entries = (await res.json()) as { ObjectName: string; IsDirectory: boolean; LastChanged?: string }[];
  return entries
    .filter((e) => !e.IsDirectory && IMAGE_EXT.test(e.ObjectName))
    .map((e) => ({ name: e.ObjectName, url: `https://${env.cdn}/${e.ObjectName}`, lastChanged: e.LastChanged }))
    .sort((a, b) => (b.lastChanged ?? "").localeCompare(a.lastChanged ?? ""));
}

/** Sicherer Zieldateiname: keine Pfade/Sonderzeichen, Zeitstempel-Präfix gegen Kollisionen. */
function safeFileName(original: string): string {
  const base = original.split(/[/\\]/).pop() || "upload";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  return `hero-${Date.now()}-${cleaned || "upload"}`;
}

/** Lädt eine Datei hoch und gibt den neuen CDN-Namen + die öffentliche URL zurück. */
export async function uploadBunnyImage(file: File): Promise<BunnyImage> {
  const env = bunnyEnv();
  if (!env) throw new Error("BunnyCDN nicht konfiguriert (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_ACCESS_KEY fehlen).");
  const name = safeFileName(file.name);
  const body = await file.arrayBuffer();
  const res = await fetch(`https://${env.host}/${env.zone}/${name}`, {
    method: "PUT",
    headers: { AccessKey: env.key, "Content-Type": "application/octet-stream" },
    body,
  });
  if (!res.ok) throw new Error(`Bunny-Upload fehlgeschlagen (${res.status}).`);
  return { name, url: `https://${env.cdn}/${name}` };
}

/** Prüft, ob eine URL auf unsere eigene Bunny-CDN-Domain zeigt (gegen beliebige Fremd-URLs als „Hero-Bild"). */
export function isOwnCdnUrl(url: string): boolean {
  const cdn = process.env.BUNNY_CDN_HOST || "riegel.b-cdn.net";
  try {
    return new URL(url).hostname === cdn;
  } catch {
    return false;
  }
}

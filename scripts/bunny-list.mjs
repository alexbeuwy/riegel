// Listet alle Dateien im BunnyCDN-Storage (zum Auffinden von Logos/Assets).
// Nutzung: node --env-file=.env.local scripts/bunny-list.mjs [unterordner]
// Erwartet: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY (Storage-Zone-Passwort),
//           optional BUNNY_STORAGE_HOST (Region-Hostname), BUNNY_CDN_HOST.
const zone = process.env.BUNNY_STORAGE_ZONE;
const key = process.env.BUNNY_STORAGE_ACCESS_KEY;
const host = process.env.BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
const cdn = process.env.BUNNY_CDN_HOST || "riegel.b-cdn.net";
if (!zone || !key) {
  console.error("Fehlt: BUNNY_STORAGE_ZONE / BUNNY_STORAGE_ACCESS_KEY.");
  process.exit(2);
}

const sub = process.argv[2] ? `${process.argv[2].replace(/^\/+|\/+$/g, "")}/` : "";
const res = await fetch(`https://${host}/${zone}/${sub}`, {
  headers: { AccessKey: key, Accept: "application/json" },
});
if (!res.ok) {
  console.error(
    `Listing fehlgeschlagen (${res.status}). Häufigste Ursachen: falscher Key-Typ ` +
      `(Storage-Zone-Passwort statt Account-API-Key nötig) oder falsche Region ` +
      `(BUNNY_STORAGE_HOST an die Zone anpassen, z. B. ny./la./uk./se.storage.bunnycdn.com).`,
  );
  process.exit(1);
}
const entries = await res.json();
for (const e of entries) {
  if (e.IsDirectory) console.log(`[DIR]  ${sub}${e.ObjectName}/`);
  else
    console.log(
      `${sub}${e.ObjectName}\n       https://${cdn}/${sub}${encodeURIComponent(e.ObjectName)}  (${e.LastChanged || ""})`,
    );
}
console.error(`\n${entries.length} Einträge in /${sub || ""}.`);

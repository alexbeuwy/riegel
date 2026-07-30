/**
 * Wie weit reicht der Verkauft-Pool über die OnOffice-API zurück?
 *
 * Hintergrund: fetchVerkaufteReferenzen holte lange nur eine Listenseite (200
 * Records) und reichte damit nur bis 06/2025 zurück. Manfred hat gemeldet, dass
 * ältere Abschlüsse in Edigheim nicht als Report-Referenz auftauchen. Dieses
 * Skript belegt den Unterschied zwischen einer Seite und dem paginierten Pull:
 * Anzahl, Reichweite, Jahresverteilung, Ortsverteilung, Laufzeit.
 *
 * Wichtig zur Deutung: `updatedAt` ist geaendert_am, also die letzte
 * CRM-Änderung — NICHT das Verkaufsdatum. Über 400 Datensätze tragen den
 * 30./31.01.2025 aus einer Sammeländerung. Die Jahresverteilung zeigt deshalb
 * Pflegestände, keine Abschlussjahre.
 *
 * Rein lesend, gibt bewusst keine Objekttitel oder Adressen aus.
 *
 * Aufruf:
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/verkauft-tiefe.mts
 */
import { fetchVerkaufteReferenzen } from "@/lib/onoffice";

for (const limit of [200, 1000]) {
  const t0 = Date.now();
  const objekte = (await fetchVerkaufteReferenzen(limit)) ?? [];
  const ms = Date.now() - t0;
  console.log(`\n=== limit ${limit}: ${objekte.length} Objekte in ${ms}ms ===`);

  const daten = objekte
    .filter((e) => e.updatedAt)
    .map((e) => new Date(e.updatedAt))
    .sort((a, b) => +a - +b);
  if (daten.length) {
    console.log(
      `  geaendert_am von ${daten[0].toISOString().slice(0, 10)} bis ` +
        `${daten[daten.length - 1].toISOString().slice(0, 10)}`,
    );
    const jahre = new Map<string, number>();
    for (const d of daten) {
      const j = String(d.getUTCFullYear());
      jahre.set(j, (jahre.get(j) ?? 0) + 1);
    }
    console.log(
      "  Jahre: " +
        [...jahre.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([j, n]) => `${j}: ${n}`)
          .join(", "),
    );
  }

  const orte = new Map<string, number>();
  for (const e of objekte) {
    const o = (e.city || "?").trim();
    orte.set(o, (orte.get(o) ?? 0) + 1);
  }
  console.log(
    "  Top-Orte: " +
      [...orte.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([o, n]) => `${o} ${n}`)
        .join(", "),
  );

  // Stadtteile im Raum Ludwigshafen: der konkrete Anlass (Edigheim) muss im
  // tieferen Pool auftauchen, im flachen fehlte er.
  const stadtteile = new Map<string, number>();
  for (const e of objekte) {
    if (!/ludwigshafen/i.test(e.city)) continue;
    stadtteile.set(e.district || "(ohne Stadtteil)", (stadtteile.get(e.district || "(ohne Stadtteil)") ?? 0) + 1);
  }
  console.log(
    "  Ludwigshafener Stadtteile: " +
      [...stadtteile.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `${s} ${n}`)
        .join(", "),
  );
}

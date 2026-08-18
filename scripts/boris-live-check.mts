/**
 * Live-Check der amtlichen Bodenrichtwert-Provider (src/lib/boris.ts).
 *
 * WOZU: boris.ts hängt an elf fremden Landesdiensten. Deren Endpunkte,
 * Jahrgangs-Pfade, Layer-Namen und Antwortformate ändern sich ohne
 * Vorwarnung — ein Bruch fällt im Rechner NICHT auf, weil alle Provider
 * fail-soft `null` liefern und die Bewertung still auf den Modellwert
 * zurückfällt. Dieses Skript ist deshalb der einzige Ort, an dem ein
 * kaputter Landesdienst laut wird: es fragt je aktivem Land die in der
 * Recherche-Spec verifizierte Testkoordinate LIVE ab und prüft, ob
 * überhaupt ein plausibler BAULAND-Bodenrichtwert zurückkommt.
 *
 * Es ist bewusst KEIN Genauigkeitstest: die Bänder sind grob (Faktor 3 um
 * den Spec-Wert), weil die Gutachterausschüsse ihre Werte jährlich
 * fortschreiben. Geprüft wird „Dienst antwortet und liefert einen
 * Bauland-BRW in der richtigen Größenordnung", nicht „exakt 750 €/m²".
 *
 * WANN LAUFEN LASSEN:
 *   - nach JEDER Änderung an src/lib/boris.ts (Provider, Dispatcher, Parser)
 *   - vor jedem Release/Deploy
 *   - bei der Migration auf eine neue Makler-Instanz (die Dienste sind
 *     mandantenunabhängig, aber der Check beweist, dass die neue Umgebung
 *     sie auch erreicht)
 *
 *   node node_modules/.bin/tsx scripts/boris-live-check.mts
 *     → Exit 0 = alle aktiven Länder liefern; Exit 1 = mindestens einer nicht
 *
 * Berlin läuft als PENDING-Zeile mit (Provider implementiert, aber
 * deaktiviert — Begründung und Freischalt-Schritte in boris.ts bei
 * fetchBerlin) und kann den Exit-Code NICHT beeinflussen.
 */
import {
  BORIS_QUELLEN,
  fetchBodenrichtwert,
  fetchBerlin,
  isImBorisGebiet,
  type BorisNutzungsHint,
  type BorisQuelle,
} from "../src/lib/boris";

interface Fall {
  quelle: BorisQuelle;
  ort: string;
  lat: number;
  lng: number;
  hint: BorisNutzungsHint;
  /** BRW aus der Recherche-Spec bzw. aus dem Live-Beweis am selben Punkt. */
  specBrw: number;
  /** Was die Spec an dieser Koordinate belegt hat (fürs Protokoll). */
  specNotiz: string;
}

/** Toleranz: Faktor 3 nach oben wie nach unten (s. Kopfkommentar). */
const FAKTOR = 3;

const FAELLE: Fall[] = [
  {
    quelle: "NI",
    ort: "Hannover, Südstadt-Ost",
    lat: 52.365,
    lng: 9.753,
    hint: "wohnen",
    specBrw: 750,
    specNotiz: "Spec: 750 €/m², W/MFH, Zone Suedstadt-Nord, Stichtag 2026-01-01",
  },
  {
    quelle: "HB",
    ort: "Bremen, nördliche Innenstadt",
    lat: 53.082,
    lng: 8.8,
    hint: "wohnen",
    specBrw: 1050,
    specNotiz: "Spec: 1.050 €/m², W/MFH, Zone 10001011, Stichtag 2026-01-01",
  },
  {
    quelle: "NW",
    ort: "Köln, Altstadt/Nord",
    lat: 50.9375,
    lng: 6.9603,
    hint: "mfh",
    specBrw: 3550,
    specNotiz: "Spec: 3.550 €/m², NUTA MK, Zone 103015, Stichtag 2026-01-01",
  },
  {
    quelle: "BB",
    ort: "Potsdam, Brandenburger Straße",
    lat: 52.4,
    lng: 13.052,
    hint: "wohnen",
    specBrw: 1800,
    specNotiz: "Spec: 1.800 €/m², Art-Code 1140 (Wohnbaufläche), Stichtag 2026-01-01",
  },
  {
    quelle: "HH",
    ort: "Hamburg, Mönckebergstraße",
    lat: 53.551,
    lng: 9.997,
    hint: "wohnen",
    specBrw: 1592,
    specNotiz: "Spec: 1.592,83 €/m² (EFH) in Hamburg-Altstadt, Jahrgang 2026",
  },
  {
    quelle: "SN",
    ort: "Dresden, südlich der Altstadt",
    lat: 51.0421,
    lng: 13.7365,
    hint: "mfh",
    specBrw: 630,
    specNotiz: "Spec: 630 €/m², Wohnbaufläche/Mehrfamilienhäuser, Zone 61243420, Stichtag 01.01.2026",
  },
  {
    quelle: "TH",
    ort: "Erfurt, Fischmarkt",
    lat: 50.978,
    lng: 11.029,
    hint: "wohnen",
    specBrw: 2700,
    specNotiz: "Spec: 2.700 €/m², WB, Zone 182278 Fischmarkt, Stichtag 2026-01-01",
  },
  {
    quelle: "ST",
    ort: "Magdeburg, Breiter Weg",
    lat: 52.131,
    lng: 11.639,
    hint: "wohnen",
    specBrw: 1100,
    specNotiz: "Spec: 1.100 €/m², NUTA MK, Zone 03200104, Stichtag 01.01.2026",
  },
  {
    quelle: "MV",
    ort: "Rostock, Hansaviertel",
    lat: 54.092,
    lng: 12.099,
    hint: "wohnen",
    specBrw: 500,
    specNotiz: "Spec: 500 €/m², WA, Ortsteil Hansaviertel, Stichtag 01.01.2024",
  },
];

/** Berlin: implementiert, aber deaktiviert — nur informativ (kein Exit-Code). */
const BERLIN_FALL = {
  ort: "Berlin, Mitte",
  lat: 52.52,
  lng: 13.405,
  hint: "wohnen" as BorisNutzungsHint,
};

const nf = new Intl.NumberFormat("de-DE");

async function main(): Promise<void> {
  console.log("BORIS Live-Check — amtliche Bodenrichtwerte je Landesdienst\n");
  let ok = 0;
  const fehler: string[] = [];

  for (const f of FAELLE) {
    const lo = Math.round(f.specBrw / FAKTOR);
    const hi = Math.round(f.specBrw * FAKTOR);
    const kopf = `${f.quelle} · ${BORIS_QUELLEN[f.quelle].name} — ${f.ort} (${f.lat}, ${f.lng}, Hint „${f.hint}")`;

    if (!isImBorisGebiet(f.lat, f.lng)) {
      fehler.push(`${f.quelle}: Testkoordinate liegt in KEINER aktiven Länder-BBox — Dispatcher prüfen`);
      console.log(`❌ ${kopf}\n   Koordinate außerhalb aller aktiven BBoxen (Dispatcher-Fehler)\n`);
      continue;
    }

    // Zwei stille Wiederholungen mit Abstand: die Landesdienste haben
    // gelegentlich Aussetzer; erst der dritte Fehlschlag ist ein Befund.
    let wert = await fetchBodenrichtwert(f.lat, f.lng, f.hint);
    for (let versuch = 0; !wert && versuch < 2; versuch++) {
      await new Promise((r) => setTimeout(r, 3000));
      wert = await fetchBodenrichtwert(f.lat, f.lng, f.hint);
    }

    if (!wert) {
      fehler.push(`${f.quelle}: kein Wert (3 Versuche) — Endpoint/Format des Landesdiensts prüfen`);
      console.log(`❌ ${kopf}\n   kein Bodenrichtwert nach 3 Versuchen\n   ${f.specNotiz}\n`);
      continue;
    }

    const imBand = wert.brw >= lo && wert.brw <= hi;
    const richtigeQuelle = wert.quelle === f.quelle;
    if (imBand && richtigeQuelle) ok++;
    if (!richtigeQuelle) fehler.push(`${f.quelle}: antwortete Provider ${wert.quelle} — Dispatch-Reihenfolge prüfen`);
    if (!imBand) fehler.push(`${f.quelle}: ${nf.format(wert.brw)} €/m² außerhalb ${nf.format(lo)}–${nf.format(hi)}`);

    console.log(
      `${imBand && richtigeQuelle ? "✅" : "❌"} ${kopf}\n` +
        `   ${nf.format(wert.brw)} €/m² · Zone ${wert.zone || "–"} · Nutzung ${wert.nutzung || "–"} · ` +
        `Stichtag ${wert.stichtag || "–"} · ${wert.gemeinde || "–"}\n` +
        `   Band ${nf.format(lo)}–${nf.format(hi)} €/m² (Spec ${nf.format(f.specBrw)}), geliefert von ${wert.quelle}\n` +
        `   ${f.specNotiz}\n`,
    );
  }

  // Berlin: nur Statusmeldung, nie Exit-relevant.
  const be = await fetchBerlin(BERLIN_FALL.lat, BERLIN_FALL.lng, BERLIN_FALL.hint);
  const beStatus = be.value
    ? `Dienst antwortet inzwischen mit ${nf.format(be.value.brw)} €/m² — Re-Verifikation lohnt sich!`
    : be.responded
      ? "Dienst antwortet, aber ohne Zone am Testpunkt — Attribut-/FeatureType-Namen re-verifizieren"
      : "Dienst weiterhin nicht erreichbar (Wartungsseite/Netzwerk)";
  console.log(
    `⏸️  BE · ${BORIS_QUELLEN.BE.name} — ${BERLIN_FALL.ort} (${BERLIN_FALL.lat}, ${BERLIN_FALL.lng}): PENDING\n` +
      `   Provider implementiert, aber DEAKTIVIERT (nicht im Dispatcher, nicht in isImBorisGebiet).\n` +
      `   ${beStatus}\n` +
      `   Freischalt-Schritte: s. Kommentar bei fetchBerlin() in src/lib/boris.ts\n`,
  );

  console.log(`Summary: ${ok}/${FAELLE.length} aktive Länder OK (Berlin: PENDING, nicht gewertet)`);
  if (fehler.length > 0) {
    console.log("\nBefunde:");
    for (const z of fehler) console.log(`  - ${z}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Live-Check abgebrochen:", err);
  process.exit(1);
});

/**
 * Wirkt sich der HAUSTYP (Einfamilienhaus, Doppelhaushälfte, Reihenhaus, ...)
 * auf den Quadratmeterpreis aus — und wenn ja, wie stark?
 *
 * Nutzt exakt den bestehenden Weg (wie preisanalyse-onoffice.mts):
 * fetchOnOfficeEstates() für die aktiven Objekte, fetchVerkaufteReferenzen()
 * für die echten Abschlüsse. Beides bereits über src/lib/onoffice.ts auf das
 * Estate-Modell gemappt — KEINE eigenen Rohfeld-Calls, keine Änderung an der
 * Anwendung.
 *
 * Haustyp-Feld: OnOffice trennt objektart (grobe Kategorie: haus / wohnung /
 * grundstueck / gewerbe — s. mapCategory in onoffice.ts) vom feineren
 * objekttyp (Einfamilienhaus, Doppelhaushälfte, Reihenmittelhaus, Bungalow, ...).
 * Genau objekttyp wird bereits als `objectType` gemappt (prettifyKey) —
 * das ist der Haustyp-Kandidat, den dieses Skript auswertet. Zur Kontrolle
 * wird zusätzlich die Verteilung von `category` (objektart) ausgegeben, um
 * zu zeigen, dass DAS die grobe Kategorie ist, nicht der Haustyp.
 *
 * Nur Lesezugriff, schreibt nichts, keine Adressen/Objektdetails im Log.
 *
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/haustyp-preisanalyse-onoffice.mts
 */
import { fetchOnOfficeEstates, fetchVerkaufteReferenzen } from "../src/lib/onoffice";
import type { Estate } from "../src/lib/mock-estates";

const nf = new Intl.NumberFormat("de-DE");
const eur = (n: number) => `${nf.format(Math.round(n))} €`;
const qm2 = (n: number) => `${nf.format(Math.round(n))} m²`;

interface Zeile {
  id: string;
  ort: string;
  haustyp: string;
  preis: number;
  wohnflaeche: number;
  grundstuecksflaeche: number | null;
  qm: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function toZeilen(estates: Estate[]): { zeilen: Zeile[]; gesamtHaus: number; ohneHaustyp: number; kategorien: Map<string, number> } {
  const kategorien = new Map<string, number>();
  let gesamtHaus = 0;
  let ohneHaustyp = 0;
  const zeilen: Zeile[] = [];

  for (const e of estates) {
    kategorien.set(e.category, (kategorien.get(e.category) ?? 0) + 1);
    if (e.category !== "haus") continue;
    if (e.marketingType !== "kauf") continue; // Miete hat andere €/m²-Logik, gehört nicht in diesen Vergleich
    gesamtHaus++;

    const haustyp = (e.objectType || "").trim();
    if (!haustyp) {
      ohneHaustyp++;
      continue;
    }

    const preis = typeof e.price === "number" ? e.price : null;
    const flaeche = typeof e.livingArea === "number" ? e.livingArea : null;
    if (!preis || !flaeche || flaeche < 20 || preis < 20_000) continue;
    const qm = preis / flaeche;
    // Gleicher Ausreißer-Schutz wie preisanalyse-onoffice.mts: unter 500 / über
    // 15.000 €/m² sind so gut wie immer Datenfehler, keine echten Marktpreise.
    if (qm < 500 || qm > 15_000) continue;

    zeilen.push({
      id: e.id,
      ort: (e.city || "?").trim().replace(/^\d{5}\s*/, ""),
      haustyp,
      preis,
      wohnflaeche: flaeche,
      grundstuecksflaeche: typeof e.plotArea === "number" && e.plotArea > 0 ? e.plotArea : null,
      qm,
    });
  }

  return { zeilen, gesamtHaus, ohneHaustyp, kategorien };
}

function printFrequenz(title: string, m: Map<string, number>) {
  console.log(`\n${title}`);
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(28)} ${String(v).padStart(3)}  (${((v / total) * 100).toFixed(0)}%)`);
  }
  console.log(`  ${"GESAMT".padEnd(28)} ${String(total).padStart(3)}`);
}

function haustypStats(zeilen: Zeile[]) {
  const perTyp = new Map<string, Zeile[]>();
  for (const z of zeilen) {
    if (!perTyp.has(z.haustyp)) perTyp.set(z.haustyp, []);
    perTyp.get(z.haustyp)!.push(z);
  }

  console.log(
    "\nHaustyp                        n   Median €/m²   Spanne €/m² (min–max)      Median Wfl.   Median Grdst.   Median Grdst./Wfl.-Verhältnis",
  );
  for (const [typ, rows] of [...perTyp.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const qms = rows.map((r) => r.qm);
    const med = median(qms)!;
    const min = Math.min(...qms);
    const max = Math.max(...qms);
    const medWfl = median(rows.map((r) => r.wohnflaeche))!;
    const mitGrdst = rows.filter((r) => r.grundstuecksflaeche !== null);
    const medGrdst = mitGrdst.length ? median(mitGrdst.map((r) => r.grundstuecksflaeche!)) : null;
    const ratios = mitGrdst.map((r) => r.grundstuecksflaeche! / r.wohnflaeche);
    const medRatio = ratios.length ? median(ratios) : null;

    const warn = rows.length < 10 ? "  <- Fallzahl zu klein für belastbaren Median" : "";
    console.log(
      `${typ.padEnd(30)} ${String(rows.length).padStart(2)}  ${eur(med).padStart(11)}   ${eur(min).padStart(9)} – ${eur(max).padStart(9)}   ${qm2(medWfl).padStart(9)}   ${
        medGrdst !== null ? qm2(medGrdst).padStart(11) : "n=0".padStart(11)
      }   ${medRatio !== null ? `${medRatio.toFixed(2)} (n=${mitGrdst.length})` : "n=0"}${warn}`,
    );
  }
  return perTyp;
}

function ortVerteilung(perTyp: Map<string, Zeile[]>) {
  console.log("\nVerteilung je Haustyp über Orte (nur Orte mit >= 2 Objekten je Haustyp gezeigt):");
  for (const [typ, rows] of [...perTyp.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const perOrt = new Map<string, number>();
    for (const r of rows) perOrt.set(r.ort, (perOrt.get(r.ort) ?? 0) + 1);
    const relevante = [...perOrt.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
    const rest = [...perOrt.entries()].filter(([, n]) => n < 2).length;
    console.log(
      `  ${typ.padEnd(28)} ${relevante.map(([o, n]) => `${o}(${n})`).join(", ") || "–"}${
        rest ? ` [+ ${rest} Orte mit je 1 Objekt]` : ""
      }`,
    );
  }
}

function ortInterneKontrolle(zeilen: Zeile[]) {
  console.log(
    "\n=== Ortsbereinigter Vergleich: Orte, in denen >= 2 verschiedene Haustypen mit je >= 2 Objekten vorliegen ===",
  );
  const perOrt = new Map<string, Zeile[]>();
  for (const z of zeilen) {
    if (!perOrt.has(z.ort)) perOrt.set(z.ort, []);
    perOrt.get(z.ort)!.push(z);
  }

  let gefunden = 0;
  for (const [ort, rows] of perOrt) {
    const perTyp = new Map<string, Zeile[]>();
    for (const r of rows) {
      if (!perTyp.has(r.haustyp)) perTyp.set(r.haustyp, []);
      perTyp.get(r.haustyp)!.push(r);
    }
    const typenMitGenugN = [...perTyp.entries()].filter(([, rs]) => rs.length >= 2);
    if (typenMitGenugN.length < 2) continue;
    gefunden++;
    console.log(`\n  Ort: ${ort}`);
    for (const [typ, rs] of typenMitGenugN.sort((a, b) => b[1].length - a[1].length)) {
      const med = median(rs.map((r) => r.qm))!;
      console.log(`    ${typ.padEnd(28)} n=${rs.length}  Median ${eur(med)}`);
    }
  }
  if (gefunden === 0) {
    console.log(
      "\n  KEIN Ort erfüllt die Mindestanforderung (>= 2 Haustypen mit je >= 2 Objekten im selben Ort).",
    );
    console.log(
      "  Ein ortsbereinigter Haustyp-Vergleich ist mit den vorliegenden Daten NICHT möglich —",
    );
    console.log("  jeder Unterschied zwischen Haustypen über alle Orte hinweg kann ebenso gut ein Ortseffekt sein.");
  }
}

async function main() {
  console.log("################  AKTIVE OBJEKTE (Angebotspreise, keine Abschlüsse)  ################");
  const aktive = await fetchOnOfficeEstates();
  if (!aktive) {
    console.error("OnOffice-Abfrage (aktive Objekte) fehlgeschlagen (Credentials/Netz?).");
  } else {
    console.log(`Aktive Objekte gesamt: ${aktive.length}`);
    const { zeilen, gesamtHaus, ohneHaustyp, kategorien } = toZeilen(aktive);
    printFrequenz("Verteilung objektart -> category (grobe Kategorie, NICHT der Haustyp):", kategorien);
    console.log(
      `\nHäuser gesamt (category=haus, marketingType=kauf): ${gesamtHaus}, davon ohne gepflegten objekttyp: ${ohneHaustyp}`,
    );
    const perTyp0 = new Map<string, number>();
    for (const z of zeilen) perTyp0.set(z.haustyp, (perTyp0.get(z.haustyp) ?? 0) + 1);
    printFrequenz("Verteilung objekttyp -> objectType (Haustyp-Kandidat) bei verwertbaren Häusern:", perTyp0);
    console.log(`\nDavon mit Preis+Wohnfläche+plausiblem €/m² (verwertbar für Kennzahlen): ${zeilen.length}`);
    const perTyp = haustypStats(zeilen);
    ortVerteilung(perTyp);
    ortInterneKontrolle(zeilen);
  }

  console.log("\n\n################  VERKAUFTE REFERENZEN (echte Abschlüsse)  ################");
  const verkauft = await fetchVerkaufteReferenzen(500);
  if (!verkauft) {
    console.error("OnOffice-Abfrage (verkaufte Referenzen) fehlgeschlagen (Credentials/Netz?).");
    return;
  }
  console.log(`Verkaufte Objekte gesamt: ${verkauft.length}`);
  const { zeilen, gesamtHaus, ohneHaustyp, kategorien } = toZeilen(verkauft);
  printFrequenz("Verteilung objektart -> category (grobe Kategorie, NICHT der Haustyp):", kategorien);
  console.log(
    `\nHäuser gesamt (category=haus, marketingType=kauf): ${gesamtHaus}, davon ohne gepflegten objekttyp: ${ohneHaustyp}`,
  );
  const perTyp0 = new Map<string, number>();
  for (const z of zeilen) perTyp0.set(z.haustyp, (perTyp0.get(z.haustyp) ?? 0) + 1);
  printFrequenz("Verteilung objekttyp -> objectType (Haustyp-Kandidat) bei verwertbaren Häusern:", perTyp0);
  console.log(`\nDavon mit Preis+Wohnfläche+plausiblem €/m² (verwertbar für Kennzahlen): ${zeilen.length}`);
  const perTyp = haustypStats(zeilen);
  ortVerteilung(perTyp);
  ortInterneKontrolle(zeilen);
}

main();

/**
 * Belegt die Preisspannen mit ECHTEN Abschlüssen aus OnOffice (Vorschlag Alex):
 * zieht alle als verkauft markierten Objekte, rechnet €/m² Wohnfläche und
 * gruppiert nach Ort. Ergebnis ist die Grundlage, um SPANNE_BELEGT in
 * lib/marktdaten.ts und die Artikelspannen zu kalibrieren, statt zu schätzen.
 *
 * Nur Lesezugriff, schreibt nichts. Ausgabe bewusst ohne Objektadressen —
 * nur Aggregate, damit kein Mandantendetail im Log landet.
 *
 *   node --env-file=.env.local node_modules/.bin/tsx scripts/preisanalyse-onoffice.mts
 */
import { fetchVerkaufteReferenzen } from "../src/lib/onoffice";

const nf = new Intl.NumberFormat("de-DE");
const eur = (n: number) => `${nf.format(Math.round(n))} €`;

// 1000 statt 500: der Verkauft-Pool liegt bei ~774 Records (Stand 08/2026) —
// mit 500 fehlte ein Drittel der Historie in der Kalibrierung.
const estates = await fetchVerkaufteReferenzen(1000);
if (!estates) {
  console.error("OnOffice-Abfrage fehlgeschlagen (Credentials/Netz?).");
  process.exit(1);
}
console.log(`Verkaufte Objekte gesamt: ${estates.length}\n`);

interface Zeile {
  ort: string;
  typ: string;
  /** Roher OnOffice-Objekttyp (z. B. "Mehrfamilien", "Einfamilien") — für den MFH-Filter. */
  objektTyp: string;
  preis: number;
  flaeche: number;
  qm: number;
}

/**
 * Die OnOffice-Kategorie "haus" enthält auch Mehrfamilien-/Zinshäuser und
 * Wohn-/Geschäftshäuser — die handeln in €/m² deutlich UNTER Eigenheimen
 * (Ertragsobjekte) und würden Median/p75 der Haus-Kalibrierung nach unten
 * verzerren (Befund 11.08.2026: Ludwigshafen-"Haus"-Median 2.200 €/m² war
 * zinshaus-getrieben). Gleicher Filter wie in src/lib/verkauft-stats.ts.
 */
const MFH_TYP = /mehrfamilien|zinshaus|wohn.*gesch|renditeobjekt|apartmenthaus/i;
const istEigenheim = (z: Zeile) => z.typ !== "haus" || !MFH_TYP.test(z.objektTyp);

const zeilen: Zeile[] = [];
for (const e of estates) {
  const preis = typeof e.price === "number" ? e.price : null;
  const flaeche = typeof e.livingArea === "number" ? e.livingArea : null;
  if (!preis || !flaeche || flaeche < 20 || preis < 20_000) continue;
  const qm = preis / flaeche;
  // Ausreißer-Schutz: unter 500 / über 15.000 €/m² sind Datenfehler
  // (z. B. Grundstückspreis auf Wohnfläche bezogen), nicht Marktpreise.
  if (qm < 500 || qm > 15_000) continue;
  zeilen.push({
    ort: (e.city || "?").trim(),
    typ: e.category || "?",
    objektTyp: e.objectType || "",
    preis,
    flaeche,
    qm,
  });
}

console.log(`Davon mit Preis UND Wohnfläche (verwertbar): ${zeilen.length}\n`);

function stats(rows: Zeile[]) {
  const qms = rows.map((r) => r.qm).sort((a, b) => a - b);
  const p = (q: number) => qms[Math.min(qms.length - 1, Math.floor(qms.length * q))];
  return {
    n: rows.length,
    min: qms[0],
    p25: p(0.25),
    median: p(0.5),
    p75: p(0.75),
    max: qms[qms.length - 1],
  };
}

// Gruppiert nach Ort, absteigend nach Fallzahl
const perOrt = new Map<string, Zeile[]>();
for (const z of zeilen) {
  const key = z.ort.replace(/^\d{5}\s*/, "");
  if (!perOrt.has(key)) perOrt.set(key, []);
  perOrt.get(key)!.push(z);
}

console.log("=== €/m² Wohnfläche je Ort (nur Orte mit >= 3 Abschlüssen) ===");
console.log("Ort                        n   min      25%      Median   75%      max");
for (const [ort, rows] of [...perOrt.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (rows.length < 3) continue;
  const s = stats(rows);
  console.log(
    `${ort.slice(0, 25).padEnd(26)} ${String(s.n).padStart(2)}  ${eur(s.min).padStart(8)} ${eur(s.p25).padStart(8)} ${eur(s.median).padStart(8)} ${eur(s.p75).padStart(8)} ${eur(s.max).padStart(8)}`,
  );
}

const gesamt = stats(zeilen);
console.log(
  `\nGESAMT                     ${String(gesamt.n).padStart(2)}  ${eur(gesamt.min).padStart(8)} ${eur(gesamt.p25).padStart(8)} ${eur(gesamt.median).padStart(8)} ${eur(gesamt.p75).padStart(8)} ${eur(gesamt.max).padStart(8)}`,
);

// Nach Objektkategorie: relevant für die Frage, ob Haus und Wohnung getrennte
// Spannen brauchen (bisher wird für beide dieselbe belegte Spanne genutzt).
const perTyp = new Map<string, Zeile[]>();
for (const z of zeilen) {
  if (!perTyp.has(z.typ)) perTyp.set(z.typ, []);
  perTyp.get(z.typ)!.push(z);
}
console.log("\n=== €/m² je Objektkategorie (alle Orte) ===");
for (const [typ, rows] of [...perTyp.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (rows.length < 3) continue;
  const s = stats(rows);
  console.log(
    `${typ.slice(0, 25).padEnd(26)} ${String(s.n).padStart(2)}  ${eur(s.min).padStart(8)} ${eur(s.p25).padStart(8)} ${eur(s.median).padStart(8)} ${eur(s.p75).padStart(8)} ${eur(s.max).padStart(8)}`,
  );
}

// Orte mit wenigen Abschlüssen wenigstens zählen
const duenn = [...perOrt.entries()].filter(([, r]) => r.length < 3);
if (duenn.length) {
  console.log(`\nOrte mit 1-2 Abschlüssen (zu dünn für eine Spanne): ${duenn.length}`);
  console.log(duenn.map(([o, r]) => `${o} (${r.length})`).join(", "));
}

// ─────────────────────────────────────────────────────────────────────────────
// REGIONS-Kalibriervorschlag (11.08.2026, Fall Manfred „Landauer Warte"):
// Die Basiswerte in valuation.ts REGIONS (und ihr Spiegel REGION_BASIS in
// marktdaten.ts) sollen den MEDIAN echter Abschlüsse je Ort und Kategorie
// beschreiben — nicht das Spitzenniveau. Dieser Block rechnet den Vorschlag
// direkt aus, getrennt nach Wohnung und Haus (auf 50 € gerundet, ab n >= 5).
// Übernahme bleibt bewusst Handarbeit: beide Dateien synchron ändern und die
// Änderung im jeweiligen Kommentar begründen (s. CLAUDE.md / Playbook §3.3).
// ─────────────────────────────────────────────────────────────────────────────
const r50 = (n: number) => Math.round(n / 50) * 50;
const mfhRaus = zeilen.filter((z) => z.typ === "haus" && !istEigenheim(z)).length;
console.log(`\n=== REGIONS-Kalibriervorschlag (Median echter Abschlüsse, ab n >= 5) ===`);
console.log(`(Haus = nur Eigenheime; ${mfhRaus} MFH/Zinshaus/WGH-Abschlüsse herausgefiltert)`);
console.log("Ort                        Wohnung (n)      Haus o. MFH (n)  p75 Wohnung   p75 Haus");
for (const [ort, rows] of [...perOrt.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const wo = rows.filter((z) => z.typ === "wohnung");
  const ha = rows.filter((z) => z.typ === "haus" && istEigenheim(z));
  if (wo.length < 5 && ha.length < 5) continue;
  const wTxt = wo.length >= 5 ? `${eur(r50(stats(wo).median))} (${wo.length})` : "– zu dünn –";
  const hTxt = ha.length >= 5 ? `${eur(r50(stats(ha).median))} (${ha.length})` : "– zu dünn –";
  const wP = wo.length >= 5 ? eur(Math.round(stats(wo).p75)) : "–";
  const hP = ha.length >= 5 ? eur(Math.round(stats(ha).p75)) : "–";
  console.log(`${ort.slice(0, 25).padEnd(26)} ${wTxt.padEnd(16)} ${hTxt.padEnd(16)} ${wP.padStart(10)} ${hP.padStart(10)}`);
}
console.log(
  "\nÜbernahme-Hinweise:" +
    "\n- WOHNUNG: Median ÷ 0,93 (typischer Altbau-Mix des Pools ≈ Baujahr-Faktor)" +
    "\n  ergibt den REGIONS-Basiswert; erst ab n >= 20 hartkodieren, darunter" +
    "\n  regelt der Laufzeit-p75-Deckel (verkauft-stats.ts) allein." +
    "\n- HAUS: Verkaufs-€/m² enthalten das GRUNDSTÜCK — vor der Übernahme den" +
    "\n  typischen Bodenanteil abziehen (≈ BRW × 0,6 × 3 [420 m² Grund je" +
    "\n  140 m² Wfl.]), sonst zählt der Boden doppelt (Engine addiert ihn separat)." +
    "\n- Zur Laufzeit deckelt die Engine zusätzlich am p75 echter Orts-Abschlüsse —" +
    "\n  der Vorschlag hier kalibriert den STARTPUNKT des Modells, nicht den Deckel.",
);

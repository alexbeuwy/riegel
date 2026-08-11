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

const estates = await fetchVerkaufteReferenzen(500);
if (!estates) {
  console.error("OnOffice-Abfrage fehlgeschlagen (Credentials/Netz?).");
  process.exit(1);
}
console.log(`Verkaufte Objekte gesamt: ${estates.length}\n`);

interface Zeile {
  ort: string;
  typ: string;
  preis: number;
  flaeche: number;
  qm: number;
}

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
console.log("\n=== REGIONS-Kalibriervorschlag (Median echter Abschlüsse, ab n >= 5) ===");
console.log("Ort                        Wohnung (n)      Haus (n)");
for (const [ort, rows] of [...perOrt.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const wo = rows.filter((z) => z.typ === "wohnung");
  const ha = rows.filter((z) => z.typ === "haus");
  if (wo.length < 5 && ha.length < 5) continue;
  const wTxt = wo.length >= 5 ? `${eur(r50(stats(wo).median))} (${wo.length})` : "– zu dünn –";
  const hTxt = ha.length >= 5 ? `${eur(r50(stats(ha).median))} (${ha.length})` : "– zu dünn –";
  console.log(`${ort.slice(0, 25).padEnd(26)} ${wTxt.padEnd(16)} ${hTxt}`);
}
console.log(
  "\nHinweis: Zur Laufzeit deckelt die Engine zusätzlich am p75 echter Orts-" +
    "\nAbschlüsse (src/lib/verkauft-stats.ts) — der Vorschlag hier kalibriert den" +
    "\nSTARTPUNKT des Modells, nicht den Deckel.",
);

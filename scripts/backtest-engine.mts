/**
 * Backtest der Bewertungs-Engine gegen ECHTE Abschlüsse (Masterplan P1,
 * „Bulletproof"-Werkzeug — Frage Alex 12.08.2026): Für jeden verkauften
 * Bestand aus OnOffice wird estimateValue() mit den damals bekannten
 * Objektdaten gerechnet und gegen den notariellen Kaufpreis gemessen.
 * So finden WIR die Blindflecken, bevor Manfred sie im Kundengespräch findet.
 *
 * Gemessen wird in zwei Varianten:
 *   A) pures Modell (ohne ortsStats) — was ein Kunde OHNE lokale Datenlage sähe,
 *   B) mit p75-Deckel als Leave-One-Out (der eigene Abschluss wird aus der
 *      Orts-Statistik entfernt, sonst testet man auf den Trainingsdaten).
 *
 * KPIs je Segment: MdAPE (medianer absoluter Fehler in %), Bias (medianer
 * VORZEICHEN-Fehler: + = Modell zu hoch), Trefferquote der Spanne [low, high].
 * Zielmarken (rechner-masterplan.md §5): Kerngebiet MdAPE < 10 %, Spanne > 80 %.
 *
 * Grenzen (ehrlich): Zustand ist im Verkauft-Export nicht gepflegt → überall
 * „gepflegt" angenommen; kein amtlicher BRW (keine Koordinaten) → Lagefaktor 1;
 * updatedAt ist die letzte CRM-Änderung, nur ein GROBER Verkaufszeit-Proxy;
 * alte Abschlüsse sind nicht auf heute indexiert (P1-Punkt Zeit-Indexierung) —
 * ein negativer Bias bei Alt-Verkäufen ist daher erwartbar und kein Fehler.
 *
 *   ONOFFICE_TOKEN=… ONOFFICE_SECRET=… npx tsx scripts/backtest-engine.mts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLINDER FLECK DIESES BACKTESTS (18.08.2026): DREI UNGETESTETE MECHANISMEN
 * ─────────────────────────────────────────────────────────────────────────────
 * Der Backtest rechnet OHNE Koordinaten und damit ohne amtlichen
 * Bodenrichtwert (s. „Grenzen" oben). Genau daran hängen aber drei der
 * wirksamsten Schichten der Engine — sie laufen in JEDEM echten Kundenfall
 * mit, sind hier aber strukturell abgeschaltet und deshalb bis heute an
 * keinem einzigen realen Abschluss gemessen:
 *
 *   1. BRW-MIKROLAGE (`lageFaktor` in estimateValue): dämpft/hebt die
 *      Gebäudebasis mit √(BRW / Regions-Boden), geklemmt auf 0,72–1,06
 *      (kalibrierte Region) bzw. 0,72–1,15 (Fallback-Ort). Ohne BRW ist der
 *      Faktor konstant 1 — der Backtest misst also eine Engine, die die
 *      Mikrolage gar nicht kennt. Ausgerechnet die Ausreißer-Liste unten
 *      besteht überwiegend aus Lage-Effekten.
 *   2. brwBasis() (Schicht 3): leitet für Orte außerhalb der Kernregion die
 *      komplette Basis aus dem amtlichen Bodenrichtwert ab. Greift nur mit
 *      BRW >= BRW_ANKER_MIN — im Backtest also nie.
 *   3. STADT-NIVEAU (Schicht 1, stadt-niveau.ts): quellenbelegte absolute
 *      Basiswerte für Großstädte. Läuft zwar auch ohne BRW, betrifft aber
 *      fast nur Orte AUSSERHALB des Verkauft-Pools (der ist Vorderpfalz-
 *      lastig) — die Stichprobe enthält kaum Fälle, an denen sie sichtbar
 *      würde. Der Karlsruhe-Bug (Stadt-Faktor verdeckte das Stadt-Niveau,
 *      +7,1 % Bias) wurde deshalb NICHT hier gefunden, sondern von Hand.
 *
 * GEPLANTE MESSSPALTE C (bewusst noch nicht implementiert): eine dritte
 * Variante neben A (pures Modell) und B (mit p75-Deckel, leave-one-out) —
 * „C = mit amtlichem Bodenrichtwert". Dafür muss jeder Fall zunächst
 * geokodiert werden (Adresse aus dem OnOffice-Record → lat/lng, s.
 * src/lib/geocode.ts) und der BRW je Punkt über src/lib/boris.ts geholt
 * werden; beides sind fremde Dienste mit Rate-Limits, der Lauf braucht also
 * einen Cache auf Platte und läuft Minuten statt Sekunden. Spalte C zeigt
 * dann pro Segment MdAPE/Bias MIT Lageinformation, und die Differenz C − A
 * ist die erste harte Zahl dazu, ob die BRW-Schichten den Fehler wirklich
 * senken oder ihn nur verschieben. Bis dahin gilt: alle KPIs unten
 * beschreiben die Engine OHNE Lagedaten und sind damit eher eine
 * Untergrenze der realen Treffergenauigkeit.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { fetchVerkaufteReferenzen } from "../src/lib/onoffice";
import { estimateValue, type Haustyp, type ValuationInput } from "../src/lib/valuation";

const MFH_TYP = /mehrfamilien|zinshaus|wohn.*gesch|renditeobjekt|apartmenthaus/i;

function mapHaustyp(t?: string): Haustyp | undefined {
  if (!t) return undefined;
  if (/doppelhaus/i.test(t)) return "doppelhaushaelfte";
  if (/reihenend/i.test(t)) return "reihenendhaus";
  if (/reihen/i.test(t)) return "reihenmittelhaus";
  if (/bungalow/i.test(t)) return "bungalow";
  return undefined;
}

interface Fall {
  ort: string;
  kategorie: "wohnung" | "haus";
  wf: number;
  preis: number;
  qm: number;
  baujahr?: number;
  jahr?: number; // updatedAt-Jahr (grober Verkaufszeit-Proxy)
  input: ValuationInput;
}

const estates = await fetchVerkaufteReferenzen(1000);
if (!estates || estates.length === 0) {
  console.error("OnOffice-Abfrage fehlgeschlagen (Credentials/Netz?).");
  process.exit(1);
}

const faelle: Fall[] = [];
for (const e of estates) {
  if (e.category !== "wohnung" && e.category !== "haus") continue;
  if (e.category === "haus" && e.objectType && MFH_TYP.test(e.objectType)) continue; // wie verkauft-stats
  const preis = typeof e.price === "number" ? e.price : null;
  const wf = typeof e.livingArea === "number" ? e.livingArea : null;
  if (!preis || !wf || wf < 20 || preis < 20_000) continue;
  const qm = preis / wf;
  if (qm < 500 || qm > 15_000) continue; // Datenfehler-Schutz wie preisanalyse
  const ort = (e.city || "").replace(/^\d{5}\s*/, "").trim();
  if (!ort) continue;
  faelle.push({
    ort,
    kategorie: e.category,
    wf,
    preis,
    qm,
    baujahr: e.energy?.year,
    jahr: e.updatedAt ? new Date(e.updatedAt).getFullYear() : undefined,
    input: {
      objektart: e.category,
      ort,
      wohnflaeche: wf,
      grundflaeche: e.category === "haus" ? e.plotArea : undefined,
      zimmer: e.rooms ?? undefined,
      baujahr: e.energy?.year,
      zustand: "gepflegt", // im Verkauft-Export nicht gepflegt → neutrale Annahme
      qualitaet: "normal",
      energieklasse: e.energy?.energyClass,
      ausstattung: [],
      haustyp: e.category === "haus" ? mapHaustyp(e.objectType) : undefined,
    },
  });
}
console.log(`Backtest-Fälle (Wohnung/Eigenheim, verwertbar): ${faelle.length}\n`);

// Orts-Statistik für Leave-One-Out-Deckel: qm-Listen je ort|kategorie.
const proOrt = new Map<string, number[]>();
for (const f of faelle) {
  const k = `${f.ort.toLowerCase()}|${f.kategorie}`;
  if (!proOrt.has(k)) proOrt.set(k, []);
  proOrt.get(k)!.push(f.qm);
}
function looStats(f: Fall): { n: number; medianQm: number; p75Qm: number } | undefined {
  const alle = proOrt.get(`${f.ort.toLowerCase()}|${f.kategorie}`) ?? [];
  const ohne = [...alle];
  const i = ohne.indexOf(f.qm);
  if (i >= 0) ohne.splice(i, 1); // den eigenen Abschluss rausnehmen
  if (ohne.length < 5) return undefined;
  const s = ohne.sort((a, b) => a - b);
  const p = (q: number) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
  return { n: s.length, medianQm: Math.round(p(0.5)), p75Qm: Math.round(p(0.75)) };
}

interface Messung {
  fall: Fall;
  apeA: number;
  biasA: number;
  inBandA: boolean;
  apeB: number;
  biasB: number;
  inBandB: boolean;
}
const messungen: Messung[] = [];
for (const f of faelle) {
  const a = estimateValue(f.input);
  const b = estimateValue(f.input, { ortsStats: looStats(f) });
  const m = (mid: number) => (mid - f.preis) / f.preis;
  messungen.push({
    fall: f,
    apeA: Math.abs(m(a.mid)),
    biasA: m(a.mid),
    inBandA: f.preis >= a.low && f.preis <= a.high,
    apeB: Math.abs(m(b.mid)),
    biasB: m(b.mid),
    inBandB: f.preis >= b.low && f.preis <= b.high,
  });
}

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
}
function zeile(label: string, ms: Messung[]) {
  if (ms.length < 5) return;
  const mdA = median(ms.map((m) => m.apeA));
  const mdB = median(ms.map((m) => m.apeB));
  const biasB = median(ms.map((m) => m.biasB));
  const band = ms.filter((m) => m.inBandB).length / ms.length;
  console.log(
    `${label.slice(0, 30).padEnd(31)} ${String(ms.length).padStart(4)}  ${pct(mdA).padStart(8)}  ${pct(mdB).padStart(8)}  ${pct(biasB).padStart(8)}  ${pct(band).padStart(7)}`,
  );
}

console.log("Segment                           n   MdAPE(A)  MdAPE(B)   Bias(B)  Spanne(B)");
console.log("(A = pures Modell, B = mit p75-Deckel leave-one-out; Bias + = Modell zu hoch)");
zeile("GESAMT", messungen);
zeile("— Wohnung", messungen.filter((m) => m.fall.kategorie === "wohnung"));
zeile("— Haus (Eigenheim)", messungen.filter((m) => m.fall.kategorie === "haus"));
zeile("— CRM-Änderung ab 2024", messungen.filter((m) => (m.fall.jahr ?? 0) >= 2024));
zeile("— CRM-Änderung vor 2024", messungen.filter((m) => (m.fall.jahr ?? 0) < 2024));
zeile("— Baujahr < 1970", messungen.filter((m) => (m.fall.baujahr ?? 9999) < 1970));
zeile("— Baujahr 1970–1999", messungen.filter((m) => (m.fall.baujahr ?? 0) >= 1970 && (m.fall.baujahr ?? 0) < 2000));
zeile("— Baujahr ab 2000", messungen.filter((m) => (m.fall.baujahr ?? 0) >= 2000));
zeile("— ohne Baujahr", messungen.filter((m) => m.fall.baujahr == null));

const orte = [...new Set(messungen.map((m) => m.fall.ort))];
console.log("\nJe Ort (n >= 8):");
for (const ort of orte) {
  const ms = messungen.filter((m) => m.fall.ort === ort);
  if (ms.length >= 8) zeile(`— ${ort}`, ms);
}

// Die 10 größten Ausreißer (Variante B) — Kandidaten für Battery-Fixtures.
// Datensparsam: nur Ort/Kategorie/Fläche/Baujahr, keine Adressen/Titel.
console.log("\nTop-10-Ausreißer (B) — Battery-Kandidaten:");
const schlimmste = [...messungen].sort((a, b) => b.apeB - a.apeB).slice(0, 10);
for (const m of schlimmste) {
  console.log(
    `  ${m.fall.ort.slice(0, 18).padEnd(19)} ${m.fall.kategorie.padEnd(8)} ${String(Math.round(m.fall.wf)).padStart(4)} m²  Bj ${String(m.fall.baujahr ?? "–").padStart(4)}  real ${Math.round(m.fall.qm)} €/m²  Modell ${pct(m.biasB).padStart(8)}`,
  );
}
console.log(
  `\nZielmarken (rechner-masterplan.md §5): Kerngebiet MdAPE < 10 %, Spanne > 80 %.` +
    `\nInterpretation: Zustand überall als „gepflegt" angenommen, kein BRW, keine` +
    `\nZeit-Indexierung — Alt-Verkäufe drücken den Bias erwartbar ins Minus.`,
);

/**
 * Kurztest für parseDeZahl — Manfreds Fall ("32,35" Wohnfläche) plus die
 * typischen deutschen Eingabeformate. Läuft mit: npx tsx scripts/parse-de-zahl-test.mts
 */
import { parseDeZahl } from "../src/lib/parse-de-zahl";

const cases: [input: string | number | undefined | null, expected: number | undefined][] = [
  ["32,35", 32.35], // Manfreds Eingabe — Dezimal-Komma
  ["1.234", 1234], // Tausenderpunkt
  ["1.234,56", 1234.56], // Tausenderpunkt + Dezimal-Komma
  ["3.247", 3247], // Kleinkarlbach-Grundstück
  ["32.35", 32.35], // Dezimal-Punkt bleibt (nur 2 Nachkommastellen)
  ["120 m²", 120], // Einheiten-Rest
  ["450 €", 450],
  ["1.234.567", 1234567], // mehrere Tausenderpunkte
  ["  92,5  ", 92.5], // Whitespace
  [120, 120], // number passthrough
  [0, 0],
  ["0", 0],
  ["", undefined],
  ["abc", undefined],
  [null, undefined],
  [undefined, undefined],
  [NaN, undefined],
];

let fails = 0;
for (const [input, expected] of cases) {
  const got = parseDeZahl(input);
  const ok = Object.is(got, expected);
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} parseDeZahl(${JSON.stringify(input)}) = ${got} (erwartet ${expected})`);
}

if (fails > 0) {
  console.error(`\n${fails} Testfälle fehlgeschlagen.`);
  process.exit(1);
}
console.log(`\nAlle ${cases.length} Testfälle bestanden.`);

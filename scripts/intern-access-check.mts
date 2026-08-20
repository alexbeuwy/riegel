/**
 * Regressionsschutz für den /intern-Zugang.
 *
 * Warum es dieses Skript gibt: Die Zugangsregel hat innerhalb von zwei Tagen
 * ZWEIMAL echte Menschen ausgesperrt — am 19.08.2026 Sissy (leere Allowlist in
 * Produktion), am 20.08.2026 Alex (Notfallregel kannte nur die Seiten-Domain,
 * nicht die Betreiber-Domain). Beides wäre hier in einer Sekunde aufgefallen.
 * Die Matrix unten ist deshalb bewusst so geschrieben, dass sie die FÄLLE
 * beschreibt, nicht die Implementierung: „Wer kommt rein, wer nicht?"
 *
 * Läuft in CI (.github/workflows/ci.yml) und lokal via
 *   npx tsx scripts/intern-access-check.mts
 */
import { internFixedEmails, internNotfallDomains, internNotfallErlaubt } from "../src/lib/intern-access";

type Fall = {
  name: string;
  env: { INTERN_EMAILS?: string; INTERN_BETREIBER_DOMAIN?: string; NODE_ENV?: string };
  email: string;
  erwartet: boolean;
};

const SISSY = "sissy.riegel@riegel-immobilien.de";
const ALEX = "alex@beuwy.com";
const FREMD = "chef@fremder-makler.de";

const FAELLE: Fall[] = [
  // --- Produktion OHNE INTERN_EMAILS: der Vorfall-Zustand ---------------
  { name: "Prod ohne Env: Sissy (eigene Domain) kommt rein", env: { NODE_ENV: "production" }, email: SISSY, erwartet: true },
  { name: "Prod ohne Env: Alex (Betreiber-Domain) kommt rein", env: { NODE_ENV: "production" }, email: ALEX, erwartet: true },
  { name: "Prod ohne Env: fremder Makler bleibt draußen", env: { NODE_ENV: "production" }, email: FREMD, erwartet: false },
  { name: "Prod ohne Env: Domain nur als Suffix zählt nicht", env: { NODE_ENV: "production" }, email: "x@nicht-beuwy.com.evil.de", erwartet: false },
  { name: "Prod ohne Env: Groß/Kleinschreibung egal", env: { NODE_ENV: "production" }, email: "Alex@Beuwy.COM", erwartet: true },

  // --- Sobald INTERN_EMAILS gesetzt ist, gilt AUSSCHLIESSLICH die Liste --
  { name: "Env gesetzt: Notfallregel greift nicht mehr", env: { NODE_ENV: "production", INTERN_EMAILS: SISSY }, email: ALEX, erwartet: false },

  // --- Klon, der den Betreiber ausdrücklich nicht will -------------------
  { name: "Betreiber-Domain leer: Alex draußen", env: { NODE_ENV: "production", INTERN_BETREIBER_DOMAIN: "" }, email: ALEX, erwartet: false },
  { name: "Betreiber-Domain leer: eigenes Team weiter drin", env: { NODE_ENV: "production", INTERN_BETREIBER_DOMAIN: "" }, email: SISSY, erwartet: true },
  { name: "Betreiber-Domain überschrieben: neue Agentur drin", env: { NODE_ENV: "production", INTERN_BETREIBER_DOMAIN: "andere-agentur.de" }, email: "chef@andere-agentur.de", erwartet: true },
  { name: "Betreiber-Domain überschrieben: beuwy draußen", env: { NODE_ENV: "production", INTERN_BETREIBER_DOMAIN: "andere-agentur.de" }, email: ALEX, erwartet: false },
];

function mitEnv<T>(env: Fall["env"], fn: () => T): T {
  const alt: Record<string, string | undefined> = {};
  for (const k of ["INTERN_EMAILS", "INTERN_BETREIBER_DOMAIN", "NODE_ENV"]) {
    alt[k] = process.env[k];
    const v = (env as Record<string, string | undefined>)[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(alt)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

let fehler = 0;
const stillesLog = console.error;
for (const f of FAELLE) {
  // internFixedEmails() loggt in Produktion absichtlich laut — hier stumm.
  console.error = () => {};
  const ist = mitEnv(f.env, () => internFixedEmails().has(f.email.toLowerCase()) || internNotfallErlaubt(f.email));
  console.error = stillesLog;
  const ok = ist === f.erwartet;
  if (!ok) fehler++;
  console.log(`${ok ? "✓" : "✗"} ${f.name} — erwartet ${f.erwartet}, ist ${ist}`);
}

// Zusatzprüfung: Die Notfall-Domains dürfen nie leer sein, solange site.url
// gesetzt ist — sonst wäre die Regel wirkungslos und niemand käme rein.
const domains = mitEnv({ NODE_ENV: "production" }, () => internNotfallDomains());
if (domains.length < 2) {
  console.log(`✗ Notfall-Domains unerwartet knapp: ${JSON.stringify(domains)}`);
  fehler++;
} else {
  console.log(`✓ Notfall-Domains: ${domains.map((d) => `@${d}`).join(" / ")}`);
}

console.log(fehler === 0 ? `\nAlle ${FAELLE.length + 1} Zugangs-Prüfungen grün.` : `\n${fehler} Zugangs-Prüfung(en) FEHLGESCHLAGEN.`);
process.exit(fehler === 0 ? 0 : 1);

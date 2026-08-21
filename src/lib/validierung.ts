// `zod/mini` statt `zod`: gemessen am 21.08.2026 kostet der klassische Import
// **65,0 KB gzip** im Client-Bundle, `zod/mini` **4,2 KB** — bei identischer
// Prüf-Logik. Diese Schemas laufen auch im Browser (die Formulare prüfen
// sofort), und die Startseite kam gerade erst mühsam auf PageSpeed 89. Der
// Preis ist die funktionale Schreibweise: `z.string().check(z.maxLength(80))`
// statt `z.string().max(80)`.
import * as z from "zod/mini";

/**
 * Zentrale Eingabe-Validierung für alle Formulare, die Leads erzeugen
 * (Report, Kontakt, Objekt-Anfrage, Terminanfrage, Feedback).
 *
 * WARUM ES DIESES MODUL GIBT (Auftrag Alex 21.08.2026):
 * Vorher stand in fünf API-Routen dieselbe kopierte `clean()`-Funktion und in
 * zwölf Dateien dieselbe E-Mail-Regex `^[^@\s]+@[^@\s]+\.[^@\s]+$`. Der Name
 * wurde nirgends geprüft außer auf „nicht leer". Durchgegangen sind damit
 * unter anderem `Hallo` / `hallo@hallo.de`, `a` / `a@b.c`,
 * `asdf` / `asdf@asdf.asdf` und Tippfehler wie `max@gmial.com` — beim
 * Wettbewerber (BottImmo-Report von Adler Immobilien) sieht man das Ergebnis
 * im Anschreiben: „Guten Tag Hallo Hallo".
 *
 * DIE LEITPLANKE: Ein Formular auf einer Makler-Seite darf lieber einen
 * unsauberen Lead durchlassen als einen echten abweisen. Ein verlorener
 * Eigentümer kostet mehr als ein Anruf ins Leere. Deshalb gilt hier:
 *
 *   1. HART ABGEWIESEN wird nur, was nachweislich unbrauchbar ist —
 *      Syntaxfehler, leerer Name, Honeypot gefüllt, Domain existiert nicht.
 *   2. VORGESCHLAGEN (nie erzwungen) werden Tippfehler-Korrekturen:
 *      `gmial.com` → `gmail.com`. Der Nutzer entscheidet.
 *   3. MARKIERT (nie blockiert) wird alles Übrige — unplausibler Name,
 *      Wegwerf-Adresse, Domain ohne MX. Das sieht Sissy in /intern am Lead,
 *      bevor sie zum Hörer greift (s. leadQualitaet).
 *
 * Client UND Server nutzen dieselben Schemas: Der Client bekommt die
 * Meldung sofort, der Server prüft trotzdem noch einmal (die API ist offen
 * erreichbar, Client-Prüfungen sind Komfort, keine Sicherheit).
 *
 * White-Label: Hier steht nichts RIEGEL-Spezifisches. Provider-Liste und
 * Wegwerf-Domains sind marktweite Daten, keine Makler-Daten.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Bausteine
 * ──────────────────────────────────────────────────────────────────────── */

/** Freitext: trimmen und deckeln — der Ersatz für die früher fünffach
 *  kopierte `clean()`-Funktion in den Routen. */
export const text = (max: number) =>
  z.pipe(
    z.string(),
    z.transform((v: string) => v.trim().slice(0, max)),
  );

/**
 * Freitext außerhalb eines Schemas aufräumen — genau die Funktion, die vorher
 * in fünf Routen kopiert stand. Wird noch dort gebraucht, wo Felder einzeln
 * geprüft werden (z. B. die Objektdaten in /api/report, die eigene
 * Wertebereiche haben).
 */
export const sauber = (s: unknown, max: number): string => String(s ?? "").trim().slice(0, max);

/** Optionaler Freitext: fehlend, null und "" laufen alle auf "" hinaus,
 *  damit die Routen nicht drei Leerfälle unterscheiden müssen. */
export const textOptional = (max: number) =>
  z.pipe(
    // `z.optional` ist hier nicht kosmetisch: ohne es verlangt Zod den
    // Schlüssel im Objekt und wirft „expected nonoptional" für jedes Feld,
    // das der Client gar nicht erst mitschickt (z. B. `phone` im
    // Report-Formular, wenn der Nutzer es leer lässt).
    z.optional(z.unknown()),
    z.transform((v: unknown) => (v === null || v === undefined ? "" : String(v).trim().slice(0, max))),
  );

/**
 * Name. Bewusst nachsichtig: „Dr. Anna Bär-Weiß", „O'Connor", „van der Berg"
 * und einbuchstabige Nachnamen sind echte Namen, jede strengere Regel würde
 * reale Eigentümer aussperren. Geprüft wird nur, was KEIN Name sein kann —
 * zu kurz, oder gar kein Buchstabe drin (reine Ziffern-/Zeichenfolgen).
 */
export const nameSchema = z.pipe(
  text(120),
  z.string().check(
    z.minLength(2, "Bitte Ihren Namen angeben."),
    z.refine((s: string) => /\p{L}/u.test(s), "Bitte Ihren Namen angeben."),
  ),
);

/**
 * E-Mail. Zods Prüfung ist deutlich strenger als die alte Regex: sie verlangt
 * eine TLD mit mindestens zwei Buchstaben, verbietet führende und doppelte
 * Punkte. Damit fallen `a@b.c` und `max@gmail` schon hier raus.
 * Kleinschreibung, weil die Adresse als Schlüssel dient (Dublettenprüfung in
 * /intern, Slot-Dedupe im Termin-Flow) und `Max@…` sonst ein zweiter Kontakt wäre.
 */
export const emailSchema = z.pipe(
  z.pipe(
    z.string(),
    z.transform((v: string) => v.trim().slice(0, 200).toLowerCase()),
  ),
  z.email("Bitte eine gültige E-Mail-Adresse angeben."),
);

/** Schnelle Ja/Nein-Prüfung für Stellen, die nur den Zustand brauchen
 *  (z. B. der Fortschrittsbalken im Terminformular) — keine Fehlermeldung. */
export function istEmail(s: string): boolean {
  return z.safeParse(emailSchema, s).success;
}

/**
 * Telefon — optional, aber wenn angegeben, dann normalisiert. Weniger als
 * sechs Ziffern kann keine erreichbare Nummer sein (die kürzesten deutschen
 * Ortsnetznummern liegen darüber); alles andere wird durchgelassen und nur
 * aufgeräumt, damit Sissy nicht „0621 / 52 00 88-00" abtippen muss.
 */
export const telefonOptionalSchema = z.pipe(
  textOptional(80),
  z.string().check(
    z.refine(
      (s: string) => !s || zaehleZiffern(s) >= 6,
      "Die Telefonnummer scheint unvollständig — bitte prüfen (oder Feld leer lassen).",
    ),
  ),
);

/**
 * Honeypot: ein für Menschen unsichtbares Feld namens `website`. Bots füllen
 * jedes Feld aus, Menschen sehen es nicht. Ist es gefüllt, gilt der Request
 * als Bot — die Routen antworten dann bewusst mit „ok", damit der Bot keinen
 * Unterschied merkt und es nicht erneut versucht.
 */
export const honeypotSchema = textOptional(200);

/** Ziffern zählen, unabhängig von Trennzeichen. */
function zaehleZiffern(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

/* ────────────────────────────────────────────────────────────────────────
 * Telefon-Normalisierung
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Deutsche Telefonnummern auf eine einheitliche Form bringen: „0621/5200 88-00"
 * → „+49 621 520088-00" wäre Overengineering (dafür bräuchte es die
 * Vorwahlen-Datenbank aus libphonenumber). Was hier passiert, ist bewusst
 * bescheiden und trotzdem nützlich: Mehrfach-Leerzeichen weg, `(0)` weg,
 * führende `00` → `+`, führende `0` → `+49`. Ergebnis ist eine Nummer, die
 * sich aus der Mail heraus anrufen lässt.
 *
 * Nicht-deutsche Nummern mit `+` bleiben unangetastet.
 */
export function telefonNormalisieren(roh: string): string {
  const s = roh.trim();
  if (!s) return "";
  // Alles außer Ziffern und führendem + entfernen, Durchwahl-Bindestrich
  // bleibt erhalten, weil er in Deutschland eine Bedeutung hat.
  const kompakt = s.replace(/\(0\)/g, "").replace(/[^\d+-]/g, "");
  if (kompakt.startsWith("+")) return kompakt;
  if (kompakt.startsWith("00")) return `+${kompakt.slice(2)}`;
  if (kompakt.startsWith("0")) return `+49${kompakt.slice(1)}`;
  return kompakt;
}

/* ────────────────────────────────────────────────────────────────────────
 * E-Mail-Tippfehler
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Die häufigsten Mail-Domains im deutschen Privatkundenmarkt. Gegen genau
 * diese Liste wird ein Tippfehler-Vorschlag gerechnet — mehr braucht es
 * nicht: Ein Eigentümer, der `max@gmial.com` eintippt, bekommt seinen Report
 * nie und meldet sich auch nicht noch einmal. Das ist der teuerste stille
 * Fehler im ganzen Funnel.
 */
const PROVIDER = [
  "gmail.com",
  "googlemail.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "t-online.de",
  "outlook.de",
  "outlook.com",
  "hotmail.de",
  "hotmail.com",
  "live.de",
  "yahoo.de",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "freenet.de",
  "posteo.de",
  "mailbox.org",
  "arcor.de",
  "vodafone.de",
  "1und1.de",
  "online.de",
  "kabelmail.de",
  "unitybox.de",
];

/** Levenshtein-Distanz, iterativ (zwei Zeilen statt voller Matrix). */
function distanz(a: string, b: string): number {
  if (a === b) return 0;
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const aktuell = [i + 1];
    for (let j = 0; j < b.length; j++) {
      aktuell[j + 1] = Math.min(
        vorher[j + 1] + 1,
        aktuell[j] + 1,
        vorher[j] + (a[i] === b[j] ? 0 : 1),
      );
    }
    vorher = aktuell;
  }
  return vorher[b.length];
}

/**
 * Vorschlag für eine offensichtlich vertippte Domain — oder null.
 *
 * Schwelle nach Domain-Länge, damit kurze Domains nicht wild „korrigiert"
 * werden: `web.de` (6 Zeichen) darf höchstens einen Fehler haben,
 * `googlemail.com` zwei. Exakte Treffer und unbekannte Firmen-Domains geben
 * immer null zurück — eine echte Domain wie `riegel-immobilien.de` darf
 * niemals einen Vorschlag auslösen.
 */
export function mailTippfehler(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const lokal = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || PROVIDER.includes(domain)) return null;

  let bester: { domain: string; d: number } | null = null;
  for (const p of PROVIDER) {
    const d = distanz(domain, p);
    if (!bester || d < bester.d) bester = { domain: p, d };
  }
  if (!bester) return null;

  // Je kürzer die Zieldomain, desto strenger — sonst wird aus der echten
  // Domain "web.at" ein Vorschlag "web.de".
  const erlaubt = bester.domain.length <= 7 ? 1 : bester.domain.length <= 11 ? 2 : 3;
  if (bester.d === 0 || bester.d > erlaubt) return null;
  return `${lokal}@${bester.domain}`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Wegwerf-Adressen
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Wegwerf-/Einmal-Adressen. Bewusst KEIN Blockier-Grund: Wer eine
 * Wegwerfadresse nutzt, will trotzdem seinen Report — und ein Eigentümer,
 * der erst anonym testet und später mit Klarnamen wiederkommt, ist ein
 * völlig normaler Verlauf. Die Liste dient nur der Einordnung in /intern.
 * Kurz gehalten: die vollständige Liste hat >100.000 Einträge und würde als
 * Abhängigkeit mehr kosten, als sie hier bringt.
 */
const WEGWERF = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "trashmail.de",
  "wegwerfmail.de",
  "yopmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
  "maildrop.cc",
  "throwawaymail.com",
  "byom.de",
  "spam4.me",
  "mailnesia.com",
  "einrot.com",
  "fakeinbox.com",
  "mytemp.email",
];

export function istWegwerfAdresse(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return WEGWERF.includes(domain);
}

/**
 * Befund der DNS-Prüfung einer Mail-Domain. Der Typ steht HIER (und nicht in
 * validierung-server.ts), weil `leadQualitaet` ihn braucht und im Browser
 * läuft — die Prüfung selbst kann nur der Server (s. validierung-server.ts).
 */
export type DomainBefund = "ok" | "kein-mx" | "existiert-nicht" | "ungeprueft";

/* ────────────────────────────────────────────────────────────────────────
 * Lead-Qualität
 * ──────────────────────────────────────────────────────────────────────── */

export interface LeadQualitaet {
  /** 0–100. Reine Einordnung für die Anzeige, keine Sortier-Wahrheit. */
  punkte: number;
  /** Klartext-Hinweise für /intern, z. B. „Name wirkt wie ein Platzhalter". */
  hinweise: string[];
}

/** Namen, die in Testeingaben immer wieder auftauchen. Kein Blockier-Grund —
 *  „Herr Test" gibt es wirklich —, aber ein Hinweis ist es wert. */
const PLATZHALTER_NAMEN = [
  "test",
  "hallo",
  "asdf",
  "asd",
  "qwer",
  "qwertz",
  "abc",
  "xxx",
  "max mustermann",
  "erika mustermann",
  "keine angabe",
  "anonym",
  "privat",
];

/**
 * Einordnung eines Leads für die Anzeige in /intern (Wunsch: Sissy soll VOR
 * dem Anruf sehen, was sie erwartet). Bewusst kein Ranking und keine
 * Automatik — nur sichtbar machen, was ohnehin in den Daten steht.
 */
export function leadQualitaet(input: {
  name: string;
  email: string;
  telefon?: string;
  domain?: DomainBefund;
}): LeadQualitaet {
  const hinweise: string[] = [];
  let punkte = 100;

  const name = input.name.trim().toLowerCase();
  const teile = name.split(/\s+/).filter(Boolean);
  // Platzhalter erkennen wir auf ZWEI Ebenen: die ganze Eingabe („max
  // mustermann") und jeden einzelnen Teil („hallo hallo", „test test").
  // Nur einzelne Teile zu prüfen würde „Test Schmidt" fälschlich melden,
  // nur die ganze Eingabe würde „Hallo Hallo" durchlassen.
  const istPlatzhalter =
    PLATZHALTER_NAMEN.includes(name) ||
    (teile.length > 0 && teile.every((t) => PLATZHALTER_NAMEN.includes(t)));
  if (istPlatzhalter) {
    hinweise.push("Name wirkt wie ein Platzhalter");
    punkte -= 35;
  } else if (teile.length < 2) {
    hinweise.push("Nur ein Namensteil angegeben");
    punkte -= 10;
  }
  // Wiederholtes Wort („Hallo Hallo") ist fast immer eine Testeingabe.
  if (teile.length === 2 && teile[0] === teile[1]) {
    hinweise.push("Vor- und Nachname identisch");
    punkte -= 25;
  }

  if (istWegwerfAdresse(input.email)) {
    hinweise.push("Wegwerf-E-Mail-Adresse");
    punkte -= 30;
  }
  if (input.domain === "existiert-nicht") {
    hinweise.push("E-Mail-Domain existiert nicht — Mail kommt nicht an");
    punkte -= 50;
  } else if (input.domain === "kein-mx") {
    hinweise.push("E-Mail-Domain ohne Mailserver-Eintrag");
    punkte -= 15;
  }

  if (!input.telefon?.trim()) {
    hinweise.push("Keine Telefonnummer");
    punkte -= 10;
  }

  return { punkte: Math.max(0, Math.min(100, punkte)), hinweise };
}

/**
 * Die Qualitäts-Hinweise so aufbereiten, wie sie in `leads.detail` (JSON)
 * landen — und zwar NUR, wenn es überhaupt etwas zu sagen gibt. Ein sauberer
 * Lead soll kein zusätzliches Feld bekommen, sonst steht in /intern bei jedem
 * zweiten Eintrag „100 Punkte, keine Hinweise" im Weg.
 */
export function qualitaetDetail(q: LeadQualitaet): Record<string, unknown> | null {
  if (q.hinweise.length === 0) return null;
  return { qualitaetPunkte: q.punkte, qualitaetHinweise: q.hinweise };
}

/* ────────────────────────────────────────────────────────────────────────
 * Formular-Schemas
 * ──────────────────────────────────────────────────────────────────────── */

/** Felder, die JEDES Lead-Formular mitbringt. */
const basis = {
  name: nameSchema,
  email: emailSchema,
  website: honeypotSchema,
};

/**
 * Die Feldnamen unten folgen bewusst dem, was die Formulare HEUTE senden —
 * `objekt` im Kontakt-/Terminformular, `objektTitel` in der Objektanfrage,
 * `telefon` statt `phone` in der Objektanfrage. Sie zu vereinheitlichen wäre
 * schöner, würde aber jede laufende Formular-Session brechen, die noch die
 * alte Seite im Tab hat. Vereinheitlichung gehört in einen eigenen Schritt.
 */
export const kontaktSchema = z.object({
  ...basis,
  phone: telefonOptionalSchema,
  topic: textOptional(120),
  message: textOptional(5000),
  objekt: textOptional(200),
  objektId: textOptional(80),
});

export const anfrageSchema = z.object({
  ...basis,
  telefon: telefonOptionalSchema,
  nachricht: textOptional(2000),
  objektTitel: textOptional(200),
  objektId: textOptional(80),
});

export const terminSchema = z.object({
  ...basis,
  phone: telefonOptionalSchema,
  message: textOptional(2000),
  type: textOptional(120),
  mode: textOptional(60),
  location: textOptional(160),
  duration: textOptional(10),
  requestId: textOptional(80),
  objekt: textOptional(200),
  objektId: textOptional(80),
  date: z
    .string()
    .check(
      z.regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum wählen."),
      z.refine(istPlausiblesDatum, "Bitte einen Termin in den nächsten zwölf Monaten wählen."),
    ),
  // Nicht `\d{2}:\d{2}`: das ließ „25:99" durch (in der Batterie aufgefallen).
  time: z.string().check(z.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bitte eine gültige Uhrzeit wählen.")),
});

/**
 * Termin-Datum: nicht in der Vergangenheit und nicht weiter als ein Jahr
 * voraus. Ohne diese Prüfung landete eine Anfrage für den 01.01.1990 genauso
 * im Postfach wie eine für 2087 — beides ist ein Bedienfehler, kein Termin.
 * Tagesgenau in Europe/Berlin, damit ein Klick um 23:30 Uhr nicht als
 * „gestern" gilt.
 */
function istPlausiblesDatum(iso: string): boolean {
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  if (iso < heute) return false;
  const grenze = new Date(Date.now() + 366 * 86_400_000).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  return iso <= grenze;
}

/** Report-Anforderung. Die Objektdaten kommen aus dem Rechner und sind dort
 *  bereits geprüft; hier zählen die Kontaktfelder plus die Einwilligung. */
export const reportSchema = z.object({
  ...basis,
  phone: telefonOptionalSchema,
  message: textOptional(2000),
});

/* ────────────────────────────────────────────────────────────────────────
 * Auswertung
 * ──────────────────────────────────────────────────────────────────────── */

export type PruefErgebnis<T> =
  | { ok: true; daten: T; bot: false }
  | { ok: true; daten: null; bot: true }
  | { ok: false; fehler: string; feld?: string };

/**
 * Ein Formular gegen sein Schema prüfen — mit dem Honeypot als Sonderfall.
 *
 * Der Rückgabewert unterscheidet drei Fälle, weil die Routen sie
 * unterschiedlich behandeln müssen:
 *  - `bot: true` → die Route antwortet mit „ok", tut aber nichts. Ein Bot
 *    soll keinen Unterschied merken.
 *  - `ok: false` → erste verständliche Fehlermeldung, auf Deutsch, mit dem
 *    betroffenen Feld (damit das Formular es markieren kann).
 *  - `ok: true` → geprüfte, getrimmte, normalisierte Daten.
 */
export function pruefeFormular<T extends z.ZodMiniType>(
  schema: T,
  roh: unknown,
): PruefErgebnis<z.infer<T>> {
  const body = (roh ?? {}) as Record<string, unknown>;
  // Honeypot VOR der Schema-Prüfung: ein Bot füllt oft auch andere Felder
  // unsinnig aus, und dann bekäme er eine sprechende Fehlermeldung als
  // Anleitung zum Nachbessern.
  if (String(body.website ?? "").trim()) return { ok: true, daten: null, bot: true };

  const res = z.safeParse(schema, body);
  if (res.success) return { ok: true, daten: res.data, bot: false };

  const erstes = res.error.issues[0];
  return {
    ok: false,
    fehler: erstes?.message || "Bitte prüfen Sie Ihre Angaben.",
    feld: typeof erstes?.path?.[0] === "string" ? erstes.path[0] : undefined,
  };
}

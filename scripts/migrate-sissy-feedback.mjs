// Einmalige Content-Migration (Sissys Feedback-Tickets 24.07.2026):
// Provision konsistent 7,14 % gesamt / 3,57 % je Seite (statt 5,95/2,975),
// Energieausweis-Preise real (100 € online bis 300-450 € Berater, Komplexe 3.000 €+),
// Ausnahmen (Ferienhäuser, Gebäude ohne Heizung), Privatverkaufs-Kosten realistisch
// (Fotos ab 300 €, IS24-Staffel netto, Grundrisse nach m²), Notar-Zwei-Wochen-Satz raus.
// Nutzung: node scripts/migrate-sissy-feedback.mjs  (idempotent nicht nötig, einmalig)
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/content/geo-articles.json", import.meta.url);
const data = JSON.parse(readFileSync(FILE, "utf8"));
let fails = 0;

/** Ersetzt exakt EINMAL in allen Textfeldern eines Artikels; meldet Fehlschläge. */
function repl(slug, find, replace) {
  const a = data.find((x) => x.slug === slug);
  if (!a) { console.error(`FEHLT: Artikel ${slug}`); fails++; return; }
  let hit = false;
  const walk = (obj) => {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string" && v.includes(find)) { obj[k] = v.replace(find, replace); hit = true; }
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(a);
  if (!hit) { console.error(`NICHT GEFUNDEN in ${slug}:\n  "${find.slice(0, 90)}"`); fails++; }
  else console.log(`ok  [${slug}] ${find.slice(0, 60).replace(/\n/g, " ")}…`);
}

/* ── 1) Provision: einheitlich 7,14 % gesamt / 3,57 % je Seite ── */
repl("ludwigshafen",
  "5,95 % bis 7,14 % des Kaufpreises inklusive Mehrwertsteuer — geteilt also meist rund 2,98 % bis 3,57 % je Seite.",
  // Kein Zusatzsatz: der Folgesatz im Original ("Die genaue Höhe vereinbaren
  // wir transparent und schriftlich vor Beauftragung.") deckt das schon ab.
  "7,14 % des Kaufpreises inklusive Mehrwertsteuer — geteilt also rund 3,57 % je Seite.");
repl("ludwigshafen",
  "5,95 % bis 7,14 % des Kaufpreises inkl.",
  "7,14 % des Kaufpreises inkl.");
repl("neustadt-weinstrasse",
  "im Bereich von etwa 5,95 bis 7,14 Prozent des Kaufpreises inklusive Mehrwertsteuer, also rund 2,975 bis 3,57 Prozent je Seite",
  "bei etwa 7,14 Prozent des Kaufpreises inklusive Mehrwertsteuer, also rund 3,57 Prozent je Seite");
repl("neustadt-weinstrasse",
  "Marktüblich sind insgesamt etwa 5,95 bis 7,14 Prozent des Kaufpreises inklusive Mehrwertsteuer, also rund 2,975 bis 3,57 Prozent je Seite.",
  "Marktüblich sind insgesamt etwa 7,14 Prozent des Kaufpreises inklusive Mehrwertsteuer, also rund 3,57 Prozent je Seite.");
// Hinweis: repl() ersetzt in ALLEN Textfeldern des Artikels je einmal —
// Section- und FAQ-Fundstelle sind hier mit EINEM Aufruf abgedeckt.
repl("limburgerhof", "5,95 % inkl.", "7,14 % inkl.");
repl("limburgerhof", "2,975 % teilen.", "3,57 % teilen.");
repl("boehl-iggelheim", "5,95–7,14 % inkl.", "7,14 % inkl.");
repl("geerbte-immobilie-verkaufen", "**5,95 % inkl.", "**7,14 % inkl.");
repl("geerbte-immobilie-verkaufen", "2,975 % je Seite", "3,57 % je Seite");
repl("bester-immobilienmakler-speyer", "5,95 % bis 7,14 %** des Kaufpreises inklusive Mehrwertsteuer (ca.", "7,14 %** des Kaufpreises inklusive Mehrwertsteuer (ca.");
repl("bester-immobilienmakler-speyer", "5,95 % bis 7,14 % des Kaufpreises inklusive Mehrwertsteuer (ca.", "7,14 % des Kaufpreises inklusive Mehrwertsteuer (ca.");
repl("immobilie-verkaufen-ablauf",
  "In Rheinland-Pfalz liegt die Gesamtprovision üblicherweise bei ca. 5,95 % inkl. MwSt. des Kaufpreises, also ca. 2,975 % je Seite.",
  "In Rheinland-Pfalz liegt die Gesamtprovision üblicherweise bei ca. 7,14 % inkl. MwSt. des Kaufpreises, also ca. 3,57 % je Seite.");
repl("immobilie-verkaufen-ablauf",
  "| − Maklerprovision (Verkäuferanteil ca. 2,975 % inkl. MwSt.) | 12.495 € |",
  "| − Maklerprovision (Verkäuferanteil ca. 3,57 % inkl. MwSt.) | 14.994 € |");
repl("immobilie-verkaufen-ablauf",
  "des Kaufpreises insgesamt, also rund 2,975 % je Seite.",
  "des Kaufpreises insgesamt, also rund 3,57 % je Seite.");
// FAQ-Gesamtsatz 5,95 im selben Artikel
repl("immobilie-verkaufen-ablauf", "ca. 5,95 % inkl.", "ca. 7,14 % inkl.");

/* Beispielrechnungs-Summen im ablauf-Artikel nachziehen (420.000 €-Beispiel). */
repl("immobilie-verkaufen-ablauf", "| = Kosten gesamt (Verkäuferseite) | 12.975 € |", "| = Kosten gesamt (Verkäuferseite) | 15.474 € |");
repl("immobilie-verkaufen-ablauf", "| = Verkaufserlös vor Restschuld | 407.025 € |", "| = Verkaufserlös vor Restschuld | 404.526 € |");

/* ── 2) Notar-Zwei-Wochen-Satz raus (wird oft als Widerrufsrecht missverstanden) ── */
repl("immobilie-verkaufen-ablauf",
  "beide Parteien erhalten ihn rechtzeitig vorab zur Prüfung (bei Verbrauchern in der Regel mindestens zwei Wochen).",
  "beide Parteien erhalten ihn rechtzeitig vorab zur Prüfung.");

/* ── 3) Energieausweis: Preise real (Sissy) ── */
repl("energieausweis-pflicht",
  `Richtwerte für die Kosten (Stand 2026, als ca.-Spannen):

- **Verbrauchsausweis:** ca. 50 bis 100 Euro
- **Bedarfsausweis:** ca. 300 bis 500 Euro

Die Preisspanne erklärt sich durch den Aufwand: Ein Verbrauchsausweis lässt sich oft anhand der Heizkostenabrechnungen online erstellen, während für den Bedarfsausweis ein qualifizierter Aussteller das Gebäude technisch bewerten muss – teils mit Vor-Ort-Begehung.`,
  `Richtwerte für die Kosten (Stand 2026, als ca.-Spannen):

- **Verbrauchsausweis (online):** ca. 100 Euro. Wichtig: Die Angaben macht der Eigentümer hier in eigener Verantwortung und haftet für deren Richtigkeit.
- **Ausweis vom professionellen Energieberater:** im Schnitt mindestens ca. 300 bis 450 Euro
- **Große Gebäudekomplexe** (Mehrfamilienhäuser, Gewerbe): je nach Aufwand auch 3.000 Euro aufwärts

Die Preisspanne erklärt sich durch den Aufwand: Ein Verbrauchsausweis lässt sich anhand der Heizkostenabrechnungen online erstellen, während ein qualifizierter Aussteller das Gebäude für den Bedarfsausweis technisch bewerten muss – teils mit Vor-Ort-Begehung.`);
repl("energieausweis-pflicht",
  "Ein Verbrauchsausweis kostet ca. 50 bis 100 Euro, ein Bedarfsausweis ca. 300 bis 500 Euro (Stand 2026).",
  "Ein Online-Verbrauchsausweis kostet ca. 100 Euro (Angaben in eigener Verantwortung des Eigentümers), ein Ausweis vom professionellen Energieberater im Schnitt mindestens ca. 300 bis 450 Euro; bei großen Gebäudekomplexen auch 3.000 Euro aufwärts (Stand 2026).");

/* ── 4) Energieausweis: Ausnahmen ergänzen (Ferienhäuser, ohne Heizung) ── */
repl("energieausweis-pflicht",
  "Ausnahmen gelten unter anderem für denkmalgeschützte Gebäude und für kleine Gebäude mit weniger als 50 m² Nutzfläche.",
  "Ausnahmen gelten unter anderem für denkmalgeschützte Gebäude, für kleine Gebäude mit weniger als 50 m² Nutzfläche, für Ferienhäuser mit begrenzter jährlicher Nutzung (weniger als vier Monate im Jahr) sowie für Gebäude ohne Heizungs- bzw. Klimatisierungsanlage.");

/* ── 5) ablauf-Artikel: Kostenliste (Energieausweis + Grundrisse, T10/T11) ── */
repl("immobilie-verkaufen-ablauf",
  "- **Energieausweis:** ca. 50 bis 500 €, je nach Typ (Verbrauchs- oder Bedarfsausweis)\n- **Grundbuchauszug / Unterlagen:** meist unter 100 €",
  "- **Energieausweis:** ca. 100 € (online, Angaben in eigener Verantwortung) bis ca. 300 bis 450 € beim professionellen Energieberater; große Gebäudekomplexe auch 3.000 € aufwärts\n- **Grundbuchauszug / amtliche Unterlagen:** meist unter 100 €\n- **Grundrisse / Schnitte:** professionell nachgezeichnet meist nach Wohnfläche (m²-Preis) berechnet — je nach Objektgröße schnell mehrere hundert Euro");
repl("immobilie-verkaufen-ablauf",
  "Brauche ich einen Energieausweis für den Verkauf?",
  "Brauche ich einen Energieausweis für den Verkauf?");

/* ── 6) haus-verkaufen: Privatverkaufs-Kosten real (T1/T2) ── */
repl("haus-verkaufen-mit-oder-ohne-makler",
  `**Typische Kostenpositionen beim Privatverkauf (Richtwerte):**
- Energieausweis (Pflicht): ca. 100–500 €, je nach Bedarfs- oder Verbrauchsausweis
- Professionelle Fotos / Exposé: ca. 150–600 €
- Inserate auf Immobilienportalen: ca. 50–250 € pro Objekt und Laufzeit
- Grundbuchauszug und amtliche Unterlagen: ca. 10–50 €
- ggf. Wertgutachten: ca. 500–2.500 €`,
  `**Typische Kostenpositionen beim Privatverkauf (Richtwerte):**
- Energieausweis (Pflicht): ca. 100 € (online, eigene Verantwortung) bis ca. 300–450 € beim professionellen Energieberater; große Objekte deutlich mehr
- Professionelle Fotos: realistisch ab ca. 300 €, je nach Objekt bis ca. 600 €
- Inserate auf Immobilienportalen: Basis-Anzeige ab ca. 50 €; sichtbare Top-Platzierungen bei ImmoScout24 starten bei ca. 199 €, gehobene Pakete ca. 399 €, Premium-Platzierungen bis ca. 1.500 € — jeweils netto, zzgl. MwSt.
- Grundrisse / Schnitte: professionell nachgezeichnet meist nach Wohnfläche (m²-Preis) berechnet — je nach Größe schnell mehrere hundert Euro
- Grundbuchauszug und amtliche Unterlagen: ca. 10–50 €
- ggf. Wertgutachten: ca. 500–2.500 €

Wichtig bei allen Richtwerten: Als Privatperson zahlen Sie meist die vollen Listenpreise. Makler erhalten durch laufende Zusammenarbeit mit Fotografen, Portalen und Zeichenbüros deutlich bessere Konditionen — ein Kostenvorteil, der beim Vergleich oft übersehen wird.`);

if (fails > 0) {
  console.error(`\n${fails} Ersetzung(en) fehlgeschlagen — NICHTS geschrieben.`);
  process.exit(1);
}
writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
console.log("\nAlle Ersetzungen angewendet, Datei geschrieben.");

/**
 * Preisspannen in den Geo-Artikeln weiten — Vorgabe Manfred (07/2026):
 * „Wir haben Preise in Speyer je nach Lage 2.500–7.000 € (am Rhein) pro m².
 *  So auch in Ludwigshafen, ist halt Lage und Zustand."
 *
 * Die bisherigen Spannen waren zu eng und ließen die Spitzenlagen (Speyer am
 * Rhein, Ludwigshafen Parkinsel) sowie die einfachen Lagen mit Sanierungsbedarf
 * am unteren Ende komplett aus.
 *
 * Betroffen sind nur die Orte, für die belegte Zahlen vorliegen: Speyer und
 * Ludwigshafen — inklusive der überregionalen Artikel, die beide Städte als
 * Referenz nennen. Die übrigen Orte behalten ihre Artikelwerte, bis dafür
 * ebenfalls Zahlen aus der Vermarktung vorliegen (Modell-Spannen im Preisatlas
 * sind separat in lib/marktdaten.ts geweitet).
 *
 * Atomar: schreibt nur, wenn ALLE Ersetzungen exakt einmal greifen.
 */
import { readFileSync, writeFileSync } from "node:fs";

const PATH = new URL("../src/content/geo-articles.json", import.meta.url);
const data = JSON.parse(readFileSync(PATH, "utf8"));
let fails = 0;

/** Ersetzt `find` genau einmal im gesamten Artikel (über alle Textfelder). */
function repl(slug, find, replace) {
  const art = data.find((a) => a.slug === slug);
  if (!art) {
    console.error(`Artikel fehlt: ${slug}`);
    fails++;
    return;
  }
  let hits = 0;
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") {
        if (v.includes(find)) {
          hits++;
          o[k] = v.replace(find, replace);
        }
      } else walk(v);
    }
  };
  walk(art);
  if (hits !== 1) {
    console.error(`[${slug}] ${hits} Treffer (erwartet 1): "${find.slice(0, 60)}"`);
    fails++;
  } else {
    console.log(`ok  [${slug}] ${find.slice(0, 62).replace(/\n/g, " ")}…`);
  }
}

/* ── Speyer: volle Lage-Spanne 2.500–7.000 €/m² ── */
repl(
  "speyer",
  "- **Eigentumswohnungen:** rund 3.300–4.800 €/m², je nach Lage und Zustand\n- **Häuser (Bestand):** rund 3.500–5.500 €/m² Wohnfläche, in gefragten Lagen darüber\n- **Neubau und sanierte Objekte:** tendenziell am oberen Rand der Spanne",
  "- **Eigentumswohnungen:** rund 2.500 bis 7.000 €/m², je nach Lage und Zustand\n- **Häuser (Bestand):** rund 2.500 bis 7.000 €/m² Wohnfläche\n- **Spitzenwerte:** Lagen direkt am Rhein sowie sanierte Objekte in der Altstadt\n- **Unteres Ende:** einfache Lagen und Objekte mit Sanierungsbedarf\n\nDiese Spanne ist bewusst weit: In Speyer entscheiden Lage und Zustand stärker über den Quadratmeterpreis als die Stadt selbst. Zwischen einem unsanierten Objekt in einfacher Lage und einer sanierten Wohnung am Rhein liegt fast das Dreifache.",
);
repl(
  "speyer",
  "- **Altstadt / Domgarten:** historische, sehr gefragte Lage – Preise eher am oberen Ende",
  "- **Lagen am Rhein:** die gefragtesten Adressen der Stadt – hier entstehen die Spitzenpreise\n- **Altstadt / Domgarten:** historische, sehr gefragte Lage – Preise eher am oberen Ende",
);

/* ── Ludwigshafen: Staffel bleibt, Enden geweitet (Parkinsel oben) ── */
repl(
  "ludwigshafen",
  "- Einfache bis mittlere Lagen (Teile von Mundenheim, Mitte, Oppau): ca. 1.700 – 2.500 €/m²\n- Gute Lagen (Oggersheim, Gartenstadt, gepflegter Bestand): ca. 2.400 – 3.300 €/m²\n- Neuwertige Wohnungen / Top-Lagen: bis ca. 3.800 €/m²",
  "- Einfache bis mittlere Lagen (Teile von Mundenheim, Mitte, Oppau): ca. 1.900 – 2.600 €/m²\n- Gute Lagen (Oggersheim, Gartenstadt, gepflegter Bestand): ca. 2.600 – 3.600 €/m²\n- Neuwertige Wohnungen und Spitzenlagen (z. B. Parkinsel): bis ca. 4.600 €/m²",
);
repl(
  "ludwigshafen",
  "**Häuser (Ein- und Zweifamilienhäuser):** je nach Lage, Baujahr und Zustand überwiegend ca. 2.300 – 3.600 €/m² Wohnfläche; gepflegte Objekte in gefragten Vororten wie Oggersheim oder Ruchheim erzielen die oberen Werte.",
  "**Häuser (Ein- und Zweifamilienhäuser):** je nach Lage, Baujahr und Zustand ca. 1.900 – 4.600 €/m² Wohnfläche; gepflegte Objekte in gefragten Vororten wie Oggersheim oder Ruchheim sowie Spitzenlagen erzielen die oberen Werte, unsanierte Objekte in einfachen Lagen das untere Ende. Auch in Ludwigshafen entscheiden Lage und Zustand deutlich stärker als der Stadtdurchschnitt.",
);

/* ── Überregionale Artikel, die Speyer/LU als Referenz nennen ── */
repl(
  "immobilie-verkaufen-ablauf",
  "für Wohnungen in Speyer bei ca. 3.000 bis 3.900 €/m², für Häuser bei ca. 3.400 bis 4.300 €/m². In Ludwigshafen liegen Wohnungen bei ca. 2.500 bis 3.200 €/m², Häuser bei ca. 2.900 bis 3.700 €/m².",
  "in Speyer je nach Lage und Zustand bei ca. 2.500 bis 7.000 €/m² (Spitzenwerte in Lagen am Rhein), in Ludwigshafen bei ca. 1.900 bis 4.600 €/m².",
);
repl(
  "immobilie-verkaufen-ablauf",
  "in Speyer aktuell ca. 3.000 bis 4.300 €/m², in Ludwigshafen ca. 2.500 bis 3.700 €/m², Stand 2026)",
  "in Speyer ca. 2.500 bis 7.000 €/m², in Ludwigshafen ca. 1.900 bis 4.600 €/m², je nach Lage und Zustand, Stand 2026)",
);
repl(
  "geerbte-immobilie-verkaufen",
  "Wohnungen in Speyer ca. **3.000 bis 3.900 €/m²**, Häuser ca. **3.400 bis 4.300 €/m²**; in Ludwigshafen Wohnungen ca. **2.500 bis 3.200 €/m²**, Häuser ca. **2.900 bis 3.700 €/m²**.",
  "in Speyer ca. **2.500 bis 7.000 €/m²** je nach Lage und Zustand (Spitzenwerte in Lagen am Rhein), in Ludwigshafen ca. **1.900 bis 4.600 €/m²**.",
);
repl(
  "immobilie-bei-scheidung",
  "in Speyer bei ca. 3.400 bis 4.300 €/m², in Ludwigshafen bei ca. 2.900 bis 3.700 €/m².",
  "in Speyer bei ca. 2.500 bis 7.000 €/m² und in Ludwigshafen bei ca. 1.900 bis 4.600 €/m² – je nach Lage und Zustand.",
);
repl(
  "immobilie-bei-scheidung",
  "in Speyer aktuell ca. 3.400 bis 4.300 €/m² für Häuser, in Ludwigshafen ca. 2.900 bis 3.700 €/m², Stand 2026)",
  "in Speyer ca. 2.500 bis 7.000 €/m², in Ludwigshafen ca. 1.900 bis 4.600 €/m², je nach Lage und Zustand, Stand 2026)",
);

if (fails > 0) {
  console.error(`\n${fails} Fehler – Datei NICHT geschrieben.`);
  process.exit(1);
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n");
console.log("\nAlle Spannen geweitet, JSON geschrieben.");

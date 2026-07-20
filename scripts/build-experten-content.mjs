// Konvertiert die 30 Workflow-Content-Pakete (Scratchpad-JSONs) in die exakte
// ExpertenSeite-Shape → src/content/experten-seiten.json. Deterministisch,
// regelbasiert; einmalig gelaufen am 20.07.2026, für Regeneration aufbewahrt.
// Nutzung: node scripts/build-experten-content.mjs <quell-ordner>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
if (!SRC) { console.error("Quell-Ordner fehlt"); process.exit(2); }
const CDN = "https://riegel.b-cdn.net";

/** slug → Cluster (Quelle: Orchestrierungs-Briefs). */
export const CLUSTER = {
  investmentimmobilien: "kapitalanlage", kapitalanlageobjekte: "kapitalanlage", renditeobjekte: "kapitalanlage",
  immobilienportfolios: "kapitalanlage", "off-market-immobilien": "kapitalanlage",
  zinshaeuser: "wohnen", wohnanlagen: "wohnen", wohnportfolios: "wohnen",
  gewerbeportfolios: "buero-handel", buerogebaeude: "buero-handel", "buero-und-verwaltungsgebaeude": "buero-handel",
  einzelhandelsimmobilien: "buero-handel", fachmarktzentren: "buero-handel", einkaufszentren: "buero-handel",
  logistikimmobilien: "industrie", lagerhallen: "industrie", industrieimmobilien: "industrie", produktionsimmobilien: "industrie",
  hotelimmobilien: "betreiber", boardinghaeuser: "betreiber", pflegeimmobilien: "betreiber", aerztehaeuser: "betreiber",
  gesundheitsimmobilien: "betreiber", seniorenresidenzen: "betreiber", studentenwohnanlagen: "betreiber",
  bautraegergrundstuecke: "grundstuecke", wohnbaugrundstuecke: "grundstuecke", gewerbegrundstuecke: "grundstuecke",
  projektentwicklungen: "grundstuecke", neubauprojekte: "grundstuecke",
};
const CLUSTER_ICON = { wohnen: "building", kapitalanlage: "trend", "buero-handel": "chart", industrie: "bolt", betreiber: "key", grundstuecke: "pin" };
const REFERENZ_HEADING = {
  wohnen: "Aktuelle Mandate aus dem Wohnsegment", kapitalanlage: "Aktuelle Anlage-Mandate",
  "buero-handel": "Aktuelle Gewerbe-Mandate", industrie: "Aktuelle Gewerbe-Mandate",
  betreiber: "Aktuelle Mandate", grundstuecke: "Aktuelle Mandate",
};

/** Claim-Akzentwort je Seite (redaktionell festgelegt). */
const AKZENT = {
  investmentimmobilien: "Bauchgefühl", kapitalanlageobjekte: "wohnt", zinshaeuser: "vor der Bank",
  renditeobjekte: "Netto entscheidet.", wohnanlagen: "Kapitalanlage", wohnportfolios: "Eine Entscheidung.",
  gewerbeportfolios: "Bündeln", buerogebaeude: "Laufzeit zahlt.", "buero-und-verwaltungsgebaeude": "bis einer geht",
  einzelhandelsimmobilien: "Drinnen Bonität.", fachmarktzentren: "das Zentrum steht", einkaufszentren: "Mix bewegt.",
  logistikimmobilien: "Laderampe", lagerhallen: "Standbein", industrieimmobilien: "Wert bleibt stehen",
  produktionsimmobilien: "nicht verraten", hotelimmobilien: "Der Pachtvertrag macht den Wert.",
  boardinghaeuser: "Geschäft", pflegeimmobilien: "länger als Trends", aerztehaeuser: "Rezept",
  gesundheitsimmobilien: "Ein Konzept.", seniorenresidenzen: "kein Stillstand", studentenwohnanlagen: "Die Nachfrage nie.",
  bautraegergrundstuecke: "Bebauungsplan", wohnbaugrundstuecke: "viele Gründe", gewerbegrundstuecke: "halb verkauft",
  projektentwicklungen: "Dann Beton.", neubauprojekte: "in Scheiben", immobilienportfolios: "kein Sammelsurium",
  "off-market-immobilien": "bevor es öffentlich wird",
};

/** Soft-Hyphen-Wörterbuch für die akira-h1 (lange Komposita). */
const SHY = {
  Investmentimmobilien: "Investment­immobilien", Kapitalanlageobjekte: "Kapital­anlage­objekte",
  Renditeobjekte: "Rendite­objekte", Wohnanlagen: "Wohn­anlagen", Wohnportfolios: "Wohn­portfolios",
  Gewerbeportfolios: "Gewerbe­portfolios", Bürogebäude: "Büro­gebäude",
  Verwaltungsgebäude: "Verwaltungs­gebäude", Einzelhandelsimmobilien: "Einzelhandels­immobilien",
  Fachmarktzentren: "Fachmarkt­zentren", Einkaufszentren: "Einkaufs­zentren",
  Logistikimmobilien: "Logistik­immobilien", Lagerhallen: "Lager­hallen",
  Industrieimmobilien: "Industrie­immobilien", Produktionsimmobilien: "Produktions­immobilien",
  Hotelimmobilien: "Hotel­immobilien", Boardinghäuser: "Boarding­häuser",
  Pflegeimmobilien: "Pflege­immobilien", Ärztehäuser: "Ärzte­häuser",
  Gesundheitsimmobilien: "Gesundheits­immobilien", Seniorenresidenzen: "Senioren­residenzen",
  Studentenwohnanlagen: "Studenten­wohn­anlagen", Bauträgergrundstücke: "Bauträger­grundstücke",
  Wohnbaugrundstücke: "Wohnbau­grundstücke", Gewerbegrundstücke: "Gewerbe­grundstücke",
  Projektentwicklungen: "Projekt­entwicklungen", Neubauprojekte: "Neubau­projekte",
  Immobilienportfolios: "Immobilien­portfolios", Zinshäuser: "Zins­häuser",
};
const shy = (s) => s.split(/(\s+|-)/).map((w) => SHY[w] ?? w).join("");

const FOTO_ALT = {
  "Riegel-Haus-lightrays.webp": "Modernes Wohnhaus bei Nacht mit Lichtakzenten",
  "Mann-mit-iPad-in-Kueche-blaues-Licht-Haus-abgedunkelte-version.webp": "Eigentümer prüft Objektunterlagen am Tablet",
  "Model-Frau-In-Wohnung.webp": "Beratung in einer hochwertigen Wohnung",
  "Model-Mann-in-Wohnung.webp": "Eigentümer in einer modernen Wohnung",
  "Paar-vor-Haus-schaut-auf-Smartphone.webp": "Eigentümerpaar prüft den Vermarktungsstand",
  "Dokumente_RIEGEL.webp": "Aufbereitete Objektunterlagen und Grundrisse",
  "RIEGEL_Broschuere_Portrait_01.webp": "Persönliche Verkaufsberatung bei RIEGEL Immobilien",
};
const FOTO_POOL = Object.keys(FOTO_ALT);
const foto = (file) => ({ src: `${CDN}/${file}`, alt: FOTO_ALT[file] ?? "RIEGEL Immobilien" });
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** Fließtext in 2-3 Absätze teilen (an Satzgrenzen nahe der Drittel). */
function absaetze(body) {
  const parts = body.split(/\n\n+/).filter(Boolean);
  if (parts.length >= 2) return parts;
  const saetze = body.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [body];
  if (saetze.length < 4) return [body];
  const ziel = saetze.length >= 8 ? 3 : 2;
  const proAbsatz = Math.ceil(saetze.length / ziel);
  const out = [];
  for (let i = 0; i < saetze.length; i += proAbsatz) out.push(saetze.slice(i, i + proAbsatz).join("").trim());
  return out;
}

const EYEBROWS = ["Werttreiber", "Verkaufsprozess", "Im Detail"];

const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
const seiten = files.map((f) => {
  const p = JSON.parse(readFileSync(join(SRC, f), "utf8"));
  const cluster = CLUSTER[p.slug];
  if (!cluster) throw new Error(`Kein Cluster für ${p.slug}`);
  const pool = FOTO_POOL.filter((x) => x !== p.heroImage);
  const h = Math.abs(hash(p.slug));
  return {
    slug: p.slug,
    cluster,
    label: p.name,
    teaser: p.intro.split(/(?<=[.!?])\s/)[0].slice(0, 140),
    h1: `Die Experten für ${p.name}`,
    h1Display: `Die Experten für ${shy(p.name)}`,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    icon: CLUSTER_ICON[cluster],
    claim: p.claim,
    ...(p.claim.includes(AKZENT[p.slug] ?? "") && AKZENT[p.slug] ? { claimAkzent: AKZENT[p.slug] } : {}),
    subline: p.subline,
    heroFoto: foto(p.heroImage),
    intro: p.intro,
    usps: p.usps,
    vertiefung: p.sections.map((s, i) => ({
      eyebrow: EYEBROWS[i] ?? "Im Detail",
      titel: s.h2,
      absaetze: absaetze(s.body),
      foto: foto(pool[(h + i) % pool.length]),
    })),
    referenzHeading: REFERENZ_HEADING[cluster],
    spotlightKeywords: p.spotlightKeywords,
    chips: p.chips,
    faq: p.faq,
    suchen: p.suchenText,
    keywords: p.keywords,
  };
});

seiten.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync("src/content/experten-seiten.json", JSON.stringify(seiten, null, 1));
console.log(`${seiten.length} Seiten → src/content/experten-seiten.json`);
for (const s of seiten) console.log(` ${s.cluster.padEnd(13)} ${s.slug.padEnd(30)} ${s.claim}`);

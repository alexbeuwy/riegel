import { site } from "@/lib/site";
import { standorte, ratgeber } from "@/lib/geo";

// llms.txt — maschinenlesbarer Überblick für KI-Assistenten/GEO.
export const dynamic = "force-static";

export function GET() {
  const b = site.url;
  const lines: string[] = [
    `# ${site.legalName}`,
    "",
    `> Inhabergeführter Immobilienmakler (Familienunternehmen) in Speyer und Ludwigshafen, tätig in der Vorderpfalz und im Raum Rhein-Neckar. Verkauf, Bewertung und Beratung. ImmoScout24 ImmoAward 2025: Top 21 national, Top 3 Raum Frankfurt.`,
    "",
    "## Kernseiten",
    `- [Immobilienangebote](${b}/immobilien): Portal mit Karte, Filtern und Detailseiten`,
    `- [Immobilienbewertung](${b}/rechner): kostenlose Online-Bewertung in 60 Sekunden`,
    `- [Verkaufen](${b}/verkaufen): Ablauf des Immobilienverkaufs mit Riegel`,
    `- [Über uns](${b}/ueber-uns): Familie Riegel und Team`,
    `- [Kontakt](${b}/kontakt) · [Termin](${b}/termin)`,
    "",
    "## Standorte / Regionen",
    ...standorte().map((a) => `- [${a.ort}](${b}/standorte/${a.slug}): ${a.metaDescription}`),
    "",
    "## Ratgeber",
    ...ratgeber().map((a) => `- [${a.h1}](${b}/ratgeber/${a.slug}): ${a.metaDescription}`),
    "",
    "## Kontakt",
    `Telefon: ${site.phone} · E-Mail: ${site.email}`,
    ...site.locations.map((l) => `${l.city}: ${l.street}, ${l.zip} ${l.city}`),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

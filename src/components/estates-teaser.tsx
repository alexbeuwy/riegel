/**
 * Server-Komponente: zeigt echte OnOffice-Objekte als Teaser auf GEO-Seiten
 * (Standort-/Ratgeber-Artikel) — Kundenwunsch „echte Objekte bei den
 * Artikeln embedden oder verlinken". Lädt Live-Daten selbst (getEstateData(),
 * server-only/gecacht) und rendert NICHTS, wenn kein passendes Objekt
 * existiert — keine leere Sektion mit Überschrift ohne Inhalt.
 */
import Link from "next/link";
import { getEstateData } from "@/lib/estates";
import { PropertyCard } from "@/components/property-card";
import { Icon } from "@/components/icon";

export interface EstatesTeaserProps {
  /** Ort-Filter (aus GeoArticle.ort). Ohne Angabe: alle aktiven Objekte. */
  ort?: string;
  heading?: string;
  limit?: number;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Klammerzusatz entfernen: "Heppenheim (Bergstraße)" → "Heppenheim". */
const baseName = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();

/**
 * Robuster Ort↔City-Vergleich: GEO-Artikel und OnOffice-City-Feld folgen
 * keiner gemeinsamen Schreibweise ("Ludwigshafen am Rhein" vs. "Ludwigshafen",
 * "Frankenthal (Pfalz)" vs. "Frankenthal", "Römerberg" vs. "Römerberg
 * Heiligenstein"). Verglichen wird Voll- UND Basisname (ohne Klammerzusatz)
 * je Seite, zusätzlich Präfix-Treffer in BEIDE Richtungen (Leerzeichen/
 * Bindestrich als Trenner), damit weder ein zu langer Ort- noch ein zu
 * langer City-String den Treffer verhindert.
 */
function ortMatchesCity(ort: string, city: string): boolean {
  const variants = (s: string) => {
    const full = norm(s);
    const base = norm(baseName(s));
    return base && base !== full ? [full, base] : [full];
  };
  for (const o of variants(ort)) {
    for (const c of variants(city)) {
      if (o === c) return true;
      if (c.startsWith(`${o} `) || c.startsWith(`${o}-`)) return true;
      if (o.startsWith(`${c} `) || o.startsWith(`${c}-`)) return true;
    }
  }
  return false;
}

export async function EstatesTeaser({ ort, heading, limit = 3 }: EstatesTeaserProps) {
  const { estates } = await getEstateData();

  let matches = estates.filter((e) => e.status === "aktiv");
  if (ort) matches = matches.filter((e) => ortMatchesCity(ort, e.city));
  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  const shown = sorted.slice(0, limit);

  // Portal-Filter (/immobilien?ort=) vergleicht exakt (case-insensitive) gegen
  // e.city — der rohe article.ort-String ("Ludwigshafen am Rhein") würde dort
  // ins Leere laufen. Wir verlinken deshalb mit der TATSÄCHLICHEN city des
  // ersten Treffers, die garantiert exakt matcht.
  const portalHref = ort ? `/immobilien?ort=${encodeURIComponent(shown[0].city)}` : "/immobilien";
  const title = heading ?? (ort ? `Aktuelle Angebote in ${ort}` : "Aktuelle Angebote");

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
        <span className="text-accent">
          <Icon name="home" size={20} />
        </span>
        {title}
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {shown.map((estate) => (
          <PropertyCard key={estate.id} estate={estate} />
        ))}
      </div>
      <Link
        href={portalHref}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
      >
        Alle Objekte ansehen
        <Icon name="arrowRight" size={14} />
      </Link>
    </section>
  );
}

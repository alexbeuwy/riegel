import Image from "next/image";
import { Container } from "@/components/container";

/**
 * Echte Auszeichnungs-/Mitgliedschafts-Siegel — Original-Grafiken von der
 * Live-Seite (riegel-immobilien.de), nicht nachgebaut. Einige tragen ein
 * Enddatum (z. B. "2013–2021") und sind damit älter; wir zeigen sie unverändert
 * so, wie RIEGEL sie selbst seit Jahren öffentlich führt — kein aggregateRating,
 * keine erfundene Aktualität, nur die Grafik + ihr eigener Aufdruck.
 */
interface Award {
  key: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Für Remote-Grafiken (BunnyCDN) — SVG/PNG ohne next/image-Optimierung
   *  direkt ausliefern (umgeht SVG-Sperre + Sonderzeichen im Dateinamen). */
  unoptimized?: boolean;
}

const AWARDS: Award[] = [
  // Neu (2026) + Regionslogo, von BunnyCDN (riegel.b-cdn.net):
  { key: "gold-2026", src: "https://riegel.b-cdn.net/2026_Gold_Badge_transparent_container@3x.png", alt: "Gold-Auszeichnung 2026", width: 120, height: 120, unoptimized: true },
  { key: "mrn", src: "https://riegel.b-cdn.net/Logo_MRN.svg", alt: "Metropolregion Rhein-Neckar", width: 140, height: 105, unoptimized: true },
  { key: "bvfi", src: "/images/badges/bvfi-siegel.svg", alt: "Mitglied im BVFI — Bundesverband für die Immobilienwirtschaft", width: 130, height: 130 },
  { key: "immoscout-experte", src: "/images/badges/immoscout-experte-seit-2009.svg", alt: "ImmoScout24 Experte — seit 2009", width: 110, height: 110 },
  { key: "ida", src: "/images/badges/ida-siegel-2022.png", alt: "Immobiliendienstleister Award (IDA) 2022", width: 110, height: 110 },
  { key: "immoscout-verkaufsprofi", src: "/images/badges/immoscout-verkaufsprofi-2021.png", alt: "ImmoScout24 Verkaufsprofi 2021", width: 96, height: 105 },
  { key: "bellevue", src: "/images/badges/bellevue-best-property-agents-2022.png", alt: "Bellevue Best Property Agents 2022", width: 70, height: 132 },
  { key: "immoscout-premium", src: "/images/badges/immoscout-premium-partner-2013-2021.svg", alt: "ImmoScout24 Premium Partner 2013–2021", width: 80, height: 113 },
];

export function AwardsGrid() {
  return (
    <section className="py-14 sm:py-16">
      <Container>
        <div className="rounded-3xl border border-border bg-surface px-6 py-10 sm:px-10">
          <p className="text-center text-xs uppercase tracking-[0.25em] text-faint">
            Auszeichnungen &amp; Mitgliedschaften
          </p>
          <div className="mx-auto mt-8 grid grid-cols-3 place-items-center gap-x-6 gap-y-10 sm:grid-cols-6">
            {AWARDS.map((a) => (
              <div
                key={a.key}
                className="press flex h-20 items-center transition-transform duration-300 hover:scale-105"
              >
                <Image
                  src={a.src}
                  alt={a.alt}
                  width={a.width}
                  height={a.height}
                  unoptimized={a.unoptimized}
                  className="h-full w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

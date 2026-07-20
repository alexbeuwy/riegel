import Image from "next/image";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { categoryIcon, categoryLabel, formatPrice } from "@/lib/format";
import { Icon } from "@/components/icon";

/**
 * Referenzobjekte für die Experten-Seiten — Server-Komponente, keine Hooks.
 * Schlanke Variante der Portal-Karte (portal-card.tsx): erstes Bild, Titel,
 * Ort, Preis bzw. Status-Badge. Bewusst KEIN 3-gleiche-Karten-Raster:
 * ein großes Objekt (2fr, über zwei Zeilen) + zwei kleinere gestapelt (1fr)
 * auf Desktop; Tablet: großes Objekt volle Breite, zwei kleine nebeneinander;
 * mobil einspaltig.
 *
 * Verlinkung: NUR aktive Objekte verlinken auf /immobilien/[slug].
 * Verkaufte/vermietete Objekte bekommen bewusst KEINEN Link — der Live-Feed
 * enthält nur veröffentlichte Datensätze, und RIEGEL depubliziert verkaufte
 * Objekte (Live-Befund 2026-07-20: 0 realisierte im Feed). Ein Link auf ein
 * depubliziertes Objekt liefe auf 404.
 */

function StatusBadge({ realisiert }: { realisiert: boolean }) {
  return realisiert ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent">
      <Icon name="check" size={13} />
      Erfolgreich vermittelt
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-muted">
      Aktuell im Angebot
    </span>
  );
}

function KartenBild({ estate, gross }: { estate: Estate; gross: boolean }) {
  const bild = estate.images[0];
  return (
    <div
      className={`relative overflow-hidden ${
        gross ? "aspect-[16/10] lg:aspect-auto lg:min-h-72 lg:flex-1" : "aspect-[16/10]"
      }`}
    >
      {bild ? (
        <Image
          src={bild}
          alt={`${estate.title}, ${estate.city}`}
          fill
          sizes={
            gross
              ? "(max-width: 1024px) 100vw, 680px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          }
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
      ) : (
        // Wie portal-card: fotolose Live-Objekte dezent abfangen statt kaputtem Bild.
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface-2">
          <Icon name={categoryIcon(estate.category)} size={26} className="text-faint" />
          <span className="text-xs text-faint">Fotos folgen</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-bg/60 to-transparent" />
    </div>
  );
}

function KartenInhalt({ estate, gross }: { estate: Estate; gross: boolean }) {
  const realisiert = estate.status === "verkauft" || estate.status === "vermietet";
  return (
    <div className={`flex flex-col gap-1.5 ${gross ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {/* Bei realisierten Objekten ersetzt das Akzent-Badge den Preis —
            der alte Angebotspreis ist nach der Vermittlung keine belastbare
            Angabe mehr. */}
        {realisiert ? (
          <StatusBadge realisiert />
        ) : (
          <>
            <span className={`font-semibold tabular-nums text-fg ${gross ? "text-xl" : "text-lg"}`}>
              {formatPrice(estate)}
            </span>
            <StatusBadge realisiert={false} />
          </>
        )}
      </div>
      <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">
        {estate.objectType ?? categoryLabel(estate.category)}
      </div>
      <h3 className={`text-fg ${gross ? "text-base font-medium" : "line-clamp-2 text-sm font-medium"}`}>
        {estate.title}
      </h3>
      <div className="inline-flex items-center gap-1.5 text-sm text-faint">
        <Icon name="pin" size={14} />
        {estate.city}
        {estate.district ? ` · ${estate.district}` : ""}
      </div>
    </div>
  );
}

function ReferenzKarte({ estate, gross }: { estate: Estate; gross: boolean }) {
  const realisiert = estate.status === "verkauft" || estate.status === "vermietet";
  const rahmen = `flex h-full flex-col overflow-hidden rounded-xl border bg-surface ${
    realisiert ? "border-border" : "border-border transition-colors duration-300 hover:border-accent/60"
  }`;
  const spannweite = gross ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : "";

  // Verkaufte/vermietete Objekte bewusst ohne Link (siehe Dateikopf).
  if (realisiert) {
    return (
      <article className={`${rahmen} ${spannweite}`}>
        <KartenBild estate={estate} gross={gross} />
        <KartenInhalt estate={estate} gross={gross} />
      </article>
    );
  }

  return (
    <article className={`${rahmen} ${spannweite}`}>
      <Link href={`/immobilien/${estate.slug}`} className="group flex h-full flex-col">
        <KartenBild estate={estate} gross={gross} />
        <KartenInhalt estate={estate} gross={gross} />
      </Link>
    </article>
  );
}

/**
 * Rendert nichts bei leerem Array (fail-soft — z. B. Mock-Fallback oder
 * Typ ohne passende Live-Objekte). `heading` ist optional; ohne heading
 * erscheint nur das Karten-Grid.
 */
export function ReferenzObjekte({ estates, heading }: { estates: Estate[]; heading?: string }) {
  if (estates.length === 0) return null;
  const [erstes, ...weitere] = estates;

  return (
    <section aria-label={heading ?? "Referenzobjekte"}>
      {heading && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
            <span className="text-accent">
              <Icon name="building" size={20} />
            </span>
            {heading}
          </h2>
          <Link
            href="/immobilien"
            className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
          >
            Alle Objekte ansehen
            <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr] lg:grid-rows-2">
        <ReferenzKarte estate={erstes} gross />
        {weitere.slice(0, 2).map((e) => (
          <ReferenzKarte key={e.id} estate={e} gross={false} />
        ))}
      </div>
    </section>
  );
}

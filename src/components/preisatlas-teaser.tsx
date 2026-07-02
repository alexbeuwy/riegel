import Link from "next/link";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icon";
import { alleMarktorte } from "@/lib/marktdaten";

const nf = new Intl.NumberFormat("de-DE");

/** Anzahl Städte-Chips im Teaser — bewusst eine Auswahl statt aller Orte;
 * alleMarktorte() ist bereits nach oberer Wohnungs-Preisspanne sortiert. */
const CHIP_ANZAHL = 6;

/**
 * Prominenter Preisatlas-Teaser für die Startseite — eigenständiger Block statt
 * einer einzelnen Bento-Kachel. Links Copy + CTA, rechts ein Grid aus
 * Städte-Preis-Chips (immer Spannen, nie Einzelwert) als visueller Blickfang.
 */
export function PreisatlasTeaser() {
  const orte = alleMarktorte();
  const chips = orte.slice(0, CHIP_ANZAHL);
  const staedteAnzahl = orte.length;

  return (
    <section className="border-t border-border py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="space-y-6">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Preisatlas Vorderpfalz
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
              Was kostet der Quadratmeter in Ihrer Stadt?
            </h2>
            <p className="max-w-lg text-pretty text-lg text-muted">
              Preisspannen, Bodenwerte und Trends für {staedteAnzahl} Städte der Region — auf
              einen Blick, direkt vom Makler vor Ort. Ohne Anmeldung, ohne Anfrage.
            </p>
            <div className="flex flex-wrap items-center gap-5 pt-2">
              <Link
                href="/preisatlas"
                className="press group inline-flex items-center gap-3 rounded-full bg-accent py-3 pl-6 pr-3 text-sm font-medium text-on-accent transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-hover"
              >
                Zum Preisatlas
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-on-accent/10 transition-transform duration-300 group-hover:translate-x-0.5">
                  <Icon name="trend" size={16} />
                </span>
              </Link>
              <span className="text-xs text-faint">
                {staedteAnzahl} Städte · Bodenwerte · Trends
              </span>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {chips.map((ort, i) => (
              <Reveal key={ort.slug} delay={i * 80}>
                <Link
                  href={`/preisatlas?ort=${ort.slug}`}
                  className="press group flex h-full flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/50"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg">{ort.name}</span>
                    <span className="text-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-accent">
                      <Icon name="arrowUpRight" size={14} />
                    </span>
                  </span>
                  <span className="tabular-nums text-sm text-muted">
                    {nf.format(ort.wohnung.min)}–{nf.format(ort.wohnung.max)} €/m²
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Marktdaten-Block für /kaufen/[slug] — zeigt AUSSCHLIESSLICH die belegte
 * Abschluss-Spanne des Standorts (Quelle: SPANNE_BELEGT in
 * src/lib/marktdaten.ts:153-169, durchgereicht über belegtMarkt() aus
 * src/lib/kaufseiten.ts, Datei-Scope dieses Schritts erlaubt keine Änderung
 * an beiden). Bewusst KEIN Rückgriff auf marktort()/spanne(): Bodenrichtwert,
 * Trend, Trendkurve, Nachfrage-Score und Vermarktungszeit sind
 * Hash-Ableitungen aus dem Slug (marktdaten.ts:183-229), keine Messung — sie
 * dürfen neben echten Live-Objekten nicht als belegte Zahl auftauchen.
 * belegtMarkt() liefert strukturell nur Spanne + n + Stand, kein
 * Modellfeld kann hier also versehentlich durchrutschen.
 */
import { belegtMarkt, type KaufKombi } from "@/lib/kaufseiten";
import { PREIS_DISCLAIMER } from "@/lib/marktdaten";
import { Icon } from "@/components/icon";

const nf = new Intl.NumberFormat("de-DE");

/**
 * Speyer-Median — der einzige dokumentierte Median im gesamten src-Baum.
 * Quelle: Kommentar in src/lib/marktdaten.ts:143-147 (eigene Auswertung mit
 * scripts/preisanalyse-onoffice.mts, dieselben 39 Speyer-Abschlüsse wie
 * SPANNE_BELEGT.speyer/SPANNE_BELEGT_N.speyer): "2.232 € min, 3.561 €
 * Median, Spitze darüber". marktdaten.ts exportiert diesen Wert nicht
 * (Datei-Scope erlaubt hier keine Änderung an dieser Datei) — deshalb als
 * eigene, klar belegte Konstante geführt. Gilt NUR für Speyer, für keinen
 * anderen Ort liegt ein Median vor (kein Analogieschluss auf andere Orte).
 */
const SPEYER_MEDIAN_EUR_QM = 3561;

/** Nur diese Kategorie-Labels für die Spannen-Überschrift — Kaufkombis sind
 *  laut kaufseiten.ts strikt auf haus/wohnung begrenzt. */
const KATEGORIE_LABEL: Record<KaufKombi["kategorie"], string> = {
  haus: "Häuser",
  wohnung: "Wohnungen",
};

export function KaufseiteMarkt({ kombi }: { kombi: KaufKombi }) {
  const markt = belegtMarkt(kombi.standortSlug);
  // Fail-soft: ohne belegte Spanne keine Sektion — betrifft in der Praxis
  // keine der KAUF_KOMBIS-Zeilen (alle vier haben einen SPANNE_BELEGT-
  // Eintrag), bleibt aber als Sicherheitsnetz gegen künftige Erweiterungen.
  if (!markt) return null;

  const spanne = markt[kombi.kategorie];

  return (
    <section className="mt-16 sm:mt-20">
      <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
        <span className="text-accent">
          <Icon name="euro" size={20} />
        </span>
        Marktpreise für {KATEGORIE_LABEL[kombi.kategorie]} in {kombi.ort}
      </h2>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-faint">
          <span>Abschluss-Spanne, €/m²</span>
          <span>Stand {markt.stand}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-semibold text-fg tabular-nums">
          <span>{nf.format(spanne.min)}</span>
          <span className="text-base font-normal text-faint">–</span>
          <span>{nf.format(spanne.max)} €/m²</span>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Auf Basis von {markt.n} ausgewerteten Abschlüssen aus dem eigenen Bestand.
        </p>

        {/* Nur für Speyer belegt (s. Kommentar oben) — für alle anderen
            Standorte dieser Seite existiert kein Median, daher hier
            KEIN Analogiewert für Ludwigshafen/Römerberg/Schifferstadt. */}
        {kombi.standortSlug === "speyer" && (
          <p className="mt-3 text-sm text-fg/90">
            Median der {markt.n} ausgewerteten Speyerer Abschlüsse:{" "}
            <strong className="font-semibold text-fg">
              {nf.format(SPEYER_MEDIAN_EUR_QM)} €/m²
            </strong>
            .
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Ober- und Untergrenze sind äußere Werte inklusive Ausreißer, keine
          typischen Preise: Innerhalb dieser Spanne geben Lage und Zustand
          des Objekts den Ausschlag.
        </p>

        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-faint">
          {PREIS_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}

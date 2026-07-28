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

export function KaufseiteMarkt({ kombi }: { kombi: KaufKombi }) {
  const markt = belegtMarkt(kombi.standortSlug);
  // Fail-soft: ohne belegte Spanne keine Sektion — betrifft in der Praxis
  // keine der fünf KAUF_KOMBIS-Zeilen (alle haben einen SPANNE_BELEGT-
  // Eintrag), bleibt aber als Sicherheitsnetz gegen künftige Erweiterungen.
  if (!markt) return null;

  // Auswahl nach Kategorie ist derzeit rein strukturell: SPANNE_BELEGT führt
  // für haus und wohnung dieselben Werte, weil die Auswertung
  // (scripts/preisanalyse-onoffice.mts) je Ort über ALLE Objektarten rechnet
  // und nur ortsweise Fallzahlen liefert. Deshalb darf hier weder die Spanne
  // noch das n als objektartspezifisch dargestellt werden (siehe Fließtext
  // unten). Wird die Quelle je getrennt ausgewertet, ist dieser Satz
  // mitzuziehen.
  const spanne = markt[kombi.kategorie];

  return (
    <section className="mt-16 sm:mt-20">
      <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-fg">
        <span className="text-accent">
          <Icon name="euro" size={20} />
        </span>
        Marktpreise in {kombi.ort}
      </h2>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-faint">
          <span>Abschluss-Spanne, €/m² Wohnfläche</span>
          <span>Stand {markt.stand}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-semibold text-fg tabular-nums">
          <span>{nf.format(spanne.min)}</span>
          <span className="text-base font-normal text-faint">–</span>
          <span>{nf.format(spanne.max)} €/m²</span>
        </div>
        {/* Wichtig: n und Spanne gelten für den ORT über alle Objektarten
            hinweg, nicht für die Objektart dieser Seite. Die Auswertung
            gruppiert ausschließlich nach Ort (scripts/preisanalyse-onoffice.mts),
            eine getrennte Fallzahl für Häuser oder Wohnungen liegt nicht vor. */}
        <p className="mt-1.5 text-sm text-muted">
          Auf Basis von {markt.n} ausgewerteten Abschlüssen aus dem eigenen Bestand in{" "}
          {kombi.ort}, über alle Objektarten hinweg. Eine getrennte Auswertung für Häuser
          und Wohnungen liegt nicht vor.
        </p>

        {/* Nur für Speyer belegt (s. Kommentar oben) — für alle anderen
            Standorte dieser Seite existiert kein Median, daher hier
            KEIN Analogiewert für Ludwigshafen/Römerberg/Schifferstadt. */}
        {kombi.standortSlug === "speyer" && (
          <p className="mt-3 text-sm text-fg/90">
            Median dieser {markt.n} Abschlüsse:{" "}
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

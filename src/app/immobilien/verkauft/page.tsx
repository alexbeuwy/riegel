import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { getVerkauftesObjektById } from "@/lib/verkauft";
import { categoryLabel, formatArea } from "@/lib/format";
import { STANDORT_GEO } from "@/lib/geo-taxonomy";

// Statusseite für ausgelaufene Objekt-Links: src/proxy.ts liefert sie mit
// Status 410 aus, sobald ein Objekt-Slug auf ein von RIEGEL verkauftes, nicht
// mehr aktives Objekt zeigt (s. src/lib/verkauft.ts). Sie hat keinen eigenen
// Suchwert und soll deshalb selbst nicht im Index landen.
export const metadata = {
  title: "Objekt verkauft",
  robots: { index: false, follow: true },
};

// Kleine Umlaut-Transliteration, wie sie auch slugify() in onoffice.ts
// verwendet (dort nicht exportiert, hier bewusst dupliziert statt die Datei
// außerhalb des Auftrags-Scopes anzufassen) — reine Textnormalisierung, kein
// neuer Ortsbezug.
function slugifyOrt(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ordnet einen Estate-Ort (z. B. "Ludwigshafen", "Neustadt") einem der 33
 * Standort-Slugs aus STANDORT_GEO (geo-taxonomy.ts) zu, rein algorithmisch
 * über die Schreibweise — kein neuer/erfundener Ortsbezug. Manche Standort-
 * Slugs tragen einen Zusatz nach dem Ortsnamen ("neustadt-weinstrasse" für
 * "Neustadt"), ein Präfix-Treffer deckt das ab. `null`, wenn nichts passt.
 */
function standortSlugFuerOrt(ort: string): string | null {
  const normalisiert = slugifyOrt(ort);
  if (!normalisiert) return null;
  const slugs = Object.keys(STANDORT_GEO);
  if (slugs.includes(normalisiert)) return normalisiert;
  return slugs.find((s) => s.startsWith(`${normalisiert}-`)) ?? null;
}

export default async function VerkauftPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const objekt = id ? await getVerkauftesObjektById(id) : null;
  const standortSlug = objekt ? standortSlugFuerOrt(objekt.ort) : null;

  return (
    <article className="pt-24 pb-24">
      <Container className="max-w-2xl">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <Icon name="check" size={20} className="text-faint" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Dieses Objekt ist verkauft</h1>
          <p className="mt-2 text-muted">
            Die Immobilie hinter diesem Link wurde von RIEGEL Immobilien erfolgreich vermittelt
            und ist nicht mehr verfügbar. Adresse, Fotos und Preis zeigen wir aus Rücksicht auf
            die Verkäufer nach dem Abschluss nicht mehr.
          </p>

          {objekt && (
            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 text-left sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-widest text-faint">Objektart</dt>
                <dd className="mt-1 text-sm text-fg">
                  {categoryLabel(objekt.kategorie)}
                  {objekt.objektart ? ` · ${objekt.objektart}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-faint">Fläche</dt>
                <dd className="mt-1 text-sm text-fg">{formatArea(objekt.flaeche) ?? "–"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-faint">Ort</dt>
                <dd className="mt-1 text-sm text-fg">{objekt.ort}</dd>
              </div>
            </dl>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={
                objekt
                  ? `/immobilien?typ=kauf&ort=${encodeURIComponent(objekt.ort)}`
                  : "/immobilien?typ=kauf"
              }
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Icon name="building" size={16} />
              Ähnliche Angebote ansehen
            </Link>
            {standortSlug && (
              <Link
                href={`/standorte/${standortSlug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <Icon name="pin" size={15} />
                Immobilienmarkt in {objekt!.ort} ansehen
              </Link>
            )}
          </div>
        </div>
      </Container>
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { referenzenFuerOrt } from "@/lib/referenzen";
import { formatArea } from "@/lib/format";
import { site } from "@/lib/site";

// KEIN generateStaticParams: der Verkauft-Pool ist eine Live-Abfrage gegen
// OnOffice (getVerkaufteArchiv(), 3600s Revalidierung), keine feste Menge zur
// Build-Zeit. Die Seite läuft dynamisch, notFound() greift, sobald der Ort
// nicht (mehr) in referenzOrte() steht — z. B. unterhalb der Schwelle von 5
// verwertbaren Einträgen.
export async function generateMetadata({ params }: { params: Promise<{ ort: string }> }) {
  const { ort } = await params;
  const daten = await referenzenFuerOrt(ort);
  if (!daten) return { title: "Referenzen" };
  const url = `/referenzen/${daten.slug}`;
  const title = `Verkaufte Referenzobjekte in ${daten.ort}`;
  const description = `${daten.eintraege.length} von RIEGEL Immobilien vermittelte Objekte in ${daten.ort} (Objektart und Fläche), aus Datenschutzgründen ohne Adresse, Fotos oder Preis.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function ReferenzenOrtPage({ params }: { params: Promise<{ ort: string }> }) {
  const { ort } = await params;
  const daten = await referenzenFuerOrt(ort);
  if (!daten) notFound();

  const url = `${site.url}/referenzen/${daten.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Referenzen", item: `${site.url}/referenzen` },
          { "@type": "ListItem", position: 3, name: daten.ort, item: url },
        ],
      },
    ],
  };

  return (
    <article className="py-20 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Container className="max-w-3xl">
        <nav className="text-sm text-faint">
          <Link href="/" className="hover:text-fg">Start</Link>
          {" / "}
          <Link href="/referenzen" className="hover:text-fg">Referenzen</Link>
          {" / "}
          <span className="text-muted">{daten.ort}</span>
        </nav>

        <div className="mt-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
            <Icon name="handshake" size={22} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-fg sm:text-4xl">
            Verkaufte Referenzobjekte in {daten.ort}
          </h1>
          {/* Nur die Zahl der HIER gezeigten Einträge, keine Gesamtaussage: der
              abrufbare Verkauft-Pool ist auf 200 Datensätze gedeckelt und der
              All-Time-Zähler misst etwas anderes (Live-Ticker) — beide dürfen
              hier nicht vermischt werden. Kein Verkaufsdatum: dafür gibt es
              kein belegtes Feld im reduzierten Archiv. */}
          <p className="mt-5 max-w-2xl leading-relaxed text-muted">
            {daten.eintraege.length} von RIEGEL Immobilien vermittelte Objekte aus {daten.ort}.
            Aus Rücksicht auf die früheren Verkäufer zeigen wir nur Objektart und Fläche, keine
            Adresse, keine Fotos und keinen Preis. Die Einwilligung der Verkäufer deckte die
            Vermarktung des jeweiligen Objekts ab, nicht dessen dauerhafte Veröffentlichung danach.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[380px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="px-4 py-3 font-medium">Objektart</th>
                <th className="px-4 py-3 text-right font-medium">Fläche</th>
              </tr>
            </thead>
            <tbody>
              {daten.eintraege.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-muted">{e.objektart}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-fg">
                    {formatArea(e.flaeche) ?? "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href={`/standorte/${daten.slug}`}
            className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="pin" size={17} />
            Immobilienmarkt in {daten.ort}
          </Link>
          <Link
            href="/rechner"
            className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="calculator" size={17} />
            Immobilie bewerten
          </Link>
          <Link
            href="/verkaufen"
            className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="handshake" size={17} />
            Immobilie verkaufen
          </Link>
        </div>
      </Container>
    </article>
  );
}

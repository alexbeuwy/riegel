import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { referenzOrte } from "@/lib/referenzen";
import { site } from "@/lib/site";

export const metadata = {
  title: "Referenzen",
  description:
    "Verkaufte Referenzobjekte von RIEGEL Immobilien nach Ort, aus Datenschutzgründen ohne Adresse, Fotos oder Preis.",
  alternates: { canonical: "/referenzen" },
};

// Hub-Seite für /referenzen/[ort]: BreadcrumbList analog zu /verkaufen und
// /standorte, hier bewusst OHNE ItemList — die Ortsliste ändert sich mit dem
// Verkauft-Pool und ist keine feste, für Suchmaschinen sinnvoll aufzählbare
// Seitenmenge wie bei den 40 Experten-Seiten.
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Referenzen", item: `${site.url}/referenzen` },
        ],
      },
    ],
  };
}

export default async function ReferenzenPage() {
  const orte = await referenzOrte();

  return (
    <article className="py-20 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <Container>
        <nav className="text-sm text-faint">
          <Link href="/" className="hover:text-fg">Start</Link>
          {" / "}
          <span className="text-muted">Referenzen</span>
        </nav>

        <div className="mt-6 max-w-2xl">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
            <Icon name="handshake" size={22} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-fg sm:text-4xl">Referenzen</h1>
          <p className="mt-5 leading-relaxed text-muted">
            Objekte, die RIEGEL Immobilien in der Metropolregion Rhein-Neckar erfolgreich
            vermittelt hat, gruppiert nach Ort. Aus Datenschutzgründen zeigen wir dabei nur
            Objektart und Fläche, keine Adresse, keine Fotos und keinen Preis: Die Einwilligung
            der früheren Verkäufer deckt die Vermarktung ihres Objekts ab, nicht dessen
            dauerhafte Veröffentlichung danach.
          </p>
        </div>

        {orte.length === 0 ? (
          <p className="mt-10 text-muted">
            Für keinen Ort liegt aktuell eine ausreichende Zahl verwertbarer Referenzen vor.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orte.map((o) => (
              <Link
                key={o.slug}
                href={`/referenzen/${o.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:border-accent/50"
              >
                <div className="min-w-0">
                  <div className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">Referenzen</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-fg">{o.ort}</div>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-muted">{o.eintraege.length}</span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="text-accent transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </article>
  );
}

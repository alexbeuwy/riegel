import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { mockEstates } from "@/lib/mock-estates";

export function generateStaticParams() {
  return mockEstates.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const estate = mockEstates.find((e) => e.slug === slug);
  return { title: estate ? estate.title : "Immobilie" };
}

export default async function EstateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const estate = mockEstates.find((e) => e.slug === slug);
  if (!estate) notFound();

  const facts = [
    { label: "Zimmer", value: estate.rooms },
    { label: "Wohnfläche", value: `${estate.area} m²` },
    { label: "Objekttyp", value: estate.type },
    { label: "Vermarktung", value: estate.marketingType },
  ];

  return (
    <article className="pb-24 pt-28">
      <Container>
        <Link href="/immobilien" className="text-sm text-muted hover:text-fg">
          ← Zurück zu allen Immobilien
        </Link>

        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
          <Image
            src={estate.image}
            alt={estate.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <div>
              <div className="text-sm text-faint">{estate.location}</div>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                {estate.title}
              </h1>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <dt className="text-xs uppercase tracking-widest text-faint">
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-lg text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted">
              Beispiel-Objekt zur Vorschau des Detail-Layouts. Die vollständige
              Detailseite (Galerie, Lage-Karte, Energieausweis, Maklercourtage,
              ähnliche Objekte) folgt mit der OnOffice-Anbindung.
            </p>
          </div>

          <aside className="h-fit space-y-5 rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm text-faint">Kaufpreis</div>
            <div className="text-3xl font-semibold text-accent">{estate.price}</div>
            <Link
              href="/kontakt"
              className="block rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Besichtigung anfragen
            </Link>
            <p className="text-xs text-faint">
              Unverbindliche Anfrage · Antwort i. d. R. innerhalb eines
              Werktages.
            </p>
          </aside>
        </div>
      </Container>
    </article>
  );
}

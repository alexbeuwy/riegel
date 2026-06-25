import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { RequestViewingButton } from "@/components/request-viewing-button";
import { EstateGallery } from "@/components/portal/estate-gallery";
import { PropertyCard } from "@/components/property-card";
import { mockEstates, type EnergyCertificate, type Estate } from "@/lib/mock-estates";
import { categoryLabel, formatArea, formatPrice, roomsLabel } from "@/lib/format";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return mockEstates.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const estate = mockEstates.find((e) => e.slug === slug);
  if (!estate) return { title: "Immobilie" };
  return {
    title: estate.title,
    description: `${estate.title} in ${estate.city} — ${formatPrice(estate)}. ${estate.description ?? ""}`.slice(0, 160),
  };
}

function energyLine(energy: EnergyCertificate): string {
  if (energy.type === "kein") return "Kein Energieausweis erforderlich.";
  if (energy.type === "wird_nachgereicht") return "Energieausweis wird nachgereicht.";
  const parts: string[] = [
    energy.type === "bedarf" ? "Bedarfsausweis" : "Verbrauchsausweis",
  ];
  if (energy.value != null) parts.push(`${energy.value} kWh/(m²·a)`);
  if (energy.valueHeating != null)
    parts.push(`Wärme ${energy.valueHeating} / Strom ${energy.valueElectricity ?? "–"} kWh/(m²·a)`);
  if (energy.source) parts.push(energy.source);
  if (energy.year) parts.push(`Baujahr ${energy.year}`);
  return parts.join(" · ");
}

function jsonLd(estate: Estate) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: estate.title,
    url: `${site.url}/immobilien/${estate.slug}`,
    datePosted: estate.updatedAt,
    ...(estate.price != null && {
      offers: {
        "@type": "Offer",
        price: estate.price,
        priceCurrency: "EUR",
        availability: estate.status === "aktiv" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      },
    }),
    address: {
      "@type": "PostalAddress",
      addressLocality: estate.city,
      postalCode: estate.postcode,
      addressCountry: "DE",
    },
    ...(estate.livingArea != null && {
      floorSize: { "@type": "QuantitativeValue", value: estate.livingArea, unitCode: "MTK" },
    }),
    ...(estate.rooms != null && { numberOfRooms: estate.rooms }),
  };
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
    roomsLabel(estate.rooms) && { label: "Zimmer", value: roomsLabel(estate.rooms) },
    formatArea(estate.livingArea) && { label: "Wohnfläche", value: formatArea(estate.livingArea) },
    estate.plotArea && { label: "Grundstück", value: `${estate.plotArea} m²` },
    { label: "Objekttyp", value: estate.objectType ?? categoryLabel(estate.category) },
  ].filter(Boolean) as { label: string; value: string }[];

  const similar = mockEstates
    .filter((e) => e.id !== estate.id && (e.category === estate.category || e.city === estate.city))
    .slice(0, 3);

  return (
    <article className="pb-24 pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(estate)) }}
      />
      <Container>
        <nav className="text-sm text-faint">
          <Link href="/immobilien" className="hover:text-fg">
            Immobilien
          </Link>{" "}
          / {estate.city} / <span className="text-muted">{estate.title}</span>
        </nav>

        <div className="mt-5">
          <EstateGallery images={estate.images} title={estate.title} />
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <div>
              <div className="text-sm text-faint">
                {estate.city}
                {estate.district ? ` · ${estate.district}` : ""} · {estate.postcode}
              </div>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{estate.title}</h1>
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-xl border border-border bg-surface p-4">
                  <dt className="text-xs uppercase tracking-widest text-faint">{f.label}</dt>
                  <dd className="mt-1 text-lg text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>

            {estate.description && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Objektbeschreibung</h2>
                <p className="text-muted">{estate.description}</p>
              </section>
            )}

            {estate.features.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Ausstattung</h2>
                <ul className="flex flex-wrap gap-2">
                  {estate.features.map((f) => (
                    <li key={f} className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {estate.locationDescription && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Lage</h2>
                <p className="text-muted">{estate.locationDescription}</p>
              </section>
            )}

            {/* Energieausweis (gesetzlich verpflichtend, §87 GEG) */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Energieausweis</h2>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
                {estate.energy.energyClass && (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent text-lg font-semibold text-accent">
                    {estate.energy.energyClass}
                  </span>
                )}
                <p className="text-sm text-muted">{energyLine(estate.energy)}</p>
              </div>
            </section>

            {/* Provision (gesetzlich verpflichtend) */}
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Provision</h2>
              <p className="text-muted">
                {estate.provision.text ??
                  (estate.provision.free ? "Provisionsfrei." : "Auf Anfrage.")}
              </p>
              {estate.marketingType === "kauf" && !estate.provision.free && (
                <p className="text-xs text-faint">
                  Bei Wohnimmobilien gilt der Halbteilungsgrundsatz (§ 656c BGB).
                </p>
              )}
            </section>

            <p className="text-xs text-faint">
              Beispiel-Objekt zur Vorschau. Live-Objektdaten folgen mit der
              OnOffice-Anbindung.
            </p>
          </div>

          <aside className="h-fit space-y-5 rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24">
            <div>
              <div className="text-sm text-faint">{estate.priceLabel}</div>
              <div className="text-3xl font-semibold text-fg">{formatPrice(estate)}</div>
              {estate.ancillaryCosts != null && (
                <div className="mt-1 text-sm text-muted">
                  zzgl. {estate.ancillaryCosts} € Nebenkosten
                </div>
              )}
            </div>
            <RequestViewingButton title={estate.title} />
            <p className="text-xs text-faint">
              Unverbindliche Anfrage · Antwort i. d. R. innerhalb eines Werktages.
            </p>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-xl font-semibold">Ähnliche Objekte</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {similar.map((e) => (
                <PropertyCard key={e.id} estate={e} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </article>
  );
}

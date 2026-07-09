import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { RequestViewingButton } from "@/components/request-viewing-button";
import { AnsprechpartnerCard } from "@/components/ansprechpartner-card";
import { ExposeCta } from "@/components/expose-cta";
import { EstateGallery } from "@/components/portal/estate-gallery";
import { PropertyCard } from "@/components/property-card";
import { Icon, type IconName } from "@/components/icon";
import { type EnergyCertificate, type Estate } from "@/lib/mock-estates";
import { getEstateBySlug, getEstateData } from "@/lib/estates";
import { FavoriteButton } from "@/components/favorites";
import { ShareButton } from "@/components/share-button";
import { categoryLabel, formatArea, formatPrice, roomsLabel } from "@/lib/format";
import { contactForCity } from "@/lib/contacts";
import { site } from "@/lib/site";

// generateStaticParams entfällt bewusst — die Route ist jetzt dynamisch, da
// Live-Objekte aus OnOffice zur Build-Zeit nicht bekannt sind. getEstateData
// ist über unstable_cache gecacht, daher bleibt der Request-Aufwand gering.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getEstateBySlug(slug);
  if (!found) return { title: "Immobilie" };
  const { estate, source } = found;
  return {
    title: estate.title,
    description: `${estate.title} in ${estate.city} — ${formatPrice(estate)}. ${estate.description ?? ""}`.slice(0, 160),
    alternates: { canonical: `/immobilien/${estate.slug}` },
    // Beispiel-Objekte (Mock) nicht indexieren — sonst landen Fantasie-Inserate
    // im Google-Index. Echte OnOffice-Objekte sollen dagegen in den Index —
    // dort daher kein robots-Override (Standard: index/follow).
    ...(source === "mock" && { robots: { index: false, follow: true } }),
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
  const found = await getEstateBySlug(slug);
  if (!found) notFound();
  const { estate, source } = found;

  const facts = [
    roomsLabel(estate.rooms) && { label: "Zimmer", value: roomsLabel(estate.rooms), icon: "bed" as IconName },
    formatArea(estate.livingArea) && { label: "Wohnfläche", value: formatArea(estate.livingArea), icon: "ruler" as IconName },
    estate.plotArea && { label: "Grundstück", value: `${estate.plotArea} m²`, icon: "tree" as IconName },
    { label: "Objekttyp", value: estate.objectType ?? categoryLabel(estate.category), icon: "building" as IconName },
  ].filter(Boolean) as { label: string; value: string; icon: IconName }[];

  const { estates: allEstates } = await getEstateData();
  // Nur aktive Objekte empfehlen — PropertyCard trägt kein Status-Badge,
  // Reserviertes/Verkauftes würde hier wie ein verfügbares Angebot aussehen.
  const similar = allEstates
    .filter((e) => e.id !== estate.id && e.status === "aktiv" && (e.category === estate.category || e.city === estate.city))
    .slice(0, 3);

  const contact = contactForCity(estate.city);
  const objektId = estate.externalId ?? `RI-${estate.id.toUpperCase().slice(0, 6)}`;
  const onlineSince = new Date(estate.updatedAt).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    // pb-36 <lg: Platz für die fixierte Mobile-CTA-Leiste am unteren Rand.
    <article className="pb-36 pt-24 lg:pb-24">
      {/* "<" escapen: JSON.stringify lässt "</script>" durch — mit Live-Daten
          aus dem CRM (objekttitel etc.) wäre das eine Script-Injection-Fläche. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(estate)).replace(/</g, "\\u003c") }}
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
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-faint">
                    <Icon name={f.icon} size={15} className="text-accent" />
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 text-lg text-fg">{f.value}</dd>
                </div>
              ))}
            </dl>

            {estate.description && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Objektbeschreibung</h2>
                {/* whitespace-pre-line: OnOffice-Texte tragen echte Absätze (\n\n) —
                    ohne das kollabiert alles zu einer 3000-Zeichen-Textwurst. */}
                <p className="whitespace-pre-line text-muted">{estate.description}</p>
              </section>
            )}

            {estate.features.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Ausstattung</h2>
                <ul className="flex flex-wrap gap-2">
                  {estate.features.map((f) => (
                    <li key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted">
                      <Icon name="check" size={14} className="text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(estate.locationDescription || estate.geo) && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Lage</h2>
                {estate.locationDescription && (
                  <p className="whitespace-pre-line text-muted">{estate.locationDescription}</p>
                )}
                {estate.geo && (
                  // Reiner Link statt eingebetteter Karte — kein Consent nötig,
                  // Datenübertragung erst beim bewussten Klick.
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${estate.geo.lat},${estate.geo.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                  >
                    <Icon name="pin" size={15} />
                    Route auf Google Maps öffnen
                  </a>
                )}
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

            {source === "mock" && (
              <p className="text-xs text-faint">
                Beispiel-Objekt zur Vorschau. Live-Objektdaten folgen mit der
                OnOffice-Anbindung.
              </p>
            )}
          </div>

          <aside className="h-fit space-y-5 lg:sticky lg:top-24">
            <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-faint">{estate.priceLabel}</div>
                  <div className="text-3xl font-semibold text-fg">{formatPrice(estate)}</div>
                  {estate.ancillaryCosts != null && (
                    <div className="mt-1 text-sm text-muted">
                      zzgl. {estate.ancillaryCosts} € Nebenkosten
                    </div>
                  )}
                </div>
                {/* Merken + Teilen direkt am Preis — wer über einen geteilten Link
                    landet, soll nicht zurück zur Liste müssen, um das Herz zu finden. */}
                <div className="flex shrink-0 items-center gap-2">
                  <ShareButton title={estate.title} className="border border-border" />
                  <FavoriteButton id={estate.id} className="border border-border" />
                </div>
              </div>
              <RequestViewingButton title={estate.title} objektId={objektId} />
              <p className="text-xs text-faint">
                Unverbindliche Anfrage · Antwort i. d. R. innerhalb eines Werktages.
              </p>
              {/* Objekt-Metadaten wie auf großen Portalen */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-xs">
                <dt className="text-faint">Objekt-ID</dt>
                <dd className="text-right text-muted">{objektId}</dd>
                <dt className="text-faint">Online seit</dt>
                <dd className="text-right text-muted">{onlineSince}</dd>
                <dt className="text-faint">Vermarktung</dt>
                <dd className="text-right text-muted">{estate.marketingType === "kauf" ? "Kauf" : "Miete"}</dd>
              </dl>
            </div>

            {/* Konto-Anreiz: Exposé-PDF (Live-Objekte) — eingeloggt Download,
                ausgeloggt CTA "Konto erstellen & Exposé erhalten". */}
            <ExposeCta slug={estate.slug} live={source === "onoffice"} />

            <AnsprechpartnerCard contact={contact} context={estate.title} />
          </aside>
        </div>

        {/* Mobile-CTA-Leiste: Auf <lg liegt die Preis-/Anfrage-Box erst ~60 %
            der Seite tief — Preis + Anfrage deshalb unten fixiert (Portal-
            Standard à la ImmoScout). Desktop hat die sticky Sidebar. */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">
            <div className="text-[0.65rem] uppercase tracking-wider text-faint">{estate.priceLabel}</div>
            <div className="truncate text-base font-semibold text-fg">{formatPrice(estate)}</div>
          </div>
          <div className="ml-auto w-48 shrink-0">
            <RequestViewingButton title={estate.title} objektId={objektId} />
          </div>
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

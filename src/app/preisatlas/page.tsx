import { PageIntro } from "@/components/page-intro";
import { PreisatlasView } from "@/components/preisatlas/preisatlas-view";
import { alleMarktorte } from "@/lib/marktdaten";
import { site } from "@/lib/site";

// Städtezahl aus den echten Marktdaten statt Freitext-Zahl — driftet sonst
// lautlos, sobald ein Standort ohne STANDORT_GEO-Eintrag herausfällt.
const STAEDTE_ANZAHL = alleMarktorte().length;

export const metadata = {
  title: "Preisatlas Vorderpfalz — Immobilienpreise & Trends",
  description: `Was ist Ihre Immobilie in Speyer, Ludwigshafen oder der Vorderpfalz wert? RIEGEL Preisatlas zeigt Preisspannen, Bodenwerte und Trends für ${STAEDTE_ANZAHL} Städte der Region — kostenlose Bewertung inklusive.`,
  alternates: { canonical: "/preisatlas" },
};

export default async function PreisatlasPage({
  searchParams,
}: {
  searchParams: Promise<{ ort?: string }>;
}) {
  const orte = alleMarktorte();
  // Deep-Link ?ort= serverseitig lesen und als Initialwert durchreichen —
  // sonst zeigt der erste Paint (statisch/SSR) immer den Default-Slug, bevor
  // ein Client-Effect nach der Hydration sichtbar auf die Zielstadt umspringt.
  const { ort } = await searchParams;
  const initialSlug = ort && orte.some((o) => o.slug === ort) ? ort : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: metadata.title,
        description: metadata.description,
        url: `${site.url}/preisatlas`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: orte.map((o, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: o.name,
            url: `${site.url}/preisatlas?ort=${o.slug}`,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Start", item: site.url },
          { "@type": "ListItem", position: 2, name: "Preisatlas", item: `${site.url}/preisatlas` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageIntro
        eyebrow="RIEGEL Preisatlas · Vorderpfalz & Rhein-Neckar"
        title="Was ist der Markt in Ihrer Stadt wert?"
      >
        Marktüberblick vom Makler vor Ort — Ihre Anfrage bleibt bei RIEGEL, nicht bei einer
        Plattform. Preisspannen, Bodenwerte und Trends für {STAEDTE_ANZAHL} Städte der Region.
      </PageIntro>
      <PreisatlasView orte={orte} initialSlug={initialSlug} />
    </>
  );
}

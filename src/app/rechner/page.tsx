import Image from "next/image";
import { Container } from "@/components/container";
import { Calculator } from "@/components/calculator/calculator";
import { Icon, type IconName } from "@/components/icon";
import { photos } from "@/lib/photos";

export const metadata = {
  title: "Immobilienbewertung",
  description:
    "Kostenlose, datenbasierte Sofort-Bewertung Ihrer Immobilie in Speyer, Ludwigshafen und der Vorderpfalz — aus Bodenrichtwerten, Vergleichsobjekten und eigener Transaktionsdatenbank.",
  alternates: { canonical: "/rechner" },
};

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "shield", label: "Amtliche Bodenrichtwerte (BORIS)" },
  { icon: "doc", label: "Auf Wunsch PDF-Report per E-Mail" },
  { icon: "lock", label: "Kostenlos & ohne Anmeldung" },
];

export default function RechnerPage() {
  return (
    <>
      {/*
        Kompakter Hero: das Report-Foto liegt im HINTERGRUND hinter der Headline
        — der Rechner steht direkt darunter, kein Scrollen mehr an einer großen
        Foto-Karte vorbei (bessere Time-to-Interaction).
      */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10">
          <Image
            src={photos.rechnerHero}
            alt="Sofort-Bewertung mit dem RIEGEL Immorechner"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Lesbarkeit: unten in den Seitenhintergrund auslaufen (nahtloser
              Übergang zum Rechner), links stärker abdunkeln für die Textspalte. */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/85 via-bg/35 to-transparent" />
        </div>

        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl">
            <span
              className="reveal-lcp inline-flex items-center gap-2 rounded-full border border-border bg-bg/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted backdrop-blur"
              style={{ animationDelay: "0ms" }}
            >
              <Icon name="calculator" size={13} className="text-accent" />
              Kostenlos &amp; unverbindlich
            </span>
            <h1
              className="reveal-lcp mt-6 text-4xl font-semibold leading-[1.05] sm:text-5xl"
              style={{ animationDelay: "80ms" }}
            >
              Was ist Ihre Immobilie wert?
            </h1>
            <p
              className="reveal-lcp mt-5 max-w-xl text-lg text-muted"
              style={{ animationDelay: "160ms" }}
            >
              In 60 Sekunden zur datenbasierten Einschätzung — zusammengeführt aus
              amtlichen Bodenrichtwerten, Vergleichsobjekten und unserer eigenen
              Transaktionsdatenbank.
            </p>
            <ul
              className="reveal-lcp mt-7 flex flex-wrap gap-x-5 gap-y-2.5"
              style={{ animationDelay: "240ms" }}
            >
              {TRUST.map((t) => (
                <li key={t.label} className="flex items-center gap-2 text-sm text-fg/90">
                  <Icon name={t.icon} size={15} className="shrink-0 text-accent" />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Rechner direkt im Anschluss — knappes Top-Padding, damit Schritt 1
          nahezu ohne Scrollen sichtbar ist. */}
      <section className="pb-16 pt-10 sm:pb-24 sm:pt-12">
        <Container>
          <Calculator />
        </Container>
      </section>
    </>
  );
}

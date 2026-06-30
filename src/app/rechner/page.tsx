import Image from "next/image";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Calculator } from "@/components/calculator/calculator";
import { Icon } from "@/components/icon";
import { photos } from "@/lib/photos";

export const metadata = {
  title: "Immobilienbewertung",
  description:
    "Kostenlose, datenbasierte Sofort-Bewertung Ihrer Immobilie in Speyer, Ludwigshafen und der Vorderpfalz — aus Bodenrichtwerten, Vergleichsobjekten und eigener Transaktionsdatenbank.",
};

export default function RechnerPage() {
  return (
    <>
      <PageIntro eyebrow="Kostenlos & unverbindlich" title="Was ist Ihre Immobilie wert?">
        In 60 Sekunden zur datenbasierten Einschätzung — zusammengeführt aus
        amtlichen Bodenrichtwerten, Vergleichsobjekten und unserer eigenen
        Transaktionsdatenbank.
      </PageIntro>

      {/* Hero-Bild — RIEGEL Wert-Report */}
      <section className="pt-2">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-border">
            <Image
              src={photos.rechnerHero}
              alt="Sofort-Bewertung mit dem RIEGEL Immorechner"
              width={1600}
              height={900}
              priority
              sizes="(max-width: 1024px) 100vw, 1100px"
              className="h-[clamp(260px,40vw,520px)] w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex max-w-xl flex-col gap-2.5 p-7 sm:p-10">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-bg/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.22em] text-muted backdrop-blur">
                <Icon name="doc" size={13} className="text-accent" />
                Persönlicher Marktwert-Report
              </span>
              <p className="max-w-md text-sm text-fg/90">
                Sofort-Bewertung online, auf Wunsch mit ausführlichem{" "}
                <strong className="text-fg">PDF-Report</strong> per E-Mail.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <Calculator />
        </Container>
      </section>
    </>
  );
}

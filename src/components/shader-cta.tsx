import Link from "next/link";
import { Container } from "@/components/container";
import { WaveShader } from "@/components/wave-shader";
import { Icon } from "@/components/icon";

/** CTA-Box mit „wavy blue"-Shader-Hintergrund in RIEGEL-Farben. */
export function ShaderCta() {
  return (
    <section className="py-8 sm:py-12">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-accent/30">
          <WaveShader />
          {/* Lesbarkeits-Overlay: links abdunkeln, Waves rechts sichtbar lassen */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/60 to-bg/15" />
          <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-20">
            <span className="inline-block rounded-full border border-on-accent/25 bg-bg/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-fg backdrop-blur">
              Sofort-Bewertung
            </span>
            <h2 className="akira mt-6 max-w-xl text-3xl leading-[0.95] sm:text-5xl">
              Was ist Ihre Immobilie heute wert?
            </h2>
            <p className="mt-5 max-w-md text-lg text-fg/90">
              Datenbasierte Einschätzung in 60 Sekunden — kostenlos, ohne
              Anmeldung, inklusive Satellitenansicht Ihrer Lage.
            </p>
            <Link
              href="/rechner"
              className="press group mt-8 inline-flex items-center gap-2.5 rounded-full bg-fg px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-on-accent"
            >
              <Icon name="calculator" size={18} />
              Jetzt kostenlos bewerten
              <Icon
                name="arrowRight"
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

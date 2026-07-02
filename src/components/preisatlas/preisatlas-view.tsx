"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon } from "@/components/icon";
import { MapConsentGate } from "@/components/consent";
import { WaveShader } from "@/components/wave-shader";
import { HeroAddressSearch } from "@/components/hero-address-search";
import { OrtsChips, OrtsSuche } from "@/components/preisatlas/orts-chips";
import { MarktPanel } from "@/components/preisatlas/markt-panel";
import { MarktVergleich } from "@/components/preisatlas/markt-vergleich";
import { MARKT_STAND, PREIS_DISCLAIMER, type MarktOrt } from "@/lib/marktdaten";

const AtlasMap = dynamic(() => import("@/components/preisatlas/atlas-map").then((m) => m.AtlasMap), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full animate-pulse rounded-3xl border border-border bg-surface sm:h-[440px]" />
  ),
});

const DEFAULT_SLUG = "speyer";

export interface PreisatlasViewProps {
  orte: MarktOrt[];
  /** Deep-Link ?ort= — bereits serverseitig validiert (page.tsx), sonst Default-Slug. */
  initialSlug?: string;
}

/**
 * Verdrahtet den Preisatlas: Chips (Consent-freier Pflichtpfad) + Karte
 * (hinter MapConsentGate) teilen sich eine gemeinsame Auswahl. `orte` kommt
 * als Prop vom Server (alleMarktorte()) — referenzstabil über die Lebenszeit
 * dieser Komponente, AtlasMap baut sonst unnötig neu auf (siehe atlas-map.tsx).
 *
 * `initialSlug` kommt bereits vom Server (?ort= aus page.tsx) statt erst nach
 * dem Mount per Client-Effect aus window.location gelesen zu werden — sonst
 * zeigt der erste Paint immer Speyer, bevor sichtbar auf die Zielstadt
 * umgesprungen wird (Flash-of-wrong-content bei Deep-Links, z. B. aus dem
 * Standort-Ratgeber verlinkt).
 */
export function PreisatlasView({ orte, initialSlug }: PreisatlasViewProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug ?? DEFAULT_SLUG);

  // Auswahl → URL spiegeln (teilbare Links), ohne Navigation/Scroll-Reset.
  const select = useCallback((slug: string) => {
    setSelectedSlug(slug);
    const url = new URL(window.location.href);
    url.searchParams.set("ort", slug);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const selected = orte.find((o) => o.slug === selectedSlug) ?? orte[0];
  if (!selected) return null; // keine Marktdaten vorhanden — nichts zu zeigen

  return (
    <>
      <section className="py-16 sm:py-20">
        <Container className="space-y-8">
          <Reveal className="space-y-4">
            <OrtsSuche orte={orte} onSelect={select} />
            <OrtsChips orte={orte} selectedSlug={selectedSlug} onSelect={select} ariaLabel="Standort wählen" />
          </Reveal>

          <Reveal delay={60} className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-surface p-5 text-sm text-muted sm:p-6">
            <span className="mt-0.5 shrink-0 text-accent">
              <Icon name="doc" size={18} />
            </span>
            <p>
              <span className="font-medium text-fg">Stand {MARKT_STAND}.</span> {PREIS_DISCLAIMER}
            </p>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Mobil gestapelt: Panel zuerst (die relevanten Zahlen vor der Karte). */}
            <Reveal delay={0} className="order-1 lg:order-2">
              <MarktPanel ort={selected} />
            </Reveal>
            <Reveal delay={100} className="order-2 lg:order-1">
              {/* Feste Höhe um den Consent-Gate: der Fallback (~200px, inhaltsgetrieben)
                  soll nicht sichtbar auf die 360–440px hohe Karte hochspringen. */}
              <div className="h-[360px] sm:h-[440px]">
                {/* Karte nur hinter Einwilligung; Chips oben sind der volle Fallback-Pfad. */}
                <MapConsentGate>
                  <AtlasMap orte={orte} selectedSlug={selectedSlug} onSelect={select} />
                </MapConsentGate>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <Container className="space-y-8">
          <Reveal className="max-w-2xl space-y-4">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              Städte vergleichen
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">Zwei Städte, ein Blick</h2>
          </Reveal>
          <Reveal delay={60}>
            <MarktVergleich orte={orte} />
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-accent/30">
              <WaveShader />
              {/* Lesbarkeits-Overlay wie in ShaderCta/CtaBand: hier zentrierter Text
                  statt links ausgerichtet, daher Abdunklung zur Mitte statt seitlich. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(65% 75% at 50% 45%, color-mix(in srgb, var(--color-bg) 88%, transparent) 0%, color-mix(in srgb, var(--color-bg) 55%, transparent) 55%, transparent 85%)",
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center sm:px-12 sm:py-20">
                <h2 className="akira max-w-xl text-3xl leading-[0.95] sm:text-5xl">
                  Und was ist <span className="text-accent-strong">Ihre</span> Immobilie wert?
                </h2>
                <p className="max-w-md text-lg text-fg/90">
                  In 60 Sekunden, kostenlos — inklusive Satellitenbild Ihrer Lage.
                </p>
                <HeroAddressSearch />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { engagement } from "@/lib/photos";

/**
 * „Engagement & Sponsoring"-Bento für die Über-uns-Seite. Ersetzt fehlende
 * Mitarbeiterportraits durch die belegbare Sponsoring-/Präsenz-Historie und
 * Büro-Impressionen. Beim Scroll-in „setzt sich das Grid zusammen": jede Kachel
 * kommt aus einer kleinen Richtungs-Verschiebung zackig an ihren Platz
 * (IntersectionObserver, kurze Dauer, enger Stagger). prefers-reduced-motion:
 * sofort sichtbar, keine Bewegung.
 */

type Tile =
  | { kind: "img"; src: string; alt: string; label: string; sub?: string; span: string; from: string }
  | { kind: "fact"; big: string; label: string; span: string; from: string };

// `from` = Start-Offset-Klasse (Richtung, aus der die Kachel einfliegt).
const TILES: Tile[] = [
  {
    kind: "img",
    src: engagement.autoGewonnen,
    alt: "Fahrzeugübergabe eines gebrandeten VW up! mit RIEGEL-Immobilien-Beschriftung",
    label: "VW up! verlost",
    sub: "Gewinnspiel · Fahrzeugübergabe",
    span: "col-span-2 row-span-2",
    from: "asm-l",
  },
  {
    kind: "img",
    src: engagement.hoffenheim,
    alt: "RIEGEL-Immobilien-Trikot der TSG 1899 Hoffenheim",
    label: "TSG 1899 Hoffenheim",
    sub: "Bundesliga-Partnerschaft",
    span: "col-span-1 row-span-2",
    from: "asm-r",
  },
  {
    kind: "fact",
    big: "Fußball",
    label: "Hauptsponsor · Verein Speyer",
    span: "col-span-2 sm:col-span-1 row-span-1",
    from: "asm-u",
  },
  {
    kind: "img",
    src: engagement.bandenwerbung,
    alt: "RIEGEL-Bandenwerbung im Bundesliga-Stadion",
    label: "Bandenwerbung",
    sub: "Bundesliga",
    span: "col-span-1 row-span-1",
    from: "asm-d",
  },
  {
    kind: "img",
    src: engagement.officeWide1,
    alt: "Modernes RIEGEL-Büro mit blauer Lichtführung",
    label: "Unser Büro",
    sub: "Speyer",
    span: "col-span-2 row-span-1",
    from: "asm-d",
  },
  {
    kind: "img",
    src: engagement.plakat,
    alt: "RIEGEL-Großflächenplakat im öffentlichen Raum",
    label: "Out-of-Home",
    sub: "Großflächen in der Region",
    span: "col-span-1 row-span-1",
    from: "asm-r",
  },
  {
    kind: "fact",
    big: "20+ Jahre",
    label: "regionales Engagement",
    span: "col-span-1 row-span-1",
    from: "asm-u",
  },
  {
    kind: "img",
    src: engagement.wein,
    alt: "RIEGEL-Wein aus der Pfalz",
    label: "RIEGEL Wein",
    sub: "aus der Pfalz",
    span: "col-span-1 row-span-1",
    from: "asm-l",
  },
  {
    kind: "img",
    src: engagement.event,
    alt: "RIEGEL bei einem regionalen Event",
    label: "Kundenevents",
    sub: "Präsenz in der Region",
    span: "col-span-2 row-span-1",
    from: "asm-l",
  },
  {
    kind: "img",
    src: engagement.vwGewinnspiel,
    alt: "Kampagnenmotiv des RIEGEL-VW-up!-Gewinnspiels",
    label: "Gewinnspiel-Kampagne",
    span: "col-span-1 row-span-1",
    from: "asm-d",
  },
];

export function EngagementBento() {
  const ref = useRef<HTMLDivElement | null>(null);

  // Scroll-GEKOPPELTE Montage: statt Einmal-Reveal setzt ein rAF-gedrosselter
  // Scroll-Handler den Grid-Fortschritt --p (0..1) aus der Scrollposition; das
  // CSS interpoliert daraus je Kachel die Verschiebung/Blur. Kein setState →
  // kein Re-Render, nur DOM-Style. Bei reduced-motion bleibt es unangetastet
  // sichtbar (die .asm-live-Klasse wird gar nicht erst gesetzt).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("asm-live");
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // p=0, wenn die Oberkante bei ~92% der Höhe steht; p=1, wenn sie ~22%
      // hoch gescrollt ist. Der 0,70-vh-Bereich macht die Montage bewusst
      // „langsam" und über das Scrollen hinweg sichtbar.
      const p = Math.max(0, Math.min(1, (vh * 0.92 - rect.top) / (vh * 0.7)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="asm-grid grid auto-rows-[128px] grid-cols-2 gap-3 sm:auto-rows-[150px] sm:grid-cols-3 lg:grid-cols-4"
    >
      {TILES.map((t, i) => (
        <div
          key={i}
          className={`asm-tile ${t.from} ${t.span} group relative overflow-hidden rounded-2xl border border-border`}
          style={{ ["--start"]: (i * 0.055).toFixed(3) } as CSSProperties}
        >
          {t.kind === "img" ? (
            <>
              <Image
                src={t.src}
                alt={t.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              />
              {/* Akzent-Hairline oben (Website-Sprache) + Text-Overlay unten. */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/85 via-bg/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                <div className="text-sm font-semibold leading-tight text-fg">{t.label}</div>
                {t.sub && <div className="text-[0.7rem] uppercase tracking-wide text-muted">{t.sub}</div>}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center gap-1 bg-accent/[0.08] p-4">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
              <div className="akira text-2xl leading-none text-accent [overflow-wrap:anywhere] sm:text-[1.7rem]">{t.big}</div>
              <div className="text-xs leading-tight text-muted">{t.label}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

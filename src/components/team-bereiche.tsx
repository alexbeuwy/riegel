"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/reveal";
import { site } from "@/lib/site";

export type Mitarbeitend = {
  name: string;
  rolle: string;
  /** Fachbereich für die Auswahl rechts. Ohne Angabe zählt `rolle`. */
  bereich?: string;
  img: string | null;
};

/** Initialen als Platzhalter, solange kein Porträt vorliegt. */
function initialen(name: string) {
  return name
    .split(/\s+/)
    .map((t) => t[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Porträt-Kachel. `dim` blendet sie zurück, wenn ein anderer Bereich
 * ausgewählt ist. Das Dimmen sitzt auf der figure, nicht auf dem
 * Reveal-Wrapper: der steuert bereits opacity für das Scroll-Einblenden,
 * beide auf demselben Element würden sich gegenseitig überschreiben.
 */
export function PersonKachel({
  m,
  delay,
  dim = false,
}: {
  m: Mitarbeitend;
  delay: number;
  dim?: boolean;
}) {
  return (
    <Reveal delay={delay}>
      <figure className="t-team-figure group" data-dim={dim ? "true" : "false"}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface-2">
          {m.img ? (
            <Image
              src={m.img}
              alt={m.name}
              fill
              sizes="(max-width: 1024px) 50vw, 260px"
              className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
              <span className="akira text-2xl text-accent/70">{initialen(m.name)}</span>
              <span className="text-[0.6rem] uppercase tracking-widest text-faint">Foto folgt</span>
            </div>
          )}
        </div>
        <figcaption className="mt-3">
          <div className="text-sm font-semibold leading-tight text-fg">{m.name}</div>
          <div className="text-xs text-accent">{m.rolle}</div>
        </figcaption>
      </figure>
    </Reveal>
  );
}

/**
 * Stummer Endlos-Loop eines echten RIEGEL-Reels (dieselben Dateien wie die
 * Reels-Sektion der Startseite, BunnyCDN). Läuft nur, solange die Kachel im
 * Bild ist — das spart Akku und Bandbreite. Ohne Ton und ohne Bedienelemente:
 * hier ist es Atmosphäre, die Reels mit Ton stehen auf der Startseite.
 * prefers-reduced-motion: kein Autoplay, es bleibt beim ersten Bild.
 */
function ReelLoop({ src, caption, tag }: { src: string; caption: string; tag: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface">
      {/* 4:5 statt des originalen 9:16 und damit im selben Format wie die
          Porträtkacheln. Das hält den mitwandernden Block niedrig genug, dass
          er auf üblichen Laptop-Höhen vollständig ins Bild passt. */}
      <div className="relative aspect-[4/5]">
        <video
          ref={ref}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${caption}, ${tag}`}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-bg/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5">
          <div className="text-sm font-medium text-fg">{caption}</div>
          <div className="text-xs text-faint">{tag}</div>
        </div>
      </div>
    </div>
  );
}

/** Zwei Porträts pro Zeile, links ausgerichtet — für Team und Nachwuchs gleich. */
export function PersonGrid({ leute }: { leute: Mitarbeitend[] }) {
  return (
    <div className="grid max-w-[32rem] grid-cols-2 gap-5">
      {leute.map((m, i) => (
        <PersonKachel key={m.name} m={m} delay={(i % 2) * 70} />
      ))}
    </div>
  );
}

/**
 * Team-Block: links die Porträts in Zweier-Zeilen, rechts die Bereiche als
 * senkrechte Liste, die ab lg beim Scrollen mitwandert.
 *
 * Zwei Betriebsarten, bewusst getrennt:
 *
 *  - OHNE Auswahl folgt die Liste dem Scrollen: markiert ist der Bereich,
 *    dessen Porträts gerade auf Höhe der Lesekante stehen. Es wird dabei
 *    NICHTS abgedunkelt, sonst würde beim Scrollen dauernd das halbe Raster
 *    aus- und wieder eingegraut.
 *  - MIT Auswahl (Klick) hält die Markierung, die passenden Gesichter bleiben
 *    farbig und die übrigen treten zurück. Ein zweiter Klick oder die
 *    Schaltfläche darunter gibt die Liste wieder ans Scrollen zurück.
 *
 * Die Markierungs-Pille wandert in beiden Fällen animiert an die neue Position
 * und passt ihre Höhe an (transitions.dev „Tabs sliding", senkrechte
 * Variante): JS misst offsetTop/offsetHeight des aktiven Eintrags und schreibt
 * beides auf die Pille, das Tweening macht CSS. Beim ersten Rendern und bei
 * Größenänderungen wird ohne Transition gesetzt, damit die Pille nicht aus der
 * Ecke heranfliegt.
 */
export function TeamBereiche({ leute }: { leute: Mitarbeitend[] }) {
  const bereiche = useMemo(() => {
    const map = new Map<string, Mitarbeitend[]>();
    for (const m of leute) {
      const b = m.bereich ?? m.rolle;
      const vorhanden = map.get(b);
      if (vorhanden) vorhanden.push(m);
      else map.set(b, [m]);
    }
    return [...map.entries()].map(([name, mitglieder]) => ({ name, mitglieder }));
  }, [leute]);

  /** Vom Nutzer festgehaltener Bereich. null = die Liste folgt dem Scrollen. */
  const [gesperrt, setGesperrt] = useState<string | null>(null);
  /** Bereich, dessen Porträts gerade auf Lesehöhe stehen. */
  const [sichtbar, setSichtbar] = useState<string>(() => bereiche[0]?.name ?? "");
  const aktiv = gesperrt ?? sichtbar;

  const gridRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const ersterLauf = useRef(true);

  // Scroll-Kopplung. Kein IntersectionObserver, weil hier nicht „drin oder
  // draußen" zählt, sondern welche Zeile einer bestimmten Bildschirmhöhe am
  // nächsten ist. Der rAF-Riegel hält es bei einem Lauf pro Frame.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const grosserSchirm = window.matchMedia("(min-width: 1024px)");
    let raf = 0;
    const messen = () => {
      raf = 0;
      // Unterhalb von lg steht die Liste unter den Porträts und nicht daneben;
      // eine mitlaufende Markierung wäre dort nicht zu sehen.
      if (!grosserSchirm.matches) return;
      const linie = window.innerHeight * 0.42;
      const kacheln = Array.from(grid.children) as HTMLElement[];
      for (let i = 0; i < kacheln.length; i++) {
        const r = kacheln[i].getBoundingClientRect();
        if (r.top <= linie && r.bottom >= linie) {
          const b = leute[i]?.bereich ?? leute[i]?.rolle;
          if (b) setSichtbar((v) => (v === b ? v : b));
          return;
        }
      }
    };
    const beiScroll = () => {
      if (!raf) raf = requestAnimationFrame(messen);
    };
    raf = requestAnimationFrame(messen);
    window.addEventListener("scroll", beiScroll, { passive: true });
    window.addEventListener("resize", beiScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", beiScroll);
      window.removeEventListener("resize", beiScroll);
      cancelAnimationFrame(raf);
    };
  }, [leute]);

  /** Klick auf einen Bereich: festhalten und die erste Kachel in den Blick holen. */
  const waehle = (name: string) => {
    if (gesperrt === name) {
      setGesperrt(null);
      return;
    }
    setGesperrt(name);
    const idx = leute.findIndex((m) => (m.bereich ?? m.rolle) === name);
    const ziel = gridRef.current?.children[idx] as HTMLElement | undefined;
    if (!ziel) return;
    ziel.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const setzePille = useCallback((animiert: boolean) => {
    const pill = pillRef.current;
    const ziel = listRef.current?.querySelector<HTMLElement>('[data-aktiv="true"]');
    if (!pill || !ziel) return;
    if (animiert) {
      pill.style.transform = `translateY(${ziel.offsetTop}px)`;
      pill.style.height = `${ziel.offsetHeight}px`;
      return;
    }
    // Ohne Transition setzen: aussetzen, Reflow erzwingen, wiederherstellen.
    const vorher = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateY(${ziel.offsetTop}px)`;
    pill.style.height = `${ziel.offsetHeight}px`;
    void pill.offsetHeight;
    pill.style.transition = vorher;
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setzePille(!ersterLauf.current);
      ersterLauf.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [aktiv, setzePille]);

  // Umbrüche in den Namenslisten ändern die Zeilenhöhen (Schriftladen,
  // Breitenwechsel) — dann muss die Pille ohne Animation nachgezogen werden.
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setzePille(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [setzePille]);

  return (
    // Bewusst OHNE items-start: die Rasterkinder müssen auf volle Zeilenhöhe
    // gestreckt bleiben, sonst hat das sticky-Element im rechten Kind keinen
    // Weg zum Wandern und klebt sofort wieder los.
    <div className="grid gap-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-14">
      <div ref={gridRef} className="grid grid-cols-2 gap-5">
        {leute.map((m, i) => (
          <PersonKachel
            key={m.name}
            m={m}
            delay={(i % 2) * 70}
            dim={gesperrt !== null && (m.bereich ?? m.rolle) !== gesperrt}
          />
        ))}
      </div>

      {/* Das Rasterkind selbst wird über die volle Zeilenhöhe gestreckt, das
          sticky-Element ist sein Kind. Nur so entsteht überhaupt eine Strecke,
          entlang derer die Liste mitwandern kann. */}
      <div>
        <div className="lg:sticky lg:top-24">
          <Reveal delay={140}>
            <div className="w-full lg:max-w-[20rem]">
            <div className="mb-4 text-[0.65rem] uppercase tracking-[0.25em] text-faint">
              Bereiche
            </div>
            <div
              ref={listRef}
              className="t-vtabs space-y-1"
              role="radiogroup"
              aria-label="Team nach Bereich hervorheben"
            >
              <span ref={pillRef} className="t-vtabs-pill" aria-hidden="true" />
              {bereiche.map((b) => {
                const markiert = aktiv === b.name;
                return (
                  <button
                    key={b.name}
                    type="button"
                    role="radio"
                    aria-checked={gesperrt === b.name}
                    data-aktiv={markiert ? "true" : "false"}
                    onClick={() => waehle(b.name)}
                    className="t-vtab press block w-full rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60"
                  >
                    <span className="flex items-baseline gap-3">
                      <span
                        className={`text-base font-semibold transition-colors ${
                          markiert ? "text-accent" : "text-fg"
                        }`}
                      >
                        {b.name}
                      </span>
                      <span className="text-xs tabular-nums text-faint">
                        {b.mitglieder.length}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {b.mitglieder.map((m) => m.name).join(" · ")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Der Hinweistext wechselt mit der Betriebsart, damit erkennbar
                bleibt, warum die Liste gerade mitläuft oder eben nicht. */}
            {gesperrt ? (
              <button
                type="button"
                onClick={() => setGesperrt(null)}
                className="press mt-4 px-4 text-xs text-accent underline-offset-4 hover:underline"
              >
                Hervorhebung aufheben
              </button>
            ) : (
              <p className="mt-4 px-4 text-xs text-faint">
                Läuft beim Scrollen mit. Bereich anklicken, um die passenden
                Gesichter hervorzuheben.
              </p>
            )}

            {/* Reel mit Carina, ein Gesicht aus genau diesem Team, deshalb
                steht es hier und nicht irgendein beliebiges Objektvideo.
                Auf schmalen Schirmen genau eine Kachelbreite. */}
            <div className="mt-8 max-w-[calc(50%-0.625rem)] lg:max-w-none">
              <ReelLoop
                src={`https://${site.cdnHost}/Carina-Einfamilienhaus.mp4`}
                caption="Einfamilienhaus"
                tag="mit Carina aus dem Team"
              />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

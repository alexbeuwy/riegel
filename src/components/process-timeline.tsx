"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon, type IconName } from "@/components/icon";

export interface ProcessStep {
  icon: IconName;
  title: string;
  text: string;
  /** Optionales Bild (z. B. /images/prozess/01.jpg). Sonst stylischer Platzhalter. */
  image?: string;
}

/**
 * Animierte Prozess-Timeline: ein Akzent-Connector „füllt" sich beim Scrollen,
 * Schritte erscheinen gestaffelt, Bild-Slots bereit für echte/generierte Bilder.
 * Respektiert prefers-reduced-motion.
 */
export function ProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Connector-Linie (Desktop), füllt sich mit Akzent */}
      <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-0.5 bg-border lg:block">
        <div
          className="h-full bg-accent transition-[width] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: shown ? "100%" : "0%" }}
        />
      </div>

      <ol className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="group relative flex flex-col transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transitionDelay: `${i * 120}ms`,
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(20px)",
            }}
          >
            {/* Nummern-/Icon-Badge auf der Linie */}
            <div className="relative z-10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-accent/50 bg-bg text-accent shadow-[0_0_0_6px_rgba(11,11,13,1)] transition-colors duration-500 group-hover:bg-accent group-hover:text-on-accent">
              <Icon name={s.icon} size={24} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-on-accent">
                {i + 1}
              </span>
            </div>

            {/* Bild-Slot */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-bg">
              {s.image ? (
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  sizes="(max-width: 1024px) 50vw, 20vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/wave-2.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 bottom-0 h-[150%] w-auto opacity-[0.14] mix-blend-screen transition-transform duration-700 group-hover:translate-x-2"
                  />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent/30">
                    <Icon name={s.icon} size={44} />
                  </span>
                  <span className="akira absolute right-3 top-2 text-2xl text-faint/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </>
              )}
            </div>

            <h3 className="mt-4 text-center text-lg font-semibold text-fg">{s.title}</h3>
            <p className="mt-1.5 text-center text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

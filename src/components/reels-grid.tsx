"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

/**
 * RIEGEL-Video-Reels — echte, selbst gehostete MP4s (Eigentum RIEGEL).
 * - Autoplay stumm in View (IntersectionObserver, akkuschonend).
 * - Hover → Ton an (und alle anderen stumm). Verlassen → wieder stumm.
 * - Kleiner Mute/Unmute-Button unten links (Klick = sichere User-Geste für Ton).
 * - Respektiert prefers-reduced-motion (kein Autoplay).
 */
interface Reel {
  src: string;
  caption: string;
  tag: string;
}

// Auf BunnyCDN umgezogen (lag zuvor auf beuwy.com — fremde Domain im
// riegel-Traffic-/Bandbreitenpfad). Dateien liegen unter denselben Namen
// in der Storage-Zone „riegel-immobilien" (siehe docs/bunny-cdn.md).
const BASE = "https://riegel.b-cdn.net/";
const REELS: Reel[] = [
  { src: "Doppelhaushaelfte-Schifferstadt.mp4", caption: "Doppelhaushälfte", tag: "Schifferstadt" },
  { src: "Einfamilienhaus1.mp4", caption: "Einfamilienhaus", tag: "Vorderpfalz" },
  { src: "Bad-Duerkheim-Wohnung.mp4", caption: "Wohnung", tag: "Bad Dürkheim" },
  { src: "Carina-Einfamilienhaus.mp4", caption: "Einfamilienhaus", tag: "mit Carina" },
  { src: "Miete-Sissy-in-Speyer.mp4", caption: "Zur Miete", tag: "Speyer · mit Sissy" },
];

export function ReelsGrid() {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const [muted, setMuted] = useState<boolean[]>(() => REELS.map(() => true));

  // Autoplay nur in View.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.35 },
    );
    refs.current.forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, []);

  // Genau ein Video mit Ton; alle anderen stumm.
  //
  // Wichtig: erst (stumm) abspielen, dann entstummen — NICHT umgekehrt.
  // Autoplay-mit-Ton per Hover ist keine "User-Activation"-Geste (nur Klick/
  // Tap zählt), daher lehnen Browser ein direktes muted→false + play() manchmal
  // ab. Ein bereits (stumm) laufendes Video darf dagegen jederzeit skriptgesteuert
  // entstummt werden — das erklärt das "manchmal kommt kein Ton" beim Hover.
  const soundOn = (i: number) => {
    refs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx !== i) {
        v.muted = true;
        return;
      }
      if (v.paused) {
        v.play()
          .then(() => {
            v.muted = false;
          })
          .catch(() => {});
      } else {
        v.muted = false;
      }
    });
    setMuted(REELS.map((_, idx) => idx !== i));
  };
  const muteAll = () => {
    refs.current.forEach((v) => v && (v.muted = true));
    setMuted(REELS.map(() => true));
  };

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-4">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              @riegelimmobilien
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">So vermarkten wir Immobilien</h2>
            <p className="text-muted">
              Echte Objekt-Reels — Reichweite, Wiedererkennung und Emotion.
              <span className="text-faint"> Mit der Maus über ein Video fahren für Ton.</span>
            </p>
          </div>
          <a
            href="https://www.instagram.com/riegelimmobilien/"
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="sparkle" size={16} />
            Auf Instagram folgen
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {REELS.map((r, i) => (
            <div
              key={r.src}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface"
              onMouseEnter={() => soundOn(i)}
              onMouseLeave={muteAll}
            >
              <div className="relative aspect-[9/16]">
                {/* preload=metadata → Browser zeigen den ersten Frame statt einer
                    leeren Kachel (v. a. iOS-Stromsparmodus, wo Autoplay aus ist).
                    Echte Poster-JPEGs (z. B. Bunny-Thumbnails) wären der Ausbau. */}
                <video
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  src={BASE + r.src}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-bg/20" />

                {/* Mute/Unmute unten links */}
                <button
                  type="button"
                  aria-label={muted[i] ? "Ton einschalten" : "Ton ausschalten"}
                  aria-pressed={!muted[i]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (muted[i]) soundOn(i);
                    else muteAll();
                  }}
                  className="press absolute bottom-2 left-2 flex h-11 w-11 items-center justify-center rounded-full bg-bg/60 text-fg backdrop-blur transition-colors hover:text-accent"
                >
                  <Icon name={muted[i] ? "volumeOff" : "volume"} size={15} />
                </button>

                {/* Caption unten rechts — Reserve links auf pl-14 angehoben (Mute-Button
                    ist jetzt h-11/44px statt h-8/32px, siehe Touch-Ziel-Mindestgröße). */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 p-3 pl-14 text-right">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">{r.caption}</div>
                    <div className="truncate text-xs text-faint">{r.tag}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

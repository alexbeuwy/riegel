"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

/**
 * Instagram-Reels-Showcase als echtes Autoplay-in-View-Grid.
 * - Liegt eine MP4 vor (Feld `video`, z. B. "/reels/xy.mp4"), wird sie
 *   stummgeschaltet, geloopt und nur abgespielt, wenn die Kachel sichtbar ist
 *   (IntersectionObserver → flüssig, kein Akku-/CPU-Fresser).
 * - Ohne MP4 zeigt die Kachel das Poster + Play-Overlay und verlinkt auf den
 *   echten Reel. Riegel exportiert die Reels (Eigentum) nach /public/reels/.
 */
interface Reel {
  permalink: string;
  poster: string;
  caption: string;
  video?: string; // z. B. "/reels/schifferstadt.mp4"
}

const REELS: Reel[] = [
  { permalink: "https://www.instagram.com/p/DYzORWBNKU-/", poster: "/images/standorte/haus.jpg", caption: "Doppelhaushälfte · Schifferstadt" },
  { permalink: "https://www.instagram.com/p/DYZo1sZtZL8/", poster: "/images/news/wein.jpg", caption: "RIEGEL Wein" },
  { permalink: "https://www.instagram.com/p/DX_w6Q5tpd_/", poster: "/images/news/auto-gewonnen.jpg", caption: "Gewinnspiel" },
  { permalink: "https://www.instagram.com/p/DX91v6sOw7j/", poster: "/images/news/sponsor-tsg.jpg", caption: "Sponsoring TSG Hoffenheim" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/standorte/buero-1.jpg", caption: "Hinter den Kulissen" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/news/event.jpg", caption: "Team & Events" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/standorte/buero-2.jpg", caption: "Beratung & Service" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/standorte/ludwigshafen.jpg", caption: "Standort Ludwigshafen" },
];

function ReelCard({ r }: { r: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border">
      <div className="relative aspect-[9/16]">
        {r.video ? (
          <video
            ref={videoRef}
            poster={r.poster}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={r.poster}
            alt={r.caption}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-bg/25" />
        {!r.video && (
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg/55 text-fg backdrop-blur transition-transform duration-300 group-hover:scale-110">
            <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
        <a
          href={r.permalink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Auf Instagram ansehen: ${r.caption}`}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg/55 text-fg backdrop-blur transition-colors hover:text-accent"
        >
          <Icon name="arrowUpRight" size={16} />
        </a>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
          <Icon name="sparkle" size={15} className="shrink-0 text-accent" />
          <span className="truncate text-sm text-fg">{r.caption}</span>
        </div>
      </div>
    </div>
  );
}

export function ReelsGrid() {
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
              Reels, Reichweite, Wiedererkennung — moderne Vermarktung, die Ihre
              Immobilie sichtbar macht.
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {REELS.map((r, i) => (
            <ReelCard key={`${r.permalink}-${i}`} r={r} />
          ))}
        </div>
      </Container>
    </section>
  );
}

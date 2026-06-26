import Image from "next/image";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

/**
 * Instagram-Reels-Showcase als sanft laufende Marquee. Zeigt, wie Riegel
 * Immobilien vermarktet. Jede Kachel verlinkt auf den echten Reel.
 * Sobald echte Video-Assets vorliegen, kann `poster` durch ein
 * <video autoPlay muted loop playsInline> ersetzt werden (siehe TODO).
 */
interface Reel {
  permalink: string;
  poster: string;
  caption: string;
}

const REELS: Reel[] = [
  { permalink: "https://www.instagram.com/p/DYzORWBNKU-/", poster: "/images/news/event.jpg", caption: "Vermarktung & Events" },
  { permalink: "https://www.instagram.com/p/DYZo1sZtZL8/", poster: "/images/news/wein.jpg", caption: "RIEGEL Wein" },
  { permalink: "https://www.instagram.com/p/DX_w6Q5tpd_/", poster: "/images/news/auto-gewonnen.jpg", caption: "Gewinnspiel" },
  { permalink: "https://www.instagram.com/p/DX91v6sOw7j/", poster: "/images/news/sponsor-tsg.jpg", caption: "Sponsoring TSG Hoffenheim" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/standorte/buero-1.jpg", caption: "Hinter den Kulissen" },
  { permalink: "https://www.instagram.com/riegelimmobilien/", poster: "/images/standorte/buero-2.jpg", caption: "Beratung & Service" },
];

function ReelCard({ r }: { r: Reel }) {
  return (
    <a
      href={r.permalink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Instagram-Reel: ${r.caption}`}
      className="group relative block w-[200px] shrink-0 overflow-hidden rounded-2xl border border-border sm:w-[240px]"
    >
      <div className="relative aspect-[9/16]">
        {/* TODO: poster durch <video autoPlay muted loop playsInline> ersetzen, sobald Reel-MP4s vorliegen */}
        <Image
          src={r.poster}
          alt={r.caption}
          fill
          sizes="240px"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/10 to-bg/30" />
        {/* Play-Overlay */}
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg/55 text-fg backdrop-blur transition-transform duration-300 group-hover:scale-110">
          <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3">
          <Icon name="sparkle" size={15} className="text-accent" />
          <span className="truncate text-sm text-fg">{r.caption}</span>
        </div>
      </div>
    </a>
  );
}

export function ReelsGrid() {
  const loop = [...REELS, ...REELS]; // doppelt für nahtlosen Loop
  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-4">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
              @riegelimmobilien
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              So vermarkten wir Immobilien
            </h2>
            <p className="text-muted">
              Reels, Reichweite, Wiedererkennung — moderne Vermarktung, die
              Ihre Immobilie sichtbar macht.
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
      </Container>

      <div className="reel-marquee">
        <div className="reel-track px-4">
          {loop.map((r, i) => (
            <ReelCard key={`${r.permalink}-${i}`} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

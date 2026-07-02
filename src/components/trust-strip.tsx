import { Icon } from "@/components/icon";
import { TRUST_PLATFORMS, TRUST_BADGES } from "@/lib/trust-data";

/**
 * Dünner, endlos laufender Vertrauens-Streifen (Marquee) — Plattform-Bewertungen
 * + Auszeichnungen in einer Zeile. Pausiert bei Hover, steht bei reduced-motion
 * (Muster/Klassen aus .reel-marquee wiederverwendet, s. globals.css).
 */
function Stars({ rating, max }: { rating: number; max: number }) {
  const pct = Math.round((rating / max) * 5 * 20); // auf 5-Sterne-Skala normiert, in %
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="flex text-faint">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" size={13} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-accent"
        style={{ width: `${pct}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" size={13} fill="currentColor" />
        ))}
      </span>
    </span>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-6 text-sm text-muted">
      {children}
    </div>
  );
}

function Divider() {
  return <span className="h-4 w-px shrink-0 bg-border" aria-hidden />;
}

function TrustItems() {
  return (
    <>
      {TRUST_PLATFORMS.map((p, i) => (
        <span key={p.key} className="flex items-center">
          {i > 0 && <Divider />}
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="transition-colors hover:text-fg"
          >
            <Item>
              <Icon name={p.icon} size={15} className="text-accent" />
              <span className="text-fg">{p.name}</span>
              <Stars rating={p.rating} max={p.scaleMax} />
              <span className="tabular-nums text-faint">
                {p.rating.toLocaleString("de-DE")}/{p.scaleMax} · {p.count}
              </span>
            </Item>
          </a>
        </span>
      ))}
      {TRUST_BADGES.map((b) => (
        <span key={b.key} className="flex items-center">
          <Divider />
          <Item>
            <Icon name={b.icon} size={15} className="text-accent" />
            <span className="text-fg">{b.label}</span>
            <span className="text-faint">{b.sub}</span>
          </Item>
        </span>
      ))}
    </>
  );
}

export function TrustStrip() {
  return (
    <div className="border-y border-border bg-surface/60 py-3">
      <div className="reel-marquee">
        <div className="reel-track is-slow">
          <TrustItems />
          <Divider />
          <TrustItems />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, type ComponentType, type SVGProps } from "react";
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  LinkedinIcon,
} from "@/components/social-icons";

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;
const ICONS: Record<string, IconComp> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
};

export interface SocialItem {
  key: string;
  href: string;
  label: string;
}

/**
 * Social-Reihe mit „avatar group hover" (transitions-dev): hover hebt das
 * Ziel, Nachbarn folgen mit Power-Falloff, Rückkehr federt nach (ease-out).
 */
export function FooterSocials({ links }: { links: SocialItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const setShifts = (activeIdx: number | null, phase: "in" | "out") => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".t-avatar"));
    const cs = getComputedStyle(document.documentElement);
    const num = (n: string, fb: number) => {
      const v = parseFloat(cs.getPropertyValue(n));
      return Number.isFinite(v) ? v : fb;
    };
    const ease = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.06);
    const tf =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
    items.forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px");
      el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
    });
  };

  return (
    <div ref={rootRef} className="flex gap-3" onMouseLeave={() => setShifts(null, "out")}>
      {links.map((s, i) => {
        const Icon = ICONS[s.key];
        return (
          <span
            key={s.key}
            className="t-avatar t-tt-wrap"
            onMouseEnter={() => setShifts(i, "in")}
          >
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              aria-describedby={`tt-${s.key}`}
              className="t-tt-trigger flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {Icon ? <Icon /> : null}
            </a>
            <span className="t-tt" id={`tt-${s.key}`} role="tooltip">
              {s.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

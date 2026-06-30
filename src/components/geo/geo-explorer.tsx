"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icon, type IconName } from "@/components/icon";
import type { GeoCategory } from "@/lib/geo-taxonomy";

const GeoMap = dynamic(() => import("@/components/geo/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full animate-pulse rounded-3xl border border-border bg-surface sm:h-[440px]" />
  ),
});

export interface GeoExplorerItem {
  slug: string;
  href: string;
  title: string;
  desc: string;
  eyebrow?: string;
  category: string;
  categoryLabel: string;
  icon: IconName;
  lng?: number;
  lat?: number;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

export function GeoExplorer({
  items,
  categories,
  withMap = false,
  cols = 2,
  searchPlaceholder = "Suchen …",
  cta = "Mehr erfahren",
}: {
  items: GeoExplorerItem[];
  categories: GeoCategory[];
  withMap?: boolean;
  cols?: 2 | 3;
  searchPlaceholder?: string;
  cta?: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");
  const [hovered, setHovered] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.category] = (m[it.category] ?? 0) + 1;
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return items.filter((it) => {
      if (active !== "all" && it.category !== active) return false;
      if (!q) return true;
      const hay = norm(`${it.title} ${it.desc} ${it.eyebrow ?? ""} ${it.categoryLabel}`);
      return hay.includes(q);
    });
  }, [items, query, active]);

  const visibleSlugs = useMemo(() => new Set(filtered.map((it) => it.slug)), [filtered]);
  const mapPoints = useMemo(
    () =>
      items
        .filter((it) => it.lng != null && it.lat != null)
        .map((it) => ({
          slug: it.slug,
          title: it.title,
          eyebrow: it.eyebrow,
          href: it.href,
          lng: it.lng as number,
          lat: it.lat as number,
        })),
    [items],
  );

  const gridCols = cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  const Chip = ({ k, label, icon, n }: { k: string; label: string; icon?: IconName; n: number }) => {
    const on = active === k;
    return (
      <button
        type="button"
        onClick={() => setActive(k)}
        aria-pressed={on}
        className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-200 ${
          on
            ? "border-accent bg-accent text-on-accent"
            : "border-border text-muted hover:border-accent/50 hover:text-fg"
        }`}
      >
        {icon ? <Icon name={icon} size={15} className={on ? "" : "text-faint"} /> : null}
        {label}
        <span className={`text-xs ${on ? "text-on-accent/75" : "text-faint"}`}>{n}</span>
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {withMap && mapPoints.length > 0 && (
        <GeoMap
          points={mapPoints}
          visibleSlugs={visibleSlugs}
          hoveredSlug={hovered}
          onHover={setHovered}
        />
      )}

      {/* Suche + Filter */}
      <div className="space-y-5">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
            <Icon name="search" size={17} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-10 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Suche zurücksetzen"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-fg"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Chip k="all" label="Alle" n={items.length} />
          {categories.map((c) => (
            <Chip key={c.key} k={c.key} label={c.label} icon={c.icon} n={counts[c.key] ?? 0} />
          ))}
        </div>
      </div>

      {/* Ergebnis */}
      <p className="text-sm text-faint" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}
        {active !== "all" || query ? " gefunden" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-muted">Keine Treffer. Andere Suche oder Filter probieren.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActive("all");
            }}
            className="mt-4 text-sm font-medium text-accent hover:underline"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className={`grid gap-4 ${gridCols}`}>
          {filtered.map((it, i) => (
            <Link
              key={it.slug}
              href={it.href}
              onMouseEnter={() => setHovered(it.slug)}
              onMouseLeave={() => setHovered(null)}
              className={`geo-in group flex h-full flex-col rounded-2xl border bg-surface p-6 transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-0.5 hover:border-accent/50 ${
                hovered === it.slug ? "border-accent/50 shadow-[0_0_0_1px_rgba(1,92,255,0.25)]" : "border-border"
              }`}
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent transition-colors group-hover:border-accent/50">
                  <Icon name={it.icon} size={20} />
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-faint">
                  {it.categoryLabel}
                </span>
              </div>
              {it.eyebrow && (
                <div className="mt-5 flex items-center gap-1.5 text-xs uppercase tracking-widest text-accent">
                  <Icon name="pin" size={13} />
                  {it.eyebrow}
                </div>
              )}
              <h2 className={`text-lg font-semibold text-fg ${it.eyebrow ? "mt-2" : "mt-5"}`}>{it.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{it.desc}</p>
              <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-accent">
                {cta}
                <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

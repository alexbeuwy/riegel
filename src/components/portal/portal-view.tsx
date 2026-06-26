"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { PortalCard } from "@/components/portal/portal-card";
import { Icon } from "@/components/icon";
import type { MapBounds } from "@/components/portal/portal-map";

const PortalMap = dynamic(
  () => import("@/components/portal/portal-map").then((m) => m.PortalMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-surface text-sm text-faint">
        Karte wird geladen…
      </div>
    ),
  },
);

function inBounds(e: Estate, b: MapBounds): boolean {
  if (!e.geo) return false;
  return e.geo.lat <= b.n && e.geo.lat >= b.s && e.geo.lng <= b.e && e.geo.lng >= b.w;
}

export function PortalView({ estates }: { estates: Estate[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [searchInArea, setSearchInArea] = useState(false);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const onHover = useCallback((id: string | null) => setHoveredId(id), []);
  const onActivate = useCallback((id: string | null) => setActiveId(id), []);
  const onBoundsChange = useCallback((b: MapBounds) => setBounds(b), []);

  // Liste filtert auf den Kartenausschnitt, wenn aktiviert. Die Karte bekommt
  // immer alle Objekte (stabil) → kein Re-Fit-Loop; betroffene Pins werden gedimmt.
  const listEstates = useMemo(() => {
    if (!searchInArea || !bounds) return estates;
    return estates.filter((e) => inBounds(e, bounds));
  }, [estates, searchInArea, bounds]);

  const inAreaIds = useMemo(() => {
    if (!searchInArea || !bounds) return null;
    return new Set(listEstates.map((e) => e.id));
  }, [searchInArea, bounds, listEstates]);

  useEffect(() => {
    if (!activeId) return;
    cardRefs.current[activeId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeId]);

  return (
    <div className="grid lg:grid-cols-[1.25fr_1fr]">
      {/* Liste (zuerst im DOM = kanonische Tastatur-/SR-Schnittstelle) */}
      <div className={`${showMapMobile ? "hidden" : "block"} lg:block`}>
        {searchInArea && bounds ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-6 sm:px-8">
            <span className="inline-flex items-center gap-1.5 text-sm text-accent">
              <Icon name="search" size={16} />
              {listEstates.length} {listEstates.length === 1 ? "Objekt" : "Objekte"} in
              diesem Kartenausschnitt
            </span>
          </div>
        ) : null}

        {listEstates.length === 0 ? (
          <div className="px-5 py-24 text-center sm:px-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
              <Icon name="search" size={26} />
            </div>
            <h2 className="text-2xl font-semibold">
              {searchInArea ? "Keine Objekte in diesem Kartenausschnitt" : "Keine Objekte für diese Filter"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              {searchInArea
                ? "Zoomen Sie heraus oder verschieben Sie die Karte — oder schalten Sie die Bereichssuche oben rechts wieder aus."
                : "Lockern Sie die Filter oder erweitern Sie den Umkreis. Gerne informieren wir Sie auch, sobald passende Objekte verfügbar sind."}
            </p>
            <Link
              href="/kontakt"
              className="mt-6 inline-flex rounded-full border border-border px-5 py-2.5 text-sm text-fg hover:border-accent hover:text-accent"
            >
              Suche speichern lassen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-8 xl:grid-cols-2">
            {listEstates.map((e) => (
              <PortalCard
                key={e.id}
                estate={e}
                hovered={e.id === hoveredId}
                active={e.id === activeId}
                onHover={onHover}
                registerRef={(el) => {
                  cardRefs.current[e.id] = el;
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Karte (sticky rechts; mobil per Toggle als Vollfläche) */}
      <div
        className={`${
          showMapMobile ? "block" : "hidden"
        } sticky top-20 h-[calc(100svh-5rem)] lg:block`}
      >
        {/* Search-as-I-move-Umschalter */}
        <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-bg/85 px-3.5 py-2 text-sm text-fg shadow-lg backdrop-blur transition-colors hover:border-accent/60">
          <input
            type="checkbox"
            checked={searchInArea}
            onChange={(ev) => setSearchInArea(ev.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <Icon name="search" size={15} className={searchInArea ? "text-accent" : "text-muted"} />
          Bei Kartenbewegung suchen
        </label>

        <PortalMap
          estates={estates}
          hoveredId={hoveredId}
          activeId={activeId}
          inAreaIds={inAreaIds}
          onHover={onHover}
          onActivate={onActivate}
          onBoundsChange={onBoundsChange}
        />
      </div>

      {/* Mobile-Umschalter Liste/Karte */}
      <button
        type="button"
        onClick={() => setShowMapMobile((v) => !v)}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent shadow-2xl lg:hidden"
      >
        <Icon name={showMapMobile ? "layers" : "pin"} size={18} />
        {showMapMobile ? "Liste anzeigen" : "Karte anzeigen"}
      </button>
    </div>
  );
}

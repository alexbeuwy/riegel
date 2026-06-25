"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { PortalCard } from "@/components/portal/portal-card";

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

export function PortalView({ estates }: { estates: Estate[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const onHover = useCallback((id: string | null) => setHoveredId(id), []);
  const onActivate = useCallback((id: string | null) => setActiveId(id), []);

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
      <div
        className={`${showMapMobile ? "hidden" : "block"} lg:block`}
      >
        {estates.length === 0 ? (
          <div className="px-5 py-24 text-center sm:px-8">
            <h2 className="text-2xl font-semibold">Keine Objekte für diese Filter</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Lockern Sie die Filter oder erweitern Sie den Umkreis. Gerne
              informieren wir Sie auch, sobald passende Objekte verfügbar sind.
            </p>
            <Link
              href="/kontakt"
              className="mt-6 inline-flex rounded-full border border-border px-5 py-2.5 text-sm text-fg hover:border-accent hover:text-accent"
            >
              Suche speichern lassen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-5 py-8 sm:px-8 xl:grid-cols-2">
            {estates.map((e) => (
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
        <PortalMap
          estates={estates}
          hoveredId={hoveredId}
          activeId={activeId}
          onHover={onHover}
          onActivate={onActivate}
        />
      </div>

      {/* Mobile-Umschalter Liste/Karte */}
      <button
        type="button"
        onClick={() => setShowMapMobile((v) => !v)}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent shadow-2xl lg:hidden"
      >
        {showMapMobile ? "Liste anzeigen" : "Karte anzeigen"}
      </button>
    </div>
  );
}

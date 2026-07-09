"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { PortalCard } from "@/components/portal/portal-card";
import { Icon } from "@/components/icon";
import { MapConsentGate, useConsent } from "@/components/consent";
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

// Clientseitiges Chunking der Karten-Liste: ~92 Objekte sofort zu rendern ist
// unnötig teuer — die Karte bekommt trotzdem immer den vollen Bestand (Pins/Cluster).
const CARD_CHUNK = 24;

export function PortalView({ estates }: { estates: Estate[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [searchInArea, setSearchInArea] = useState(false);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [visibleCount, setVisibleCount] = useState(CARD_CHUNK);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const { maps: mapsConsent, decided: consentDecided } = useConsent();

  // Bei Filterwechsel (neue estates-Prop von der Seite) wieder von vorn beginnen.
  // SetState während des Renders statt in einem Effect (React-Pattern für
  // „State anhand einer geänderten Prop zurücksetzen", kein Extra-Rerender-Flackern).
  const [prevEstates, setPrevEstates] = useState(estates);
  if (estates !== prevEstates) {
    setPrevEstates(estates);
    setVisibleCount(CARD_CHUNK);
  }

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

  // Nur die Karten-Liste wird gechunkt — die Karte bekommt weiterhin listEstates
  // vollständig (s.u.), Pins/Cluster zeigen also immer den ganzen Kartenausschnitt.
  const visibleEstates = useMemo(
    () => listEstates.slice(0, visibleCount),
    [listEstates, visibleCount],
  );
  const remaining = listEstates.length - visibleEstates.length;

  useEffect(() => {
    if (!activeId) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRefs.current[activeId]?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [activeId]);

  return (
    <div className="grid lg:grid-cols-[1.25fr_1fr]">
      {/* Liste (zuerst im DOM = kanonische Tastatur-/SR-Schnittstelle) */}
      <div className={`${showMapMobile ? "hidden" : "block"} lg:block`}>
        {searchInArea && bounds ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-6 sm:px-8">
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-strong">
              <Icon name="search" size={16} />
              <span key={listEstates.length} className="t-num-d">
                {listEstates.length}
              </span>{" "}
              {listEstates.length === 1 ? "Objekt" : "Objekte"} in diesem Kartenausschnitt
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
                ? "Zoomen Sie heraus oder verschieben Sie die Karte — oder schalten Sie die Bereichssuche wieder aus."
                : "Lockern Sie die Filter oder erweitern Sie den Umkreis."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {searchInArea ? (
                <button
                  type="button"
                  onClick={() => setSearchInArea(false)}
                  className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Icon name="search" size={16} />
                  Bereichssuche ausschalten
                </button>
              ) : (
                <Link
                  href="/immobilien"
                  className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Icon name="layers" size={16} />
                  Filter zurücksetzen
                </Link>
              )}
              <Link
                href="/kontakt"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="mail" size={16} />
                Suchauftrag anlegen
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 px-5 py-6 sm:px-8 xl:grid-cols-2">
              {visibleEstates.map((e) => (
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
            {remaining > 0 && (
              <div className="flex justify-center px-5 pb-10 sm:px-8">
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + CARD_CHUNK)}
                  className="press rounded-full border border-border px-5 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
                >
                  Weitere Objekte anzeigen ({Math.min(remaining, CARD_CHUNK)})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Karte (sticky rechts; mobil per Toggle als Vollfläche) */}
      <div
        className={`${
          showMapMobile ? "block" : "hidden"
        } sticky top-20 h-[calc(100svh-5rem)] lg:block`}
      >
        {/* Search-as-I-move-Umschalter (nur wenn Karte geladen) */}
        {mapsConsent && (
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
        )}

        <MapConsentGate>
          <PortalMap
            estates={estates}
            hoveredId={hoveredId}
            activeId={activeId}
            inAreaIds={inAreaIds}
            onHover={onHover}
            onActivate={onActivate}
            onBoundsChange={onBoundsChange}
          />
        </MapConsentGate>
      </div>

      {/* Mobile-Umschalter Liste/Karte — bewusst unten RECHTS statt -links: der
          Consent-Banner sitzt (ab sm:) unten links und würde den FAB sonst verdecken.
          Auf schmalen Mobilgeräten ist der Banner sogar fast bildschirmbreit — solange
          er offen ist (Erstbesuch, keine Entscheidung), bleibt der FAB deshalb
          ausgeblendet statt unklickbar unter dem Banner zu liegen. */}
      {consentDecided && (
        <button
          type="button"
          onClick={() => setShowMapMobile((v) => !v)}
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          className="fixed right-5 z-50 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent shadow-2xl lg:hidden"
        >
          <Icon name={showMapMobile ? "layers" : "pin"} size={18} />
          {showMapMobile ? "Liste anzeigen" : "Karte anzeigen"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Estate } from "@/lib/mock-estates";
import { formatPriceShort } from "@/lib/format";

// Freier dunkler Vektor-Style (CARTO dark-matter, kein API-Key).
// DSGVO: externer Tile-Call → vor Go-Live hinter Consent-Tool.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function PortalMap({
  estates,
  hoveredId,
  activeId,
  onHover,
  onActivate,
}: {
  estates: Estate[];
  hoveredId: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const elsRef = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [8.4413, 49.3172],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const withGeo = estates.filter((e) => e.geo);
    const bounds = new maplibregl.LngLatBounds();
    for (const e of withGeo) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "riegel-pin";
      el.textContent = formatPriceShort(e);
      el.setAttribute("aria-label", `${e.title} – ${formatPriceShort(e)}`);
      el.addEventListener("mouseenter", () => onHover(e.id));
      el.addEventListener("mouseleave", () => onHover(null));
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onActivate(e.id);
      });
      new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([e.geo!.lng, e.geo!.lat])
        .addTo(map);
      elsRef.current[e.id] = el;
      bounds.extend([e.geo!.lng, e.geo!.lat]);
    }
    if (withGeo.length > 0) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      elsRef.current = {};
    };
  }, [estates, onHover, onActivate]);

  // Pins hervorheben (hovered/active aus der Liste)
  useEffect(() => {
    for (const [id, el] of Object.entries(elsRef.current)) {
      el.classList.toggle("is-active", id === hoveredId || id === activeId);
    }
  }, [hoveredId, activeId]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Karte der Immobilien" />;
}

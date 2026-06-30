"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Freier dunkler Vektor-Style (CARTO dark-matter, kein API-Key) — wie im Portal.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface GeoMapPoint {
  slug: string;
  title: string;
  eyebrow?: string;
  href: string;
  lng: number;
  lat: number;
}

/**
 * Interaktive Standort-Karte (maplibre, dunkel). Pins sind mit der Liste
 * synchronisiert: außerhalb von Suche/Filter werden sie gedimmt, Hover
 * spiegelt sich beidseitig, Klick öffnet die Standortseite.
 */
export function GeoMap({
  points,
  visibleSlugs,
  hoveredSlug,
  onHover,
}: {
  points: GeoMapPoint[];
  visibleSlugs: Set<string>;
  hoveredSlug: string | null;
  onHover: (slug: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const elsRef = useRef<Record<string, HTMLElement>>({});
  const didFit = useRef(false);
  const router = useRouter();
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  // Einmalig: Karte + alle Marker aufbauen.
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      center: [8.35, 49.4],
      zoom: 8.6,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.scrollZoom.disable(); // Seiten-Scroll nicht kapern; Zoom via Buttons/Pinch
    mapRef.current = map;

    const bounds = new maplibregl.LngLatBounds();
    for (const p of points) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "geo-pin";
      el.setAttribute("aria-label", p.title);
      el.tabIndex = -1;
      el.innerHTML = `<span class="geo-pin-dot"></span><span class="geo-pin-label">${
        p.eyebrow ?? p.title
      }</span>`;
      el.addEventListener("mouseenter", () => onHoverRef.current(p.slug));
      el.addEventListener("mouseleave", () => onHoverRef.current(null));
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        router.push(p.href);
      });
      new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
      elsRef.current[p.slug] = el;
      bounds.extend([p.lng, p.lat]);
    }
    if (points.length) map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });

    return () => {
      map.remove();
      mapRef.current = null;
      elsRef.current = {};
    };
  }, [points, router]);

  // Sichtbarkeit (Suche/Filter): nicht passende Pins dimmen + Karte einpassen.
  useEffect(() => {
    // Bei 0 Treffern nicht alles dimmen — sonst „tote" Karte; stattdessen Gesamtbild.
    const hasFilter = visibleSlugs.size > 0;
    for (const [slug, el] of Object.entries(elsRef.current)) {
      el.classList.toggle("is-dimmed", hasFilter && !visibleSlugs.has(slug));
    }
    const map = mapRef.current;
    if (!map) return;
    const shown = points.filter((p) => visibleSlugs.has(p.slug));
    const target = shown.length ? shown : points;
    if (!target.length) return;
    const b = new maplibregl.LngLatBounds();
    target.forEach((p) => b.extend([p.lng, p.lat]));
    // Erste Einpassung instant (deckt sich mit dem Mount-Fit) — keine Schein-Animation.
    const duration = didFit.current ? 650 : 0;
    didFit.current = true;
    map.fitBounds(b, { padding: 64, maxZoom: shown.length === 1 ? 12 : 11, duration });
  }, [visibleSlugs, points]);

  // Hover-Spiegelung Liste ↔ Karte.
  useEffect(() => {
    for (const [slug, el] of Object.entries(elsRef.current)) {
      el.classList.toggle("is-active", slug === hoveredSlug);
    }
  }, [hoveredSlug]);

  return (
    <div
      ref={ref}
      className="h-[360px] w-full overflow-hidden rounded-3xl border border-border sm:h-[440px]"
      role="img"
      aria-label="Karte der Standorte in der Vorderpfalz und im Rhein-Neckar-Raum"
    />
  );
}

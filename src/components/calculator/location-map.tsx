"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { site } from "@/lib/site";

// Markenfarbe als "r, g, b"-Triplet für die rgba()-Glow-Schatten unten —
// hier reicht das simple Hex-Parsing (kein CSS-Zugriff im Canvas/Marker-DOM).
const BRAND_HEX = site.brandColor.replace("#", "");
const BRAND_RGB = [0, 2, 4]
  .map((i) => parseInt(BRAND_HEX.slice(i, i + 2), 16))
  .join(", ");

// Satelliten-Ansicht via Esri World Imagery (kostenlos, kein Key).
const SAT_STYLE = {
  version: 8 as const,
  sources: {
    sat: {
      type: "raster" as const,
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "© Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "sat", type: "raster" as const, source: "sat" }],
};

export function LocationMap({ lat, lng, zoom = 17 }: { lat: number; lng: number; zoom?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: SAT_STYLE as any,
      center: [lng, lat],
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const el = document.createElement("div");
    el.style.cssText =
      `width:18px;height:18px;border-radius:9999px;background:${site.brandColor};border:3px solid #fff;box-shadow:0 0 0 6px rgba(${BRAND_RGB},0.35),0 2px 8px rgba(0,0,0,0.5);`;
    new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, zoom]);

  return <div ref={ref} className="h-full w-full" role="img" aria-label="Satellitenansicht der Immobilie" />;
}

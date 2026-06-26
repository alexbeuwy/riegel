"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
      "width:18px;height:18px;border-radius:9999px;background:#015cff;border:3px solid #fff;box-shadow:0 0 0 6px rgba(1,92,255,0.35),0 2px 8px rgba(0,0,0,0.5);";
    new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, zoom]);

  return <div ref={ref} className="h-full w-full" role="img" aria-label="Satellitenansicht der Immobilie" />;
}

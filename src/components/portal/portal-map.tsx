"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Estate } from "@/lib/mock-estates";
import { formatPriceShort } from "@/lib/format";

// Freier dunkler Vektor-Style (CARTO dark-matter, kein API-Key).
// DSGVO: externer Tile-Call → vor Go-Live hinter Consent-Tool.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// GeoJSON-Cluster-Source (nativ, supercluster unter der Haube von maplibre-gl) —
// löst das Pin-Overlap-Problem bei dicht liegenden Objekten. Einzelobjekte bleiben
// HTML-Marker im Bestands-Look (.riegel-pin), Cluster sind ein Kreis-/Symbol-Layer.
const SOURCE_ID = "riegel-estates";
const CLUSTER_GLOW_LAYER = "riegel-clusters-glow";
const CLUSTER_LAYER = "riegel-clusters";
const CLUSTER_COUNT_LAYER = "riegel-cluster-count";

export interface MapBounds {
  n: number;
  s: number;
  e: number;
  w: number;
}

type EstateFeature = GeoJSON.Feature<GeoJSON.Point, { id: string }>;

/** GeoJSON-FeatureCollection aus allen Objekten mit Geo-Koordinaten. */
function toFeatureCollection(estates: Estate[]): GeoJSON.FeatureCollection<GeoJSON.Point, { id: string }> {
  const features: EstateFeature[] = [];
  for (const e of estates) {
    if (!e.geo) continue;
    features.push({
      type: "Feature",
      properties: { id: e.id },
      geometry: { type: "Point", coordinates: [e.geo.lng, e.geo.lat] },
    });
  }
  return { type: "FeatureCollection", features };
}

export function PortalMap({
  estates,
  hoveredId,
  activeId,
  inAreaIds,
  onHover,
  onActivate,
  onBoundsChange,
}: {
  estates: Estate[];
  hoveredId: string | null;
  activeId: string | null;
  /** Wenn gesetzt: nur diese IDs gelten als „im Kartenausschnitt" (dimmt den Rest). */
  inAreaIds?: Set<string> | null;
  onHover: (id: string | null) => void;
  onActivate: (id: string | null) => void;
  onBoundsChange?: (b: MapBounds) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Style-/Tile-Ladefehler (z. B. CARTO-Ausfall): einmaliger, dezenter Hinweis
  // statt Spam bei jedem erneuten Fehl-Request. Pins bleiben dank Fallback
  // (Initial-Schleife unten) auch ohne Kartenkacheln sichtbar.
  const [tileError, setTileError] = useState(false);
  const tileErrorShownRef = useRef(false);
  // Marker je Objekt-ID. Vor dem ersten Cluster-Sync: alle Objekte (Fallback).
  // Danach: nur die aktuell NICHT geclusterten Punkte (Rest steckt im Cluster-Layer).
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const estateByIdRef = useRef<Map<string, Estate>>(new Map());
  // Aktuelle Hover-/Aktiv-/Bereichs-Zustände als Ref: Marker entstehen asynchron
  // (Pan/Zoom löst Objekte aus einem Cluster), neu erzeugte Marker brauchen den
  // aktuellen Zustand sofort statt erst beim nächsten Props-Wechsel.
  const hoveredIdRef = useRef(hoveredId);
  const activeIdRef = useRef(activeId);
  const inAreaIdsRef = useRef(inAreaIds);
  // onHover/onActivate/onBoundsChange als Ref, damit der Map-Init-Effect nicht neu läuft.
  // Zuweisung im Effect statt im Render-Body (react-hooks/refs).
  const onHoverRef = useRef(onHover);
  const onActivateRef = useRef(onActivate);
  const boundsCbRef = useRef(onBoundsChange);
  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    inAreaIdsRef.current = inAreaIds;
  }, [inAreaIds]);
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);
  useEffect(() => {
    boundsCbRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    tileErrorShownRef.current = false;
    setTileError(false);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [8.4413, 49.3172],
      zoom: 10,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Einmaliger Hinweis bei Style-/Tile-Ladefehlern — MapLibre feuert "error"
    // z. B. bei jedem fehlgeschlagenen Kachel-Request, ohne Guard würde das
    // den Nutzer mit wiederholten State-Updates zuspammen.
    map.on("error", () => {
      if (tileErrorShownRef.current) return;
      tileErrorShownRef.current = true;
      setTileError(true);
    });

    const withGeo = estates.filter((e) => e.geo);
    estateByIdRef.current = new Map(withGeo.map((e) => [e.id, e]));

    const emitBounds = () => {
      const b = map.getBounds();
      boundsCbRef.current?.({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() });
    };

    /** Erzeugt den HTML-Marker (Preis-Pill) für ein Objekt, falls noch nicht vorhanden. */
    const ensureMarker = (estate: Estate) => {
      if (!estate.geo || markersRef.current[estate.id]) return;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "riegel-pin";
      el.textContent = formatPriceShort(estate);
      // Karte ist visuelle Repräsentation der Liste → Pins aus Tab-/SR-Reihenfolge nehmen.
      el.tabIndex = -1;
      el.setAttribute("aria-hidden", "true");
      el.addEventListener("mouseenter", () => onHoverRef.current(estate.id));
      el.addEventListener("mouseleave", () => onHoverRef.current(null));
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onActivateRef.current(estate.id);
      });
      el.classList.toggle("is-active", estate.id === hoveredIdRef.current || estate.id === activeIdRef.current);
      el.classList.toggle("is-dimmed", !!inAreaIdsRef.current && !inAreaIdsRef.current.has(estate.id));

      markersRef.current[estate.id] = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([estate.geo.lng, estate.geo.lat])
        .addTo(map);
    };

    // Sofort alle Objekte als Marker zeigen — unabhängig davon, ob/wann der
    // Cluster-Layer bereit ist. Fällt der Style/das Tile-Netz aus, bleibt die
    // Karte trotzdem nutzbar (nur ohne Clustering) statt leer.
    for (const e of withGeo) ensureMarker(e);

    /**
     * Blendet Marker aus, die laut Cluster-Source aktuell Teil eines Clusters
     * sind, und erzeugt sie bei Bedarf neu (z. B. nach Herauszoomen aus einem
     * Cluster). Ohne Source (Style noch nicht geladen) ein No-op — dann bleiben
     * alle Marker aus der Initial-Schleife sichtbar.
     */
    const syncMarkers = () => {
      if (!map.getSource(SOURCE_ID)) return;
      let features: maplibregl.GeoJSONFeature[];
      try {
        features = map.querySourceFeatures(SOURCE_ID, { filter: ["!", ["has", "point_count"]] });
      } catch {
        return; // Source noch nicht bereit
      }
      const seen = new Set<string>();
      for (const f of features) {
        const id = f.properties?.id as string | undefined;
        if (id) seen.add(id);
      }
      for (const id of seen) {
        const estate = estateByIdRef.current.get(id);
        if (estate) ensureMarker(estate);
      }
      // Marker entfernen, die jetzt Teil eines Clusters sind.
      for (const [id, marker] of Object.entries(markersRef.current)) {
        if (!seen.has(id)) {
          marker.remove();
          delete markersRef.current[id];
        }
      }
    };

    map.on("moveend", () => {
      emitBounds();
      syncMarkers();
    });
    map.on("sourcedata", (e) => {
      if (e.sourceId === SOURCE_ID && map.isSourceLoaded(SOURCE_ID)) syncMarkers();
    });

    map.on("load", () => {
      // CARTO dark-matter liefert Labels (Länder/Bundesländer/Städte) standardmäßig
      // englisch bzw. in Landessprache (OpenMapTiles-"name"-Feld) — auf Deutsch
      // umstellen (name:de mit Fallback auf name:latin/name). Pro Layer abgesichert,
      // falls ein Symbol-Layer kein Namensfeld hat (z. B. reine POI-Icons).
      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol" && layer.layout && "text-field" in layer.layout) {
          try {
            map.setLayoutProperty(layer.id, "text-field", [
              "coalesce",
              ["get", "name:de"],
              ["get", "name:latin"],
              ["get", "name"],
            ]);
          } catch {
            // Layer ohne name-Feld — überspringen statt crashen.
          }
        }
      }

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(estates),
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 52,
      });

      // Dezenter Glow: weicher, größerer Kreis unter dem eigentlichen Cluster-Kreis.
      map.addLayer({
        id: CLUSTER_GLOW_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#015CFF",
          "circle-opacity": 0.28,
          "circle-blur": 0.75,
          "circle-radius": ["step", ["get", "point_count"], 28, 10, 34, 25, 42],
        },
      });
      // Cluster-Kreis im RIEGEL-Akzent, weiße Zahl obendrauf.
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#015CFF",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 25],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(11, 11, 13, 0.92)",
        },
      });
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Montserrat Medium", "Open Sans Bold", "Noto Sans Regular"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.on("mouseenter", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      // Cluster-Klick: sanfter Zoom auf die Expansion-Zoomstufe statt hartem Sprung.
      map.on("click", CLUSTER_LAYER, (ev) => {
        const feature = ev.features?.[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (!feature || clusterId == null) return;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      syncMarkers();
    });

    const bounds = new maplibregl.LngLatBounds();
    for (const e of withGeo) bounds.extend([e.geo!.lng, e.geo!.lat]);
    if (withGeo.length > 0) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
    }
    map.once("idle", emitBounds);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [estates]);

  // Pins außerhalb des Ausschnitts dimmen (Search-this-area).
  useEffect(() => {
    for (const [id, marker] of Object.entries(markersRef.current)) {
      marker.getElement().classList.toggle("is-dimmed", !!inAreaIds && !inAreaIds.has(id));
    }
  }, [inAreaIds]);

  // Pins hervorheben (hovered/active aus der Liste)
  useEffect(() => {
    for (const [id, marker] of Object.entries(markersRef.current)) {
      marker.getElement().classList.toggle("is-active", id === hoveredId || id === activeId);
    }
  }, [hoveredId, activeId]);

  const count = estates.filter((e) => e.geo).length;
  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="img"
        aria-label={`Karte mit ${count} ${count === 1 ? "Objekt" : "Objekten"} — Auswahl und Bedienung über die Liste`}
      />
      {tileError && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg bg-bg/80 px-3 py-2 text-xs text-muted backdrop-blur">
          Kartendaten momentan nicht erreichbar — die Liste zeigt alle Objekte.
        </div>
      )}
    </div>
  );
}

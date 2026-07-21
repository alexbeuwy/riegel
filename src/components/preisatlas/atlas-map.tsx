"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MarktOrt } from "@/lib/marktdaten";

// Freier dunkler Vektor-Style (CARTO dark-matter, kein API-Key) — wie geo-map.tsx,
// aber LABELFREI: bei 18 dicht stehenden Marktorten überdeckten unsere Preis-Punkte
// sonst die Ortsnamen der Basiskarte. Wir beschriften die Orte stattdessen selbst
// (siehe Label-Chip je Marker unten) — keine doppelten/kollidierenden Namen mehr.
const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const nf = new Intl.NumberFormat("de-DE");

/** Motion-Token in ms auslesen statt Kamera-Dauern hart zu codieren (Drift-Schutz). */
function tokenMs(varName: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export interface AtlasMapProps {
  orte: MarktOrt[];
  /** Aktuell ausgewählter Ort (Ring/Puls-Hervorhebung); null = keine Auswahl. */
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

/**
 * Interaktive Preiskarte der Region (maplibre, dunkel, Vorlage geo-map.tsx).
 * Kreis-Marker sind nach `wohnung.max` eingefärbt (faint → accent) und
 * skaliert; Hover zeigt Ortsname + Wohnungs-Spanne, Klick meldet den Slug
 * nach oben. Rendert nur hinter MapConsentGate (Aufrufer-Pflicht).
 */
export function AtlasMap({ orte, selectedSlug, onSelect }: AtlasMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Record<
      string,
      { marker: maplibregl.Marker; el: HTMLButtonElement; dot: HTMLSpanElement; ring: HTMLSpanElement; label: HTMLSpanElement }
    >
  >({});
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  // Aktueller Auswahl-Slug + die im Mount-Effect gebaute Kollisions-Funktion —
  // beide werden aus dem Selection-Effect heraus gebraucht (s. u.), müssen aber
  // als Ref durchgereicht werden, da sie in unterschiedlichen Effects entstehen.
  const selectedSlugRef = useRef<string | null>(null);
  const updateLabelVisibilityRef = useRef<() => void>(() => {});
  // "Latest ref" erst im Effect schreiben — Refs dürfen nicht während des Renders
  // mutiert werden (react-hooks/refs), sonst drohen inkonsistente Zwischenstände.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Einmalig: Karte + alle Preis-Marker aufbauen.
  // Hinweis für Aufrufer: `orte` sollte referenzstabil sein (z. B. via
  // useMemo/Modul-Konstante) — ein Referenzwechsel baut die Karte neu auf,
  // exakt wie beim GeoMap-Vorbild.
  useEffect(() => {
    if (!ref.current || mapRef.current || orte.length === 0) return;
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

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
    popupRef.current = popup;

    const max = Math.max(...orte.map((o) => o.wohnung.max));
    const min = Math.min(...orte.map((o) => o.wohnung.max));
    const span = Math.max(1, max - min);

    const bounds = new maplibregl.LngLatBounds();
    // Einmalig gemessene Chip-Größe je Ort (s. Kollisionsvermeidung unten).
    const labelSize: Record<string, { w: number; h: number }> = {};
    for (const ort of orte) {
      const t = (ort.wohnung.max - min) / span; // 0..1 Preisniveau relativ zur Region
      const pct = Math.round(t * 100);
      const dotSize = 14 + t * 16; // 14..30px sichtbarer Preis-Punkt
      // Hit-Area etwas größer als der sichtbare Punkt (Mindest-Treffziel-Prinzip),
      // aber NICHT die vollen 40px: bei 18 dicht stehenden Orten in der Region
      // würden sich unsichtbare 40px-Zonen sonst gegenseitig überlappen.
      const hitSize = dotSize + 12;

      const el = document.createElement("button");
      el.type = "button";
      el.tabIndex = -1; // Maus/Touch-Layer; Tastatur läuft über OrtsChips/Select
      el.setAttribute(
        "aria-label",
        `${ort.name}: Wohnung ${nf.format(ort.wohnung.min)}–${nf.format(ort.wohnung.max)} €/m²`,
      );
      el.style.position = "relative";
      el.style.width = `${hitSize}px`;
      el.style.height = `${hitSize}px`;
      el.style.padding = "0";
      el.style.border = "none";
      el.style.background = "transparent";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";

      // Sichtbarer Preis-Punkt — eigenes Kind, damit Hit-Area und Optik getrennt skalieren.
      const dot = document.createElement("span");
      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.borderRadius = "9999px";
      // Border referenziert --color-bg statt den Hex-Wert als rgba(11,11,13,…)
      // zu duplizieren (würde bei Token-Änderungen sonst stumm drift-en).
      dot.style.border = "2px solid color-mix(in srgb, var(--color-bg) 85%, transparent)";
      dot.style.boxShadow = "0 2px 8px rgba(0,0,0,0.5)";
      // Farb-Interpolation faint→accent bleibt an die Design-Tokens gebunden
      // (color-mix statt gehardcodeter Hex-Werte, die aus globals.css drifted).
      dot.style.background = `color-mix(in srgb, var(--color-accent) ${pct}%, var(--color-faint))`;
      dot.style.transition = `transform var(--duration-fast) var(--ease-smooth-out), box-shadow var(--duration-fast) var(--ease-smooth-out)`;
      dot.style.pointerEvents = "none";

      // Puls-Ring für die Auswahl — eigenes Kind, standardmäßig unsichtbar.
      const ring = document.createElement("span");
      ring.style.position = "absolute";
      ring.style.inset = "0";
      ring.style.borderRadius = "9999px";
      ring.style.background = "var(--color-accent)";
      ring.style.pointerEvents = "none";
      ring.style.display = "none";
      if (!reduceMotion) ring.className = "animate-ping";

      // Eigenes Ortsnamen-Label statt der (jetzt ausgeblendeten) Basiskarten-Labels —
      // dezenter dunkler Chip unter dem Punkt, damit der Name auf jedem Kartenbereich
      // lesbar bleibt. pointer-events:none: der Chip darf die Klick-Hitbox nicht stören.
      const label = document.createElement("span");
      label.textContent = ort.name;
      label.setAttribute("aria-hidden", "true"); // Name steckt schon im aria-label des Buttons
      label.style.position = "absolute";
      label.style.top = "100%";
      label.style.left = "50%";
      label.style.transform = "translate(-50%, 4px)";
      label.style.whiteSpace = "nowrap";
      label.style.pointerEvents = "none";
      label.style.fontSize = "11px";
      label.style.fontWeight = "500";
      label.style.lineHeight = "1";
      label.style.letterSpacing = "0.01em";
      label.style.padding = "3px 8px";
      label.style.borderRadius = "9999px";
      label.style.color = "var(--color-fg)";
      label.style.background = "color-mix(in srgb, var(--color-bg) 78%, transparent)";
      label.style.border = "1px solid color-mix(in srgb, var(--color-border) 92%, transparent)";
      label.style.boxShadow = "0 2px 6px rgba(0,0,0,0.35)";
      label.style.transition = `color var(--duration-fast) var(--ease-smooth-out), border-color var(--duration-fast) var(--ease-smooth-out), background-color var(--duration-fast) var(--ease-smooth-out), opacity var(--duration-fast) var(--ease-smooth-out)`;

      el.append(ring, dot, label);

      el.addEventListener("mouseenter", () => {
        dot.style.transform = "scale(1.25)";
        label.style.opacity = "1"; // Hover gewinnt immer gegen die Kollisionsvermeidung
        popup.setLngLat([ort.lng, ort.lat]).setDOMContent(popupContent(ort)).addTo(map);
        stylePopup(popup);
      });
      el.addEventListener("mouseleave", () => {
        dot.style.transform = "scale(1)";
        popup.remove();
        updateLabelVisibilityRef.current(); // ggf. wieder ausblenden, falls kollidierend
      });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current(ort.slug);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([ort.lng, ort.lat]).addTo(map);
      markersRef.current[ort.slug] = { marker, el, dot, ring, label };
      // Chip-Größe einmalig messen (Element ist über addTo bereits im DOM) —
      // Grundlage für die Kollisionserkennung unten, Text/Padding ändern sich
      // nach dem Erstellen nicht mehr, daher reicht eine einmalige Messung.
      labelSize[ort.slug] = { w: label.offsetWidth, h: label.offsetHeight };
      bounds.extend([ort.lng, ort.lat]);
    }
    map.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });

    // Kollisionsvermeidung für die selbstgezeichneten Ortsnamen-Label: bei der
    // initialen Gesamtansicht (18 dicht stehende Marktorte, z. B. Otterstadt/
    // Waldsee/Schifferstadt) überlappen sich sonst benachbarte Chips — statt
    // fixer Offsets werden die aktuellen Bildschirmpositionen + die einmalig
    // gemessene Chip-Größe genutzt, um kollidierende, niedriger priorisierte
    // Label pro Frame auszublenden (höherer Wohnungspreis bzw. aktuelle
    // Auswahl gewinnt — dieselbe Priorität wie die Punktgröße oben).
    //
    // Zwei Hindernis-Arten neben anderen Labels: (1) die Punkt-Hitboxen aller
    // Orte — IMMER ein Hindernis, unabhängig davon, ob deren eigenes Label
    // gerade sichtbar ist, sonst ragt ein dicht benachbartes Label unter einen
    // fremden Punkt und wirkt dort wie ein abgeschnittenes Text-Fragment (s.
    // Speyer/Hockenheim-Fall); (2) der Kartenrand — der Container ist
    // `overflow-hidden`, ein dort hinausragendes Label würde sonst hart
    // gekappt statt sauber zu verschwinden.
    const updateLabelVisibility = () => {
      const GAP = 3;
      type Rect = { left: number; right: number; top: number; bottom: number };
      type Box = Rect & { slug: string; weight: number };
      const containerWidth = ref.current?.clientWidth ?? 0;
      const containerHeight = ref.current?.clientHeight ?? 0;

      const boxes: Box[] = [];
      const dotBoxes: (Rect & { slug: string })[] = [];
      for (const ort of orte) {
        const entry = markersRef.current[ort.slug];
        if (!entry) continue;
        const p = map.project([ort.lng, ort.lat]);
        const hitSize = parseFloat(entry.el.style.height) || 0;
        // Dot-Box zentriert am Punkt, gleiche hitSize wie die Hit-Area des Markers.
        dotBoxes.push({
          slug: ort.slug,
          left: p.x - hitSize / 2,
          right: p.x + hitSize / 2,
          top: p.y - hitSize / 2,
          bottom: p.y + hitSize / 2,
        });
        const size = labelSize[ort.slug];
        if (!size) continue;
        const top = p.y + hitSize / 2 + 4;
        boxes.push({
          slug: ort.slug,
          left: p.x - size.w / 2,
          right: p.x + size.w / 2,
          top,
          bottom: top + size.h,
          weight: ort.slug === selectedSlugRef.current ? Number.POSITIVE_INFINITY : ort.wohnung.max,
        });
      }
      boxes.sort((a, b) => b.weight - a.weight);
      const overlapsRect = (a: Rect, b: Rect) =>
        a.left < b.right + GAP && a.right > b.left - GAP && a.top < b.bottom + GAP && a.bottom > b.top - GAP;
      const accepted: Box[] = [];
      for (const box of boxes) {
        const overlapsLabel = accepted.some((o) => overlapsRect(box, o));
        // Fremde Punkte zählen immer als Hindernis (auch wenn deren eigenes
        // Label gerade unsichtbar ist); den eigenen Punkt ignorieren — das
        // Label sitzt ohnehin direkt darunter (s. `top` oben) und würde sich
        // sonst grundlos selbst blockieren.
        const overlapsDot = dotBoxes.some((d) => d.slug !== box.slug && overlapsRect(box, d));
        const overlapsEdge =
          box.left < 0 || box.right > containerWidth || box.top < 0 || box.bottom > containerHeight;
        const overlaps = overlapsLabel || overlapsDot || overlapsEdge;
        const show = !overlaps || box.slug === selectedSlugRef.current;
        if (show) accepted.push(box);
        markersRef.current[box.slug].label.style.opacity = show ? "1" : "0";
      }
    };
    updateLabelVisibilityRef.current = updateLabelVisibility;

    // Erst direkt, dann nochmal nach einem Frame (falls fitBounds die
    // Kamera-Transform nicht synchron anwendet) — plus laufend bei Zoom/Pan/
    // Resize, da sich Bildschirmpositionen dabei ändern.
    updateLabelVisibility();
    let raf = requestAnimationFrame(updateLabelVisibility);
    let scheduled = false;
    const scheduleUpdate = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(() => {
        scheduled = false;
        updateLabelVisibility();
      });
    };
    map.on("zoom", scheduleUpdate);
    map.on("move", scheduleUpdate);
    map.on("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(raf);
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
      markersRef.current = {};
    };
  }, [orte]);

  // Auswahl visuell hervorheben: Halo-Ring (zwei Tokens statt Alpha-Hex) + Puls.
  useEffect(() => {
    const map = mapRef.current;
    // Kollisions-Priorität der Auswahl mitgeben (s. updateLabelVisibility oben)
    // und sofort neu berechnen — die Auswahl soll unabhängig von Überlappung
    // immer sichtbar sein, nicht erst beim nächsten Zoom/Pan.
    selectedSlugRef.current = selectedSlug;
    updateLabelVisibilityRef.current();
    for (const [slug, { el, dot, ring, label, marker }] of Object.entries(markersRef.current)) {
      const active = slug === selectedSlug;
      dot.style.boxShadow = active
        ? "0 0 0 3px var(--color-bg), 0 0 0 6px var(--color-accent), 0 2px 8px rgba(0,0,0,0.5)"
        : "0 2px 8px rgba(0,0,0,0.5)";
      dot.style.transform = active ? "scale(1.2)" : "scale(1)";
      // Ausgewählter Ort: Label optisch hervorheben (Akzent-Rand/-Text, höheres
      // Gewicht) UND per z-index vor benachbarte Chips heben — sonst würde ein
      // dichter stehender Nachbar-Ort den hervorgehobenen Namen überdecken.
      el.style.zIndex = active ? "5" : "0";
      label.style.color = active ? "var(--color-accent-strong)" : "var(--color-fg)";
      label.style.borderColor = active
        ? "var(--color-accent)"
        : "color-mix(in srgb, var(--color-border) 92%, transparent)";
      label.style.background = active
        ? "color-mix(in srgb, var(--color-bg) 92%, transparent)"
        : "color-mix(in srgb, var(--color-bg) 78%, transparent)";
      label.style.fontWeight = active ? "600" : "500";
      ring.style.display = active ? "block" : "none";
      if (active && map) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        map.easeTo({ center: marker.getLngLat(), duration: reduce ? 0 : tokenMs("--duration-very-slow", 500) });
      }
    }
  }, [selectedSlug]);

  return (
    <div
      ref={ref}
      className="h-[360px] w-full overflow-hidden rounded-3xl border border-border sm:h-[440px]"
      role="img"
      aria-label="Preiskarte der Region: Kreisgröße und Farbe zeigen das Wohnungspreisniveau je Standort"
    />
  );
}

/** Popup-Inhalt per DOM-API (kein innerHTML) — Ortsname + Wohnungs-Spanne, tabular-nums. */
function popupContent(ort: MarktOrt): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.minWidth = "9rem";
  wrap.style.fontFamily = "var(--font-sans)";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.style.fontSize = "13px";
  title.style.marginBottom = "4px";
  title.textContent = ort.name;

  const sub = document.createElement("div");
  sub.style.fontSize = "12px";
  sub.style.opacity = "0.85";
  sub.style.fontVariantNumeric = "tabular-nums";
  sub.textContent = `Wohnung ${nf.format(ort.wohnung.min)}–${nf.format(ort.wohnung.max)} €/m²`;

  wrap.append(title, sub);
  return wrap;
}

/** Dunkles Popup-Styling direkt am maplibre-Container — globals.css bleibt unangetastet. */
function stylePopup(popup: maplibregl.Popup) {
  const el = popup.getElement();
  if (!el) return;
  const content = el.querySelector<HTMLElement>(".maplibregl-popup-content");
  if (content) {
    content.style.background = "var(--color-surface)";
    content.style.color = "var(--color-fg)";
    content.style.border = "1px solid var(--color-border)";
    content.style.borderRadius = "12px";
    content.style.boxShadow = "0 8px 30px rgba(0,0,0,0.55)";
    content.style.padding = "10px 12px";
  }
  const tip = el.querySelector<HTMLElement>(".maplibregl-popup-tip");
  if (tip) tip.style.display = "none";
}

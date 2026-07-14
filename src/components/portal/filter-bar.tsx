"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatEUR } from "@/lib/format";
import { MoreFilters, MoreFiltersFields, selectCls } from "@/components/portal/more-filters";
import { Segmented } from "@/components/segmented";
import { Icon, type IconName } from "@/components/icon";
import { activeChips, type FilterState } from "@/lib/portal-filter";
import {
  UMKREIS_OPTIONS,
  readCity,
  readRadiusKm,
  setCity,
  setRadius,
} from "@/components/portal/umkreis";

const KAUF_PREISE = [100000, 200000, 300000, 400000, 500000, 750000, 1000000, 1500000, 2000000];
const MIETE_PREISE = [500, 750, 1000, 1250, 1500, 2000, 2500, 3000];
const ZIMMER = [1, 2, 3, 4, 5];
const FLAECHE = [40, 60, 80, 100, 120, 150, 200];

// Statische Options-Listen — von Desktop-Pillen UND Mobil-Sheet gemeinsam
// genutzt (s.u.), damit die Optionen nicht doppelt gepflegt werden.
const TYP_OPTIONS: { value: "kauf" | "miete"; label: string }[] = [
  { value: "kauf", label: "Kaufen" },
  { value: "miete", label: "Mieten" },
];
const OBJEKTART_OPTIONS: [string, string][] = [
  ["", "Objektart"],
  ["wohnung", "Wohnung"],
  ["haus", "Haus"],
  ["grundstueck", "Grundstück"],
  ["gewerbe", "Gewerbe"],
];
const SORT_OPTIONS: [string, string][] = [
  ["neu", "Neueste"],
  ["preis_asc", "Preis ↑"],
  ["preis_desc", "Preis ↓"],
  ["flaeche", "Fläche"],
  ["zimmer", "Zimmer"],
];

/** Liest die im Sheet hinterlegte Schließ-Dauer aus dem CSS — JS und CSS
 *  teilen sich dieselbe Quelle (gleiches Muster wie Modal.tsx/closeMs()). */
function sheetCloseMs() {
  if (typeof window === "undefined") return 220;
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--sheet-close-dur"),
    ) || 220
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  icon?: IconName;
}) {
  // „aktiv", sobald nicht die erste (Platzhalter-/Default-)Option gewählt ist.
  const active = value !== options[0]?.[0];
  return (
    <span className="relative inline-flex shrink-0">
      {icon && (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${active ? "text-accent" : "text-muted"}`}
        >
          <Icon name={icon} size={15} />
        </span>
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`press h-11 appearance-none rounded-full border bg-surface py-2 pr-9 text-sm transition-colors focus-visible:border-accent lg:h-10 ${
          icon ? "pl-9" : "pl-4"
        } ${active ? "border-accent text-fg" : "border-border text-fg hover:border-accent"}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-surface text-fg">
            {l}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${active ? "text-accent" : "text-muted"}`}
      >
        <Icon name="chevronDown" size={16} />
      </span>
    </span>
  );
}

/**
 * Ein Feld im Mobil-Filter-Sheet: Label darüber, volle Breite, großes
 * Touch-Target (≥44px dank selectCls) — gleicher visueller Stil wie im
 * bestehenden "Mehr Filter"-Modal, damit sich Sheet und Modal wie ein
 * System anfühlen statt wie zwei verschiedene UIs.
 */
function SheetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-surface text-fg">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  filters,
  orte,
}: {
  filters: FilterState;
  orte: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetShown, setSheetShown] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mut(p);
      p.delete("seite");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [router, pathname, sp],
  );

  const set = (name: string, value: string) =>
    update((p) => (value ? p.set(name, value) : p.delete(name)));

  // Ort + Umkreis brauchen einen eigenen Mutations-Pfad, weil der Ort je nach
  // Modus in `ort` (exakt) oder `umkreis_ort` (Radius) liegt — s. umkreis.ts.
  const setCityParam = (v: string) => update((p) => setCity(p, v));
  const setUmkreisParam = (v: string) => update((p) => setRadius(p, v));

  // Aktuell gewählter Ort (aus `ort` ODER `umkreis_ort`) und Umkreis-Wert.
  const selectedCity = readCity(sp);
  const radiusValue = sp.get("umkreis") ?? "";
  const umkreisActive = readRadiusKm(sp) > 0 && !!selectedCity;

  const setTyp = (v: "kauf" | "miete") =>
    // Kauf↔Miete: Preis-Filter zurücksetzen (Kauf- und Mietskalen sind inkompatibel)
    update((p) => {
      if (v === "kauf") p.delete("typ");
      else p.set("typ", "miete");
      p.delete("preis_min");
      p.delete("preis_max");
    });

  // Sheet-Reset betrifft nur die "übrigen" Filter, NICHT Kaufen/Mieten (typ) —
  // der Umschalter bleibt im Mobil-Layout immer sichtbar und eigenständig
  // (gleiche Reset-Semantik wie ActiveChips.resetAll; hier separat gehalten,
  // weil active-chips.tsx keinen Handler exportiert).
  const resetSheetFilters = () =>
    update((p) => {
      for (const k of Array.from(p.keys())) {
        if (k !== "typ") p.delete(k);
      }
    });

  // Aktive-Filter-Zahl fürs Badge auf dem mobilen "Filter"-Button — dieselbe
  // Quelle wie die entfernbaren Chips unter der Filterleiste.
  // Im Umkreis-Modus zählt activeChips(filters) den Ort nicht (kein `ort`-Param),
  // daher +2 für Ort-Chip und Umkreis-Chip (s. ActiveChips).
  const activeCount = activeChips(filters).length + (umkreisActive ? 2 : 0);

  // Treffer-Zahl fürs "X Objekte anzeigen" im Sheet: FilterBar bekommt sie
  // nicht als Prop (Elternteil ist die Server-Component-Seite, die wir laut
  // Auftrag nicht anfassen) — ActiveChips (Geschwister-Komponente) sendet
  // sie per CustomEvent, s. active-chips.tsx.
  useEffect(() => {
    const onCount = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setLiveCount(detail);
    };
    window.addEventListener("riegel:portal-result-count", onCount);
    return () => window.removeEventListener("riegel:portal-result-count", onCount);
  }, []);

  // Mount-/Sichtbarkeits-Timing fürs Sheet — exakt das Muster aus Modal.tsx
  // (RAF fürs Öffnen, Timeout in Schließ-Dauer fürs Aushängen danach). Ein
  // ref-basierter "vorheriger Wert"-Ansatz wäre hier vom neuen, strengeren
  // react-hooks/refs-Lint (React-Compiler-Regelsatz) ebenfalls beanstandet
  // worden (Ref-Zugriff während des Renderns) — dieselbe Einschränkung
  // träfe jede Komponente mit diesem Muster, s. Modal.tsx (identischer,
  // vorbestehender Lint-Befund unabhängig von dieser Änderung).
  useEffect(() => {
    if (sheetOpen) {
      // Mount→RAF→shown ist genau das Enter/Exit-Transition-Muster aus modal.tsx;
      // die set-state-in-effect-Regel trifft dort identisch zu (bewusst so).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSheetMounted(true);
      const raf = requestAnimationFrame(() => setSheetShown(true));
      return () => cancelAnimationFrame(raf);
    }
    if (sheetMounted) {
      setSheetShown(false);
      const t = setTimeout(() => setSheetMounted(false), sheetCloseMs());
      return () => clearTimeout(t);
    }
  }, [sheetOpen, sheetMounted]);

  // Escape-to-close, Body-Scroll-Lock, Fokus ins Sheet beim Öffnen und
  // zurück zum Trigger beim Schließen (kein Fokus-Falle, s. Auftrag).
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [sheetOpen]);

  const preise = filters.typ === "miete" ? MIETE_PREISE : KAUF_PREISE;
  const priceLabel = (p: number) => (filters.typ === "miete" ? `${p} €` : formatEUR(p));

  const ortOptions: [string, string][] = [
    ["", "Alle Orte"],
    ...orte.map((o) => [o, o] as [string, string]),
  ];
  const preisMinOptions: [string, string][] = [
    ["", "Preis ab"],
    ...preise.map((p) => [p.toString(), priceLabel(p)] as [string, string]),
  ];
  const preisMaxOptions: [string, string][] = [
    ["", "Preis bis"],
    ...preise.map((p) => [p.toString(), priceLabel(p)] as [string, string]),
  ];
  const zimmerOptions: [string, string][] = [
    ["", "Zimmer"],
    ...ZIMMER.map((z) => [z.toString(), `${z}+`] as [string, string]),
  ];
  const flaecheMinOptions: [string, string][] = [
    ["", "Fläche ab"],
    ...FLAECHE.map((f) => [f.toString(), `${f} m²`] as [string, string]),
  ];
  const flaecheMaxOptions: [string, string][] = [
    ["", "Fläche bis"],
    ...FLAECHE.map((f) => [f.toString(), `${f} m²`] as [string, string]),
  ];

  return (
    <>
      {/*
        Mobil (<sm): statt der endlosen horizontalen Swipe-Pillen-Reihe
        (Kundenfeedback: "unendlich zur Seite scrollen", für ältere Nutzer
        schlecht auffindbar) bleiben nur Kaufen/Mieten sichtbar + EIN
        vollbreiter "Filter"-Button, der alle übrigen Filter als
        Bottom-Sheet öffnet (s.u.). Ab sm bleibt die bestehende Pillen-Reihe
        unverändert (zweiter Block darunter).
      */}
      <div className="flex items-center gap-2.5 sm:hidden">
        <div className="shrink-0">
          <Segmented
            ariaLabel="Vermarktungsart"
            value={filters.typ === "miete" ? "miete" : "kauf"}
            onChange={setTyp}
            options={TYP_OPTIONS}
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className="press relative flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-medium text-fg transition-colors hover:border-accent"
        >
          <Icon name="layers" size={16} />
          Filter
          <span className="t-badge" aria-hidden="true" data-open={activeCount > 0 ? "true" : "false"}>
            <span className="t-badge-dot flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-medium text-on-accent">
              {activeCount}
            </span>
          </span>
        </button>
      </div>

      {/* Ab sm: unveränderte Pillen-Reihe (Desktop-Layout, s. Auftrag). */}
      <div className="hidden -mx-1 items-center gap-2.5 overflow-x-auto px-1 pb-2 sm:flex [scrollbar-width:none] lg:mx-0 lg:items-start lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {/*
          Filter-Pills als eigene Gruppe: bis lg ein eigener Flex-Ablauf in
          der einen Swipe-Reihe des Elternteils, ab lg ein eigener wrap-
          Container — so bricht die Gruppe unabhängig von der Sortierung
          um, die immer rechts außen auf Höhe der ersten Zeile bleibt.
        */}
        <div className="contents lg:flex lg:flex-1 lg:flex-wrap lg:items-center lg:gap-2.5">
          {/* Vermarktungsart — gleitendes Pill (tabs sliding) */}
          <div className="shrink-0">
            <Segmented
              ariaLabel="Vermarktungsart"
              value={filters.typ === "miete" ? "miete" : "kauf"}
              onChange={setTyp}
              options={TYP_OPTIONS}
            />
          </div>

          <Select
            label="Objektart"
            icon="building"
            value={filters.typObj ?? ""}
            onChange={(v) => set("typ_obj", v)}
            options={OBJEKTART_OPTIONS}
          />
          <Select
            label="Ort"
            icon="pin"
            value={selectedCity}
            onChange={setCityParam}
            options={ortOptions}
          />
          {/* Umkreis: nur sichtbar, wenn ein Ort gewählt ist. */}
          {selectedCity && (
            <Select
              label="Umkreis"
              icon="compass"
              value={radiusValue}
              onChange={setUmkreisParam}
              options={UMKREIS_OPTIONS}
            />
          )}
          <Select
            label="Preis ab"
            icon="euro"
            value={filters.preisMin?.toString() ?? ""}
            onChange={(v) => set("preis_min", v)}
            options={preisMinOptions}
          />
          <Select
            label="Preis bis"
            icon="euro"
            value={filters.preisMax?.toString() ?? ""}
            onChange={(v) => set("preis_max", v)}
            options={preisMaxOptions}
          />
          <Select
            label="Zimmer ab"
            icon="bed"
            value={filters.zimmerMin?.toString() ?? ""}
            onChange={(v) => set("zimmer_min", v)}
            options={zimmerOptions}
          />
          <Select
            label="Wohnfläche ab"
            icon="ruler"
            value={filters.flaecheMin?.toString() ?? ""}
            onChange={(v) => set("flaeche_min", v)}
            options={flaecheMinOptions}
          />
          <Select
            label="Wohnfläche bis"
            icon="ruler"
            value={filters.flaecheMax?.toString() ?? ""}
            onChange={(v) => set("flaeche_max", v)}
            options={flaecheMaxOptions}
          />
          <button
            type="button"
            onClick={() => set("provisionsfrei", filters.provisionsfrei ? "" : "1")}
            aria-pressed={!!filters.provisionsfrei}
            className={`press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm lg:h-10 ${
              filters.provisionsfrei
                ? "border-accent text-accent"
                : "border-border text-muted hover:text-fg"
            }`}
          >
            <Icon name="check" size={15} />
            Provisionsfrei
          </button>

          <div className="shrink-0">
            <MoreFilters filters={filters} />
          </div>
        </div>

        {/* Sortierung — rechts außen, unabhängig davon wie die Pills links umbrechen */}
        <div className="shrink-0">
          <Select
            label="Sortierung"
            icon="trend"
            value={filters.sort}
            onChange={(v) => set("sort", v === "neu" ? "" : v)}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/*
        Mobil-Filter-Sheet: alle übrigen Filter untereinander gestapelt,
        großzügige Touch-Targets, unten fixierter Anzeigen-Button. Slide-up
        + Backdrop-Fade über .t-sheet-* (globals.css). Nur <sm erreichbar
        (Trigger-Button oben ist sm:hidden) — zusätzlich hier nochmal
        sm:hidden, damit ein Resize während offenem Sheet nie auf Desktop
        durchschlägt.
      */}
      {sheetMounted && (
        <div className="fixed inset-0 z-[60] sm:hidden" aria-hidden={!sheetOpen}>
          <div
            onClick={() => setSheetOpen(false)}
            className={`t-sheet-backdrop absolute inset-0 bg-bg/70 backdrop-blur-sm ${sheetShown ? "is-open" : ""}`}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter"
            tabIndex={-1}
            className={`t-sheet-panel absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl outline-none ${sheetShown ? "is-open" : ""}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-fg">Filter</h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={resetSheetFilters}
                  className="text-sm text-muted hover:text-fg"
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Schließen"
                  className="-mr-1 flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <SheetSelect
                  label="Objektart"
                  value={filters.typObj ?? ""}
                  onChange={(v) => set("typ_obj", v)}
                  options={OBJEKTART_OPTIONS}
                />
                <SheetSelect
                  label="Ort"
                  value={selectedCity}
                  onChange={setCityParam}
                  options={ortOptions}
                />
                {selectedCity && (
                  <SheetSelect
                    label="Umkreis"
                    value={radiusValue}
                    onChange={setUmkreisParam}
                    options={UMKREIS_OPTIONS}
                  />
                )}
                <SheetSelect
                  label="Preis ab"
                  value={filters.preisMin?.toString() ?? ""}
                  onChange={(v) => set("preis_min", v)}
                  options={preisMinOptions}
                />
                <SheetSelect
                  label="Preis bis"
                  value={filters.preisMax?.toString() ?? ""}
                  onChange={(v) => set("preis_max", v)}
                  options={preisMaxOptions}
                />
                <SheetSelect
                  label="Zimmer ab"
                  value={filters.zimmerMin?.toString() ?? ""}
                  onChange={(v) => set("zimmer_min", v)}
                  options={zimmerOptions}
                />
                <SheetSelect
                  label="Wohnfläche ab"
                  value={filters.flaecheMin?.toString() ?? ""}
                  onChange={(v) => set("flaeche_min", v)}
                  options={flaecheMinOptions}
                />
                <SheetSelect
                  label="Wohnfläche bis"
                  value={filters.flaecheMax?.toString() ?? ""}
                  onChange={(v) => set("flaeche_max", v)}
                  options={flaecheMaxOptions}
                />

                <button
                  type="button"
                  onClick={() => set("provisionsfrei", filters.provisionsfrei ? "" : "1")}
                  aria-pressed={!!filters.provisionsfrei}
                  className={`press flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    filters.provisionsfrei
                      ? "border-accent text-accent"
                      : "border-border text-fg hover:border-accent"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon name="check" size={16} />
                    Provisionsfrei
                  </span>
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      filters.provisionsfrei
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border text-transparent"
                    }`}
                  >
                    <Icon name="check" size={12} />
                  </span>
                </button>

                <MoreFiltersFields filters={filters} set={set} />

                <SheetSelect
                  label="Sortierung"
                  value={filters.sort}
                  onChange={(v) => set("sort", v === "neu" ? "" : v)}
                  options={SORT_OPTIONS}
                />
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="press flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-base font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                {liveCount != null
                  ? `${liveCount} ${liveCount === 1 ? "Objekt" : "Objekte"} anzeigen`
                  : "Objekte anzeigen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

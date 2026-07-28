"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { site, type NavItem } from "@/lib/site";
import { Icon } from "@/components/icon";

function closeMs() {
  if (typeof window === "undefined") return 150;
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--dropdown-close-dur",
      ),
    ) || 150
  );
}

/**
 * Ein Mobile-Nav-Eintrag.
 *
 * Ohne `children` eine einzelne Zeile, mit `children` ein Akkordeon
 * (.t-collapse), das dieselben Inhalte zeigt wie das Desktop-Mega-Menü:
 * Icon-Kachel, Bezeichnung und Beschreibung, dazu die Bildkarte am Ende.
 * Vorher standen hier nur nackte Textzeilen in derselben Größe und Farbe wie
 * die Oberpunkte, wodurch keine Ebene erkennbar war.
 *
 * `offen`/`umschalten` kommen von außen, damit immer nur EINE Gruppe
 * aufgeklappt ist. Waren zwei gleichzeitig offen, lief die Liste unten aus
 * dem Bild.
 */
function MobileNavItem({
  item,
  offen,
  umschalten,
  onNavigate,
}: {
  item: NavItem;
  offen: boolean;
  umschalten: () => void;
  onNavigate: () => void;
}) {
  // Oberpunkte tragen bewusst mehr Gewicht als ihre Unterpunkte, das ist die
  // gesamte Hierarchie-Information auf so wenig Fläche.
  const oberpunkt =
    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[0.95rem] font-medium text-fg transition-colors hover:bg-surface-2";

  if (!item.children) {
    return (
      <Link href={item.href} onClick={onNavigate} className={oberpunkt}>
        {item.label}
        <Icon name="arrowRight" size={15} className="shrink-0 text-faint" />
      </Link>
    );
  }

  const panelId = `mobile-mega-${item.href.replace(/\//g, "")}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={offen}
        aria-controls={panelId}
        onClick={umschalten}
        className={`press ${oberpunkt}`}
      >
        {item.label}
        <Icon
          name="chevronDown"
          size={15}
          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
            offen ? "rotate-180 text-accent" : "text-faint"
          }`}
        />
      </button>

      <div id={panelId} className={`t-collapse ${offen ? "is-open" : ""}`}>
        <div className="t-collapse-inner space-y-0.5 pb-2 pl-1 pr-1 pt-1">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              tabIndex={offen ? undefined : -1}
              className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2"
            >
              {/* Dieselbe Icon-Kachel wie im Desktop-Menü, nur eine Nummer
                  kleiner (36 statt 40 Pixel). */}
              <span className="mt-px flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                <Icon name={child.icon} size={17} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium leading-tight text-fg">{child.label}</span>
                <span className="mt-0.5 text-[0.7rem] leading-snug text-muted">{child.desc}</span>
              </span>
            </Link>
          ))}

          {item.feature && (
            // Querformat statt der hochkantigen Desktop-Karte: auf dem Handy
            // ist Breite da und Höhe knapp.
            <Link
              href={item.feature.href}
              onClick={onNavigate}
              tabIndex={offen ? undefined : -1}
              className="group relative mt-1.5 flex h-24 items-end overflow-hidden rounded-xl border border-border"
            >
              <Image
                src={item.feature.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="360px"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
              <span className="relative flex w-full items-center justify-between gap-3 p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-white">
                    {item.feature.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.7rem] text-white/70">
                    {item.feature.desc}
                  </span>
                </span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="shrink-0 text-white transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mobile-Navigation: Icon-Swap (Hamburger ↔ X, 09) + Menu-Dropdown (05). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  /** href der aufgeklappten Gruppe, null = alle zu. */
  const [gruppe, setGruppe] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setClosing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setClosing(false), closeMs());
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }
    // Beim Öffnen immer an der Wurzel starten, sonst stünde das Menü noch mit
    // der zuletzt aufgeklappten Gruppe da. Bewusst hier und nicht beim
    // Schließen, sonst klappt die Gruppe während der Ausblendung sichtbar zu.
    setGruppe(null);
    setClosing(false);
    setOpen(true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  return (
    // lg:hidden (nicht md:hidden) — die Desktop-Nav erscheint erst ab lg, sonst
    // gäbe es zwischen 768 und 1023 px gar keine Navigation (s. site-header.tsx).
    <div ref={wrapRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Menü schließen" : "Menü öffnen"}
        aria-expanded={open}
        className="t-icon-swap h-10 w-10 place-items-center rounded-md border border-border text-fg"
        data-state={open ? "b" : "a"}
      >
        <span className="t-icon flex items-center justify-center" data-icon="a" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </span>
        <span className="t-icon flex items-center justify-center" data-icon="b" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </span>
      </button>

      {/*
        Breiter als zuvor (w-60 reichte nicht für Icon plus Beschreibung) und
        mit Höhenbegrenzung samt eigenem Scrollbereich: vorher lief das Panel
        bei aufgeklappten Gruppen unten aus dem Bild. overscroll-contain hält
        den Schwung im Menü, statt die Seite dahinter weiterzuschieben.
      */}
      <div
        data-origin="top-right"
        className={`t-dropdown absolute right-0 z-50 mt-2 max-h-[calc(100svh-6.5rem)] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-2 shadow-2xl ${
          open ? "is-open" : closing ? "is-closing" : ""
        }`}
      >
        <div className="divide-y divide-border/50">
          {site.nav.map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              offen={gruppe === item.href}
              umschalten={() => setGruppe((g) => (g === item.href ? null : item.href))}
              onNavigate={close}
            />
          ))}
        </div>

        {/* Rechtliches als eine schmale Zeile statt drei voller Reihen: es
            gehört sichtbar dazu, soll aber keine Ebene mit der Navigation
            beanspruchen. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 pb-1 pt-3">
          {site.legalNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="text-xs text-faint transition-colors hover:text-muted"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

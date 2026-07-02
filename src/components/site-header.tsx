"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { MobileMenu } from "@/components/mobile-menu";
import { FavoritesLink } from "@/components/favorites";
import { Icon } from "@/components/icon";
import { site, type NavItem } from "@/lib/site";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center" aria-label={`${site.name} – Startseite`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* Kurzes "RIEGEL"-Logo (viewBox 1000×200) — größer & gut lesbar */}
      <img src="/logo-riegel-short-white.svg" alt={site.name} className="h-7 w-auto sm:h-8" />
    </Link>
  );
}

function closeMs() {
  if (typeof window === "undefined") return 150;
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur"),
    ) || 150
  );
}

/**
 * Ein Desktop-Nav-Punkt. Ohne `children` ein einfacher Link (Bestandsverhalten).
 * Mit `children` ein Mega-Menü-Trigger: Hover ODER Fokus öffnet ein
 * .t-dropdown-Panel (05-menu-dropdown-Muster) mit 4 kategorisierten Einträgen.
 */
function DesktopNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setClosing(false);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setClosing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setClosing(false), closeMs());
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMenu();
      btnRef.current?.focus();
    };
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open, closeMenu]);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        className="whitespace-nowrap text-sm tracking-wide text-muted transition-colors hover:text-fg"
      >
        {item.label}
      </Link>
    );
  }

  const slug = item.href.replace(/\//g, "");
  const panelId = `mega-${slug}`;
  const triggerId = `mega-trigger-${slug}`;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
      onFocus={openMenu}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) closeMenu();
      }}
    >
      <button
        ref={btnRef}
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? closeMenu() : openMenu())}
        className="press inline-flex items-center gap-1 whitespace-nowrap py-2.5 text-sm tracking-wide text-muted transition-colors hover:text-fg"
      >
        {item.label}
        <Icon
          name="chevronDown"
          size={14}
          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180 text-fg" : ""
          }`}
        />
      </button>

      <div
        id={panelId}
        aria-hidden={!open}
        data-origin="top-left"
        className={`t-dropdown absolute left-0 top-full z-50 mt-3 w-[440px] max-w-[92vw] rounded-2xl border border-border bg-surface p-2 shadow-2xl ${
          open ? "is-open" : closing ? "is-closing" : ""
        }`}
      >
        <div className="grid grid-cols-2 gap-1">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              tabIndex={open ? undefined : -1}
              onClick={closeMenu}
              className="press group flex items-start gap-3 rounded-md p-2.5 transition-colors hover:bg-surface-2"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                <Icon name={child.icon} size={19} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-fg">{child.label}</span>
                <span className="mt-0.5 text-xs leading-snug text-muted">{child.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Wordmark />

        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-6 lg:gap-7 md:flex" aria-label="Hauptnavigation">
          {site.nav.map((item) => (
            <DesktopNavItem key={item.href} item={item} />
          ))}
          <FavoritesLink />
          <Link
            href="/konto"
            aria-label="Konto / Anmelden"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
          >
            <Icon name="users" size={20} />
          </Link>
          <Link
            href="/rechner"
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="calculator" size={17} />
            Immobilie bewerten
          </Link>
        </nav>

        {/* Mobile: Konto + Merkliste + Icon-Swap-Menü */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/konto"
            aria-label="Konto / Anmelden"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
          >
            <Icon name="users" size={20} />
          </Link>
          <FavoritesLink />
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}

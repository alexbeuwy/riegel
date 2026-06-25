"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";

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

/** Mobile-Navigation: Icon-Swap (Hamburger ↔ X, 09) + Menu-Dropdown (05). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setClosing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setClosing(false), closeMs());
  }, []);

  const toggle = useCallback(() => {
    setOpen((o) => {
      if (o) {
        setClosing(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setClosing(false), closeMs());
        return false;
      }
      setClosing(false);
      return true;
    });
  }, []);

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

  const items = [...site.nav, ...site.legalNav];

  return (
    <div ref={wrapRef} className="relative md:hidden">
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

      <div
        data-origin="top-right"
        className={`t-dropdown absolute right-0 z-50 mt-2 w-60 rounded-lg border border-border bg-surface p-2 shadow-2xl ${
          open ? "is-open" : closing ? "is-closing" : ""
        }`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className="block rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

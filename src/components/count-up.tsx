"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * IntersectionObserver-Trigger für Count-up-Karten — EINMALIG beim ersten
 * Sichtbarwerden (Muster aus reveal.tsx). Bewusst OHNE eigenen
 * reduced-motion-Zweig hier (der würde setState synchron im Effect-Body
 * aufrufen und ist von react-hooks/set-state-in-effect als vermeidbarer
 * Render markiert, s. Kommentar bei useCountUp) — die eigentliche
 * "keine Bewegung"-Garantie (WCAG 2.3.3) liefert bereits useCountUp selbst
 * (Endwert im ersten Tick statt einer Zähl-Animation), sobald `inView` true wird.
 */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.3): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}

/**
 * Zählt 0 → target hoch, sobald `active` true wird (i. d. R. von useInViewOnce
 * geliefert). Ease-out-Quart, dieselbe Kurve wie der bestehende Count-up in
 * markt-panel.tsx. Liefert den ROHEN (unrundeten) Zwischenwert zurück — Runden/
 * Formatieren (Intl.NumberFormat, Nachkommastellen bei "Mio."-Werten o. Ä.)
 * macht bewusst der Aufrufer. `tabular-nums` MUSS der Aufrufer selbst auf das
 * Zahl-Element setzen (Layout-Shift-Schutz beim Hochzählen).
 */
export function useCountUp(target: number, active: boolean, dur = 1200): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDur = reduce ? 0 : dur;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = effectiveDur === 0 ? 1 : Math.min(1, (t - start) / effectiveDur);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, dur]);

  return val;
}

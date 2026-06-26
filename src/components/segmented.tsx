"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Segmented Control mit gleitendem Pill (transitions-dev „tabs sliding").
 * JS schreibt offsetLeft/offsetWidth des aktiven Tabs auf das Pill,
 * CSS (.t-tabs) übernimmt den Tween.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  const pillRef = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const moveTo = (idx: number, animate: boolean) => {
    const pill = pillRef.current;
    const tab = btnRefs.current[idx];
    if (!pill || !tab) return;
    const apply = () => {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    };
    if (animate) {
      apply();
    } else {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      apply();
      void pill.offsetWidth; // reflow → Snap ohne Animation
      pill.style.transition = prev;
    }
  };

  // Erstposition + Resize ohne Animation snappen.
  useLayoutEffect(() => {
    moveTo(activeIdx, false);
    const onResize = () => moveTo(activeIdx, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auswahlwechsel animiert.
  useLayoutEffect(() => {
    moveTo(activeIdx, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  return (
    <div className="t-tabs" role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className="t-tabs-pill" aria-hidden />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            btnRefs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className="t-tab font-medium"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

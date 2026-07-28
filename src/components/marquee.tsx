"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hülle für die endlos laufenden Streifen (Vertrauens-Streifen, GEO-Teaser).
 *
 * Grund für den Extra-Aufwand: eine CSS-Animation läuft auch dann weiter, wenn
 * das Element gar nicht im Bild ist. Beide Streifen sind sehr breite Spuren
 * (mehrere tausend Pixel) mit einer Maske darüber, und die muss der Browser
 * für jedes Einzelbild neu zusammensetzen. Auf dem Handy, besonders in den
 * In-App-Browsern von LinkedIn und Instagram, kostet das spürbar Bildrate
 * beim Scrollen, obwohl vom Streifen nichts zu sehen ist.
 *
 * Deshalb: sobald der Streifen aus dem Bild ist, wird die Animation angehalten.
 * Ohne JavaScript bleibt es beim bisherigen Verhalten (durchlaufend), die
 * Klasse wird dann einfach nie gesetzt.
 */
export function Marquee({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => el.classList.toggle("is-idle", !e.isIntersecting),
      // Etwas Vorlauf, damit der Streifen beim Hereinscrollen schon läuft und
      // nicht sichtbar anspringt.
      { rootMargin: "160px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reel-marquee ${className}`}>
      {children}
    </div>
  );
}

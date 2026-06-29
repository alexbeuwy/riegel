/**
 * Konfetti-Burst ohne Abhängigkeit (WAAPI). RIEGEL-Farben.
 * Respektiert prefers-reduced-motion. Client-only.
 */
export function burstConfetti(count = 90) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const COLORS = ["#015cff", "#6aa1ff", "#ffffff", "#9ec5ff", "#cfe0ff"];
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
  document.body.appendChild(layer);

  const vh = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 7;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const startX = 40 + Math.random() * 20; // grob aus der Mitte (vw)
    const drift = (Math.random() - 0.5) * 70; // seitliche Streuung (vw)
    const rot = Math.random() * 360;
    const dur = 1500 + Math.random() * 1600;
    const delay = Math.random() * 150;
    piece.style.cssText =
      `position:absolute;top:-18px;left:${startX}vw;width:${size}px;height:${size * 0.55}px;` +
      `background:${color};border-radius:1px;opacity:0;will-change:transform,opacity;`;
    piece.animate(
      [
        { transform: `translate(0,0) rotate(${rot}deg)`, opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.85 },
        {
          transform: `translate(${drift}vw, ${vh + 60}px) rotate(${rot + 540}deg)`,
          opacity: 0,
          offset: 1,
        },
      ],
      { duration: dur, delay, easing: "cubic-bezier(0.18,0.7,0.3,1)", fill: "forwards" },
    );
    layer.appendChild(piece);
  }
  window.setTimeout(() => layer.remove(), 3400);
}

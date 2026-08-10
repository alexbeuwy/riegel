import { istKiBild, KI_LABEL } from "@/lib/ki-bilder";

/**
 * Dezentes AI-Act-Label für KI-generierte Bilder (Art. 50 Abs. 4 EU-VO
 * 2024/1689 — s. lib/ki-bilder.ts). Zwei Formen:
 *
 * <KiHinweis src={…}/>  — Mikro-Chip unten rechts ÜBER dem Bild. Braucht ein
 *   position:relative-Elternelement (bei den Bild-Containern der Seite fast
 *   überall schon vorhanden). Rendert NUR, wenn src als KI-Bild registriert
 *   ist — die Komponente kann daher bedenkenlos an jede Renderstelle gesetzt
 *   werden, echte Fotos bleiben automatisch unmarkiert.
 *
 * kiCaptionSuffix(src) — Text-Suffix („ · KI-visualisiert") für Stellen mit
 *   vorhandener Bildunterschrift, wo ein Overlay stören würde.
 *
 * Bewusst kein onClick/Tooltip: das Label selbst IST die Offenlegung; Details
 * stehen im Impressum (Abschnitt „KI-generierte Bildwelten").
 */
export function KiHinweis({ src, className = "" }: { src: string | undefined | null; className?: string }) {
  if (!istKiBild(src)) return null;
  return (
    <span
      className={`pointer-events-none absolute bottom-2 right-2 z-10 select-none rounded-full bg-bg/70 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-fg/70 backdrop-blur ${className}`}
    >
      {KI_LABEL}
    </span>
  );
}

/** Suffix für Bildunterschriften: „ · KI-visualisiert" oder leer. */
export function kiCaptionSuffix(src: string | undefined | null): string {
  return istKiBild(src) ? ` · ${KI_LABEL}` : "";
}

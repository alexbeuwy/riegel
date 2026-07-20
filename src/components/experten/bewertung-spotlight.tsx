import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { TESTIMONIALS, TRUST_PLATFORMS, type Testimonial } from "@/lib/trust-data";

/**
 * Bewertungs-Spotlight für die Experten-Seiten — Server-Komponente.
 * Quelle sind AUSSCHLIESSLICH die echten, öffentlich einsehbaren Bewertungen
 * aus trust-data.ts (Original-Wortlaut) — hier wird nichts erfunden, gekürzt
 * oder umformuliert. Die Komponente wählt lediglich die 1–2 Zitate aus, die
 * am besten zu den Seiten-Schlagwörtern passen, und hebt Treffer-Wörter
 * dezent hervor (Akzentfarbe + Unterstreichung, kein greller Marker).
 *
 * Kein Treffer → bestes allgemeines Zitat OHNE Hervorhebung (deterministisch:
 * bewertetes Zitat mit dem längsten Text).
 */

/* ─────────────────────────  Schlagwort-Scoring  ───────────────────────── */

const MIN_WORT_LAENGE = 4; // "und", "für", "aus" etc. gar nicht erst stemmen
const MIN_STAMM_LAENGE = 4;

// Grobe deutsche Flexions-Endungen — reicht für Substring-Matching
// ("verkaufen" -> "verkauf" trifft "Hausverkauf", "verkauft", "Verkaufsprozess").
const ENDUNGEN = ["ungen", "ung", "en", "er", "es", "e", "n", "s"];

function wortstamm(wort: string): string {
  const w = wort.toLowerCase();
  for (const endung of ENDUNGEN) {
    if (w.endsWith(endung) && w.length - endung.length >= MIN_STAMM_LAENGE) {
      return w.slice(0, -endung.length);
    }
  }
  return w;
}

/** Keywords ("Mehrfamilienhaus verkaufen", …) → deduplizierte Wortstämme. */
function stammListe(keywords: string[]): string[] {
  const out = new Set<string>();
  for (const keyword of keywords) {
    for (const wort of keyword.split(/[^\p{L}]+/u)) {
      if (wort.length >= MIN_WORT_LAENGE) out.add(wortstamm(wort));
    }
  }
  return [...out];
}

/** Welche Stämme kommen (case-insensitiv, als Substring) im Text vor? */
function treffer(text: string, alleStaemme: string[]): string[] {
  const lower = text.toLowerCase();
  return alleStaemme.filter((s) => lower.includes(s));
}

/** Längere (= spezifischere) Stämme wiegen mehr als Allerwelts-Treffer. */
function score(gefunden: string[]): number {
  return gefunden.reduce((sum, s) => sum + s.length, 0);
}

/* ─────────────────────────  Hervorhebung  ───────────────────────── */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Hebt ganze Wörter hervor, die einen der gefundenen Stämme enthalten —
 * dezent: Akzent-Ton + feine Unterstreichung statt Marker-Hintergrund.
 */
function hervorheben(text: string, gefunden: string[]): ReactNode {
  if (gefunden.length === 0) return text;
  const muster = new RegExp(
    `[\\p{L}]*(?:${gefunden.map(escapeRegExp).join("|")})[\\p{L}]*`,
    "giu",
  );

  const teile: ReactNode[] = [];
  let letztesEnde = 0;
  for (const m of text.matchAll(muster)) {
    const start = m.index ?? 0;
    if (start > letztesEnde) teile.push(text.slice(letztesEnde, start));
    teile.push(
      <span
        key={start}
        className="text-accent-strong underline decoration-accent/50 decoration-[1.5px] underline-offset-4"
      >
        {m[0]}
      </span>,
    );
    letztesEnde = start + m[0].length;
  }
  if (letztesEnde < text.length) teile.push(text.slice(letztesEnde));
  return teile;
}

/* ─────────────────────────  Auswahl  ───────────────────────── */

interface Auswahl {
  t: Testimonial;
  gefunden: string[];
}

function waehleZitate(keywords: string[]): Auswahl[] {
  const alleStaemme = stammListe(keywords);

  const bewertet = TESTIMONIALS.map((t) => {
    const gefunden = treffer(t.text, alleStaemme);
    return { t, gefunden, punkte: score(gefunden) };
  })
    .filter((x) => x.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte);

  if (bewertet.length > 0) return bewertet.slice(0, 2);

  // Kein Schlagwort-Treffer: bestes allgemeines Zitat, ohne Hervorhebung.
  // Deterministisch: Zitat mit Sterne-Bewertung und dem längsten Text.
  const allgemein = [...TESTIMONIALS].sort(
    (a, b) => Number(b.sterne !== null) - Number(a.sterne !== null) || b.text.length - a.text.length,
  )[0];
  return allgemein ? [{ t: allgemein, gefunden: [] }] : [];
}

/* ─────────────────────────  Komponente  ───────────────────────── */

function Sterne({ anzahl }: { anzahl: number }) {
  return (
    <span className="flex text-accent" aria-label={`${anzahl} von 5 Sternen`}>
      {/* Wie testimonials.tsx: alle Sterne gefüllt, leere nur blasser —
          nie als dünne Outline (andere Silhouette). */}
      {Array.from({ length: 5 }).map((_, s) => (
        <Icon key={s} name="star" size={13} fill="currentColor" className={s < anzahl ? "" : "text-faint"} />
      ))}
    </span>
  );
}

function ZitatCaption({ t }: { t: Testimonial }) {
  return (
    <figcaption className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
      <span className="font-medium text-fg">{t.autor}</span>
      <span aria-hidden className="text-faint">
        ·
      </span>
      <span>{t.plattform}</span>
      {t.sterne !== null && <Sterne anzahl={t.sterne} />}
    </figcaption>
  );
}

export function BewertungSpotlight({ keywords }: { keywords: string[] }) {
  const zitate = waehleZitate(keywords);
  if (zitate.length === 0) return null;

  const [haupt, zweit] = zitate;
  const gesamt = TRUST_PLATFORMS.reduce((sum, p) => sum + p.count, 0);
  const plattformNamen = TRUST_PLATFORMS.slice(0, 3).map((p) => p.name).join(", ");

  return (
    <section aria-label="Kundenstimmen">
      <div className={zweit ? "grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-end" : ""}>
        {/* Großes typografisches Zitat — bewusst kein Card-Kasten. */}
        <figure className="relative max-w-3xl pt-8">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 left-0 select-none text-8xl font-semibold leading-none text-accent/15"
          >
            &bdquo;
          </span>
          <blockquote className="relative text-xl font-medium leading-relaxed text-fg sm:text-2xl sm:leading-snug">
            {hervorheben(haupt.t.text, haupt.gefunden)}
          </blockquote>
          <ZitatCaption t={haupt.t} />
        </figure>

        {zweit && (
          <figure className="border-l-2 border-accent/30 pl-5">
            <blockquote className="text-base leading-relaxed text-fg/90">
              {hervorheben(zweit.t.text, zweit.gefunden)}
            </blockquote>
            <ZitatCaption t={zweit.t} />
          </figure>
        )}
      </div>

      {/* Gesamtzahl aus TRUST_PLATFORMS berechnet (nie hartcodiert),
          verlinkt auf die Plattform des Haupt-Zitats. */}
      <a
        href={haupt.t.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="group mt-8 inline-flex flex-wrap items-center gap-x-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        <span className="font-semibold tabular-nums text-fg">{gesamt} Bewertungen</span>
        <span>
          auf {plattformNamen} &amp; Co.
        </span>
        <Icon name="arrowUpRight" size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    </section>
  );
}

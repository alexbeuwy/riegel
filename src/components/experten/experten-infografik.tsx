"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { useCountUp, useInViewOnce } from "@/components/count-up";

/**
 * ExpertenInfografik — animierte, inhaltliche SVG-Infografiken für die fünf
 * Experten-Landingpages unter /verkaufen/[typ]. Eine Komponente, fünf
 * Varianten (eine je Objekttyp):
 *
 *   mehrfamilienhaus        „Vom Mietertrag zum Kaufpreis" (Beispielrechnung)
 *   gewerbeimmobilie        „Ihr Objekt, unser Käufernetzwerk" (Netzwerk-Graph)
 *   wohn-und-geschaeftshaus „Zwei Erträge, ein Objekt" (Ertragsströme fließen zusammen)
 *   anlageimmobilie         „Beton schlägt Sparbuch" (zwei schematische Kurven)
 *   nachlassimmobilie       „Der Weg durch den Nachlass" (5 Stationen)
 *
 * Technik: reines SVG + CSS-Transitions (nur transform/opacity/stroke-dashoffset),
 * getriggert EINMALIG über useInViewOnce — kein zusätzliches Framework.
 * Linien zeichnen sich über pathLength={100} + stroke-dashoffset 100 → 0,
 * dadurch entfällt jede Pfadlängen-Messung. Bei prefers-reduced-motion steht
 * alles sofort statisch im Endzustand (transition: none; useCountUp springt
 * intern selbst auf den Endwert) — kein Inhalt wird entzogen.
 *
 * Farbklima strikt Projekt-Tokens: EIN Akzent (RIEGEL-Blau) + Grautöne.
 * --color-accent-strong ist laut Design-System die vorgesehene Tönung für
 * Akzent-TEXT auf dunklem Grund (AA-Kontrast) und wird ausschließlich dafür
 * eingesetzt. Grau-Flächen entstehen per color-mix aus --color-fg.
 *
 * Zugänglichkeit: Die Grafiken selbst sind aria-hidden (dekorative Kodierung),
 * je Variante fasst eine sichtbare Bildunterschrift (text-xs text-faint) den
 * Inhalt in einem Satz zusammen und dient zugleich als Text-Alternative.
 * Die Beispielzahlen der MFH-Rechnung sind echter HTML-Text (zugänglich).
 */

export type ExpertenInfografikTyp =
  | "mehrfamilienhaus"
  | "gewerbeimmobilie"
  | "wohn-und-geschaeftshaus"
  | "anlageimmobilie"
  | "nachlassimmobilie";

/* ── Gemeinsame Animations-Grundlagen ─────────────────────────────────── */

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Weiche Grau-Flächen aus dem Vordergrund-Ton (analog reach-chart.tsx). */
const FILL_SOFT = "color-mix(in oklab, var(--color-fg) 7%, transparent)";
const FILL_SOFTER = "color-mix(in oklab, var(--color-fg) 10%, transparent)";

type Anim = { on: boolean; reduce: boolean };

/** Einzige Endlos-Animation der Komponente: subtiler Sonar-Puls um den
 *  Objekt-Knoten der Netzwerk-Variante („sendet ins Käufernetzwerk").
 *  Bewusst langsam (2,8 s) und leise (max. Opazität 0,4) — ein schnellerer
 *  Takt wäre auffälliger, nicht subtiler. Unter reduced-motion greift der
 *  Media-Query-Guard (plus der globale Guard in globals.css). */
const PULS_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes exi-puls {
    0%   { transform: scale(0.92); opacity: 0.4; }
    75%  { transform: scale(1.18); opacity: 0; }
    100% { transform: scale(1.18); opacity: 0; }
  }
  .exi-puls {
    animation: exi-puls 2800ms cubic-bezier(0.16, 1, 0.3, 1) 1500ms infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
}
`;

/* prefers-reduced-motion hydrationssicher (Server: false) — per
   useSyncExternalStore statt setState-im-Effect (Projekt-Muster, vgl.
   Kommentar in count-up.tsx / reach-chart.tsx). Nötig, weil der globale
   reduced-motion-Guard in globals.css nur transition-DURATION nullt —
   unsere gestaffelten transition-DELAYS würden Inhalte sonst verzögert
   erscheinen lassen statt sofort. */
const REDUCE_MQ = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_MQ).matches,
    () => false,
  );
}

/** Einblenden + sanftes Aufsteigen (HTML wie SVG — nur opacity/transform). */
function fadeRise(a: Anim, delay: number, dur = 800, from = "translateY(10px)"): CSSProperties {
  return {
    opacity: a.on ? 1 : 0,
    transform: a.on ? "none" : from,
    transition: a.reduce
      ? "none"
      : `opacity ${dur}ms ${EASE} ${delay}ms, transform ${dur}ms ${EASE} ${delay}ms`,
  };
}

/** Aufploppen aus der eigenen Mitte (für SVG-Knoten/Punkte). */
function popIn(a: Anim, delay: number, dur = 600): CSSProperties {
  return {
    ...fadeRise(a, delay, dur, "scale(0.4)"),
    transformBox: "fill-box",
    transformOrigin: "center",
  };
}

/** Linien-Selbstzeichnung: pathLength={100} am Pfad voraussetzen. */
function drawPath(a: Anim, delay: number, dur = 1200): CSSProperties {
  return {
    strokeDasharray: 100,
    strokeDashoffset: a.on ? 0 : 100,
    transition: a.reduce ? "none" : `stroke-dashoffset ${dur}ms ${EASE} ${delay}ms`,
  };
}

/** Reines Einblenden auf eine Ziel-Opazität (z. B. „Fenster leuchten auf"). */
function fadeTo(a: Anim, delay: number, target = 1, dur = 700): CSSProperties {
  return {
    opacity: a.on ? target : 0,
    transition: a.reduce ? "none" : `opacity ${dur}ms ${EASE} ${delay}ms`,
  };
}

/* ── Gemeinsamer Rahmen: Kicker + Titel oben, Bildunterschrift unten ──── */

function Rahmen({
  kicker,
  titel,
  caption,
  a,
  children,
}: {
  kicker: string;
  titel: string;
  caption: string;
  a: Anim;
  children: ReactNode;
}) {
  return (
    <>
      <div style={fadeRise(a, 0, 700)}>
        <p className="text-[0.62rem] uppercase tracking-[0.18em] text-faint">{kicker}</p>
        <h3 className="mt-1.5 text-lg font-semibold text-fg">{titel}</h3>
      </div>
      {children}
      {/* Sichtbare Ein-Satz-Zusammenfassung = Text-Alternative zur Grafik. */}
      <p
        className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-faint"
        style={fadeRise(a, 150, 800)}
      >
        {caption}
      </p>
    </>
  );
}

/* ══ Variante 1: Mehrfamilienhaus — „Vom Mietertrag zum Kaufpreis" ══════
   Links Haus-Querschnitt (3 Etagen, 6 Einheiten leuchten nacheinander in
   Akzent auf), rechts baut sich die Rechenlogik als echte HTML-Zahlen auf:
   Jahresnettokaltmiete × Faktor = Kaufpreisindikation (useCountUp). */

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Fenster-Einheiten (x/y = rect-Ursprung), Reihenfolge = Aufleucht-Reihenfolge
 *  von unten nach oben („Einheiten füllen sich"). */
const MFH_FENSTER = [
  { x: 58, y: 199 },
  { x: 120, y: 199 },
  { x: 58, y: 147 },
  { x: 120, y: 147 },
  { x: 58, y: 92 },
  { x: 120, y: 92 },
];

function VarianteMehrfamilienhaus({ a }: { a: Anim }) {
  const miete = useCountUp(54_000, a.on, 1200);
  const faktor = useCountUp(22.5, a.on, 1200);
  const preis = useCountUp(1_215_000, a.on, 1400);

  return (
    <Rahmen
      a={a}
      kicker="Beispielrechnung"
      titel="Vom Mietertrag zum Kaufpreis"
      caption="Beispielrechnung: Die Jahresnettokaltmiete multipliziert mit einem marktüblichen Faktor ergibt eine erste Kaufpreisindikation — den tatsächlichen Wert Ihres Mehrfamilienhauses ermitteln wir individuell."
    >
      <div className="mt-6 grid grid-cols-1 items-center gap-8 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-10">
        {/* Haus-Querschnitt (dekorativ — die Rechnung rechts trägt den Inhalt) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 200 250"
          className="mx-auto h-auto w-full max-w-[210px] sm:max-w-[240px]"
        >
          {/* Umriss inkl. Bodenlinie zeichnet sich zuerst */}
          <path
            d="M14 242 H42 V80 L100 38 L158 80 V242 H186"
            fill="none"
            stroke="var(--color-fg)"
            strokeOpacity={0.75}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={100}
            style={drawPath(a, 100, 1200)}
          />
          {/* Etagen-Trennlinien */}
          <g style={fadeTo(a, 600, 1, 700)}>
            <line x1={42} y1={133} x2={158} y2={133} stroke="var(--color-border)" strokeWidth={1.5} />
            <line x1={42} y1={187} x2={158} y2={187} stroke="var(--color-border)" strokeWidth={1.5} />
          </g>
          {/* Hauseingang */}
          <rect
            x={91}
            y={204}
            width={18}
            height={38}
            rx={1}
            fill={FILL_SOFT}
            stroke="var(--color-border)"
            strokeWidth={1}
            style={fadeTo(a, 650, 1, 700)}
          />
          {/* Fenster-Grundflächen */}
          <g style={fadeTo(a, 500, 1, 700)}>
            {MFH_FENSTER.map((f) => (
              <rect
                key={`${f.x}-${f.y}`}
                x={f.x}
                y={f.y}
                width={22}
                height={26}
                rx={1}
                fill={FILL_SOFT}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            ))}
          </g>
          {/* Einheiten „füllen sich": Akzent leuchtet gestaffelt von unten auf */}
          {MFH_FENSTER.map((f, i) => (
            <rect
              key={`on-${f.x}-${f.y}`}
              x={f.x}
              y={f.y}
              width={22}
              height={26}
              rx={1}
              fill="var(--color-accent)"
              style={fadeTo(a, 750 + i * 150, 0.9, 600)}
            />
          ))}
        </svg>

        {/* Rechenlogik — echte, zugängliche Zahlen (tabular-nums gegen Zittern) */}
        <div className="min-w-0">
          <div style={fadeRise(a, 400, 800)}>
            <p className="text-xs text-muted">Jahresnettokaltmiete</p>
            <p className="mt-0.5 text-2xl font-semibold text-fg tabular-nums">
              {nf0.format(Math.round(miete))} €
            </p>
          </div>
          <div className="mt-4" style={fadeRise(a, 700, 800)}>
            <p className="text-xs text-muted">multipliziert mit Faktor</p>
            <p className="mt-0.5 text-2xl font-semibold text-fg tabular-nums">
              × {nf1.format(faktor)}
            </p>
          </div>
          <div
            className="mt-5 h-px w-full max-w-[260px] origin-left bg-border"
            style={{
              transform: a.on ? "scaleX(1)" : "scaleX(0)",
              transition: a.reduce ? "none" : `transform 700ms ${EASE} 1050ms`,
            }}
          />
          <div className="mt-5" style={fadeRise(a, 1250, 900)}>
            <p className="text-xs text-muted">Kaufpreisindikation</p>
            <p
              className="mt-0.5 text-3xl font-bold tabular-nums"
              style={{ color: "var(--color-accent-strong)" }}
            >
              {nf0.format(Math.round(preis))} €
            </p>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint" style={fadeRise(a, 1500, 800)}>
            Beispielwerte — der tatsächliche Faktor hängt von Lage, Zustand und Mietstruktur ab.
          </p>
        </div>
      </div>
    </Rahmen>
  );
}

/* ══ Variante 2: Gewerbeimmobilie — „Ihr Objekt, unser Käufernetzwerk" ══
   Objekt-Knoten in der Mitte, fünf Käufergruppen außen; die Verbindungen
   zeichnen sich gestaffelt (stroke-dashoffset), die Gruppen faden nach. */

const NETZWERK = [
  { label: "Privater Investor", x: 86, y: 40, w: 118, d: "M144 122 Q112 92 87 57", ex: 87, ey: 57 },
  { label: "Family Office", x: 254, y: 40, w: 100, d: "M196 122 Q228 92 253 57", ex: 253, ey: 57 },
  { label: "Projektentwickler", x: 74, y: 260, w: 126, d: "M140 190 Q108 220 76 243", ex: 76, ey: 243 },
  { label: "Eigennutzer", x: 266, y: 260, w: 92, d: "M200 190 Q232 220 264 243", ex: 264, ey: 243 },
  { label: "Institutioneller Anleger", x: 170, y: 302, w: 158, d: "M170 203 L170 285", ex: 170, ey: 285 },
];

function VarianteGewerbe({ a }: { a: Anim }) {
  return (
    <Rahmen
      a={a}
      kicker="Vermarktung"
      titel="Ihr Objekt, unser Käufernetzwerk"
      caption="Ihr Gewerbeobjekt im Zentrum: Wir spielen es gezielt in unser Käufernetzwerk aus — vom privaten Investor über Family Offices und institutionelle Anleger bis zu Projektentwicklern und Eigennutzern."
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 340 322"
        className="mx-auto mt-4 h-auto w-full max-w-[360px]"
      >
        {/* Verbindungen zeichnen sich gestaffelt vom Objekt nach außen */}
        {NETZWERK.map((n, i) => (
          <path
            key={`l-${n.label}`}
            d={n.d}
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinecap="round"
            pathLength={100}
            style={drawPath(a, 350 + i * 130, 900)}
          />
        ))}
        {/* Ankunftspunkte */}
        {NETZWERK.map((n, i) => (
          <circle
            key={`p-${n.label}`}
            cx={n.ex}
            cy={n.ey}
            r={2.5}
            fill="var(--color-accent)"
            style={popIn(a, 1000 + i * 130, 600)}
          />
        ))}
        {/* Käufergruppen-Knoten */}
        {NETZWERK.map((n, i) => (
          <g key={`n-${n.label}`} style={fadeRise(a, 800 + i * 130, 700, "translateY(6px)")}>
            <rect
              x={n.x - n.w / 2}
              y={n.y - 13}
              width={n.w}
              height={26}
              rx={13}
              fill={FILL_SOFT}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={n.x}
              y={n.y + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={500}
              fill="var(--color-fg)"
              fillOpacity={0.92}
            >
              {n.label}
            </text>
          </g>
        ))}
        {/* Subtiler Sonar-Puls (einzige Endlos-Animation, s. PULS_CSS) */}
        <circle
          cx={170}
          cy={158}
          r={44}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          className={a.on && !a.reduce ? "exi-puls" : undefined}
          style={{ opacity: 0 }}
        />
        {/* Objekt-Knoten in der Mitte */}
        <g style={popIn(a, 100, 700)}>
          <circle
            cx={170}
            cy={158}
            r={44}
            fill={FILL_SOFT}
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
          <text
            x={170}
            y={155}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-fg)"
          >
            Ihr Objekt
          </text>
          <text
            x={170}
            y={171}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-muted)"
          >
            diskret angeboten
          </text>
        </g>
      </svg>
    </Rahmen>
  );
}

/* ══ Variante 3: Wohn- und Geschäftshaus — „Zwei Erträge, ein Objekt" ═══
   Gebäude gesplittet (EG Gewerbe / OG Wohnen), zwei Ertragsströme fließen
   als sich zeichnende Pfade in einen gemeinsamen Ertragswert-Knoten. */

function VarianteWohnGeschaeft({ a }: { a: Anim }) {
  return (
    <Rahmen
      a={a}
      kicker="Ertragslogik"
      titel="Zwei Erträge, ein Objekt"
      caption="Ein Wohn- und Geschäftshaus verbindet zwei Ertragsquellen: Gewerbeertrag im Erdgeschoss und Wohnertrag in den Obergeschossen fließen gemeinsam in den Ertragswert ein."
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 360 280"
        className="mx-auto mt-4 h-auto w-full max-w-[460px]"
      >
        {/* Gebäudeumriss (Flachdach, städtisch) inkl. Bodenlinie */}
        <path
          d="M12 246 H28 V22 H148 V246 H212"
          fill="none"
          stroke="var(--color-fg)"
          strokeOpacity={0.75}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 100, 1100)}
        />
        {/* Geschossdecke OG1/OG2 */}
        <line
          x1={28}
          y1={96}
          x2={148}
          y2={96}
          stroke="var(--color-border)"
          strokeWidth={1.5}
          style={fadeTo(a, 500, 1, 700)}
        />
        {/* Split-Linie Wohnen/Gewerbe — der inhaltliche Kern, daher Akzent */}
        <line
          x1={28}
          y1={170}
          x2={148}
          y2={170}
          stroke="var(--color-accent)"
          strokeOpacity={0.65}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          style={fadeTo(a, 600, 1, 700)}
        />
        {/* Wohnungsfenster in zwei Obergeschossen */}
        <g style={fadeTo(a, 450, 1, 700)}>
          {[46, 122].map((y) =>
            [40, 78, 116].map((x) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={20}
                height={26}
                rx={1}
                fill={FILL_SOFT}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            )),
          )}
        </g>
        {/* EG: Ladenfront + Eingang */}
        <g style={fadeTo(a, 550, 1, 700)}>
          <rect
            x={40}
            y={190}
            width={64}
            height={44}
            rx={1}
            fill={FILL_SOFTER}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <rect
            x={116}
            y={192}
            width={20}
            height={54}
            rx={1}
            fill={FILL_SOFT}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        </g>
        {/* Ertragsstrom Wohnen (OG) */}
        <path
          d="M148 96 C 196 96 214 134 236 146"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 750, 1000)}
        />
        {/* Ertragsstrom Gewerbe (EG) */}
        <path
          d="M148 208 C 196 208 214 162 236 150"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 900, 1000)}
        />
        {/* Zusammenfluss → gemeinsamer Wert */}
        <circle cx={236} cy={148} r={3} fill="var(--color-accent)" style={popIn(a, 1450, 600)} />
        <path
          d="M239 148 H262"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 1500, 600)}
        />
        {/* Strom-Labels */}
        <text
          x={156}
          y={84}
          fontSize={12.5}
          fill="var(--color-muted)"
          style={fadeRise(a, 950, 700, "translateY(6px)")}
        >
          Wohnertrag
        </text>
        <text
          x={156}
          y={232}
          fontSize={12.5}
          fill="var(--color-muted)"
          style={fadeRise(a, 1100, 700, "translateY(6px)")}
        >
          Gewerbeertrag
        </text>
        {/* Ergebnis-Knoten „Ertragswert" */}
        <g style={popIn(a, 1650, 700)}>
          <rect
            x={262}
            y={132}
            width={94}
            height={32}
            rx={16}
            fill="color-mix(in oklab, var(--color-accent) 12%, transparent)"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
          />
          <text
            x={309}
            y={153}
            textAnchor="middle"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-accent-strong)"
          >
            Ertragswert
          </text>
        </g>
      </svg>
    </Rahmen>
  );
}

/* ══ Variante 4: Anlageimmobilie — „Beton schlägt Sparbuch" ═════════════
   Zwei sich selbst zeichnende Kurven über eine 10-Jahres-Achse: flaches
   Sparbuch (grau) vs. Immobilie (Akzent). Bewusst OHNE Zahlen/Prozente an
   den Kurven — rein schematisch, kein Rendite-Versprechen. */

function VarianteAnlage({ a }: { a: Anim }) {
  return (
    <Rahmen
      a={a}
      kicker="Schematische Darstellung"
      titel="Beton schlägt Sparbuch"
      caption="Schematische Darstellung ohne Renditeversprechen: Eine vermietete Immobilie verbindet laufenden Mietertrag mit möglicher Wertentwicklung, während das Sparbuch über zehn Jahre nahezu flach verläuft."
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 360 240"
        className="mx-auto mt-4 h-auto w-full max-w-[500px]"
      >
        <defs>
          <linearGradient id="exi-anlage-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Achse, Hilfslinien und Jahres-Ticks */}
        <g style={fadeTo(a, 100, 1, 700)}>
          {[64, 110, 156].map((y) => (
            <line
              key={y}
              x1={20}
              y1={y}
              x2={344}
              y2={y}
              stroke="var(--color-border)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          ))}
          <line x1={20} y1={204} x2={344} y2={204} stroke="var(--color-border)" strokeWidth={1.5} />
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={i}
              x1={22 + i * 32}
              y1={204}
              x2={22 + i * 32}
              y2={209}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          ))}
        </g>
        <g style={fadeTo(a, 300, 1, 700)}>
          <text x={22} y={225} fontSize={11.5} fill="var(--color-muted)">
            heute
          </text>
          <text x={342} y={225} fontSize={11.5} fill="var(--color-muted)" textAnchor="end">
            nach 10 Jahren
          </text>
        </g>
        {/* Sparbuch: nahezu flach, grau */}
        <path
          d="M22 190 L342 178"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={1.5}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 400, 900)}
        />
        <circle cx={342} cy={178} r={3} fill="var(--color-muted)" style={popIn(a, 1200, 600)} />
        {/* Immobilie: Mietertrag + Wertentwicklung, Akzent — ohne Zahlenwerte */}
        <path
          d="M22 190 C 96 182 150 162 200 136 C 258 106 304 86 342 62"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 700, 1400)}
        />
        <path
          d="M22 190 C 96 182 150 162 200 136 C 258 106 304 86 342 62 L342 204 L22 204 Z"
          fill="url(#exi-anlage-grad)"
          stroke="none"
          style={fadeTo(a, 1500, 1, 700)}
        />
        <circle cx={342} cy={62} r={4} fill="var(--color-accent)" style={popIn(a, 2000, 600)} />
      </svg>
      {/* Legende als HTML — auf jeder Breite gut lesbar */}
      <div
        className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs"
        style={fadeRise(a, 1300, 800)}
      >
        <span className="inline-flex items-center gap-2 text-fg">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--color-accent)" }}
          />
          Immobilie — Mietertrag und Wertentwicklung
        </span>
        <span className="inline-flex items-center gap-2 text-muted">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-muted" />
          Sparbuch
        </span>
      </div>
    </Rahmen>
  );
}

/* ══ Variante 5: Nachlassimmobilie — „Der Weg durch den Nachlass" ═══════
   Fünf Stationen vom Erbfall bis zum Verkauf. Der Pfad zeichnet sich,
   die Stationen ploppen gestaffelt auf, sobald der Pfad sie erreicht.
   Desktop: horizontale Welle. Mobil (<sm): vertikale Achse — fünf Labels
   nebeneinander wären auf 360px nicht mehr lesbar. */

const STATIONEN = [
  "Erbfall",
  "Erbschein & Grundbuch",
  "Bewertung",
  "Entscheidung der Erben",
  "Verkauf",
];

/** Stationskoordinaten der Desktop-Welle (Pfad läuft exakt durch die Punkte). */
const NACHLASS_XY = [
  { x: 40, y: 104 },
  { x: 173, y: 96 },
  { x: 306, y: 100 },
  { x: 439, y: 96 },
  { x: 572, y: 100 },
];
const NACHLASS_PFAD =
  "M40 104 Q106 122 173 96 Q240 70 306 100 Q373 126 439 96 Q506 68 572 100";

/** Ein Stations-Punkt mit Nummer — letzte Station (Verkauf) in Akzent. */
function NachlassPunkt({
  cx,
  cy,
  nr,
  letzte,
  a,
  delay,
}: {
  cx: number;
  cy: number;
  nr: number;
  letzte: boolean;
  a: Anim;
  delay: number;
}) {
  return (
    <g style={popIn(a, delay, 600)}>
      <circle
        cx={cx}
        cy={cy}
        r={11}
        fill={letzte ? "var(--color-accent)" : "var(--color-surface)"}
        stroke={letzte ? "var(--color-accent)" : "var(--color-border)"}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 3.5}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={600}
        fill={letzte ? "var(--color-fg)" : "var(--color-muted)"}
      >
        {nr}
      </text>
    </g>
  );
}

function VarianteNachlass({ a }: { a: Anim }) {
  const dotDelay = (i: number) => 200 + i * 290;
  return (
    <Rahmen
      a={a}
      kicker="Ablauf"
      titel="Der Weg durch den Nachlass"
      caption="Fünf Stationen vom Erbfall bis zum Verkauf: Erbschein und Grundbuchberichtigung, Bewertung und die gemeinsame Entscheidung der Erben — wir begleiten jeden Schritt."
    >
      {/* Desktop: horizontale Welle */}
      <svg
        aria-hidden="true"
        viewBox="0 0 640 160"
        className="mx-auto mt-6 hidden h-auto w-full max-w-[720px] sm:block"
      >
        <path
          d={NACHLASS_PFAD}
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.55}
          strokeWidth={1.5}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 100, 1400)}
        />
        {NACHLASS_XY.map((p, i) => (
          <NachlassPunkt
            key={STATIONEN[i]}
            cx={p.x}
            cy={p.y}
            nr={i + 1}
            letzte={i === STATIONEN.length - 1}
            a={a}
            delay={dotDelay(i)}
          />
        ))}
        {NACHLASS_XY.map((p, i) => {
          const oben = i % 2 === 1; // abwechselnd über/unter dem Pfad
          const letzte = i === STATIONEN.length - 1;
          return (
            <text
              key={`t-${STATIONEN[i]}`}
              x={p.x}
              y={oben ? p.y - 24 : p.y + 36}
              textAnchor="middle"
              fontSize={13}
              fontWeight={letzte ? 600 : 500}
              fill={letzte ? "var(--color-accent-strong)" : "var(--color-fg)"}
              fillOpacity={letzte ? 1 : 0.92}
              style={fadeRise(a, dotDelay(i) + 140, 700, "translateY(6px)")}
            >
              {STATIONEN[i]}
            </text>
          );
        })}
      </svg>

      {/* Mobil: vertikale Achse, gleiche Inhalte */}
      <svg
        aria-hidden="true"
        viewBox="0 0 320 372"
        className="mx-auto mt-4 h-auto w-full max-w-[320px] sm:hidden"
      >
        <path
          d="M36 24 V348"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.55}
          strokeWidth={1.5}
          strokeLinecap="round"
          pathLength={100}
          style={drawPath(a, 100, 1400)}
        />
        {STATIONEN.map((s, i) => {
          const y = 24 + i * 81;
          const letzte = i === STATIONEN.length - 1;
          return (
            <g key={s}>
              <NachlassPunkt cx={36} cy={y} nr={i + 1} letzte={letzte} a={a} delay={dotDelay(i)} />
              <text
                x={60}
                y={y + 4.5}
                fontSize={13.5}
                fontWeight={letzte ? 600 : 500}
                fill={letzte ? "var(--color-accent-strong)" : "var(--color-fg)"}
                fillOpacity={letzte ? 1 : 0.92}
                style={fadeRise(a, dotDelay(i) + 140, 700, "translateY(6px)")}
              >
                {s}
              </text>
            </g>
          );
        })}
      </svg>
    </Rahmen>
  );
}

/* ── Öffentliche Komponente ───────────────────────────────────────────── */

const VARIANTEN: Record<ExpertenInfografikTyp, (props: { a: Anim }) => ReactNode> = {
  mehrfamilienhaus: VarianteMehrfamilienhaus,
  gewerbeimmobilie: VarianteGewerbe,
  "wohn-und-geschaeftshaus": VarianteWohnGeschaeft,
  anlageimmobilie: VarianteAnlage,
  nachlassimmobilie: VarianteNachlass,
};

export function ExpertenInfografik({ typ }: { typ: ExpertenInfografikTyp }) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>(0.25);
  const reduce = usePrefersReducedMotion();
  const Variante = VARIANTEN[typ];

  return (
    <div ref={ref} className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <style>{PULS_CSS}</style>
      <Variante a={{ on: inView, reduce }} />
    </div>
  );
}

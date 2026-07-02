"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { generateHouses, fmtEuro, type GameHouse } from "@/lib/game-houses";
import { burstConfetti } from "@/lib/confetti";
import type { FireRequest } from "@/components/game/game-canvas";

const DURATION_SEC = 45;
const FLIGHT_SPEED = 13;

const GameCanvas = dynamic(() => import("@/components/game/game-canvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-faint">
      Kanone wird geladen …
    </div>
  ),
});

type Phase = "start" | "playing" | "over";

interface HitLabel {
  id: number;
  x: number;
  y: number;
  value: number;
  ort: string;
}

export function BlitzverkaufGame() {
  const [phase, setPhase] = useState<Phase>("start");
  const [houses, setHouses] = useState<GameHouse[]>([]);
  const [score, setScore] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [fireRequest, setFireRequest] = useState<FireRequest | null>(null);
  const [hitLabels, setHitLabels] = useState<HitLabel[]>([]);
  const [missFlash, setMissFlash] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const labelIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setHouses(generateHouses(DURATION_SEC, FLIGHT_SPEED));
    setScore(0);
    setSoldCount(0);
    setTimeLeft(DURATION_SEC);
    setHitLabels([]);
    setPhase("playing");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase((p) => (p === "playing" ? "over" : p));
  }, []);

  const handleHit = useCallback((info: { x: number; y: number; house: GameHouse }) => {
    setScore((s) => s + info.house.value);
    setSoldCount((c) => c + 1);
    setHitLabels((prev) => [
      ...prev,
      { id: labelIdRef.current++, x: info.x, y: info.y, value: info.house.value, ort: info.house.ort },
    ]);
    burstConfetti(24);
  }, []);

  const handleMiss = useCallback(() => {
    setMissFlash((v) => v + 1);
  }, []);

  const removeLabel = useCallback((id: number) => {
    setHitLabels((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const fire = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el || phase !== "playing") return;
      const rect = el.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      seqRef.current += 1;
      setFireRequest({ ndcX, ndcY, seq: seqRef.current });
    },
    [phase],
  );

  const moveCrosshair = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    const crosshair = crosshairRef.current;
    if (!el || !crosshair) return;
    const rect = el.getBoundingClientRect();
    crosshair.style.transform = `translate(${clientX - rect.left}px, ${clientY - rect.top}px)`;
  }, []);

  const resultsPerHouse = soldCount > 0 ? Math.round(score / soldCount) : 0;

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-border bg-bg/60 px-3.5 py-1.5 text-sm text-fg backdrop-blur";

  return (
    <div className="mx-auto max-w-4xl">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-bg shadow-[0_30px_60px_-30px_rgba(1,92,255,0.35)] sm:aspect-video"
        onPointerMove={(e) => phase === "playing" && moveCrosshair(e.clientX, e.clientY)}
        onClick={(e) => phase === "playing" && fire(e.clientX, e.clientY)}
        style={{ cursor: phase === "playing" ? "none" : "default" }}
      >
        {phase !== "start" && (
          <GameCanvas
            houses={houses}
            running={phase === "playing"}
            fireRequest={fireRequest}
            onHit={handleHit}
            onMiss={handleMiss}
            onTimeUp={endGame}
            durationSec={DURATION_SEC}
          />
        )}

        {/* ── Start-Screen ── */}
        {phase === "start" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-bg via-surface to-bg px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-3.5 py-1.5 text-[0.65rem] uppercase tracking-[0.25em] text-accent">
              <Icon name="sparkle" size={13} />
              Nur zum Spaß
            </span>
            <h2 className="akira text-3xl leading-[0.95] sm:text-5xl">
              RIEGEL <span className="text-accent">Blitzverkauf</span>
            </h2>
            <p className="max-w-md text-muted">
              Flieg über die Vorderpfalz und verkaufe Häuser aus der Luft — schneller
              geht&apos;s nicht. {DURATION_SEC} Sekunden, so viel Volumen wie möglich.
            </p>
            <p className="text-sm text-faint">Maus/Finger zum Zielen · Klicken/Tippen zum Schießen</p>
            <button
              type="button"
              onClick={start}
              className="press inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              <Icon name="bolt" size={18} />
              Los geht&apos;s
            </button>
          </div>
        )}

        {/* ── HUD ── */}
        {phase === "playing" && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
              <div className={chipClass}>
                <Icon name="euro" size={15} className="text-accent" />
                <span className="tabular-nums">{fmtEuro(score)}</span>
              </div>
              <div className={chipClass}>
                <Icon name="clock" size={15} className="text-accent" />
                <span className="tabular-nums">{timeLeft}s</span>
              </div>
            </div>

            {/* Fadenkreuz — Position wird direkt per Ref gesetzt (kein Re-Render pro Mausbewegung).
                Der Miss-Ring ist ein eigenes Kind mit wechselndem key, damit ein Remount NICHT
                den per Ref gesetzten transform des äußeren Fadenkreuzes zurücksetzt. */}
            <div
              ref={crosshairRef}
              className="pointer-events-none absolute left-0 top-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/80"
              aria-hidden
            >
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
              {missFlash > 0 && <span key={missFlash} className="game-miss-ring absolute inset-0 rounded-full border-2 border-fg/60" />}
            </div>

            {/* Treffer-Popups */}
            {hitLabels.map((l) => (
              <div
                key={l.id}
                className="game-hit-label pointer-events-none absolute -translate-x-1/2 text-center"
                style={{ left: l.x, top: l.y }}
                onAnimationEnd={() => removeLabel(l.id)}
              >
                <div className="akira whitespace-nowrap text-xl text-accent-strong sm:text-2xl">
                  +{fmtEuro(l.value)}
                </div>
                <div className="whitespace-nowrap text-[0.65rem] uppercase tracking-[0.2em] text-fg/80">
                  Verkauft · {l.ort}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Ergebnis-Screen ── */}
        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-bg via-surface to-bg px-6 text-center">
            <span className="text-sm uppercase tracking-[0.25em] text-faint">Zeit abgelaufen</span>
            <div className="akira text-4xl text-fg sm:text-6xl">{fmtEuro(score)}</div>
            <p className="text-muted">
              <span className="tabular-nums text-fg">{soldCount}</span> Häuser verkauft
              {soldCount > 0 && (
                <>
                  {" "}
                  · Ø <span className="tabular-nums text-fg">{fmtEuro(resultsPerHouse)}</span>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={start}
                className="press inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="arrowRight" size={16} className="rotate-180" />
                Nochmal spielen
              </button>
              <Link
                href="/verkaufen"
                className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                <Icon name="calculator" size={16} />
                Echte Immobilie verkaufen
              </Link>
            </div>
            <p className="max-w-sm text-xs text-faint">
              Nur zum Spaß — keine echten Angebote. Unsere echten Verkaufszahlen sind aber
              auch ohne Kanone beeindruckend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

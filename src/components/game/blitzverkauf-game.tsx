"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { FLIGHT_SPEED, generateHouses, fmtEuro, type GameHouse } from "@/lib/game-houses";
import { burstConfetti } from "@/lib/confetti";
import { initAudio, isMuted, playHit, playMiss, playShot, setMuted } from "@/lib/game-audio";
import type { FireRequest } from "@/components/game/game-canvas";

const DURATION_SEC = 45;
// Combo: Folge-Treffer innerhalb dieses Fensters erhöhen den Multiplikator.
const COMBO_WINDOW_MS = 2500;
const MAX_MULTIPLIER = 5;
const COUNTDOWN_STEP_MS = 700;
const BEST_KEY = "riegel-blitzverkauf-best";

const GameCanvas = dynamic(() => import("@/components/game/game-canvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-faint">
      Kanone wird geladen …
    </div>
  ),
});

type Phase = "start" | "countdown" | "playing" | "over";

interface HitLabel {
  id: number;
  x: number;
  y: number;
  /** Bereits multiplizierter Punkte-Zuwachs — das Popup zeigt, was wirklich gutgeschrieben wurde. */
  gain: number;
  mult: number;
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
  const [countdown, setCountdown] = useState<number | null>(null); // 3..1, 0 = "LOS!"
  const [multiplier, setMultiplier] = useState(1);
  const [best, setBest] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [displayScore, setDisplayScore] = useState(0); // Count-up im Endscreen
  const [soundMuted, setSoundMuted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  // key fürs Canvas: erzwingt pro Runde einen frischen Mount (Kamera/Uhr/verkaufte Häuser reset)
  const [runId, setRunId] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const labelIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zielposition in NDC — wird bei Pointer-Move gemutated (kein Re-Render pro Bewegung),
  // die Kanone im Canvas liest daraus pro Frame ihre Rohrausrichtung.
  const aimNdcRef = useRef({ x: 0, y: -0.2 });
  // Spiegel-Refs für Werte, die in Callbacks aus der Frame-Schleife (onTimeUp/onHit)
  // gebraucht werden — State-Closures wären dort veraltet.
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(DURATION_SEC);
  const bestRef = useRef(0);
  const multRef = useRef(1);
  const lastHitAtRef = useRef(0);
  const finishedRef = useRef(false);
  const isTouchRef = useRef(false);

  // Nur für Effekte genutzt (Count-up), nie im SSR-Markup — kein Hydration-Risiko.
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Rekord + Mute-Zustand einmalig laden — try/catch wegen Safari Private Mode.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      const val = raw ? Number(raw) : 0;
      if (Number.isFinite(val) && val > 0) {
        bestRef.current = val;
        // localStorage gibt es nur clientseitig → bewusst erst nach Mount lesen,
        // ein Lazy-Initializer im useState würde beim SSR-Hydrate abweichen.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBest(val);
      }
    } catch {
      // Ohne Storage gibt es eben keinen persistenten Rekord.
    }
    setSoundMuted(isMuted());
  }, []);

  // Aufräumen beim Unmount — laufende Intervalle würden sonst auf toten State feuern.
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    },
    [],
  );

  const endGame = useCallback(() => {
    // Guard über Ref statt Phase-State: onTimeUp (Canvas) und der 1s-Timer können
    // beide feuern — Konfetti/Storage dürfen aber nur genau einmal laufen.
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }

    const final = scoreRef.current;
    const newBest = final > 0 && final > bestRef.current;
    if (newBest) {
      bestRef.current = final;
      setBest(final);
      try {
        window.localStorage.setItem(BEST_KEY, String(final));
      } catch {
        // Rekord gilt dann nur für diese Session.
      }
    }
    setIsNewBest(newBest);
    setPhase("over");
    if (newBest) burstConfetti(140);
  }, []);

  const start = useCallback(() => {
    // Der Start-Klick ist die User-Geste, die den AudioContext freischaltet.
    initAudio();

    setHouses(generateHouses(DURATION_SEC, FLIGHT_SPEED));
    scoreRef.current = 0;
    setScore(0);
    setSoldCount(0);
    timeLeftRef.current = DURATION_SEC;
    setTimeLeft(DURATION_SEC);
    setHitLabels([]);
    // Miss-Zähler zurücksetzen — sonst mountet das Fadenkreuz in Runde 2 mit altem
    // missFlash > 0 und spielt die Ring-Animation einmal ohne Fehlschuss ab, und zwar
    // an der initialen Position oben links (transform erst nach dem ersten Pointer-Move).
    setMissFlash(0);
    // Alte fireRequest verwerfen — im frisch gemounteten Canvas (lastSeq=0) würde
    // eine stehengebliebene seq sonst sofort einen Geisterschuss auslösen.
    setFireRequest(null);
    multRef.current = 1;
    setMultiplier(1);
    lastHitAtRef.current = 0;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    setIsNewBest(false);
    setDisplayScore(0);
    finishedRef.current = false;
    aimNdcRef.current.x = 0;
    aimNdcRef.current.y = -0.2;
    setRunId((r) => r + 1);

    // Countdown 3→2→1→LOS — das Canvas steht währenddessen schon (running=false),
    // damit die Szene beim "LOS" nicht erst schwarz aufpoppt.
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(3);
    setPhase("countdown");
    let step = 3;
    countdownRef.current = setInterval(() => {
      step -= 1;
      if (step >= 0) {
        setCountdown(step);
        return;
      }
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
      setCountdown(null);
      setPhase("playing");
      // Sekunden-Timer erst ab "LOS" — die Countdown-Zeit zählt nicht als Spielzeit.
      timerRef.current = setInterval(() => {
        timeLeftRef.current = Math.max(0, timeLeftRef.current - 1);
        setTimeLeft(timeLeftRef.current);
        // Fallback zum Canvas-onTimeUp: bei inaktivem Tab steht dessen Frame-Uhr,
        // der Interval-Timer läuft weiter — Anzeige und Spielende bleiben so konsistent.
        if (timeLeftRef.current <= 0) endGame();
      }, 1000);
    }, COUNTDOWN_STEP_MS);
  }, [endGame]);

  const handleHit = useCallback((info: { x: number; y: number; house: GameHouse }) => {
    // Einschläge von Würfeln, die noch nach Spielende landen, zählen nicht mehr —
    // der Rekord ist zu dem Zeitpunkt bereits gespeichert.
    if (finishedRef.current) return;

    // Combo über Wanduhr statt Spielzeit — der Handler lebt außerhalb der Frame-Schleife.
    const now = Date.now();
    const inCombo = now - lastHitAtRef.current <= COMBO_WINDOW_MS;
    lastHitAtRef.current = now;
    const mult = inCombo ? Math.min(multRef.current + 1, MAX_MULTIPLIER) : 1;
    multRef.current = mult;
    setMultiplier(mult);
    // Ablauf-Timeout statt Prüfung beim nächsten Treffer: der Combo-Chip soll
    // sichtbar verschwinden, sobald das Fenster verstreicht — nicht erst irgendwann.
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => {
      multRef.current = 1;
      setMultiplier(1);
    }, COMBO_WINDOW_MS);

    const gain = info.house.value * mult;
    scoreRef.current += gain;
    setScore(scoreRef.current);
    setSoldCount((c) => c + 1);
    setHitLabels((prev) => [
      ...prev,
      { id: labelIdRef.current++, x: info.x, y: info.y, gain, mult, ort: info.house.ort },
    ]);
    playHit();
    burstConfetti(24);
  }, []);

  const handleMiss = useCallback(() => {
    if (finishedRef.current) return;
    playMiss();
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
      // Auch beim Schuss nachziehen — auf Touch gibt es oft keinen Move vor dem Tap,
      // das Rohr soll trotzdem dorthin zeigen, wo getippt wurde.
      aimNdcRef.current.x = ndcX;
      aimNdcRef.current.y = ndcY;
      seqRef.current += 1;
      setFireRequest({ ndcX, ndcY, seq: seqRef.current });
      playShot();
    },
    [phase],
  );

  const moveCrosshair = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // NDC parallel zum Fadenkreuz pflegen — gleiche Formel wie in fire(),
    // die Kanone liest die Rohrausrichtung pro Frame aus diesem Ref.
    aimNdcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    aimNdcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    const crosshair = crosshairRef.current;
    if (crosshair) {
      crosshair.style.transform = `translate(${clientX - rect.left}px, ${clientY - rect.top}px)`;
    }
  }, []);

  const markTouch = useCallback((pointerType: string) => {
    // Einmalig gesetztes Flag: auf Touch gibt es kein sinnvolles "Hover-Fadenkreuz",
    // also blenden wir es aus und lassen den System-Cursor in Ruhe.
    if (pointerType === "touch" && !isTouchRef.current) {
      isTouchRef.current = true;
      setIsTouch(true);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setSoundMuted(next);
  }, []);

  // Endsumme zählt hoch — kleiner Zahltag-Moment statt statischer Zahl.
  useEffect(() => {
    if (phase !== "over") return;
    const final = scoreRef.current;
    if (reduceMotion || final <= 0) {
      setDisplayScore(final);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic — schnell rein, weich auslaufen
      setDisplayScore(Math.round(final * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduceMotion]);

  const resultsPerHouse = soldCount > 0 ? Math.round(score / soldCount) : 0;

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-border bg-bg/60 px-3.5 py-1.5 text-sm text-fg backdrop-blur";

  return (
    <div className="mx-auto max-w-4xl">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-bg shadow-[0_30px_60px_-30px_rgba(1,92,255,0.35)] sm:aspect-video"
        onPointerMove={(e) => {
          markTouch(e.pointerType);
          // Auch während des Countdowns zielen lassen — das Rohr folgt schon mal mit.
          if (phase === "playing" || phase === "countdown") moveCrosshair(e.clientX, e.clientY);
        }}
        onPointerDown={(e) => markTouch(e.pointerType)}
        onClick={(e) => phase === "playing" && fire(e.clientX, e.clientY)}
        style={{ cursor: phase === "playing" && !isTouch ? "none" : "default" }}
      >
        {/* Canvas nur während Countdown/Spiel — im Over-Screen (opak verdeckt) würde
            frameloop="always" die Szene sonst unsichtbar mit ~60 fps weiterrendern
            (GPU/Akku). Der Neustart remountet über key={runId} ohnehin frisch. */}
        {(phase === "countdown" || phase === "playing") && (
          <GameCanvas
            key={runId}
            houses={houses}
            running={phase === "playing"}
            fireRequest={fireRequest}
            onHit={handleHit}
            onMiss={handleMiss}
            onTimeUp={endGame}
            durationSec={DURATION_SEC}
            aimRef={aimNdcRef}
          />
        )}

        {/* ── Timer-Bar: läuft linear ab, 1s-Transition glättet die Sekunden-Ticks ── */}
        {(phase === "playing" || phase === "countdown") && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] bg-fg/10" aria-hidden>
            <div
              className="game-timer-bar h-full bg-accent"
              style={{ width: `${(timeLeft / DURATION_SEC) * 100}%` }}
            />
          </div>
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
            {best !== null && (
              <span className={chipClass}>
                <Icon name="star" size={14} className="text-accent" />
                Rekord: <span className="tabular-nums">{fmtEuro(best)}</span>
              </span>
            )}
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

        {/* ── Countdown-Overlay: 3→2→1→LOS, Szene steht dahinter schon bereit ── */}
        {phase === "countdown" && countdown !== null && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-bg/40">
            {/* key erzwingt Remount pro Stufe — so startet die Pop-Animation jedes Mal neu */}
            <div
              key={countdown}
              className={`game-countdown-pop akira text-7xl sm:text-8xl ${
                countdown > 0 ? "text-fg" : "text-accent-strong"
              }`}
            >
              {countdown > 0 ? countdown : "LOS!"}
            </div>
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
              <div className={`${chipClass} ${timeLeft <= 10 ? "game-timer-urgent" : ""}`}>
                <Icon name="clock" size={15} className="text-accent" />
                <span className="tabular-nums">{timeLeft}s</span>
              </div>
            </div>

            {/* Combo-Chip mittig oben — nur sichtbar, solange der Multiplikator aktiv ist */}
            {multiplier >= 2 && (
              <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 sm:top-5">
                <span className="game-combo-chip inline-flex items-center gap-2 rounded-full border border-accent/60 bg-accent/15 px-3.5 py-1.5 text-sm font-medium text-accent-strong backdrop-blur">
                  <Icon name="bolt" size={14} />
                  ×{multiplier} COMBO
                </span>
              </div>
            )}

            {/* Fadenkreuz — Position wird direkt per Ref gesetzt (kein Re-Render pro Mausbewegung).
                Der Miss-Ring ist ein eigenes Kind mit wechselndem key, damit ein Remount NICHT
                den per Ref gesetzten transform des äußeren Fadenkreuzes zurücksetzt.
                Auf Touch entfällt das Fadenkreuz komplett — dort wird direkt getippt. */}
            {!isTouch && (
              <div
                ref={crosshairRef}
                className="pointer-events-none absolute left-0 top-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/80"
                aria-hidden
              >
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
                {missFlash > 0 && (
                  <span key={missFlash} className="game-miss-ring absolute inset-0 rounded-full border-2 border-fg/60" />
                )}
              </div>
            )}

            {/* Treffer-Popups */}
            {hitLabels.map((l) => (
              <div
                key={l.id}
                className="game-hit-label pointer-events-none absolute -translate-x-1/2 text-center"
                style={{ left: l.x, top: l.y }}
                onAnimationEnd={() => removeLabel(l.id)}
              >
                <div className="akira whitespace-nowrap text-xl text-accent-strong sm:text-2xl">
                  +{fmtEuro(l.gain)}
                  {l.mult >= 2 && <span className="ml-1.5 align-middle text-sm text-fg/80">×{l.mult}</span>}
                </div>
                <div className="whitespace-nowrap text-[0.65rem] uppercase tracking-[0.2em] text-fg/80">
                  Verkauft · {l.ort}
                </div>
              </div>
            ))}

            {/* Mute — stopPropagation, damit der Klick keinen Schuss auslöst */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="absolute bottom-4 right-4 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-bg/60 text-fg backdrop-blur transition-colors hover:border-accent hover:text-accent sm:bottom-5 sm:right-5"
              aria-label={soundMuted ? "Ton einschalten" : "Ton ausschalten"}
            >
              <Icon name={soundMuted ? "volumeOff" : "volume"} size={18} />
            </button>
          </>
        )}

        {/* ── Ergebnis-Screen ── */}
        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-bg via-surface to-bg px-6 text-center">
            <span className="text-sm uppercase tracking-[0.25em] text-faint">Zeit abgelaufen</span>
            <div className="akira text-4xl tabular-nums text-fg sm:text-6xl">{fmtEuro(displayScore)}</div>
            <p className="text-muted">
              <span className="tabular-nums text-fg">{soldCount}</span> Häuser verkauft
              {soldCount > 0 && (
                <>
                  {" "}
                  · Ø <span className="tabular-nums text-fg">{fmtEuro(resultsPerHouse)}</span>
                </>
              )}
            </p>
            {isNewBest ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/60 bg-accent/15 px-4 py-1.5 text-sm font-medium text-accent-strong">
                <Icon name="star" size={15} />
                Neuer Rekord!
              </span>
            ) : (
              best !== null && (
                <p className="text-sm text-faint">
                  Rekord: <span className="tabular-nums text-muted">{fmtEuro(best)}</span>
                </p>
              )
            )}
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

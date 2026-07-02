/**
 * Mini-Sound-Synth für "Blitzverkauf" (/spiel) — komplett ohne Audio-Assets.
 * Drei kurze Arcade-Blips aus WebAudio-Oszillatoren reichen hier völlig und
 * halten das Bundle bei null zusätzlichen Bytes. Der AudioContext wird bewusst
 * erst per initAudio() aus einer echten User-Geste heraus erzeugt (Autoplay-
 * Policy von Safari/Chrome — ohne Geste bleibt er stumm "suspended").
 * Alles defensiv: ohne AudioContext (SSR, exotische Browser) sind alle
 * Funktionen No-Ops statt Fehlerquellen.
 */

const MUTED_KEY = "riegel-blitzverkauf-muted";
// Leise Beimischung — Spiel-Sound soll Feedback geben, nie aufdringlich sein.
const MASTER_GAIN = 0.12;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let mutedLoaded = false;

/** Lazy + try/catch, weil localStorage fehlen/werfen kann (Safari Private Mode). */
function loadMuted() {
  if (mutedLoaded || typeof window === "undefined") return;
  mutedLoaded = true;
  try {
    muted = window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    // Ohne Persistenz gilt die Stummschaltung eben nur für die Session.
  }
}

/** Beim Start-Klick aufrufen — der Klick ist die User-Geste, die Audio freischaltet. */
export function initAudio() {
  loadMuted();
  if (typeof window === "undefined" || ctx) {
    // Bereits initialisiert: nur ggf. aufwecken (Tab-Wechsel suspendiert Kontexte).
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return;
  }
  try {
    const AC =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
}

/**
 * Ein einzelner Hüllkurven-Blip. Exponentielle Rampen statt linearer, weil das
 * Ohr logarithmisch hört — so klingt der Ausklang natürlich statt "abgehackt".
 */
function tone(type: OscillatorType, freqFrom: number, freqTo: number, dur: number, at = 0, peak = 1) {
  if (!ctx || !master || muted) return;
  try {
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    // exponentialRamp verträgt keine 0-Frequenz — nach unten hart begrenzen
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Ein fehlgeschlagener Blip darf nie das Spiel stören.
  }
}

/** Abschuss: kurzer, abfallender Square-Blip — trocken, "mechanisch". */
export function playShot() {
  tone("square", 520, 150, 0.08, 0, 0.8);
}

/** Treffer: zwei aufsteigende Sinus-Noten (Quinte aufwärts) — "ka-ching" ohne Kitsch. */
export function playHit() {
  tone("sine", 880, 880, 0.09, 0, 0.9);
  tone("sine", 1318.5, 1318.5, 0.13, 0.07, 0.9);
}

/** Fehlschuss: dumpfer, kurzer Low-Sine — hörbar "daneben", ohne zu bestrafen. */
export function playMiss() {
  tone("sine", 170, 90, 0.1, 0, 0.7);
}

export function setMuted(value: boolean) {
  loadMuted();
  muted = value;
  try {
    window.localStorage.setItem(MUTED_KEY, value ? "1" : "0");
  } catch {
    // Persistenz optional — siehe loadMuted.
  }
}

export function isMuted() {
  loadMuted();
  return muted;
}

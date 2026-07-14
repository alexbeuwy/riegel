"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import { Icon } from "@/components/icon";
import { useConsent } from "@/components/consent";

/**
 * „Auf der Seite kommentieren" — internes Feedback-Werkzeug, mit dem Sissy
 * (nicht-technisch) direkt auf der Live-Seite Kommentare an einzelne Stellen
 * hängen kann. Rendert NUR mit gesetztem lokalem Flag (s. STORAGE_KEY) — für
 * normale Besucher komplett unsichtbar und ohne jede Wirkung (sonst `null`).
 *
 * Aktivierung: ein Lesezeichen-Link mit `?feedback=1` setzt den Flag einmalig
 * in diesem Browser (localStorage), danach ist der Button auf jeder Seite da,
 * bis er über "Feedback ausblenden" oder `?feedback=0` wieder verschwindet.
 * Das Query-Flag wird nur beim ersten Laden einer Seite per window.location
 * gelesen (bewusst KEIN useSearchParams-Hook) — der würde eine Suspense-
 * Grenze erzwingen bzw. die ganze Seite wegen dieses internen Tools auf
 * dynamisches Rendering umstellen. Reicht für den Lesezeichen-Anwendungsfall,
 * bei dem ohnehin ein echter Seitenaufruf (kein Client-Side-Routing) passiert.
 */
const STORAGE_KEY = "riegel:feedback";
const COMMENT_MAX = 4000;

type Step = "idle" | "picking" | "composing" | "sending" | "success";

interface Target {
  /** Menschenlesbarer Kontext: Tag + Text-Ausschnitt + CSS-Pfad + Klickposition. */
  area: string;
  anchorX: number;
  anchorY: number;
}

function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// Grober CSS-Pfad (max. 4 Ebenen) — reicht fürs Team, um die Stelle im Code
// wiederzufinden, ohne einen vollen Selector-Roman zu produzieren.
function cssPath(start: Element): string {
  const parts: string[] = [];
  let node: Element | null = start;
  let depth = 0;
  while (node && depth < 4) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += `#${node.id}`;
      parts.unshift(part);
      break;
    }
    const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/)[0] : "";
    if (cls) part += `.${cls}`;
    parts.unshift(part);
    node = node.parentElement;
    depth++;
  }
  return parts.join(" > ");
}

function describeTarget(el: Element, xPct: number, yPct: number): string {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return `<${tag}>${text ? ` "${text}"` : ""} · ${cssPath(el)} · ca. ${xPct}%/${yPct}% der Seite`;
}

// Feste Position unten rechts, spürbar über dem WhatsApp-FAB (bottom-5/h-14,
// z-50) und dem Consent-Banner gestaffelt, damit sich beide nie überlappen.
const fabPosition: CSSProperties = {
  right: "1.25rem",
  bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
};

function popoverPosition(target: Target | null): CSSProperties {
  if (!target) return fabPosition;
  const width = 352; // entspricht w-[22rem]
  const margin = 16;
  const left = clamp(target.anchorX - width / 2, margin, window.innerWidth - width - margin);
  const preferredTop = target.anchorY + 20;
  const top =
    preferredTop + 260 < window.innerHeight ? preferredTop : Math.max(target.anchorY - 280, margin);
  return { left, top };
}

export function FeedbackWidget() {
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [target, setTarget] = useState<Target | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auf schmalen Mobilgeräten ist der Consent-Banner fast bildschirmbreit
  // (inset-x-3) und würde den Button sonst verdecken — solange er offen ist
  // (Erstbesuch, keine Entscheidung), bleibt der Button deshalb ausgeblendet
  // statt unklickbar darunter zu liegen (gleiches Muster wie der mobile
  // Karten-Umschalter in portal-view.tsx).
  const { decided: consentDecided } = useConsent();

  // A) Sichtbarkeits-Gate: ?feedback=1/0 in der URL steuert den lokalen Flag,
  // einmalig beim Mount gelesen — danach zählt nur noch localStorage.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("feedback");
      if (q === "1") localStorage.setItem(STORAGE_KEY, "on");
      else if (q === "0") localStorage.removeItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliges Lesen des Flags beim Mount, keine Render-Kaskade
      setEnabled(localStorage.getItem(STORAGE_KEY) === "on");
    } catch {
      // localStorage blockiert (Privacy-Mode o. Ä.) — Widget bleibt einfach aus.
    }
  }, []);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    [],
  );

  const hide = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setEnabled(false);
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setTarget(null);
    setComment("");
    setError(null);
  }, []);

  // B) „Stelle wählen"-Modus: ein Capture-Listener auf dem ganzen Dokument
  // fängt den nächsten Klick ab (preventDefault/stopPropagation, damit kein
  // Link/Button dabei wirklich auslöst) — außer der Klick trifft die eigene
  // Widget-UI (data-feedback-ui), die soll ganz normal reagieren.
  useEffect(() => {
    if (step !== "picking") return;
    document.documentElement.classList.add("feedback-picking");

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el.closest("[data-feedback-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
      const xPct = clamp(Math.round((e.clientX / window.innerWidth) * 100), 0, 100);
      const yPct = clamp(
        Math.round(((window.scrollY + e.clientY) / document.documentElement.scrollHeight) * 100),
        0,
        100,
      );
      setTarget({ area: describeTarget(el, xPct, yPct), anchorX: e.clientX, anchorY: e.clientY });
      setStep("composing");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setTarget(null);
      setStep("composing");
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.documentElement.classList.remove("feedback-picking");
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [step]);

  // Escape schließt auch das offene Kommentarfeld (nicht während des Sendens).
  useEffect(() => {
    if (step !== "composing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, reset]);

  // Sanftes Einblenden fürs Popover/Sheet (Mount-dann-Show, analog zu Modal.tsx)
  // + Body-Scroll-Lock nur fürs mobile Bottom-Sheet (echter Dialog über der
  // Seite) — das Desktop-Popover bleibt bewusst leichtgewichtig.
  useEffect(() => {
    if (step !== "composing" && step !== "sending") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Zurücksetzen beim Schließen, kein Cascading-Render (Präzedenz: modal.tsx)
      setShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    textareaRef.current?.focus();
    if (!isNarrowViewport()) return () => cancelAnimationFrame(raf);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, [step]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = comment.trim();
    if (!value) {
      setError("Bitte einen Kommentar eingeben.");
      return;
    }
    setError(null);
    setStep("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: value,
          pageUrl: `${window.location.pathname}${window.location.search}`,
          area: target?.area || undefined,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setTarget(null);
      setComment("");
      setStep("success");
      successTimer.current = setTimeout(() => setStep("idle"), 2600);
    } catch {
      setError("Senden fehlgeschlagen. Bitte erneut versuchen.");
      setStep("composing");
    }
  }

  if (!enabled) return null;

  return (
    <>
      {step === "picking" && (
        <div
          data-feedback-ui="true"
          role="status"
          className="fixed inset-x-3 top-3 z-[80] mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-accent/30 bg-surface-2/95 px-5 py-2.5 text-center text-sm text-fg shadow-2xl backdrop-blur-md sm:top-4"
        >
          <span>Klicke auf die Stelle, die du kommentieren willst (Esc = allgemeiner Kommentar).</span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTarget(null);
                setStep("composing");
              }}
              className="press font-medium text-accent hover:underline"
            >
              Allgemein
            </button>
            <button type="button" onClick={reset} className="press text-muted hover:text-fg">
              Abbrechen
            </button>
          </span>
        </div>
      )}

      {(step === "composing" || step === "sending") &&
        (isNarrowViewport() ? (
          <div className="fixed inset-0 z-[80]" data-feedback-ui="true">
            <div
              onClick={step === "sending" ? undefined : reset}
              className={`t-sheet-backdrop absolute inset-0 bg-bg/70 backdrop-blur-sm ${shown ? "is-open" : ""}`}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Kommentar"
              className={`t-sheet-panel absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-5 shadow-2xl ${shown ? "is-open" : ""}`}
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <FeedbackForm
                target={target}
                comment={comment}
                setComment={setComment}
                error={error}
                busy={step === "sending"}
                onCancel={reset}
                onSubmit={submit}
                textareaRef={textareaRef}
              />
            </div>
          </div>
        ) : (
          <div
            data-feedback-ui="true"
            role="dialog"
            aria-modal="true"
            aria-label="Kommentar"
            className={`t-feedback-pop fixed z-[80] w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-surface p-5 shadow-2xl ${shown ? "is-open" : ""}`}
            style={popoverPosition(target)}
          >
            <FeedbackForm
              target={target}
              comment={comment}
              setComment={setComment}
              error={error}
              busy={step === "sending"}
              onCancel={reset}
              onSubmit={submit}
              textareaRef={textareaRef}
            />
          </div>
        ))}

      {step === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed z-[80] flex items-center gap-2 rounded-full border border-accent/30 bg-surface-2/95 px-4 py-3 text-sm text-fg shadow-2xl backdrop-blur-md"
          style={fabPosition}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="check" size={13} />
          </span>
          Danke, Kommentar ist raus.
        </div>
      )}

      {step === "idle" && consentDecided && (
        <div className="fixed z-[65] flex flex-col items-end gap-2" style={fabPosition}>
          <button
            type="button"
            onClick={() => setStep("picking")}
            className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent shadow-2xl transition-colors hover:bg-accent-hover"
          >
            <Icon name="doc" size={17} />
            Kommentar
          </button>
          <button
            type="button"
            onClick={hide}
            className="press pr-1 text-xs text-muted transition-colors hover:text-fg"
          >
            Feedback ausblenden
          </button>
        </div>
      )}
    </>
  );
}

function FeedbackForm({
  target,
  comment,
  setComment,
  error,
  busy,
  onCancel,
  onSubmit,
  textareaRef,
}: {
  target: Target | null;
  comment: string;
  setComment: (v: string) => void;
  error: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-fg">
          {target ? "Kommentar zu dieser Stelle" : "Allgemeiner Kommentar"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Schließen"
          className="press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      {target && (
        <p
          className="mb-3 truncate rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted"
          title={target.area}
        >
          {target.area}
        </p>
      )}
      <div className={`t-input-wrap ${error ? "is-error" : ""}`}>
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={COMMENT_MAX}
          placeholder="Was fällt dir auf?"
          rows={3}
          disabled={busy}
          className="t-input min-h-24 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
        <p className="t-error-msg mt-2 text-xs text-accent" role="alert">
          {error ?? " "}
        </p>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="press rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-fg disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70"
        >
          {busy && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
          )}
          {busy ? "Wird gesendet …" : "Senden"}
        </button>
      </div>
    </form>
  );
}

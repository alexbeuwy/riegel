"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Einwilligungsverwaltung (TDDDG § 25 / DSGVO). Steuert das Laden externer
 * Karten-/Luftbild-Kacheln (CARTO, Esri) — die einzige zustimmungspflichtige
 * Einbindung dieser Website. Schriften sind self-hosted, Reels liegen im
 * eigenen CDN, Analyse-/Tracking-Dienste gibt es nicht.
 *
 * Drei bewusst gleichwertige Wege (Rückfrage Alex zum DSGVO-Check):
 *  1. „Alle akzeptieren"  2. „Nur notwendige" (= ablehnen)  3. „Einstellungen"
 * Ablehnen ist optisch gleich stark wie Akzeptieren — ungleich gewichtete
 * Buttons gelten als Dark Pattern und sind der häufigste Beanstandungsgrund.
 *
 * Widerruf (Art. 7 Abs. 3 DSGVO: so einfach wie die Erteilung) läuft über
 * denselben Dialog, erreichbar über „Datenschutz-Einstellungen" im Footer.
 *
 * Gespeichert wird lokal (kein Cookie, kein Serverkontakt) inklusive Zeitpunkt
 * und Textversion, damit nachvollziehbar bleibt, wann wem zugestimmt wurde.
 */
type Choice = "all" | "essential";
type ConsentState = {
  ready: boolean;
  decided: boolean;
  maps: boolean;
  acceptAll: () => void;
  essentialOnly: () => void;
  grantMaps: () => void;
  /** Öffnet den Einstellungs-Dialog — auch der Widerrufsweg. */
  reopen: () => void;
};

const Ctx = createContext<ConsentState | null>(null);
const KEY = "riegel:consent";
/** Bei inhaltlicher Änderung der Hinweistexte hochzählen (Neu-Einwilligung). */
const CONSENT_VERSION = 1;

interface Stored {
  choice: Choice;
  version: number;
  at: string;
}

function read(): Choice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    // Altformat: reiner String ("all"/"essential") — weiter akzeptieren,
    // damit bestehende Besucher nicht erneut gefragt werden.
    if (raw === "all" || raw === "essential") return raw;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed.choice === "all" || parsed.choice === "essential" ? parsed.choice : null;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  /** "banner" = Erstabfrage, "settings" = Dialog (auch Widerruf), null = zu. */
  const [view, setView] = useState<"banner" | "settings" | null>(null);

  useEffect(() => {
    // Asynchron (rAF) statt direkt im Effect-Body — react-hooks/set-state-in-effect.
    const raf = requestAnimationFrame(() => {
      const c = read();
      setChoice(c);
      setView(c === null ? "banner" : null);
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const persist = useCallback((c: Choice) => {
    try {
      const payload: Stored = { choice: c, version: CONSENT_VERSION, at: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {}
    setChoice(c);
    setView(null);
  }, []);

  const value: ConsentState = {
    ready,
    decided: choice !== null,
    maps: choice === "all",
    acceptAll: () => persist("all"),
    essentialOnly: () => persist("essential"),
    grantMaps: () => persist("all"),
    reopen: () => setView("settings"),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {ready && view === "banner" && (
        <ConsentBanner
          onAccept={value.acceptAll}
          onEssential={value.essentialOnly}
          onSettings={() => setView("settings")}
        />
      )}
      {ready && view === "settings" && (
        <ConsentSettings
          current={choice}
          onSave={persist}
          onClose={() => setView(choice === null ? "banner" : null)}
        />
      )}
    </Ctx.Provider>
  );
}

export function useConsent(): ConsentState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsent must be used within ConsentProvider");
  return c;
}

/** Erklärtext, einmal definiert — Banner und Dialog müssen identisch informieren. */
function Erklaerung() {
  return (
    <p className="mt-1.5 text-sm text-muted">
      Wir laden interaktive Karten- und Luftbild-Dienste (CARTO, Esri) erst mit Ihrer
      Einwilligung. Dabei wird Ihre IP-Adresse an den Anbieter übermittelt. Ohne
      Einwilligung funktioniert die Website vollständig, nur die Karten bleiben
      als Platzhalter. Mehr in der{" "}
      <Link href="/datenschutz" className="text-accent hover:underline">
        Datenschutzerklärung
      </Link>
      .
    </p>
  );
}

/** Gleich gewichtete Buttons: Akzeptieren und Ablehnen in identischer Größe. */
const btnPrimary =
  "press rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover";
const btnEqual =
  "press rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent";
const btnQuiet =
  "press rounded-full px-4 py-2 text-sm text-muted underline decoration-border underline-offset-4 transition-colors hover:text-fg";

function ConsentBanner({
  onAccept,
  onEssential,
  onSettings,
}: {
  onAccept: () => void;
  onEssential: () => void;
  onSettings: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-border bg-surface/95 p-5 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-4 sm:left-4 sm:right-auto sm:w-[26rem]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
          <Icon name="shield" size={18} />
        </span>
        <div>
          <h2 id="consent-title" className="text-sm font-semibold text-fg">
            Datenschutz &amp; Karten
          </h2>
          <Erklaerung />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onAccept} className={btnPrimary}>
              Alle akzeptieren
            </button>
            <button type="button" onClick={onEssential} className={btnEqual}>
              Nur notwendige
            </button>
            <button type="button" onClick={onSettings} className={btnQuiet}>
              Einstellungen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Einstellungs-Dialog: einzelner Schalter für die Karten-Dienste. Zugleich der
 * Widerrufsweg — eine erteilte Einwilligung lässt sich hier jederzeit wieder
 * abschalten (Art. 7 Abs. 3 DSGVO).
 */
function ConsentSettings({
  current,
  onSave,
  onClose,
}: {
  current: Choice | null;
  onSave: (c: Choice) => void;
  onClose: () => void;
}) {
  const [maps, setMaps] = useState(current === "all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-settings-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="consent-settings-title" className="text-base font-semibold text-fg">
            Datenschutz-Einstellungen
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="press -m-2 rounded-md p-2 text-faint transition-colors hover:text-fg"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <Erklaerung />

        <div className="mt-4 space-y-3">
          {/* Technisch notwendig: nicht abwählbar, daher als Zustand dargestellt
              statt als Schalter, den man ohnehin nicht bewegen kann. */}
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-fg">Technisch notwendig</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-faint">
                immer aktiv
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Speichert ausschließlich Ihre Auswahl hier sowie Merkliste und Login,
              wenn Sie diese nutzen. Keine Weitergabe an Dritte.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:border-accent/40">
            <input
              type="checkbox"
              checked={maps}
              onChange={(e) => setMaps(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-medium text-fg">Karten &amp; Luftbilder</span>
              <span className="mt-1.5 block text-xs leading-relaxed text-muted">
                Lädt Kartenkacheln von CARTO und Luftbilder von Esri. Ihre IP-Adresse
                wird dabei an diese Anbieter übermittelt. Ohne diese Einwilligung
                sehen Sie an den Kartenstellen einen Platzhalter.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSave(maps ? "all" : "essential")}
            className={btnPrimary}
          >
            Auswahl speichern
          </button>
          <button type="button" onClick={() => onSave("essential")} className={btnEqual}>
            Alle ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer-Link: macht den Widerruf jederzeit erreichbar (Art. 7 Abs. 3 DSGVO). */
export function ConsentSettingsLink({ className = "" }: { className?: string }) {
  const { reopen } = useConsent();
  return (
    <button type="button" onClick={reopen} className={className}>
      Datenschutz-Einstellungen
    </button>
  );
}

/** Lädt eingebettete Karten erst nach Einwilligung; sonst Klick-to-Load-Platzhalter. */
export function MapConsentGate({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ready, maps, grantMaps } = useConsent();
  if (!ready) return <div className={`h-full w-full bg-surface ${className}`} />;
  if (maps) return <>{children}</>;
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-surface p-6 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
        <Icon name="pin" size={24} />
      </span>
      <p className="max-w-xs text-sm text-muted">
        Karte wird über einen externen Dienst geladen. Mit Klick stimmen Sie der
        Datenübermittlung zu — widerrufbar über die Datenschutz-Einstellungen im Footer.
      </p>
      <button
        type="button"
        onClick={grantMaps}
        className="press rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
      >
        Karte laden
      </button>
    </div>
  );
}

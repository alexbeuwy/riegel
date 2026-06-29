"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

/**
 * Schlanke Einwilligungsverwaltung (TDDDG/DSGVO). Steuert das Laden externer
 * Karten-/Luftbild-Kacheln (CARTO/Esri). Schriften sind self-hosted, daher
 * nicht zustimmungspflichtig. Auswahl wird lokal gespeichert, jederzeit änderbar.
 */
type Choice = "all" | "essential";
type ConsentState = {
  ready: boolean;
  decided: boolean;
  maps: boolean;
  acceptAll: () => void;
  essentialOnly: () => void;
  grantMaps: () => void;
  reopen: () => void;
};

const Ctx = createContext<ConsentState | null>(null);
const KEY = "riegel:consent";

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let c: Choice | null = null;
    try {
      const v = localStorage.getItem(KEY);
      if (v === "all" || v === "essential") c = v;
    } catch {}
    setChoice(c);
    setOpen(c === null);
    setReady(true);
  }, []);

  const persist = useCallback((c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    setChoice(c);
    setOpen(false);
  }, []);

  const value: ConsentState = {
    ready,
    decided: choice !== null,
    maps: choice === "all",
    acceptAll: () => persist("all"),
    essentialOnly: () => persist("essential"),
    grantMaps: () => persist("all"),
    reopen: () => setOpen(true),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {ready && open && <ConsentBanner onAccept={value.acceptAll} onEssential={value.essentialOnly} />}
    </Ctx.Provider>
  );
}

export function useConsent(): ConsentState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsent must be used within ConsentProvider");
  return c;
}

function ConsentBanner({ onAccept, onEssential }: { onAccept: () => void; onEssential: () => void }) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-border bg-surface/95 p-5 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:left-4 sm:right-auto sm:bottom-4 sm:w-[26rem]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
          <Icon name="shield" size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-fg">Datenschutz &amp; Karten</h2>
          <p className="mt-1.5 text-sm text-muted">
            Wir laden interaktive Karten- und Luftbild-Dienste (CARTO, Esri) erst mit
            Ihrer Einwilligung. Dabei wird Ihre IP an den Anbieter übermittelt. Mehr in der{" "}
            <Link href="/datenschutz" className="text-accent hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="press rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={onEssential}
              className="press rounded-full border border-border px-4 py-2 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              Nur notwendige
            </button>
          </div>
        </div>
      </div>
    </div>
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
        Datenübermittlung zu.
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

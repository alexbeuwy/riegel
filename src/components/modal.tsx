"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function closeMs() {
  if (typeof window === "undefined") return 150;
  return (
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--modal-close-dur",
      ),
    ) || 150
  );
}

/** Modal-Dialog mit Scale-up/Scale-down (transitions-dev 06). */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    if (mounted) {
      setShown(false);
      const t = setTimeout(() => setMounted(false), closeMs());
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        style={{ transitionDuration: shown ? "var(--modal-open-dur)" : "var(--modal-close-dur)" }}
        className={`absolute inset-0 bg-bg/70 backdrop-blur-sm transition-opacity ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`t-modal relative w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-2xl outline-none ${
          shown ? "is-open" : "is-closing"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mr-1 -mt-1 flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4 text-muted">{children}</div>
      </div>
    </div>
  );
}

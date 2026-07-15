"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export function EstateGallery({ images, title }: { images: string[]; title: string }) {
  const imgs = images;
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => setIdx((i) => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % imgs.length), [imgs.length]);

  useEffect(() => {
    if (!open) return;
    // Fokus in den Dialog holen und beim Schließen dorthin zurückgeben, wo er
    // geöffnet wurde (Muster wie Modal.tsx) — plus Tab-Fokusfalle, damit der
    // Fokus nicht hinter das Overlay in den Seiteninhalt wandert.
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key === "ArrowLeft") return prev();
      if (e.key === "ArrowRight") return next();
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus?.focus?.();
    };
  }, [open, prev, next]);

  const openAt = (i: number) => {
    setIdx(i);
    setOpen(true);
  };

  if (imgs.length === 0) {
    // Live-Objekte können ohne Foto-Leserecht kommen — dezenter Platzhalter statt kaputtem Bild.
    return (
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface-2">
        <Icon name="home" size={32} className="text-faint" />
        <span className="text-xs text-faint">Fotos folgen</span>
      </div>
    );
  }

  return (
    <>
      {/* NEU: Nur der Hero lädt sofort — weitere Bilder erst nach Klick (Lightbox lädt on demand). */}
      <button
        type="button"
        onClick={() => openAt(0)}
        className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border"
      >
        <Image
          src={imgs[0]}
          alt={title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />
        {imgs.length > 1 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-bg/70 px-4 py-1.5 text-xs font-medium text-fg backdrop-blur">
            Alle {imgs.length} Fotos
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="group fixed inset-0 z-[70] flex items-center justify-center bg-bg/90 outline-none backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} – Galerie`}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-fg transition-colors hover:text-accent"
          >
            ✕
          </button>
          <button
            type="button"
            aria-label="Vorheriges Foto"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xl text-fg transition-[color,opacity] duration-200 hover:text-accent sm:left-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
          >
            ‹
          </button>
          <div className="relative h-[78vh] w-[92vw] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={imgs[idx]}
              alt={`${title} – Foto ${idx + 1}`}
              fill
              sizes="92vw"
              className="object-contain"
            />
          </div>
          <button
            type="button"
            aria-label="Nächstes Foto"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xl text-fg transition-[color,opacity] duration-200 hover:text-accent sm:right-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-sm text-fg transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            {idx + 1} / {imgs.length}
          </div>
          {/* Verstecktes Preload des nächsten Bilds — Weiterklicken fühlt sich flott an, ohne alles vorzuladen. */}
          {imgs.length > 1 && (
            <div className="sr-only" aria-hidden="true">
              <Image
                src={imgs[(idx + 1) % imgs.length]}
                alt=""
                fill
                sizes="92vw"
                loading="eager"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

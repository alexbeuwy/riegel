"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export function EstateGallery({ images, title }: { images: string[]; title: string }) {
  const imgs = images.length ? images : ["/images/prop-1.jpg"];
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const prev = useCallback(() => setIdx((i) => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % imgs.length), [imgs.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, prev, next]);

  const openAt = (i: number) => {
    setIdx(i);
    setOpen(true);
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => openAt(0)}
          className="group relative col-span-full aspect-[16/9] overflow-hidden rounded-2xl border border-border"
        >
          <Image
            src={imgs[0]}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-bg/70 px-3 py-1 text-xs text-fg backdrop-blur">
            Alle {imgs.length} Fotos
          </span>
        </button>
        {imgs.slice(1, 5).map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => openAt(i + 1)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border"
          >
            <Image
              src={src}
              alt={`${title} – Ansicht ${i + 2}`}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
            />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bg/90 backdrop-blur-sm"
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
            className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xl text-fg transition-colors hover:text-accent sm:left-6"
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
            className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xl text-fg transition-colors hover:text-accent sm:right-6"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3 py-1 text-sm text-fg">
            {idx + 1} / {imgs.length}
          </div>
        </div>
      )}
    </>
  );
}

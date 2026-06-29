"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { categoryLabel, formatArea, formatPrice, roomsLabel } from "@/lib/format";
import { FavoriteButton } from "@/components/favorites";
import { Icon } from "@/components/icon";

const STATUS_LABEL: Partial<Record<Estate["status"], string>> = {
  reserviert: "Reserviert",
  verkauft: "Verkauft",
  vermietet: "Vermietet",
};

function Badge({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        gold ? "bg-accent text-on-accent" : "bg-bg/80 text-fg backdrop-blur"
      }`}
    >
      {children}
    </span>
  );
}

export function PortalCard({
  estate,
  hovered,
  active,
  onHover,
  registerRef,
}: {
  estate: Estate;
  hovered: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const [idx, setIdx] = useState(0);
  const imgs = estate.images.length ? estate.images : ["/images/prop-1.jpg"];
  return (
    <article
      ref={registerRef}
      onMouseEnter={() => onHover(estate.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(estate.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onHover(null);
      }}
      className={`scroll-mt-28 overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow,transform] duration-300 ${
        active
          ? "border-accent ring-2 ring-accent/50 -translate-y-0.5"
          : hovered
            ? "border-accent ring-1 ring-accent/30 -translate-y-0.5"
            : "border-border"
      }`}
    >
      <Link href={`/immobilien/${estate.slug}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={imgs[idx]}
            alt={`${estate.title}, ${estate.city}`}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/70 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {estate.isNew && <Badge gold>Neu</Badge>}
            {estate.provision.free && <Badge>Provisionsfrei</Badge>}
            {estate.priceReduced && <Badge>Preis reduziert</Badge>}
            {STATUS_LABEL[estate.status] && <Badge>{STATUS_LABEL[estate.status]}</Badge>}
          </div>
          <FavoriteButton id={estate.id} className="absolute right-3 top-3" />
          {imgs.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Vorheriges Bild"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIdx((i) => (i - 1 + imgs.length) % imgs.length);
                }}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur transition-opacity hover:bg-bg/90 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
              >
                <Icon name="arrowLeft" size={18} />
              </button>
              <button
                type="button"
                aria-label="Nächstes Bild"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIdx((i) => (i + 1) % imgs.length);
                }}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur transition-opacity hover:bg-bg/90 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
              >
                <Icon name="arrowRight" size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {imgs.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-accent" : "w-1.5 bg-fg/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="space-y-2 p-5">
          <div className="text-xl font-semibold text-fg">{formatPrice(estate)}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {roomsLabel(estate.rooms) && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="bed" size={15} className="text-faint" />
                {roomsLabel(estate.rooms)}
              </span>
            )}
            {formatArea(estate.livingArea) && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="ruler" size={15} className="text-faint" />
                {formatArea(estate.livingArea)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="building" size={15} className="text-faint" />
              {categoryLabel(estate.category)}
            </span>
          </div>
          <h3 className="line-clamp-1 text-base text-muted">{estate.title}</h3>
          <div className="inline-flex items-center gap-1.5 text-sm text-faint">
            <Icon name="pin" size={15} />
            {estate.city}
            {estate.district ? ` · ${estate.district}` : ""}
          </div>
        </div>
      </Link>
    </article>
  );
}

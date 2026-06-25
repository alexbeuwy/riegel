"use client";

import Image from "next/image";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { categoryLabel, formatArea, formatPrice, roomsLabel } from "@/lib/format";

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
  return (
    <article
      ref={registerRef}
      onMouseEnter={() => onHover(estate.id)}
      onMouseLeave={() => onHover(null)}
      className={`scroll-mt-28 overflow-hidden rounded-xl border bg-surface transition-colors duration-300 ${
        hovered || active ? "border-accent" : "border-border"
      }`}
    >
      <Link href={`/immobilien/${estate.slug}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={estate.images[0]}
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
        </div>
        <div className="space-y-2 p-5">
          <div className="text-xl font-semibold text-fg">{formatPrice(estate)}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {roomsLabel(estate.rooms) && <span>{roomsLabel(estate.rooms)}</span>}
            {formatArea(estate.livingArea) && <span>{formatArea(estate.livingArea)}</span>}
            <span>{categoryLabel(estate.category)}</span>
          </div>
          <h3 className="line-clamp-1 text-base text-muted">{estate.title}</h3>
          <div className="text-sm text-faint">
            {estate.city}
            {estate.district ? ` · ${estate.district}` : ""}
          </div>
        </div>
      </Link>
    </article>
  );
}

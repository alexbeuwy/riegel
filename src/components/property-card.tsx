import Image from "next/image";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { TiltCard } from "@/components/tilt-card";
import { categoryLabel, formatArea, formatPrice, roomsLabel } from "@/lib/format";

export function PropertyCard({ estate }: { estate: Estate }) {
  return (
    <TiltCard cardClassName="border border-border bg-surface">
      <Link href={`/immobilien/${estate.slug}`} className="group block h-full">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={estate.images[0]}
            alt={`${estate.title}, ${estate.city}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/70 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            {estate.isNew && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent">
                Neu
              </span>
            )}
            {estate.provision.free && (
              <span className="rounded-full bg-bg/80 px-3 py-1 text-xs text-fg backdrop-blur">
                Provisionsfrei
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2 p-5">
          <div className="text-lg font-semibold text-fg">{formatPrice(estate)}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {roomsLabel(estate.rooms) && <span>{roomsLabel(estate.rooms)}</span>}
            {formatArea(estate.livingArea) && <span>{formatArea(estate.livingArea)}</span>}
            <span>{categoryLabel(estate.category)}</span>
          </div>
          <h3 className="line-clamp-1 text-base text-muted">{estate.title}</h3>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-faint">
              {estate.city}
              {estate.district ? ` · ${estate.district}` : ""}
            </span>
            <span className="text-sm text-muted transition-colors group-hover:text-fg">
              Ansehen →
            </span>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

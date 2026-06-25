import Image from "next/image";
import Link from "next/link";
import type { Estate } from "@/lib/mock-estates";
import { TiltCard } from "@/components/tilt-card";

export function PropertyCard({ estate }: { estate: Estate }) {
  return (
    <TiltCard cardClassName="border border-border bg-surface">
      <Link href={`/immobilien/${estate.slug}`} className="group block h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={estate.image}
            alt={estate.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/70 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-bg/80 px-3 py-1 text-xs tracking-wide text-fg backdrop-blur">
              {estate.marketingType}
            </span>
            {estate.isNew && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent">
                Neu
              </span>
            )}
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="text-sm text-faint">{estate.location}</div>
          <h3 className="text-lg font-semibold leading-snug text-fg">
            {estate.title}
          </h3>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>{estate.rooms} Zimmer</span>
            <span>{estate.area} m²</span>
            <span>{estate.type}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-lg font-semibold text-accent">
              {estate.price}
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

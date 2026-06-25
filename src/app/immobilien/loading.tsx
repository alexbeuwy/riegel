import { Container } from "@/components/container";

/** Skeleton während die gefilterte Liste server-seitig nachlädt (Filterwechsel). */
export default function LoadingPortal() {
  return (
    <div>
      <div className="border-b border-border bg-bg pt-6">
        <Container className="pb-5">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-28 animate-pulse rounded-full bg-surface-2" />
            ))}
          </div>
          <div className="mt-4 h-4 w-40 animate-pulse rounded bg-surface-2" />
        </Container>
      </div>
      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        <div className="grid grid-cols-1 gap-6 px-5 py-8 sm:px-8 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="aspect-[16/10] animate-pulse bg-surface-2" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-28 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-44 animate-pulse rounded bg-surface-2" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="sticky top-20 hidden h-[calc(100svh-5rem)] animate-pulse bg-surface-2 lg:block" />
      </div>
    </div>
  );
}

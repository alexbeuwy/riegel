"use client";

import Link from "next/link";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { PortalCard } from "@/components/portal/portal-card";
import { useFavorites } from "@/components/favorites";
import { mockEstates } from "@/lib/mock-estates";

export default function MerklistePage() {
  const { ids, ready } = useFavorites();
  const estates = mockEstates.filter((e) => ids.includes(e.id));

  return (
    <>
      <PageIntro eyebrow="Ihre Merkliste" title="Gemerkte Immobilien">
        Ihre Favoriten werden lokal in diesem Browser gespeichert. Mit einem
        Konto synchronisieren wir sie bald geräteübergreifend.
      </PageIntro>
      <section className="py-16 sm:py-20">
        <Container>
          {!ready ? (
            <div className="h-40" />
          ) : estates.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center">
              <h2 className="text-xl font-semibold">Noch nichts gemerkt</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                Tippen Sie bei einer Immobilie auf das Herz, um sie hier zu
                sammeln.
              </p>
              <Link
                href="/immobilien"
                className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Immobilien entdecken
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {estates.map((e) => (
                <PortalCard
                  key={e.id}
                  estate={e}
                  hovered={false}
                  active={false}
                  onHover={() => {}}
                  registerRef={() => {}}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

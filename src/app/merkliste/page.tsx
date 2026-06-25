"use client";

import Link from "next/link";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { PortalCard } from "@/components/portal/portal-card";
import { useFavorites } from "@/components/favorites";
import { useSavedSearches } from "@/components/saved-searches";
import { mockEstates } from "@/lib/mock-estates";

export default function MeinBereichPage() {
  const { ids, ready } = useFavorites();
  const { searches, remove, toggleNotify, ready: sReady } = useSavedSearches();
  const estates = mockEstates.filter((e) => ids.includes(e.id));

  return (
    <>
      <PageIntro eyebrow="Mein Bereich" title="Merkliste & Suchaufträge">
        Favoriten und gespeicherte Suchen — aktuell lokal in diesem Browser.
        Mit einem Konto synchronisieren wir sie bald geräteübergreifend und
        benachrichtigen Sie per E-Mail bei passenden neuen Objekten.
      </PageIntro>

      <section className="py-14">
        <Container className="space-y-16">
          {/* Merkliste */}
          <div>
            <h2 className="mb-6 text-xl font-semibold">Gemerkte Immobilien</h2>
            {!ready ? (
              <div className="h-32" />
            ) : estates.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-10 text-center">
                <p className="mx-auto max-w-md text-muted">
                  Noch nichts gemerkt — tippen Sie bei einer Immobilie auf das
                  Herz.
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
          </div>

          {/* Suchaufträge */}
          <div>
            <h2 className="mb-6 text-xl font-semibold">Suchaufträge</h2>
            {!sReady ? (
              <div className="h-20" />
            ) : searches.length === 0 ? (
              <p className="text-muted">
                Noch keine Suche gespeichert. Stellen Sie im{" "}
                <Link href="/immobilien" className="text-accent hover:underline">
                  Portal
                </Link>{" "}
                Filter ein und klicken Sie „Suche speichern".
              </p>
            ) : (
              <ul className="space-y-3">
                {searches.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <div>
                      <div className="text-fg">{s.label}</div>
                      <Link
                        href={`/immobilien?${s.query}`}
                        className="text-sm text-accent hover:underline"
                      >
                        Suche öffnen
                      </Link>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleNotify(s.id)}
                        aria-pressed={s.notify}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          s.notify
                            ? "border-accent text-accent"
                            : "border-border text-muted hover:text-fg"
                        }`}
                      >
                        {s.notify ? "E-Mail-Alarm: an" : "E-Mail-Alarm: aus"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s.id)}
                        className="text-xs text-muted hover:text-fg"
                      >
                        Entfernen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

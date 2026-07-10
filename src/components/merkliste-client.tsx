"use client";

import Link from "next/link";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { PortalCard } from "@/components/portal/portal-card";
import { useFavorites } from "@/components/favorites";
import { useSavedSearches } from "@/components/saved-searches";
import { useAuth } from "@/components/auth";
import { Icon } from "@/components/icon";
import type { Estate } from "@/lib/mock-estates";
import type { EstateSource } from "@/lib/estates";

// Estates kommen als Prop vom Server (Live- oder Mock-Daten) — die Auswahl
// nach gemerkten IDs bleibt client-seitig, da Favoriten nur lokal (Browser) existieren.
export function MerklisteClient({ estates, source }: { estates: Estate[]; source: EstateSource }) {
  const { ids, ready, reconcile } = useFavorites();
  const { searches, remove, toggleNotify, ready: sReady } = useSavedSearches();
  const { enabled: authEnabled, user } = useAuth();
  const favorites = estates.filter((e) => ids.includes(e.id));
  // Gemerkte IDs, die es im aktuellen Objektbestand nicht mehr gibt (Objekt
  // verkauft/offline). Nur bei echten Live-Daten aussagekräftig — beim Mock-
  // Fallback matchen echte gemerkte IDs ohnehin nichts.
  const missingCount = ready && source === "onoffice" ? ids.length - favorites.length : 0;

  return (
    <>
      <PageIntro eyebrow="Mein Bereich" title="Merkliste & Suchaufträge">
        Favoriten und gespeicherte Suchen — ohne Konto nur lokal in diesem
        Browser. Mit kostenlosem Konto: auf jedem Gerät verfügbar, PDF-Exposés
        laden und von neuen Objekten erfahren, bevor sie öffentlich online gehen.
      </PageIntro>

      {/* Konto-CTA direkt unter der Einleitung — das stärkste Argument
          (Vorab-Zugang) stand bisher erst NACH dem Login im Suchprofil. */}
      {authEnabled && !user && (
        <Container>
          <Link
            href="/konto?next=/merkliste"
            className="press -mt-4 mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="users" size={16} />
            Kostenloses Konto erstellen
          </Link>
        </Container>
      )}

      <section className="py-14">
        <Container className="space-y-16">
          {/* Merkliste */}
          <div>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              <Icon name="heart" size={20} className="text-accent" />
              Gemerkte Immobilien
            </h2>
            {!ready ? (
              <div className="h-32" />
            ) : favorites.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
                  <Icon name="heart" size={26} />
                </div>
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
                {favorites.map((e) => (
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
            {missingCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-faint">
                <span>
                  {missingCount === 1
                    ? "Ein gemerktes Objekt ist nicht mehr verfügbar (verkauft/offline)."
                    : `${missingCount} gemerkte Objekte sind nicht mehr verfügbar (verkauft/offline).`}
                </span>
                <button
                  type="button"
                  onClick={() => reconcile(estates.map((e) => e.id))}
                  className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-fg transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon name="check" size={13} />
                  Aufräumen
                </button>
              </div>
            )}
          </div>

          {/* Suchaufträge */}
          <div>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              <Icon name="search" size={20} className="text-accent" />
              Suchaufträge
            </h2>
            {!sReady ? (
              <div className="h-20" />
            ) : searches.length === 0 ? (
              <p className="text-muted">
                Noch keine Suche gespeichert. Stellen Sie im{" "}
                <Link href="/immobilien" className="text-accent hover:underline">
                  Portal
                </Link>{" "}
                Filter ein und klicken Sie „Suche speichern&ldquo;.
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

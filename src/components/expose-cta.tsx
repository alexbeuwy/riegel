"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth";

/**
 * Exposé-Box auf der Objekt-Detailseite — der Konto-Anreiz im Kaufprozess:
 * eingeloggt gibt es das offizielle PDF-Exposé direkt (über /api/expose,
 * server-seitig aus OnOffice gerendert), ausgeloggt wird das Konto beworben
 * ("Objekt merken & Exposé erhalten") mit Rücksprung auf diese Seite.
 * Rendert nur bei Live-Objekten (Mock-Objekte haben kein echtes Exposé).
 */
export function ExposeCta({ slug, live }: { slug: string; live: boolean }) {
  const { enabled, ready, user, session } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ohne Live-Objekt kein Exposé; ohne konfigurierte Konten kein Gate —
  // dann lieber gar nichts zeigen statt in eine Sackgasse zu führen.
  if (!live || !enabled) return null;

  async function download() {
    if (busy || !session) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/expose?slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Download fehlgeschlagen.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RIEGEL-Expose.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Objekt-URL wieder freigeben, sobald der Download angestoßen ist.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon name="doc" size={17} className="text-accent" />
        Exposé als PDF
      </div>

      {!ready ? (
        <div className="mt-3 h-11 animate-pulse rounded-full bg-surface-2" />
      ) : user ? (
        <>
          <p className="mt-2 text-xs text-muted">
            Das vollständige Objekt-Exposé mit allen Details — direkt aus unserer
            Objektverwaltung.
          </p>
          {error && (
            <p className="mt-2 text-xs text-accent" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-60"
          >
            <Icon name="doc" size={16} />
            {busy ? "Wird erstellt …" : "Exposé herunterladen"}
          </button>
        </>
      ) : (
        <>
          {/* Merken selbst bleibt kostenlos (Herz oben) — das Konto liefert die
              Extras: Exposé, geräteübergreifende Merkliste, Vorab-Infos. */}
          <p className="mt-2 text-xs text-muted">
            Mit kostenlosem Konto: das vollständige PDF-Exposé laden, Ihre
            Merkliste auf jedem Gerät wiederfinden und von neuen Objekten
            erfahren, bevor sie öffentlich online gehen.
          </p>
          <Link
            href={`/konto?next=${encodeURIComponent(pathname ?? `/immobilien/${slug}`)}`}
            className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent"
          >
            <Icon name="users" size={16} />
            Konto erstellen & Exposé erhalten
          </Link>
          <p className="mt-2.5 text-center text-[0.7rem] text-faint">
            Kostenlos · in 1 Minute · jederzeit löschbar
          </p>
        </>
      )}
    </div>
  );
}

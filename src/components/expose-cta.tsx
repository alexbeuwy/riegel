"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { useAuth } from "@/components/auth";
import { type Provision } from "@/lib/mock-estates";

/**
 * Exposé-Box auf der Objekt-Detailseite — der Konto-Anreiz im Kaufprozess:
 * eingeloggt gibt es das offizielle PDF-Exposé direkt (über /api/expose,
 * server-seitig aus OnOffice gerendert), ausgeloggt wird das Konto beworben
 * ("Objekt merken & Exposé erhalten") mit Rücksprung auf diese Seite.
 * Rendert nur bei Live-Objekten (Mock-Objekte haben kein echtes Exposé).
 *
 * Pre-Exposé-Onboarding: Bei PROVISIONSPFLICHTIGEN Objekten (provision.free =
 * false) erscheint VOR dem Download ein Bestätigungs-Dialog. Erst wenn der
 * Nutzer die Provisionsvereinbarung aktiv bestätigt (POST /api/expose/confirm
 * → OK), startet der eigentliche Download. Provisionsfreie Objekte laden wie
 * bisher direkt herunter.
 */
export function ExposeCta({
  slug,
  live,
  provision,
}: {
  slug: string;
  live: boolean;
  provision: Provision;
}) {
  const { enabled, ready, user, session } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Ohne Live-Objekt kein Exposé; ohne konfigurierte Konten kein Gate —
  // dann lieber gar nichts zeigen statt in eine Sackgasse zu führen.
  if (!live || !enabled) return null;

  const provisionText =
    provision.text ??
    (provision.buyerPct != null ? `Provision: ${provision.buyerPct} %` : "Auf Anfrage.");

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

  // Klick auf "Exposé herunterladen": provisionsfrei → direkt laden;
  // provisionspflichtig → erst den Bestätigungs-Dialog öffnen.
  function onDownloadClick() {
    if (busy || confirming) return;
    if (provision.free) {
      void download();
    } else {
      setError(null);
      setConfirmError(null);
      setConfirmOpen(true);
    }
  }

  // Bestätigen im Dialog: erst die Provisionsvereinbarung serverseitig
  // dokumentieren (E-Mail an Anbieter, Nutzer in Kopie). Nur bei OK schließt
  // der Dialog und der eigentliche Download startet.
  async function confirmAndDownload() {
    if (confirming || busy || !session) return;
    setConfirmError(null);
    setConfirming(true);
    try {
      const res = await fetch(`/api/expose/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Bestätigung fehlgeschlagen. Bitte erneut versuchen.");
      }
      setConfirmOpen(false);
      await download();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "Bestätigung fehlgeschlagen.");
    } finally {
      setConfirming(false);
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
            onClick={onDownloadClick}
            disabled={busy}
            className="press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-accent px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-60"
          >
            {busy ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden
              />
            ) : (
              <Icon name="doc" size={16} />
            )}
            {busy ? "Exposé wird erstellt …" : "Exposé herunterladen"}
          </button>
          {busy && (
            // Erster Download je Objekt rendert live beim externen System
            // (OnOffice, mehrere Sekunden), danach liefert unser Cache sofort aus.
            <p className="mt-2 text-center text-[0.7rem] text-faint">
              Das externe System generiert das Exposé frisch, das kann bis zu
              15 Sekunden dauern. Danach ist es sofort da.
            </p>
          )}
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

      {/* Bestätigungs-Dialog nur für provisionspflichtige Objekte. */}
      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!confirming) setConfirmOpen(false);
        }}
        title="Bestätigung erforderlich"
        maxWidthClassName="max-w-lg"
      >
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Bitte bestätigen Sie nun die folgende Information zur
            Provisionsaufteilung. Seit dem 23.12.2020 ist der Anbieter
            verpflichtet, Sie über die Provisionsaufteilung aufzuklären. Zudem
            ist Ihre aktive Bestätigung dieser Provisionsvereinbarung
            erforderlich. Der Anbieter wird nach erfolgter Bestätigung zu diesen
            Konditionen für Sie tätig:
          </p>

          <div className="rounded-xl border border-accent bg-surface-2 p-4">
            <p className="text-fg">
              Der Anbieter erhält bei Abschluss eines durch ihn vermittelten
              notariell beurkundeten Kaufvertrages zu dieser Immobilie von Ihnen
              die unten angegebene Provision.
            </p>
            <p className="mt-3 text-base font-semibold text-fg">{provisionText}</p>
          </div>

          <p>
            Mit Klick auf ‚Makler provisionspflichtig beauftragen’ stimmen Sie
            der Provisionsvereinbarung des Anbieters zu dieser Immobilie zu.
          </p>
          <p>
            Gut zu wissen: Die Provision wird selbstverständlich nur dann
            fällig, wenn Sie die Immobilie tatsächlich kaufen.
          </p>
          <p>
            Mit Absenden Ihrer Bestätigung wird eine automatisierte E-Mail an
            den Anbieter und Sie in Kopie gesendet, die die
            Provisionsvereinbarung enthält.
          </p>
          <p className="text-xs text-faint">
            Hinweis: Die Provisionsvereinbarung kommt nur zwischen Ihnen und dem
            Anbieter zustande.
          </p>

          {confirmError && (
            <p className="text-xs text-accent" role="alert">
              {confirmError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={confirming}
              className="press inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={confirmAndDownload}
              disabled={confirming}
              className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {confirming && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              )}
              Makler provisionspflichtig beauftragen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

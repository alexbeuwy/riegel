"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { useAuth } from "@/components/auth";
import { type Provision } from "@/lib/mock-estates";
import {
  BUYER_FIELDS,
  buyerToMetadata,
  buyerValidationError,
  readBuyerDetails,
  type BuyerDetails,
} from "@/lib/buyer-details";

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
  const { enabled, ready, user, session, updateProfile } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // Provisionszustimmung (Pflicht-Haken) + Nachweis-Stammdaten für den Dialog.
  const [consent, setConsent] = useState(false);
  const [buyer, setBuyer] = useState<BuyerDetails>(() => readBuyerDetails(user?.user_metadata));

  // Beim Öffnen des Dialogs die aktuellen Konto-Stammdaten übernehmen (Nutzer
  // kann fehlende Angaben direkt hier ergänzen, ohne den Flow zu verlassen).
  useEffect(() => {
    if (!confirmOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Vorbefüllung beim Öffnen, keine Render-Schleife (Präzedenz: reveal.tsx/modal.tsx)
    setBuyer(readBuyerDetails(user?.user_metadata));
  }, [confirmOpen, user]);

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
      setConsent(false); // Haken pro Vorgang neu setzen
      setConfirmOpen(true);
    }
  }

  // Bestätigen im Dialog: erst die Provisionsvereinbarung serverseitig
  // dokumentieren (E-Mail an Anbieter, Nutzer in Kopie). Nur bei OK schließt
  // der Dialog und der eigentliche Download startet.
  async function confirmAndDownload() {
    if (confirming || busy || !session) return;
    if (!consent) {
      setConfirmError("Bitte bestätigen Sie die Provisionsvereinbarung mit dem Haken.");
      return;
    }
    const buyerErr = buyerValidationError(buyer);
    if (buyerErr) {
      setConfirmError(buyerErr);
      return;
    }
    setConfirmError(null);
    setConfirming(true);
    try {
      // Ergänzte/korrigierte Stammdaten dauerhaft im Konto speichern (damit sie
      // beim nächsten Objekt vorbefüllt sind) — Fehler hier blockieren den
      // Download nicht, die Daten gehen ohnehin mit in die Bestätigung.
      await updateProfile(buyerToMetadata(buyer));
      const res = await fetch(`/api/expose/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug, buyer: buyerToMetadata(buyer), consent: true }),
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
            Mit Klick auf ‚Zahlungspflichtig beauftragen’ stimmen Sie
            der Provisionsvereinbarung des Anbieters zu dieser Immobilie zu.
          </p>
          <p>
            Gut zu wissen: Die Provision wird selbstverständlich nur dann
            fällig, wenn Sie die Immobilie tatsächlich kaufen.
          </p>
          <p>
            Mit Absenden Ihrer Bestätigung wird eine automatisierte E-Mail an
            den Anbieter und Sie in Kopie gesendet, die die
            Provisionsvereinbarung samt Ihren Kontaktdaten enthält.
          </p>

          {/* Nachweis-Stammdaten: aus dem Konto vorbefüllt, hier prüf-/ergänzbar.
              Vollständige Angaben sind Voraussetzung für einen sauberen
              Provisionsnachweis (wie bei OnOffice/IS24). */}
          <div className="rounded-xl border border-border bg-surface-2/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">
              Ihre Angaben für den Nachweis
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {BUYER_FIELDS.map((f) => (
                <label key={f.key} className={`block space-y-1 ${f.wide ? "col-span-2" : ""}`}>
                  <span className="text-[0.7rem] text-muted">{f.label}</span>
                  <input
                    type={f.key === "phone" ? "tel" : "text"}
                    inputMode={f.key === "zip" ? "numeric" : f.key === "phone" ? "tel" : "text"}
                    autoComplete={f.autoComplete}
                    value={buyer[f.key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBuyer((b) => ({ ...b, [f.key]: v }));
                      setConfirmError(null);
                    }}
                    placeholder={f.placeholder}
                    disabled={confirming}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Pflicht-Haken: aktive Zustimmung zur Provisionsvereinbarung. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 text-fg">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setConfirmError(null);
              }}
              disabled={confirming}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-relaxed">
              Ich beauftrage den Anbieter provisionspflichtig und stimme der
              Provisionsvereinbarung zu dieser Immobilie ({provisionText}) aktiv zu.
            </span>
          </label>

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
              disabled={confirming || !consent}
              className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {confirming && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              )}
              {/* Button-Lösung § 312j Abs. 3 BGB (BGH, Urt. v. 09.10.2025 —
                  I ZR 159/24): Die Schaltfläche, mit der der Maklervertrag
                  online zustande kommt, muss die Zahlungspflicht selbst
                  benennen — sonst ist der Vertrag nichtig und die Provision
                  unwiederbringlich verloren. „Zahlungspflichtig beauftragen"
                  ist die auf den Maklervertrag übertragene Gesetzesformel
                  („zahlungspflichtig bestellen"); KEINE weiteren Wörter auf
                  dem Button, Zusätze verwässern die Eindeutigkeit. */}
              Zahlungspflichtig beauftragen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

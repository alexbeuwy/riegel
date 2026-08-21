"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { anfrageSchema, pruefeFormular } from "@/lib/validierung";
import { MailVorschlag } from "@/components/mail-vorschlag";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

/** Echtes Objekt-Anfrageformular mit direkter Übergabe an /api/inquiry (Mail +
 * Supabase + best-effort OnOffice). Wird im Besichtigungs-Modal der
 * Objekt-Detailseite eingebettet — Formular-Stil 1:1 aus contact-form.tsx. */
export function InquiryForm({ objektTitel, objektId }: { objektTitel: string; objektId: string }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    message: `Ich interessiere mich für: ${objektTitel}`,
    consent: false,
    website: "", // Honeypot — bleibt bei Menschen leer
  });
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setError(null);
    setF((s) => ({ ...s, [k]: v }));
  };

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  async function submit() {
    if (busy) return;
    // Gleiche Prüfung wie im Server (lib/validierung.ts) — nur früher sichtbar.
    const geprueft = pruefeFormular(anfrageSchema, f);
    if (!geprueft.ok) return fail(geprueft.fehler);
    if (!f.consent) return fail("Bitte der Verarbeitung zustimmen.");
    setError(null);
    // Lokaler Fallback, falls der Versand scheitert (Daten nicht verlieren).
    try {
      const key = "riegel:inquiries";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.push({ ...f, objektTitel, objektId, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}
    // Echte Zustellung an RIEGEL + Bestätigung an den Absender (Resend,
    // serverseitig) sowie best-effort Übergabe an OnOffice.
    setBusy(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          email: f.email,
          telefon: f.phone,
          nachricht: f.message,
          objektTitel,
          objektId,
          website: f.website,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setDone(true);
    } catch {
      fail("Senden fehlgeschlagen. Bitte erneut versuchen oder rufen Sie uns direkt an.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-surface p-6 text-center">
        <span
          className="t-success-check mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent"
          data-state="in"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4 10-10" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-medium text-fg">
          Anfrage gesendet — wir melden uns innerhalb eines Werktages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <label className="block space-y-2">
          <span className="text-sm text-muted">Name</span>
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Vor- und Nachname" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted">E-Mail</span>
          <input className={inputCls} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@beispiel.de" />
          <MailVorschlag email={f.email} onUebernehmen={(v) => set("email", v)} />
        </label>
      </div>
      <label className="block space-y-2">
        <span className="text-sm text-muted">Telefon (optional)</span>
        <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Für Rückfragen" />
      </label>
      {/* Honeypot — für Menschen unsichtbar, Bots füllen es aus. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={f.website}
        onChange={(e) => setF((s) => ({ ...s, website: e.target.value }))}
        className="hidden"
      />
      <label className="block space-y-2">
        <span className="text-sm text-muted">Nachricht</span>
        <textarea
          className={`${inputCls} resize-y`}
          rows={3}
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={f.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
        />
        <span>
          Ich willige ein, dass meine Angaben zur Bearbeitung der Anfrage
          verarbeitet werden. Jederzeit widerrufbar (siehe{" "}
          <Link href="/datenschutz" className="text-accent hover:underline">Datenschutz</Link>).
        </span>
      </label>
      <div className={`t-input-wrap ${error ? "is-error" : ""}`}>
        <p className="t-error-msg mb-3 text-sm text-accent" role="alert">
          {error ?? " "}
        </p>
        <button
          key={errorNonce}
          type="button"
          onClick={submit}
          disabled={busy}
          className={`t-input ${error ? "is-shaking" : ""} inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.99] disabled:opacity-70`}
        >
          <Icon name="mail" size={18} />
          {busy ? "Wird gesendet …" : "Anfrage senden"}
        </button>
        {/* Klarstellung nach BGH, Urt. v. 09.10.2025 (I ZR 159/24): Über eine
            neutrale „Senden"-Schaltfläche KANN kein provisionspflichtiger
            Maklervertrag geschlossen werden (§ 312j Abs. 3 BGB). Diese Zeile
            stellt aktiv klar, dass hier auch keiner geschlossen werden SOLL —
            die Provisionsvereinbarung läuft ausschließlich über den dafür
            gebauten Dialog mit zahlungspflichtig beschriftetem Button
            (expose-cta.tsx) bzw. die dokumentierten Prozesse vor Ort. */}
        <p className="mt-2.5 text-center text-[0.7rem] leading-relaxed text-faint">
          Ihre Anfrage ist unverbindlich und begründet keine Provisionspflicht.
          Eine Provisionsvereinbarung kommt erst durch eine gesonderte, ausdrücklich
          als zahlungspflichtig gekennzeichnete Beauftragung zustande.
        </p>
      </div>
    </div>
  );
}

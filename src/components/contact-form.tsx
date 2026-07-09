"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";

const ANLIEGEN = [
  "Allgemeine Anfrage",
  "Immobilie verkaufen",
  "Besichtigung vereinbaren",
  "Immobilienbewertung",
  "Finanzierung",
  "Sonstiges",
];

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

// useSearchParams verlangt eine Suspense-Grenze (Next-Build-Regel für CSR-Bailout).
export function ContactForm() {
  return (
    <Suspense>
      <ContactFormInner />
    </Suspense>
  );
}

function ContactFormInner() {
  const searchParams = useSearchParams();
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    topic: ANLIEGEN[0],
    message: "",
    consent: false,
    website: "", // Honeypot — bleibt bei Menschen leer
  });
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Objektbezug aus vorgelagerten Links (?objekt=…) — befüllt die
    // Nachricht vor, aber nur solange sie noch leer ist (keine Nutzereingabe
    // überschreiben).
    const objekt = searchParams.get("objekt");
    if (!objekt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF((s) => (s.message ? s : { ...s, message: `Ich interessiere mich für: ${objekt}` }));
  }, [searchParams]);

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
    if (!f.name) return fail("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return fail("Bitte eine gültige E-Mail angeben.");
    if (!f.message) return fail("Bitte eine Nachricht eingeben.");
    if (!f.consent) return fail("Bitte der Verarbeitung zustimmen.");
    setError(null);
    // Lokaler Fallback, falls der Versand scheitert (Daten nicht verlieren).
    try {
      const key = "riegel:contacts";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.push({ ...f, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}
    // Echte Zustellung an Riegel + Bestätigung an den Absender (Resend, serverseitig).
    // Erst nach Erfolg bestätigen — keine Schein-Bestätigung bei Fehlern.
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, email: f.email, phone: f.phone, topic: f.topic, message: f.message, website: f.website }),
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
      <div className="rounded-2xl border border-accent/30 bg-surface p-8 text-center">
        <span
          className="t-success-check mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent"
          data-state="in"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4 10-10" />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-semibold">Danke, {f.name.split(" ")[0] || "schön"}!</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Ihre Nachricht ist bei uns angekommen. Wir melden uns in der Regel
          innerhalb eines Werktages.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm text-muted">Name</span>
          <input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Vor- und Nachname" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted">E-Mail</span>
          <input className={inputCls} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@beispiel.de" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-muted">Telefon (optional)</span>
          <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Für Rückfragen" />
        </label>
        {/* Honeypot — für Menschen unsichtbar, Bots füllen es aus. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={(e) => setF((s) => ({ ...s, website: e.target.value }))} className="hidden" />
        <label className="block space-y-2">
          <span className="text-sm text-muted">Anliegen</span>
          <select className={inputCls} value={f.topic} onChange={(e) => set("topic", e.target.value)}>
            {ANLIEGEN.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-muted">Nachricht</span>
        <textarea
          className={`${inputCls} min-h-32 resize-y`}
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Wie können wir helfen?"
        />
      </label>
      <label className="mt-4 flex items-start gap-3 text-sm text-muted">
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
      <div className={`t-input-wrap mt-6 ${error ? "is-error" : ""}`}>
        <p className="t-error-msg mb-3 text-sm text-accent" role="alert">
          {error ?? " "}
        </p>
        <button
          key={errorNonce}
          type="button"
          onClick={submit}
          disabled={busy}
          className={`t-input ${error ? "is-shaking" : ""} inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.99] disabled:opacity-70 sm:w-auto`}
        >
          <Icon name="mail" size={18} />
          {busy ? "Wird gesendet …" : "Nachricht senden"}
        </button>
      </div>
    </div>
  );
}

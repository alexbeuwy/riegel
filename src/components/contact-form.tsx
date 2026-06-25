"use client";

import { useState } from "react";

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

export function ContactForm() {
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    topic: ANLIEGEN[0],
    message: "",
    consent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.name) return setError("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setError("Bitte eine gültige E-Mail angeben.");
    if (!f.message) return setError("Bitte eine Nachricht eingeben.");
    if (!f.consent) return setError("Bitte der Verarbeitung zustimmen.");
    setError(null);
    try {
      const key = "riegel:contacts";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.push({ ...f, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-surface p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent">✓</div>
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
          verarbeitet werden. Jederzeit widerrufbar (siehe Datenschutz).
        </span>
      </label>
      {error && <p className="mt-4 text-sm text-accent">{error}</p>}
      <button
        type="button"
        onClick={submit}
        className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.99] sm:w-auto"
      >
        Nachricht senden
      </button>
    </div>
  );
}

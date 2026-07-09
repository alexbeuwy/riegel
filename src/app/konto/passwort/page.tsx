"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

// Ziel des Supabase-Reset-Links (siehe /konto → resetPassword-Aufruf). Der
// Client bekommt darüber eine Recovery-Session — kein eigenes Event-Handling
// nötig, useAuth().user ist danach einfach gesetzt.
export default function KontoPasswortPage() {
  const { ready, user, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const fail = (m: string) => {
    setError(m);
    setNonce((n) => n + 1);
  };

  async function submit() {
    if (busy) return;
    if (password.length < 8) return fail("Passwort: mindestens 8 Zeichen.");
    if (password !== password2) return fail("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.error) return fail(res.error);
    setDone(true);
  }

  return (
    <>
      <PageIntro eyebrow="Mein Konto" title="Neues Passwort setzen">
        Vergeben Sie ein neues Passwort für Ihr RIEGEL-Konto — danach können
        Sie sich damit wie gewohnt anmelden.
      </PageIntro>

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-md">
            {!ready ? (
              <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
            ) : done ? (
              /* Erfolg — gleiches Muster wie im Kontaktformular (t-success-check) */
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
                <h2 className="mt-4 text-xl font-semibold">Passwort aktualisiert</h2>
                <p className="mx-auto mt-2 max-w-sm text-muted">
                  Ihr neues Passwort ist gespeichert — Sie können sich ab sofort
                  damit anmelden.
                </p>
                <Link
                  href="/konto"
                  className="press mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Icon name="lock" size={17} />
                  Zum Konto
                </Link>
              </div>
            ) : !user ? (
              /* Kein gültiger Recovery-Link (abgelaufen, schon benutzt — oder
               * Supabase lokal nicht konfiguriert): keine Konto-Details preisgeben. */
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
                  <Icon name="key" size={26} />
                </div>
                <h2 className="text-xl font-semibold">Link abgelaufen oder ungültig</h2>
                <p className="mx-auto mt-3 max-w-sm text-muted">
                  Der Link ist abgelaufen oder ungültig — fordern Sie einen
                  neuen an.
                </p>
                <Link
                  href="/konto"
                  className="press mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover"
                >
                  <Icon name="arrowLeft" size={17} />
                  Zum Konto
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <label className="block space-y-2">
                  <span className="text-sm text-muted">Neues Passwort</span>
                  <input
                    className={inputCls}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="mind. 8 Zeichen"
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm text-muted">Passwort wiederholen</span>
                  <input
                    className={inputCls}
                    type="password"
                    autoComplete="new-password"
                    value={password2}
                    onChange={(e) => { setPassword2(e.target.value); setError(null); }}
                    placeholder="Passwort erneut eingeben"
                  />
                </label>

                <div className={`t-input-wrap mt-4 ${error ? "is-error" : ""}`}>
                  <p className="t-error-msg text-sm text-accent" role="alert">{error ?? " "}</p>
                </div>

                <button
                  key={nonce}
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className={`t-input ${error ? "is-shaking" : ""} press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60`}
                >
                  <Icon name="key" size={17} />
                  {busy ? "Bitte warten …" : "Passwort speichern"}
                </button>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

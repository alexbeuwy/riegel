"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

export default function KontoPage() {
  const { enabled, ready, user, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (m: string) => {
    setError(m);
    setNonce((n) => n + 1);
  };

  async function submit() {
    setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    if (password.length < 8) return fail("Passwort: mindestens 8 Zeichen.");
    setBusy(true);
    const res = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (res.error) return fail(res.error);
    if (mode === "register" && "needsConfirm" in res && res.needsConfirm) {
      setInfo("Fast geschafft — bitte bestätigen Sie Ihre E-Mail-Adresse.");
    }
  }

  return (
    <>
      <PageIntro eyebrow="Mein Konto" title="Anmelden & Merkliste sichern">
        Mit einem Konto sichern Sie Favoriten und Suchaufträge geräteübergreifend
        und werden bei passenden neuen Objekten benachrichtigt.
      </PageIntro>

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-md">
            {/* Konten noch nicht konfiguriert → freundlicher Hinweis */}
            {!enabled ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2 text-accent">
                  <Icon name="lock" size={26} />
                </div>
                <h2 className="text-xl font-semibold">Konten werden gerade eingerichtet</h2>
                <p className="mx-auto mt-3 max-w-sm text-muted">
                  Ihre Merkliste und gespeicherten Suchen funktionieren bereits
                  jetzt — sie werden lokal in diesem Browser gesichert. Login &
                  geräteübergreifende Synchronisation folgen in Kürze.
                </p>
                <Link
                  href="/merkliste"
                  className="press mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  <Icon name="heart" size={17} />
                  Zur Merkliste
                </Link>
              </div>
            ) : !ready ? (
              <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
            ) : user ? (
              /* Eingeloggt */
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Icon name="check" size={26} />
                </div>
                <h2 className="text-xl font-semibold">Eingeloggt</h2>
                <p className="mt-2 break-all text-muted">{user.email}</p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <Link href="/merkliste" className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover">
                    <Icon name="heart" size={17} /> Meine Merkliste
                  </Link>
                  <button onClick={() => signOut()} className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg hover:border-accent hover:text-accent">
                    <Icon name="lock" size={16} /> Abmelden
                  </button>
                </div>
              </div>
            ) : (
              /* Login / Registrierung */
              <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-border p-1 text-sm">
                  {(["login", "register"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(null); setInfo(null); }}
                      className={`rounded-full py-2 transition-colors ${mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                    >
                      {m === "login" ? "Anmelden" : "Registrieren"}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm text-muted">E-Mail</span>
                    <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="name@beispiel.de" />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-muted">Passwort</span>
                    <input className={inputCls} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="mind. 8 Zeichen" />
                  </label>
                </div>

                <div className={`t-input-wrap mt-4 ${error ? "is-error" : ""}`}>
                  <p className="t-error-msg text-sm text-accent" role="alert">{error ?? " "}</p>
                </div>
                {info && <p className="mt-2 text-sm text-accent-strong">{info}</p>}

                <button
                  key={nonce}
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className={`t-input ${error ? "is-shaking" : ""} press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60`}
                >
                  <Icon name={mode === "login" ? "lock" : "users"} size={17} />
                  {busy ? "Bitte warten …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
                </button>

                <p className="mt-4 text-center text-xs text-faint">
                  Mit der Anmeldung stimmen Sie der Verarbeitung gemäß{" "}
                  <Link href="/datenschutz" className="text-accent hover:underline">Datenschutz</Link> zu.
                </p>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}

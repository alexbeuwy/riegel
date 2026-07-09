"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/container";
import { PageIntro } from "@/components/page-intro";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth";
import { ProfileForm } from "@/components/profile-form";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

// useSearchParams verlangt eine Suspense-Grenze (Next-Build-Regel für CSR-Bailout).
export default function KontoPage() {
  return (
    <Suspense>
      <KontoInner />
    </Suspense>
  );
}

function KontoInner() {
  const { enabled, ready, user, signIn, signUp, signOut, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?next=/immobilien/… — nach Login/Registrierung dorthin zurück (z. B. vom
  // Exposé-CTA). Nur interne Pfade zulassen, sonst wäre das ein Open-Redirect.
  const rawNext = searchParams.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  useEffect(() => {
    if (next && user) router.replace(next);
  }, [next, user, router]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // „Passwort vergessen?" — kein eigenes Routing, nur ein Inline-Zustand, der
  // das bestehende E-Mail-Feld für den Reset-Link-Versand weiterverwendet.
  const [forgot, setForgot] = useState(false);

  const fail = (m: string) => {
    setError(m);
    setNonce((n) => n + 1);
  };

  function openForgot() {
    setError(null);
    setInfo(null);
    setForgot(true);
  }

  function closeForgot() {
    setError(null);
    setInfo(null);
    setForgot(false);
  }

  async function submit() {
    setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    if (password.length < 8) return fail("Passwort: mindestens 8 Zeichen.");
    setBusy(true);
    // Bestätigungslink zurück auf diese Seite (inkl. ?next=) — sonst verliert
    // z. B. der Exposé-CTA-Flow nach der Pflicht-E-Mail-Bestätigung sein Ziel.
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/konto${next ? `?next=${encodeURIComponent(next)}` : ""}`
        : undefined;
    const res = mode === "login" ? await signIn(email, password) : await signUp(email, password, redirectTo);
    setBusy(false);
    if (res.error) return fail(res.error);
    if (mode === "register" && "needsConfirm" in res && res.needsConfirm) {
      setInfo("Fast geschafft — bitte bestätigen Sie Ihre E-Mail-Adresse.");
    }
  }

  async function submitForgot() {
    setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    setBusy(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/konto/passwort` : "";
    const res = await resetPassword(email, redirectTo);
    setBusy(false);
    if (res.error) return fail(res.error);
    // Bewusst konto-agnostisch formuliert — sonst ließe sich per Fehlermeldung
    // erraten, welche E-Mail-Adressen ein Konto haben.
    setInfo("Wenn ein Konto existiert, ist ein Reset-Link unterwegs — bitte Posteingang prüfen.");
  }

  return (
    <>
      <PageIntro eyebrow="Mein Konto" title="Anmelden & Merkliste sichern">
        Mit einem Konto sichern Sie Favoriten und Suchaufträge geräteübergreifend,
        laden PDF-Exposés direkt herunter und erfahren von neuen Objekten,
        noch bevor sie öffentlich online gehen.
      </PageIntro>

      <section className="py-14">
        <Container>
          <div className="mx-auto max-w-2xl">
            {/* Konten noch nicht konfiguriert → freundlicher Hinweis */}
            {!enabled ? (
              <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
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
              <div className="mx-auto h-40 max-w-md animate-pulse rounded-2xl border border-border bg-surface" />
            ) : user ? (
              /* Eingeloggt: Konto-Kopf + Suchprofil */
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Icon name="check" size={22} />
                    </span>
                    <div>
                      <div className="text-sm text-faint">Eingeloggt als</div>
                      <div className="break-all text-fg">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link href="/merkliste" className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover">
                      <Icon name="heart" size={16} /> Merkliste
                    </Link>
                    <button onClick={() => signOut()} className="press inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-fg hover:border-accent hover:text-accent">
                      <Icon name="lock" size={15} /> Abmelden
                    </button>
                  </div>
                </div>
                <ProfileForm />
              </div>
            ) : forgot ? (
              /* Passwort vergessen — Inline-Zustand statt eigener Route */
              <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeForgot}
                    aria-label="Zurück zur Anmeldung"
                    className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon name="arrowLeft" size={16} />
                  </button>
                  <h2 className="text-lg font-semibold">Passwort zurücksetzen</h2>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm text-muted">E-Mail</span>
                  <input className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="name@beispiel.de" />
                </label>

                <div className={`t-input-wrap mt-4 ${error ? "is-error" : ""}`}>
                  <p className="t-error-msg text-sm text-accent" role="alert">{error ?? " "}</p>
                </div>
                {info && <p className="mt-2 text-sm text-accent-strong">{info}</p>}

                <button
                  key={nonce}
                  type="button"
                  onClick={submitForgot}
                  disabled={busy}
                  className={`t-input ${error ? "is-shaking" : ""} press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60`}
                >
                  <Icon name="key" size={17} />
                  {busy ? "Bitte warten …" : "Reset-Link anfordern"}
                </button>
              </div>
            ) : (
              /* Login / Registrierung */
              <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8">
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

                {mode === "login" && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={openForgot}
                      className="text-xs text-muted transition-colors hover:text-accent"
                    >
                      Passwort vergessen?
                    </button>
                  </div>
                )}

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

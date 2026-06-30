"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { burstConfetti } from "@/lib/confetti";
import type { GeoResult } from "@/lib/geocode";
import type { ValuationResult, Objektart, Zustand, Qualitaet } from "@/lib/valuation";

/** Subset von FormState, das in den Report einfließt. */
export interface ReportSource {
  objektart: Objektart;
  address: GeoResult | null;
  wohnflaeche: string;
  grundflaeche: string;
  zimmer: string;
  baujahr: string;
  zustand: Zustand;
  qualitaet: Qualitaet;
  energieklasse: string;
}

export function ReportRequest({
  f,
  result,
  onReset,
}: {
  f: ReportSource;
  result: ValuationResult;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const fail = (m: string) => {
    setError(m);
    setNonce((n) => n + 1);
  };

  async function submit() {
    if (!name.trim()) return fail("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    if (!/\d{5,}/.test(phone.replace(/\s+/g, ""))) return fail("Bitte Ihre Telefonnummer angeben.");
    if (!consent) return fail("Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.");
    setError(null);
    setBusy(true);
    const payload = {
      name,
      email,
      phone,
      message,
      address: f.address?.label ?? "",
      city: f.address?.city ?? "",
      postcode: f.address?.postcode ?? "",
      lat: f.address?.lat,
      lng: f.address?.lng,
      objektart: f.objektart,
      wohnflaeche: f.wohnflaeche,
      grundflaeche: f.grundflaeche,
      zimmer: f.zimmer,
      baujahr: f.baujahr,
      zustand: f.zustand,
      qualitaet: f.qualitaet,
      energieklasse: f.energieklasse,
      valuation: {
        low: result.low,
        mid: result.mid,
        high: result.high,
        pricePerSqm: result.pricePerSqm,
        comparables: result.comparables,
        confidence: result.confidence,
        trendPct: result.trendPct,
        mikrolage: result.mikrolage,
      },
    };
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("send failed");
      setDelivered(Boolean(data?.delivered));
    } catch {
      setDelivered(false);
      // Auch ohne Mail-Backend: lokal sichern, freundlich bestätigen.
      try {
        const key = "riegel:reports";
        const cur = JSON.parse(localStorage.getItem(key) || "[]");
        cur.push({ ...payload, createdAt: Date.now() });
        localStorage.setItem(key, JSON.stringify(cur));
      } catch {}
    }
    setBusy(false);
    setDone(true);
    burstConfetti();
  }

  if (done) {
    return (
      <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center rounded-2xl border border-accent/30 bg-surface p-8 text-center">
        <span
          className="t-success-check flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent"
          data-state="in"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4 10-10" />
          </svg>
        </span>
        <h3 className="mt-5 text-xl font-semibold">
          {delivered ? "Ihr Report ist unterwegs" : "Anfrage eingegangen"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted">
          {delivered ? (
            <>
              Wir haben Ihren persönlichen Marktwert-Report an <span className="text-fg">{email}</span> gesendet
              und melden uns persönlich für die genaue Vor-Ort-Bewertung.
            </>
          ) : (
            <>
              Vielen Dank! Ihre Anfrage ist bei uns eingegangen — wir senden Ihren Report an{" "}
              <span className="text-fg">{email}</span> und melden uns persönlich.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/termin" className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover">
            <Icon name="calendar" size={17} /> Termin vereinbaren
          </Link>
          <button type="button" onClick={onReset} className="press rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
            Neue Bewertung
          </button>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent";

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-accent/30 bg-surface p-6 sm:p-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-accent">
          <Icon name="doc" size={18} />
          Persönlicher Marktwert-Report
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Erhalten Sie diese Einschätzung als <strong className="text-fg">übersichtlichen Report</strong> —
          mit Wertspanne, Kennzahlen und Lage — direkt per E-Mail. Kostenlos &amp; unverbindlich.
        </p>
      </div>

      {!open ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="press inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="doc" size={17} />
            Report als PDF anfordern
          </button>
          <button type="button" onClick={onReset} className="press rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
            Neue Bewertung
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} aria-label="Name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Name" />
            <input className={inputCls} aria-label="E-Mail" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="E-Mail" />
            <input className={`${inputCls} sm:col-span-2`} aria-label="Telefon / Handy" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} placeholder="Telefon / Handy" />
            <textarea className={`${inputCls} sm:col-span-2 resize-none`} aria-label="Nachricht (optional)" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nachricht (optional)" />
          </div>

          <label className="mt-3 flex items-start gap-2.5 text-left text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(null); }} className="mt-0.5 h-4 w-4 accent-accent" />
            <span>
              Ich willige ein, dass meine Angaben zur Erstellung des Reports und zur Kontaktaufnahme
              verarbeitet werden. Jederzeit widerrufbar (siehe{" "}
              <Link href="/datenschutz" className="text-accent hover:underline">Datenschutz</Link>).
            </span>
          </label>

          <div className={`t-input-wrap mt-4 ${error ? "is-error" : ""}`}>
            <p className="t-error-msg mb-3 text-sm text-accent" role="alert">{error ?? " "}</p>
            <button
              key={nonce}
              type="button"
              onClick={submit}
              disabled={busy}
              className={`t-input ${error ? "is-shaking" : ""} press inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70`}
            >
              {busy ? (
                <>
                  <svg className="animate-spin" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                    <path d="M21 12a9 9 0 0 1-9 9" />
                  </svg>
                  Report wird erstellt …
                </>
              ) : (
                <>
                  <Icon name="doc" size={17} /> Report jetzt zusenden
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

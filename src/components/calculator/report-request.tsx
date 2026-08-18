"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { burstConfetti } from "@/lib/confetti";
import { track } from "@/lib/track";
import type { GeoResult } from "@/lib/geocode";
import type { ValuationResult, Objektart, Zustand, Qualitaet, Vermietungsstand } from "@/lib/valuation";
import { site } from "@/lib/site";

// tel:-Ableitung aus site.phone (führende 0 → Landesvorwahl +49) — dieselbe
// Nummer wird unten als lesbares Label UND als Klick-Link gebraucht.
const TEL_HREF = `+49${site.phone.replace(/\D/g, "").replace(/^0/, "")}`;

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
  ausstattung: string[];
  /** Nur für objektart === "mehrfamilienhaus" — reiner Durchreich-Wert
   * an /api/report, das den Wert serverseitig neu berechnet (s. dort). */
  jahresnettokaltmiete: string;
  wohneinheiten: string;
  gewerbeeinheiten: string;
  vermietungsstand: Vermietungsstand;
  leerstehendeWohnflaeche: string;
  /** Nur für objektart === "gewerbe" — Hallen-/Lager- und Wohnanteil an der
   * Nutzfläche (Mischobjekt), ebenfalls reine Durchreich-Werte. */
  hallenflaeche: string;
  mischWohnflaeche: string;
  /** Wohnung: Hausgeld/Monat; Wohnung/Haus: Kernsanierung — Durchreich-Werte,
   * der Server rechnet damit nach (s. /api/report, valuation.ts). */
  hausgeld: string;
  kernsaniert: boolean;
}

export function ReportRequest({
  f,
  result,
  onReset,
  onAnpassen,
  onGesendet,
  borisLoading = false,
}: {
  f: ReportSource;
  result: ValuationResult;
  onReset: () => void;
  /** Zurück ins Formular (Eckdaten), OHNE Reset — die Angaben bleiben stehen.
   * Der sanfte Ausweg neben „Neue Bewertung": wer nur die Wohnfläche
   * korrigieren will, musste bisher alles neu eintippen. */
  onAnpassen?: () => void;
  /** Nach erfolgreichem Versand: der Calculator verwirft seinen gespeicherten
   * Formularstand (sessionStorage) — der Lead ist raus, der Entwurf erledigt. */
  onGesendet?: () => void;
  /** Amtlicher Bodenrichtwert lädt noch (s. calculator.tsx) — der Server
   * rechnet beim Versand ohnehin serverseitig mit dem amtlichen Wert nach
   * (gegen Manipulation), daher blockt der Button den Versand, solange die
   * im Formular sichtbare Zahl davon noch abweichen könnte. */
  borisLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot — bleibt bei Menschen leer
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [delivered, setDelivered] = useState(false);
  // Headline-Reveal beim Viewport-Eintritt (Wunsch Alex 18.08.2026: der
  // Report-Block ist DAS Highlight, die Headline darf auftreten).
  const headRef = useRef<HTMLHeadingElement>(null);
  const [headIn, setHeadIn] = useState(false);
  // Gelegentliches Aufmerksamkeits-Rattle des CTA (transitions-dev-Geist:
  // klein, selten, reduced-motion-gated — kein Dauerzappeln).
  const [rattle, setRattle] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHeadIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (open || done) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    let aus: ReturnType<typeof setTimeout>;
    const plan = () => {
      t = setTimeout(() => {
        setRattle(true);
        aus = setTimeout(() => setRattle(false), 650);
        plan();
      }, 6000 + Math.random() * 9000);
    };
    plan();
    return () => {
      clearTimeout(t);
      clearTimeout(aus);
    };
  }, [open, done]);

  // Das orange PDF-Badge im Ergebnis öffnet das Formular aus der Ferne —
  // gleicher Effekt wie ein Klick auf den CTA, plus Scroll hierher.
  useEffect(() => {
    const auf = () => {
      setOpen(true);
      setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    };
    window.addEventListener("riegel:report-oeffnen", auf);
    return () => window.removeEventListener("riegel:report-oeffnen", auf);
  }, []);

  const fail = (m: string) => {
    setError(m);
    setNonce((n) => n + 1);
  };

  async function submit() {
    if (!name.trim()) return fail("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    // Telefon ist optional (E-Mail reicht für den Report) — nur prüfen, wenn angegeben.
    if (phone.trim() && !/\d{5,}/.test(phone.replace(/\s+/g, "")))
      return fail("Die Telefonnummer scheint unvollständig — bitte prüfen (oder Feld leer lassen).");
    if (!consent) return fail("Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.");
    setError(null);
    setBusy(true);
    const payload = {
      name,
      email,
      phone,
      message,
      website,
      ausstattung: f.ausstattung,
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
      jahresnettokaltmiete: f.jahresnettokaltmiete,
      wohneinheiten: f.wohneinheiten,
      gewerbeeinheiten: f.gewerbeeinheiten,
      // Fehlten hier bisher komplett: der Server rechnete das PDF dadurch
      // OHNE Hallen-Split und Vermietungsstand — ein Gewerbe mit Halle bekam
      // im Report einen höheren Wert als im Rechner angezeigt, und ein leer
      // stehendes MFH lief in die Miet-Pflichtprüfung (422, kein Report).
      vermietungsstand: f.vermietungsstand,
      leerstehendeWohnflaeche: f.leerstehendeWohnflaeche,
      hallenflaeche: f.hallenflaeche,
      mischWohnflaeche: f.mischWohnflaeche,
      hausgeldMonat: f.hausgeld,
      kernsaniert: f.kernsaniert,
      // Kennzahlen werden NICHT mehr mitgesendet: der Server rechnet seit
      // 11.08.2026 deterministisch selbst (inkl. echter Vergleichszahlen aus
      // dem Verkauft-Pool) und ignoriert Client-Kennzahlen ohnehin.
      valuation: {
        low: result.low,
        mid: result.mid,
        high: result.high,
        pricePerSqm: result.pricePerSqm,
      },
    };
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error("send failed");
      track("report_angefordert");
      setDelivered(Boolean(data?.delivered));
    } catch {
      // KEINE Schein-Bestätigung: der Lead würde RIEGEL sonst nie erreichen.
      // Lokal sichern (für erneuten Versuch) und ehrlich um Retry/Anruf bitten.
      try {
        const key = "riegel:reports";
        const cur = JSON.parse(localStorage.getItem(key) || "[]");
        cur.push({ ...payload, createdAt: Date.now() });
        localStorage.setItem(key, JSON.stringify(cur));
      } catch {}
      setBusy(false);
      return fail(`Senden fehlgeschlagen — bitte erneut versuchen oder rufen Sie uns direkt an: ${site.phone}.`);
    }
    setBusy(false);
    setDone(true);
    onGesendet?.();
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
    <div ref={rootRef} data-track-bereich="report-formular" className="mx-auto mt-10 max-w-4xl rounded-2xl border border-accent/30 bg-surface p-6 sm:p-8">
      {/* Kopf über die volle Breite, DANN 2 Spalten (Feedback Alex 18.08.2026,
          Runde 3): das Visual hing vorher vertikal zentriert „halb in der
          Headline". Jetzt: Eyebrow + Headline oben, darunter Text links /
          Visual rechts — das Visual richtet sich an den Argumenten aus. */}
      <div className="text-center md:text-left">
        <div className="flex items-center justify-center gap-2 text-sm text-accent-strong md:justify-start">
          <Icon name="doc" size={18} />
          Ihr nächster Schritt
        </div>
        {/* DAS Highlight des Ergebnisses (Wunsch Alex 18.08.2026): große
            AKIRA-Headline in Weiß, animierter Auftritt beim Viewport-
            Eintritt (.report-headline in globals.css). */}
        <h3
          ref={headRef}
          data-in={headIn ? "1" : undefined}
          className="report-headline akira mx-auto mt-4 max-w-2xl text-2xl leading-[0.95] text-white sm:text-4xl md:mx-0"
        >
          Persönlicher Marktwert&#8209;Report
        </h3>
      </div>

      <div className="mt-7 grid items-center gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="text-center md:text-left">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted md:mx-0">
            Diese Sofort-Einschätzung ist nur der Anfang. Der vollständige Report
            {f.address?.label ? (
              <>
                {" "}für{" "}
                {/* Die exakte Adresse in Warm-Orange (Wunsch Alex): macht
                    greifbar, dass es jetzt um GENAU diese Immobilie geht. */}
                <span className="font-semibold text-amber-300">{f.address.label}</span>
              </>
            ) : null}{" "}
            zeigt, <strong className="text-fg">worauf es beim Preis wirklich ankommt</strong> —
            kostenlos, unverbindlich, direkt per E-Mail.
          </p>

          {/* Psychologischer Nutzen-Block: WARUM sich das Ausfüllen lohnt — bleibt
              immer sichtbar, auch wenn das Formular offen ist (kein Wegklappen von
              Vertrauens-Argumenten genau dann, wenn sie am meisten wirken). */}
          <ul className="mx-auto mt-6 grid max-w-md gap-3.5 text-left text-sm leading-relaxed text-fg/90 md:mx-0">
            <li className="flex items-start gap-3">
              <Icon name="chart" size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Alle Preis-Faktoren im Detail — was Ihren Wert erhöht, was ihn senkt und wie der
                Marktwert von{" "}
                <strong className="text-fg">{new Intl.NumberFormat("de-DE").format(result.mid)} €</strong>{" "}
                zustande kommt
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Satellitenbild &amp; Einschätzung der genauen Mikrolage — abgeglichen mit{" "}
                <strong className="text-fg">10 Datenquellen</strong> und über{" "}
                <strong className="text-fg">5.000 echten Transaktionen</strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="users" size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>Persönliche Einschätzung von RIEGEL vor Ort — kein anonymer Algorithmus</span>
            </li>
          </ul>

          <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-border bg-bg/60 p-4 text-left md:mx-0">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-muted">
              <strong className="text-fg">Der häufigste Fehler beim Verkauf:</strong> ein falsch
              angesetzter Preis — zu hoch schreckt Interessenten ab, zu niedrig verschenkt Geld.
              Der Report hilft, ihn von Anfang an richtig zu treffen.
            </p>
          </div>

          <p className="mx-auto mt-4 max-w-md text-center text-xs text-faint md:mx-0 md:text-left">
            <Icon name="lock" size={12} className="mb-0.5 mr-1 inline" />
            Ihre Daten bleiben exklusiv bei RIEGEL — keine Weitergabe an andere Makler oder Portale.
          </p>
        </div>

        {/* Visual 04 (Alex' Favorit, BunnyCDN „PDF Report Visuals"): der Report
            als greifbares Produkt — rein dekorativ, KEIN Klick-Ziel (das
            versehentliche Dauer-Aufklappen des Formulars war unerwünscht). */}
        <div className="report-visual-float mx-auto w-full max-w-[180px] overflow-hidden rounded-2xl border border-accent/40 md:max-w-none" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- feste CDN-Grafik, next/image bringt hier nur Remote-Overhead */}
          <img
            src={`https://${site.cdnHost}/PDF%20Report%20Visuals/pdf-report-visual-04-clean.webp`}
            alt=""
            width={928}
            height={1152}
            loading="lazy"
            className="block h-auto w-full"
          />
        </div>
      </div>

      {/* Beide Zustände bleiben gemountet und wechseln über .t-collapse
          (grid-template-rows 0fr → 1fr) — kein abruptes Auf-/Zuklappen. */}
      <div className="mt-3">
        <div className={`t-collapse ${!open ? "is-open" : ""}`}>
          {/* Großzügiges Innen-Padding als GLOW-RAUM: .t-collapse-inner clippt
              per overflow:hidden — ohne Puffer wird die cta-beam-Aura an der
              Box-Kante abgeschnitten und das Rattle zeigt die Maske
              (Feedback Alex 18.08.2026: „wie in einer Box eingesperrt"). */}
          <div className="t-collapse-inner flex flex-wrap items-center justify-center gap-3 px-8 pb-8 pt-4">
            <button
              type="button"
              onClick={() => {
                track("report_form_geoeffnet", { quelle: "cta" });
                setOpen(true);
              }}
              className={`press cta-beam ${rattle ? "cta-rattle" : ""} inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover`}
            >
              <Icon name="doc" size={17} />
              Report als PDF anfordern
            </button>
            {/* Dezenter Ausweg NEBEN dem vollen Reset: „Neue Bewertung" wirft
                alles weg, „Angaben anpassen" bringt nur zurück zu den
                Eckdaten. Bewusst nur hier (vor dem Versand) — nach gesendetem
                Report wäre ein Zurück ins Formular sinnlos. */}
            {onAnpassen && (
              <button
                type="button"
                onClick={onAnpassen}
                className="press rounded-full border border-border px-6 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Angaben anpassen
              </button>
            )}
            <button type="button" onClick={onReset} className="press rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              Neue Bewertung
            </button>
          </div>
        </div>

        <div className={`t-collapse ${open ? "is-open" : ""}`}>
          <div className="t-collapse-inner">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} aria-label="Name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Name" />
              <input className={inputCls} aria-label="E-Mail" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="E-Mail" />
              <input className={`${inputCls} sm:col-span-2`} aria-label="Telefon / Handy (optional)" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} placeholder="Telefon / Handy (optional)" />
              {/* Honeypot — für Menschen unsichtbar, Bots füllen es aus. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
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
                disabled={busy || borisLoading}
                className={`t-input ${error ? "is-shaking" : ""} press inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70`}
              >
                {busy ? (
                  <>
                    <svg className="animate-spin" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                      <path d="M21 12a9 9 0 0 1-9 9" />
                    </svg>
                    Report wird erstellt …
                  </>
                ) : borisLoading ? (
                  <>
                    <svg className="animate-spin" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                      <path d="M21 12a9 9 0 0 1-9 9" />
                    </svg>
                    Amtliche Daten werden abgeglichen …
                  </>
                ) : (
                  <>
                    <Icon name="doc" size={17} /> Report jetzt zusenden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        Lieber direkt sprechen?{" "}
        <a href={`tel:${TEL_HREF}`} className="text-accent hover:underline">
          {site.phone}
        </a>{" "}
        ·{" "}
        <Link href="/termin" className="text-accent hover:underline">
          Termin vereinbaren
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { burstConfetti } from "@/lib/confetti";
import { site } from "@/lib/site";

type Mode = "vor-ort" | "video" | "telefon";

const MODES: { value: Mode; label: string; sub: string; icon: IconName }[] = [
  { value: "vor-ort", label: "Vor Ort", sub: "Büro oder an der Immobilie", icon: "pin" },
  { value: "video", label: "Video-Call", sub: "Bequem per Videolink", icon: "video" },
  { value: "telefon", label: "Telefonisch", sub: "Wir rufen Sie an", icon: "phone" },
];

const DURATIONS = [
  { value: "30", label: "30 Min." },
  { value: "45", label: "45 Min." },
  { value: "60", label: "60 Min." },
];

const TYPES: { label: string; icon: IconName }[] = [
  { label: "Besichtigung", icon: "home" },
  { label: "Verkaufsberatung", icon: "handshake" },
  { label: "Bewertungstermin", icon: "calculator" },
  { label: "Finanzierungsfragen", icon: "euro" },
];

const MORNING = ["09:00", "10:00", "11:00"];
const AFTERNOON = ["14:00", "15:00", "16:00", "17:00"];

// ISO aus lokalen Datumsteilen — toISOString() wäre UTC und liefert in
// Europe/Berlin nach Mitternacht den Vortag (falscher Termin in Mail/.ics).
const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Day {
  iso: string;
  weekday: string;
  day: string;
  month: string;
  hint?: string;
}

export function BookingTool() {
  const [days, setDays] = useState<Day[]>([]);
  const [mode, setMode] = useState<Mode>("vor-ort");
  const [location, setLocation] = useState<string>(site.locations[0].city);
  const [duration, setDuration] = useState("45");
  const [type, setType] = useState(TYPES[0].label);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot — bleibt bei Menschen leer
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  useEffect(() => {
    const out: Day[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let added = 0;
    while (added < 14) {
      cursor.setDate(cursor.getDate() + 1);
      const wd = cursor.getDay();
      if (wd !== 0 && wd !== 6) {
        out.push({
          iso: toLocalIso(cursor),
          weekday: cursor.toLocaleDateString("de-DE", { weekday: "short" }),
          day: cursor.toLocaleDateString("de-DE", { day: "2-digit" }),
          month: cursor.toLocaleDateString("de-DE", { month: "short" }),
          hint: added === 0 ? "morgen" : undefined,
        });
        added += 1;
      }
    }
    // Werktags-Liste hängt von `new Date()` ab → bewusst erst clientseitig nach Mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDays(out);
  }, []);

  const selectedDay = useMemo(() => days.find((d) => d.iso === date), [days, date]);
  const modeMeta = MODES.find((m) => m.value === mode)!;
  const locationData = site.locations.find((l) => l.city === location) ?? site.locations[0];

  const locationLabel =
    mode === "vor-ort"
      ? `${locationData.city} · ${locationData.street}`
      : mode === "video"
        ? "Videolink (per E-Mail)"
        : "Telefonisch";

  // Fortschritt der Pflichtangaben (für die dezente Progress-Leiste).
  const filled = [Boolean(date), Boolean(time), Boolean(name), /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)];
  const progress = Math.round((filled.filter(Boolean).length / filled.length) * 100);

  async function submit() {
    if (busy) return;
    if (!date || !time) return fail("Bitte Datum und Uhrzeit wählen.");
    if (!name.trim()) return fail("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    if (mode === "telefon" && !phone.trim()) return fail("Für einen Rückruf brauchen wir Ihre Telefonnummer.");
    setError(null);
    setBusy(true);

    const payload = { type, mode: modeMeta.label, location: locationLabel, duration, date, time, name, email, phone, message, website };
    try {
      const key = "riegel:bookings";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.push({ ...payload, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}

    // Erst nach erfolgreicher Übermittlung bestätigen — keine Schein-Bestätigung.
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("booking failed");
      setBusy(false);
      setDone(true);
      burstConfetti();
    } catch {
      setBusy(false);
      fail("Termin konnte nicht übermittelt werden. Bitte erneut versuchen oder rufen Sie uns direkt an.");
    }
  }

  function eventDates() {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + Number(duration) * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return { start, end, fmt };
  }

  function downloadIcs() {
    const { start, end, fmt } = eventDates();
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Riegel Immobilien//Termin//DE",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${type} – Riegel Immobilien`,
      `DESCRIPTION:${type} (${modeMeta.label}) für ${name}`,
      `LOCATION:${locationLabel.replace(/,/g, "\\,")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "riegel-termin.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  function gcalUrl() {
    const { start, end, fmt } = eventDates();
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `${type} – Riegel Immobilien`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `${type} (${modeMeta.label})`,
      location: locationLabel,
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }

  /* ───────────────────────── Bestätigung ───────────────────────── */
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-2xl border border-accent/30 bg-surface">
          <div className="relative flex flex-col items-center border-b border-border bg-gradient-to-b from-accent/[0.07] to-transparent px-8 pb-7 pt-9 text-center">
            <span
              className="t-success-check flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent"
              data-state="in"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 4 4 10-10" />
              </svg>
            </span>
            <h2 className="t-num-d mt-4 text-2xl font-semibold">Termin angefragt</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Vielen Dank, {name.split(" ")[0] || "und bis gleich"}! Wir bestätigen Ihren
              Wunschtermin in Kürze per E-Mail an{" "}
              <span className="text-fg">{email}</span>.
            </p>
          </div>

          <dl className="divide-y divide-border px-8 py-2 text-sm">
            <SummaryRow icon="sparkle" label="Anlass" value={type} />
            <SummaryRow icon="calendar" label="Datum" value={selectedDay ? `${selectedDay.weekday}, ${selectedDay.day}. ${selectedDay.month}` : date} />
            <SummaryRow icon="clock" label="Uhrzeit" value={`${time} Uhr · ${duration} Min.`} />
            <SummaryRow icon={modeMeta.icon} label={modeMeta.label} value={locationLabel} />
          </dl>

          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border px-8 py-6">
            <button
              type="button"
              onClick={downloadIcs}
              className="press inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              <Icon name="calendar" size={17} />
              Kalender (.ics)
            </button>
            <a
              href={gcalUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="arrowUpRight" size={16} />
              Google Kalender
            </a>
            <Link href="/" className="press inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── Buchung ───────────────────────── */
  return (
    <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
      {/* Zusammenfassungs-Schiene (Calendly-Stil) */}
      <aside className="h-fit rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24">
        <div className="flex items-center gap-3 border-b border-border pb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/12 text-accent ring-1 ring-accent/25">
            <Icon name="calendar" size={22} />
          </span>
          <div>
            <div className="text-sm font-semibold text-fg">Riegel Immobilien</div>
            <div className="text-xs text-faint">Beratung & Besichtigung</div>
          </div>
        </div>
        <dl className="space-y-3.5 pt-5 text-sm">
          <RailRow icon="sparkle" value={type} active />
          <RailRow icon="clock" value={`${duration} Minuten`} active />
          <RailRow icon={modeMeta.icon} value={locationLabel} active />
          <RailRow
            icon="calendar"
            value={selectedDay ? `${selectedDay.weekday}, ${selectedDay.day}. ${selectedDay.month}` : "Datum wählen"}
            active={Boolean(selectedDay)}
          />
          <RailRow icon="clock" value={time ? `${time} Uhr` : "Uhrzeit wählen"} active={Boolean(time)} />
        </dl>
        <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-faint">
          Unverbindlich & kostenlos. Sie erhalten eine Bestätigung per E-Mail.
        </p>
      </aside>

      {/* Schritte */}
      <div className="space-y-7 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {/* Fortschritt */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden>
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 1 · Termin-Art */}
        <Field n={1} icon="video" label="Wie möchten Sie sich treffen?">
          <div className="grid gap-2.5 sm:grid-cols-3">
            {MODES.map((m) => {
              const on = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  aria-pressed={on}
                  className={`press relative flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors ${
                    on ? "border-accent bg-accent/[0.07]" : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${on ? "bg-accent text-on-accent" : "bg-surface-2 text-accent"}`}>
                    <Icon name={m.icon} size={18} />
                  </span>
                  <span className="mt-1 text-sm font-medium text-fg">{m.label}</span>
                  <span className="text-xs text-faint">{m.sub}</span>
                  {on && (
                    <span className="absolute right-2.5 top-2.5 text-accent">
                      <Icon name="check" size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        {/* 1b · Standort (nur „Vor Ort") — sanft eingeblendet */}
        <div className={`t-collapse ${mode === "vor-ort" ? "is-open" : ""}`}>
          <div className="t-collapse-inner">
            <Field n={null} icon="pin" label="In welchem Büro?">
              <div className="flex flex-wrap gap-2">
                {site.locations.map((l) => {
                  const on = location === l.city;
                  return (
                    <button
                      key={l.city}
                      type="button"
                      onClick={() => setLocation(l.city)}
                      aria-pressed={on}
                      className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                        on ? "border-accent text-accent" : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      <Icon name="pin" size={15} />
                      {l.city}
                      <span className="text-xs text-faint">· {l.street}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>

        {/* 2 · Dauer */}
        <Field n={2} icon="clock" label="Wie viel Zeit sollen wir einplanen?">
          <Segmented
            ariaLabel="Dauer"
            value={duration}
            onChange={setDuration}
            options={DURATIONS}
          />
        </Field>

        {/* 3 · Anlass */}
        <Field n={3} icon="sparkle" label="Worum geht es?">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const on = type === t.label;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setType(t.label)}
                  aria-pressed={on}
                  className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                    on ? "border-accent text-accent" : "border-border text-muted hover:text-fg"
                  }`}
                >
                  <Icon name={t.icon} size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* 4 · Datum */}
        <Field n={4} icon="calendar" label="An welchem Tag?">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => {
              const on = date === d.iso;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => setDate(d.iso)}
                  aria-pressed={on}
                  className={`press flex flex-col items-center rounded-xl border py-2.5 transition-colors ${
                    on ? "border-accent bg-accent/[0.07] text-fg" : "border-border text-muted hover:border-accent/50 hover:text-fg"
                  }`}
                >
                  <span className="text-[0.7rem] uppercase tracking-wide text-faint">{d.weekday}</span>
                  <span className={`text-lg font-semibold ${on ? "text-accent" : "text-fg"}`}>{d.day}</span>
                  <span className="text-[0.7rem] text-faint">{d.hint ?? d.month}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {/* 5 · Uhrzeit — gruppiert */}
        <Field n={5} icon="clock" label="Zu welcher Uhrzeit?">
          <div className="space-y-3">
            {[
              { label: "Vormittag", slots: MORNING },
              { label: "Nachmittag", slots: AFTERNOON },
            ].map((grp) => (
              <div key={grp.label}>
                <div className="mb-1.5 text-xs uppercase tracking-wide text-faint">{grp.label}</div>
                <div className="flex flex-wrap gap-2">
                  {grp.slots.map((t) => {
                    const on = time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTime(t)}
                        aria-pressed={on}
                        className={`press min-w-[4.6rem] rounded-lg border px-4 py-2 text-sm transition-colors ${
                          on ? "border-accent bg-accent text-on-accent" : "border-border text-muted hover:border-accent/50 hover:text-fg"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Field>

        {/* 6 · Kontakt */}
        <Field n={6} icon="users" label="Wie erreichen wir Sie?">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Name" className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent" />
            <input value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} type="email" placeholder="E-Mail" className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent" />
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} placeholder={mode === "telefon" ? "Telefon (für den Rückruf)" : "Telefon (optional)"} className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent sm:col-span-2" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Nachricht (optional) — z. B. Objekt, das Sie interessiert" className="resize-none rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent sm:col-span-2" />
            {/* Honeypot — für Menschen unsichtbar, Bots füllen es aus. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
          </div>
        </Field>

        {/* Absenden */}
        <div className={`t-input-wrap ${error ? "is-error" : ""}`}>
          <p className="t-error-msg mb-3 text-sm text-accent" role="alert">{error ?? " "}</p>
          <button
            key={errorNonce}
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
                Wird gesendet …
              </>
            ) : (
              <>
                <Icon name="calendar" size={18} />
                Termin anfragen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Hilfskomponenten ── */
function Field({
  n,
  icon,
  label,
  children,
}: {
  n: number | null;
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        {n !== null ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-accent ring-1 ring-border">
            {n}
          </span>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center text-accent">
            <Icon name={icon} size={16} />
          </span>
        )}
        <span className="text-sm font-medium text-fg">{label}</span>
      </div>
      {children}
    </div>
  );
}

function RailRow({ icon, value, active }: { icon: IconName; value: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`shrink-0 ${active ? "text-accent" : "text-faint"}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className={`text-sm transition-colors ${active ? "text-fg" : "text-faint"}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2 text-muted">
        <Icon name={icon} size={16} className="text-accent" />
        {label}
      </span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );
}

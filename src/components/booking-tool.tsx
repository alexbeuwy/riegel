"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { site } from "@/lib/site";

const TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
const TYPES: { label: string; icon: IconName }[] = [
  { label: "Besichtigung", icon: "home" },
  { label: "Verkaufsberatung", icon: "handshake" },
  { label: "Bewertungstermin", icon: "calculator" },
];

interface Day {
  iso: string;
  label: string;
}

export function BookingTool() {
  const [days, setDays] = useState<Day[]>([]);
  const [type, setType] = useState(TYPES[0].label);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
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
    while (added < 12) {
      cursor.setDate(cursor.getDate() + 1);
      const wd = cursor.getDay();
      if (wd !== 0 && wd !== 6) {
        out.push({
          iso: cursor.toISOString().slice(0, 10),
          label: cursor.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }),
        });
        added += 1;
      }
    }
    setDays(out);
  }, []);

  function submit() {
    if (!date || !time) return fail("Bitte Datum und Uhrzeit wählen.");
    if (!name) return fail("Bitte Ihren Namen angeben.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Bitte eine gültige E-Mail angeben.");
    setError(null);
    try {
      const key = "riegel:bookings";
      const cur = JSON.parse(localStorage.getItem(key) || "[]");
      cur.push({ type, date, time, name, email, phone, createdAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}
    setDone(true);
  }

  function downloadIcs() {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + 60 * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Riegel Immobilien//Termin//DE",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${type} – Riegel Immobilien`,
      `DESCRIPTION:${type} für ${name}`,
      "LOCATION:Wormser Straße 13\\, 67346 Speyer",
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

  if (done) {
    const day = days.find((d) => d.iso === date);
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-accent/30 bg-surface p-8 text-center">
        <span
          className="t-success-check mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent"
          data-state="in"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4 10-10" />
          </svg>
        </span>
        <h2 className="mt-4 text-2xl font-semibold">Termin angefragt</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {type} am <span className="text-fg">{day?.label ?? date}</span> um{" "}
          <span className="text-fg">{time} Uhr</span>. Wir bestätigen Ihren Termin in Kürze
          per E-Mail.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={downloadIcs}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="calendar" size={18} />
            Zum Kalender hinzufügen (.ics)
          </button>
          <a href="/" className="rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="space-y-2">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="sparkle" size={16} className="text-accent" />
            Anlass
          </span>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setType(t.label)}
                className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                  type === t.label ? "border-accent text-accent" : "border-border text-muted hover:text-fg"
                }`}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="calendar" size={16} className="text-accent" />
            Datum
          </span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {days.map((d) => (
              <button
                key={d.iso}
                type="button"
                onClick={() => setDate(d.iso)}
                className={`press rounded-lg border px-2 py-2 text-sm capitalize ${
                  date === d.iso ? "border-accent bg-surface-2 text-fg" : "border-border text-muted hover:text-fg"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Icon name="clock" size={16} className="text-accent" />
            Uhrzeit
          </span>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`press rounded-lg border px-4 py-2 text-sm ${
                  time === t ? "border-accent bg-surface-2 text-fg" : "border-border text-muted hover:text-fg"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none placeholder:text-faint focus:border-accent" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-Mail" className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none placeholder:text-faint focus:border-accent" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (optional)" className="rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none placeholder:text-faint focus:border-accent sm:col-span-2" />
        </div>

        <div className={`t-input-wrap mt-6 ${error ? "is-error" : ""}`}>
          <p className="t-error-msg mb-3 text-sm text-accent" role="alert">
            {error ?? " "}
          </p>
          <button
            key={errorNonce}
            type="button"
            onClick={submit}
            className={`t-input ${error ? "is-shaking" : ""} inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.99]`}
          >
            <Icon name="calendar" size={18} />
            Termin anfragen
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-faint">
          Unverbindlich · {site.locations[0].street}, {site.locations[0].zip} {site.locations[0].city} oder digital.
        </p>
      </div>
    </div>
  );
}

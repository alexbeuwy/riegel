"use client";

import { useState } from "react";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

interface ReportRow {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  objektart?: string;
  value_mid?: number;
}
interface LeadRow {
  id: string;
  created_at: string;
  kind: string;
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};
const fmtEur = (n?: number) =>
  n != null ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : "–";

export function InternDashboard() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ reports: ReportRow[]; leads: LeadRow[] } | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/intern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setData({ reports: json.reports ?? [], leads: json.leads ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="flex min-h-[70vh] items-center py-20">
        <Container>
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-8">
            <div className="flex items-center gap-2 text-sm text-accent">
              <Icon name="lock" size={18} /> Interner Bereich
            </div>
            <h1 className="mt-3 text-xl font-semibold">Lead-Übersicht</h1>
            <p className="mt-2 text-sm text-muted">Reports, Termin- &amp; Kontaktanfragen an einem Ort.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Passwort"
              className="mt-5 w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
            />
            {error && <p className="mt-3 text-sm text-accent">{error}</p>}
            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70"
            >
              {busy ? "Lädt …" : "Anmelden"}
            </button>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-16">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Lead-Übersicht</h1>
            <p className="mt-1 text-sm text-muted">
              {data.reports.length} Reports · {data.leads.length} Termin-/Kontaktanfragen
            </p>
          </div>
          <button type="button" onClick={load} className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg hover:border-accent hover:text-accent">
            <Icon name="search" size={15} /> Aktualisieren
          </button>
        </div>

        {/* Bewertungs-Reports */}
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Icon name="doc" size={18} className="text-accent" /> Bewertungs-Reports
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
              <tr>
                {["Datum", "Name", "Kontakt", "Objekt", "Wert"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.reports.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Noch keine Reports.</td></tr>
              ) : (
                data.reports.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-fg">{r.name || "–"}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${r.email}`} className="text-accent hover:underline">{r.email}</a>
                      {r.phone ? <div className="text-faint">{r.phone}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{[r.address || r.city, r.objektart].filter(Boolean).join(" · ") || "–"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-fg">{fmtEur(r.value_mid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Termin- & Kontaktanfragen */}
        <h2 className="mb-3 mt-10 flex items-center gap-2 text-lg font-semibold">
          <Icon name="calendar" size={18} className="text-accent" /> Termine &amp; Kontakt
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
              <tr>
                {["Datum", "Art", "Name", "Kontakt", "Betreff / Nachricht"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.leads.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Noch keine Anfragen.</td></tr>
              ) : (
                data.leads.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${l.kind === "archiv" ? "border-border text-faint" : "border-accent/40 text-accent"}`}>
                        {l.kind === "booking" ? "Termin" : l.kind === "archiv" ? "Alt-Kontakt" : "Kontakt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg">{l.name || "–"}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${l.email}`} className="text-accent hover:underline">{l.email}</a>
                      {l.phone ? <div className="text-faint">{l.phone}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div className="text-fg">{l.subject || "–"}</div>
                      {l.message ? <div className="mt-0.5 max-w-md text-faint">{l.message}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}

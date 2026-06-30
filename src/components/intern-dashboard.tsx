"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";

interface ReportRow {
  id: string;
  created_at: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  objektart?: string;
  wohnflaeche?: number;
  zimmer?: number;
  baujahr?: number;
  zustand?: string;
  value_low?: number;
  value_mid?: number;
  value_high?: number;
  price_per_sqm?: number;
  confidence?: number;
  report_requested?: boolean;
  message?: string;
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

type Tab = "overview" | "reports" | "leads" | "objekte";

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};
const fmtEur = (n?: number) =>
  n != null && Number.isFinite(Number(n))
    ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n))
    : "–";
const fmtEurShort = (n?: number) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "–";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace(".", ",")} Mio €`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k €`;
  return `${v} €`;
};

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
};

const norm = (s: string) =>
  s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

function daysAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────────────────── kleine UI-Bausteine ───────────────────────── */

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-accent/40 bg-accent/5" : "border-border bg-surface"}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
        <Icon name={icon} size={15} className={accent ? "text-accent" : "text-muted"} />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-fg">{value}</div>
      {sub && <div className="mt-1 text-xs text-faint">{sub}</div>}
    </div>
  );
}

function Toolbar({
  query,
  setQuery,
  placeholder,
  children,
  onExport,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
  children?: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
          <Icon name="search" size={16} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
      </div>
      {children}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
        >
          <Icon name="doc" size={15} /> CSV
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-border bg-surface py-2.5 pl-4 pr-9 text-sm text-fg outline-none transition-colors focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">
        <Icon name="chevronDown" size={15} />
      </span>
    </div>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

export function InternDashboard() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ reports: ReportRow[]; leads: LeadRow[] } | null>(null);

  const [tab, setTab] = useState<Tab>("overview");
  const [rQuery, setRQuery] = useState("");
  const [rArt, setRArt] = useState("all");
  const [rHot, setRHot] = useState(false);
  const [lQuery, setLQuery] = useState("");
  const [lKind, setLKind] = useState("all");

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

  const stats = useMemo(() => {
    if (!data) return null;
    const r = data.reports;
    const vals = r.map((x) => Number(x.value_mid)).filter((n) => Number.isFinite(n) && n > 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const conf = r.map((x) => Number(x.confidence)).filter((n) => Number.isFinite(n) && n > 0);
    const hot = r.filter((x) => x.report_requested).length;
    const newReports = r.filter((x) => daysAgo(x.created_at) <= 7).length;
    const newLeads = data.leads.filter((x) => daysAgo(x.created_at) <= 7).length;
    return {
      reports: r.length,
      leads: data.leads.length,
      newReports,
      newLeads,
      pipeline: sum,
      avg: vals.length ? sum / vals.length : 0,
      hot,
      avgConf: conf.length ? Math.round(conf.reduce((a, b) => a + b, 0) / conf.length) : 0,
    };
  }, [data]);

  const reportArten = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.reports.map((r) => r.objektart).filter(Boolean) as string[]);
    return Array.from(set);
  }, [data]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    const q = norm(rQuery.trim());
    return data.reports.filter((r) => {
      if (rArt !== "all" && r.objektart !== rArt) return false;
      if (rHot && !r.report_requested) return false;
      if (!q) return true;
      return norm(`${r.name ?? ""} ${r.email ?? ""} ${r.address ?? ""} ${r.city ?? ""} ${r.postcode ?? ""}`).includes(q);
    });
  }, [data, rQuery, rArt, rHot]);

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    const q = norm(lQuery.trim());
    return data.leads.filter((l) => {
      if (lKind !== "all" && l.kind !== lKind) return false;
      if (!q) return true;
      return norm(`${l.name ?? ""} ${l.email ?? ""} ${l.subject ?? ""} ${l.message ?? ""}`).includes(q);
    });
  }, [data, lQuery, lKind]);

  /* ── Login-Gate ── */
  if (!data) {
    return (
      <section className="flex min-h-[70vh] items-center py-20">
        <Container>
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-8">
            <div className="flex items-center gap-2 text-sm text-accent">
              <Icon name="lock" size={18} /> Interner Bereich
            </div>
            <h1 className="mt-3 text-xl font-semibold">Lead-Cockpit</h1>
            <p className="mt-2 text-sm text-muted">Reports, Termin- &amp; Kontaktanfragen an einem Ort.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
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

  const TABS: { key: Tab; label: string; icon: IconName; n?: number }[] = [
    { key: "overview", label: "Übersicht", icon: "chart" },
    { key: "reports", label: "Reports", icon: "doc", n: stats?.reports },
    { key: "leads", label: "Anfragen", icon: "calendar", n: stats?.leads },
    { key: "objekte", label: "Objekte", icon: "building" },
  ];

  return (
    <section className="py-12 sm:py-16">
      <Container>
        {/* Kopf */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Lead-Cockpit</h1>
            <p className="mt-1 text-sm text-muted">
              {stats?.reports} Reports · {stats?.leads} Anfragen · {(stats?.newReports ?? 0) + (stats?.newLeads ?? 0)} neu
              in 7 Tagen
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <Icon name="search" size={15} /> {busy ? "Lädt …" : "Aktualisieren"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-px">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative -mb-px inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm transition-colors ${
                  on ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <Icon name={t.icon} size={16} className={on ? "text-accent" : ""} />
                {t.label}
                {t.n != null && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-faint">{t.n}</span>
                )}
                {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>

        {/* ── Übersicht ── */}
        {tab === "overview" && stats && (
          <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon="doc" label="Reports gesamt" value={String(stats.reports)} sub={`+${stats.newReports} in 7 Tagen`} />
              <StatCard icon="calendar" label="Anfragen gesamt" value={String(stats.leads)} sub={`+${stats.newLeads} in 7 Tagen`} />
              <StatCard icon="sparkle" label="Report angefordert" value={String(stats.hot)} sub="warme Leads" accent />
              <StatCard icon="euro" label="Pipeline (Ø-Wert)" value={fmtEurShort(stats.pipeline)} sub={`Ø ${fmtEur(stats.avg)}`} />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                  <Icon name="doc" size={16} className="text-accent" /> Neueste Reports
                </h2>
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {data.reports.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-fg">{r.name || r.email || "—"}</div>
                        <div className="truncate text-xs text-faint">{r.address || r.city || "ohne Adresse"}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-medium text-fg">{fmtEur(r.value_mid)}</div>
                        <div className="text-xs text-faint">{fmtDate(r.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  {data.reports.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Noch keine Reports.</div>}
                </div>
              </div>
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                  <Icon name="calendar" size={16} className="text-accent" /> Neueste Anfragen
                </h2>
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {data.leads.slice(0, 6).map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-fg">{l.name || l.email || "—"}</div>
                        <div className="truncate text-xs text-faint">{l.subject || (l.kind === "booking" ? "Terminanfrage" : "Kontakt")}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${l.kind === "booking" ? "border-accent/40 text-accent" : "border-border text-faint"}`}>
                          {l.kind === "booking" ? "Termin" : l.kind === "archiv" ? "Alt" : "Kontakt"}
                        </span>
                        <div className="mt-1 text-xs text-faint">{fmtDate(l.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  {data.leads.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Noch keine Anfragen.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Reports ── */}
        {tab === "reports" && (
          <div>
            <Toolbar
              query={rQuery}
              setQuery={setRQuery}
              placeholder="Name, E-Mail, Adresse, Ort …"
              onExport={() =>
                downloadCsv(
                  "riegel-reports.csv",
                  filteredReports.map((r) => ({
                    Datum: fmtDate(r.created_at),
                    Name: r.name ?? "",
                    EMail: r.email ?? "",
                    Telefon: r.phone ?? "",
                    Adresse: r.address ?? "",
                    Ort: r.city ?? "",
                    Objektart: OBJEKTART_LABEL[r.objektart ?? ""] ?? r.objektart ?? "",
                    Wert: r.value_mid ?? "",
                    EuroProQm: r.price_per_sqm ?? "",
                    Report: r.report_requested ? "ja" : "nein",
                  })),
                )
              }
            >
              <FilterSelect
                value={rArt}
                onChange={setRArt}
                options={[
                  { value: "all", label: "Alle Objektarten" },
                  ...reportArten.map((a) => ({ value: a, label: OBJEKTART_LABEL[a] ?? a })),
                ]}
              />
              <button
                type="button"
                onClick={() => setRHot((v) => !v)}
                aria-pressed={rHot}
                className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${
                  rHot ? "border-accent bg-accent text-on-accent" : "border-border text-muted hover:text-fg"
                }`}
              >
                <Icon name="sparkle" size={15} /> nur Report angefordert
              </button>
            </Toolbar>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    {["Datum", "Name", "Kontakt", "Objekt", "Eckdaten", "Wert", ""].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Keine Treffer.</td></tr>
                  ) : (
                    filteredReports.map((r) => (
                      <tr key={r.id} className="border-t border-border align-top hover:bg-surface/60">
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(r.created_at)}</td>
                        <td className="px-4 py-3 text-fg">{r.name || "–"}</td>
                        <td className="px-4 py-3">
                          {r.email && <a href={`mailto:${r.email}`} className="text-accent hover:underline">{r.email}</a>}
                          {r.phone ? <div className="text-faint">{r.phone}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <div className="text-fg">{OBJEKTART_LABEL[r.objektart ?? ""] ?? r.objektart ?? "–"}</div>
                          <div className="text-xs">{[r.address, r.postcode && r.city ? `${r.postcode} ${r.city}` : r.city].filter(Boolean).join(", ") || "ohne Adresse"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-faint">
                          {[r.wohnflaeche ? `${r.wohnflaeche} m²` : null, r.zimmer ? `${r.zimmer} Zi.` : null, r.baujahr ? `Bj. ${r.baujahr}` : null].filter(Boolean).join(" · ") || "–"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-medium text-fg">{fmtEur(r.value_mid)}</div>
                          {r.price_per_sqm ? <div className="text-xs text-faint">{fmtEur(r.price_per_sqm)}/m²</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          {r.report_requested && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-xs text-accent">
                              <Icon name="sparkle" size={12} /> Report
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">{filteredReports.length} von {data.reports.length} Reports</p>
          </div>
        )}

        {/* ── Anfragen ── */}
        {tab === "leads" && (
          <div>
            <Toolbar
              query={lQuery}
              setQuery={setLQuery}
              placeholder="Name, E-Mail, Betreff …"
              onExport={() =>
                downloadCsv(
                  "riegel-anfragen.csv",
                  filteredLeads.map((l) => ({
                    Datum: fmtDate(l.created_at),
                    Art: l.kind,
                    Name: l.name ?? "",
                    EMail: l.email ?? "",
                    Telefon: l.phone ?? "",
                    Betreff: l.subject ?? "",
                    Nachricht: l.message ?? "",
                  })),
                )
              }
            >
              <FilterSelect
                value={lKind}
                onChange={setLKind}
                options={[
                  { value: "all", label: "Alle Arten" },
                  { value: "booking", label: "Termine" },
                  { value: "contact", label: "Kontakt" },
                  { value: "archiv", label: "Alt-Kontakte" },
                ]}
              />
            </Toolbar>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    {["Datum", "Art", "Name", "Kontakt", "Betreff / Nachricht"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Keine Treffer.</td></tr>
                  ) : (
                    filteredLeads.map((l) => (
                      <tr key={l.id} className="border-t border-border align-top hover:bg-surface/60">
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(l.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${l.kind === "archiv" ? "border-border text-faint" : "border-accent/40 text-accent"}`}>
                            {l.kind === "booking" ? "Termin" : l.kind === "archiv" ? "Alt-Kontakt" : "Kontakt"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-fg">{l.name || "–"}</td>
                        <td className="px-4 py-3">
                          {l.email && <a href={`mailto:${l.email}`} className="text-accent hover:underline">{l.email}</a>}
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
            <p className="mt-3 text-xs text-faint">{filteredLeads.length} von {data.leads.length} Anfragen</p>
          </div>
        )}

        {/* ── Objekte (OnOffice-Scaffold) ── */}
        {tab === "objekte" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
              <span className="mt-0.5 text-accent"><Icon name="building" size={22} /></span>
              <div>
                <h2 className="text-lg font-semibold text-fg">Objekt-Sync via OnOffice</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Status wie <span className="text-fg">Verfügbar</span>, <span className="text-fg">Reserviert</span> und{" "}
                  <span className="text-fg">Verkauft</span> werden nicht hier gepflegt — sie kommen automatisch aus
                  OnOffice, sobald die Schnittstelle (API/Marketplace) freigeschaltet ist. Dieses Cockpit ist dafür
                  vorbereitet: die Objektliste wird hier mit Live-Status, Vermarktungsstand und verknüpften Leads
                  erscheinen.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-faint">
                  <Icon name="clock" size={13} /> Wartet auf OnOffice-API-Zugang
                </div>
              </div>
            </div>

            {/* Vorschau, wie die Objektliste aussehen wird (deaktiviert) */}
            <div className="rounded-2xl border border-dashed border-border p-1 opacity-60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-faint">
                    <tr>
                      {["Objekt", "Ort", "Preis", "Status", "Vorschau"].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { t: "Stadtvilla · 5 Zi.", o: "Speyer", p: "—", s: "Verfügbar", c: "border-[#34d399]/40 text-[#34d399]" },
                      { t: "Penthouse · Rheinblick", o: "Ludwigshafen", p: "—", s: "Reserviert", c: "border-[#fbbf24]/40 text-[#fbbf24]" },
                      { t: "Architektenhaus", o: "Vorderpfalz", p: "—", s: "Verkauft", c: "border-border text-faint" },
                    ].map((row) => (
                      <tr key={row.t} className="border-t border-border">
                        <td className="px-4 py-3 text-fg">{row.t}</td>
                        <td className="px-4 py-3 text-muted">{row.o}</td>
                        <td className="px-4 py-3 text-faint">{row.p}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${row.c}`}>{row.s}</span>
                        </td>
                        <td className="px-4 py-3 text-faint">aus OnOffice</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-faint">Beispielhafte Vorschau — echte Objekte erscheinen nach Anbindung der OnOffice-API.</p>
          </div>
        )}
      </Container>
    </section>
  );
}

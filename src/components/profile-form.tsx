"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { useAuth } from "@/components/auth";
import { supabase } from "@/lib/supabase";

type Rolle = "eigennutzer" | "kapitalanlage" | "verkauf";
const OBJEKTARTEN = ["Wohnung", "Haus", "Grundstück", "Gewerbe"];
const REGIONEN = [
  "Speyer", "Ludwigshafen", "Schifferstadt", "Frankenthal", "Neustadt",
  "Germersheim", "Mannheim", "Worms", "Landau", "Vorderpfalz (Umgebung)",
];
const PREISE = ["250.000", "400.000", "600.000", "800.000", "1.000.000", "1.500.000+"];
const ZIMMER = ["1", "2", "3", "4", "5"];
const LS_KEY = "riegel:profile";

interface Prefs {
  rolle: Rolle;
  objektarten: string[];
  regionen: string[];
  preisMax: string;
  zimmerMin: string;
  earlyAccess: boolean;
}
const EMPTY: Prefs = {
  rolle: "eigennutzer",
  objektarten: [],
  regionen: [],
  preisMax: "",
  zimmerMin: "",
  earlyAccess: true,
};

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
        on ? "border-accent bg-accent/10 text-accent-strong" : "border-border text-muted hover:text-fg"
      }`}
    >
      {on && <Icon name="check" size={14} />}
      {label}
    </button>
  );
}

export function ProfileForm() {
  const { user } = useAuth();
  const [p, setP] = useState<Prefs>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Laden: aus Supabase, Fallback localStorage.
  useEffect(() => {
    let done = false;
    (async () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setP({ ...EMPTY, ...JSON.parse(raw) });
      } catch {}
      if (supabase && user) {
        const { data } = await supabase
          .from("profiles")
          .select("preferences, early_access")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.preferences && !done) {
          setP((cur) => ({ ...cur, ...(data.preferences as Partial<Prefs>), earlyAccess: data.early_access ?? cur.earlyAccess }));
        }
      }
      setLoaded(true);
    })();
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggle = (key: "objektarten" | "regionen", v: string) =>
    setP((s) => ({
      ...s,
      [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v],
    }));

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(p));
    } catch {}
    if (supabase && user) {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          preferences: {
            rolle: p.rolle,
            objektarten: p.objektarten,
            regionen: p.regionen,
            preisMax: p.preisMax,
            zimmerMin: p.zimmerMin,
          },
          early_access: p.earlyAccess,
        },
        { onConflict: "id" },
      );
      if (error) setErr("Konnte nicht in Ihrem Konto gespeichert werden (lokal gesichert).");
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!loaded) return <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-2 text-sm text-accent">
        <Icon name="sparkle" size={18} />
        Ihr Suchprofil
      </div>
      <p className="mt-2 text-sm text-muted">
        Je genauer Ihr Profil, desto passender informieren wir Sie — auf Wunsch
        <strong className="text-fg"> noch bevor Objekte öffentlich online gehen</strong>.
      </p>

      {/* Rolle */}
      <div className="mt-6 space-y-2">
        <span className="text-sm text-muted">Ich interessiere mich als …</span>
        <div>
          <Segmented
            ariaLabel="Rolle"
            value={p.rolle}
            onChange={(v) => setP((s) => ({ ...s, rolle: v as Rolle }))}
            options={[
              { value: "eigennutzer", label: "Eigennutzer" },
              { value: "kapitalanlage", label: "Kapitalanlage" },
              { value: "verkauf", label: "Verkauf" },
            ]}
          />
        </div>
      </div>

      {p.rolle !== "verkauf" ? (
        <>
          {/* Objektarten */}
          <div className="mt-6 space-y-2">
            <span className="text-sm text-muted">Objektart</span>
            <div className="flex flex-wrap gap-2">
              {OBJEKTARTEN.map((o) => (
                <Chip key={o} label={o} on={p.objektarten.includes(o)} onClick={() => toggle("objektarten", o)} />
              ))}
            </div>
          </div>

          {/* Regionen */}
          <div className="mt-6 space-y-2">
            <span className="text-sm text-muted">Bevorzugte Regionen</span>
            <div className="flex flex-wrap gap-2">
              {REGIONEN.map((r) => (
                <Chip key={r} label={r} on={p.regionen.includes(r)} onClick={() => toggle("regionen", r)} />
              ))}
            </div>
          </div>

          {/* Preis + Zimmer */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-muted">Budget bis (€)</span>
              <select
                value={p.preisMax}
                onChange={(e) => setP((s) => ({ ...s, preisMax: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none focus:border-accent"
              >
                <option value="">egal</option>
                {PREISE.map((v) => (
                  <option key={v} value={v}>{v} €</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted">Zimmer ab</span>
              <select
                value={p.zimmerMin}
                onChange={(e) => setP((s) => ({ ...s, zimmerMin: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-fg outline-none focus:border-accent"
              >
                <option value="">egal</option>
                {ZIMMER.map((v) => (
                  <option key={v} value={v}>{v}+</option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
          Sie möchten verkaufen? Starten Sie mit einer{" "}
          <a href="/rechner" className="text-accent hover:underline">kostenlosen Bewertung</a> — wir
          melden uns persönlich.
        </p>
      )}

      {/* Vorab-Zugang */}
      <button
        type="button"
        onClick={() => setP((s) => ({ ...s, earlyAccess: !s.earlyAccess }))}
        aria-pressed={p.earlyAccess}
        className={`mt-6 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
          p.earlyAccess ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
        }`}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            p.earlyAccess ? "border-accent bg-accent text-on-accent" : "border-border text-transparent"
          }`}
        >
          <Icon name="check" size={14} />
        </span>
        <span className="text-sm">
          <span className="font-medium text-fg">Vorab-Zugang aktivieren</span>
          <span className="mt-0.5 block text-muted">
            Als Erste(r) über passende neue Objekte informiert werden — noch vor der
            Veröffentlichung auf den Portalen.
          </span>
        </span>
      </button>

      {err && <p className="mt-4 text-sm text-accent">{err}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="press mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {saved ? <Icon name="check" size={18} /> : <Icon name="sparkle" size={18} />}
        {saving ? "Speichern …" : saved ? "Gespeichert" : "Suchprofil speichern"}
      </button>
    </div>
  );
}

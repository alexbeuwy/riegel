"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { useAuth } from "@/components/auth";
import { supabase } from "@/lib/supabase";
import { searchAddress } from "@/lib/geocode";

type Rolle = "eigennutzer" | "kapitalanlage" | "verkauf";
// An das echte Portal angeglichen: genau die vier Kategorien, die es im Bestand
// wirklich gibt (categoryLabel in format.ts) — "Mehrfamilienhaus" war keine
// eigene Kategorie und ist raus.
const OBJEKTARTEN = ["Wohnung", "Haus", "Grundstück", "Gewerbe"];
// Fallback-Regionen, falls /api/estate-orte (echte Orte) nicht lädt.
const REGIONEN_FALLBACK = [
  "Speyer", "Ludwigshafen", "Schifferstadt", "Frankenthal", "Neustadt",
  "Germersheim", "Mannheim", "Worms", "Landau",
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

/**
 * Freie Standort-Eingabe hinter den Regionen-Chips (Kundenwunsch): eine leere
 * Bubble in Chip-Form mit umlaufendem Glow (derselbe .glow-select-ring wie die
 * Objektart-Kacheln des Rechners und die Startseiten-Boxen) und blinkendem
 * Eingabe-Strich plus ausgegrautem „Standort eingeben…" — damit sofort klar
 * ist, dass hier BELIEBIGE Städte ergänzt werden können, nicht nur die
 * Vorauswahl. Vorschläge via Photon (/api/geocode, DSGVO-Proxy), Enter oder
 * Klick übernimmt; der Ort erscheint dann als aktiver Chip.
 */
function RegionInput({ onAdd }: { onAdd: (city: string) => void }) {
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [hi, setHi] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const suggest = (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    searchAddress(q, ctrl.signal).then((results) => {
      if (ctrl.signal.aborted) return;
      const seen = new Set<string>();
      const cities: string[] = [];
      for (const r of results) {
        const c = r.city.trim();
        if (!c || seen.has(c.toLowerCase())) continue;
        seen.add(c.toLowerCase());
        cities.push(c);
      }
      setItems(cities.slice(0, 6));
      setHi(0);
    });
  };

  const apply = (city: string) => {
    const c = city.trim();
    if (!c) return;
    onAdd(c);
    setText("");
    setItems([]);
  };

  return (
    <div className="relative">
      {/* Chip-Bubble mit umlaufendem Glow — glow-select-on aktiviert den Spin. */}
      <span className="glow-select-on relative inline-flex items-center rounded-full border border-accent/50 bg-surface-2">
        <span className="glow-select-ring" aria-hidden />
        {/* Blinkender Eingabe-Strich, solange leer und nicht fokussiert. */}
        {!focus && text === "" && (
          <span aria-hidden className="caret-blink pointer-events-none absolute left-3.5 text-accent">
            |
          </span>
        )}
        <input
          type="text"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls="region-input-listbox"
          aria-autocomplete="list"
          aria-label="Weiteren Standort eingeben"
          placeholder={focus ? "Standort eingeben…" : " Standort eingeben…"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            suggest(e.target.value);
          }}
          onFocus={() => setFocus(true)}
          onBlur={() => {
            setFocus(false);
            setTimeout(() => setItems([]), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, items.length - 1));
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              apply(items.length ? items[hi] : text);
            } else if (e.key === "Escape") {
              setText("");
              setItems([]);
            }
          }}
          className="w-44 rounded-full bg-transparent px-3.5 py-2 text-sm text-fg outline-none placeholder:text-faint"
        />
      </span>
      {items.length > 0 && (
        <ul
          id="region-input-listbox"
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-60 w-56 overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl"
        >
          {items.map((c, i) => (
            <li key={c} role="option" aria-selected={i === hi}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  apply(c);
                }}
                onMouseEnter={() => setHi(i)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === hi ? "bg-accent/10 text-fg" : "text-fg"
                }`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProfileForm() {
  const { user } = useAuth();
  const [p, setP] = useState<Prefs>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [regionen, setRegionen] = useState<string[]>(REGIONEN_FALLBACK);

  // Echte Orte aus dem Live-Bestand laden (Fallback bleibt, falls die Route
  // scheitert oder leer ist). So spiegelt die Regionen-Auswahl die tatsächlich
  // vermarkteten Orte statt einer festen Wunschliste.
  useEffect(() => {
    let alive = true;
    fetch("/api/estate-orte")
      .then((r) => r.json())
      .then((d: { orte?: string[] }) => {
        if (alive && Array.isArray(d.orte) && d.orte.length) setRegionen(d.orte);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

          {/* Regionen — Vorauswahl aus dem Live-Bestand PLUS frei ergänzte
              Standorte (RegionInput-Bubble). Eigene Orte erscheinen als aktive
              Chips und lassen sich per Klick wieder entfernen. */}
          <div className="mt-6 space-y-2">
            <span className="text-sm text-muted">Bevorzugte Regionen</span>
            <div className="flex flex-wrap items-center gap-2">
              {regionen.map((r) => (
                <Chip key={r} label={r} on={p.regionen.includes(r)} onClick={() => toggle("regionen", r)} />
              ))}
              {p.regionen
                .filter((r) => !regionen.some((x) => x.toLowerCase() === r.toLowerCase()))
                .map((r) => (
                  <Chip key={r} label={r} on onClick={() => toggle("regionen", r)} />
                ))}
              <RegionInput
                onAdd={(city) => {
                  // Deckt sich der freie Ort mit einem Vorauswahl-Chip, wird
                  // dieser aktiviert statt einen Duplikat-Chip zu erzeugen.
                  const known = regionen.find((x) => x.toLowerCase() === city.toLowerCase());
                  const ziel = known ?? city;
                  setP((s) =>
                    s.regionen.some((x) => x.toLowerCase() === ziel.toLowerCase())
                      ? s
                      : { ...s, regionen: [...s.regionen, ziel] },
                  );
                }}
              />
            </div>
            <p className="text-xs text-faint">
              Ihr Wunschort ist nicht dabei? Einfach eintippen — wir informieren Sie,
              sobald dort etwas Passendes hereinkommt.
            </p>
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

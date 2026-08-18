"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/container";
import { Icon, type IconName } from "@/components/icon";
import { useAuth } from "@/components/auth";
import type { FeedbackStatusMap, FeedbackState } from "@/lib/intern-feedback";
import { buildFeedbackPrompt, buildFeedbackBatchPrompt, encodeFeedbackLocator, parseFeedbackArea, FEEDBACK_PARAM } from "@/lib/feedback-locator";
import {
  LEAD_STATUS_VALUES,
  STATUS_LABELS,
  bearbeitungKey,
  type LeadBearbeitungMap,
  type LeadQuelle,
  type LeadStatus,
} from "@/lib/lead-bearbeitung";

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
  /** jsonb-Spalte — Objektbezug (objektTitel/objektId) schreiben inquiry seit
   * je, booking + contact seit 12.08.2026 (Fall Maik Steinert: Terminanfrage
   * kam ohne Objekt an, weil der Bezug nur Nachrichten-Text war). */
  detail?: { objektTitel?: string | null; objektId?: string | null } | null;
}

/**
 * Objektbezug einer Anfrage für die Anzeige — „Titel · ID", damit Sissy das
 * Objekt sofort zuordnen und über die ID in OnOffice finden kann.
 */
function leadObjekt(l: LeadRow): string | null {
  const titel = l.detail?.objektTitel?.trim();
  if (!titel) return null;
  const id = l.detail?.objektId?.trim();
  return id ? `${titel} · ID ${id}` : titel;
}

interface FeedbackRow {
  id: string;
  created_at: string;
  page_url?: string;
  area?: string;
  comment: string;
}

interface AccountRow {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

interface ObjektRow {
  id: string;
  title: string;
  city: string;
  postcode?: string;
  slug: string;
  status: string;
  price: string;
  priceValue: number;
  image?: string | null;
  rooms?: number | null;
  livingArea?: number | null;
  category?: string;
  marketingType?: string;
  provision?: string;
}

type ObjSortKey = "title" | "city" | "priceValue" | "status";

type Tab = "overview" | "conversion" | "reports" | "leads" | "objekte" | "medien" | "feedback" | "konten";

/* ── Conversion-Tracking des Rechners (/api/intern/conversion) ────────────
 * Anonyme Funnel-/Heatmap-Auswertung: alle Zahlen sind Seitenaufruf-Uniques
 * (pageload_id), NICHT Personen — es gibt bewusst keine Wiedererkennung
 * (s. src/lib/track.ts). */
interface ConvStufe {
  key: string;
  label: string;
  /** Seitenaufrufe, die diese Stufe erreicht haben. */
  n: number;
  /** Anteil an der Start-Stufe in Prozent (Balkenlänge). */
  pctVomStart: number;
  /** Konversion gegenüber der vorherigen Stufe; null bei Stufe 1. */
  konversion: number | null;
}

interface ConvData {
  zeitraum: number;
  gesamt: number;
  /** true, solange die Migration noch nicht eingespielt ist. */
  tabelleFehlt: boolean;
  funnel: ConvStufe[];
  pdfQuote: number;
  quelle: { cta: number; badge: number };
  heatmap: { x: number; y: number; n: number; bereich: string }[];
  bereiche: { bereich: string; n: number }[];
  serie: { tag: string; n: number }[];
  klickLimitErreicht: boolean;
}

/** Ein Ereignis aus der Kontakt-Akte (/api/intern/akte): Bewertung, Anfrage,
 *  Merklisten-Eintrag oder Suchauftrag einer E-Mail-Adresse, chronologisch. */
type AkteEreignisTyp = "bewertung" | "anfrage" | "favorit" | "suchauftrag";

interface AkteEreignis {
  typ: AkteEreignisTyp;
  datum: string;
  titel: string;
  details: string;
}

interface AkteKonto {
  existiert: boolean;
  bestaetigt: boolean;
  letzterLogin: string | null;
}

interface AkteState {
  email: string;
  busy: boolean;
  error: string | null;
  ereignisse: AkteEreignis[];
  konto: AkteKonto | null;
  dublette: boolean;
}

interface BunnyImage {
  name: string;
  url: string;
  lastChanged?: string;
}

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
  mehrfamilienhaus: "Mehrfamilienhaus",
};

const OBJ_STATUS: Record<string, { label: string; cls: string }> = {
  aktiv: { label: "Verfügbar", cls: "border-[#34d399]/40 text-[#34d399]" },
  reserviert: { label: "Reserviert", cls: "border-[#fbbf24]/40 text-[#fbbf24]" },
  verkauft: { label: "Verkauft", cls: "border-border text-faint" },
  vermietet: { label: "Vermietet", cls: "border-border text-faint" },
};

/** Dezente Badge-Farben je Bearbeitungsstatus, im Stil von OBJ_STATUS/Feedback. */
/** Farbe, Verlauf und Icon je Bearbeitungsstatus. Die Verlaeufe sind bewusst
 *  leise (15 % nach transparent), damit die Tabelle nicht bunt wird und der
 *  Blick trotzdem sofort gewonnen/verloren unterscheidet. */
const STATUS_META: Record<LeadStatus, { cls: string; icon: IconName }> = {
  neu: { cls: "border-border bg-gradient-to-r from-surface-2/80 to-transparent text-muted", icon: "sparkle" },
  kontaktiert: { cls: "border-accent/40 bg-gradient-to-r from-accent/15 to-transparent text-accent-strong", icon: "phone" },
  termin: { cls: "border-[#fbbf24]/40 bg-gradient-to-r from-[#fbbf24]/15 to-transparent text-[#fbbf24]", icon: "calendar" },
  gewonnen: { cls: "border-[#34d399]/45 bg-gradient-to-r from-[#34d399]/15 to-transparent text-[#34d399]", icon: "check" },
  verloren: { cls: "border-[#f87171]/40 bg-gradient-to-r from-[#f87171]/12 to-transparent text-[#f87171]", icon: "close" },
};

/** Icon/Label je Ereignistyp in der Kontakt-Akte. */
const AKTE_TYP_ICON: Record<AkteEreignisTyp, IconName> = {
  bewertung: "calculator",
  anfrage: "mail",
  favorit: "heart",
  suchauftrag: "search",
};
const AKTE_TYP_LABEL: Record<AkteEreignisTyp, string> = {
  bewertung: "Bewertung",
  anfrage: "Anfrage",
  favorit: "Merkliste",
  suchauftrag: "Suchauftrag",
};

function ObjDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-faint">{label}</dt>
      <dd className="text-fg">{value}</dd>
    </div>
  );
}

const norm = (s: string) =>
  s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

function daysAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

/** Heutiges Datum als YYYY-MM-DD, in der lokalen Zeitzone (nicht UTC, damit
 *  Wiedervorlagen kurz vor/nach Mitternacht korrekt als heute fällig gelten). */
function todayLocalStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** YYYY-MM-DD -> deutsches Datumsformat (dd.mm.yyyy). */
function fmtWvDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}.${m}.${y}` : iso;
}

/** Prüft, ob ein ISO-Zeitstempel in einem optionalen Datumsbereich liegt:
 *  rein clientseitiger Filter auf den bereits geladenen Reports/Anfragen.
 *  "bis" schließt den ganzen Tag ein, analog zu /api/intern/export. */
function inDateRange(iso: string, von: string, bis: string): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  if (von) {
    const vt = new Date(von).getTime();
    if (Number.isFinite(vt) && t < vt) return false;
  }
  if (bis) {
    const bt = new Date(bis).getTime() + 86_400_000;
    if (Number.isFinite(bt) && t >= bt) return false;
  }
  return true;
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
  exportBusy,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
  children?: React.ReactNode;
  onExport?: () => void;
  exportBusy?: boolean;
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
          aria-label={placeholder}
          className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
      </div>
      {children}
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          disabled={exportBusy}
          className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          <Icon name="doc" size={15} /> {exportBusy ? "Exportiere …" : "CSV"}
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
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

/** Zeitraum-Filter (von/bis) für Reports/Anfragen, rein clientseitig auf den
 *  bereits geladenen Daten (s. inDateRange). */
function DateRangeFilter({
  von,
  bis,
  onVon,
  onBis,
}: {
  von: string;
  bis: string;
  onVon: (v: string) => void;
  onBis: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
      <span className="text-xs text-faint">Zeitraum</span>
      <label className="flex items-center gap-1.5 text-xs text-faint">
        von
        <input
          type="date"
          value={von}
          onChange={(e) => onVon(e.target.value)}
          aria-label="Zeitraum von"
          className="rounded-md border-none bg-transparent text-sm text-fg outline-none"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-faint">
        bis
        <input
          type="date"
          value={bis}
          onChange={(e) => onBis(e.target.value)}
          aria-label="Zeitraum bis"
          className="rounded-md border-none bg-transparent text-sm text-fg outline-none"
        />
      </label>
      {(von || bis) && (
        <button
          type="button"
          onClick={() => {
            onVon("");
            onBis("");
          }}
          aria-label="Zeitraum zurücksetzen"
          className="press text-faint transition-colors hover:text-accent"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </div>
  );
}

/** OnOffice-Übergabe-Knopf je Report-/Anfragen-Zeile: solange kein
 *  onoffice_adresse_id vorliegt, ein Aktionsknopf; danach dauerhaft ein
 *  Erfolgs-Badge mit der Datensatz-Id (kein Zurück, kein Zweitversuch nötig). */
function OnOfficeButton({
  entry,
  busy,
  error,
  onSubmit,
}: {
  entry?: LeadBearbeitungMap[string];
  busy: boolean;
  error?: string;
  onSubmit: () => void;
}) {
  const id = entry?.onoffice_adresse_id;
  // Kompakt (Icon + Tooltip): drei uebereinander gestapelte Textpillen haben
  // die Aktionsspalte so breit und hoch gemacht, dass die Tabelle am
  // overflow-x-Rahmen abgeschnitten wirkte (Screenshot Alex, 03.08.).
  if (id) {
    return (
      <span
        title={`In onOffice uebernommen · Datensatz ${id}`}
        className="cockpit-auf inline-flex h-8 items-center gap-1 rounded-full border border-[#34d399]/45 bg-gradient-to-r from-[#34d399]/15 to-transparent px-2.5 text-xs text-[#34d399]"
      >
        <Icon name="check" size={13} /> CRM
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={busy}
      title={error ? `Fehler bei der Uebergabe: ${error} (erneut versuchen)` : "An onOffice uebergeben: legt den Kontakt als Adressdatensatz im CRM an"}
      aria-label="An onOffice uebergeben"
      className={`press inline-flex h-8 w-8 items-center justify-center rounded-full border text-fg transition-colors disabled:opacity-60 ${
        error ? "border-[#f87171]/60 text-[#f87171]" : "border-border hover:border-accent hover:text-accent"
      }`}
    >
      {busy ? <span className="text-[0.6rem]">…</span> : <Icon name="building" size={14} />}
    </button>
  );
}

/* ───────────────────────── Dashboard ───────────────────────── */

export function InternDashboard() {
  // Zugang wahlweise per ADMIN_PASSWORD oder per eingeloggtem RIEGEL-Konto
  // (E-Mail-Allowlist, serverseitig geprüft). accessToken wird bei jedem
  // Aufruf mitgeschickt; der Server nimmt, was gültig ist.
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ reports: ReportRow[]; leads: LeadRow[] } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatusMap>({});
  const [fbFilter, setFbFilter] = useState<"all" | "open" | "done">("all");
  const [fbBusyId, setFbBusyId] = useState<string | null>(null);
  // Bearbeitungsstand (Status/Notiz/Wiedervorlage) je Report/Anfrage, Schlüssel
  // per bearbeitungKey("report"|"lead", id). bearbOpen ist die (höchstens) eine
  // aufgeklappte Detailzeile in Reports/Anfragen-Tab, geteilt über beide Tabs,
  // da die Schlüssel je Quelle eindeutig sind.
  const [bearbeitung, setBearbeitung] = useState<LeadBearbeitungMap>({});
  const [bearbOpen, setBearbOpen] = useState<string | null>(null);
  const [bearbBusy, setBearbBusy] = useState<Set<string>>(new Set());
  const [bearbError, setBearbError] = useState<Record<string, string>>({});
  // PDF-Regeneration je Report-Zeile: Busy- und Fehlerzustand pro id (Set),
  // damit mehrere Zeilen unabhängig voneinander einen Ladezustand zeigen können.
  const [reportBusy, setReportBusy] = useState<Set<string>>(new Set());
  const [reportFailed, setReportFailed] = useState<Set<string>>(new Set());
  const [objekte, setObjekte] = useState<ObjektRow[]>([]);
  const [objSort, setObjSort] = useState<{ key: ObjSortKey; dir: "asc" | "desc" }>({
    key: "status",
    dir: "asc",
  });
  const [objOpen, setObjOpen] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);

  // Intern-Zugänge (fest + eingeladen) fürs Konten-Tab: eigener Endpoint
  // (api/intern/users), unabhängig vom Reports-/Leads-Ladevorgang oben.
  // usersLoaded ist der Guard fürs einmalige Nachladen bei Tab-Öffnung
  // (kein useEffect nötig, s. TABS-onClick weiter unten).
  const [fixedEmails, setFixedEmails] = useState<string[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; mailError?: boolean; error?: string } | null>(null);
  const [removeBusy, setRemoveBusy] = useState<Set<string>>(new Set());
  // Zwei-Klick-Bestätigung fürs Konto-Löschen OHNE window.confirm: erster Klick
  // "armiert" die Zeile (Label wechselt 3 s lang auf "Wirklich löschen?"),
  // zweiter Klick innerhalb des Fensters löscht wirklich.
  const [deleteArm, setDeleteArm] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<Tab>("overview");
  const [rQuery, setRQuery] = useState("");
  const [rArt, setRArt] = useState("all");
  const [rHot, setRHot] = useState(false);
  const [lQuery, setLQuery] = useState("");
  const [lKind, setLKind] = useState("all");
  const [aQuery, setAQuery] = useState("");
  // Zeitraum-Filter (von/bis) je Tab, rein clientseitig auf den geladenen Daten.
  const [rVon, setRVon] = useState("");
  const [rBis, setRBis] = useState("");
  const [lVon, setLVon] = useState("");
  const [lBis, setLBis] = useState("");
  // CSV-Export je Tab: welcher Export gerade läuft (für den Button-Text), s. exportCsv().
  const [csvBusy, setCsvBusy] = useState<"reports" | "leads" | null>(null);
  // OnOffice-Übergabe je Report/Anfrage (Schlüssel: bearbeitungKey(...)).
  const [onofficeBusy, setOnofficeBusy] = useState<Set<string>>(new Set());
  const [onofficeError, setOnofficeError] = useState<Record<string, string>>({});
  // Kontakt-Akte: Seitenpanel bei Klick auf eine E-Mail-Adresse in Reports/Anfragen.
  const [akte, setAkte] = useState<AkteState | null>(null);

  // Conversion-Tab: eigener Endpoint, erst beim Öffnen des Tabs geladen
  // (Muster wie loadUsers) — die Auswertung soll den Login nicht verzögern.
  const [conv, setConv] = useState<ConvData | null>(null);
  const [convTage, setConvTage] = useState<7 | 30>(7);
  const [convBusy, setConvBusy] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);

  const [heroImages, setHeroImages] = useState<BunnyImage[] | null>(null);
  const [heroCurrent, setHeroCurrent] = useState<string>("");
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [heroMsg, setHeroMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function loadHeroImages() {
    setHeroBusy(true);
    setHeroError(null);
    try {
      const res = await fetch("/api/intern/hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "list" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setHeroImages(json.images ?? []);
      setHeroCurrent(json.current ?? "");
    } catch (e) {
      setHeroError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setHeroBusy(false);
    }
  }

  async function selectHeroImage(url: string) {
    setHeroBusy(true);
    setHeroError(null);
    setHeroMsg(null);
    try {
      const res = await fetch("/api/intern/hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "select", url }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setHeroCurrent(url);
      setHeroMsg("Hero-Bild aktualisiert — die Startseite zeigt es jetzt live.");
    } catch (e) {
      setHeroError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setHeroBusy(false);
    }
  }

  async function uploadHeroFile(file: File) {
    setHeroBusy(true);
    setHeroError(null);
    setHeroMsg(null);
    try {
      const fd = new FormData();
      fd.append("password", password);
      fd.append("accessToken", accessToken ?? "");
      fd.append("file", file);
      const res = await fetch("/api/intern/hero-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setHeroCurrent(json.image.url);
      setHeroImages((prev) => [json.image, ...(prev ?? [])]);
      setHeroMsg("Bild hochgeladen und als Hero-Bild aktiviert — die Startseite zeigt es jetzt live.");
    } catch (e) {
      setHeroError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setHeroBusy(false);
    }
  }

  async function load() {
    if (!password.trim() && !accessToken) {
      setError("Bitte mit einem freigeschalteten RIEGEL-Konto anmelden oder Passwort eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/intern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setData({ reports: json.reports ?? [], leads: json.leads ?? [] });
      setFeedback(json.feedback ?? []);
      setFeedbackStatus(json.feedbackStatus ?? {});
      setObjekte(json.objekte ?? []);
      setAccounts(json.accounts ?? []);
      setBearbeitung(json.bearbeitung ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeedback(id: string, status: FeedbackState) {
    setFbBusyId(id);
    try {
      const res = await fetch("/api/intern/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, id, status }),
      });
      const json = await res.json();
      if (res.ok && json.ok) setFeedbackStatus(json.feedbackStatus ?? {});
    } finally {
      setFbBusyId(null);
    }
  }

  /** Speichert Status/Notiz/Wiedervorlage eines Reports oder einer Anfrage.
   *  Aktualisiert den lokalen State optimistisch, bevor die Antwort da ist,
   *  und macht die Änderung bei Fehler wieder rückgängig (Muster: toggleFeedback,
   *  nur mit Optimistic-Update, da der Nutzer sofort weiterarbeiten soll). */
  async function saveBearbeitung(
    quelle: LeadQuelle,
    quelleId: string,
    // Teil-Patches sind ausdruecklich erlaubt: das Status-Dropdown sendet nur
    // {status}, das Panel alle drei Felder. Die Route laesst nicht uebergebene
    // Felder unangetastet (partielles Upsert, per Smoke-Test verifiziert).
    patch: { status?: LeadStatus; notiz?: string | null; wiedervorlage?: string | null },
  ) {
    const key = bearbeitungKey(quelle, quelleId);
    const prevEntry = bearbeitung[key];
    // Teil-Patch mit dem Bestand mischen — exakt die Semantik des partiellen
    // Upserts auf dem Server, sonst wuerde die Optimistik Felder leeren, die
    // der Server behaelt.
    setBearbeitung((prev) => ({
      ...prev,
      [key]: {
        status: patch.status ?? prev[key]?.status ?? "neu",
        notiz: patch.notiz !== undefined ? patch.notiz : (prev[key]?.notiz ?? null),
        wiedervorlage: patch.wiedervorlage !== undefined ? patch.wiedervorlage : (prev[key]?.wiedervorlage ?? null),
        onoffice_adresse_id: prev[key]?.onoffice_adresse_id ?? null,
      },
    }));
    setBearbBusy((prev) => new Set(prev).add(key));
    setBearbError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const res = await fetch("/api/intern/bearbeitung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          accessToken,
          quelle,
          quelle_id: quelleId,
          status: patch.status,
          notiz: patch.notiz,
          wiedervorlage: patch.wiedervorlage,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      if (json.bearbeitung) setBearbeitung((prev) => ({ ...prev, [key]: json.bearbeitung }));
    } catch (e) {
      // Fehlschlag: optimistische Änderung rückgängig machen.
      setBearbeitung((prev) => {
        const next = { ...prev };
        if (prevEntry) next[key] = prevEntry;
        else delete next[key];
        return next;
      });
      setBearbError((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : "Fehler" }));
    } finally {
      setBearbBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  /** PDF-Regeneration einer einzelnen Bewertung — Sissy kann so jeden Report
   * (auch ohne explizit angefordertes PDF) jederzeit ziehen. Antwort kommt als
   * Blob, nicht als JSON (anders als die übrigen /api/intern-Routen). */
  async function downloadReport(id: string) {
    setReportBusy((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/intern/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, id }),
      });
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `RIEGEL-Report-${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      // Verzögert freigeben: sofortiges Revoke direkt nach click() kann in
      // Safari den noch startenden Download abbrechen.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setReportFailed((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setReportFailed((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2500);
    } finally {
      setReportBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  /** CSV-Export je Tab (Reports/Anfragen) über /api/intern/export. Antwort
   *  kommt als Blob (nicht JSON), Download-Auslösung wie bei downloadReport(). */
  async function exportCsv(was: "reports" | "leads", vonDatum: string, bisDatum: string) {
    setCsvBusy(was);
    try {
      const res = await fetch("/api/intern/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          accessToken,
          was,
          vonDatum: vonDatum || undefined,
          bisDatum: bisDatum || undefined,
        }),
      });
      if (!res.ok) throw new Error("Fehler");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `RIEGEL-${was === "reports" ? "Reports" : "Anfragen"}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // fail-soft: kein Blockierzustand, ein erneuter Klick genügt.
    } finally {
      setCsvBusy(null);
    }
  }

  /** Übergibt einen Report/eine Anfrage an OnOffice (Knopf je Zeile in
   *  Reports/Anfragen). Die zurückgegebene onoffice_adresse_id landet dauerhaft
   *  in bearbeitung, wie bei saveBearbeitung. Bei Fehler bleibt der Knopf
   *  aktiv, die Fehlermeldung erscheint darunter. */
  async function uebergebeOnOffice(quelle: LeadQuelle, quelleId: string) {
    const key = bearbeitungKey(quelle, quelleId);
    setOnofficeBusy((prev) => new Set(prev).add(key));
    setOnofficeError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const res = await fetch("/api/intern/onoffice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, quelle, quelleId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setBearbeitung((prev) => ({
        ...prev,
        [key]: {
          status: prev[key]?.status ?? "neu",
          notiz: prev[key]?.notiz ?? null,
          wiedervorlage: prev[key]?.wiedervorlage ?? null,
          onoffice_adresse_id: json.onoffice_adresse_id ?? null,
        },
      }));
    } catch (e) {
      setOnofficeError((prev) => ({ ...prev, [key]: e instanceof Error ? e.message : "Fehler" }));
    } finally {
      setOnofficeBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  /** Kontakt-Akte laden (Seitenpanel bei Klick auf eine E-Mail-Adresse in
   *  Reports/Anfragen): chronologische Ereignisliste, Konto-Status und
   *  Dubletten-Hinweis, alles aus /api/intern/akte. */
  async function openAkte(email: string) {
    setAkte({ email, busy: true, error: null, ereignisse: [], konto: null, dublette: false });
    try {
      const res = await fetch("/api/intern/akte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setAkte({
        email,
        busy: false,
        error: null,
        ereignisse: json.ereignisse ?? [],
        konto: json.konto ?? null,
        dublette: Boolean(json.dublette),
      });
    } catch (e) {
      setAkte((prev) => (prev ? { ...prev, busy: false, error: e instanceof Error ? e.message : "Fehler" } : null));
    }
  }

  function closeAkte() {
    setAkte(null);
  }

  /** Conversion-Auswertung für 7 oder 30 Tage laden. Wird beim Öffnen des Tabs
   *  und bei jedem Wechsel des Zeitraums gerufen — der Server aggregiert, hier
   *  kommt nur noch Fertiges an. */
  async function loadConversion(tage: 7 | 30) {
    setConvBusy(true);
    setConvError(null);
    try {
      const res = await fetch("/api/intern/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, zeitraum: tage }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setConv(json as ConvData);
    } catch (e) {
      setConvError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setConvBusy(false);
    }
  }

  /** Feste + eingeladene Intern-Zugänge laden, einmalig bei Öffnen des
   *  Konten-Tabs (Aufruf steht bei den TABS weiter unten). */
  async function loadUsers() {
    setUsersBusy(true);
    setUsersError(null);
    try {
      const res = await fetch("/api/intern/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "list" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setFixedEmails(json.fixed ?? []);
      setInvitedEmails(json.invited ?? []);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setUsersBusy(false);
      setUsersLoaded(true);
    }
  }

  async function inviteUser() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteBusy(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/intern/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "invite", email }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Fehler");
      setInvitedEmails(json.invited ?? []);
      setInviteResult({ ok: true, mailError: Boolean(json.mailError) });
      setInviteEmail("");
    } catch (e) {
      setInviteResult({ ok: false, error: e instanceof Error ? e.message : "Fehler" });
    } finally {
      setInviteBusy(false);
    }
  }

  /** Fail-soft: Netzwerkfehler landen nicht als unhandled rejection, da
   *  deleteAccount() dies auch ohne await aufruft (Aufräumen nach Löschung). */
  async function removeInvited(email: string) {
    setRemoveBusy((prev) => new Set(prev).add(email));
    try {
      const res = await fetch("/api/intern/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "remove", email }),
      });
      const json = await res.json();
      if (res.ok && json.ok) setInvitedEmails(json.invited ?? []);
    } catch {
      // fail-soft
    } finally {
      setRemoveBusy((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  }

  /** Konto endgültig löschen, zweistufig: erster Aufruf armiert nur die
   *  Zeile, der zweite (innerhalb 3 s) löscht wirklich. */
  async function deleteAccount(id: string, email?: string | null) {
    if (deleteArm !== id) {
      setDeleteArm(id);
      setTimeout(() => setDeleteArm((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setDeleteArm(null);
    setDeleteBusy((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/intern/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, accessToken, action: "delete-account", userId: id }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        // Stand die Adresse auch auf der Einladungsliste, dort ebenfalls
        // entfernen (fail-soft, das Konto ist so oder so schon gelöscht).
        const lower = email?.toLowerCase();
        if (lower && invitedEmails.includes(lower)) removeInvited(lower);
      }
    } finally {
      setDeleteBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      if (!inDateRange(r.created_at, rVon, rBis)) return false;
      if (!q) return true;
      return norm(`${r.name ?? ""} ${r.email ?? ""} ${r.address ?? ""} ${r.city ?? ""} ${r.postcode ?? ""}`).includes(q);
    });
  }, [data, rQuery, rArt, rHot, rVon, rBis]);

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    const q = norm(lQuery.trim());
    return data.leads.filter((l) => {
      if (lKind !== "all" && l.kind !== lKind) return false;
      if (!inDateRange(l.created_at, lVon, lBis)) return false;
      if (!q) return true;
      return norm(`${l.name ?? ""} ${l.email ?? ""} ${l.subject ?? ""} ${l.message ?? ""} ${l.detail?.objektTitel ?? ""}`).includes(q);
    });
  }, [data, lQuery, lKind, lVon, lBis]);

  // Überfällige + heute fällige Wiedervorlagen für den Übersicht-Tab (nur
  // diese beiden Fälle, künftige Termine erscheinen erst am jeweiligen Tag).
  const wiedervorlagen = useMemo(() => {
    if (!data) return [];
    const todayStr = todayLocalStr();
    const list: { key: string; tab: Tab; name: string; datum: string; overdue: boolean }[] = [];
    for (const r of data.reports) {
      const wv = bearbeitung[bearbeitungKey("report", r.id)]?.wiedervorlage;
      if (!wv || wv > todayStr) continue;
      list.push({
        key: bearbeitungKey("report", r.id),
        tab: "reports",
        name: r.name || r.email || "Ohne Namen",
        datum: wv,
        overdue: wv < todayStr,
      });
    }
    for (const l of data.leads) {
      const wv = bearbeitung[bearbeitungKey("lead", l.id)]?.wiedervorlage;
      if (!wv || wv > todayStr) continue;
      list.push({
        key: bearbeitungKey("lead", l.id),
        tab: "leads",
        name: l.name || l.email || "Ohne Namen",
        datum: wv,
        overdue: wv < todayStr,
      });
    }
    return list.sort((a, b) => a.datum.localeCompare(b.datum));
  }, [data, bearbeitung]);

  // Objekte sortiert (Hook VOR dem Login-Gate, damit die Hook-Reihenfolge stabil ist).
  const sortedObjekte = useMemo(() => {
    const arr = [...objekte];
    const { key, dir } = objSort;
    arr.sort((a, b) => {
      const cmp =
        key === "priceValue"
          ? a.priceValue - b.priceValue
          : String(a[key]).localeCompare(String(b[key]), "de");
      return dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [objekte, objSort]);

  const filteredAccounts = useMemo(() => {
    const q = norm(aQuery.trim());
    return accounts
      .filter((a) => (q ? norm(a.email ?? "").includes(q) : true))
      .slice()
      .sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
  }, [accounts, aQuery]);

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
            {accessToken ? (
              // Eingeloggt (RIEGEL-Konto): direkter Zugang, der Server prüft die
              // E-Mail-Freigabe. Kein Passwort nötig.
              <>
                <p className="mt-5 rounded-lg border border-border bg-bg px-3 py-3 text-sm text-muted">
                  Angemeldet als{" "}
                  <span className="text-fg">{session?.user?.email}</span>
                </p>
                {error && <p className="mt-3 text-sm text-accent" role="alert">{error}</p>}
                <button
                  type="button"
                  onClick={load}
                  disabled={busy}
                  className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70"
                >
                  {busy ? "Lädt …" : "Dashboard öffnen"}
                </button>
              </>
            ) : (
              <>
                <input
                  type="password"
                  value={password}
                  aria-label="Passwort"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  placeholder="Passwort"
                  className="mt-5 w-full rounded-lg border border-border bg-bg px-3 py-3 text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
                />
                {error && <p className="mt-3 text-sm text-accent" role="alert">{error}</p>}
                <button
                  type="button"
                  onClick={load}
                  disabled={busy}
                  className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-70"
                >
                  {busy ? "Lädt …" : "Anmelden"}
                </button>
                <p className="mt-4 text-center text-xs text-faint">
                  Freigeschaltetes RIEGEL-Konto?{" "}
                  <a href="/konto?next=/intern" className="text-accent hover:underline">
                    Anmelden oder registrieren
                  </a>
                </p>
              </>
            )}
          </div>
        </Container>
      </section>
    );
  }

  const fbOpenCount = feedback.filter(
    (f) => (feedbackStatus[f.id]?.status ?? "open") !== "done",
  ).length;
  function objSortBy(key: ObjSortKey) {
    setObjSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  const TABS: { key: Tab; label: string; icon: IconName; n?: number }[] = [
    { key: "overview", label: "Übersicht", icon: "chart" },
    { key: "conversion", label: "Conversion", icon: "trend" },
    { key: "reports", label: "Reports", icon: "doc", n: stats?.reports },
    { key: "leads", label: "Anfragen", icon: "calendar", n: stats?.leads },
    { key: "objekte", label: "Objekte", icon: "building", n: objekte.length },
    { key: "medien", label: "Medien", icon: "layers" },
    { key: "feedback", label: "Feedback", icon: "sparkle", n: fbOpenCount },
    { key: "konten", label: "Konten", icon: "users", n: accounts.length },
  ];

  return (
    <section className="py-12 sm:py-16">
      <Container>
        {/* Kopf */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Lead-Cockpit</h1>
            <p className="mt-1 text-sm text-muted">
              <span key={`r${stats?.reports}`} className="t-num-d tabular-nums">{stats?.reports}</span> Reports ·{" "}
              <span key={`l${stats?.leads}`} className="t-num-d tabular-nums">{stats?.leads}</span> Anfragen ·{" "}
              <span key={`n${(stats?.newReports ?? 0) + (stats?.newLeads ?? 0)}`} className="t-num-d tabular-nums">
                {(stats?.newReports ?? 0) + (stats?.newLeads ?? 0)}
              </span>{" "}
              neu in 7 Tagen
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="press inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg hover:border-accent hover:text-accent disabled:opacity-60 sm:w-auto"
          >
            <Icon name="search" size={15} /> {busy ? "Lädt …" : "Aktualisieren"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  // Intern-Zugänge nur einmal nachladen (Guard über usersLoaded),
                  // damit ein erneuter Tab-Wechsel keinen Extra-Request auslöst.
                  if (t.key === "konten" && !usersLoaded) loadUsers();
                  // Conversion-Zahlen genauso: erst beim ersten Öffnen holen.
                  if (t.key === "conversion" && !conv && !convBusy) loadConversion(convTage);
                }}
                className={`relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm transition-colors ${
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
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                <Icon name="calendar" size={16} className="text-accent" /> Wiedervorlagen
              </h2>
              {wiedervorlagen.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
                  Keine fälligen Wiedervorlagen.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {wiedervorlagen.map((w) => (
                    <div key={w.key} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-fg">{w.name}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setTab(w.tab);
                            setBearbOpen(w.key);
                          }}
                          className="text-xs text-accent hover:underline"
                        >
                          {w.tab === "reports" ? "Zum Report" : "Zur Anfrage"}
                        </button>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                          w.overdue ? "border-[#f87171]/40 text-[#f87171]" : "border-[#fbbf24]/40 text-[#fbbf24]"
                        }`}
                      >
                        {w.overdue ? "Überfällig · " : "Heute · "}
                        {fmtWvDate(w.datum)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-3">
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
                    <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-fg">{l.name || l.email || "—"}</div>
                        <div className="truncate text-xs text-faint">{l.subject || (l.kind === "booking" ? "Terminanfrage" : "Kontakt")}</div>
                        {/* Objektbezug direkt sichtbar (12.08.2026, Wunsch Alex). */}
                        {leadObjekt(l) && <div className="truncate text-xs text-accent">{leadObjekt(l)}</div>}
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

        {/* ── Conversion: Rechner-Funnel + Klick-Heatmap ──
            Beantwortet Alex' zwei Fragen: Wird der Rechner überhaupt
            angefangen? Und wo verlieren wir die Leute auf dem Weg zum PDF? */}
        {tab === "conversion" && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-fg">Rechner-Funnel</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Wo steigen Interessenten in den Bewertungsrechner ein — und wo springen sie ab?
                  Gezählt werden Seitenaufrufe, nicht Personen: Das Tracking ist cookielos und
                  erkennt niemanden wieder.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* Zeitraum-Umschalter: löst direkt einen neuen Serverabruf aus
                    (die Aggregation passiert serverseitig, nicht im Browser). */}
                <div className="inline-flex rounded-full border border-border p-0.5">
                  {([7, 30] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setConvTage(t);
                        loadConversion(t);
                      }}
                      className={`press rounded-full px-3 py-1.5 text-sm transition-colors ${
                        convTage === t ? "bg-accent text-on-accent" : "text-muted hover:text-fg"
                      }`}
                    >
                      {t} Tage
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadConversion(convTage)}
                  disabled={convBusy}
                  className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  <Icon name="search" size={15} /> {convBusy ? "Lädt …" : "Aktualisieren"}
                </button>
              </div>
            </div>

            {convError && (
              <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 text-sm text-accent" role="alert">
                {convError}
              </p>
            )}

            {!conv && convBusy && (
              <p className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
                Zahlen werden geladen …
              </p>
            )}

            {/* Leerzustand statt leerer Charts: frisch nach dem Deploy ist die
                Tabelle noch leer — das ist kein Fehler, sondern erwartbar. */}
            {conv && conv.gesamt === 0 && (
              <div className="rounded-2xl border border-border bg-surface px-4 py-12 text-center">
                <Icon name="trend" size={26} className="mx-auto text-faint" />
                <p className="mt-3 text-sm text-fg">Noch keine Daten — Tracking läuft seit dem nächsten Deploy</p>
                <p className="mx-auto mt-1 max-w-md text-xs text-faint">
                  Sobald die ersten Besucher den Rechner öffnen, füllen sich Funnel, Heatmap und
                  PDF-Kurve hier automatisch.
                  {conv.tabelleFehlt && " (Hinweis: Die Tabelle rechner_events fehlt noch — Migration einspielen.)"}
                </p>
              </div>
            )}

            {conv && conv.gesamt > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon="doc"
                    label="PDF-Quote"
                    value={`${fmtPctDe(conv.pdfQuote)} %`}
                    sub={`${conv.funnel.find((s) => s.key === "pdf")?.n ?? 0} von ${
                      conv.funnel.find((s) => s.key === "start")?.n ?? 0
                    } Rechner-Starts`}
                    accent
                  />
                  <StatCard
                    icon="calculator"
                    label="Rechner gestartet"
                    value={String(conv.funnel.find((s) => s.key === "start")?.n ?? 0)}
                    sub={`in ${conv.zeitraum} Tagen`}
                  />
                  <StatCard
                    icon="euro"
                    label="Ergebnis gesehen"
                    value={String(conv.funnel.find((s) => s.key === "ergebnis")?.n ?? 0)}
                    sub={`${fmtPctDe(conv.funnel.find((s) => s.key === "ergebnis")?.pctVomStart ?? 0)} % der Starts`}
                  />
                  <QuellenKachel quelle={conv.quelle} />
                </div>

                <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                      <Icon name="trend" size={16} className="text-accent" /> Funnel · {conv.zeitraum} Tage
                    </h3>
                    <ConversionFunnel funnel={conv.funnel} />
                  </div>
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                      <Icon name="chart" size={16} className="text-accent" /> PDF-Anforderungen je Tag
                    </h3>
                    <PdfSparkline serie={conv.serie} />
                    <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold text-muted">
                      <Icon name="pin" size={16} className="text-accent" /> Meistgeklickte Bereiche
                    </h3>
                    <TopBereiche bereiche={conv.bereiche} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
                    <Icon name="layers" size={16} className="text-accent" /> Klick-Heatmap
                  </h3>
                  <KlickHeatmap punkte={conv.heatmap} limitErreicht={conv.klickLimitErreicht} />
                </div>
              </>
            )}

            {/* Interne Test-Einstiege — bewusst dezent GANZ UNTEN (Wunsch Alex
                18.08.2026: nicht prominent im Dashboard): öffnen den Rechner
                mit fertigem Demo-Objekt direkt auf der Ergebnis-Seite.
                Demo-Aufrufe ignoriert das Tracking (track.ts) — sie tauchen
                in den Zahlen dieses Tabs nicht auf. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-faint">
              <span>Rechner-Endseite testen (zählt nicht ins Tracking):</span>
              {[
                { key: "wohnung", label: "Wohnung" },
                { key: "haus", label: "Haus" },
                { key: "mfh", label: "Mehrfamilienhaus" },
              ].map((d) => (
                <a
                  key={d.key}
                  href={`/rechner?demo=${d.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press rounded-full border border-border px-2.5 py-0.5 text-muted transition-colors hover:border-accent/60 hover:text-accent"
                >
                  {d.label} ↗
                </a>
              ))}
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
              onExport={() => exportCsv("reports", rVon, rBis)}
              exportBusy={csvBusy === "reports"}
            >
              <FilterSelect
                value={rArt}
                onChange={setRArt}
                ariaLabel="Nach Objektart filtern"
                options={[
                  { value: "all", label: "Alle Objektarten" },
                  ...reportArten.map((a) => ({ value: a, label: OBJEKTART_LABEL[a] ?? a })),
                ]}
              />
              <DateRangeFilter von={rVon} bis={rBis} onVon={setRVon} onBis={setRBis} />
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
                    {["Datum", "Name", "Kontakt", "Objekt", "Eckdaten", "Wert", "Status", ""].map((h) => (
                      <th key={h} className="px-3 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Keine Treffer.</td></tr>
                  ) : (
                    filteredReports.map((r) => {
                      const key = bearbeitungKey("report", r.id);
                      const open = bearbOpen === key;
                      const email = r.email;
                      return (
                        <Fragment key={r.id}>
                          <tr className="border-t border-border align-top hover:bg-surface/60">
                            <td className="whitespace-nowrap px-3 py-3 text-muted">
                              {fmtDate(r.created_at).split(", ")[0]}
                              <div className="text-xs text-faint">{fmtDate(r.created_at).split(", ")[1]}</div>
                            </td>
                            <td className="px-3 py-3 text-fg">{r.name || "–"}</td>
                            <td className="px-3 py-3">
                              {email && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => openAkte(email)}
                                    className="press break-all text-left text-accent hover:underline"
                                  >
                                    {email}
                                  </button>
                                  {/* Bueroadresse = im Kundengespraech von RIEGEL selbst erfasst
                                      (11 von 23 Reports laufen so, gemessen 03.08.) — sichtbar
                                      kennzeichnen, damit die Liste lesbar bleibt. */}
                                  {email.toLowerCase().endsWith("@riegel-immobilien.de") && (
                                    <span
                                      title="Mit der Bueroadresse erstellt, vermutlich im Kundengespraech erfasst"
                                      className="rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-faint"
                                    >
                                      intern
                                    </span>
                                  )}
                                </div>
                              )}
                              {r.phone ? <div className="text-faint">{r.phone}</div> : null}
                            </td>
                            <td className="px-3 py-3 text-muted">
                              <div className="text-fg">{OBJEKTART_LABEL[r.objektart ?? ""] ?? r.objektart ?? "–"}</div>
                              <div className="text-xs">{[r.address, r.postcode && r.city ? `${r.postcode} ${r.city}` : r.city].filter(Boolean).join(", ") || "ohne Adresse"}</div>
                            </td>
                            <td className="min-w-28 px-3 py-3 text-faint">
                              {[r.wohnflaeche ? `${r.wohnflaeche} m²` : null, r.zimmer ? `${r.zimmer} Zi.` : null, r.baujahr ? `Bj. ${r.baujahr}` : null].filter(Boolean).join(" · ") || "–"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="font-medium text-fg">{fmtEur(r.value_mid)}</div>
                              {r.price_per_sqm ? <div className="text-xs text-faint">{fmtEur(r.price_per_sqm)}/m²</div> : null}
                            </td>
                            <td className="px-3 py-3">
                              <StatusCell
                                entry={bearbeitung[key]}
                                saving={bearbBusy.has(key)}
                                onStatus={(st) => saveBearbeitung("report", r.id, { status: st })}
                                onPanel={() => setBearbOpen(open ? null : key)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                {r.report_requested && (
                                  <span
                                    title="PDF-Report wurde vom Interessenten angefordert"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 text-accent"
                                  >
                                    <Icon name="sparkle" size={13} />
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => downloadReport(r.id)}
                                  disabled={reportBusy.has(r.id)}
                                  title="Report-PDF neu erzeugen und herunterladen"
                                  className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                                >
                                  <Icon name="doc" size={13} />
                                  {reportFailed.has(r.id) ? "Fehler" : reportBusy.has(r.id) ? "…" : "PDF"}
                                </button>
                                <OnOfficeButton
                                  entry={bearbeitung[key]}
                                  busy={onofficeBusy.has(key)}
                                  error={onofficeError[key]}
                                  onSubmit={() => uebergebeOnOffice("report", r.id)}
                                />
                              </div>
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t border-border bg-surface/40">
                              <td colSpan={8} className="px-4 py-4">
                                <BearbeitungPanel
                                  entry={bearbeitung[key]}
                                  saving={bearbBusy.has(key)}
                                  error={bearbError[key]}
                                  onSave={(patch) => saveBearbeitung("report", r.id, patch)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
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
              onExport={() => exportCsv("leads", lVon, lBis)}
              exportBusy={csvBusy === "leads"}
            >
              <FilterSelect
                value={lKind}
                onChange={setLKind}
                ariaLabel="Nach Anfrageart filtern"
                options={[
                  { value: "all", label: "Alle Arten" },
                  { value: "booking", label: "Termine" },
                  { value: "contact", label: "Kontakt" },
                  { value: "archiv", label: "Alt-Kontakte" },
                ]}
              />
              <DateRangeFilter von={lVon} bis={lBis} onVon={setLVon} onBis={setLBis} />
            </Toolbar>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    {["Datum", "Art", "Name", "Kontakt", "Betreff / Nachricht", "Status", ""].map((h) => (
                      <th key={h} className="px-3 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">Keine Treffer.</td></tr>
                  ) : (
                    filteredLeads.map((l) => {
                      const key = bearbeitungKey("lead", l.id);
                      const open = bearbOpen === key;
                      const email = l.email;
                      return (
                        <Fragment key={l.id}>
                          <tr className="border-t border-border align-top hover:bg-surface/60">
                            <td className="whitespace-nowrap px-3 py-3 text-muted">
                              {fmtDate(l.created_at).split(", ")[0]}
                              <div className="text-xs text-faint">{fmtDate(l.created_at).split(", ")[1]}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full border px-2 py-0.5 text-xs ${l.kind === "archiv" ? "border-border text-faint" : "border-accent/40 text-accent"}`}>
                                {l.kind === "booking" ? "Termin" : l.kind === "archiv" ? "Alt-Kontakt" : "Kontakt"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-fg">{l.name || "–"}</td>
                            <td className="px-3 py-3">
                              {email && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => openAkte(email)}
                                    className="press break-all text-left text-accent hover:underline"
                                  >
                                    {email}
                                  </button>
                                  {/* Bueroadresse = im Kundengespraech von RIEGEL selbst erfasst
                                      (11 von 23 Reports laufen so, gemessen 03.08.) — sichtbar
                                      kennzeichnen, damit die Liste lesbar bleibt. */}
                                  {email.toLowerCase().endsWith("@riegel-immobilien.de") && (
                                    <span
                                      title="Mit der Bueroadresse erstellt, vermutlich im Kundengespraech erfasst"
                                      className="rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-faint"
                                    >
                                      intern
                                    </span>
                                  )}
                                </div>
                              )}
                              {l.phone ? <div className="text-faint">{l.phone}</div> : null}
                            </td>
                            <td className="px-3 py-3 text-muted">
                              <div className="text-fg">{l.subject || "–"}</div>
                              {/* Objektbezug direkt in der Anfrage-Zeile (12.08.2026, Wunsch
                                  Alex) — die ID macht das Objekt in OnOffice auffindbar. */}
                              {leadObjekt(l) && <div className="mt-0.5 text-xs text-accent">{leadObjekt(l)}</div>}
                              {l.message ? <div className="mt-0.5 max-w-md text-faint">{l.message}</div> : null}
                            </td>
                            <td className="px-3 py-3">
                              <StatusCell
                                entry={bearbeitung[key]}
                                saving={bearbBusy.has(key)}
                                onStatus={(st) => saveBearbeitung("lead", l.id, { status: st })}
                                onPanel={() => setBearbOpen(open ? null : key)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <OnOfficeButton
                                entry={bearbeitung[key]}
                                busy={onofficeBusy.has(key)}
                                error={onofficeError[key]}
                                onSubmit={() => uebergebeOnOffice("lead", l.id)}
                              />
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t border-border bg-surface/40">
                              <td colSpan={7} className="px-4 py-4">
                                <BearbeitungPanel
                                  entry={bearbeitung[key]}
                                  saving={bearbBusy.has(key)}
                                  error={bearbError[key]}
                                  onSave={(patch) => saveBearbeitung("lead", l.id, patch)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">{filteredLeads.length} von {data.leads.length} Anfragen</p>
          </div>
        )}

        {/* ── Objekte (live aus OnOffice) — sortierbar + aufklappbar ── */}
        {tab === "objekte" && (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted">
              <Icon name="building" size={16} className="text-accent" />
              {objekte.length} Objekte live aus OnOffice
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    <th className="px-3 py-3 font-medium">Bild</th>
                    {(
                      [
                        ["title", "Objekt"],
                        ["city", "Ort"],
                        ["priceValue", "Preis"],
                        ["status", "Status"],
                      ] as [ObjSortKey, string][]
                    ).map(([key, label]) => (
                      <th key={key} className="px-3 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => objSortBy(key)}
                          className="press inline-flex items-center gap-1 hover:text-fg"
                        >
                          {label}
                          <Icon
                            name="chevronDown"
                            size={12}
                            className={`transition-transform ${
                              objSort.key === key
                                ? objSort.dir === "asc"
                                  ? "rotate-180 text-accent"
                                  : "text-accent"
                                : "opacity-30"
                            }`}
                          />
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedObjekte.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted">
                        Keine Objekte geladen.
                      </td>
                    </tr>
                  ) : (
                    sortedObjekte.map((o) => {
                      const st = OBJ_STATUS[o.status] ?? { label: o.status, cls: "border-border text-faint" };
                      const open = objOpen === o.id;
                      return (
                        <Fragment key={o.id}>
                          <tr
                            className="cursor-pointer border-t border-border hover:bg-surface/60"
                            onClick={() => setObjOpen(open ? null : o.id)}
                          >
                            <td className="px-4 py-2">
                              {o.image ? (
                                // eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau, dynamische Fremd-URL, next/image lohnt hier nicht
                                <img src={o.image} alt="" className="h-10 w-14 rounded object-cover" />
                              ) : (
                                <div className="flex h-10 w-14 items-center justify-center rounded bg-surface-2 text-faint">
                                  <Icon name="building" size={14} />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-fg">{o.title}</td>
                            <td className="px-3 py-3 text-muted">{o.city}</td>
                            <td className="whitespace-nowrap px-3 py-3 tabular-nums text-muted">{o.price}</td>
                            <td className="px-3 py-3">
                              <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="px-3 py-3 text-faint">
                              <Icon
                                name="chevronDown"
                                size={16}
                                className={`transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </td>
                          </tr>
                          {open && (
                            <tr className="border-t border-border bg-surface/40">
                              <td colSpan={6} className="px-4 py-4">
                                <div className="flex flex-col gap-4 sm:flex-row">
                                  {o.image && (
                                    // eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau
                                    <img
                                      src={o.image}
                                      alt=""
                                      className="h-32 w-full rounded-lg object-cover sm:w-48"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                                      <ObjDetail label="Art" value={OBJEKTART_LABEL[o.category ?? ""] ?? o.category ?? "–"} />
                                      <ObjDetail label="Vermarktung" value={o.marketingType === "miete" ? "Miete" : "Kauf"} />
                                      <ObjDetail label="Zimmer" value={o.rooms != null ? String(o.rooms) : "–"} />
                                      <ObjDetail label="Wohnfläche" value={o.livingArea != null ? `${o.livingArea} m²` : "–"} />
                                      <ObjDetail label="PLZ / Ort" value={`${o.postcode ?? ""} ${o.city}`.trim()} />
                                      <ObjDetail label="Provision" value={o.provision || "–"} />
                                    </dl>
                                    <a
                                      href={`/immobilien/${o.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                                    >
                                      Objekt öffnen <Icon name="arrowUpRight" size={14} />
                                    </a>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">
              Live aus OnOffice · Spalten sortierbar, Zeile anklicken für Details. Status
              (Verfügbar/Reserviert/Verkauft) wird in OnOffice gepflegt.
            </p>
          </div>
        )}

        {/* ── Medien: Hero-Bild der Startseite per Klick oder Drag & Drop tauschen ── */}
        {tab === "medien" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-fg">Hero-Bild der Startseite</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Bild per Klick aus dem BunnyCDN-Storage auswählen oder eine neue Datei per
                  Drag &amp; Drop hochladen. Die Änderung ist sofort auf der Startseite live.
                </p>
              </div>
              <button
                type="button"
                onClick={loadHeroImages}
                disabled={heroBusy}
                className="press inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-fg hover:border-accent hover:text-accent disabled:opacity-60"
              >
                <Icon name="search" size={15} /> {heroImages ? "Aktualisieren" : "Bilder laden"}
              </button>
            </div>

            {heroError && (
              <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 text-sm text-accent" role="alert">
                {heroError}
              </p>
            )}
            {heroMsg && (
              <p className="rounded-xl border border-border bg-surface px-3 py-3 text-sm text-fg">{heroMsg}</p>
            )}

            {/* Drag & Drop-Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) uploadHeroFile(file);
              }}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <Icon name="layers" size={28} className={dragOver ? "text-accent" : "text-faint"} />
              <p className="text-sm text-muted">
                Bild hierher ziehen — oder{" "}
                <label className="cursor-pointer text-accent hover:underline">
                  Datei auswählen
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadHeroFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </p>
              <p className="text-xs text-faint">JPG, PNG oder WebP · max. 20 MB</p>
              {heroBusy && <p className="text-xs text-accent">Wird verarbeitet …</p>}
            </div>

            {/* Vorhandene Bilder zum Auswählen */}
            {heroImages && (
              <div>
                <div className="mb-3 text-xs uppercase tracking-wide text-faint">
                  Vorhandene Bilder ({heroImages.length}) — anklicken zum Übernehmen
                </div>
                {heroImages.length === 0 ? (
                  <p className="text-sm text-muted">Keine Bilder im Storage gefunden.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {heroImages.map((img) => {
                      const active = img.url === heroCurrent;
                      return (
                        <button
                          key={img.name}
                          type="button"
                          onClick={() => selectHeroImage(img.url)}
                          disabled={heroBusy}
                          className={`group relative aspect-[4/3] overflow-hidden rounded-xl border-2 text-left transition-colors disabled:opacity-60 ${
                            active ? "border-accent" : "border-border hover:border-accent/50"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau, dynamische Fremd-Liste, next/image lohnt hier nicht */}
                          <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-bg/80 px-2 py-1 text-[0.65rem] text-fg">
                            {img.name}
                          </span>
                          {active && (
                            <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                              <Icon name="check" size={13} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Feedback (On-Page-Kommentare von Sissy) ── */}
        {tab === "feedback" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {(
                  [
                    ["all", `Alle (${feedback.length})`],
                    ["open", `Offen (${fbOpenCount})`],
                    ["done", `Erledigt (${feedback.length - fbOpenCount})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFbFilter(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      fbFilter === key
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted hover:border-accent/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Sammel-Prompt: ALLE offenen Tickets in einem Kopiervorgang —
                  eine Claude-Code-Session arbeitet die Liste ab (Wunsch Alex:
                  nicht 10x einzeln kopieren). */}
              {fbOpenCount > 0 && (
                <FeedbackBatchCopy
                  tickets={feedback
                    .filter((f) => (feedbackStatus[f.id]?.status ?? "open") !== "done")
                    .map((f) => ({ pageUrl: f.page_url ?? "/", area: f.area ?? "", comment: f.comment }))}
                />
              )}
            </div>

            {feedback.length === 0 ? (
              <p className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-muted">
                Noch keine Kommentare.
              </p>
            ) : (
              <div className="space-y-3">
                {feedback
                  .filter((f) => {
                    const st = feedbackStatus[f.id]?.status ?? "open";
                    return fbFilter === "all" || (fbFilter === "done" ? st === "done" : st !== "done");
                  })
                  .map((f) => {
                    const entry = feedbackStatus[f.id];
                    const done = entry?.status === "done";
                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl border p-4 transition-colors ${
                          done ? "border-border bg-surface/50" : "border-accent/30 bg-surface"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span
                            className={`rounded-full border px-2 py-0.5 ${
                              done ? "border-border text-faint" : "border-accent/50 text-accent"
                            }`}
                          >
                            {done ? "Erledigt" : "Offen"}
                          </span>
                          <span className="text-faint">{fmtDate(f.created_at)}</span>
                          {f.page_url && (
                            <a
                              href={f.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:underline"
                            >
                              {f.page_url}
                            </a>
                          )}
                        </div>
                        <p
                          className={`mt-2 whitespace-pre-wrap text-sm ${
                            done ? "text-muted" : "text-fg"
                          }`}
                        >
                          {f.comment}
                        </p>
                        {f.area && (
                          <p className="mt-1.5 line-clamp-1 text-xs text-faint" title={f.area}>
                            {f.area}
                          </p>
                        )}
                        {entry?.note && (
                          <p className="mt-1.5 text-xs text-accent">Notiz: {entry.note}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFeedback(f.id, done ? "open" : "done")}
                            disabled={fbBusyId === f.id}
                            className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                          >
                            <Icon name={done ? "close" : "check"} size={13} />
                            {done ? "Wieder öffnen" : "Als erledigt markieren"}
                          </button>
                          <FeedbackTicketActions
                            pageUrl={f.page_url ?? "/"}
                            area={f.area ?? ""}
                            comment={f.comment}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Konten (per Supabase-Auth registrierte Nutzer) ── */}
        {tab === "konten" && (
          <div>
            {/* Intern-Zugänge: feste (per Env/Default) + dynamisch eingeladene
                E-Mail-Freischaltungen fürs /intern-Portal. */}
            <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Icon name="shield" size={16} className="text-accent" /> Intern-Zugänge
              </div>
              <p className="mt-1 text-sm text-muted">
                Wer sich mit einem RIEGEL-Konto unter dieser E-Mail-Adresse anmeldet, kommt direkt ins
                Intern-Portal, ganz ohne Passwort.
              </p>

              {usersError && (
                <p className="mt-3 text-sm text-accent" role="alert">{usersError}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {usersBusy && !usersLoaded ? (
                  <span className="text-sm text-faint">Lädt …</span>
                ) : fixedEmails.length === 0 && invitedEmails.length === 0 ? (
                  <span className="text-sm text-faint">Keine Zugänge geladen.</span>
                ) : (
                  <>
                    {fixedEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg"
                      >
                        {email}
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] text-accent">fest</span>
                      </span>
                    ))}
                    {invitedEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-fg"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeInvited(email)}
                          disabled={removeBusy.has(email)}
                          className="press text-faint transition-colors hover:text-accent disabled:opacity-60"
                        >
                          {removeBusy.has(email) ? "…" : "Zugang entziehen"}
                        </button>
                      </span>
                    ))}
                  </>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteUser();
                }}
                className="mt-5 flex flex-wrap items-center gap-2"
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteResult(null);
                  }}
                  placeholder="E-Mail-Adresse einladen …"
                  aria-label="E-Mail-Adresse einladen"
                  className="min-w-[240px] flex-1 rounded-full border border-border bg-bg px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={inviteBusy || !inviteEmail.trim()}
                  className="press inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {inviteBusy ? "Sendet …" : "Einladen und Mail senden"}
                </button>
              </form>
              {inviteResult && (
                <p className={`mt-2 text-sm ${inviteResult.ok ? "text-fg" : "text-accent"}`} role="status">
                  {inviteResult.ok
                    ? inviteResult.mailError
                      ? "Zugang freigeschaltet, Mail konnte nicht gesendet werden."
                      : "Zugang freigeschaltet und Einladungs-Mail verschickt."
                    : inviteResult.error || "Fehler beim Einladen."}
                </p>
              )}
            </div>

            {/* Einordnung in Worten, nicht nur als Badge. Ohne diesen Satz sah
                eine unbekannte Adresse in dieser Tabelle kurzzeitig wie ein
                fremder Admin-Zugang aus, obwohl es ein normales Kundenkonto war. */}
            <p className="mt-8 text-sm text-muted">
              Hier stehen <strong className="text-fg">alle registrierten Konten</strong>, ganz
              überwiegend Kundschaft. Ein Konto allein gibt{" "}
              <strong className="text-fg">keinen Zugang zum Intern-Portal</strong>: damit gehen
              nur Merkliste, gespeicherte Suchen und Suchaufträge. Ins Intern-Portal kommt
              ausschließlich, wer oben unter „Intern-Zugänge“ steht, erkennbar an der Rolle{" "}
              <span className="whitespace-nowrap rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent">
                Intern
              </span>
              .
            </p>

            <Toolbar query={aQuery} setQuery={setAQuery} placeholder="E-Mail …" />

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-faint">
                  <tr>
                    {["E-Mail", "Rolle", "Registriert", "Letzter Login", "Bestätigt", ""].map((h) => (
                      <th key={h} className="px-3 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Keine Konten.</td></tr>
                  ) : (
                    filteredAccounts.map((a) => {
                      const confirmed = Boolean(a.email_confirmed_at);
                      const emailLower = a.email?.toLowerCase();
                      const isFixed = Boolean(emailLower && fixedEmails.includes(emailLower));
                      // Rolle des Kontos. Anlass: In dieser Tabelle stehen ALLE
                      // registrierten Konten, also ganz ueberwiegend Kundschaft
                      // mit Merkliste und Suchauftraegen. Weil das nicht
                      // erkennbar war, sah eine unbekannte Adresse hier kurz wie
                      // ein fremder Admin-Zugang aus. Die Spalte macht auf einen
                      // Blick klar, wer tatsaechlich ins Intern-Portal kommt.
                      const isInvited = Boolean(emailLower && invitedEmails.includes(emailLower));
                      const rolle = isFixed
                        ? { text: "INTERN · FEST", stark: true }
                        : isInvited
                          ? { text: "INTERN", stark: true }
                          : { text: "KUNDE", stark: false };
                      const armed = deleteArm === a.id;
                      const busy = deleteBusy.has(a.id);
                      return (
                        <tr key={a.id} className="border-t border-border align-top hover:bg-surface/60">
                          <td className="px-3 py-3">
                            {a.email ? (
                              <a href={`mailto:${a.email}`} className="text-accent hover:underline">{a.email}</a>
                            ) : (
                              <span className="text-faint">ohne E-Mail</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${
                                rolle.stark
                                  ? "border-accent/50 bg-accent/10 text-accent"
                                  : "border-border text-faint"
                              }`}
                              title={
                                rolle.stark
                                  ? "Kommt ins Intern-Portal."
                                  : "Normales Kundenkonto: nur Merkliste, gespeicherte Suchen und Suchauftraege. Kein Zugang zum Intern-Portal."
                              }
                            >
                              {rolle.text}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">
                            {a.created_at ? fmtDate(a.created_at) : "–"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-muted">
                            {a.last_sign_in_at ? fmtDate(a.last_sign_in_at) : "–"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                confirmed ? "border-accent/40 text-accent" : "border-border text-faint"
                              }`}
                            >
                              {confirmed ? "Ja" : "Nein"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => deleteAccount(a.id, a.email)}
                              disabled={isFixed || busy}
                              title={isFixed ? "Fester Zugang, kann hier nicht gelöscht werden." : undefined}
                              className={`press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                                armed
                                  ? "border-accent bg-accent/10 text-accent"
                                  : "border-border text-fg hover:border-accent hover:text-accent"
                              }`}
                            >
                              <Icon name="close" size={13} />
                              {busy ? "…" : armed ? "Wirklich löschen?" : "Löschen"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">{filteredAccounts.length} von {accounts.length} Konten</p>
          </div>
        )}
      </Container>
      {akte && <AktePanel akte={akte} onClose={closeAkte} />}
    </section>
  );
}

/* ─────────────── Conversion-Tab: Funnel, Heatmap, Sparkline ───────────────
 * Alle Bausteine arbeiten auf den fertig aggregierten Zahlen aus
 * /api/intern/conversion — hier wird nur noch gezeichnet. */

/** Prozentwert deutsch (Komma, ohne überflüssige „,0"). */
const fmtPctDe = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/**
 * Funnel als horizontale Balken. Die Balkenlänge ist der Anteil an den
 * Rechner-Starts; markiert wird die Stufe mit der SCHLECHTESTEN Konversion
 * gegenüber ihrer Vorstufe — genau dort liegt der Hebel für „mehr Leute, die
 * das PDF holen".
 */
function ConversionFunnel({ funnel }: { funnel: ConvStufe[] }) {
  const schwaechste = useMemo(() => {
    let idx = -1;
    let min = Infinity;
    funnel.forEach((s, i) => {
      // Nur Stufen mit echter Vorstufe UND echtem Absprung (< 100 %) zählen —
      // sonst markiert die Anzeige bei perfektem Durchlauf willkürlich etwas.
      if (s.konversion != null && s.konversion < 100 && s.konversion < min) {
        min = s.konversion;
        idx = i;
      }
    });
    return idx;
  }, [funnel]);

  return (
    <div className="space-y-2">
      {funnel.map((s, i) => {
        const drop = i === schwaechste;
        return (
          <div
            key={s.key}
            className={`rounded-xl border px-3.5 py-3 transition-colors ${
              drop ? "border-[#f87171]/40 bg-[#f87171]/5" : "border-border bg-surface"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-fg">{s.label}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted">
                <span className="font-medium text-fg">{s.n}</span> · {fmtPctDe(s.pctVomStart)} %
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              {/* Mindestbreite 1,5 %, damit eine Stufe mit wenigen Treffern
                  sichtbar bleibt statt als „nichts" zu erscheinen. */}
              <div
                className={`h-full rounded-full ${drop ? "bg-[#f87171]" : "bg-accent"}`}
                style={{
                  width: `${s.n > 0 ? Math.max(1.5, s.pctVomStart) : 0}%`,
                  transition: "width var(--duration-slow) var(--ease-smooth-out)",
                }}
              />
            </div>
            {s.konversion != null && (
              <p className={`mt-1.5 text-xs ${drop ? "text-[#f87171]" : "text-faint"}`}>
                {drop ? "Größter Absprung — " : ""}
                {fmtPctDe(s.konversion)} % kommen von „{funnel[i - 1]?.label}&ldquo; hierher
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Kachel „Wie wird das PDF-Formular geöffnet?" — CTA unter dem Ergebnis vs.
 * Badge am Wertkorridor. Sagt Alex, welcher Einstieg das PDF wirklich zieht.
 */
function QuellenKachel({ quelle }: { quelle: { cta: number; badge: number } }) {
  const summe = quelle.cta + quelle.badge;
  const ctaPct = summe > 0 ? Math.round((quelle.cta / summe) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
        <Icon name="sparkle" size={15} className="text-muted" /> Formular geöffnet über
      </div>
      {summe === 0 ? (
        <div className="mt-3 text-sm text-muted">Noch keine Öffnungen im Zeitraum.</div>
      ) : (
        <>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent"
              style={{ width: `${ctaPct}%`, transition: "width var(--duration-slow) var(--ease-smooth-out)" }}
            />
            <div className="h-full flex-1 bg-accent/30" />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-accent">CTA {quelle.cta} · {ctaPct} %</span>
            <span className="text-muted">Badge {quelle.badge} · {100 - ctaPct} %</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Klick-Heatmap als 20×20-CSS-Raster über die gesamte Seite (x = Breite,
 * y = Scrolltiefe). Die Rohdaten liegen als 5 %-Buckets 0–100 vor, das sind
 * 21 Werte je Achse — der 100 %-Rand fällt bewusst mit der 95 %-Zelle
 * zusammen, damit ein sauberes 20×20-Raster entsteht (Randklicks sind ohnehin
 * dieselbe Region).
 */
function KlickHeatmap({
  punkte,
  limitErreicht,
}: {
  punkte: { x: number; y: number; n: number; bereich: string }[];
  limitErreicht: boolean;
}) {
  const RASTER = 20;
  const zellen = useMemo(() => {
    const map = new Map<number, { n: number; bereich: string }>();
    for (const p of punkte) {
      const cx = Math.min(RASTER - 1, Math.max(0, Math.floor(p.x / 5)));
      const cy = Math.min(RASTER - 1, Math.max(0, Math.floor(p.y / 5)));
      const idx = cy * RASTER + cx;
      const cur = map.get(idx);
      // Bei Kollision (100 % faltet auf 95 %) Klicks addieren und den Bereich
      // des größeren Anteils behalten.
      if (!cur) map.set(idx, { n: p.n, bereich: p.bereich });
      else map.set(idx, { n: cur.n + p.n, bereich: p.n > cur.n ? p.bereich : cur.bereich });
    }
    return map;
  }, [punkte]);

  const max = Math.max(1, ...[...zellen.values()].map((z) => z.n));
  const gesamt = [...zellen.values()].reduce((a, z) => a + z.n, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between text-xs text-faint">
        <span>← Seitenbreite →</span>
        <span className="tabular-nums">{gesamt} Klicks</span>
      </div>
      <div className="flex gap-2">
        <div className="flex w-4 shrink-0 flex-col justify-between py-0.5 text-[0.6rem] leading-none text-faint">
          <span>oben</span>
          <span className="[writing-mode:vertical-rl]">Scrolltiefe</span>
          <span>unten</span>
        </div>
        <div
          className="grid flex-1 gap-px"
          style={{ gridTemplateColumns: `repeat(${RASTER}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: RASTER * RASTER }, (_, i) => {
            const z = zellen.get(i);
            if (!z) return <div key={i} className="aspect-square rounded-[2px] bg-surface-2/50" />;
            const x = (i % RASTER) * 5;
            const y = Math.floor(i / RASTER) * 5;
            // Wurzel-Skala: sonst verschluckt ein einzelner Hotspot (z. B. der
            // „Weiter"-Button) alle übrigen Zellen optisch komplett.
            const dichte = 0.12 + 0.88 * Math.sqrt(z.n / max);
            return (
              <div
                key={i}
                title={`${x}–${x + 5} % Breite · ${y}–${y + 5} % Tiefe · ${z.n} Klick${
                  z.n === 1 ? "" : "s"
                } · ${z.bereich}`}
                className="aspect-square rounded-[2px] bg-accent"
                style={{ opacity: dichte, transition: "opacity var(--duration-fast) var(--ease-smooth-out)" }}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
        <span className="inline-flex items-center gap-2">
          wenig
          <span className="h-2 w-24 rounded-full bg-gradient-to-r from-accent/10 to-accent" />
          viel (max. {max} Klicks je Feld)
        </span>
        <span>Zelle anfahren für Details</span>
      </div>
      {limitErreicht && (
        <p className="mt-2 text-xs text-faint">
          Hinweis: Es werden die neuesten 20.000 Klicks des Zeitraums ausgewertet.
        </p>
      )}
    </div>
  );
}

/** Meistgeklickte Seitenbereiche (data-track-bereich) als Balkenliste. */
function TopBereiche({ bereiche }: { bereiche: { bereich: string; n: number }[] }) {
  if (bereiche.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
        Noch keine Klicks erfasst.
      </p>
    );
  }
  const max = Math.max(...bereiche.map((b) => b.n));
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      {bereiche.map((b) => (
        <div key={b.bereich}>
          <div className="flex justify-between text-xs">
            <span className="truncate text-fg">{b.bereich}</span>
            <span className="shrink-0 tabular-nums text-faint">{b.n}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width: `${(b.n / max) * 100}%`,
                transition: "width var(--duration-slow) var(--ease-smooth-out)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Tages-Sparkline der PDF-Anforderungen. Optik und Draw-in-Technik bewusst
 * identisch zur Preis-Sparkline im Preisatlas (components/preisatlas/
 * markt-panel.tsx): Polyline auf var(--color-accent), dasharray/-offset auf
 * die reale Pfadlänge, Reflow zwischen Setzen und Animieren.
 */
function PdfSparkline({ serie }: { serie: { tag: string; n: number }[] }) {
  const lineRef = useRef<SVGPolylineElement>(null);
  const summe = serie.reduce((a, p) => a + p.n, 0);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = Math.ceil(line.getTotalLength()) + 1;
    line.style.transition = "none";
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
    void line.getBoundingClientRect(); // Reflow erzwingen, sonst spielt die Animation nicht neu
    line.style.transition = reduce ? "none" : "stroke-dashoffset var(--duration-very-slow) var(--ease-smooth-out)";
    line.style.strokeDashoffset = "0";
  }, [serie]);

  if (serie.length < 2) {
    return (
      <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
        Zu wenig Tage für eine Kurve.
      </p>
    );
  }

  const W = 240;
  const H = 60;
  const PAD = 5;
  const max = Math.max(1, ...serie.map((p) => p.n));
  const coords = serie.map((p, i) => {
    const x = PAD + (i / (serie.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - p.n / max) * (H - PAD * 2);
    return [x, y] as const;
  });
  const pointsAttr = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-faint">PDF angefordert</span>
        <span key={summe} className="t-num-d text-sm font-semibold tabular-nums text-fg">
          {summe}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-16 w-full overflow-visible" aria-hidden>
        <polyline
          ref={lineRef}
          points={pointsAttr}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r={3} fill="var(--color-accent)" />
      </svg>
      <div className="mt-1 flex justify-between text-[0.65rem] text-faint">
        <span>{fmtWvDate(serie[0].tag)}</span>
        <span>Spitze: {max}/Tag</span>
        <span>{fmtWvDate(serie[serie.length - 1].tag)}</span>
      </div>
    </div>
  );
}

/**
 * Aktions-Buttons je Feedback-Ticket (Wunsch Alex: Sissys Korrekturen direkt
 * aus dem Board heraus anstoßen):
 * - „Stelle ansehen": öffnet die Live-Seite mit dem ?fb=-Deep-Link — scrollt
 *   zur kommentierten Stelle, markiert sie (Outline + Klickpunkt-Pin) und
 *   zeigt den Kommentar. Der Locator wird aus dem gespeicherten area-String
 *   rekonstruiert (parseFeedbackArea).
 * - „Prompt kopieren": legt den fertigen Umsetzungs-Prompt für Claude Code in
 *   die Zwischenablage — einfügen, Enter, Claude setzt die Änderung um.
 */
function FeedbackTicketActions({
  pageUrl,
  area,
  comment,
}: {
  pageUrl: string;
  area: string;
  comment: string;
}) {
  const [copied, setCopied] = useState(false);
  const parsed = area ? parseFeedbackArea(area) : null;
  const loc = {
    t: parsed?.t ?? "",
    p: parsed?.p ?? "",
    x: parsed?.x ?? 50,
    y: parsed?.y ?? 0,
    c: comment,
  };

  const viewHref = (() => {
    if (!parsed) return null;
    const fb = encodeFeedbackLocator({ y: loc.y, x: loc.x, text: loc.t, path: loc.p, comment });
    const sep = pageUrl.includes("?") ? "&" : "?";
    return `${pageUrl}${sep}${FEEDBACK_PARAM}=${fb}`;
  })();

  const copyPrompt = async () => {
    const prompt = buildFeedbackPrompt(pageUrl, loc);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blockiert (ältere Browser): unsichtbares Textarea-Fallback.
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        /* aufgeben */
      }
      ta.remove();
    }
  };

  return (
    <>
      {viewHref && (
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-fg transition-colors hover:border-accent hover:text-accent"
        >
          <Icon name="pin" size={13} />
          Stelle ansehen
        </a>
      )}
      <button
        type="button"
        onClick={copyPrompt}
        className="press inline-flex items-center gap-1.5 rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent hover:text-on-accent"
      >
        <Icon name={copied ? "check" : "doc"} size={13} />
        {copied ? "Prompt kopiert" : "Prompt für Claude Code kopieren"}
      </button>
    </>
  );
}

/**
 * Sammel-Kopier-Button für den Feedback-Tab: legt ALLE offenen Tickets als
 * einen einzigen Umsetzungs-Prompt in die Zwischenablage (s.
 * buildFeedbackBatchPrompt) — einmal in Claude Code einfügen statt jedes
 * Ticket einzeln zu kopieren; eine Session arbeitet die Liste ab.
 */
function FeedbackBatchCopy({
  tickets,
}: {
  tickets: { pageUrl: string; area: string; comment: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const prompt = buildFeedbackBatchPrompt(tickets);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        /* aufgeben */
      }
      ta.remove();
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-on-accent transition-colors hover:bg-accent-hover"
    >
      <Icon name={copied ? "check" : "doc"} size={13} />
      {copied ? "Sammel-Prompt kopiert" : `Alle offenen als Prompt kopieren (${tickets.length})`}
    </button>
  );
}

/**
 * Status-Badge je Report-/Anfragen-Zeile (Reports- und Anfragen-Tab), zugleich
 * der Aufklapp-Auslöser für die BearbeitungPanel-Detailzeile. Zeigt zusätzlich
 * das Wiedervorlage-Datum, falls gesetzt, damit man es nicht extra aufklappen muss.
 */
/**
 * Status als echtes Dropdown (transitions-dev 05, .t-dropdown in globals.css):
 * ein Klick setzt den Status direkt, der letzte Menuepunkt oeffnet das
 * Notiz-/Wiedervorlage-Panel. Das Menue haengt per position:fixed am Button,
 * weil die Tabellen in einem overflow-x-auto-Rahmen stehen und ein absolut
 * positioniertes Menue an dessen Kante abgeschnitten wuerde (der urspruengliche
 * Layout-Bruch dieser Spalte). Scroll oder Resize schliessen es deshalb.
 */
function StatusCell({
  entry,
  saving,
  onStatus,
  onPanel,
}: {
  entry?: LeadBearbeitungMap[string];
  saving: boolean;
  onStatus: (s: LeadStatus) => void;
  onPanel: () => void;
}) {
  const status = entry?.status ?? "neu";
  const meta = STATUS_META[status];
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; oben: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const schliesse = () => {
    if (!open) return;
    setOpen(false);
    setClosing(true);
    // Dauer aus dem Motion-Token, damit CSS und Cleanup nie auseinanderlaufen.
    const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-quick")) || 150;
    window.setTimeout(() => setClosing(false), dur);
  };

  useEffect(() => {
    if (!open) return;
    const klick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) schliesse();
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliesse();
    };
    const weg = () => schliesse();
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    // capture: faengt auch das Scrollen des overflow-x-Tabellenrahmens.
    window.addEventListener("scroll", weg, { capture: true, passive: true });
    window.addEventListener("resize", weg);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
      window.removeEventListener("scroll", weg, { capture: true });
      window.removeEventListener("resize", weg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function oeffne() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Nach oben klappen, wenn unten keine ~240px mehr frei sind.
    const nachOben = window.innerHeight - r.bottom < 240;
    setPos({ left: Math.round(r.left), top: Math.round(nachOben ? r.top - 6 : r.bottom + 6), oben: nachOben });
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={saving}
        onClick={() => (open ? schliesse() : oeffne())}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`press inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${meta.cls} ${saving ? "opacity-60" : ""}`}
      >
        <Icon name={meta.icon} size={12} />
        {STATUS_LABELS[status]}
        <Icon name="chevronDown" size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {entry?.wiedervorlage && (
        <div className="mt-1 text-[0.65rem] text-faint">WV: {fmtWvDate(entry.wiedervorlage)}</div>
      )}
      {(open || closing) && pos && (
        <div
          role="menu"
          data-origin="top-left"
          style={{ position: "fixed", left: pos.left, top: pos.top, transform: pos.oben ? "translateY(-100%)" : undefined }}
          className={`t-dropdown z-50 w-52 rounded-xl border border-border bg-surface p-1 shadow-2xl shadow-black/40 ${open ? "is-open" : ""} ${closing ? "is-closing" : ""}`}
        >
          {LEAD_STATUS_VALUES.map((s) => {
            const m = STATUS_META[s];
            const aktiv = s === status;
            return (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={aktiv}
                onClick={() => {
                  schliesse();
                  if (!aktiv) onStatus(s);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-surface-2 ${aktiv ? "bg-surface-2" : ""}`}
              >
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${m.cls}`}>
                  <Icon name={m.icon} size={11} />
                </span>
                <span className="flex-1 text-fg">{STATUS_LABELS[s]}</span>
                {aktiv && <Icon name="check" size={12} className="text-accent-strong" />}
              </button>
            );
          })}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              schliesse();
              onPanel();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="doc" size={13} />
            Notiz &amp; Wiedervorlage
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Aufklappbare Detailzeile für Reports/Anfragen: Status-Auswahl, Notizfeld,
 * Wiedervorlage-Datum, Speichern. Eigener Entwurfs-State (nur beim erneuten
 * Öffnen aus `entry` neu befüllt, s. bedingtes Rendern in den Tabellen oben),
 * damit Tippen im Notizfeld nicht bei jedem Tastendruck speichert.
 */
function BearbeitungPanel({
  entry,
  saving,
  error,
  onSave,
}: {
  entry?: LeadBearbeitungMap[string];
  saving: boolean;
  error?: string;
  onSave: (patch: { status: LeadStatus; notiz: string | null; wiedervorlage: string | null }) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(entry?.status ?? "neu");
  const [notiz, setNotiz] = useState(entry?.notiz ?? "");
  const [wiedervorlage, setWiedervorlage] = useState(entry?.wiedervorlage ?? "");

  return (
    <div className="cockpit-auf grid gap-4 sm:grid-cols-[minmax(140px,1fr)_minmax(0,2fr)_minmax(140px,1fr)_auto]">
      <div>
        <label className="mb-1 block text-xs text-faint">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          aria-label="Status"
          className="w-full appearance-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-accent"
        >
          {LEAD_STATUS_VALUES.map((s) => (
            <option key={s} value={s} className="bg-surface text-fg">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-faint">Notiz</label>
        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          rows={2}
          placeholder="Interne Notiz …"
          className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-faint">Wiedervorlage</label>
        <input
          type="date"
          value={wiedervorlage ?? ""}
          onChange={(e) => setWiedervorlage(e.target.value)}
          aria-label="Wiedervorlage-Datum"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-accent"
        />
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={() =>
            onSave({
              status,
              notiz: notiz.trim() ? notiz.trim() : null,
              wiedervorlage: wiedervorlage || null,
            })
          }
          disabled={saving}
          className="press inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <Icon name="check" size={14} />
          {saving ? "Speichert …" : "Speichern"}
        </button>
      </div>
      {error && <p className="text-xs text-accent sm:col-span-4" role="alert">{error}</p>}
    </div>
  );
}

/**
 * Kontakt-Akte als Seitenpanel: öffnet bei Klick auf eine E-Mail-Adresse in
 * Reports/Anfragen (s. openAkte). Zeigt Konto-Status, einen Dubletten-Hinweis
 * bei mehreren Bewertungen derselben Adresse sowie die chronologische
 * Ereignisliste aus /api/intern/akte (Bewertungen, Anfragen, Merkliste,
 * Suchaufträge).
 */
function AktePanel({ akte, onClose }: { akte: AkteState; onClose: () => void }) {
  const bewertungenCount = akte.ereignisse.filter((e) => e.typ === "bewertung").length;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-bg p-6 shadow-2xl sm:max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-faint">
              <Icon name="users" size={14} className="text-accent" /> Kontakt-Akte
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-fg">{akte.email}</h2>
            <a
              href={`mailto:${akte.email}`}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <Icon name="mail" size={13} /> Mail schreiben
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Akte schließen"
            className="press shrink-0 rounded-full border border-border p-2 text-faint transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {akte.busy ? (
          <p className="mt-8 text-center text-sm text-muted">Lädt …</p>
        ) : akte.error ? (
          <p className="mt-8 rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 text-sm text-accent" role="alert">
            {akte.error}
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xs uppercase tracking-wide text-faint">Konto-Status</div>
                <div className="mt-1.5 text-sm text-fg">
                  {akte.konto?.existiert
                    ? akte.konto.bestaetigt
                      ? "Registriert, bestätigt"
                      : "Registriert, unbestätigt"
                    : "Kein RIEGEL-Konto"}
                </div>
                {akte.konto?.letzterLogin && (
                  <div className="mt-1 text-xs text-faint">Letzter Login {fmtDate(akte.konto.letzterLogin)}</div>
                )}
              </div>
              {bewertungenCount > 1 && (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-accent">
                    <Icon name="sparkle" size={13} /> Dubletten-Hinweis
                  </div>
                  <div className="mt-1.5 text-sm text-fg">{bewertungenCount} Bewertungen dieser Adresse</div>
                </div>
              )}
            </div>

            <h3 className="mt-7 text-sm font-semibold text-muted">Ereignisse</h3>
            {akte.ereignisse.length === 0 ? (
              <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
                Keine Ereignisse gefunden.
              </p>
            ) : (
              <ol className="mt-3 space-y-3 border-l border-border pl-4">
                {akte.ereignisse.map((e, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[1.4rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-faint">
                      <Icon name={AKTE_TYP_ICON[e.typ]} size={11} />
                    </span>
                    <div className="flex items-center gap-2 text-xs text-faint">
                      <span>{fmtDate(e.datum)}</span>
                      <span className="rounded-full border border-border px-1.5 py-0.5">{AKTE_TYP_LABEL[e.typ]}</span>
                    </div>
                    <div className="mt-1 text-sm text-fg">{e.titel}</div>
                    <div className="mt-0.5 text-xs text-muted">{e.details}</div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}

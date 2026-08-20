import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";

/**
 * Auswertung des Rechner-Conversion-Trackings für den /intern-Tab
 * „Conversion" (18.08.2026, Auftrag Alex). Liest public.rechner_events über
 * den service_role-Key (umgeht RLS) — NUR nach Zugangsprüfung, exakt wie die
 * übrigen /api/intern-Routen (Passwort ODER freigeschaltete E-Mail).
 *
 * WARUM DIE AGGREGATION HIER IN JS LÄUFT (bewusste Entscheidung):
 * PostgREST kann weder COUNT(DISTINCT …) noch GROUP BY ohne eine eigene
 * SQL-Funktion/View. Beides hätte ein zusätzliches, versioniertes DB-Objekt
 * bedeutet, das Alex bei JEDEM White-Label-Klon mit einspielen muss — für
 * eine Route, die alle paar Tage einmal geöffnet wird. Die Datenmenge ist
 * dafür klein genug: Funnel-Events sind bereits clientseitig je Seitenaufruf
 * dedupliziert (track.ts), also ≤ 8 Zeilen pro Rechner-Session; Klicks holen
 * wir gedeckelt (KLICK_LIMIT) als „die letzten N". Wird der Rechner irgendwann
 * so stark genutzt, dass der Deckel greift, ist eine materialisierte
 * Tages-Aggregat-View der nächste Schritt (Notiz im Rechner-Masterplan).
 */

/** Funnel-Stufen in Reihenfolge; `key` ist der Schlüssel in der Antwort. */
const STUFEN: { key: string; event: string; step?: number; label: string }[] = [
  { key: "start", event: "rechner_start", label: "Rechner gestartet" },
  { key: "step1", event: "rechner_step", step: 1, label: "Schritt 1 · Objekt" },
  { key: "step2", event: "rechner_step", step: 2, label: "Schritt 2 · Details" },
  { key: "step3", event: "rechner_step", step: 3, label: "Schritt 3 · Zustand" },
  { key: "analyse", event: "rechner_analyse", label: "Analyse gestartet" },
  { key: "ergebnis", event: "rechner_ergebnis", label: "Ergebnis gesehen" },
  { key: "formular", event: "report_form_geoeffnet", label: "PDF-Formular geöffnet" },
  { key: "pdf", event: "report_angefordert", label: "PDF angefordert" },
];

/** Deckel für die Klick-Rohdaten der Heatmap (neueste zuerst). */
const KLICK_LIMIT = 20_000;
/** Auflösung der Klick-Koordinaten: 0…200 = 0,5-%-Buckets. Muss zu
 *  KLICK_STUFEN in src/lib/track.ts passen (dort wird gerundet). */
const KLICK_STUFEN = 200;
/** Deckel für die Funnel-Rohdaten im Zeitraum. */
const FUNNEL_LIMIT = 50_000;

/** YYYY-MM-DD in Europe/Berlin — die Tagesserie soll sich an Sissys Kalender
 *  orientieren, nicht an UTC (sonst wandern Abend-Anfragen auf den Folgetag). */
function tagBerlin(iso: string): string {
  // sv-SE liefert das ISO-Format YYYY-MM-DD ohne eigenes Zusammenbauen.
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-conversion:${clientIp(req)}`, 60, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche — bitte später erneut." },
      { status: 429 },
    );
  }

  let b: { password?: string; accessToken?: string; zeitraum?: number | string; action?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern-conversion] Supabase-Env fehlt (URL/SERVICE_ROLE).");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Daten-Reset (Betreiber-Wunsch 18.08.2026: nach Testklicks/Demo-Läufen
  // "nur reale Zahlen" sehen). Bewusst KEIN Backup vor dem Löschen — die
  // Tabelle enthält ausschließlich anonyme Zähldaten (keine Personenbezüge,
  // s. Kommentar am ConvData-Typ im Dashboard), und der ganze Sinn des Resets
  // ist ein sauberer Messstart. Zuerst zählen (für die Erfolgsmeldung im
  // Dashboard), dann löschen — Supabase verlangt bei delete() einen Filter,
  // ".not('id','is',null)" trifft daher jede Zeile.
  if (b.action === "reset") {
    const { count, error: countError } = await admin
      .from("rechner_events")
      .select("id", { count: "exact", head: true });
    if (countError) {
      // Tabelle fehlt vermutlich noch (Migration nicht eingespielt) — das ist
      // hier kein Fehlerfall, es gibt schlicht nichts zu löschen.
      return NextResponse.json({ ok: true, geloescht: 0 });
    }
    const { error: delError } = await admin.from("rechner_events").delete().not("id", "is", null);
    if (delError) {
      console.error("[intern-conversion] Reset fehlgeschlagen:", delError.message);
      return NextResponse.json({ ok: false, error: "Zurücksetzen fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, geloescht: count ?? 0 });
  }

  // Nur 7 oder 30 Tage — alles andere fällt auf 7 zurück (kein freier
  // Zeitraum, damit die Abfrage berechenbar klein bleibt).
  const tage = Number(b.zeitraum) === 30 ? 30 : 7;
  const seit = new Date(Date.now() - tage * 86_400_000).toISOString();

  const [funnelRes, klickRes] = await Promise.all([
    // Alles außer Klicks in einem Rutsch — inklusive created_at für die
    // Tagesserie der PDF-Anforderungen (spart eine dritte Abfrage).
    admin
      .from("rechner_events")
      .select("event, step, quelle, pageload_id, created_at")
      .neq("event", "rechner_klick")
      .gte("created_at", seit)
      .order("created_at", { ascending: false })
      .limit(FUNNEL_LIMIT),
    admin
      .from("rechner_events")
      .select("x_pct, y_pct, bereich, ansicht, geraet")
      .eq("event", "rechner_klick")
      .gte("created_at", seit)
      .order("created_at", { ascending: false })
      .limit(KLICK_LIMIT),
  ]);

  // Fehlt die Tabelle noch (Migration nicht eingespielt), ist das KEIN Fehler,
  // sondern der Normalzustand direkt nach dem Deploy: leere Auswertung + Flag,
  // damit das Dashboard den erklärenden Leerzustand zeigen kann.
  if (funnelRes.error || klickRes.error) {
    const msg = funnelRes.error?.message || klickRes.error?.message || "";
    console.error("[intern-conversion] DB-Fehler:", msg);
    return NextResponse.json({
      ok: true,
      zeitraum: tage,
      gesamt: 0,
      tabelleFehlt: true,
      funnel: STUFEN.map((s) => ({ key: s.key, label: s.label, n: 0, pctVomStart: 0, konversion: null })),
      pdfQuote: 0,
      quelle: { cta: 0, badge: 0 },
      heatmap: [],
      ansichten: [],
      stufen: KLICK_STUFEN,
      bereiche: [],
      serie: [],
      klickLimitErreicht: false,
    });
  }

  const funnelRows = funnelRes.data ?? [];
  const klickRows = klickRes.data ?? [];

  // ── Funnel: je Stufe die DISTINCT pageload_id zählen. Der Client
  // dedupliziert bereits je Seitenaufruf, das Set ist die Absicherung gegen
  // Doppel-Beacons (sendBeacon + fetch-Fallback können sich überschneiden).
  const proStufe = new Map<string, Set<string>>();
  for (const s of STUFEN) proStufe.set(s.key, new Set<string>());
  const quelleZaehler = { cta: 0, badge: 0 };
  const pdfProTag = new Map<string, number>();

  for (const row of funnelRows) {
    const pid = String(row.pageload_id ?? "");
    if (!pid) continue;
    const stufe = STUFEN.find(
      (s) => s.event === row.event && (s.step === undefined || s.step === Number(row.step)),
    );
    if (stufe) proStufe.get(stufe.key)?.add(pid);

    if (row.event === "report_form_geoeffnet") {
      if (row.quelle === "cta") quelleZaehler.cta += 1;
      else if (row.quelle === "badge") quelleZaehler.badge += 1;
    }
    if (row.event === "report_angefordert" && row.created_at) {
      const tag = tagBerlin(String(row.created_at));
      pdfProTag.set(tag, (pdfProTag.get(tag) ?? 0) + 1);
    }
  }

  const startN = proStufe.get("start")?.size ?? 0;
  const funnel = STUFEN.map((s, i) => {
    const n = proStufe.get(s.key)?.size ?? 0;
    const vorher = i === 0 ? null : (proStufe.get(STUFEN[i - 1].key)?.size ?? 0);
    return {
      key: s.key,
      label: s.label,
      n,
      // Anteil am Start — der Balken im Dashboard.
      pctVomStart: startN > 0 ? Math.round((n / startN) * 1000) / 10 : 0,
      // Konversion gegenüber der VORHERIGEN Stufe; null bei der ersten Stufe
      // und wenn die vorherige Stufe leer ist (0/0 ist keine Aussage).
      konversion: vorher && vorher > 0 ? Math.round((n / vorher) * 1000) / 10 : null,
    };
  });

  const pdfN = proStufe.get("pdf")?.size ?? 0;
  const pdfQuote = startN > 0 ? Math.round((pdfN / startN) * 1000) / 10 : 0;

  // ── Heatmap: Klicks je (Ansicht, Gerät, x_pct, y_pct)-Bucket, dazu der
  // dominante Bereich (häufigster Bereichs-Slug) für den Tooltip.
  //
  // Ansicht UND Gerät gehören in den Schlüssel, nicht nur x/y: y_pct ist
  // relativ zur Dokumenthöhe, und die unterscheidet sich zwischen Schritt 1
  // und Ergebnisseite um ein Vielfaches — ohne die Trennung liegen die
  // Klicks auf demselben Bild übereinander (Betreiber-Feedback 20.08.2026).
  // Die Aggregation hier statt roher Punkte hält die Antwort klein: 20.000
  // Klicks fallen auf höchstens die Zahl der tatsächlich getroffenen Buckets
  // zusammen, und das Dashboard filtert lokal ohne neuen Request.
  interface Zelle {
    x: number;
    y: number;
    ansicht: string;
    geraet: string;
    n: number;
    bereiche: Map<string, number>;
  }
  const zellen = new Map<string, Zelle>();
  const bereichZaehler = new Map<string, number>();
  const ansichtZaehler = new Map<string, number>();
  for (const row of klickRows) {
    const x = Number(row.x_pct);
    const y = Number(row.y_pct);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    // Altdaten vor dem 20.08.2026 haben weder Ansicht noch Gerät (s. Migration
    // 20260820120000): sie laufen als "alt"/"unbekannt" mit, statt eine
    // Zuordnung zu erfinden, die es nie gab.
    const ansicht = String(row.ansicht ?? "alt");
    const geraet = String(row.geraet ?? "unbekannt");
    const key = `${ansicht}|${geraet}|${x}:${y}`;
    const zelle = zellen.get(key) ?? { x, y, ansicht, geraet, n: 0, bereiche: new Map<string, number>() };
    zelle.n += 1;
    const bereich = String(row.bereich ?? "seite");
    zelle.bereiche.set(bereich, (zelle.bereiche.get(bereich) ?? 0) + 1);
    zellen.set(key, zelle);
    bereichZaehler.set(bereich, (bereichZaehler.get(bereich) ?? 0) + 1);
    ansichtZaehler.set(ansicht, (ansichtZaehler.get(ansicht) ?? 0) + 1);
  }

  const heatmap = [...zellen.values()].map((z) => {
    let top = "seite";
    let topN = -1;
    for (const [name, n] of z.bereiche) {
      if (n > topN) {
        top = name;
        topN = n;
      }
    }
    return { x: z.x, y: z.y, n: z.n, bereich: top, ansicht: z.ansicht, geraet: z.geraet };
  });

  // Wie viele Klicks je Ansicht — das Dashboard baut daraus die Auswahl und
  // zeigt leere Ansichten gar nicht erst als anklickbare Option an.
  const ansichten = [...ansichtZaehler.entries()]
    .map(([ansicht, n]) => ({ ansicht, n }))
    .sort((a, b) => b.n - a.n);

  const bereiche = [...bereichZaehler.entries()]
    .map(([bereich, n]) => ({ bereich, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);

  // ── Tagesserie der PDF-Anforderungen: lückenlos über den ganzen Zeitraum,
  // damit die Sparkline keine Tage überspringt (0 ist eine Aussage).
  const serie: { tag: string; n: number }[] = [];
  for (let i = tage - 1; i >= 0; i--) {
    const tag = tagBerlin(new Date(Date.now() - i * 86_400_000).toISOString());
    serie.push({ tag, n: pdfProTag.get(tag) ?? 0 });
  }

  return NextResponse.json({
    ok: true,
    zeitraum: tage,
    gesamt: funnelRows.length + klickRows.length,
    tabelleFehlt: false,
    funnel,
    pdfQuote,
    quelle: quelleZaehler,
    heatmap,
    ansichten,
    // Auflösung der Heatmap-Koordinaten: x/y laufen 0…KLICK_STUFEN. Wird die
    // Skala je verfeinert, muss das Dashboard nichts wissen — es rechnet mit
    // diesem Wert statt mit einer eigenen Konstanten.
    stufen: KLICK_STUFEN,
    bereiche,
    serie,
    // Signal fürs Dashboard, dass die Heatmap nur die neuesten Klicks zeigt.
    klickLimitErreicht: klickRows.length >= KLICK_LIMIT,
  });
}

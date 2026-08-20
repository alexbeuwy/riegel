import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Einsammel-Route für das anonyme Rechner-Conversion-Tracking (18.08.2026,
 * Auftrag Alex: „sehen, ob der Rechner überhaupt angefangen und genutzt wird —
 * und mehr Leute, die das PDF holen"). Gegenstück zu src/lib/track.ts.
 *
 * DATENSCHUTZ BY DESIGN — was hier bewusst NICHT passiert:
 * - KEINE IP, KEIN User-Agent, KEIN Referrer wird gespeichert. Die IP dient
 *   ausschließlich flüchtig dem In-Memory-Rate-Limit und verlässt diese
 *   Funktion nie Richtung Datenbank.
 * - KEINE Wiedererkennung über Seitenaufrufe hinweg: `pageload_id` ist eine
 *   Zufalls-Id EINES Seitenaufrufs (kein Cookie, kein localStorage). Sie
 *   verknüpft nur die Funnel-Schritte derselben Rechner-Session — der Funnel
 *   spielt sich ohnehin in einem Seitenaufruf ab.
 * - KEIN Freitext aus dem Client landet ungefiltert in der DB: Events, Felder
 *   und Wertebereiche laufen über eine strikte Allowlist, alles Unbekannte
 *   wird still verworfen (auch der Client-Zeitstempel `ts` — es gilt die
 *   Serverzeit via created_at default, Client-Uhren sind unzuverlässig).
 *
 * FAIL-SOFT (Muster wie api/feedback): Tracking darf den Rechner NIE stören.
 * Kaputter Body, fehlende Supabase-Konfiguration, DB-Fehler → immer 204,
 * niemals ein Fehler, der im Browser als roter Request auffällt.
 */

/** Erlaubte Events — exakt der Vertrag aus src/lib/track.ts. */
const ERLAUBTE_EVENTS = new Set([
  "rechner_start",
  "rechner_step",
  "rechner_analyse",
  "rechner_ergebnis",
  "report_form_geoeffnet",
  "report_angefordert",
  "rechner_klick",
]);

/** Erlaubte Quellen beim Öffnen des Report-Formulars (CTA unter dem Ergebnis
 *  vs. Badge am Wertkorridor) — genau diese zwei Einstiege gibt es. */
const ERLAUBTE_QUELLEN = new Set(["cta", "badge"]);

/** Erlaubte Ansichten des Rechners (Vertrag: `Ansicht` in src/lib/track.ts).
 *  Die Heatmap wertet je Ansicht getrennt aus — ohne diese Trennung liegen
 *  Klicks aus Schritt 1 und aus der Ergebnisseite auf demselben Bild
 *  übereinander (Betreiber-Feedback 20.08.2026). */
const ERLAUBTE_ANSICHTEN = new Set([
  "objektart",
  "standort",
  "eckdaten",
  "analyse",
  "ergebnis",
  "ergebnis-formular",
  "seite",
]);

/** Geräteklassen. Bewusst nur zwei grobe Klassen aus der Viewport-Breite
 *  (KEIN User-Agent, kein Gerätemodell) — genau so viel, wie nötig ist, um
 *  Mobil-Klicks nicht auf ein Desktop-Referenzbild zu projizieren. */
const ERLAUBTE_GERAETE = new Set(["desktop", "mobil"]);

/** Auflösung der Heatmap: 200 Stufen je Achse (0,5-%-Buckets). Muss zu
 *  KLICK_STUFEN in src/lib/track.ts passen. */
const KLICK_STUFEN = 200;

/** Ein Batch-Request darf höchstens so viele Events tragen; der Client flusht
 *  bei 12 (track.ts), 25 ist der großzügige Sicherheitsdeckel gegen Müll. */
const MAX_ITEMS = 25;

interface EventZeile {
  event: string;
  step: number | null;
  quelle: string | null;
  x_pct: number | null;
  y_pct: number | null;
  bereich: string | null;
  ansicht: string | null;
  geraet: string | null;
  pageload_id: string;
}

/** Ganzzahl im Bereich [min, max] — sonst null (verwerfen statt klemmen, damit
 *  offensichtlicher Unsinn nicht als „0" in die Auswertung rutscht). */
function ganzzahl(v: unknown, min: number, max: number): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/**
 * Ein Roh-Item auf genau die erlaubten Spalten abbilden. Rückgabe null =
 * verwerfen. Felder werden je Event zugeordnet: ein `step` an einem Klick-Event
 * oder eine `quelle` am Start-Event sind Vertragsbruch und fliegen raus.
 */
function normalisiere(raw: unknown): EventZeile | null {
  if (!raw || typeof raw !== "object") return null;
  const it = raw as Record<string, unknown>;

  const event = typeof it.event === "string" ? it.event : "";
  if (!ERLAUBTE_EVENTS.has(event)) return null;

  // pageload_id bleibt bewusst `text` (nicht uuid): track.ts fällt ohne
  // crypto.randomUUID auf ein eigenes Zufallsformat zurück.
  const pageloadId = typeof it.pageloadId === "string" ? it.pageloadId.trim().slice(0, 64) : "";
  if (!pageloadId) return null;

  const detail = it.detail && typeof it.detail === "object" ? (it.detail as Record<string, unknown>) : {};

  const zeile: EventZeile = {
    event,
    step: null,
    quelle: null,
    x_pct: null,
    y_pct: null,
    bereich: null,
    ansicht: null,
    geraet: null,
    pageload_id: pageloadId,
  };

  if (event === "rechner_step") {
    const step = ganzzahl(detail.step, 1, 3);
    if (step === null) return null; // Schritt ohne gültige Nummer ist wertlos
    zeile.step = step;
  } else if (event === "report_form_geoeffnet") {
    const quelle = typeof detail.quelle === "string" ? detail.quelle : "";
    // Unbekannte Quelle verwirft nur das Feld, nicht das Event — die
    // Funnel-Stufe „Formular geöffnet" soll nicht an einem Tippfehler hängen.
    zeile.quelle = ERLAUBTE_QUELLEN.has(quelle) ? quelle : null;
  } else if (event === "rechner_klick") {
    // 0–200 = 0,5-%-Buckets (s. KLICK_STUFEN). Weiterhin Buckets statt Pixel,
    // nur 10× feiner als die ursprünglichen 5 % — mit 5 % war eine Zelle auf
    // dem Desktop ~70 px breit und damit breiter als der Abstand zwischen zwei
    // Buttons (Betreiber-Feedback 20.08.2026: "viel zu grob").
    const x = ganzzahl(detail.xPct, 0, KLICK_STUFEN);
    const y = ganzzahl(detail.yPct, 0, KLICK_STUFEN);
    if (x === null || y === null) return null;
    zeile.x_pct = x;
    zeile.y_pct = y;
    const bereich = typeof detail.bereich === "string" ? detail.bereich.trim().slice(0, 60) : "";
    // Nur ein knapper Slug-Bereichsname (data-track-bereich), kein Freitext.
    zeile.bereich = /^[a-z0-9_-]{1,60}$/i.test(bereich) ? bereich : "seite";
    const ansicht = typeof detail.ansicht === "string" ? detail.ansicht : "";
    const geraet = typeof detail.geraet === "string" ? detail.geraet : "";
    // Unbekannte Werte verwerfen nur das FELD, nicht den Klick — ein neuer
    // Ansichtsname aus einem älteren Client soll keine Klicks verschlucken.
    zeile.ansicht = ERLAUBTE_ANSICHTEN.has(ansicht) ? ansicht : "seite";
    zeile.geraet = ERLAUBTE_GERAETE.has(geraet) ? geraet : null;
  }

  return zeile;
}

export async function POST(req: Request) {
  // Großzügiges Limit: Klick-Events kommen gebatcht, ein neugieriger Nutzer
  // erzeugt in 10 Minuten leicht mehrere Batches. Zu streng = Datenlücken.
  if (!rateLimit(`track:${clientIp(req)}`, 60, 10 * 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const zeilen = items
    .slice(0, MAX_ITEMS)
    .map(normalisiere)
    .filter((z): z is EventZeile => z !== null);

  if (zeilen.length === 0) return new NextResponse(null, { status: 204 });

  // Ohne Supabase-Konfiguration (z. B. lokale Vorschau) läuft die Seite
  // normal weiter — es wird eben nichts gezählt.
  if (!supabaseServer) return new NextResponse(null, { status: 204 });

  const { error } = await supabaseServer.from("rechner_events").insert(zeilen);

  // Sonderfall „Migration 20260820120000 noch nicht eingespielt": Dann kennt
  // die Tabelle die Spalten ansicht/geraet nicht und PostgREST weist den
  // GANZEN Batch ab — inklusive der Funnel-Events, die damit gar nichts zu tun
  // haben. Statt in diesem Fenster stillschweigend ALLE Zahlen zu verlieren,
  // einmal ohne die neuen Felder nachlegen. Ist die Migration da, passiert das
  // nie; bei einem White-Label-Klon, der sie vergisst, läuft der Funnel weiter
  // und nur die Ansichts-Trennung der Heatmap fehlt.
  if (error && /ansicht|geraet|PGRST204/i.test(`${error.code ?? ""} ${error.message}`)) {
    console.error("[track] Spalten ansicht/geraet fehlen — Migration 20260820120000 einspielen.");
    const ohneNeue = zeilen.map((z) => {
      const rest: Partial<EventZeile> = { ...z };
      delete rest.ansicht;
      delete rest.geraet;
      return rest;
    });
    const { error: zweiter } = await supabaseServer.from("rechner_events").insert(ohneNeue);
    if (zweiter) console.error("[track] Insert (Fallback) fehlgeschlagen:", zweiter.message);
  } else if (error) {
    // Jeder andere DB-Fehler bleibt still — nur Log fürs Team, nach außen 204.
    console.error("[track] Insert fehlgeschlagen:", error.message);
  }

  return new NextResponse(null, { status: 204 });
}

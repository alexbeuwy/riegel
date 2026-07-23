import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import { buildReportPdf, type ReportData } from "@/lib/report-pdf";
import { buildReportContext } from "@/lib/report-context";
import { estimateValue, type Objektart, type Zustand, type Qualitaet } from "@/lib/valuation";
import { fetchBodenrichtwert, isInRlpBbox } from "@/lib/boris";
import { fetchSatellite } from "@/lib/satellite";
import { buildReportObjekte } from "@/lib/report-objekte";

/**
 * PDF-Regeneration für /intern: baut aus einer bereits in valuation_requests
 * gespeicherten Zeile GENAU das PDF neu, das der Interessent damals per Mail
 * bekam (bzw. bekommen hätte) — Sissy kann so jede Bewertung jederzeit als
 * PDF ziehen, ohne dass der Kunde den Rechner erneut bedienen muss.
 * Zugriff/Rate-Limit wie die übrigen /intern-Routen; Fehlermeldungen bleiben
 * nach außen generisch, Details nur in den Logs.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

/** Robust in eine endliche Zahl wandeln (numeric-Spalten kommen je nach
 *  PostgREST-Konfiguration mal als number, mal als String zurück) — sonst
 *  undefined, damit optionale ReportData-/ValuationInput-Felder sauber leer
 *  bleiben statt NaN durchzureichen. */
function n(v: unknown): number | undefined {
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

/** Dateiname ohne Umlaute/Leerzeichen (Header-/Dateisystem-sicher). */
function fileSlug(s: string): string {
  return s
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Diakritika nach NFKD (ä→a, ö→o, ü→u, …)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-report:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche — bitte später erneut." },
      { status: 429 },
    );
  }

  let b: { password?: string; accessToken?: string; id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const id = String(b.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id fehlt." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern/report] SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: row, error: rowError } = await admin
    .from("valuation_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (rowError || !row) {
    // Generisch statt "id existiert nicht" vs. "DB-Fehler" zu unterscheiden —
    // nach außen soll das nicht zum Erraten gültiger IDs einladen.
    return NextResponse.json({ ok: false, error: "Nicht gefunden." }, { status: 404 });
  }

  const objektart = (row.objektart as Objektart) ?? "wohnung";
  const objektartLabel = OBJEKTART_LABEL[objektart] ?? (row.objektart ? String(row.objektart) : "");
  const zustand = (row.zustand as Zustand) ?? "gepflegt";
  const qualitaet = (row.qualitaet as Qualitaet) ?? "normal";
  // ausstattung liegt als jsonb-Array vor — evtl. noch nicht in der Spalte
  // vorhanden (Migration nicht gelaufen) → dann einfach leer.
  const ausstattung: string[] = Array.isArray(row.ausstattung)
    ? row.ausstattung.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const lat = n(row.lat) ?? null;
  const lng = n(row.lng) ?? null;

  // Wert NEU rechnen — liefert die Preis-Faktoren (factors) für die
  // Faktoren-Seite sowie Fallback-Kennzahlen für alles, was in der Zeile
  // (noch) nicht gespeichert ist. mid/low/high etc. werden unten mit den
  // GESPEICHERTEN Werten überschrieben, damit das PDF exakt die damals
  // kommunizierten Zahlen zeigt statt neu gewürfelter Zufallskomponenten
  // (comparables/confidence/trendPct/mikrolage sind in estimateValue bewusst
  // leicht randomisiert).
  const calc = estimateValue({
    objektart,
    ort: row.city ?? "",
    plz: row.postcode ?? undefined,
    wohnflaeche: n(row.wohnflaeche),
    grundflaeche: n(row.grundflaeche),
    zimmer: n(row.zimmer),
    baujahr: n(row.baujahr),
    zustand,
    qualitaet,
    energieklasse: row.energieklasse || undefined,
    ausstattung,
    jahresnettokaltmiete: n(row.jahresnettokaltmiete),
    wohneinheiten: n(row.wohneinheiten),
    gewerbeeinheiten: n(row.gewerbeeinheiten),
  });

  // mid ist die tragende, damals kommunizierte Zahl — KEIN Fallback auf den
  // frisch gerechneten calc.mid (der könnte durch Rundungs-/Modelländerungen
  // seither abweichen). Fehlt sie oder ist sie ungültig, lässt sich kein
  // authentisches Regenerat erstellen.
  const mid = n(row.value_mid);
  if (!mid || mid <= 0) {
    return NextResponse.json({ ok: false, error: "Für diese Anfrage liegt kein Wert vor." }, { status: 422 });
  }
  const low = n(row.value_low) ?? calc.low;
  const high = n(row.value_high) ?? calc.high;
  const pricePerSqm = n(row.price_per_sqm) ?? calc.pricePerSqm;
  const confidence = n(row.confidence) ?? calc.confidence;
  const comparables = n(row.comparables) ?? calc.comparables;
  const trendPct = n(row.trend_pct) ?? calc.trendPct;
  const mikrolage = n(row.mikrolage) ?? calc.mikrolage;
  const vervielfaeltiger = n(row.vervielfaeltiger) ?? calc.vervielfaeltiger;

  // Satellit, amtlicher Bodenrichtwert und OnOffice-Vergleichsobjekte parallel
  // laden — alle drei fail-soft und unabhängig (sequenziell summieren sich hier
  // sonst bis zu ~20 s Wartezeit). Bei fehlender objektart in der (alten)
  // Zeile leerer String: buildReportObjekte liefert dann fail-soft ein leeres
  // Array statt zu raten.
  const [satelliteB64, boris, vergleichsobjekte] = await Promise.all([
    fetchSatellite(lat, lng),
    lat != null && lng != null && isInRlpBbox(lat, lng) ? fetchBodenrichtwert(lat, lng) : Promise.resolve(null),
    buildReportObjekte(row.objektart ?? "", row.city ?? undefined, 3, {
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      preis: mid,
    }),
  ]);

  // Stand der ANFRAGE, nicht heute — der Report soll die Situation zum
  // Zeitpunkt der damaligen Kommunikation abbilden.
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const createdValid = Number.isFinite(createdAt.getTime());
  const dateLabel = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(
    createdValid ? createdAt : new Date(),
  );

  const reportData: ReportData = {
    name: row.name || "Interessent",
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    postcode: row.postcode ?? undefined,
    objektartLabel,
    satelliteB64: satelliteB64 ?? undefined,
    wohnflaeche: n(row.wohnflaeche),
    grundflaeche: n(row.grundflaeche),
    zimmer: n(row.zimmer),
    baujahr: n(row.baujahr),
    zustand,
    qualitaet,
    energieklasse: row.energieklasse ?? undefined,
    ausstattung,
    factors: calc.factors,
    context: buildReportContext({ city: row.city ?? undefined, lat, lng }),
    vergleichsobjekte,
    jahresnettokaltmiete: n(row.jahresnettokaltmiete),
    wohneinheiten: n(row.wohneinheiten),
    gewerbeeinheiten: n(row.gewerbeeinheiten),
    // grundstuecksAnrechnung wird nicht historisch gespeichert, ist aber
    // deterministisch aus Fläche + BRW ableitbar — calc liefert die aktuelle
    // Staffel-Aufschlüsselung für den Hinweis auf der Zusammensetzungs-Seite.
    value: { low, mid, high, pricePerSqm, comparables, trendPct, mikrolage, confidence, vervielfaeltiger, grundstuecksAnrechnung: calc.grundstuecksAnrechnung },
    dateLabel,
    bodenrichtwert: boris ? { brw: boris.brw, stichtag: boris.stichtag, zone: boris.zone } : undefined,
  };

  let pdfBase64: string;
  try {
    pdfBase64 = await buildReportPdf(reportData);
  } catch (e) {
    // Vollen Stack loggen — sonst lässt sich ein produktionsspezifischer
    // Fehler (Font-/Bild-Decode, pdf-lib-Aufruf mit unerwartetem Wert …)
    // aus den Vercel-Logs nicht rekonstruieren.
    console.error("[intern/report] PDF-Erstellung fehlgeschlagen:", e instanceof Error ? e.stack ?? e.message : e);
    return NextResponse.json({ ok: false, error: "PDF konnte nicht erstellt werden." }, { status: 500 });
  }

  const datePart = (createdValid ? createdAt : new Date()).toISOString().slice(0, 10);
  const namePart = fileSlug(row.city || id.slice(0, 8)) || "report";
  const filename = `RIEGEL-Report-${namePart}-${datePart}.pdf`;

  return new NextResponse(Buffer.from(pdfBase64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

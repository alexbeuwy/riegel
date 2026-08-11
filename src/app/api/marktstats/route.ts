import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ortsAbschlussStats } from "@/lib/verkauft-stats";
import type { Objektart } from "@/lib/valuation";

/**
 * Aggregat echter Orts-Abschlüsse für den Rechner-Client (Fall Manfred
 * „Landauer Warte", 11.08.2026): Der Client rechnet sofort modellbasiert und
 * zieht dann — wie beim Bodenrichtwert — die echten OnOffice-Aggregate nach,
 * damit die ANZEIGE im Rechner und das serverseitig gerechnete PDF nicht
 * zwei verschiedene Werte erzählen (der Kunde zitiert sonst den höheren).
 *
 * Datensparsam per Konstruktion: verkauft-stats.ts liefert ausschließlich
 * n/median/p25/p75 ab fünf Abschlüssen — keine Einzelpreise, keine Objekte.
 * `data: null` heißt „zu dünne Datenlage" und ist ein gültiges, cachebares
 * Ergebnis (der Rechner bleibt dann beim reinen Modellwert).
 */
const OBJEKTARTEN = new Set<Objektart>(["wohnung", "haus"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ort = (searchParams.get("ort") ?? "").trim().slice(0, 80);
  const objektart = searchParams.get("objektart") as Objektart | null;

  if (!ort || !objektart || !OBJEKTARTEN.has(objektart)) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  }
  if (!rateLimit(`marktstats:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const data = await ortsAbschlussStats(ort, objektart);
  return NextResponse.json(
    { ok: true, data },
    // Der Verkauft-Pool ändert sich selten (Abschlüsse, keine Live-Preise) —
    // ein Tag CDN-Cache hält die OnOffice-Last klein, ohne echte Aktualität
    // zu kosten.
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}

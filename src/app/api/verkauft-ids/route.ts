import { NextResponse } from "next/server";
import { getVerkaufteIds } from "@/lib/verkauft";

// Ohne explizites revalidate cacht Next die GET-Antwort dauerhaft (Full Route
// Cache) und ignoriert die 3600s-Revalidierung, die getVerkaufteIds() intern
// bereits über den Cache-Key "estates-verkauft-v1" (estates.ts) mitbringt.
// Gleicher Wert wie dort, damit Route-Cache und Daten-Cache synchron bleiben.
export const revalidate = 3600;

/**
 * Liefert die Ids aller Objekte, die RIEGEL verkauft hat und die NICHT mehr im
 * aktiven Vermarktungs-Pool stehen (s. src/lib/verkauft.ts). src/proxy.ts holt
 * diese Liste einmal pro TTL, um verkaufte Objekt-Slugs mit HTTP 410 statt 404
 * zu beantworten. Rein interner Aufruf (kein Nutzerpfad zeigt hierher) — /api/
 * ist in robots.ts bereits pauschal auf Disallow, kein zusätzlicher Eintrag nötig.
 */
export async function GET() {
  const ids = await getVerkaufteIds();
  return NextResponse.json(
    { ids },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      },
    },
  );
}

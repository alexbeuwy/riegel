/**
 * Proxy für /immobilien/* — server-only, läuft laut next 16.2.9 immer auf
 * Node.js-Runtime (nicht Edge). Datei heißt bewusst proxy.ts, nicht
 * middleware.ts: die alte Konvention ist in dieser Version deprecated
 * (next/dist/build/index.js warnt beim Build, s. Auftrag), der Build bricht
 * sogar ab, wenn beide Dateien gleichzeitig existieren.
 *
 * Zweck, in dieser Reihenfolge geprüft:
 *  a) Kaputte Prozent-Kodierung ("/immobilien/%E4" u. ä.) früh abfangen, BEVOR
 *     der App Router versucht, das dynamische [slug]-Segment zu dekodieren.
 *     Dort wirft Next selbst intern eine URIError, die nicht abgefangen wird
 *     und zu HTTP 500 führt (nachgemessen, auch unabhängig von dieser
 *     Codebasis reproduzierbar — s. Kommentar in [slug]/page.tsx). Der Proxy
 *     läuft davor und kann den Pfad vorher selbst dekodieren.
 *  b) Objekt-Slugs, die zu einer von RIEGEL verkauften und nicht mehr aktiven
 *     Immobilie gehören (s. src/lib/verkauft.ts), bekommen HTTP 410 statt der
 *     normalen Detailseite — ein klares Signal an Google, den Datensatz aus
 *     dem Index zu nehmen, statt ihn als "vorübergehend nicht erreichbar" zu
 *     werten.
 *
 * matcher begrenzt die Ausführung auf /immobilien/* — die übrigen ~150 Seiten
 * laufen unverändert ohne diesen zusätzlichen Hop.
 */
import { NextResponse, type NextRequest } from "next/server";

/* ─────────────────────────  a) Kaputte Prozent-Kodierung  ───────────────────────── */

// Irgendein Slug mit einer Id, die garantiert nie vergeben wird: reale
// OnOffice-Ids sind deutlich kürzer (Beispiele aus der Recherche: 419, 11205).
// Der Pfad landet ganz normal auf der [slug]-Route, getEstateBySlug findet
// nichts, notFound() liefert die gestylte 404-Seite mit echtem Status 404.
const GARANTIERT_UNBEKANNTER_PFAD = "/immobilien/ungueltiger-pfad-999999999999";

/* ─────────────────────────  b) Verkauft-Ids, memoisiert  ───────────────────────── */

// TTL deckt sich mit dem Cache-Key "estates-verkauft-v1" (estates.ts,
// revalidate 3600) — ein kürzeres TTL hier würde nur zusätzliche, ungenutzte
// Hops auf /api/verkauft-ids erzeugen, ein längeres ließe frisch verkaufte
// Objekte zu lange mit 200 statt 410 stehen.
const IDS_TTL_MS = 3600 * 1000;

let idsCache: { ids: Set<string>; expiresAt: number } | null = null;

async function ladeVerkaufteIds(origin: string): Promise<Set<string>> {
  if (idsCache && idsCache.expiresAt > Date.now()) return idsCache.ids;

  try {
    const res = await fetch(new URL("/api/verkauft-ids", origin), {
      // Kein zusätzlicher fetch-Cache: die TTL-Logik hier übernimmt das schon,
      // zwei überlappende Cache-Schichten würden sich nur gegenseitig verwirren.
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`verkauft-ids: HTTP ${res.status}`);

    const data = (await res.json()) as { ids?: string[] };
    const ids = new Set(data.ids ?? []);
    idsCache = { ids, expiresAt: Date.now() + IDS_TTL_MS };
    return ids;
  } catch {
    // Jeder Fehler bedeutet Passthrough: ein abgelaufener, aber noch
    // vorhandener Stand ist besser als gar keiner; ganz ohne Vorlauf gewinnt
    // das heutige Verhalten (Objekt wird normal ausgeliefert) — lieber das
    // als ein fälschliches 410 auf ein noch aktives Objekt.
    return idsCache?.ids ?? new Set();
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return NextResponse.rewrite(new URL(GARANTIERT_UNBEKANNTER_PFAD, request.url));
  }

  // Die eigene Statusseite läuft normal durch, sie ist kein Objekt-Slug.
  if (decodedPath === "/immobilien/verkauft") {
    return NextResponse.next();
  }

  // Dieselbe Regex wie getEstateBySlug (src/lib/estates.ts:106) — alle 196
  // Verkauft-Slugs erfüllen sie (s. Recherche-Datenbasis im Auftrag).
  const segments = decodedPath.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? "";
  const idMatch = lastSegment.match(/-([0-9]+)$/);
  if (!idMatch) {
    return NextResponse.next();
  }
  const id = idMatch[1];

  const verkaufteIds = await ladeVerkaufteIds(origin);
  if (!verkaufteIds.has(id)) {
    return NextResponse.next();
  }

  // Treffer: verkauftes, nicht mehr aktives Objekt -> 410 statt der normalen
  // Detailseite. NextResponse.rewrite mit eigenem status-Init wird von Next
  // beim Rendern der Ziel-Seite überschrieben (der Statuscode kommt am Ende
  // von der gerenderten Seite selbst, nachgemessen: Ergebnis war 200 statt
  // 410). Deshalb hier stattdessen die interne Statusseite serverseitig per
  // fetch holen und ihren HTML-Body explizit mit Status 410 ausliefern.
  try {
    const res = await fetch(new URL(`/immobilien/verkauft?id=${id}`, request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    const html = await res.text();
    return new NextResponse(html, {
      status: 410,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    // Fehlschlag beim internen Fetch: lieber normal durchlassen als eine
    // kaputte Seite mit falschem Status auszuliefern.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/immobilien/:path*"],
};

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getEstateBySlug } from "@/lib/estates";
import { getExposePdfCached } from "@/lib/expose-cache";

/**
 * PDF-Exposé-Download (/immobilien/[slug]) — bewusst hinter dem Konto-Gate:
 * das Exposé ist der Anreiz fürs Konto ("Objekt merken & Exposé erhalten"),
 * und RIEGEL weiß dadurch, WER sich für welches Objekt interessiert.
 *
 * Sicherheit: Es sind NUR Objekte abrufbar, die aktuell öffentlich im Portal
 * stehen (Lookup über getEstateBySlug) — pdf:get der OnOffice-API würde sonst
 * per Id-Enumeration auch unveröffentlichte/archivierte Exposés rendern.
 */
export async function GET(req: Request) {
  if (!rateLimit(`expose:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Zu viele Downloads — bitte kurz warten." }, { status: 429 });
  }

  // Konto-Gate: Access-Token der (rein client-seitigen) Supabase-Session
  // verifizieren — gleiche Brücke wie bei /api/game-scores.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !supabaseServer) {
    return NextResponse.json({ ok: false, error: "Bitte einloggen, um das Exposé zu laden." }, { status: 401 });
  }
  const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ ok: false, error: "Bitte einloggen, um das Exposé zu laden." }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const found = slug ? await getEstateBySlug(slug) : null;
  if (!found || found.source !== "onoffice") {
    // Mock-Objekte haben kein echtes Exposé; unbekannte Slugs sowieso nicht.
    return NextResponse.json({ ok: false, error: "Für dieses Objekt ist kein Exposé verfügbar." }, { status: 404 });
  }

  // Cache in Supabase Storage vorgeschaltet (siehe expose-cache.ts) — nur bei
  // Cache-Miss/Storage-Fehler rendert OnOffice frisch (~11-16s).
  const pdf = await getExposePdfCached(found.estate.id, found.estate.updatedAt);
  if (!pdf) {
    return NextResponse.json(
      { ok: false, error: "Exposé derzeit nicht verfügbar — bitte später erneut versuchen." },
      { status: 503 },
    );
  }

  const filename = `RIEGEL-Expose-${found.estate.externalId ?? found.estate.id}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Exposés ändern sich mit dem Objekt — nicht am Edge cachen.
      "Cache-Control": "private, no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkAdminPassword } from "@/lib/admin-auth";
import { supabaseServer } from "@/lib/supabase-server";
import { listBunnyImages, uploadBunnyImage, isOwnCdnUrl } from "@/lib/bunny";
import { getSiteSetting } from "@/lib/site-settings";
import { HERO_IMAGE_KEY } from "@/lib/site-settings-keys";

/**
 * Verwaltung des austauschbaren Startseiten-Hero-Bilds über /intern:
 * - action "list": vorhandene BunnyCDN-Bilder auflisten (zum Auswählen per Klick)
 * - action "select": eine bestehende CDN-URL als aktuelles Hero-Bild setzen
 * - multipart/form-data: neue Datei per Drag&Drop hochladen + direkt aktivieren
 * Immer Passwort-geschützt (gleiche Prüfung wie /api/intern), Rate-Limit gegen
 * Brute-Force/Massen-Uploads. Nach einer Änderung wird "/" sofort neu validiert
 * (revalidatePath), damit die neue Startseite ohne Redeploy live geht.
 */

async function setHeroImage(url: string) {
  if (!supabaseServer) throw new Error("Supabase nicht konfiguriert.");
  const { error } = await supabaseServer
    .from("site_settings")
    .upsert({ key: HERO_IMAGE_KEY, value: url, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-hero:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Zu viele Versuche — bitte später erneut." }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") || "";

  // ── Upload (Drag & Drop) — multipart/form-data ──
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const auth = checkAdminPassword(String(form.get("password") ?? ""));
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "Keine Datei erhalten." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Nur Bilddateien sind erlaubt." }, { status: 400 });
    }
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Datei zu groß (max. 20 MB)." }, { status: 400 });
    }

    try {
      const uploaded = await uploadBunnyImage(file);
      await setHeroImage(uploaded.url);
      return NextResponse.json({ ok: true, image: uploaded });
    } catch (e) {
      console.error("[intern/hero-image] Upload-Fehler:", e);
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Upload fehlgeschlagen." }, { status: 500 });
    }
  }

  // ── JSON-Aktionen: "list" / "select" ──
  let b: { password?: string; action?: string; url?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const auth = checkAdminPassword(b.password);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  if (b.action === "list") {
    try {
      const images = await listBunnyImages();
      const current = await getSiteSetting(HERO_IMAGE_KEY, "");
      return NextResponse.json({ ok: true, images, current });
    } catch (e) {
      console.error("[intern/hero-image] Listing-Fehler:", e);
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Listing fehlgeschlagen." }, { status: 500 });
    }
  }

  if (b.action === "select") {
    const url = String(b.url ?? "");
    if (!url || !isOwnCdnUrl(url)) {
      return NextResponse.json({ ok: false, error: "Ungültige Bild-URL." }, { status: 400 });
    }
    try {
      await setHeroImage(url);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("[intern/hero-image] Select-Fehler:", e);
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Unbekannte Aktion." }, { status: 400 });
}

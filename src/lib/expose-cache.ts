/**
 * Persistenter Cache für das OnOffice-PDF-Exposé — server-only.
 *
 * Gemessen: pdf:get bei OnOffice RENDERT das Exposé bei JEDEM Aufruf frisch
 * (~11-16 s, ~3,8 MB) — die Render-Zeit selbst ist nicht beschleunigbar, wohl
 * aber die Wiederholung. Vercels unstable_cache/Data-Cache scheidet aus
 * (Limit 2 MB/Eintrag, das PDF ist größer) — deshalb ein eigener Cache im
 * bereits integrierten Supabase Storage (Bucket "exposes", privat, über den
 * Service-Role-Client `supabaseServer`).
 *
 * Cache-Key: `${estateId}/${hash}.pdf`, hash = die ersten 16 Zeichen von
 * sha256(updatedAt) des Objekts. Ändert sich das Objekt in OnOffice
 * (geaendert_am), ändert sich automatisch der Key -> der nächste Download
 * verfehlt den Cache und rendert/schreibt frisch unter neuem Namen. Der
 * veraltete Eintrag verwaist bewusst (kein aktives Aufräumen hier) — siehe
 * PRE_WARM_HINT unten für einen möglichen Cron, der das mitübernehmen könnte.
 *
 * FAIL-SAFE: Diese Funktion wirft NIE. Jeder Storage-Fehler (Bucket fehlt,
 * kein Service-Role-Key, Netzwerk, Download/Upload) fällt sauber auf
 * `fetchExposePdf()` zurück (= heutiges Verhalten ohne Cache). Kein
 * Secret-Logging.
 */
import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { fetchExposePdf } from "@/lib/onoffice";

const BUCKET = "exposes";

// Verhindert, dass JEDER Request erneut versucht, den Bucket anzulegen: einmal
// ermittelt (vorhanden ODER erfolgreich angelegt), gilt das Ergebnis für die
// Lebensdauer dieses Serverless-Prozesses.
let bucketReady: Promise<boolean> | null = null;

async function ensureBucket(): Promise<boolean> {
  if (!supabaseServer) return false;
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        const { error } = await supabaseServer.storage.createBucket(BUCKET, { public: false });
        // "already exists" (409/Duplicate) ist nach dem ersten erfolgreichen
        // Anlegen der Normalfall — kein echter Fehler.
        if (error && error.statusCode !== "409" && !/already exists/i.test(error.message)) {
          console.error("[expose-cache] Bucket-Anlage fehlgeschlagen:", error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.error("[expose-cache] Bucket-Anlage fehlgeschlagen:", err instanceof Error ? err.message : String(err));
        return false;
      }
    })();
  }
  return bucketReady;
}

function cacheKey(estateId: string, updatedAt: string): string {
  const hash = createHash("sha256").update(updatedAt).digest("hex").slice(0, 16);
  return `${estateId}/${hash}.pdf`;
}

/**
 * Liefert das PDF-Exposé eines Objekts — bevorzugt aus dem Storage-Cache
 * (schneller Pfad, kein OnOffice-Call), sonst frisch über fetchExposePdf()
 * gerendert und dabei in den Cache geschrieben. `null` nur, wenn auch
 * fetchExposePdf() scheitert (z. B. OnOffice nicht konfiguriert/erreichbar).
 */
export async function getExposePdfCached(estateId: string, updatedAt: string): Promise<Buffer | null> {
  if (!supabaseServer) return fetchExposePdf(estateId);

  const key = cacheKey(estateId, updatedAt);
  const ready = await ensureBucket();

  if (ready) {
    try {
      const { data, error } = await supabaseServer.storage.from(BUCKET).download(key);
      if (!error && data) return Buffer.from(await data.arrayBuffer());
    } catch (err) {
      console.error("[expose-cache] Download fehlgeschlagen:", err instanceof Error ? err.message : String(err));
      // fällt unten auf den Live-Render zurück
    }
  }

  const pdf = await fetchExposePdf(estateId);
  if (!pdf) return null;

  if (ready) {
    try {
      const { error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(key, pdf, { contentType: "application/pdf", upsert: true });
      if (error) console.error("[expose-cache] Upload fehlgeschlagen:", error.message);
    } catch (err) {
      console.error("[expose-cache] Upload fehlgeschlagen:", err instanceof Error ? err.message : String(err));
    }
  }

  return pdf;
}

// Idee für später (NICHT implementiert): ein Cron/Scheduled-Job könnte die
// aktiven Objekte periodisch durchgehen und getExposePdfCached() pro Objekt
// einmal "warm" aufrufen (Pre-Warm) — dann träfe auch der ALLERERSTE
// Nutzer-Download schon auf den Cache statt auf die ~16s OnOffice-Renderzeit.

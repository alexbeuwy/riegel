import { supabaseServer } from "@/lib/supabase-server";

/**
 * Kleine Key-Value-Ablage (Tabelle "site_settings") für vom Admin per /intern
 * austauschbare Inhalte (aktuell: Hero-Bild der Startseite). Fällt bei fehlender
 * Supabase-Konfiguration, fehlendem Eintrag oder DB-Fehler IMMER auf den
 * übergebenen Fallback zurück — die Seite darf dadurch nie brechen.
 */
export async function getSiteSetting(key: string, fallback: string): Promise<string> {
  if (!supabaseServer) return fallback;
  try {
    const { data, error } = await supabaseServer
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data?.value) return fallback;
    return data.value;
  } catch {
    return fallback;
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-Client — nur aktiv, wenn die beiden öffentlichen Env-Variablen
 * gesetzt sind (in Vercel: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Ohne Konfiguration bleibt alles auf localStorage (kein Crash, kein Login).
 * Der service_role-Key gehört NIE hierher (nur serverseitig/secret).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Serverseitiger Supabase-Client für API-Routen: bevorzugt den service_role-Key
 * (Inserts funktionieren unabhängig von RLS-Policies — die offene anon-Insert-
 * Policy kann damit perspektivisch entfallen), fällt ohne ihn auf den anon-Key
 * zurück. NIEMALS in Client-Komponenten importieren.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseServer: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

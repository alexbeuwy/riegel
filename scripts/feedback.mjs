// Read-only: listet Sissys On-Page-Kommentare aus der Supabase-Tabelle `feedback`.
//
// Nutzung:  node --env-file=.env.local scripts/feedback.mjs
// Erwartet: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (oder ANON) im Env.
//
// Gibt die Kommentare als JSON auf stdout aus (Anzahl auf stderr). Schreibt und
// verändert NICHTS in der Datenbank — reines SELECT. Keine Secrets in der Ausgabe.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Fehlt: NEXT_PUBLIC_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY im Env.",
  );
  process.exit(2);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await sb
  .from("feedback")
  .select("id, created_at, page_url, area, comment")
  .order("created_at", { ascending: true });

if (error) {
  console.error(`Query-Fehler: ${error.message}${error.code ? ` (${error.code})` : ""}`);
  // 42P01 = undefined_table -> Tabelle existiert noch nicht.
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
console.error(`\n${data.length} Kommentar(e) in der feedback-Tabelle.`);

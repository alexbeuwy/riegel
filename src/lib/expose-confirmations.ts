import { supabaseServer } from "@/lib/supabase-server";
import type { Estate } from "@/lib/mock-estates";

/**
 * Nachweis der aktiven Provisionsbestätigung je (Nutzer, Objekt) — Grundlage
 * des serverseitigen Exposé-Download-Gates (§ 312j Abs. 3 BGB / BGH I ZR
 * 159/24, Sicherheits-Audit 08/2026). Schreiben/Lesen ausschließlich über den
 * service_role-Key (Tabelle hat keine anon-Policy).
 *
 * MIGRATIONS-RESILIENZ: Solange die Tabelle expose_confirmations noch nicht
 * existiert (Migration nicht angewendet), verhalten sich beide Funktionen so,
 * dass NICHTS bricht und niemand ausgesperrt wird — recordExposeConfirmation
 * schluckt den Fehler, hasExposeConfirmation liefert `true` (Gate inaktiv).
 * Sobald die Tabelle existiert, greift das Gate automatisch.
 */

/** Postgres/PostgREST-Signale dafür, dass die Tabelle (noch) nicht existiert. */
function istTabelleFehlt(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  // 42P01 = undefined_table; PGRST205 = PostgREST findet die Relation nicht.
  return code === "42P01" || code === "PGRST205" || /does not exist|schema cache/i.test(msg);
}

/** Bestätigung best-effort persistieren. Fehler werden geloggt, nie geworfen. */
export async function recordExposeConfirmation(
  userId: string,
  estate: Pick<Estate, "id" | "slug"> & { provision: { text?: string | null } },
  provisionText: string,
): Promise<void> {
  if (!supabaseServer) return;
  const { error } = await supabaseServer.from("expose_confirmations").upsert(
    {
      user_id: userId,
      estate_id: estate.id,
      estate_slug: estate.slug,
      provision_text: provisionText,
    },
    { onConflict: "user_id,estate_id" },
  );
  if (error && !istTabelleFehlt(error)) {
    console.error("[expose-confirm] Bestätigung konnte nicht gespeichert werden:", error.message);
  }
}

/**
 * Liegt für (Nutzer, Objekt) eine Bestätigung vor? Fail-OPEN in genau zwei
 * Fällen, die keine echte Verweigerung sind: Supabase nicht konfiguriert oder
 * Tabelle fehlt (Migration ausstehend) — dann `true`, damit das Gate keine
 * legitimen Downloads blockiert, bevor die Infrastruktur steht. Ein echter
 * DB-Fehler führt zu fail-CLOSED (`false`), damit ein Ausfall nicht zum
 * stillen Bypass wird.
 */
export async function hasExposeConfirmation(userId: string, estateId: string): Promise<boolean> {
  if (!supabaseServer) return true;
  const { data, error } = await supabaseServer
    .from("expose_confirmations")
    .select("id")
    .eq("user_id", userId)
    .eq("estate_id", estateId)
    .maybeSingle();
  if (error) {
    if (istTabelleFehlt(error)) return true; // Gate noch inaktiv (kein Regress)
    console.error("[expose] Bestätigungs-Prüfung fehlgeschlagen:", error.message);
    return false; // echter Fehler → fail-closed
  }
  return Boolean(data);
}

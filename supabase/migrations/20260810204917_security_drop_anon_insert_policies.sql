-- Sicherheits-Audit 08/2026 — RLS-Härtung
--
-- Befund: leads, valuation_requests und game_scores trugen je eine
-- INSERT-Policy "... WITH CHECK (true)" für die Rolle `public`. Da `public`
-- die anon-Rolle einschließt, konnte JEDER mit dem öffentlichen anon-Key
-- (steht im Browser-Bundle) über die PostgREST-API direkt Zeilen einschleusen
-- — an der App vorbei, also ohne Rate-Limit, Honeypot und Server-Validierung.
--
-- Reales Risiko: Spam-Leads im Vertriebs-Dashboard, gefälschte
-- Bewertungs-Anfragen, manipulierte Leaderboard-Scores (am Leaderboard hängt
-- eine monatliche Gewinner-Benachrichtigung). KEIN Lese-Leak: für diese
-- Tabellen existiert keine SELECT-Policy für public, Reads bleiben geblockt.
--
-- Warum das gefahrlos entfernt werden kann: Die App schreibt diese Tabellen
-- ausschließlich serverseitig über den service_role-Key (supabaseServer in
-- api/contact, api/inquiry, api/booking, api/report, api/game-scores). Der
-- service_role-Key umgeht RLS vollständig — die anon-INSERT-Policies werden
-- vom Produktivcode also nie genutzt. Nach dem Drop gilt für anon:
-- RLS an + keine INSERT-Policy = deny by default.

begin;

-- Beim Verifizieren des Befunds sind zwei harmlose Test-Zeilen entstanden
-- (score 1 bzw. Minimaldatensatz) — hier gleich mit entfernen.
delete from public.game_scores where player_name = '__x' and score = 1;
delete from public.valuation_requests where name = '__x';

drop policy if exists "insert leads" on public.leads;
drop policy if exists "insert valuations" on public.valuation_requests;
drop policy if exists "insert game scores" on public.game_scores;

commit;

-- Hinweis: public.saadi_contacts trägt dieselbe permissive Insert-Policy,
-- gehört aber zu einer anderen Anwendung, die sich dieses Supabase-Projekt
-- teilt — bewusst NICHT angefasst. Die geteilte Datenbank zweier Apps ist ein
-- eigener Punkt für den Audit-Bericht.

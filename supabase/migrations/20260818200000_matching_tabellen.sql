-- Matching-Tool für Suchaufträge (s. src/lib/matching.ts) — die Tabellen fehlten
-- bisher als versionierte Migration, obwohl der Code sie seit dem Rollout des
-- Matching-Cron produktiv nutzt (existieren auf Produktion bereits händisch
-- angelegt). Diese Datei zieht die Doku-Pflicht aus CLAUDE.md nach ("wer
-- Integrationen/zentrale Config anfasst, hält die Migrations-Historie
-- vollständig") und macht Neu-/Klon-Instanzen (white-label, s.
-- docs/white-label-migration.md) lauffähig, ohne die Tabellen von Hand
-- nachzuziehen. IF NOT EXISTS macht sie auf der bestehenden RIEGEL-Produktion
-- zu einem reinen No-Op.
--
-- Spalten exakt gespiegelt aus dem, was lib/matching.ts tatsächlich liest/
-- schreibt (keine Spalte mehr, keine weniger):
--   * matching_seen.estate_id  — runMatching(): .select("estate_id") /
--     .upsert([{estate_id}], {onConflict:"estate_id"}). Baseline "welche
--     Objekt-Ids wurden schon einmal als aktiv gesehen" — braucht sonst
--     nichts außer der Id, deshalb estate_id direkt als Primary Key (kein
--     eigenes id-uuid). first_seen_at NUR hier (wie in der Aufgabe
--     vorgegeben) — nützlich für Debugging/Monitoring ("seit wann online"),
--     matching_sent kennt dagegen keinerlei Zeitfeld im Code, siehe unten.
--   * matching_sent.user_id + estate_id — runMatching(): .select("estate_id")
--     .eq("user_id", userId) / .upsert([{user_id, estate_id}],
--     {onConflict:"user_id,estate_id"}). Reiner Dedupe-Schutz "hat dieser
--     Nutzer dieses Objekt schon per Matching-Mail bekommen" — der Code liest
--     nie ein created_at, also gibt es hier BEWUSST keins (exakt spiegeln,
--     nicht "sinnvoll ergänzen").

create table if not exists public.matching_seen (
  estate_id text primary key,
  first_seen_at timestamptz not null default now()
);

create table if not exists public.matching_sent (
  user_id uuid not null references auth.users on delete cascade,
  estate_id text not null,
  primary key (user_id, estate_id)
);

alter table public.matching_seen enable row level security;
alter table public.matching_sent enable row level security;

-- KEINE Policies — bewusst, analog rechner_events (Migration
-- 20260818143000) und expose_confirmations (20260810205500): Geschrieben UND
-- gelesen wird ausschließlich serverseitig aus lib/matching.ts mit dem
-- service_role-Key (umgeht RLS). RLS an + keine Policy = deny by default für
-- den öffentlichen anon-Key im Browser-Bundle — niemand kann von außen die
-- Matching-Baseline verfälschen oder den Sent-Status auslesen (letzteres
-- wäre ein Datenschutz-relevantes Nutzer→Objekt-Tracking).

comment on table public.matching_seen is
  'Baseline des Matching-Tools: Objekt-Ids, die bereits als aktiv gesehen wurden (Erstlauf seedet nur, keine Mails). Nur service_role.';
comment on table public.matching_sent is
  'Doppelversand-Schutz des Matching-Tools: je Nutzer+Objekt genau ein Eintrag, sobald die Matching-Mail dafür verschickt wurde. Nur service_role.';

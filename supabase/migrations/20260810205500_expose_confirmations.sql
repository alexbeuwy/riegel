-- Sicherheits-Audit 08/2026 — serverseitiges Gate für Exposé-Downloads
--
-- Befund: Der Provisions-Bestätigungs-Flow (§ 312j Abs. 3 BGB, BGH I ZR
-- 159/24 „Button-Lösung") wurde bisher NUR im Client erzwungen. GET
-- /api/expose prüfte allein Login + Objekt-Slug — ein eingeloggter Nutzer
-- konnte jedes provisionspflichtige Exposé per einfachem
--   GET /api/expose?slug=<objekt>  Authorization: Bearer <token>
-- ziehen, ohne je den Bestätigungs-Dialog gesehen oder den Haken gesetzt zu
-- haben. Damit fehlt für diesen Download der nach BGH nötige, dokumentierte
-- Zustimmungsnachweis — die Provisionsvereinbarung ist gegenüber diesem
-- Nutzer nicht mehr belastbar durchsetzbar.
--
-- Fix: /api/expose/confirm persistiert die aktive Bestätigung hier; GET
-- /api/expose liefert provisionspflichtige Exposés nur noch aus, wenn für
-- (Nutzer, Objekt) eine Bestätigung vorliegt. Der Route-Code ist
-- migrations-resilient: solange diese Tabelle fehlt, verhält sich alles wie
-- bisher (kein Nutzer wird ausgesperrt); das Gate aktiviert sich automatisch,
-- sobald die Tabelle existiert.

create table if not exists public.expose_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estate_id text not null,
  estate_slug text,
  provision_text text,
  created_at timestamptz not null default now(),
  unique (user_id, estate_id)
);

alter table public.expose_confirmations enable row level security;

-- KEINE Policy für anon/public: Schreiben und Lesen laufen ausschließlich
-- serverseitig über den service_role-Key (umgeht RLS). Damit ist die Tabelle
-- weder per anon-Key lesbar (kein Abfluss, wer sich für welches Objekt
-- interessiert) noch beschreibbar (keine gefälschten Bestätigungen).

comment on table public.expose_confirmations is
  'Nachweis der aktiven Provisionsbestätigung je (Nutzer, Objekt) vor Exposé-Download — § 312j Abs. 3 BGB / BGH I ZR 159/24. Nur service_role.';

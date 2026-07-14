-- Riegel Immobilien — Supabase-Schema für Konten, Favoriten & Suchaufträge
-- Im RIEGEL-Projekt: Supabase Dashboard → SQL Editor → einfügen → Run.
-- (Auth/E-Mail-Login ist in Supabase standardmäßig aktiv.)

-- 1) Profile (spiegelt auth.users) + Suchprofil/Präferenzen
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  preferences jsonb,            -- Rolle, Objektarten, Regionen, Budget, Zimmer
  early_access boolean default false,  -- Vorab-Zugang vor Veröffentlichung
  created_at timestamptz default now()
);
-- Falls die Tabelle bereits existiert, Spalten nachrüsten:
alter table public.profiles add column if not exists preferences jsonb;
alter table public.profiles add column if not exists early_access boolean default false;
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2) Favoriten (Merkliste)
create table if not exists public.favorites (
  user_id uuid references auth.users on delete cascade,
  estate_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, estate_id)
);
alter table public.favorites enable row level security;
drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Suchaufträge (gespeicherte Suchen + Benachrichtigung)
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  label text,
  query text not null,
  notify boolean default false,
  created_at timestamptz default now(),
  unique (user_id, query)
);
alter table public.saved_searches enable row level security;
drop policy if exists "own searches" on public.saved_searches;
create policy "own searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Bewertungs-/Report-Anfragen — Nachvollziehbarkeit „wer prüft welches Objekt"
--    Jede Adress-Recherche + Report-Anfrage aus dem Rechner wird hier protokolliert.
create table if not exists public.valuation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users on delete set null,
  address text,
  city text,
  postcode text,
  lat double precision,
  lng double precision,
  objektart text,
  wohnflaeche numeric,
  grundflaeche numeric,
  zimmer numeric,
  baujahr int,
  zustand text,
  qualitaet text,
  value_low bigint,
  value_mid bigint,
  value_high bigint,
  price_per_sqm int,
  confidence int,
  report_requested boolean default false,
  name text,
  email text,
  phone text,
  message text
);
alter table public.valuation_requests enable row level security;
-- Insert für alle erlauben (Logging vom Rechner, auch anonym); Lesen NUR service_role
-- (keine select-Policy → anon/authenticated können nicht lesen; Auswertung über Dashboard).
drop policy if exists "insert valuations" on public.valuation_requests;
create policy "insert valuations" on public.valuation_requests
  for insert with check (true);

-- 4b) Leads (Termin- & Kontaktanfragen) — zentral fürs interne Dashboard
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  kind text not null,            -- 'booking' | 'contact'
  name text,
  email text,
  phone text,
  subject text,
  message text,
  detail jsonb
);
alter table public.leads enable row level security;
drop policy if exists "insert leads" on public.leads;
create policy "insert leads" on public.leads
  for insert with check (true);
-- Lesen nur service_role (kein anon-select) → Auswertung über /intern oder Supabase-Editor.

-- 5) Profil automatisch bei Registrierung anlegen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 6) Site-Settings (Key-Value) — z. B. austauschbares Hero-Bild über /intern.
-- Öffentlich LESBAR (enthält nur CDN-URLs, keine sensiblen Daten), aber NUR
-- service_role darf schreiben (keine insert/update-Policy für anon/authenticated
-- → /api/intern/hero-image ist der einzige Schreibweg, hinter dem Admin-Passwort).
create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "read site settings" on public.site_settings;
create policy "read site settings" on public.site_settings
  for select using (true);

-- 7) Blitzverkauf-Bestenliste (/spiel) — monatlich "zurückgesetzt" durch reinen
-- Zeitraum-Filter in der API-Route (WHERE created_at >= Monatsanfang), NICHT
-- durch Löschen — Alex/Riegel behält damit die volle Historie fürs Auswerten
-- der Gewinner. E-Mail ist bewusst OHNE public-select-Policy (nur INSERT für
-- anon erlaubt) — die Bestenliste läuft ausschließlich über /api/game-scores
-- mit dem service_role-Key, dessen Response die E-Mail NIE mit ausliefert.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  player_name text not null,
  score bigint not null,
  sold_count int default 0,
  email text,
  user_id uuid references auth.users on delete set null
);
alter table public.game_scores enable row level security;
drop policy if exists "insert game scores" on public.game_scores;
create policy "insert game scores" on public.game_scores
  for insert with check (true);

-- 8) Feedback ("Auf der Seite kommentieren", feedback-widget.tsx) — von Alex
--    im Supabase-Dashboard → SQL-Editor auszuführen. Nur intern (Team) sichtbar,
--    kein Besucher-Formular: der Insert läuft ausschließlich über /api/feedback
--    mit dem service_role-Key. Deshalb bewusst OHNE public-Policy (weder
--    insert noch select für anon/authenticated) — RLS ist an, aber leer, da
--    service_role RLS ohnehin umgeht. Auswertung über Supabase-Dashboard/Editor.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  page_url text,
  comment text not null,
  area text,
  user_agent text
);
alter table public.feedback enable row level security;

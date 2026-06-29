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

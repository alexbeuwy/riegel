-- Riegel Immobilien — Supabase-Schema für Konten, Favoriten & Suchaufträge
-- Im RIEGEL-Projekt: Supabase Dashboard → SQL Editor → einfügen → Run.
-- (Auth/E-Mail-Login ist in Supabase standardmäßig aktiv.)

-- 1) Profile (spiegelt auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);
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
  created_at timestamptz default now()
);
alter table public.saved_searches enable row level security;
drop policy if exists "own searches" on public.saved_searches;
create policy "own searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Profil automatisch bei Registrierung anlegen
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

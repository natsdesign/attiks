-- ============================================================
-- ATTIKS — Supabase SQL Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Enable UUID extension (already enabled by default on Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- Extended user data linked to Supabase auth.users
-- ============================================================
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  pseudo      text,
  avatar_3d_url text,
  prism_scan_id text,
  diet_goal   jsonb default null,
  created_at  timestamptz default now() not null
);

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PROGRAMS
-- Training programs belonging to a user
-- ============================================================
create table public.programs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.user_profiles(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('force', 'hypertrophie')),
  ppl_block   text not null check (ppl_block in ('push', 'pull', 'legs', 'full')),
  exercises   jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now() not null
);

-- ============================================================
-- SESSIONS
-- A single workout session
-- ============================================================
create table public.sessions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.user_profiles(id) on delete cascade,
  program_id       uuid references public.programs(id) on delete set null,
  date             timestamptz not null default now(),
  duration_minutes integer,
  type             text check (type in ('force', 'hypertrophie')),
  ppl_block        text check (ppl_block in ('push', 'pull', 'legs', 'full')),
  share_card_url   text,
  created_at       timestamptz default now() not null
);

-- ============================================================
-- SETS
-- Individual sets within a session
-- ============================================================
create table public.sets (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  exercise_name text not null,
  set_number    integer not null,
  reps          integer not null,
  weight_kg     numeric(6, 2) not null,
  is_pr         boolean not null default false,
  rest_seconds  integer,
  created_at    timestamptz default now() not null
);

-- Index for fast last-weight lookups
create index idx_sets_exercise_name on public.sets(exercise_name);
create index idx_sets_session_id    on public.sets(session_id);
create index idx_sessions_user_id   on public.sessions(user_id);
create index idx_sessions_date      on public.sessions(date desc);
create index idx_programs_user_id   on public.programs(user_id);

-- ============================================================
-- WEIGH-INS
-- Weekly body weight tracking
-- ============================================================
create table public.weigh_ins (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.user_profiles(id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5, 2) not null,
  created_at timestamptz default now() not null,
  unique (user_id, date)
);

-- ============================================================
-- BODY SCANS (Phase 4 — Prism Labs)
-- ============================================================
create table public.body_scans (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.user_profiles(id) on delete cascade,
  date              date not null,
  prism_scan_id     text,
  avatar_url        text,
  measurements_json jsonb,
  created_at        timestamptz default now() not null
);

-- Feature 3 : type de PR détecté en temps réel ('absolu' | 'reps' | 'volume' | 'streak')
alter table public.sets add column if not exists pr_type text;

-- ============================================================
-- ONBOARDING v2 — nouvelles colonnes user_profiles
-- À exécuter dans Supabase SQL Editor sur les bases existantes
-- ============================================================
alter table public.user_profiles
  add column if not exists first_name        text,
  add column if not exists gender            text check (gender in ('homme', 'femme')),
  add column if not exists age_years         integer,
  add column if not exists height_cm         numeric(5,2),
  add column if not exists weight_kg         numeric(5,2),
  add column if not exists bench_press_kg    numeric(5,2),
  add column if not exists squat_kg          numeric(5,2),
  add column if not exists deadlift_kg       numeric(5,2),
  add column if not exists training_days     integer,
  add column if not exists training_structure text check (training_structure in ('ppl', 'full_body', 'haut_bas', 'je_sais_pas')),
  add column if not exists equipment_type    text check (equipment_type in ('salle_complete', 'petite_salle', 'domicile', 'specifique'));

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own data
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.programs       enable row level security;
alter table public.sessions       enable row level security;
alter table public.sets           enable row level security;
alter table public.weigh_ins      enable row level security;
alter table public.body_scans     enable row level security;

-- user_profiles: users can read/write only their own row
create policy "user_profiles_self"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- programs
create policy "programs_self"
  on public.programs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- sessions
create policy "sessions_self"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- sets: access via session ownership
create policy "sets_self"
  on public.sets for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = sets.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = sets.session_id
        and s.user_id = auth.uid()
    )
  );

-- weigh_ins
create policy "weigh_ins_self"
  on public.weigh_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- body_scans
create policy "body_scans_self"
  on public.body_scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

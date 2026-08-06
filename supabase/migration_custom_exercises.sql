-- ============================================================
-- ATTIKS — Exercices personnalisés (créés par l'utilisateur, sans gif)
-- Exécuter dans Supabase SQL Editor
-- ============================================================

create table if not exists public.custom_exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.user_profiles(id) on delete cascade,
  name          text not null,
  muscle_group  text not null,
  equipment     text,
  created_at    timestamptz default now() not null
);

create index if not exists idx_custom_exercises_user_id on public.custom_exercises(user_id);

-- ── RLS — chaque utilisateur ne voit/modifie que ses exercices ──
alter table public.custom_exercises enable row level security;

create policy "custom_exercises_self"
  on public.custom_exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

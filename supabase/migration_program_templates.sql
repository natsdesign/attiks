-- ============================================================
-- ATTIKS — Programmes vedettes (catalogue "Découvrir")
-- Exécuter dans Supabase SQL Editor
-- ============================================================

create table if not exists public.program_templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  subtitle        text not null,
  goal            text not null,
  level           text not null check (level in ('debutant', 'intermediaire', 'avance')),
  type            text not null check (type in ('force', 'hypertrophie')),
  ppl_block       text not null check (ppl_block in ('push', 'pull', 'legs', 'full')),
  cover_image_url text,
  accent_color    text not null default '#C8F135',
  exercises       jsonb not null default '[]'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz default now() not null
);

create index if not exists idx_program_templates_sort on public.program_templates(sort_order);

-- ── RLS — lecture publique, comme exercises_library ─────────────
alter table public.program_templates enable row level security;

create policy "program_templates_public_read"
  on public.program_templates for select
  using (true);

-- ── Storage bucket : photos de couverture ───────────────────────
insert into storage.buckets (id, name, public)
values ('program-covers', 'program-covers', true)
on conflict (id) do nothing;

create policy "program_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'program-covers');

create policy "program_covers_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'program-covers');

create policy "program_covers_anon_update"
  on storage.objects for update
  using (bucket_id = 'program-covers');

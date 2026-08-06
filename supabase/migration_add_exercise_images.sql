-- ============================================================
-- ATTIKS — Migration : images début/fin par exercice (Higgsfield)
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS image_start_url text,
  ADD COLUMN IF NOT EXISTS image_end_url   text;

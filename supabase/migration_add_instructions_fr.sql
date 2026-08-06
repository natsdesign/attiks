-- ============================================================
-- ATTIKS — Migration : colonne instructions_fr
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS instructions_fr text[];

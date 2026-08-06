-- ============================================================
-- ATTIKS — Migration : colonnes d'enrichissement WorkoutX
-- Exécuter dans Supabase SQL Editor AVANT fetch-exercises.ts
-- ============================================================

ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS difficulty          text,
  ADD COLUMN IF NOT EXISTS calories_per_minute numeric(6,2),
  ADD COLUMN IF NOT EXISTS recommended_sets    text,
  ADD COLUMN IF NOT EXISTS recommended_reps    text,
  ADD COLUMN IF NOT EXISTS secondary_muscles   text[];

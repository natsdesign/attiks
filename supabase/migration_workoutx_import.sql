-- ============================================================
-- ATTIKS — Migration : import WorkoutX (1 327 exercices)
-- Exécuter dans Supabase SQL Editor AVANT import-all-workoutx.ts
-- ============================================================

-- Nouvelles colonnes WorkoutX
ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS workoutx_id   text UNIQUE,
  ADD COLUMN IF NOT EXISTS body_part     text,
  ADD COLUMN IF NOT EXISTS target_muscle text,
  ADD COLUMN IF NOT EXISTS instructions  text[];

-- Libérer les contraintes NOT NULL des colonnes legacy
-- (muscle_primary et category ne s'appliquent pas aux exercices WorkoutX)
ALTER TABLE public.exercises_library
  ALTER COLUMN muscle_primary DROP NOT NULL,
  ALTER COLUMN category       DROP NOT NULL;

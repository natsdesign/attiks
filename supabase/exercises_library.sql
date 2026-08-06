-- ============================================================
-- ATTIKS — Bibliothèque d'exercices
-- Exécuter dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exercises_library (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL,
  muscle_primary   text NOT NULL,
  muscle_secondary text[],
  equipment        text NOT NULL,
  difficulty       text NOT NULL,
  category         text NOT NULL,
  image_url        text,
  created_at       timestamp DEFAULT now()
);

-- Valeurs attendues :
-- muscle_primary / muscle_secondary[] :
--   'pectoraux' | 'dos' | 'epaules' | 'biceps' | 'triceps'
--   'quadriceps' | 'ischio' | 'fessiers' | 'mollets' | 'abdos' | 'avant_bras'
-- equipment : 'barre' | 'halteres' | 'machine' | 'poids_corps' | 'poulie' | 'kettlebell' | 'elastique'
-- difficulty : 'debutant' | 'intermediaire' | 'avance'
-- category   : 'push' | 'pull' | 'legs' | 'full_body' | 'core'

CREATE INDEX IF NOT EXISTS idx_ex_lib_muscle     ON public.exercises_library(muscle_primary);
CREATE INDEX IF NOT EXISTS idx_ex_lib_category   ON public.exercises_library(category);
CREATE INDEX IF NOT EXISTS idx_ex_lib_difficulty ON public.exercises_library(difficulty);
CREATE INDEX IF NOT EXISTS idx_ex_lib_name       ON public.exercises_library(name);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut lire la bibliotheque"
  ON public.exercises_library FOR SELECT
  USING (true);

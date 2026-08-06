-- ============================================================
-- ATTIKS — Migration : enrichissement bibliothèque d'exercices
-- Ajouter les colonnes gif_url, description, tips, common_mistakes
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS gif_url          text,
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS tips             text[],
  ADD COLUMN IF NOT EXISTS common_mistakes  text[];

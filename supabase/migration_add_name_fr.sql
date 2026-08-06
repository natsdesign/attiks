-- Ajouter colonne name_fr pour les traductions françaises des exercices
ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS name_fr text;

-- Index pour la recherche sur name_fr
CREATE INDEX IF NOT EXISTS idx_exercises_library_name_fr
  ON public.exercises_library (name_fr);

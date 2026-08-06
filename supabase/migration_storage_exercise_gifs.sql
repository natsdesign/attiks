-- ============================================================
-- ATTIKS — Supabase Storage : bucket exercise-gifs
-- Exécuter dans Supabase SQL Editor AVANT cache-gifs-supabase.ts
-- ============================================================

-- Créer le bucket public
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-gifs', 'exercise-gifs', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique
CREATE POLICY "gifs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-gifs');

-- Upload via anon key (script d'import)
CREATE POLICY "gifs_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exercise-gifs');

-- Update autorisé (ré-upload éventuel)
CREATE POLICY "gifs_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'exercise-gifs');

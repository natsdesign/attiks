-- ============================================================
-- ATTIKS — Fix ponctuel : lier les 6 photos déjà uploadées
-- Exécuter dans Supabase SQL Editor (une seule fois)
--
-- Contexte : scripts/upload-program-covers.ts a bien uploadé les 6
-- photos dans le bucket program-covers (confirmé), mais le PATCH de
-- cover_image_url a été silencieusement bloqué par RLS : la table
-- program_templates n'a qu'une policy de lecture publique, pas
-- d'écriture publique (volontaire — c'est du contenu éditorial, pas
-- des données utilisateur). Le script utilisait la clé anon (la
-- variable SUPABASE_SERVICE_KEY de .env.local contient en fait une
-- copie de la clé anon, pas la vraie clé service_role — à corriger
-- dans Supabase Dashboard → Settings → API si tu veux que le script
-- fonctionne seul la prochaine fois).
-- ============================================================

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/full-body-debutant.jpg'
  where slug = 'full-body-debutant';

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/push-hypertrophie.jpg'
  where slug = 'push-hypertrophie';

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/force-5x5.jpg'
  where slug = 'force-5x5';

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/perte-de-poids-circuit.jpg'
  where slug = 'perte-de-poids-circuit';

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/upper-lower-intermediaire.jpg'
  where slug = 'upper-lower-intermediaire';

update public.program_templates set cover_image_url =
  'https://qybxmfrchjqwoazhugks.supabase.co/storage/v1/object/public/program-covers/callisthenie-sans-materiel.jpg'
  where slug = 'callisthenie-sans-materiel';

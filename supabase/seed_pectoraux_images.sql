-- ============================================================
-- ATTIKS — Seed images pectoraux (Higgsfield / #DO118)
-- 1. Exécuter d'abord migration_add_exercise_images.sql
-- 2. Exécuter ce fichier dans Supabase SQL Editor
-- ============================================================

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152945_e35ec7e2-29c0-4d30-b977-7658f9ee1931.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152946_f4ae30c6-20cc-46c3-bb9f-085627e237a0.png'
WHERE name = 'Développé couché barre';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152948_54c92692-bf1e-4f76-9ca1-5b5d8e2b7fa2.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152949_bb440176-136a-4956-97c2-e49bb03e36b4.png'
WHERE name = 'Développé couché haltères';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152951_f522bbce-65c5-4e11-a0c1-d089a3174064.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152952_c82ba772-82ca-4029-a089-ed828cad699b.png'
WHERE name = 'Développé incliné barre';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152954_ec4fa617-2123-44c3-8aad-bc3c05c3fd79.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152956_a402d00b-8f7c-4871-8fce-617aae8a692a.png'
WHERE name = 'Développé incliné haltères';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_152957_31597166-89f8-4b99-8d74-bcfc93d98054.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153018_f16e3ce2-276d-4b41-ae40-af12c9db2597.png'
WHERE name = 'Développé décliné';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153020_d2c5b43c-412e-4f98-95f3-f0ebdae74f6d.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153022_4fb064c5-91b6-446a-9231-bcc57ecd11c4.png'
WHERE name = 'Écarté couché';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153024_f6b825fe-2cba-4bc5-916b-38fd3090efc8.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153027_74b407c1-bde9-4ff7-a2ef-482f47060a88.png'
WHERE name = 'Écarté poulie vis-à-vis';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153028_b1402b4a-6a67-40cf-813c-19e6a45234dd.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153041_e6738d7b-acef-416d-84d2-d0dee8ff1181.png'
WHERE name = 'Pompes';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153048_e4f0a28d-3a14-4a21-bf5c-a335a6060e4c.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153050_99edc42c-584c-41ac-8eec-dc19798114a5.png'
WHERE name = 'Dips pectoraux';

UPDATE public.exercises_library SET
  image_start_url = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153051_9a0753ee-d63d-4902-9946-f3f081dcfaf5.png',
  image_end_url   = 'https://d8j0ntlcm91z4.cloudfront.net/user_38AQQUIULUuURGJ7Zic1ibYvTVT/hf_20260701_153052_1699228b-17cd-4cc0-96e1-ddbd354dfcb3.png'
WHERE name = 'Pec deck';

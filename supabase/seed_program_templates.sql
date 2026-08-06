-- ============================================================
-- ATTIKS — Seed : 6 programmes vedettes
-- Exécuter APRÈS migration_program_templates.sql
-- cover_image_url est posé à NULL ici — mis à jour ensuite par
-- scripts/upload-program-covers.ts une fois les photos générées.
-- ============================================================

insert into public.program_templates
  (slug, name, subtitle, goal, level, type, ppl_block, accent_color, sort_order, exercises)
values
(
  'full-body-debutant',
  'Full Body Débutant',
  'Prise en main tout le corps',
  'Prise en main',
  'debutant',
  'hypertrophie',
  'full',
  '#C8F135',
  1,
  '[
    {"name":"Squat gobelet","muscle_group":"Quadriceps","order_index":0,"sets_reps_hint":"3×12"},
    {"name":"Développé couché haltères","muscle_group":"Pectoraux","order_index":1,"sets_reps_hint":"3×10"},
    {"name":"Rowing haltère","muscle_group":"Dos","order_index":2,"sets_reps_hint":"3×10"},
    {"name":"Presse à cuisses","muscle_group":"Quadriceps","order_index":3,"sets_reps_hint":"3×12"},
    {"name":"Élévations latérales","muscle_group":"Épaules","order_index":4,"sets_reps_hint":"3×12"},
    {"name":"Gainage planche","muscle_group":"Abdos","order_index":5,"sets_reps_hint":"3×30s"}
  ]'::jsonb
),
(
  'push-hypertrophie',
  'Push Hypertrophie',
  'Split PPL — jour poussée',
  'Prise de muscle',
  'intermediaire',
  'hypertrophie',
  'push',
  '#C8F135',
  2,
  '[
    {"name":"Développé couché","muscle_group":"Pectoraux","order_index":0,"sets_reps_hint":"4×8-10"},
    {"name":"Développé incliné haltères","muscle_group":"Pectoraux","order_index":1,"sets_reps_hint":"3×10"},
    {"name":"Développé militaire","muscle_group":"Épaules","order_index":2,"sets_reps_hint":"3×8-10"},
    {"name":"Élévations latérales","muscle_group":"Épaules","order_index":3,"sets_reps_hint":"3×12-15"},
    {"name":"Dips","muscle_group":"Triceps","order_index":4,"sets_reps_hint":"3×10-12"},
    {"name":"Extension triceps poulie","muscle_group":"Triceps","order_index":5,"sets_reps_hint":"3×12"}
  ]'::jsonb
),
(
  'force-5x5',
  'Force 5×5',
  'Programme force pure',
  'Force',
  'intermediaire',
  'force',
  'full',
  '#C8F135',
  3,
  '[
    {"name":"Squat barre","muscle_group":"Quadriceps","order_index":0,"sets_reps_hint":"5×5"},
    {"name":"Développé couché barre","muscle_group":"Pectoraux","order_index":1,"sets_reps_hint":"5×5"},
    {"name":"Soulevé de terre","muscle_group":"Dos","order_index":2,"sets_reps_hint":"1×5"},
    {"name":"Rowing barre","muscle_group":"Dos","order_index":3,"sets_reps_hint":"5×5"},
    {"name":"Développé militaire barre","muscle_group":"Épaules","order_index":4,"sets_reps_hint":"5×5"}
  ]'::jsonb
),
(
  'perte-de-poids-circuit',
  'Perte de poids — Circuit',
  'Circuit cardio full body',
  'Perte de poids',
  'debutant',
  'hypertrophie',
  'full',
  '#C8F135',
  4,
  '[
    {"name":"Burpees","muscle_group":"Full body","order_index":0,"sets_reps_hint":"4×45s"},
    {"name":"Squat sauté","muscle_group":"Quadriceps","order_index":1,"sets_reps_hint":"4×15"},
    {"name":"Mountain climbers","muscle_group":"Abdos","order_index":2,"sets_reps_hint":"4×45s"},
    {"name":"Fentes marchées","muscle_group":"Fessiers","order_index":3,"sets_reps_hint":"3×20"},
    {"name":"Gainage dynamique","muscle_group":"Abdos","order_index":4,"sets_reps_hint":"3×40s"},
    {"name":"Corde à sauter","muscle_group":"Mollets","order_index":5,"sets_reps_hint":"5×1min"}
  ]'::jsonb
),
(
  'upper-lower-intermediaire',
  'Upper/Lower Intermédiaire',
  'Split haut du corps',
  'Prise de muscle',
  'intermediaire',
  'hypertrophie',
  'full',
  '#C8F135',
  5,
  '[
    {"name":"Développé couché","muscle_group":"Pectoraux","order_index":0,"sets_reps_hint":"4×8-10"},
    {"name":"Tractions","muscle_group":"Dos","order_index":1,"sets_reps_hint":"4×8-10"},
    {"name":"Développé militaire","muscle_group":"Épaules","order_index":2,"sets_reps_hint":"3×8-10"},
    {"name":"Rowing barre","muscle_group":"Dos","order_index":3,"sets_reps_hint":"3×10"},
    {"name":"Curl haltères","muscle_group":"Biceps","order_index":4,"sets_reps_hint":"3×12"},
    {"name":"Extension triceps","muscle_group":"Triceps","order_index":5,"sets_reps_hint":"3×12"}
  ]'::jsonb
),
(
  'callisthenie-sans-materiel',
  'Callisthénie — Sans matériel',
  'Poids du corps, partout',
  'Poids du corps',
  'debutant',
  'hypertrophie',
  'full',
  '#C8F135',
  6,
  '[
    {"name":"Pompes","muscle_group":"Pectoraux","order_index":0,"sets_reps_hint":"4×12-15"},
    {"name":"Tractions","muscle_group":"Dos","order_index":1,"sets_reps_hint":"4×6-10"},
    {"name":"Dips sur chaise","muscle_group":"Triceps","order_index":2,"sets_reps_hint":"3×12"},
    {"name":"Squats bulgares","muscle_group":"Quadriceps","order_index":3,"sets_reps_hint":"3×12"},
    {"name":"Gainage planche","muscle_group":"Abdos","order_index":4,"sets_reps_hint":"3×40s"},
    {"name":"Mountain climbers","muscle_group":"Abdos","order_index":5,"sets_reps_hint":"3×40s"}
  ]'::jsonb
)
on conflict (slug) do nothing;

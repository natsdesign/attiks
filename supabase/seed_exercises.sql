-- ============================================================
-- ATTIKS — Seed bibliothèque d'exercices (100 exercices)
-- Exécuter APRÈS exercises_library.sql
-- ============================================================

INSERT INTO public.exercises_library
  (name, muscle_primary, muscle_secondary, equipment, difficulty, category)
VALUES

-- ============================================================
-- PECTORAUX (10)
-- ============================================================
('Développé couché barre',       'pectoraux', ARRAY['epaules','triceps'],     'barre',       'intermediaire', 'push'),
('Développé couché haltères',    'pectoraux', ARRAY['epaules','triceps'],     'halteres',    'debutant',      'push'),
('Développé incliné barre',      'pectoraux', ARRAY['epaules','triceps'],     'barre',       'intermediaire', 'push'),
('Développé incliné haltères',   'pectoraux', ARRAY['epaules','triceps'],     'halteres',    'intermediaire', 'push'),
('Développé décliné',            'pectoraux', ARRAY['triceps'],               'barre',       'avance',        'push'),
('Écarté couché',                'pectoraux', ARRAY['epaules'],               'halteres',    'debutant',      'push'),
('Écarté poulie vis-à-vis',      'pectoraux', ARRAY['epaules'],               'poulie',      'intermediaire', 'push'),
('Pompes',                       'pectoraux', ARRAY['epaules','triceps'],     'poids_corps', 'debutant',      'push'),
('Dips pectoraux',               'pectoraux', ARRAY['triceps','epaules'],     'poids_corps', 'intermediaire', 'push'),
('Pec deck',                     'pectoraux', ARRAY[]::text[],                'machine',     'debutant',      'push'),

-- ============================================================
-- DOS (12)
-- ============================================================
('Tractions pronation',               'dos', ARRAY['biceps','epaules'],               'poids_corps', 'intermediaire', 'pull'),
('Tractions supination',              'dos', ARRAY['biceps'],                          'poids_corps', 'intermediaire', 'pull'),
('Rowing barre',                      'dos', ARRAY['biceps','epaules'],               'barre',       'intermediaire', 'pull'),
('Rowing haltère',                    'dos', ARRAY['biceps'],                          'halteres',    'debutant',      'pull'),
('Tirage vertical',                   'dos', ARRAY['biceps'],                          'machine',     'debutant',      'pull'),
('Tirage horizontal',                 'dos', ARRAY['biceps','epaules'],               'machine',     'debutant',      'pull'),
('Soulevé de terre',                  'dos', ARRAY['quadriceps','ischio','fessiers'], 'barre',       'avance',        'pull'),
('Rowing T-bar',                      'dos', ARRAY['biceps'],                          'barre',       'intermediaire', 'pull'),
('Pull-over',                         'dos', ARRAY['pectoraux'],                       'halteres',    'intermediaire', 'pull'),
('Tirage poulie haute prise serrée',  'dos', ARRAY['biceps'],                          'poulie',      'debutant',      'pull'),
('Rowing Yates',                      'dos', ARRAY['biceps'],                          'barre',       'avance',        'pull'),
('Good morning',                      'dos', ARRAY['ischio','fessiers'],              'barre',       'intermediaire', 'pull'),

-- ============================================================
-- ÉPAULES (8)
-- ============================================================
('Développé militaire barre',    'epaules', ARRAY['triceps'],           'barre',    'intermediaire', 'push'),
('Développé militaire haltères', 'epaules', ARRAY['triceps'],           'halteres', 'debutant',      'push'),
('Élévations latérales',         'epaules', ARRAY[]::text[],            'halteres', 'debutant',      'push'),
('Élévations frontales',         'epaules', ARRAY['pectoraux'],         'halteres', 'debutant',      'push'),
('Oiseau',                       'epaules', ARRAY['dos'],               'halteres', 'debutant',      'pull'),
('Arnold press',                 'epaules', ARRAY['triceps','pectoraux'],'halteres', 'intermediaire', 'push'),
('Tirage menton',                'epaules', ARRAY['dos','biceps'],      'barre',    'intermediaire', 'pull'),
('Face pull',                    'epaules', ARRAY['dos'],               'poulie',   'debutant',      'pull'),

-- ============================================================
-- BICEPS (6)
-- ============================================================
('Curl barre',      'biceps', ARRAY['avant_bras'], 'barre',    'debutant', 'pull'),
('Curl haltères',   'biceps', ARRAY['avant_bras'], 'halteres', 'debutant', 'pull'),
('Curl marteau',    'biceps', ARRAY['avant_bras'], 'halteres', 'debutant', 'pull'),
('Curl pupitre',    'biceps', ARRAY[]::text[],     'barre',    'debutant', 'pull'),
('Curl concentré',  'biceps', ARRAY[]::text[],     'halteres', 'debutant', 'pull'),
('Curl poulie',     'biceps', ARRAY['avant_bras'], 'poulie',   'debutant', 'pull'),

-- ============================================================
-- TRICEPS (6)
-- ============================================================
('Extension poulie haute',    'triceps', ARRAY[]::text[],              'poulie',      'debutant',      'push'),
('Dips triceps',              'triceps', ARRAY['epaules','pectoraux'], 'poids_corps', 'debutant',      'push'),
('Extension nuque haltère',   'triceps', ARRAY[]::text[],              'halteres',    'debutant',      'push'),
('Barre au front',            'triceps', ARRAY[]::text[],              'barre',       'intermediaire', 'push'),
('Kickback',                  'triceps', ARRAY[]::text[],              'halteres',    'debutant',      'push'),
('Extension poulie corde',    'triceps', ARRAY[]::text[],              'poulie',      'debutant',      'push'),

-- ============================================================
-- QUADRICEPS (8)
-- ============================================================
('Squat barre',      'quadriceps', ARRAY['fessiers','ischio'],   'barre',      'intermediaire', 'legs'),
('Front squat',      'quadriceps', ARRAY['fessiers','epaules'],  'barre',      'avance',        'legs'),
('Presse à cuisses', 'quadriceps', ARRAY['fessiers'],            'machine',    'debutant',      'legs'),
('Leg extension',    'quadriceps', ARRAY[]::text[],               'machine',    'debutant',      'legs'),
('Fentes avant',     'quadriceps', ARRAY['fessiers','ischio'],   'halteres',   'debutant',      'legs'),
('Fentes bulgares',  'quadriceps', ARRAY['fessiers','ischio'],   'halteres',   'intermediaire', 'legs'),
('Hack squat',       'quadriceps', ARRAY['fessiers'],            'machine',    'intermediaire', 'legs'),
('Squat gobelet',    'quadriceps', ARRAY['fessiers'],            'kettlebell', 'debutant',      'legs'),

-- ============================================================
-- ISCHIO-JAMBIERS (6)
-- ============================================================
('Soulevé de terre roumain',      'ischio', ARRAY['fessiers','dos'],   'barre',       'intermediaire', 'legs'),
('Leg curl allongé',              'ischio', ARRAY[]::text[],            'machine',     'debutant',      'legs'),
('Leg curl assis',                'ischio', ARRAY[]::text[],            'machine',     'debutant',      'legs'),
('Good morning',                  'ischio', ARRAY['dos','fessiers'],   'barre',       'intermediaire', 'legs'),
('Soulevé de terre jambes tendues','ischio', ARRAY['fessiers','dos'],  'barre',       'intermediaire', 'legs'),
('Nordic curl',                   'ischio', ARRAY[]::text[],            'poids_corps', 'avance',        'legs'),

-- ============================================================
-- FESSIERS (6)
-- ============================================================
('Hip thrust',      'fessiers', ARRAY['ischio','quadriceps'],  'barre',       'intermediaire', 'legs'),
('Squat sumo',      'fessiers', ARRAY['quadriceps','ischio'],  'barre',       'intermediaire', 'legs'),
('Fentes',          'fessiers', ARRAY['quadriceps','ischio'],  'poids_corps', 'debutant',      'legs'),
('Kickback poulie', 'fessiers', ARRAY[]::text[],                'poulie',      'debutant',      'legs'),
('Pont fessier',    'fessiers', ARRAY['ischio'],               'poids_corps', 'debutant',      'legs'),
('Abduction hanche','fessiers', ARRAY[]::text[],                'machine',     'debutant',      'legs'),

-- ============================================================
-- MOLLETS (4)
-- ============================================================
('Mollets debout',       'mollets', ARRAY[]::text[], 'machine',     'debutant',      'legs'),
('Mollets assis',        'mollets', ARRAY[]::text[], 'machine',     'debutant',      'legs'),
('Mollets presse',       'mollets', ARRAY[]::text[], 'machine',     'debutant',      'legs'),
('Mollets unijambiste',  'mollets', ARRAY[]::text[], 'poids_corps', 'intermediaire', 'legs'),

-- ============================================================
-- ABDOS / CORE (10)
-- ============================================================
('Crunch',          'abdos', ARRAY[]::text[],         'poids_corps', 'debutant',      'core'),
('Relevé de jambes','abdos', ARRAY['ischio'],         'poids_corps', 'intermediaire', 'core'),
('Planche',         'abdos', ARRAY['epaules','dos'],  'poids_corps', 'debutant',      'core'),
('Russian twist',   'abdos', ARRAY[]::text[],         'poids_corps', 'debutant',      'core'),
('Crunch poulie',   'abdos', ARRAY[]::text[],         'poulie',      'debutant',      'core'),
('Gainage latéral', 'abdos', ARRAY['epaules'],        'poids_corps', 'debutant',      'core'),
('Ab wheel',        'abdos', ARRAY['epaules','dos'],  'poids_corps', 'avance',        'core'),
('Mountain climber','abdos', ARRAY['epaules'],        'poids_corps', 'debutant',      'core'),
('Hollow hold',     'abdos', ARRAY[]::text[],         'poids_corps', 'intermediaire', 'core'),
('V-ups',           'abdos', ARRAY[]::text[],         'poids_corps', 'intermediaire', 'core'),

-- ============================================================
-- AVANT-BRAS (3)
-- ============================================================
('Curl poignet',         'avant_bras', ARRAY[]::text[],          'halteres', 'debutant',      'pull'),
('Curl poignet inversé', 'avant_bras', ARRAY[]::text[],          'halteres', 'debutant',      'pull'),
('Farmer walk',          'avant_bras', ARRAY['dos','epaules'],   'halteres', 'intermediaire', 'full_body'),

-- ============================================================
-- FULL BODY (5)
-- ============================================================
('Burpee',          'quadriceps', ARRAY['pectoraux','epaules','abdos'],    'poids_corps', 'intermediaire', 'full_body'),
('Clean and press', 'epaules',    ARRAY['quadriceps','ischio','dos'],      'barre',       'avance',        'full_body'),
('Thruster',        'quadriceps', ARRAY['epaules','fessiers'],             'barre',       'avance',        'full_body'),
('Kettlebell swing','ischio',     ARRAY['fessiers','dos','epaules'],       'kettlebell',  'intermediaire', 'full_body'),
('Turkish get-up',  'epaules',    ARRAY['abdos','fessiers','quadriceps'],  'kettlebell',  'avance',        'full_body'),

-- ============================================================
-- CARDIO / HIIT (6)
-- ============================================================
('Jumping jacks',    'quadriceps', ARRAY['epaules','mollets'],         'poids_corps', 'debutant',      'full_body'),
('Mountain climber', 'abdos',      ARRAY['epaules','quadriceps'],      'poids_corps', 'debutant',      'full_body'),
('Battle ropes',     'epaules',    ARRAY['dos','abdos'],               'poids_corps', 'intermediaire', 'full_body'),
('Box jump',         'quadriceps', ARRAY['fessiers','mollets'],        'poids_corps', 'intermediaire', 'full_body'),
('Corde à sauter',   'mollets',    ARRAY['quadriceps','epaules'],      'poids_corps', 'debutant',      'full_body'),
('Sprint',           'quadriceps', ARRAY['ischio','mollets','fessiers'],'poids_corps', 'debutant',      'full_body'),

-- ============================================================
-- COMPLÉMENTAIRES (10)
-- ============================================================
('Développé couché prise serrée', 'triceps',    ARRAY['pectoraux','epaules'],              'barre',    'intermediaire', 'push'),
('Câble fly',                     'pectoraux',  ARRAY['epaules'],                          'poulie',   'debutant',      'push'),
('Rowing à un bras câble',        'dos',        ARRAY['biceps'],                           'poulie',   'debutant',      'pull'),
('Shrugs barre',                  'epaules',    ARRAY['avant_bras'],                       'barre',    'debutant',      'pull'),
('Step-up',                       'quadriceps', ARRAY['fessiers','ischio'],                'poids_corps','debutant',    'legs'),
('Fentes inversées',              'quadriceps', ARRAY['fessiers','ischio'],                'halteres', 'debutant',      'legs'),
('Dead bug',                      'abdos',      ARRAY[]::text[],                           'poids_corps','debutant',    'core'),
('Pallof press',                  'abdos',      ARRAY['epaules'],                          'poulie',   'intermediaire', 'core'),
('Dragon flag',                   'abdos',      ARRAY['dos'],                              'poids_corps','avance',      'core'),
('Devil''s press',                'epaules',    ARRAY['pectoraux','fessiers','quadriceps'],'halteres', 'avance',        'full_body');

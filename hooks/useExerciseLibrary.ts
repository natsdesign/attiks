import { useMemo, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LibraryExercise {
  id: string;
  workoutx_id: string | null;
  name: string;
  name_fr: string | null;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
  difficulty: string | null;
  gif_url: string | null;
  instructions: string[] | null;
  instructions_fr: string[] | null;
  secondary_muscles: string[] | null;
  calories_per_minute: number | null;
  recommended_sets: string | null;
  recommended_reps: string | null;
}

export const MUSCLE_FILTERS = [
  { key: 'tous',       label: 'Tous' },
  { key: 'chest',      label: 'Pectoraux' },
  { key: 'back',       label: 'Dos' },
  { key: 'shoulders',  label: 'Épaules' },
  { key: 'upper arms', label: 'Bras' },
  { key: 'upper legs', label: 'Cuisses' },
  { key: 'lower legs', label: 'Mollets' },
  { key: 'waist',      label: 'Abdos' },
  { key: 'lower arms', label: 'Avant-bras' },
  { key: 'cardio',     label: 'Cardio' },
  { key: 'neck',       label: 'Cou' },
];

export const MUSCLE_LABELS: Record<string, string> = {
  'chest':      'Pectoraux',
  'back':       'Dos',
  'shoulders':  'Épaules',
  'upper arms': 'Bras',
  'upper legs': 'Cuisses',
  'lower legs': 'Mollets',
  'waist':      'Abdos',
  'lower arms': 'Avant-bras',
  'cardio':     'Cardio',
  'neck':       'Cou',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  'Barbell':                                    'Barre',
  'Olympic Barbell':                            'Barre olympique',
  'Ez Barbell':                                 'Barre EZ',
  'Trap Bar':                                   'Trap bar',
  'Smith Machine':                              'Smith',
  'Dumbbell':                                   'Haltères',
  'Dumbbell (used As Handles For Deeper Range)': 'Haltères',
  'Dumbbell, Exercise Ball':                    'Haltères + Ballon',
  'Cable':                                      'Poulie',
  'Rope':                                       'Corde',
  'Band':                                       'Élastique',
  'Body Weight':                                'Poids corps',
  'Body Weight (with Resistance Band)':         'Poids corps + Élastique',
  'Weighted':                                   'Lesté',
  'Assisted':                                   'Assisté',
  'Assisted (towel)':                           'Assisté (serviette)',
  'Leverage Machine':                           'Machine',
  'Sled Machine':                               'Luge',
  'Kettlebell':                                 'Kettlebell',
  'Medicine Ball':                              'Médecine-ball',
  'Stability Ball':                             'Ballon swiss',
  'Bosu Ball':                                  'Bosu',
  'Wheel Roller':                               'Roue abdos',
  'Hammer':                                     'Marteau',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     '#4ECDC4',
  intermediate: '#FFD700',
  advanced:     '#FF6B6B',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner:     'Débutant',
  intermediate: 'Intermédiaire',
  advanced:     'Avancé',
};

export function useExerciseLibrary() {
  const [allExercises, setAllExercises] = useState<LibraryExercise[]>([]);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('tous');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    supabase
      .from('exercises_library')
      .select('id,workoutx_id,name,name_fr,body_part,target_muscle,equipment,difficulty,gif_url,instructions,instructions_fr,secondary_muscles,calories_per_minute,recommended_sets,recommended_reps')
      // Les GIFs encore hébergés sur workoutxapp.com ne chargent plus (quota du plan WorkoutX atteint) —
      // on ne montre que les exercices déjà mis en cache sur notre propre stockage Supabase.
      .not('gif_url', 'is', null)
      .not('gif_url', 'ilike', '%workoutxapp%')
      .order('name')
      .limit(2000)
      .then(({ data }) => {
        setAllExercises((data as LibraryExercise[]) ?? []);
        setLoading(false);
      });
  }, []);

  const exercises = useMemo(
    () =>
      allExercises.filter((ex) => {
        const q = search.toLowerCase();
        const matchSearch =
          q === '' ||
          ex.name.toLowerCase().includes(q) ||
          (ex.name_fr?.toLowerCase().includes(q) ?? false) ||
          (ex.target_muscle?.toLowerCase().includes(q) ?? false) ||
          (ex.body_part?.toLowerCase().includes(q) ?? false);
        const matchFilter =
          filter === 'tous' || ex.body_part?.toLowerCase() === filter;
        return matchSearch && matchFilter;
      }),
    [allExercises, search, filter]
  );

  return { exercises, search, setSearch, filter, setFilter, loading };
}

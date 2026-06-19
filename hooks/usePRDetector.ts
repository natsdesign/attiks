import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PRType } from '@/lib/types';

export interface PRHistoricalData {
  // Poids max ever par exercice (PR ABSOLU)
  maxWeightByExercise: Record<string, number>;
  // Poids max par exercice par nb de reps exact (PR REPS)
  maxWeightByExerciseReps: Record<string, Record<number, number>>;
  // Volume max en une séance — sum(reps × weight_kg) (PR VOLUME)
  maxSessionVolume: number;
  // Séances dans les 7 derniers jours, hors séance actuelle (PR STREAK)
  sessionsThisWeek: number;
}

// Fonction pure — appelée à chaque confirmation de série
export function detectPRTypes(
  exerciseName: string,
  weight: number,
  reps: number,
  currentSessionVolume: number,
  isFirstConfirmedSet: boolean,
  data: PRHistoricalData,
): PRType[] {
  const prs: PRType[] = [];

  // PR ABSOLU — poids jamais atteint sur cet exercice
  if (weight > (data.maxWeightByExercise[exerciseName] ?? 0)) {
    prs.push('absolu');
  }

  // PR REPS — meilleur poids pour ce nombre exact de reps
  // (ignoré si déjà PR absolu pour éviter le double badge)
  if (!prs.includes('absolu')) {
    const repMax = data.maxWeightByExerciseReps[exerciseName]?.[reps] ?? 0;
    if (weight > repMax) prs.push('reps');
  }

  // PR VOLUME — volume total de la séance > record historique
  if (currentSessionVolume > data.maxSessionVolume) {
    prs.push('volume');
  }

  // PR STREAK — 6e séance de la semaine, badge sur la 1ère série confirmée
  if (isFirstConfirmedSet && data.sessionsThisWeek >= 5) {
    prs.push('streak');
  }

  return prs;
}

// Hook — charge l'historique au démarrage de la séance
export function usePRDetector(
  userId: string | undefined,
  exerciseNames: string[],
): PRHistoricalData | null {
  const [data, setData] = useState<PRHistoricalData | null>(null);

  useEffect(() => {
    if (!userId || exerciseNames.length === 0) return;

    const load = async () => {
      const [setsRes, volumeRes, weekRes] = await Promise.all([
        // Historique poids pour les exercices de la séance
        supabase
          .from('sets')
          .select('exercise_name, reps, weight_kg, sessions!inner(user_id)')
          .eq('sessions.user_id', userId)
          .in('exercise_name', exerciseNames),

        // Tous les sets pour calculer le volume max par session
        supabase
          .from('sets')
          .select('session_id, reps, weight_kg, sessions!inner(user_id)')
          .eq('sessions.user_id', userId),

        // Séances dans les 7 derniers jours
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Max weight par exercice et par (exercice, reps)
      const maxWeightByExercise: Record<string, number> = {};
      const maxWeightByExerciseReps: Record<string, Record<number, number>> = {};
      for (const s of setsRes.data ?? []) {
        if ((s.weight_kg ?? 0) > (maxWeightByExercise[s.exercise_name] ?? 0)) {
          maxWeightByExercise[s.exercise_name] = s.weight_kg;
        }
        if (!maxWeightByExerciseReps[s.exercise_name]) {
          maxWeightByExerciseReps[s.exercise_name] = {};
        }
        const prev = maxWeightByExerciseReps[s.exercise_name][s.reps] ?? 0;
        if (s.weight_kg > prev) {
          maxWeightByExerciseReps[s.exercise_name][s.reps] = s.weight_kg;
        }
      }

      // Volume max par session
      const volBySession: Record<string, number> = {};
      for (const s of volumeRes.data ?? []) {
        volBySession[s.session_id] =
          (volBySession[s.session_id] ?? 0) + s.reps * s.weight_kg;
      }
      const maxSessionVolume = Object.values(volBySession).reduce(
        (m, v) => Math.max(m, v),
        0,
      );

      setData({
        maxWeightByExercise,
        maxWeightByExerciseReps,
        maxSessionVolume,
        sessionsThisWeek: weekRes.count ?? 0,
      });
    };

    load();
  }, [userId, exerciseNames.join(',')]);

  return data;
}

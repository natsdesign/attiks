import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMusclesForExercise } from '@/lib/muscleMapping';

export const MUSCLE_RED = '#FF3B30';    // 0–24h  : fatigue maximale
export const MUSCLE_ORANGE = '#FF9500'; // 24–36h : en récupération
const RECOVERY_HOURS = 36;

export type MuscleColors = Record<string, typeof MUSCLE_RED | typeof MUSCLE_ORANGE>;

export function useMuscleRecovery(userId: string | undefined): MuscleColors {
  const [colors, setColors] = useState<MuscleColors>({});

  useEffect(() => {
    if (!userId) return;

    const since = new Date();
    since.setHours(since.getHours() - RECOVERY_HOURS);

    supabase
      .from('sets')
      .select('exercise_name, sessions!inner(user_id, date)')
      .eq('sessions.user_id', userId)
      .gte('sessions.date', since.toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        // Pour chaque muscle, on garde la date de la séance la plus récente
        const lastWorked: Record<string, Date> = {};

        for (const row of data as any[]) {
          const sessionDate = new Date(row.sessions.date);
          const muscles = getMusclesForExercise(row.exercise_name);

          for (const muscle of muscles) {
            if (!lastWorked[muscle] || sessionDate > lastWorked[muscle]) {
              lastWorked[muscle] = sessionDate;
            }
          }
        }

        const now = new Date();
        const result: MuscleColors = {};

        for (const [muscle, workedAt] of Object.entries(lastWorked)) {
          const hoursAgo = (now.getTime() - workedAt.getTime()) / 3_600_000;

          if (hoursAgo < 24) {
            result[muscle] = MUSCLE_RED;
          } else if (hoursAgo < RECOVERY_HOURS) {
            result[muscle] = MUSCLE_ORANGE;
          }
        }

        setColors(result);
      });
  }, [userId]);

  return colors;
}

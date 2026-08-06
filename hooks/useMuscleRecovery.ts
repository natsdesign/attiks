import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMusclesForExercise } from '@/lib/muscleMapping';

export const MUSCLE_RED    = '#FF4444';  // < 24h   : fatigue maximale
export const MUSCLE_ORANGE = '#FF8C00';  // 24–48h  : en récupération
export const MUSCLE_YELLOW = '#FFD700';  // 48–72h  : presque prêt
export const MUSCLE_GREEN  = '#C8F135';  // 72h–7j  : récupéré, prêt

const RECOVERY_WINDOW_HOURS = 168; // 7 jours

export type MuscleColors = Record<string, string>;

export function useMuscleRecovery(userId: string | undefined): MuscleColors {
  const [colors, setColors] = useState<MuscleColors>({});

  useEffect(() => {
    if (!userId) return;

    const since = new Date();
    since.setHours(since.getHours() - RECOVERY_WINDOW_HOURS);

    supabase
      .from('sets')
      .select('exercise_name, sessions!inner(user_id, date)')
      .eq('sessions.user_id', userId)
      .gte('sessions.date', since.toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) return;

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
          } else if (hoursAgo < 48) {
            result[muscle] = MUSCLE_ORANGE;
          } else if (hoursAgo < 72) {
            result[muscle] = MUSCLE_YELLOW;
          } else {
            result[muscle] = MUSCLE_GREEN;
          }
        }

        setColors(result);
      });
  }, [userId]);

  return colors;
}

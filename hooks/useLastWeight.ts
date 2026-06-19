import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProgressionSuggestion, ProgressionReason } from '@/lib/types';

// Hook simple : dernier poids utilisé pour un exercice
export function useLastWeight(userId: string | undefined, exerciseName: string) {
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !exerciseName) return;
    supabase
      .from('sets')
      .select('weight_kg, sessions!inner(user_id, date)')
      .eq('sessions.user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('sessions(date)', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setLastWeight(data.weight_kg);
      });
  }, [userId, exerciseName]);

  return lastWeight;
}

interface SetRecord {
  reps: number;
  weight_kg: number;
}

// Calcule la suggestion de progression pour un exercice.
// n1 = dernière séance, n2 = avant-dernière, n3 = pénultième (détecte 2 échecs consécutifs)
export function computeProgression(
  n1Sets: SetRecord[],
  n2Sets: SetRecord[],
  n3Sets?: SetRecord[],
): ProgressionSuggestion[] | null {
  if (!n1Sets?.length || !n2Sets?.length) return null;

  // Toutes les séries de N-1 ont atteint ou dépassé les reps de N-2 ?
  const n1AllSuccess = n1Sets.every((s, idx) => {
    const ref = n2Sets[idx];
    return ref ? s.reps >= ref.reps : true;
  });

  // N-2 avait-elle aussi des échecs par rapport à N-3 ?
  const n2HadFailures = n3Sets?.length
    ? n2Sets.some((s, idx) => {
        const ref = n3Sets[idx];
        return ref ? s.reps < ref.reps : false;
      })
    : false;

  let reason: ProgressionReason;
  if (n1AllSuccess) {
    reason = 'augmentation';
  } else if (n2HadFailures) {
    reason = 'réduction';
  } else {
    reason = 'maintien';
  }

  return n1Sets.map((s) => {
    let suggestedWeight: number;
    if (reason === 'augmentation') {
      suggestedWeight = s.weight_kg + 2.5;
    } else if (reason === 'réduction') {
      // -5%, arrondi au 0.5 kg le plus proche
      suggestedWeight = Math.round(s.weight_kg * 0.95 * 2) / 2;
    } else {
      suggestedWeight = s.weight_kg;
    }
    return { weight_kg: suggestedWeight, reps: s.reps, reason };
  });
}

import { useMuscleRecovery, MUSCLE_RED, MUSCLE_ORANGE, MuscleColors } from './useMuscleRecovery';

export interface RecoveryScore {
  score: number;
  message: string;
  muscleColors: MuscleColors;
}

function computeScore(colors: MuscleColors): number {
  const muscles = Object.values(colors);
  if (muscles.length === 0) return 95;
  const red = muscles.filter((c) => c === MUSCLE_RED).length;
  const orange = muscles.filter((c) => c === MUSCLE_ORANGE).length;
  return Math.max(30, Math.round(95 - red * 8 - orange * 4));
}

function getMessage(score: number): string {
  if (score >= 85) return 'Corps bien récupéré, tu peux pousser';
  if (score >= 65) return 'Récupération en cours, reste raisonnable';
  return 'Corps fatigué, séance légère conseillée';
}

export function useRecoveryScore(userId: string | undefined): RecoveryScore {
  const muscleColors = useMuscleRecovery(userId);
  const score = computeScore(muscleColors);
  return { score, message: getMessage(score), muscleColors };
}

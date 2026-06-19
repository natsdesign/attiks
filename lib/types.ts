export type PplBlock = 'push' | 'pull' | 'legs' | 'full';
export type SessionType = 'force' | 'hypertrophie';

export interface Exercise {
  name: string;
  muscle_group: string;
  order_index: number;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  type: SessionType;
  ppl_block: PplBlock;
  exercises: Exercise[];
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  program_id: string | null;
  date: string;
  duration_minutes: number | null;
  type: SessionType | null;
  ppl_block: PplBlock | null;
  share_card_url: string | null;
  sets?: Set[];
  program?: Program;
}

export interface Set {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  is_pr: boolean;
  pr_type: PRType | null;
  rest_seconds: number | null;
}

export interface WeighIn {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
}

export interface UserProfile {
  id: string;
  email: string;
  pseudo: string | null;
  diet_goal: Record<string, unknown> | null;
  created_at: string;
}

export type PRType = 'absolu' | 'reps' | 'volume' | 'streak';

export type ProgressionReason = 'augmentation' | 'maintien' | 'réduction';

export interface ProgressionSuggestion {
  weight_kg: number;
  reps: number;
  reason: ProgressionReason;
}

// In-session state types
export interface ActiveSet {
  exercise_name: string;
  set_number: number;
  reps: string;
  weight_kg: string;
}

export interface SessionExercise {
  name: string;
  muscle_group: string;
  sets: ActiveSet[];
}

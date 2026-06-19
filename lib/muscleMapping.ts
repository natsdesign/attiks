export type MuscleId = string;

const MAPPINGS: Array<{ keywords: string[]; muscles: MuscleId[] }> = [
  // ── PUSH ──────────────────────────────────────────────────────────────────
  {
    keywords: ['développé couché', 'bench press', 'bench plat', 'développé plat', 'chest press', 'développe couche'],
    muscles: ['pec', 'pec-2', 'triceps', 'delt-right', 'delt-left'],
  },
  {
    keywords: ['développé incliné', 'incline bench', 'incline press', 'développé haut', 'incliné'],
    muscles: ['pec', 'pec-2', 'delt-right', 'delt-left', 'triceps'],
  },
  {
    keywords: ['développé décliné', 'decline bench', 'décliné'],
    muscles: ['pec', 'pec-2', 'triceps'],
  },
  {
    keywords: ['développé épaules', 'shoulder press', 'ohp', 'presse militaire', 'press militaire', 'développé militaire', 'arnold press', 'overhead press', 'développe epaules', 'military press'],
    muscles: ['delt-right', 'delt-left', 'trapezius-front', 'triceps'],
  },
  {
    keywords: ['élévation latérale', 'lateral raise', 'élévations latérales', 'elevation laterale'],
    muscles: ['delt-right', 'delt-left'],
  },
  {
    keywords: ['élévation frontale', 'front raise', 'élévations frontales', 'elevation frontale'],
    muscles: ['delt-right', 'delt-left'],
  },
  {
    keywords: ['tricep', 'extension triceps', 'pushdown', 'skull crusher', 'barre front', 'extensions bras'],
    muscles: ['triceps'],
  },
  {
    keywords: ['dips'],
    muscles: ['pec', 'pec-2', 'triceps', 'delt-right', 'delt-left'],
  },
  {
    keywords: ['pompe', 'push-up', 'pushup', 'pompes'],
    muscles: ['pec', 'pec-2', 'triceps', 'delt-right', 'delt-left'],
  },
  {
    keywords: ['pec deck', 'butterfly', 'chest fly', 'écarté couché', 'écartés', 'cable fly', 'cross-over', 'crossover'],
    muscles: ['pec', 'pec-2'],
  },

  // ── PULL ──────────────────────────────────────────────────────────────────
  {
    keywords: ['traction', 'pull-up', 'pullup', 'chin-up', 'chinup', 'tractions'],
    muscles: ['lats', 'biceps', 'biceps-right', 'trapezius'],
  },
  {
    keywords: ['rowing barre', 'barbell row', 'rowing haltère', 'pendlay row', 't-bar row', 'rowing'],
    muscles: ['lats', 'trapezius', 'biceps', 'biceps-right', 'lumbar'],
  },
  {
    keywords: ['tirage poulie', 'lat pulldown', 'tirage vertical', 'tirage nuque', 'tirage poitrine'],
    muscles: ['lats', 'biceps', 'biceps-right'],
  },
  {
    keywords: ['tirage horizontal', 'cable row', 'seated row', 'tirage assis', 'low row'],
    muscles: ['lats', 'trapezius', 'biceps', 'biceps-right'],
  },
  {
    keywords: ['curl bicep', 'bicep curl', 'curl barre', 'curl haltère', 'curl ez', 'bicep curl', 'curl halter'],
    muscles: ['biceps', 'biceps-right'],
  },
  {
    keywords: ['curl marteau', 'hammer curl', 'marteau'],
    muscles: ['biceps', 'biceps-right'],
  },
  {
    keywords: ['curl concentré', 'concentration curl', 'curl incliné', 'curl cable'],
    muscles: ['biceps', 'biceps-right'],
  },
  {
    keywords: ['face pull'],
    muscles: ['trapezius', 'delt'],
  },
  {
    keywords: ['oiseau', 'reverse fly', 'écarté penché', 'rear delt'],
    muscles: ['delt', 'trapezius'],
  },
  {
    keywords: ['shrug', 'haussement'],
    muscles: ['trapezius', 'trapezius-front'],
  },
  {
    keywords: ['pull over', 'pullover'],
    muscles: ['lats', 'pec', 'pec-2'],
  },

  // ── LEGS ──────────────────────────────────────────────────────────────────
  {
    keywords: ['squat', 'back squat', 'front squat', 'squat goblet', 'squat barre'],
    muscles: ['quadriceps', 'gluteus', 'gluteus-front', 'harmstring'],
  },
  {
    keywords: ['hack squat'],
    muscles: ['quadriceps', 'gluteus', 'gluteus-front'],
  },
  {
    keywords: ['presse', 'leg press', 'presse à cuisses'],
    muscles: ['quadriceps', 'gluteus', 'gluteus-front'],
  },
  {
    keywords: ['fente', 'lunge', 'fentes', 'lunges', 'fentes marchées'],
    muscles: ['quadriceps', 'gluteus', 'gluteus-front', 'harmstring'],
  },
  {
    keywords: ['bulgarian', 'split squat'],
    muscles: ['quadriceps', 'gluteus', 'gluteus-front', 'harmstring'],
  },
  {
    keywords: ['soulevé de terre', 'deadlift', 'rdl', 'sdt', 'romanian deadlift', 'sumo deadlift'],
    muscles: ['harmstring', 'gluteus', 'gluteus-front', 'lumbar', 'trapezius'],
  },
  {
    keywords: ['leg curl', 'ischio', 'leg flexion', 'curl jambe'],
    muscles: ['harmstring'],
  },
  {
    keywords: ['leg extension', 'extension quadriceps', 'extension jambe'],
    muscles: ['quadriceps'],
  },
  {
    keywords: ['hip thrust', 'glute bridge', 'pont fessier', 'hip hinge'],
    muscles: ['gluteus', 'gluteus-front', 'harmstring'],
  },
  {
    keywords: ['mollet', 'calf raise', 'standing calf', 'seated calf', 'mollets'],
    muscles: ['calves', 'calves-front'],
  },
  {
    keywords: ['abducteur', 'adducteur', 'inner thigh'],
    muscles: ['adductor', 'gracilis'],
  },

  // ── CORE ──────────────────────────────────────────────────────────────────
  {
    keywords: ['crunch', 'abdominaux', 'sit-up', 'situp', 'crunchs'],
    muscles: ['abs'],
  },
  {
    keywords: ['gainage', 'planche', 'plank', 'gainage latéral', 'side plank'],
    muscles: ['abs', 'oblique'],
  },
  {
    keywords: ['russian twist', 'oblique', 'bois bûcheron', 'wood chop'],
    muscles: ['oblique', 'abs'],
  },
  {
    keywords: ['relevé de jambes', 'leg raise', 'ab wheel', 'roue abdominale', 'dragon flag'],
    muscles: ['abs'],
  },

  // ── DOS LOMBAIRES ─────────────────────────────────────────────────────────
  {
    keywords: ['good morning', 'back extension', 'hyperextension'],
    muscles: ['lumbar', 'harmstring', 'gluteus', 'gluteus-front'],
  },
  {
    keywords: ['superman'],
    muscles: ['lumbar', 'gluteus', 'gluteus-front'],
  },
];

export function getMusclesForExercise(exerciseName: string): MuscleId[] {
  const normalized = exerciseName.toLowerCase().trim();
  const matched = new Set<MuscleId>();

  for (const { keywords, muscles } of MAPPINGS) {
    if (keywords.some((kw) => normalized.includes(kw.toLowerCase()))) {
      muscles.forEach((m) => matched.add(m));
    }
  }

  return Array.from(matched);
}

/**
 * scripts/translate-exercises.ts
 * Traduit exercise.name → name_fr via règles déterministes (aucun API externe).
 * Reprend là où ça s'est arrêté (name_fr IS NULL uniquement).
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/translate-exercises.ts
 *   npx tsx --env-file=.env.local scripts/translate-exercises.ts --dry-run
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const DRY_RUN      = process.argv.includes('--dry-run');
const FORCE_ALL    = process.argv.includes('--all'); // retraduire même les exercices déjà traduits
const PREVIEW_N    = 20;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE manquant'); process.exit(1); }

// ─────────────────────────────────────────────────────────────────
// RÈGLES DE TRADUCTION (ordre = priorité)
// Chaque règle : [regex, remplacement] — appliquées séquentiellement sur le nom
// ─────────────────────────────────────────────────────────────────

// Équipement (appliqué EN PREMIER)
const EQUIPMENT_RULES: [RegExp, string][] = [
  [/\bBarbell\b/gi,          'Barre'],
  [/\bDumbbells?\b/gi,       'Haltères'],
  [/\bKettlebell\b/gi,       'Kettlebell'],
  [/\bSmith\b/gi,            'Smith'],
  [/\bCable\b/gi,            'Poulie'],
  [/\bEz[\s-]?[Bb]arbell?\b/gi, 'Barre EZ'],
  [/\bOlympic Barbell\b/gi,  'Barre olympique'],
  [/\bTrap Bar\b/gi,         'Trap Bar'],
  [/\bBand\b/gi,             'Élastique'],
  [/\bRope\b/gi,             'Corde'],
  [/\bLever\b/gi,            'Machine'],
  [/\bSled\b/gi,             'Luge'],
  [/\bMedicine Ball\b/gi,    'Médecine-ball'],
  [/\bStability Ball\b/gi,   'Ballon swiss'],
  [/\bBosu Ball\b/gi,        'Bosu'],
  [/\bExercise Ball\b/gi,    'Ballon'],
  [/\bResistance Band\b/gi,  'Élastique'],
  [/\bWheel Roller\b/gi,     'Roue abdos'],
  [/\bRoller\b/gi,           'Roue'],
  [/\bHammer\b(?! Curl)/gi,  'Marteau'],
];

// Position / style
const POSITION_RULES: [RegExp, string][] = [
  [/\bIncline\b/gi,          'Incliné'],
  [/\bDecline\b/gi,          'Décliné'],
  [/\bSeated\b/gi,           'Assis'],
  [/\bStanding\b/gi,         'Debout'],
  [/\bLying\b/gi,            'Allongé'],
  [/\bProne\b/gi,            'Allongé face contre terre'],
  [/\bSupine\b/gi,           'Allongé sur le dos'],
  [/\bKneeling\b/gi,         'À genoux'],
  [/\bOne[\s-]?Arm\b/gi,     'Un bras'],
  [/\bSingle[\s-]?Arm\b/gi,  'Un bras'],
  [/\bSingle[\s-]?Leg\b/gi,  'Une jambe'],
  [/\bOne[\s-]?Leg\b/gi,     'Une jambe'],
  [/\bAlternate\b/gi,        'Alterné'],
  [/\bAlternating\b/gi,      'Alterné'],
  [/\bWide[\s-]?Grip\b/gi,   'Prise large'],
  [/\bClose[\s-]?Grip\b/gi,  'Prise serrée'],
  [/\bNarrow[\s-]?Grip\b/gi, 'Prise serrée'],
  [/\bReverse[\s-]?Grip\b/gi,'Prise inversée'],
  [/\bParallel[\s-]?Grip\b/gi,'Prise neutre'],
  [/\bNeutral[\s-]?Grip\b/gi,'Prise neutre'],
  [/\bOverhand\b/gi,         'Prise pronation'],
  [/\bUnderhand\b/gi,        'Prise supination'],
  [/\bDouble\b/gi,           'Double'],
  [/\bTwo[\s-]?Arm\b/gi,     'Deux bras'],
  [/\bTwo[\s-]?One\b/gi,     'Deux-un'],
];

// Mouvements principaux — ordre important (plus spécifique d'abord)
const MOVEMENT_RULES: [RegExp, string][] = [
  // Bench Press spécifiques
  [/\bBench Press\b/gi,          'Développé couché'],
  [/\bFloor Press\b/gi,          'Développé au sol'],
  [/\bChest Press\b/gi,          'Développé poitrine'],
  [/\bShoulder Press\b/gi,       'Développé épaules'],
  [/\bOverhead Press\b/gi,       'Développé militaire'],
  [/\bMilitary Press\b/gi,       'Développé militaire'],
  [/\bBradford Press\b/gi,       'Bradford Press'],
  [/\bPush Press\b/gi,           'Push Press'],
  [/\bScott Press\b/gi,          'Scott Press'],
  // Press générique (après les spécifiques)
  [/\bPress\b/gi,                'Développé'],

  // Pull-up / Chin-up
  [/\bPull-?up\b/gi,             'Traction'],
  [/\bChin-?up\b/gi,             'Traction supination'],
  [/\bPulldown\b/gi,             'Tirage vertical'],
  [/\bPull[\s-]?down\b/gi,       'Tirage vertical'],
  [/\bPullover\b/gi,             'Pullover'],

  // Push-up
  [/\bPush-?up\b/gi,             'Pompe'],

  // Row / tirage horizontal
  [/\bBent[\s-]?Over[\s-]?Row\b/gi, 'Rowing penché'],
  [/\bPendlay Row\b/gi,          'Rowing Pendlay'],
  [/\bSeated Row\b/gi,           'Rowing assis'],
  [/\bRow\b/gi,                  'Rowing'],

  // Deadlift
  [/\bRomanian Deadlift\b/gi,    'Soulevé de terre roumain'],
  [/\bStraight[\s-]?Leg Deadlift\b/gi, 'Soulevé de terre jambes tendues'],
  [/\bStiff[\s-]?Leg Deadlift\b/gi,    'Soulevé de terre jambes tendues'],
  [/\bSingle[\s-]?Leg Deadlift\b/gi,   'Soulevé de terre une jambe'],
  [/\bSumo Deadlift\b/gi,        'Soulevé de terre sumo'],
  [/\bDeadlift\b/gi,             'Soulevé de terre'],

  // Squat
  [/\bFront Squat\b/gi,          'Squat avant'],
  [/\bHack Squat\b/gi,           'Hack Squat'],
  [/\bGoblet Squat\b/gi,         'Goblet Squat'],
  [/\bSplit Squat\b/gi,          'Squat fendu'],
  [/\bOverhead Squat\b/gi,       'Squat au-dessus tête'],
  [/\bSissy Squat\b/gi,          'Sissy Squat'],
  [/\bSquat\b/gi,                'Squat'],

  // Curl
  [/\bPreacher Curl\b/gi,        'Curl pupitre'],
  [/\bSpider Curl\b/gi,          'Curl araignée'],
  [/\bHammer Curl\b/gi,          'Curl marteau'],
  [/\bZottman Curl\b/gi,         'Curl Zottman'],
  [/\bConcentration Curl\b/gi,   'Curl concentration'],
  [/\bReverse Curl\b/gi,         'Curl prise inversée'],
  [/\bBiceps Curl\b/gi,          'Curl biceps'],
  [/\bBicep Curl\b/gi,           'Curl biceps'],
  [/\bCurl\b/gi,                 'Curl'],

  // Dip
  [/\bDips?\b/gi,                'Dips'],
  [/\bChest Dip\b/gi,            'Dips poitrine'],

  // Lunge / Fente
  [/\bReverse Lunge\b/gi,        'Fente arrière'],
  [/\bForward Lunge\b/gi,        'Fente avant'],
  [/\bLateral Lunge\b/gi,        'Fente latérale'],
  [/\bWalking Lunge\b/gi,        'Fentes en marche'],
  [/\bLunge\b/gi,                'Fente'],

  // Fly / Écarté
  [/\bFlye?\b/gi,                'Écarté'],
  [/\bRear[\s-]?Delt\b/gi,       'Deltoïde postérieur'],

  // Plank / Gainage
  [/\bSide Plank\b/gi,           'Gainage latéral'],
  [/\bFront Plank\b/gi,          'Gainage avant'],
  [/\bPlank\b/gi,                'Gainage'],

  // Crunch / Abdos
  [/\bReverse Crunch\b/gi,       'Crunch inversé'],
  [/\bDecline Crunch\b/gi,       'Crunch décliné'],
  [/\bOblique Crunch\b/gi,       'Crunch oblique'],
  [/\bBicycle Crunch\b/gi,       'Crunch vélo'],
  [/\bCrunch\b/gi,               'Crunch'],

  // Raise / Élévation
  [/\bLateral Raise\b/gi,        'Élévation latérale'],
  [/\bFront Raise\b/gi,          'Élévation frontale'],
  [/\bRear[\s-]?Delt Raise\b/gi, 'Élévation postérieure'],
  [/\bLeg Raise\b/gi,            'Élévation des jambes'],
  [/\bKnee Raise\b/gi,           'Relevé de genoux'],
  [/\bRaise\b/gi,                'Élévation'],

  // Extension
  [/\bLeg Extension\b/gi,        'Extension des jambes'],
  [/\bBack Extension\b/gi,       'Extension du dos'],
  [/\bHip Extension\b/gi,        'Extension de hanche'],
  [/\bTriceps Extension\b/gi,    'Extension triceps'],
  [/\bExtension\b/gi,            'Extension'],

  // Step
  [/\bStep[\s-]?Up\b/gi,         'Step-up'],
  [/\bStep[\s-]?Down\b/gi,       'Step-down'],

  // Hip Thrust
  [/\bHip Thrust\b/gi,           'Hip Thrust'],
  [/\bGlute Bridge\b/gi,         'Pont fessier'],

  // Upright Row
  [/\bUpright Row\b/gi,          'Rowing vertical'],

  // Calf
  [/\bCalf Raise\b/gi,           'Mollet debout'],
  [/\bCalf Press\b/gi,           'Presse mollets'],

  // Leg Press
  [/\bLeg Press\b/gi,            'Presse à cuisses'],
  [/\bLeg Curl\b/gi,             'Curl ischios'],
  [/\bLeg[\s-]?Kickback\b/gi,    'Kickback fessier'],

  // Misc courants
  [/\bTricep[s]?\b/gi,           'Triceps'],
  [/\bBicep[s]?\b/gi,            'Biceps'],
  [/\bHip Adduction\b/gi,        'Adduction hanche'],
  [/\bHip Abduction\b/gi,        'Abduction hanche'],
  [/\bInverse Leg Curl\b/gi,     'Curl ischios inversé'],
  [/\bGood Morning\b/gi,         'Good Morning'],
  [/\bFace Pull\b/gi,            'Face Pull'],
  [/\bPallof Press\b/gi,         'Pallof Press'],
  [/\bFarmer['']?s? Walk\b/gi,  "Farmer's Walk"],
  [/\bTurkish Get[\s-]?Up\b/gi,  'Turkish Get Up'],
  [/\bClean And Press\b/gi,      'Arraché-poussé'],
  [/\bHigh Row\b/gi,             'Rowing en hauteur'],
  [/\bT[\s-]?Bar Row\b/gi,       'Rowing T-Bar'],
  [/\bSit[\s-]?Up\b/gi,         'Relevé de buste'],
  [/\bCurl[\s-]?Up\b/gi,        'Relevé de buste'],
  [/\bJump Squat\b/gi,           'Squat sauté'],
  [/\bBox Jump\b/gi,             'Saut sur box'],
  [/\bBurpee\b/gi,               'Burpee'],
  [/\bMountain Climber\b/gi,     'Grimpeur'],
];

// Modificateurs — uniquement les termes fitness qui ne causent pas d'effets de bord
const MODIFIER_RULES: [RegExp, string][] = [
  // Multi-mots (avant les simples)
  [/\bSelf[\s-]Assisted\b/gi,            'Auto-assisté'],
  [/\bBody[\s-]?Weight\b/gi,             'Poids de corps'],
  [/\bAnti[\s-]?Gravity\b/gi,            'Anti-gravité'],
  [/\bBehind[\s-]?the[\s-]?Neck\b/gi,   'Derrière la nuque'],
  [/\bBehind[\s-]?Head\b/gi,            'Derrière la tête'],
  [/\bCross[\s-]?Body\b/gi,             'Croisé'],
  [/\bPalms[\s-]?Up\b/gi,              'Paumes en haut'],
  [/\bPalms[\s-]?Down\b/gi,            'Paumes en bas'],
  [/\bPalms[\s-]?In\b/gi,              'Paumes intérieur'],
  [/\bStationary Bike\b/gi,            'Vélo stationnaire'],
  [/\bUpper Body Ergometer\b/gi,       'Ergomètre bras'],
  [/\bSide Bend\b/gi,                  'Flexion latérale'],
  [/\bLateral Raise\b/gi,              'Élévation latérale'],  // sécurité doublons

  // Simples — uniquement termes fitness non-ambigus
  [/\bWeighted\b/gi,      'Lesté'],
  [/\bAssisted\b/gi,      'Assisté'],
  [/\bSuspended\b/gi,     'Suspendu'],
  [/\bInverted\b/gi,      'Inversé'],
  [/\bInverse\b/gi,       'Inversé'],
  [/\bScapular?\b/gi,     'Scapulaire'],
  [/\bRomanian\b/gi,      'Roumain'],
  [/\bIsometric\b/gi,     'Isométrique'],
  [/\bPlyometric\b/gi,    'Pliométrique'],
  [/\bExplosive\b/gi,     'Explosif'],
  [/\bHanging\b/gi,       'En suspension'],
  [/\bLateral\b/gi,       'Latéral'],
  [/\bVertical\b/gi,      'Vertical'],
  [/\bHorizontal\b/gi,    'Horizontal'],
  [/\bDiagonal\b/gi,      'Diagonal'],
  [/\bGlutes?\b/gi,       'Fessier'],
  [/\bHamstrings?\b/gi,   'Ischio-jambier'],
  [/\bQuads?\b/gi,        'Quadriceps'],
  [/\bCalves\b/gi,        'Mollets'],
  [/\bCalf\b/gi,          'Mollet'],
  [/\bObliques?\b/gi,     'Oblique'],
  [/\bStretch\b/gi,       'Étirement'],
  [/\bFlexion\b/gi,       'Flexion'],
  [/\bMale\b/gi,          '(H)'],
  [/\bFemale\b/gi,        '(F)'],
  // Machines cardio
  [/\bElliptical\b/gi,    'Elliptique'],
  [/\bStepmill\b/gi,      'Stepper'],
  [/\bSkierg\b/gi,        'Skierg'],
  [/\bTire\b/gi,          'Pneu'],
];

// Nettoyage final
function cleanup(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.])/g, '$1')
    .replace(/V\. (\d)/g, 'v.$1')
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// Fonction principale de traduction
// Format cible : [Mouvement principal] [variante/position] [équipement]
// ─────────────────────────────────────────────────────────────────
function translate(name: string): string {
  let s = name;
  const equipParts: string[] = [];

  // Étape 1 : extraire et retirer les mots d'équipement du nom
  // → ils seront réajoutés en fin de chaîne (lowercase)
  for (const [re, rep] of EQUIPMENT_RULES) {
    const fr = rep;
    s = s.replace(re, () => { equipParts.push(fr.toLowerCase()); return ''; });
  }
  s = s.replace(/\s+/g, ' ').trim();

  // Étape 2 : appliquer position, mouvement, modificateurs sur le reste
  for (const [re, rep] of POSITION_RULES)  s = s.replace(re, rep);
  for (const [re, rep] of MOVEMENT_RULES)  s = s.replace(re, rep);
  for (const [re, rep] of MODIFIER_RULES)  s = s.replace(re, rep);

  // Étape 3 : ajouter l'équipement à la fin
  if (equipParts.length > 0) s = s + ' ' + [...new Set(equipParts)].join(' ');

  return cleanup(s);
}

// ─────────────────────────────────────────────────────────────────
// Supabase helpers
// ─────────────────────────────────────────────────────────────────
async function fetchExercises(forceAll: boolean): Promise<{ id: string; name: string }[]> {
  const rows: any[] = [];
  let from = 0;
  const filter = forceAll ? '' : '&name_fr=is.null';
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises_library?select=id,name${filter}&order=name&offset=${from}&limit=500`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const page: any[] = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < 500) break;
    from += 500;
  }
  return rows;
}

async function batchUpdate(updates: { id: string; name_fr: string }[]): Promise<void> {
  // Upsert par lot via PATCH individuel (PostgREST ne supporte pas PATCH multi-row)
  await Promise.all(
    updates.map(({ id, name_fr }) =>
      fetch(`${SUPABASE_URL}/rest/v1/exercises_library?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ name_fr }),
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
(async () => {
  const mode = DRY_RUN ? ' [DRY RUN]' : '';
  const scope = FORCE_ALL ? ' [TOUT RÉÉCRIRE]' : ' [nouveaux uniquement]';
  console.log(`\n🇫🇷  Attiks — Traduction rule-based${mode}${scope}\n`);

  const all = await fetchExercises(FORCE_ALL);
  console.log(`📋  ${all.length} exercices à traduire\n`);

  if (all.length === 0) {
    console.log('✅  Toutes les traductions sont déjà en place.\n');
    return;
  }

  // Génération des traductions
  const translations = all.map(ex => ({
    id: ex.id,
    name: ex.name,
    name_fr: translate(ex.name),
  }));

  // Preview — 20 premières
  console.log(`📋  Aperçu des ${PREVIEW_N} premières traductions :\n`);
  console.log('  ' + '-'.repeat(76));
  for (const t of translations.slice(0, PREVIEW_N)) {
    console.log(`  ${t.name.substring(0, 42).padEnd(44)} → ${t.name_fr}`);
  }
  console.log('  ' + '-'.repeat(76));

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Arrêt. Relance sans --dry-run pour écrire les traductions.\n');
    // Bonus : qq stats
    const unchanged = translations.filter(t => t.name_fr === t.name).length;
    console.log(`  Stats preview :`);
    console.log(`    Total      : ${translations.length}`);
    console.log(`    Traduits   : ${translations.length - unchanged}`);
    console.log(`    Inchangés  : ${unchanged} (noms identiques EN/FR ou non-couverts)\n`);
    return;
  }

  // Écriture en base par batch de 50
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < translations.length; i += BATCH) {
    const batch = translations.slice(i, i + BATCH);
    await batchUpdate(batch);
    done += batch.length;
    const pct = Math.round((done / translations.length) * 100);
    process.stdout.write(`\r  ✓ ${done}/${translations.length} (${pct}%)`);
  }

  console.log(`\n\n🎉  ${done} traductions enregistrées.\n`);
})().catch(err => { console.error('\nFatal:', err); process.exit(1); });

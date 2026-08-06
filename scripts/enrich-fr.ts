/**
 * scripts/enrich-fr.ts
 * Enrichit exercises_library avec des images (yuhonas/free-exercise-db)
 * et traduit description + tips en français (MyMemory API, gratuit).
 *
 * Prérequis .env.local :
 *   SUPABASE_SERVICE_KEY=...           ← clé service_role Supabase
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   TRANSLATION_EMAIL=...              ← email pour 10k mots/jour (optionnel)
 *
 * Usage :
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/enrich-fr.ts
 *   npx tsx --env-file=.env.local scripts/enrich-fr.ts
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const TRANSLATION_EMAIL = process.env.TRANSLATION_EMAIL ?? '';
const DRY_RUN = process.env.DRY_RUN === '1';
const YUNOHAS_JSON = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const YUNOHAS_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

if (!SUPABASE_URL) { console.error('❌  EXPO_PUBLIC_SUPABASE_URL manquant'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌  SUPABASE_SERVICE_KEY manquant'); process.exit(1); }
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️   SUPABASE_SERVICE_KEY absent — utilise la clé anon (RLS peut bloquer les écritures)');
}

// ── Types ─────────────────────────────────────────────────────
interface DBExercise {
  id: string;
  name: string;
  description: string | null;
  tips: string[] | null;
}

interface YunohasExercise {
  name: string;
  primaryMuscles: string[];
  equipment: string;
  instructions: string[];
  images: string[];
}

// ── Supabase ──────────────────────────────────────────────────
async function sbGet<T>(table: string, params: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(table: string, id: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH: ${res.status} ${await res.text()}`);
  const rows = await res.json() as unknown[];
  if (rows.length === 0) {
    console.warn('  ⚠️   0 lignes modifiées — vérifie RLS et la clé service_role');
    return false;
  }
  return true;
}

// ── Normalisation ─────────────────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Mapping FR → noms exacts yunohas ─────────────────────────
// Noms vérifiés directement dans le dataset yuhonas/free-exercise-db
const FR_TO_EN: Record<string, string[]> = {
  // Pectoraux
  'developpe couche barre':           ['Barbell Bench Press - Medium Grip', 'Barbell Bench Press'],
  'developpe couche halteres':        ['Dumbbell Bench Press', 'Decline Dumbbell Bench Press'],
  'developpe couche prise serree':    ['Close-Grip Barbell Bench Press', 'Close-Grip Bench Press'],
  'developpe incline barre':          ['Barbell Incline Bench Press - Medium Grip', 'Incline Barbell Bench Press'],
  'developpe incline halteres':       ['Incline Dumbbell Press', 'Dumbbell Bench Press'],
  'developpe decline':                ['Decline Barbell Bench Press'],
  'ecarte couche':                    ['Dumbbell Flyes', 'Decline Dumbbell Flyes'],
  'ecarte poulie vis-a-vis':          ['Cable Crossover'],
  'cable fly':                        ['Flat Bench Cable Flyes', 'Incline Cable Flye'],
  'pompes':                           ['Pushups', 'Push-Up'],
  'dips pectoraux':                   ['Dips - Chest Version', 'Chest Dip'],
  'pec deck':                         ['Pec Deck Fly'],
  // Dos
  'tractions pronation':              ['Pullups', 'Wide-Grip Rear Pull-Up'],
  'tractions supination':             ['Chin-Up'],
  'rowing barre':                     ['Bent Over Barbell Row'],
  'rowing haltere':                   ['One-Arm Dumbbell Row', 'Dumbbell Bent Over Row'],
  'tirage vertical':                  ['Full Range-Of-Motion Lat Pulldown', 'Lat Pulldown - With Bands'],
  'tirage horizontal':                ['Seated Cable Rows'],
  'souleve de terre':                 ['Barbell Deadlift'],
  'souleve de terre roumain':         ['Romanian Deadlift', 'Barbell Romanian Deadlift'],
  'souleve de terre jambes tendues':  ['Stiff-Legged Barbell Deadlift', 'Stiff-Leg Barbell Deadlift'],
  'rowing t-bar':                     ['T-Bar Row with Handle'],
  'rowing yates':                     ['Bent Over Barbell Row'],
  'rowing a un bras cable':           ['Seated Cable Rows'],
  'shrugs barre':                     ['Barbell Shrug'],
  'pull-over':                        ['Bent-Arm Dumbbell Pullover', 'Bent-Arm Barbell Pullover'],
  'tirage poulie haute prise serree': ['Close-Grip Front Lat Pulldown'],
  'good morning':                     ['Good Morning'],
  // Épaules
  'developpe militaire barre':        ['Barbell Shoulder Press', 'Standing Military Press'],
  'developpe militaire halteres':     ['Dumbbell Shoulder Press'],
  'elevations laterales':             ['Cable Seated Lateral Raise', 'Side Laterals to Front Raise'],
  'elevations frontales':             ['Front Raise And Pullover', 'Barbell Front Raise'],
  'oiseau':                           ['Seated Bent-Over Rear Delt Raise', 'Standing Bent-Over Two-Dumbbell Row'],
  'arnold press':                     ['Arnold Dumbbell Press'],
  'tirage menton':                    ['Barbell Upright Row', 'Dumbbell One-Arm Upright Row'],
  'face pull':                        ['Face Pull'],
  // Biceps
  'curl barre':                       ['Barbell Curl'],
  'curl halteres':                    ['Dumbbell Bicep Curl', 'Alternate Dumbbell Curl'],
  'curl marteau':                     ['Alternate Hammer Curl'],
  'curl pupitre':                     ['Preacher Curl'],
  'curl concentre':                   ['Concentration Curls'],
  'curl poulie':                      ['High Cable Curls', 'Cable Hammer Curls - Rope Attachment'],
  'curl poignet':                     ['Seated Palm-Up Barbell Wrist Curl'],
  'curl poignet inverse':             ['Seated Palms-Down Barbell Wrist Curl'],
  // Triceps
  'extension poulie haute':           ['Triceps Pushdown', 'Tricep Pushdown - Rope Attachment'],
  'extension poulie corde':           ['Cable Rope Overhead Triceps Extension', 'Triceps Overhead Extension with Rope'],
  'dips triceps':                     ['Bench Dips'],
  'extension nuque haltere':          ['Overhead Triceps', 'Tricep Dumbbell Kickback'],
  'barre au front':                   ['Decline Close-Grip Bench To Skull Crusher', 'Skull Crusher'],
  'kickback':                         ['Tricep Dumbbell Kickback'],
  'kickback poulie':                  ['One-Legged Cable Kickback'],
  // Jambes
  'squat barre':                      ['Barbell Squat'],
  'front squat':                      ['Front Squat (Clean Grip)', 'Barbell Front Squat'],
  'presse a cuisses':                 ['Leg Press'],
  'leg extension':                    ['Leg Extensions', 'Leg Extension'],
  'fentes avant':                     ['Dumbbell Lunges', 'Barbell Walking Lunge'],
  'fentes':                           ['Barbell Lunge'],
  'fentes bulgares':                  ['Barbell Bulgarian Split Squat', 'Dumbbell Bulgarian Split Squat'],
  'fentes inversees':                 ['Barbell Reverse Lunge', 'Crossover Reverse Lunge'],
  'hack squat':                       ['Barbell Hack Squat'],
  'squat gobelet':                    ['Goblet Squat'],
  'squat sumo':                       ['Sumo Deadlift', 'Kettlebell Sumo High Pull'],
  'leg curl allonge':                 ['Lying Leg Curls'],
  'leg curl assis':                   ['Seated Leg Curl'],
  'nordic curl':                      ['Natural Glute Ham Raise'],
  'hip thrust':                       ['Barbell Hip Thrust'],
  'pont fessier':                     ['Barbell Glute Bridge'],
  'abduction hanche':                 ['Hip Adduction', 'Hip Abductor'],
  'step-up':                          ['Step-up with Knee Raise', 'Barbell Step Ups'],
  // Mollets
  'mollets debout':                   ['Rocking Standing Calf Raise', 'Standing Calf Raises'],
  'mollets assis':                    ['Barbell Seated Calf Raise', 'Seated Calf Raise'],
  'mollets presse':                   ['Calf Press'],
  'mollets unijambiste':              ['Dumbbell Seated One-Leg Calf Raise'],
  // Abdos
  'crunch':                           ['Weighted Crunches', 'Crunch'],
  'releve de jambes':                 ['Hanging Leg Raise'],
  'planche':                          ['Plank'],
  'russian twist':                    ['Cable Russian Twists', 'Russian Twist'],
  'crunch poulie':                    ['Cable Crunch'],
  'gainage lateral':                  ['Side Plank'],
  'ab wheel':                         ['Barbell Ab Rollout', 'Barbell Ab Rollout - On Knees'],
  'mountain climber':                 ['Mountain Climbers'],
  'v-ups':                            ['V-Up'],
  'dead bug':                         ['Dead Bug'],
  'pallof press':                     ['Pallof Press'],
  // Cardio / Fonctionnel
  'box jump':                         ['Box Jump (Multiple Response)', 'Bench Jump'],
  'kettlebell swing':                 ['One-Arm Kettlebell Swings', 'Kettlebell Swing'],
  'turkish get-up':                   ['Turkish Get-Up (Lunge Style)', 'Turkish Get-Up (Squat style)'],
  'farmer walk':                      ["Farmer's Walk"],
  'battle ropes':                     ['Battling Ropes', 'Alternating Waves'],
  'clean and press':                  ['Clean and Press'],
  'thruster':                         ['Barbell Thruster', 'Dumbbell Thruster'],
  'corde a sauter':                   ['Rope Jumping', 'Jump Rope'],
  'burpee':                           ['Burpees'],
  'jumping jacks':                    ['Jumping Jacks'],
  'sprint':                           ['Run'],
  'dragon flag':                      ['Dragon Flag'],
  "devil s press":                    ["Devil's Press"],
};

function findYunohas(frName: string, list: YunohasExercise[]): YunohasExercise | null {
  const normFr = normalize(frName);
  // normalize() both the input and dict keys so hyphens/accents don't break lookup
  let candidates: string[] = [];
  for (const [k, v] of Object.entries(FR_TO_EN)) {
    if (normalize(k) === normFr) { candidates = v; break; }
  }

  for (const ex of list) {
    const normEx = normalize(ex.name);
    if (normFr === normEx) return ex;
    for (const en of candidates) {
      const normEn = normalize(en);
      if (normEx === normEn) return ex;
      const coverageEnInEx = normEn.length / (normEx.length || 1);
      const coverageExInEn = normEx.length / (normEn.length || 1);
      if (normEn.length >= 8 && coverageEnInEx >= 0.50 && normEx.includes(normEn)) return ex;
      if (normEn.length >= 8 && coverageExInEn >= 0.60 && normEn.includes(normEx)) return ex;
    }
  }
  return null;
}

// ── Traduction Google Translate (endpoint public, sans clé) ───
async function translate(text: string): Promise<string> {
  if (!text.trim()) return text;
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q='
    + encodeURIComponent(text.slice(0, 500));

  const res = await fetch(url);
  if (!res.ok) return text;
  const data = await res.json() as unknown[][];
  await new Promise(r => setTimeout(r, 200));
  try {
    const segments = (data[0] as unknown[][]).map(p => (p as string[])[0] ?? '');
    return segments.join('');
  } catch {
    return text;
  }
}

async function translateArray(arr: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const item of arr) {
    results.push(await translate(item));
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🏋️  Attiks — Enrich exercises (images + traduction FR)\n');
  if (DRY_RUN) console.log('⚠️   MODE DRY_RUN — aucune écriture en base\n');
  if (!TRANSLATION_EMAIL) {
    console.log('💡  Ajoutez TRANSLATION_EMAIL=votre@email.com dans .env.local pour 10k mots/jour\n');
  }

  console.log('1️⃣  Lecture exercises_library depuis Supabase...');
  const ourExercises = await sbGet<DBExercise>(
    'exercises_library',
    'select=id,name,description,tips&order=name'
  );
  console.log(`  ✓ ${ourExercises.length} exercices\n`);

  console.log('2️⃣  Téléchargement base yunohas (GitHub, gratuit)...');
  const yunohasData = await fetch(YUNOHAS_JSON).then(r => r.json()) as YunohasExercise[];
  console.log(`  ✓ ${yunohasData.length} exercices yunohas\n`);

  console.log('3️⃣  Matching images + traduction...\n');

  let imagesOk = 0, noImage = 0, translated = 0, errors = 0;
  const noImageList: string[] = [];

  for (const ex of ourExercises) {
    const yunohas = findYunohas(ex.name, yunohasData);

    const gifUrl = yunohas && yunohas.images.length > 0
      ? YUNOHAS_BASE + yunohas.images[0]
      : null;

    const hasEnglishDesc = ex.description &&
      !ex.description.match(/[éèêëàâùûüôîïç]/);

    const hasTips = ex.tips && ex.tips.length > 0;
    const hasEnglishTips = hasTips &&
      !ex.tips![0].match(/[éèêëàâùûüôîïç]/);

    const needsTranslation = hasEnglishDesc || hasEnglishTips;

    if (gifUrl) {
      console.log(`  🖼️   ${ex.name}  →  ${yunohas!.name}`);
      imagesOk++;
    } else {
      noImage++;
      noImageList.push(ex.name);
    }

    if (!DRY_RUN && (gifUrl || needsTranslation)) {
      try {
        const patch: Record<string, unknown> = {};

        if (gifUrl) patch.gif_url = gifUrl;

        if (needsTranslation) {
          if (hasEnglishDesc && ex.description) {
            patch.description = await translate(ex.description);
          }
          if (hasEnglishTips && ex.tips) {
            patch.tips = await translateArray(ex.tips.slice(0, 6));
          }
          if (needsTranslation) translated++;
        }

        await sbPatch('exercises_library', ex.id, patch);
      } catch (err) {
        console.error(`  ✗ "${ex.name}":`, (err as Error).message);
        errors++;
      }
    } else if (DRY_RUN && needsTranslation) {
      translated++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('📊  RÉSULTAT');
  console.log('══════════════════════════════════════════\n');
  console.log(`🖼️   Avec image       : ${imagesOk} / ${ourExercises.length}`);
  console.log(`❌  Sans image       : ${noImage}`);
  console.log(`🇫🇷  Traduits FR      : ${translated}`);
  if (errors > 0) console.log(`⚠️   Erreurs          : ${errors}`);

  if (noImageList.length > 0) {
    console.log('\n⚠️   Sans image :');
    for (const n of noImageList) console.log(`  -  ${n}`);
  }

  console.log('\n✅  Terminé.\n');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });

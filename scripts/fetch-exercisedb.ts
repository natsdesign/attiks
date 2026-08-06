/**
 * scripts/fetch-exercisedb.ts
 * Enrichit exercises_library avec GIFs depuis ExerciseDB (RapidAPI, gratuit).
 * Les URLs GIF sont publiques — pas besoin de header auth dans l'app.
 *
 * Prérequis .env.local :
 *   RAPIDAPI_KEY=...          ← clé RapidAPI gratuite (rapidapi.com → ExerciseDB)
 *   SUPABASE_SERVICE_KEY=...  ← clé service_role Supabase (Settings → API)
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *
 * Usage :
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/fetch-exercisedb.ts
 *   npx tsx --env-file=.env.local scripts/fetch-exercisedb.ts
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DRY_RUN     = process.env.DRY_RUN === '1';

if (!RAPIDAPI_KEY)  { console.error('❌  RAPIDAPI_KEY manquant'); process.exit(1); }
if (!SUPABASE_URL)  { console.error('❌  EXPO_PUBLIC_SUPABASE_URL manquant'); process.exit(1); }
if (!SUPABASE_KEY)  { console.error('❌  SUPABASE_SERVICE_KEY manquant'); process.exit(1); }
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️   SUPABASE_SERVICE_KEY absent — utilise la clé anon (RLS peut bloquer les écritures)');
}

// ── Supabase REST ──────────────────────────────────────────────
async function sbGet(table: string, params: string): Promise<unknown[]> {
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
      Prefer: 'return=representation',   // retourne les lignes modifiées pour détecter 0 rows
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

// ── ExerciseDB (RapidAPI) ──────────────────────────────────────
interface EDBExercise {
  id: string;
  name: string;
  gifUrl: string;
  bodyPart: string;
  equipment: string;
  target: string;
  instructions: string[];
}

async function fetchAllEDB(): Promise<EDBExercise[]> {
  const all: EDBExercise[] = [];
  const LIMIT = 10;   // plan gratuit RapidAPI cap
  let offset = 0;

  while (true) {
    const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${LIMIT}&offset=${offset}`;
    if (offset % 100 === 0) console.log(`  → offset=${offset}…`);
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key':  RAPIDAPI_KEY!,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    });
    if (!res.ok) {
      console.error(`  ✗ ExerciseDB HTTP ${res.status}: ${await res.text()}`);
      break;
    }
    const data: EDBExercise[] = await res.json();
    if (data.length === 0) break;
    all.push(...data);
    offset += LIMIT;
  }
  console.log(`  ✓ ${all.length} exercices ExerciseDB`);
  return all;
}

// ── Normalisation ──────────────────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mapping FR → mots-clés EN pour ExerciseDB
const FR_TO_EN: Record<string, string[]> = {
  'developpe couche barre':           ['barbell bench press'],
  'developpe couche halteres':        ['dumbbell bench press'],
  'developpe couche prise serree':    ['close-grip barbell bench press', 'close grip bench press'],
  'developpe incline barre':          ['incline barbell bench press'],
  'developpe incline halteres':       ['incline dumbbell bench press'],
  'developpe decline':                ['decline barbell bench press', 'decline bench press'],
  'ecarte couche':                    ['dumbbell fly', 'chest fly'],
  'ecarte poulie vis-a-vis':          ['cable crossover', 'cable fly high'],
  'cable fly':                        ['cable crossover', 'cable fly'],
  'pompes':                           ['push-up'],
  'dips pectoraux':                   ['chest dip', 'dip'],
  'pec deck':                         ['pec deck fly', 'chest fly machine'],
  'tractions pronation':              ['pull-up'],
  'tractions supination':             ['chin-up'],
  'rowing barre':                     ['barbell bent over row', 'barbell row'],
  'rowing haltere':                   ['dumbbell bent over row', 'dumbbell one arm row'],
  'tirage vertical':                  ['cable lat pulldown', 'lat pulldown'],
  'tirage horizontal':                ['seated cable row', 'cable seated row'],
  'souleve de terre':                 ['barbell deadlift', 'deadlift'],
  'souleve de terre roumain':         ['romanian deadlift', 'barbell romanian deadlift'],
  'souleve de terre jambes tendues':  ['stiff-leg barbell deadlift'],
  'rowing t-bar':                     ['t bar row'],
  'rowing yates':                     ['barbell bent over row'],
  'rowing a un bras cable':           ['cable one arm row', 'cable single arm row'],
  'shrugs barre':                     ['barbell shrug'],
  'pull-over':                        ['dumbbell pullover'],
  'tirage poulie haute prise serree': ['cable lat pulldown'],
  'good morning':                     ['barbell good morning'],
  'developpe militaire barre':        ['barbell overhead press', 'military press'],
  'developpe militaire halteres':     ['dumbbell shoulder press', 'dumbbell overhead press', 'seated dumbbell press'],
  'elevations laterales':             ['dumbbell lateral raise', 'cable lateral raise'],
  'elevations frontales':             ['dumbbell front raise'],
  'oiseau':                           ['reverse fly', 'bent over dumbbell fly'],
  'arnold press':                     ['arnold dumbbell press', 'arnold press'],
  'tirage menton':                    ['barbell upright row'],
  'face pull':                        ['cable face pull', 'face pull'],
  'curl barre':                       ['barbell curl', 'ez barbell curl'],
  'curl halteres':                    ['dumbbell curl', 'dumbbell biceps curl'],
  'curl marteau':                     ['hammer dumbbell curl', 'hammer curl'],
  'curl pupitre':                     ['preacher curl', 'barbell preacher curl'],
  'curl concentre':                   ['concentration curl', 'dumbbell concentration curl'],
  'curl poulie':                      ['cable curl', 'cable biceps curl'],
  'curl poignet':                     ['wrist roller', 'barbell wrist curl'],
  'curl poignet inverse':             ['reverse barbell wrist curl'],
  'extension poulie haute':           ['cable triceps pushdown', 'triceps pushdown'],
  'extension poulie corde':           ['cable rope tricep extension', 'rope tricep pushdown', 'cable rope overhead'],
  'dips triceps':                     ['bench dip', 'triceps dip'],
  'extension nuque haltere':          ['overhead triceps extension', 'dumbbell overhead triceps extension'],
  'barre au front':                   ['skull crusher', 'barbell lying triceps extension'],
  'kickback':                         ['triceps dumbbell kickback'],
  'kickback poulie':                  ['cable kickback'],
  'squat barre':                      ['barbell squat', 'back squat'],
  'front squat':                      ['barbell front squat'],
  'presse a cuisses':                 ['sled 45 leg press', 'leg press'],
  'leg extension':                    ['leg extension', 'lever leg extension'],
  'fentes avant':                     ['barbell lunge', 'dumbbell lunge'],
  'fentes':                           ['barbell lunge', 'dumbbell lunge'],
  'fentes bulgares':                  ['bulgarian split squat', 'barbell split squat'],
  'fentes inversees':                 ['barbell reverse lunge', 'reverse lunge'],
  'hack squat':                       ['barbell hack squat'],
  'squat gobelet':                    ['kettlebell goblet squat', 'goblet squat'],
  'squat sumo':                       ['sumo squat', 'barbell sumo squat'],
  'leg curl allonge':                 ['lying leg curl', 'lever lying leg curl'],
  'leg curl assis':                   ['seated leg curl', 'lever seated leg curl'],
  'nordic curl':                      ['nordic hamstring curl', 'nordic curl'],
  'hip thrust':                       ['barbell hip thrust', 'hip thrust'],
  'pont fessier':                     ['barbell glute bridge', 'glute bridge'],
  'abduction hanche':                 ['hip abduction', 'hip abduction machine'],
  'step-up':                          ['barbell step-up', 'dumbbell step-up'],
  'mollets debout':                   ['standing calf raise', 'dumbbell standing calf raise'],
  'mollets assis':                    ['seated calf raise', 'barbell seated calf raise'],
  'mollets presse':                   ['sled 45 calf press', 'leg press calf raise'],
  'mollets unijambiste':              ['single-leg calf raise'],
  'crunch':                           ['crunch', 'weighted crunch'],
  'releve de jambes':                 ['hanging leg raise', 'leg raise'],
  'planche':                          ['plank', 'front plank', 'plank hold'],
  'russian twist':                    ['russian twist'],
  'crunch poulie':                    ['cable kneeling crunch', 'cable crunch kneeling'],
  'gainage lateral':                  ['side plank'],
  'ab wheel':                         ['standing ab rollerout', 'ab rollerout', 'ab roller'],
  'mountain climber':                 ['mountain climber'],
  'hollow hold':                      ['hollow body hold', 'hollow hold'],
  'v-ups':                            ['v up', 'v-up'],
  'dead bug':                         ['dead bug'],
  'pallof press':                     ['pallof press', 'cable pallof press'],
  'dragon flag':                      ['dragon flag'],
  'burpee':                           ['burpee'],
  'box jump':                         ['box jump'],
  'kettlebell swing':                 ['kettlebell swing'],
  'turkish get-up':                   ['turkish get-up'],
  'farmer walk':                      ['farmer walk', 'farmers walk'],
  'battle ropes':                     ['battle ropes'],
  'clean and press':                  ['clean and press', 'power clean'],
  'thruster':                         ['barbell thruster'],
  'jumping jacks':                    ['jumping jacks', 'jumping jack'],
  'corde a sauter':                   ['jump rope'],
  'sprint':                           ['run'],
  "devil s press":                    ["devil's press"],
};

function findMatch(frName: string, edbList: EDBExercise[]): EDBExercise | null {
  const normFr = normalize(frName);
  const translations = FR_TO_EN[normFr] ?? [];

  for (const ex of edbList) {
    const normEx = normalize(ex.name);
    if (normFr === normEx) return ex;
    for (const en of translations) {
      const normEn = normalize(en);
      if (normEx === normEn) return ex;
      // Coverage ratio évite les faux positifs ("run" dans "cable crunch", etc.)
      const coverageEnInEx = normEn.length / (normEx.length || 1);
      const coverageExInEn = normEx.length / (normEn.length || 1);
      if (normEn.length >= 8 && coverageEnInEx >= 0.45 && normEx.includes(normEn)) return ex;
      if (normEn.length >= 8 && coverageExInEn >= 0.55 && normEn.includes(normEx)) return ex;
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🏋️  Attiks — Fetch ExerciseDB GIFs\n');
  if (DRY_RUN) console.log('⚠️   MODE DRY_RUN — aucune écriture en base\n');
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.log('🔑  ATTENTION: utilise la clé anon. Ajoute SUPABASE_SERVICE_KEY dans .env.local\n');
  }

  console.log('1️⃣  Lecture exercises_library...');
  const ourExercises = await sbGet(
    'exercises_library',
    'select=id,name&order=name'
  ) as Array<{ id: string; name: string }>;
  console.log(`  ✓ ${ourExercises.length} exercices\n`);

  console.log('2️⃣  Récupération ExerciseDB...');
  const edbExercises = await fetchAllEDB();
  console.log(`  ✓ ${edbExercises.length} exercices ExerciseDB\n`);

  console.log('3️⃣  Matching & écriture...\n');

  let matched = 0, noMatch = 0, errors = 0, rlsBlocked = 0;
  const noMatchList: string[] = [];

  for (const ex of ourExercises) {
    const edb = findMatch(ex.name, edbExercises);

    if (!edb) {
      noMatch++;
      noMatchList.push(ex.name);
      continue;
    }

    console.log(`  🎬  ${ex.name}  →  ${edb.name}`);

    if (!DRY_RUN) {
      try {
        const ok = await sbPatch('exercises_library', ex.id, {
          gif_url:          edb.gifUrl,
          description:      edb.instructions.join(' ') || null,
          tips:             edb.instructions.length > 0 ? edb.instructions : null,
          common_mistakes:  null,
        });
        if (ok) matched++;
        else rlsBlocked++;
      } catch (err) {
        console.error(`  ✗ Update "${ex.name}":`, (err as Error).message);
        errors++;
      }
    } else {
      matched++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('📊  RÉSULTAT');
  console.log('══════════════════════════════════════════\n');
  console.log(`✅  Matchés & écrits : ${matched} / ${ourExercises.length}`);
  console.log(`❌  Sans match       : ${noMatch}`);
  if (rlsBlocked > 0) console.log(`🔒  Bloqués RLS      : ${rlsBlocked} — ajoute SUPABASE_SERVICE_KEY`);
  if (errors > 0)     console.log(`⚠️   Erreurs          : ${errors}`);

  if (noMatchList.length > 0) {
    console.log('\n⚠️   Sans match :');
    for (const n of noMatchList) console.log(`  -  ${n}`);
  }

  console.log('\n✅  Terminé.\n');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });

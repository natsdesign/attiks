/**
 * scripts/fetch-exercises.ts
 * One-shot — enrichit exercises_library avec GIFs et données WorkoutX.
 *
 * Usage :
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/fetch-exercises.ts
 *   npx tsx --env-file=.env.local scripts/fetch-exercises.ts   # écriture réelle
 *
 * Prérequis : exécuter migration_add_exercise_enrichment.sql dans Supabase
 */

// ── Config ────────────────────────────────────────────────────
const WORKOUTX_KEY = process.env.WORKOUTX_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!WORKOUTX_KEY) { console.error('❌  WORKOUTX_API_KEY manquant'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE_URL manquant'); process.exit(1); }

// ── Supabase REST helpers ─────────────────────────────────────
async function sbGet(table: string, params: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbCount(table: string, params: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok) throw new Error(`Supabase COUNT ${table}: ${res.status} ${await res.text()}`);
  const range = res.headers.get('Content-Range');
  return range ? parseInt(range.split('/')[1], 10) : 0;
}

async function sbPatch(table: string, id: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table} id=${id}: ${res.status} ${await res.text()}`);
}

// ── Types WorkoutX ────────────────────────────────────────────
interface WorkoutXExercise {
  id: string;
  name: string;
  gifUrl: string | null;
  description: string | null;
  difficulty: string | null;
  caloriesPerMinute: number | null;
  bodyPart: string | null;
  target: string | null;
  instructions: string[] | null;
  secondaryMuscles: string[] | null;
  recommendedSets: number | string | null;
  recommendedReps: number | string | null;
}

interface WorkoutXResponse {
  data: WorkoutXExercise[];
  total: number;
  count: number;
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

const FR_TO_EN: Record<string, string[]> = {
  'developpe couche barre':           ['barbell bench press', 'bench press barbell'],
  'developpe couche halteres':        ['dumbbell bench press', 'bench press dumbbell'],
  'developpe incline barre':          ['incline barbell bench press', 'incline bench press'],
  'developpe incline halteres':       ['incline dumbbell bench press'],
  'developpe decline':                ['decline bench press'],
  'ecarte couche':                    ['dumbbell fly', 'chest fly'],
  'ecarte poulie vis-a-vis':          ['cable fly', 'cable crossover'],
  'pompes':                           ['push up', 'pushup'],
  'dips pectoraux':                   ['chest dip', 'dip'],
  'pec deck':                         ['pec deck', 'chest fly machine'],
  'tractions pronation':              ['pull up', 'pullup'],
  'tractions supination':             ['chin up', 'chinup'],
  'rowing barre':                     ['barbell row', 'bent over row'],
  'rowing haltere':                   ['dumbbell row', 'one arm row'],
  'tirage vertical':                  ['lat pulldown', 'cable pulldown'],
  'tirage horizontal':                ['seated cable row', 'cable row'],
  'souleve de terre':                 ['deadlift'],
  'rowing t-bar':                     ['t-bar row'],
  'pull-over':                        ['pullover', 'dumbbell pullover'],
  'tirage poulie haute prise serree': ['close grip pulldown'],
  'rowing yates':                     ['yates row'],
  'good morning':                     ['good morning'],
  'developpe militaire barre':        ['barbell overhead press', 'military press'],
  'developpe militaire halteres':     ['dumbbell overhead press', 'dumbbell shoulder press'],
  'elevations laterales':             ['lateral raise', 'side raise'],
  'elevations frontales':             ['front raise'],
  'oiseau':                           ['reverse fly', 'rear delt fly'],
  'arnold press':                     ['arnold press'],
  'tirage menton':                    ['upright row'],
  'face pull':                        ['face pull'],
  'curl barre':                       ['barbell curl', 'ez bar curl'],
  'curl halteres':                    ['dumbbell curl', 'bicep curl'],
  'curl marteau':                     ['hammer curl'],
  'curl pupitre':                     ['preacher curl', 'scott curl'],
  'curl concentre':                   ['concentration curl'],
  'curl poulie':                      ['cable curl'],
  'extension poulie haute':           ['tricep pushdown', 'cable pushdown'],
  'dips triceps':                     ['tricep dip', 'bench dip'],
  'extension nuque haltere':          ['overhead tricep extension'],
  'barre au front':                   ['skull crusher', 'lying tricep extension'],
  'kickback':                         ['tricep kickback'],
  'extension poulie corde':           ['rope pushdown', 'cable rope tricep'],
  'squat barre':                      ['barbell squat', 'back squat'],
  'front squat':                      ['front squat'],
  'presse a cuisses':                 ['leg press'],
  'leg extension':                    ['leg extension'],
  'fentes avant':                     ['forward lunge', 'lunge'],
  'fentes bulgares':                  ['bulgarian split squat', 'split squat'],
  'hack squat':                       ['hack squat'],
  'squat gobelet':                    ['goblet squat'],
  'souleve de terre roumain':         ['romanian deadlift', 'rdl'],
  'leg curl allonge':                 ['lying leg curl', 'hamstring curl'],
  'leg curl assis':                   ['seated leg curl'],
  'souleve de terre jambes tendues':  ['stiff leg deadlift', 'straight leg deadlift'],
  'nordic curl':                      ['nordic curl', 'nordic hamstring curl'],
  'hip thrust':                       ['hip thrust', 'barbell hip thrust'],
  'squat sumo':                       ['sumo squat'],
  'fentes':                           ['lunge'],
  'kickback poulie':                  ['cable kickback', 'glute kickback'],
  'pont fessier':                     ['glute bridge'],
  'abduction hanche':                 ['hip abduction'],
  'mollets debout':                   ['standing calf raise'],
  'mollets assis':                    ['seated calf raise'],
  'mollets presse':                   ['calf press'],
  'mollets unijambiste':              ['single leg calf raise'],
  'crunch':                           ['crunch', 'ab crunch'],
  'releve de jambes':                 ['leg raise', 'hanging leg raise'],
  'planche':                          ['plank'],
  'russian twist':                    ['russian twist'],
  'crunch poulie':                    ['cable crunch'],
  'gainage lateral':                  ['side plank'],
  'ab wheel':                         ['ab wheel', 'ab roller'],
  'mountain climber':                 ['mountain climber'],
  'hollow hold':                      ['hollow hold', 'hollow body'],
  'v-ups':                            ['v up', 'v-up'],
  'curl poignet':                     ['wrist curl'],
  'curl poignet inverse':             ['reverse wrist curl'],
  'farmer walk':                      ['farmer walk', 'farmer carry'],
  'burpee':                           ['burpee'],
  'clean and press':                  ['clean and press', 'push press'],
  'thruster':                         ['thruster'],
  'kettlebell swing':                 ['kettlebell swing'],
  'turkish get-up':                   ['turkish get up', 'tgu'],
  'jumping jacks':                    ['jumping jack'],
  'battle ropes':                     ['battle rope'],
  'box jump':                         ['box jump'],
  'corde a sauter':                   ['jump rope', 'skipping rope'],
  'sprint':                           ['sprint', 'running'],
  'developpe couche prise serree':    ['close grip bench press'],
  'cable fly':                        ['cable fly', 'cable chest fly'],
  'rowing a un bras cable':           ['single arm cable row'],
  'shrugs barre':                     ['barbell shrug', 'shrug'],
  'step-up':                          ['step up'],
  'fentes inversees':                 ['reverse lunge'],
  'dead bug':                         ['dead bug'],
  'pallof press':                     ['pallof press'],
  'dragon flag':                      ['dragon flag'],
  "devil s press":                    ["devil's press", 'devils press'],
};

// ── Fetch WorkoutX (pagination par page) ─────────────────────
async function fetchAllWorkoutX(): Promise<WorkoutXExercise[]> {
  const all: WorkoutXExercise[] = [];
  const LIMIT = 100;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `https://api.workoutxapp.com/v1/exercises?page=${page}&limit=${LIMIT}`;
    let resp = await fetch(url, { headers: { 'X-WorkoutX-Key': WORKOUTX_KEY! } });

    if (resp.status === 429) {
      const body = await resp.json().catch(() => ({})) as { resetAt?: string };
      const resetAt = body.resetAt ? new Date(body.resetAt).getTime() : Date.now() + 62_000;
      const waitMs = Math.max(resetAt - Date.now() + 500, 1000);
      console.log(`  ⏳ Rate limit — attente ${Math.ceil(waitMs / 1000)}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      resp = await fetch(url, { headers: { 'X-WorkoutX-Key': WORKOUTX_KEY! } });
    }

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`  ✗ WorkoutX HTTP ${resp.status}: ${txt}`);
      break;
    }

    const quota = resp.headers.get('X-Quota-Remaining');
    const quotaNum = quota !== null ? parseInt(quota, 10) : Infinity;

    const json: WorkoutXResponse = await resp.json();
    totalPages = Math.ceil(json.total / LIMIT);
    all.push(...json.data);

    console.log(`Page ${page}/${totalPages} — ${all.length} exercices — Quota restant: ${quota ?? '?'}`);

    if (quotaNum < 500) {
      console.error(`⛔  Quota < 500 (${quotaNum}) — arrêt immédiat.`);
      break;
    }

    if (json.data.length === 0 || page >= totalPages) break;
    page++;
    await new Promise((r) => setTimeout(r, 2000));
  }

  return all;
}

// ── Matching ──────────────────────────────────────────────────
function findMatch(frName: string, wxList: WorkoutXExercise[]): WorkoutXExercise | null {
  const normFr = normalize(frName);
  const translations = FR_TO_EN[normFr] ?? [];

  for (const wx of wxList) {
    const normWx = normalize(wx.name);
    if (normFr === normWx) return wx;
    for (const en of translations) {
      const normEn = normalize(en);
      const minLen = 8;
      if (normWx === normEn) return wx;
      if (normEn.length >= minLen && normWx.includes(normEn)) return wx;
      if (normWx.length >= minLen && normEn.includes(normWx)) return wx;
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🏋️  Attiks — Fetch WorkoutX Exercises\n');
  if (DRY_RUN) console.log('⚠️   MODE DRY_RUN — aucune écriture en base\n');

  // 1. Nos exercices via REST
  console.log('1️⃣  Lecture exercises_library...');
  const ourExercises = await sbGet(
    'exercises_library',
    'select=id,name&order=name'
  ) as Array<{ id: string; name: string }>;
  console.log(`  ✓ ${ourExercises.length} exercices\n`);

  // 2. WorkoutX
  console.log('2️⃣  Récupération WorkoutX API...\n');
  const wxExercises = await fetchAllWorkoutX();
  console.log(`\n  ✓ ${wxExercises.length} exercices WorkoutX récupérés\n`);

  // 3. Matching + écriture
  console.log('3️⃣  Matching et mise à jour...\n');

  let matched = 0;
  let noMatch = 0;
  let errors = 0;
  const noMatchList: string[] = [];
  const matchedList: Array<{ fr: string; en: string; hasGif: boolean }> = [];

  for (const ex of ourExercises) {
    const wx = findMatch(ex.name, wxExercises);

    if (!wx) {
      noMatch++;
      noMatchList.push(ex.name);
      continue;
    }

    matchedList.push({ fr: ex.name, en: wx.name, hasGif: !!wx.gifUrl });

    if (!DRY_RUN) {
      try {
        await sbPatch('exercises_library', ex.id, {
          gif_url:             wx.gifUrl ?? null,
          description:         wx.description ?? null,
          tips:                wx.instructions ?? null,
          difficulty:          wx.difficulty ?? null,
          calories_per_minute: wx.caloriesPerMinute ?? null,
          recommended_sets:    wx.recommendedSets != null ? String(wx.recommendedSets) : null,
          recommended_reps:    wx.recommendedReps != null ? String(wx.recommendedReps) : null,
          secondary_muscles:   wx.secondaryMuscles ?? null,
        });
        matched++;
      } catch (err) {
        console.error(`  ✗ Update "${ex.name}":`, (err as Error).message);
        errors++;
        matchedList.pop();
      }
    } else {
      matched++;
    }
  }

  // 4. COUNT Supabase pour confirmation
  if (!DRY_RUN) {
    console.log('\n4️⃣  Vérification en base...');
    const totalInDb   = await sbCount('exercises_library', 'select=id');
    const withGifInDb = await sbCount('exercises_library', 'select=id&gif_url=not.is.null');
    console.log(`  ✓ exercises_library : ${totalInDb} lignes`);
    console.log(`  ✓ Avec gif_url      : ${withGifInDb} / ${totalInDb}`);
  }

  // 5. Rapport
  const withGif = matchedList.filter((m) => m.hasGif).length;
  console.log('\n══════════════════════════════════════════');
  console.log('📊  RÉSULTAT');
  console.log('══════════════════════════════════════════\n');
  console.log(`✅  Matchés     : ${matched} / ${ourExercises.length}`);
  console.log(`🎬  Avec GIF    : ${withGif} / ${matched}`);
  console.log(`📷  Sans GIF    : ${matched - withGif}`);
  console.log(`❌  Sans match  : ${noMatch}`);
  if (errors > 0) console.log(`⚠️   Erreurs     : ${errors}`);

  if (matchedList.length > 0) {
    console.log('\n📋  Exercices matchés :');
    for (const m of matchedList) {
      console.log(`  ${m.hasGif ? '🎬' : '📷'}  ${m.fr}  →  ${m.en}`);
    }
  }

  if (noMatchList.length > 0) {
    console.log('\n⚠️   Sans match :');
    for (const n of noMatchList) console.log(`  -  ${n}`);
  }

  console.log('\n✅  Terminé.\n');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });

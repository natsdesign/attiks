/**
 * scripts/import-all-workoutx.ts
 * Importe les ~1 327 exercices WorkoutX dans exercises_library.
 *
 * Prérequis :
 *   1. Exécuter migration_workoutx_import.sql dans Supabase SQL Editor
 *   2. RLS désactivé sur exercises_library (ALTER TABLE ... DISABLE ROW LEVEL SECURITY)
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/import-all-workoutx.ts
 */

const WORKOUTX_KEY = process.env.EXPO_PUBLIC_WORKOUTX_API_KEY ?? process.env.WORKOUTX_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!WORKOUTX_KEY) { console.error('❌  WORKOUTX_API_KEY manquant'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE_URL manquant'); process.exit(1); }

// ── Supabase upsert via REST ──────────────────────────────────
async function sbUpsert(rows: Record<string, unknown>[]): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises_library?on_conflict=workoutx_id`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase upsert HTTP ${res.status}: ${txt}`);
  }
}

async function sbCount(): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises_library?select=id`,
    {
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    }
  );
  const range = res.headers.get('Content-Range');
  return range ? parseInt(range.split('/')[1], 10) : 0;
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  console.log('\n🏋️  Attiks — Import WorkoutX → Supabase\n');

  const LIMIT = 100;
  let offset = 0;
  let total = Infinity;
  let pageNum = 1;
  let totalImported = 0;
  let errors = 0;

  while (offset < total) {
    const totalPages = total === Infinity ? '?' : Math.ceil(total / LIMIT);
    const url = `https://api.workoutxapp.com/v1/exercises?offset=${offset}&limit=${LIMIT}`;
    const res = await fetch(url, { headers: { 'X-WorkoutX-Key': WORKOUTX_KEY! } });

    if (res.status === 429) {
      const body = await res.json().catch(() => ({})) as { resetAt?: string };
      const resetAt = body.resetAt ? new Date(body.resetAt).getTime() : Date.now() + 62_000;
      const waitMs = Math.max(resetAt - Date.now() + 500, 1000);
      console.log(`⏳ Rate limit — attente ${Math.ceil(waitMs / 1000)}s...`);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      console.error(`❌ WorkoutX HTTP ${res.status}: ${await res.text()}`);
      break;
    }

    const quota = res.headers.get('X-Quota-Remaining');
    const quotaNum = quota !== null ? parseInt(quota, 10) : Infinity;
    const json = await res.json();

    total = json.total;
    const exercises: Record<string, unknown>[] = json.data ?? [];

    if (exercises.length === 0) break;

    // Mapper les champs WorkoutX → colonnes Supabase
    const rows = exercises.map((ex: Record<string, unknown>) => ({
      workoutx_id:         ex.id,
      name:                ex.name,
      body_part:           ex.bodyPart,
      target_muscle:       ex.target,
      equipment:           ex.equipment,
      gif_url:             ex.gifUrl ?? null,
      instructions:        Array.isArray(ex.instructions) ? ex.instructions : [],
      secondary_muscles:   Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
      difficulty:          ex.difficulty ?? null,
      calories_per_minute: ex.caloriesPerMinute ?? null,
      recommended_sets:    ex.recommendedSets != null ? String(ex.recommendedSets) : null,
      recommended_reps:    ex.recommendedReps != null ? String(ex.recommendedReps) : null,
    }));

    try {
      await sbUpsert(rows);
      totalImported += rows.length;
      offset += rows.length;
      console.log(`✅ Page ${pageNum}/${Math.ceil(total / LIMIT)} — ${totalImported} importés — Quota restant: ${quota ?? '?'}`);
    } catch (err) {
      console.error(`❌ Page ${pageNum}: ${(err as Error).message}`);
      errors++;
      offset += LIMIT; // avancer quand même
    }

    if (quotaNum < 500) {
      console.error(`⛔  Quota < 500 (${quotaNum}) — arrêt immédiat.`);
      break;
    }

    pageNum++;
    if (offset < total) await new Promise(r => setTimeout(r, 2000));
  }

  // Vérification finale
  console.log('\n📊  Vérification en base...');
  const count = await sbCount();
  console.log(`   exercises_library : ${count} exercices`);

  console.log(`\n${errors > 0 ? '⚠️' : '🎉'}  Import terminé — ${totalImported} importés, ${errors} erreur(s)\n`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });

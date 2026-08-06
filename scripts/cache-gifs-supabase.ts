/**
 * scripts/cache-gifs-supabase.ts
 * Télécharge les GIFs WorkoutX (auth requise) et les re-héberge
 * dans Supabase Storage (public). Met à jour gif_url en base.
 *
 * Prérequis :
 *   Exécuter migration_storage_exercise_gifs.sql dans Supabase SQL Editor
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/cache-gifs-supabase.ts
 *
 * Reprise : les exercices dont gif_url ne contient plus
 * 'workoutxapp.com' sont ignorés (déjà cachés).
 */

const WORKOUTX_KEY = process.env.EXPO_PUBLIC_WORKOUTX_API_KEY ?? process.env.WORKOUTX_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET       = 'exercise-gifs';
const CONCURRENCY  = 1;   // séquentiel pour respecter le rate-limit GIF WorkoutX
const DELAY_MS     = 400; // pause entre chaque download

if (!WORKOUTX_KEY) { console.error('❌  WORKOUTX_API_KEY manquant'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE_URL manquant'); process.exit(1); }

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object`;
const PUBLIC_BASE  = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

// ── Helpers ───────────────────────────────────────────────────
async function sbPatch(id: string, gif_url: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises_library?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ gif_url }),
    }
  );
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

async function uploadToStorage(filename: string, data: ArrayBuffer): Promise<void> {
  const res = await fetch(`${STORAGE_BASE}/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/gif',
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!res.ok) throw new Error(`Upload ${filename}: ${res.status} ${await res.text()}`);
}

// ── Process one exercise ──────────────────────────────────────
async function processOne(ex: { id: string; gif_url: string }): Promise<'ok' | 'skip' | 'err'> {
  const match = ex.gif_url.match(/\/gifs\/(.+)$/);
  if (!match) return 'skip';
  const filename = match[1]; // ex: "0028.gif"

  try {
    // 1. Télécharger depuis WorkoutX (avec retry sur 429)
    let dlRes = await fetch(ex.gif_url, {
      headers: { 'X-WorkoutX-Key': WORKOUTX_KEY! },
    });
    if (dlRes.status === 429) {
      const body = await dlRes.json().catch(() => ({})) as { resetAt?: string };
      const resetAt = body.resetAt ? new Date(body.resetAt).getTime() : Date.now() + 61_000;
      const waitMs = Math.max(resetAt - Date.now() + 1000, 10_000);
      console.log(`  ⏳ Rate limit GIF — attente ${Math.ceil(waitMs / 1000)}s...`);
      await new Promise(r => setTimeout(r, waitMs));
      dlRes = await fetch(ex.gif_url, { headers: { 'X-WorkoutX-Key': WORKOUTX_KEY! } });
    }
    if (!dlRes.ok) throw new Error(`Download ${dlRes.status}`);
    const data = await dlRes.arrayBuffer();

    // 2. Upload dans Supabase Storage
    await uploadToStorage(filename, data);

    // 3. Mettre à jour gif_url en base
    const publicUrl = `${PUBLIC_BASE}/${filename}`;
    await sbPatch(ex.id, publicUrl);

    return 'ok';
  } catch (err) {
    console.error(`  ✗ ${filename}: ${(err as Error).message}`);
    return 'err';
  }
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  console.log('\n🎬  Attiks — Cache GIFs WorkoutX → Supabase Storage\n');

  // Récupérer tous les exercices avec gif_url WorkoutX
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises_library?select=id,gif_url&gif_url=ilike.*workoutxapp.com*&order=workoutx_id`,
    {
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'count=exact',
      },
    }
  );
  const exercises: { id: string; gif_url: string }[] = await res.json();
  const total = exercises.length;
  console.log(`📋  ${total} GIFs à cacher (restants avec URL WorkoutX)\n`);

  if (total === 0) {
    console.log('✅  Rien à faire — tous les GIFs sont déjà en cache.\n');
    return;
  }

  let done = 0;
  let errors = 0;

  // Traitement par lots de CONCURRENCY
  for (let i = 0; i < exercises.length; i += CONCURRENCY) {
    const batch = exercises.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processOne));

    results.forEach((r) => {
      if (r === 'ok') done++;
      else if (r === 'err') errors++;
    });

    const pct = Math.round(((i + batch.length) / total) * 100);
    console.log(`  ${done} / ${total} cachés (${pct}%) — ${errors} erreur(s)`);

    if (i + CONCURRENCY < exercises.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${errors > 0 ? '⚠️' : '🎉'}  Terminé — ${done} GIFs cachés, ${errors} erreur(s)\n`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });

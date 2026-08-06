/**
 * scripts/translate-instructions.ts
 * Traduit instructions[] → instructions_fr[] via l'API Claude.
 * Reprend là où ça s'est arrêté (instructions_fr IS NULL uniquement).
 *
 * Prérequis .env.local :
 *   EXPO_PUBLIC_SUPABASE_URL=...
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
 *   ANTHROPIC_API_KEY=...
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/translate-instructions.ts
 *   npx tsx --env-file=.env.local scripts/translate-instructions.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/translate-instructions.ts --all
 */

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY      = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const DRY_RUN           = process.argv.includes('--dry-run');
const FORCE_ALL         = process.argv.includes('--all');

// Claude model to use — haiku is cheapest for bulk translation
const MODEL = 'claude-haiku-4-5-20251001';
// Pause between API calls (ms) — respect rate limits
const DELAY_MS = 300;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE manquant'); process.exit(1); }
if (!ANTHROPIC_API_KEY)             { console.error('❌  ANTHROPIC_API_KEY manquant dans .env.local'); process.exit(1); }

// ── Supabase helpers ──────────────────────────────────────────
async function fetchExercises(): Promise<{ id: string; name: string; instructions: string[] }[]> {
  const rows: any[] = [];
  let from = 0;
  const filter = FORCE_ALL
    ? '&instructions=not.is.null'
    : '&instructions_fr=is.null&instructions=not.is.null';
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises_library?select=id,name,instructions${filter}&order=name&offset=${from}&limit=500`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const page: any[] = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page.filter(r => Array.isArray(r.instructions) && r.instructions.length > 0));
    if (page.length < 500) break;
    from += 500;
  }
  return rows;
}

async function patchInstructions(id: string, instructions_fr: string[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises_library?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ instructions_fr }),
  });
  if (!res.ok) throw new Error(`PATCH failed: ${res.status} ${await res.text()}`);
}

// ── Claude translation ────────────────────────────────────────
async function translateInstructions(steps: string[]): Promise<string[]> {
  const prompt = `Traduis ces instructions d'exercice en français naturel et concis.
Réponds UNIQUEMENT en JSON array : ["étape 1", "étape 2", ...]
Instructions à traduire :
${JSON.stringify(steps)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API: ${res.status} ${err}`);
  }

  const data: any = await res.json();
  const text: string = data.content?.[0]?.text ?? '';

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Réponse inattendue de Claude : ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────
(async () => {
  const mode  = DRY_RUN   ? ' [DRY RUN]'        : '';
  const scope = FORCE_ALL ? ' [TOUT RÉÉCRIRE]'   : ' [nouveaux uniquement]';
  console.log(`\n🇫🇷  Attiks — Traduction instructions via Claude${mode}${scope}\n`);
  console.log(`📦  Modèle : ${MODEL}\n`);

  const exercises = await fetchExercises();
  console.log(`📋  ${exercises.length} exercices à traiter\n`);

  if (exercises.length === 0) {
    console.log('✅  Toutes les instructions sont déjà traduites.\n');
    return;
  }

  let done = 0, errors = 0;

  for (const ex of exercises) {
    process.stdout.write(`  [${done + 1}/${exercises.length}] ${ex.name.substring(0, 50).padEnd(50)} `);

    if (DRY_RUN) {
      console.log('→ [DRY RUN]');
      done++;
      continue;
    }

    try {
      const translated = await translateInstructions(ex.instructions);
      await patchInstructions(ex.id, translated);
      console.log(`✓ (${translated.length} étapes)`);
      done++;
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n🎉  ${done} traduits${errors > 0 ? `, ${errors} erreurs` : ''}.\n`);
})().catch(err => { console.error('\nFatal:', err); process.exit(1); });

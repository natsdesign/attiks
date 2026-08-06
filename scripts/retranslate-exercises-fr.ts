/**
 * scripts/retranslate-exercises-fr.ts
 * Retraduit exercises_library.name_fr via Claude (traduction sémantique,
 * pas de règles mot-à-mot) — noms clairs, compréhensibles par tout le monde.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/retranslate-exercises-fr.ts
 *   npx tsx --env-file=.env.local scripts/retranslate-exercises-fr.ts --dry-run
 */

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DRY_RUN       = process.argv.includes('--dry-run');
const BATCH_SIZE    = 40;
const DELAY_MS      = 500;

if (!ANTHROPIC_KEY) { console.error('❌  ANTHROPIC_API_KEY manquant'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  SUPABASE manquant'); process.exit(1); }

interface Exercise {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  equipment: string | null;
}

async function fetchAll(): Promise<Exercise[]> {
  const all: Exercise[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/exercises_library?select=id,name,body_part,target_muscle,equipment&order=name&offset=${offset}&limit=1000`,
      { headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const page: Exercise[] = await res.json();
    all.push(...page);
    if (page.length < 1000) break;
  }
  return all;
}

async function translateBatch(batch: Exercise[]): Promise<string[]> {
  const list = batch.map((e, i) =>
    `${i + 1}. "${e.name}" (zone: ${e.body_part ?? '?'}, muscle: ${e.target_muscle ?? '?'}, matériel: ${e.equipment ?? '?'})`
  ).join('\n');

  const prompt = `Tu es coach sportif francophone. Traduis ces ${batch.length} noms d'exercices de musculation (anglais) vers le français utilisé RÉELLEMENT en salle de sport en France.

Règles strictes :
- PAS de traduction mot-à-mot — utilise le vrai vocabulaire qu'un coach francophone emploierait
- Nom concis, clair, compréhensible par un débutant comme par un confirmé
- Ordre naturel en français (le mouvement principal d'abord, ex: "Rowing haltère à un bras" pas "Un bras rowing haltère")
- Termes déjà courants en français dans les salles (rowing, squat, développé couché, tirage, curl, etc.) : garde-les tels quels, ne les traduis pas en périphrase
- Précise l'équipement seulement si utile pour distinguer (barre / haltères / poulie / machine / élastique / poids du corps)
- Une seule traduction par exercice, sans variante ni explication

Exercices à traduire :
${list}

Réponds UNIQUEMENT avec un tableau JSON de ${batch.length} chaînes, dans le même ordre, sans aucun texte autour :
["traduction 1", "traduction 2", ...]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text: string = data.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Réponse non-JSON: ${text.slice(0, 200)}`);
  const translations: string[] = JSON.parse(jsonMatch[0]);
  if (translations.length !== batch.length) {
    throw new Error(`Attendu ${batch.length} traductions, reçu ${translations.length}`);
  }
  return translations;
}

async function sbPatch(id: string, name_fr: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises_library?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name_fr }),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
}

(async () => {
  console.log('\n🇫🇷  Attiks — Retraduction sémantique des noms d\'exercices (Claude)\n');
  const exercises = await fetchAll();
  console.log(`📋  ${exercises.length} exercices à retraduire${DRY_RUN ? ' (DRY RUN — aucune écriture)' : ''}\n`);

  let done = 0;
  let errors = 0;

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    try {
      const translations = await translateBatch(batch);
      if (DRY_RUN) {
        batch.forEach((ex, j) => console.log(`  ${ex.name}  →  ${translations[j]}`));
      } else {
        for (let j = 0; j < batch.length; j++) {
          await sbPatch(batch[j].id, translations[j]);
        }
      }
      done += batch.length;
    } catch (err) {
      console.error(`  ✗ Lot ${i}-${i + batch.length}: ${(err as Error).message}`);
      errors += batch.length;
    }

    const pct = Math.round(((i + batch.length) / exercises.length) * 100);
    console.log(`  ${done + errors} / ${exercises.length} traités (${pct}%) — ${errors} erreur(s)`);

    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n${errors > 0 ? '⚠️' : '🎉'}  Terminé — ${done} traduits, ${errors} erreur(s)\n`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });

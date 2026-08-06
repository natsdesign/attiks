/**
 * scripts/upload-program-covers.ts
 * Upload les 6 photos de couverture des programmes vedettes (générées via
 * Higgsfield, téléchargées localement) vers Supabase Storage, puis met à
 * jour program_templates.cover_image_url.
 *
 * Prérequis :
 *   Exécuter migration_program_templates.sql + seed_program_templates.sql
 *   dans Supabase SQL Editor. Placer les 6 fichiers image dans
 *   scripts/covers/<slug>.jpg (un fichier par slug ci-dessous).
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/upload-program-covers.ts
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = 'program-covers';
const COVERS_DIR = path.join(__dirname, 'covers');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  SUPABASE_URL / SUPABASE_ANON_KEY manquant (.env.local)');
  process.exit(1);
}

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object`;
const PUBLIC_BASE  = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const SLUGS = [
  'full-body-debutant',
  'push-hypertrophie',
  'force-5x5',
  'perte-de-poids-circuit',
  'upper-lower-intermediaire',
  'callisthenie-sans-materiel',
] as const;

async function uploadToStorage(filename: string, data: Buffer): Promise<void> {
  const res = await fetch(`${STORAGE_BASE}/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: data,
  });
  if (!res.ok) throw new Error(`Upload ${filename}: ${res.status} ${await res.text()}`);
}

async function patchTemplate(slug: string, cover_image_url: string): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/program_templates?slug=eq.${slug}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ cover_image_url }),
    }
  );
  if (!res.ok) throw new Error(`PATCH ${slug}: ${res.status} ${await res.text()}`);
}

(async () => {
  console.log('\n📸  Attiks — Upload photos programmes vedettes\n');

  let done = 0;
  let errors = 0;

  for (const slug of SLUGS) {
    const filename = `${slug}.jpg`;
    const filepath = path.join(COVERS_DIR, filename);

    try {
      const data = await readFile(filepath);
      await uploadToStorage(filename, data);
      await patchTemplate(slug, `${PUBLIC_BASE}/${filename}`);
      done++;
      console.log(`  ✓ ${slug}`);
    } catch (err) {
      errors++;
      console.error(`  ✗ ${slug}: ${(err as Error).message}`);
    }
  }

  console.log(`\n${errors > 0 ? '⚠️' : '🎉'}  Terminé — ${done}/${SLUGS.length} photos uploadées, ${errors} erreur(s)\n`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });

import fs from 'node:fs';
import path from 'node:path';
import { pool } from './lib/db.js';

const migrationFiles = [
  '001_extensions_and_source_tables.sql',
  '002_app_tables.sql',
  '003_rls_and_audit.sql',
  '004_task_dedupe_key.sql',
];

async function main(): Promise<void> {
  const migrationsDir = path.resolve('supabase/migrations');

  console.log('Running migrations against hosted database...');

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    await pool.query(sql);
    console.log(`✓ Applied ${file}`);
  }

  console.log('\nAll migrations applied successfully.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('\nMigration failed:');
  console.error(err instanceof Error ? err.message : String(err));
  await pool.end();
  process.exit(1);
});


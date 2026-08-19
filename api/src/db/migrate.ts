import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(dir, 'migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const sql = postgres(databaseUrl, { max: 1 });

async function migrate() {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  for (const file of files) {
    const applied = await sql`SELECT id FROM _migrations WHERE id = ${file}`;
    if (applied.length > 0) continue;
    const contents = readFileSync(join(migrationsDir, file), 'utf8');
    await sql.unsafe(contents);
    await sql`INSERT INTO _migrations (id) VALUES (${file})`;
    console.log(`Applied ${file}`);
  }
  await sql.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for scripts and must not be used by packages/web.');
}

export const pool = new Pool({ connectionString: databaseUrl });

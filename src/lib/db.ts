import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { requireEnv } from './env';

const pool = new Pool({ connectionString: requireEnv('DATABASE_URL'), max: 5 });

export const db = drizzle(pool);

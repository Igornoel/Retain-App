import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => console.error('Idle PostgreSQL client error:', error.message));

export async function migrate() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migration = await fs.readFile(path.join(currentDir, 'migrations', '001_initial.sql'), 'utf8');
  await pool.query(migration);
}

export async function inTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await callback(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

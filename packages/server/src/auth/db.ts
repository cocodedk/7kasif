import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function buildConnectionString(): string {
  let connStr = process.env.DATABASE_URL || '';
  const passwordFile = process.env.DB_PASSWORD_FILE;

  if (passwordFile) {
    try {
      const password = readFileSync(passwordFile, 'utf-8').trim();
      const url = new URL(connStr);
      url.password = password;
      return url.toString();
    } catch {
      // Fall through to raw DATABASE_URL
    }
  }

  return connStr;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: buildConnectionString(),
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

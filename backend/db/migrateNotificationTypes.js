import { readFile } from 'node:fs/promises';
import pool from './pool.js';

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in backend/.env before running this migration');
  }

  const migration = await readFile(
    new URL('./migrations/002_notification_type_constraint.sql', import.meta.url),
    'utf8',
  );
  await pool.query(migration);
  console.log('[db] notification type constraint updated');
} finally {
  await pool.end();
}

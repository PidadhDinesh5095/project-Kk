import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();


const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('[db] Unexpected PostgreSQL pool error:', err.message);
});

export const connectDb = async () => {
  try {
    const client = await pool.connect();

    try {
      await client.query('SELECT 1');
      console.log('[db] PostgreSQL connected successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[db] PostgreSQL connection failed:', err.message);
    throw err;
  }
};

export default pool;
import pool from '../db/pool.js';

export async function cleanupExpiredPauseDates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rowCount: usersUpdated } = await client.query(
      `UPDATE users AS u
       SET pause_dates = ARRAY(
         SELECT dates.pause_date
         FROM unnest(u.pause_dates) AS dates(pause_date)
         WHERE dates.pause_date >= CURRENT_DATE
         ORDER BY dates.pause_date
       ),
       updated_at = now()
       WHERE EXISTS (
         SELECT 1
         FROM unnest(u.pause_dates) AS dates(pause_date)
         WHERE dates.pause_date < CURRENT_DATE
       )`
    );

    const { rowCount: subscriptionsUpdated } = await client.query(
      `UPDATE subscriptions AS s
       SET paused_ranges = COALESCE((
         SELECT jsonb_agg(ranges.pause_range ORDER BY ranges.position)
         FROM jsonb_array_elements(s.paused_ranges)
           WITH ORDINALITY AS ranges(pause_range, position)
         WHERE COALESCE(ranges.pause_range->>'endDate', ranges.pause_range->>'end') IS NULL
            OR COALESCE(ranges.pause_range->>'endDate', ranges.pause_range->>'end') >= CURRENT_DATE::text
       ), '[]'::jsonb)
       WHERE EXISTS (
         SELECT 1
         FROM jsonb_array_elements(s.paused_ranges) AS ranges(pause_range)
         WHERE COALESCE(ranges.pause_range->>'endDate', ranges.pause_range->>'end') IS NOT NULL
           AND COALESCE(ranges.pause_range->>'endDate', ranges.pause_range->>'end') < CURRENT_DATE::text
       )`
    );

    await client.query('COMMIT');
    return { usersUpdated, subscriptionsUpdated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

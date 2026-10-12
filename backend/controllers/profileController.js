import pool from '../db/pool.js';
import walletService from '../utils/walletService.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import deliveryCutoff from '../utils/deliveryCutoff.js';

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

// POST /profile/complete — first name + last name required, email/DOB optional
const completeProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, dob } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET first_name = $1, last_name = $2, email = COALESCE($3, email),
            dob = COALESCE($4, dob), profile_completed = true, updated_at = now()
     WHERE id = $5 RETURNING *`,
    [firstName, lastName, email || null, dob || null, req.user.id]
  );
  return ApiResponse.success(res, rows[0], 200, 'Profile completed');
});

// GET /profile/me
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, req.user);
});

// PATCH /profile/me
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, dob } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name  = COALESCE($2, last_name),
       email      = COALESCE($3, email),
       dob        = COALESCE($4, dob),
       updated_at = now()
     WHERE id = $5 RETURNING *`,
    [firstName, lastName, email, dob, req.user.id]
  );
  return ApiResponse.success(res, rows[0], 200, 'Profile updated');
});

const getPauseDates = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT pause_dates FROM users WHERE id = $1',
    [req.user.id]
  );
  const pauseDates = (rows[0]?.pause_dates ?? []).map(dateOnly);
  return ApiResponse.success(res, { pauseDates });
});

const updatePauseDates = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.user.id]);
    const { rows: userRows } = await client.query(
      'SELECT pause_dates FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const currentDates = (userRows[0]?.pause_dates ?? []).map(dateOnly);
    const datesToPause = req.body.dates.filter((date) => !currentDates.includes(date));
    const datesToUnpause = req.body.dates.filter((date) => currentDates.includes(date));
    const invalidPauseDate = datesToPause.find((date) => !deliveryCutoff.canPauseDeliveryDate(date));
    if (invalidPauseDate) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Deliveries can only be paused from ${deliveryCutoff.firstAvailablePauseDate()} onward.`,
      });
    }
    const nextDates = [...new Set([...currentDates, ...datesToPause])]
      .filter((date) => !datesToUnpause.includes(date))
      .sort();

    await client.query(
      'UPDATE users SET pause_dates = $1::date[], updated_at = now() WHERE id = $2',
      [nextDates, req.user.id]
    );

    if (datesToPause.length > 0) {
      const { rows: ordersToCancel } = await client.query(
        `SELECT * FROM orders
         WHERE user_id = $1 AND status = 'SCHEDULED'
           AND delivery_date >= CURRENT_DATE AND delivery_date = ANY($2::date[])
         FOR UPDATE`,
        [req.user.id, datesToPause]
      );
      await client.query(
        `UPDATE orders SET status = 'CANCELLED'
         WHERE user_id = $1 AND status = 'SCHEDULED'
           AND delivery_date >= CURRENT_DATE AND delivery_date = ANY($2::date[])`,
        [req.user.id, datesToPause]
      );
      for (const order of ordersToCancel) {
        if (order.source === 'ONE_TIME') {
          await walletService.credit(
            req.user.id,
            Number(order.total_amount),
            'credit',
            order.order_id,
            client
          );
        }
      }
    }

    if (datesToUnpause.length > 0) {
      await client.query(
        `UPDATE orders o SET status = 'SCHEDULED'
         FROM subscriptions s
         WHERE o.subscription_id = s.id AND s.status = 'ACTIVE'
           AND NOT (o.delivery_date = ANY(s.skipped_dates))
           AND o.user_id = $1 AND o.status = 'CANCELLED'
           AND o.delivery_date >= CURRENT_DATE AND o.delivery_date = ANY($2::date[])`,
        [req.user.id, datesToUnpause]
      );
    }

    await client.query('COMMIT');
    return ApiResponse.success(res, { pauseDates: nextDates }, 200, 'Pause dates updated');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default { completeProfile, getMe, updateProfile, getPauseDates, updatePauseDates };

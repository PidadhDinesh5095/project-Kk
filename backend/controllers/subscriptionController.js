import pool from '../db/pool.js';
import __cjsModule8 from '../kafka/producer.js';
const { publish } = __cjsModule8;
import topics from '../kafka/topics.js';
import __cjsModule9 from '../utils/pushNotificationService.js';
const { sendNotification } = __cjsModule9;
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const createSubscription = asyncHandler(async (req, res) => {
  const {
    frequency, productId, addressId, startDate, endDate,
    dailyQuantity, dailySlots, alternateConfig, customConfig,
  } = req.body;

  const { rows: productRows } = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
  const product = productRows[0];
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const client = await pool.connect();
  let subscription;
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO subscriptions
        (user_id, product_id, address_id, frequency, daily_quantity, daily_slots,
         alternate_config, custom_config, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.user.id, productId, addressId, frequency,
        frequency === 'DAILY' ? dailyQuantity : null,
        dailySlots,
        frequency === 'ALTERNATE' ? JSON.stringify(alternateConfig) : null,
        frequency === 'CUSTOM' ? JSON.stringify(customConfig) : null,
        startDate, endDate || null,
      ]
    );
    subscription = rows[0];

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // await publish(topics.SUBSCRIPTION_CREATED, {
  //   userId: req.user.id,
  //   productName: product.name,
  //   frequency,
  // });
  // await sendNotification(req.user.id, {
  //   type: 'SUBSCRIPTION_CREATED',
  //   title: 'Subscription Active',
  //   body: `Your ${frequency.toLowerCase()} subscription for ${product.name} is now active. Orders will be added automatically at 10:00 PM each day.`,
  //   referenceId: subscription.id,
  // });

  return ApiResponse.success(
    res,
    { subscription: serializeSubscription(subscription), generatedOrdersCount: 0 },
    201,
    'Subscription created'
  );
});

const listSubscriptions = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, p.name AS product_name, p.main_img_nobg AS product_image,
       to_char(COALESCE(
         (SELECT MIN(o.delivery_date)
          FROM orders o
          WHERE o.subscription_id = s.id
            AND o.status = 'SCHEDULED'
            AND o.delivery_date >= CURRENT_DATE),
         s.start_date
       ), 'YYYY-MM-DD') AS next_delivery_date
     FROM subscriptions s JOIN products p ON p.id = s.product_id
    WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
    [req.user.id]
  );
  return ApiResponse.success(res, rows.map(serializeSubscription));
});

const getSubscriptionCounts = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active
     FROM subscriptions WHERE user_id = $1`,
    [req.user.id]
  );
  return ApiResponse.success(res, rows[0]);
});

const getSubscriptionById = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, row_to_json(p) AS product FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE s.id = $1 AND s.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });
  return ApiResponse.success(res, serializeSubscription(rows[0]));
});

// Pause prevents future cron generation and cancels orders already created for upcoming deliveries.
const pauseSubscription = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE subscriptions
       SET status = 'PAUSED'
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const { rowCount } = await client.query(
      `UPDATE orders SET status = 'CANCELLED'
       WHERE subscription_id = $1 AND status = 'SCHEDULED' AND delivery_date >= CURRENT_DATE`,
      [req.params.id]
    );

    await client.query('COMMIT');
    return ApiResponse.success(
      res, { subscription: serializeSubscription(rows[0]), cancelledOrdersCount: rowCount },
      200, 'Subscription paused'
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

const resumeSubscription = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE subscriptions SET status = 'ACTIVE'
     WHERE id = $1 AND user_id = $2 AND status = 'PAUSED' RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Paused subscription not found' });
  }
  return ApiResponse.success(res, { subscription: serializeSubscription(rows[0]) }, 200, 'Subscription resumed');
});

// Same reasoning as pause: cancels any already-materialized order on exactly
// those dates, for every slot this subscription uses.
const normalizeCalendarDate = (value) => {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const serializeSubscription = (subscription) => ({
  ...subscription,
  skipped_dates: (subscription.skipped_dates ?? [])
    .map((value) => normalizeCalendarDate(value))
    .filter(Boolean),
});

const skipDates = asyncHandler(async (req, res) => {
  const dates = Array.isArray(req.body?.dates) ? req.body.dates : [];
  console.log('skipDates request body:', req.body);
  const normalized = [...new Set(dates.map(normalizeCalendarDate).filter(Boolean))].sort();
  console.log('skipDates normalized dates:', normalized);

  if (normalized.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid dates provided' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentSubscription = await client.query(
      `SELECT skipped_dates FROM subscriptions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (currentSubscription.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const currentSkipped = (currentSubscription.rows[0].skipped_dates ?? [])
      .map(normalizeCalendarDate)
      .filter(Boolean);
    const skippedSet = new Set(currentSkipped);
    const nextSkipped = [...new Set(currentSkipped.concat(normalized.filter((date) => !skippedSet.has(date))))];

    for (const date of normalized) {
      if (skippedSet.has(date)) {
        const index = nextSkipped.indexOf(date);
        if (index >= 0) nextSkipped.splice(index, 1);
      }
    }

    const nextSkippedDates = [...new Set(nextSkipped)].sort();
    const { rows } = await client.query(
      `UPDATE subscriptions
       SET skipped_dates = $1::date[]
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [nextSkippedDates, req.params.id, req.user.id]
    );

    const datesToSkip = normalized.filter((date) => !skippedSet.has(date));
    const datesToUnskip = normalized.filter((date) => skippedSet.has(date));

    let cancelledOrdersCount = 0;
    if (datesToSkip.length > 0) {
      const result = await client.query(
        `UPDATE orders SET status = 'CANCELLED'
         WHERE subscription_id = $1 AND status = 'SCHEDULED' AND delivery_date = ANY($2::date[])`,
        [req.params.id, datesToSkip]
      );
      cancelledOrdersCount = Number(result.rowCount || 0);
    }

    if (datesToUnskip.length > 0) {
      const result = await client.query(
        `UPDATE orders SET status = 'SCHEDULED'
         WHERE subscription_id = $1 AND status = 'CANCELLED' AND delivery_date = ANY($2::date[])`,
        [req.params.id, datesToUnskip]
      );
      cancelledOrdersCount += Number(result.rowCount || 0);
    }

    await client.query('COMMIT');
    return ApiResponse.success(
      res,
      { subscription: serializeSubscription(rows[0]), cancelledOrdersCount },
      200,
      datesToUnskip.length > 0 && datesToSkip.length === 0 ? 'Dates unskipped' : 'Dates updated'
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// Cancels the subscription AND every future SCHEDULED order it generated.
// Past/delivered orders are deliberately left untouched — cancelling a
// subscription never rewrites history.
const cancelSubscription = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE subscriptions SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const { rowCount } = await client.query(
      `UPDATE orders SET status = 'CANCELLED'
       WHERE subscription_id = $1 AND status = 'SCHEDULED' AND delivery_date >= CURRENT_DATE`,
      [req.params.id]
    );

    await client.query('COMMIT');
    return ApiResponse.success(res, { subscription: serializeSubscription(rows[0]), cancelledOrdersCount: rowCount }, 200, 'Subscription cancelled');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export default {
  createSubscription, listSubscriptions, getSubscriptionCounts, getSubscriptionById,
  pauseSubscription, resumeSubscription, skipDates, cancelSubscription,
};
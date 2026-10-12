import pool from '../db/pool.js';
import __cjsModule8 from '../kafka/producer.js';
const { publish } = __cjsModule8;
import topics from '../kafka/topics.js';
import __cjsModule9 from '../utils/pushNotificationService.js';
const { sendNotification } = __cjsModule9;
import __cjsModule10 from '../utils/subscriptionOrderGenerator.js';
const { computeOccurrences } = __cjsModule10;
import __cjsModule11 from '../utils/generateOrderId.js';
const { generateOrderId } = __cjsModule11;
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import deliveryCutoff from '../utils/deliveryCutoff.js';

const createSubscription = asyncHandler(async (req, res) => {
  const {
    frequency, productId, addressId, startDate, endDate,
    dailyQuantity, dailySlots, alternateConfig, customConfig,
  } = req.body;

  if (!deliveryCutoff.canPauseDeliveryDate(startDate)) {
    return res.status(409).json({
      success: false,
      message: `Subscriptions can start from ${deliveryCutoff.firstAvailablePauseDate()} onward.`,
    });
  }

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

const updateSubscriptionSchedule = asyncHandler(async (req, res) => {
  const { frequency, dailySlots, dailyQuantity, alternateConfig, customConfig, addressId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ownedRows } = await client.query(
      `SELECT status FROM subscriptions WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (ownedRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    if (ownedRows[0].status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Only active subscriptions can change their schedule' });
    }

    const setClauses = [
      'frequency = $1',
      'daily_quantity = $2',
      'daily_slots = $3',
      'alternate_config = $4::jsonb',
      'custom_config = $5::jsonb',
    ];
    const values = [
      frequency,
      frequency === 'DAILY' ? dailyQuantity : null,
      dailySlots,
      frequency === 'ALTERNATE' ? JSON.stringify(alternateConfig) : null,
      frequency === 'CUSTOM' ? JSON.stringify(customConfig) : null,
    ];

    if (addressId !== undefined && addressId !== null) {
      setClauses.push(`address_id = $${values.length + 1}`);
      values.push(addressId);
    }

    const { rows } = await client.query(
      `UPDATE subscriptions
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} AND status = 'ACTIVE'
       RETURNING *`,
      [...values, req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Editable subscription not found' });
    }

    const subscription = rows[0];
    if (subscription.status === 'ACTIVE') {
      const { rows: horizonRows } = await client.query(
        `SELECT to_char(GREATEST(COALESCE(MAX(delivery_date), CURRENT_DATE), CURRENT_DATE + 1), 'YYYY-MM-DD') AS through_date
         FROM orders
         WHERE subscription_id = $1 AND status = 'SCHEDULED' AND delivery_date >= CURRENT_DATE`,
        [subscription.id]
      );
      const { rows: productRows } = await client.query(
        `SELECT id, slug, price FROM products WHERE id = $1`,
        [subscription.product_id]
      );
      const product = productRows[0];
      const skippedDates = (subscription.skipped_dates ?? [])
        .map(normalizeCalendarDate)
        .filter(Boolean);
      subscription.skipped_dates = skippedDates;
      const occurrences = computeOccurrences(
        subscription,
        new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
        horizonRows[0].through_date
      );

      await client.query(
        `UPDATE orders SET status = 'CANCELLED'
         WHERE subscription_id = $1 AND status = 'SCHEDULED' AND delivery_date >= CURRENT_DATE`,
        [subscription.id]
      );

      for (const occurrence of occurrences) {
        const orderId = await generateOrderId(product.slug, occurrence.date);
        const totalAmount = Number((Number(product.price) * occurrence.qty).toFixed(2));
        await client.query(
          `INSERT INTO orders
            (order_id, user_id, address_id, product_id, quantity, delivery_date, slot,
             price_at_order, total_amount, status, source, subscription_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SCHEDULED','SUBSCRIPTION',$10)
           ON CONFLICT (subscription_id, delivery_date, slot) WHERE subscription_id IS NOT NULL
           DO UPDATE SET quantity = EXCLUDED.quantity, price_at_order = EXCLUDED.price_at_order,
             total_amount = EXCLUDED.total_amount, status = 'SCHEDULED'`,
          [
            orderId, subscription.user_id, subscription.address_id, subscription.product_id,
            occurrence.qty, occurrence.date, occurrence.slot, product.price, totalAmount, subscription.id,
          ]
        );
      }
    }

    await client.query('COMMIT');
    return ApiResponse.success(res, { subscription: serializeSubscription(subscription) }, 200, 'Schedule updated');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

const restartSubscription = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE subscriptions
       SET status = 'ACTIVE', cancellation_reason = NULL
       WHERE id = $1 AND user_id = $2 AND status = 'CANCELLED' RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Cancelled subscription not found' });
    }

    const { rowCount } = await client.query(
      `UPDATE orders o SET status = 'SCHEDULED'
       FROM subscriptions s
       WHERE s.id = $1 AND o.subscription_id = s.id
         AND o.status = 'CANCELLED' AND o.delivery_date >= CURRENT_DATE
         AND NOT (o.delivery_date = ANY(s.skipped_dates))`,
      [req.params.id]
    );

    await client.query('COMMIT');
    return ApiResponse.success(
      res,
      { subscription: serializeSubscription(rows[0]), restartedOrdersCount: rowCount },
      200,
      'Subscription restarted'
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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
  cancellation_reason: subscription.cancellation_reason ?? null,
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
      `SELECT status, skipped_dates FROM subscriptions WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (currentSubscription.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    if (currentSubscription.rows[0].status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Only active subscriptions can skip deliveries' });
    }

    const currentSkipped = (currentSubscription.rows[0].skipped_dates ?? [])
      .map(normalizeCalendarDate)
      .filter(Boolean);
    const skippedSet = new Set(currentSkipped);
    const datesToSkip = normalized.filter((date) => !skippedSet.has(date));
    const invalidSkipDate = datesToSkip.find((date) => !deliveryCutoff.canPauseDeliveryDate(date));
    if (invalidSkipDate) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Deliveries can only be skipped from ${deliveryCutoff.firstAvailablePauseDate()} onward.`,
      });
    }
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
  const reason = String(req.body?.reason ?? '').trim();
  if (!reason) {
    return res.status(400).json({ success: false, message: 'Please select a cancellation reason' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE subscriptions
       SET status = 'CANCELLED', cancellation_reason = $3
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, reason]
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
  pauseSubscription, resumeSubscription, restartSubscription, skipDates, cancelSubscription,
  updateSubscriptionSchedule,
};
import pool from '../db/pool.js';
import __cjsModule13 from '../utils/subscriptionOrderGenerator.js';
const { computeOccurrences, materializeOrders } = __cjsModule13;

// Runs daily at 10:00 PM. A subscription is only stored as an active/paused/cancelled
// record, and this cron turns that record into actual orders for the schedule.
//
// Safe to re-run any time: the partial unique index on
// (subscription_id, delivery_date, slot) plus ON CONFLICT DO NOTHING inside
// materializeOrders() means a date that already has an order is simply skipped,
// never duplicated.
async function generateDailySubscriptionOrders() {
  const { rows: subscriptions } = await pool.query(
    `SELECT s.*, p.slug AS product_slug, p.price AS product_price, p.id AS product_id
     FROM subscriptions s JOIN products p ON p.id = s.product_id
     WHERE s.status = 'ACTIVE' AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)`
  );

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 1);

  let totalCreated = 0;
  for (const subscription of subscriptions) {
    const product = {
      id: subscription.product_id,
      slug: subscription.product_slug,
      price: subscription.product_price,
    };

    const occurrences = computeOccurrences(subscription, today, windowEnd);
    const created = await materializeOrders(pool, subscription, product, occurrences);
    totalCreated += created.length;
  }

  console.log(
    `[subscription-cron] ${subscriptions.length} active subscriptions checked, ${totalCreated} new orders created`
  );
  return totalCreated;
}

export default generateDailySubscriptionOrders;
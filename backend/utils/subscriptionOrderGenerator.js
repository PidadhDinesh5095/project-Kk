import __cjsModule591 from './generateOrderId.js';
const { generateOrderId } = __cjsModule591;

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']; // index = Date.getDay()

function toDateOnly(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const date = new Date(value);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function isoDate(date) {
  return date.toISOString().slice(0, 10);
}
function isSkipped(dateStr, skippedDates) {
  return (skippedDates || []).some((d) => isoDate(new Date(d)) === dateStr);
}
// Computes every { date, slot, qty } this subscription should produce within
// [rangeStart, rangeEnd], honoring skipped dates. Paused subscriptions are
// excluded by the job query, so pause ranges are not part of this calculation.
function computeOccurrences(subscription, rangeStart, rangeEnd) {
  const occurrences = [];
  const subStart = toDateOnly(subscription.start_date);
  const subEnd = subscription.end_date ? toDateOnly(subscription.end_date) : null;

  let windowStart = toDateOnly(rangeStart) > subStart ? toDateOnly(rangeStart) : subStart;
  let windowEnd = toDateOnly(rangeEnd);
  if (subEnd && subEnd < windowEnd) windowEnd = subEnd;
  if (windowStart > windowEnd) return occurrences;

  const skippedDates = subscription.skipped_dates;
  const slots = [...new Set(subscription.daily_slots ?? [])];

  if (subscription.frequency === 'DAILY') {
    for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
      const dateStr = isoDate(d);
      if (isSkipped(dateStr, skippedDates)) continue;
      for (const slot of slots) {
        occurrences.push({ date: dateStr, slot, qty: subscription.daily_quantity });
      }
    }
  }

  if (subscription.frequency === 'ALTERNATE') {
    const config = subscription.alternate_config || {};
    // Alternation is anchored to the subscription's actual start_date, not
    // windowStart, so a later rolling-window call stays in phase with the
    // original pattern instead of drifting by a day each time it's re-run.
    const diffDays = Math.round((windowStart - subStart) / 86400000);
    let d = diffDays % 2 !== 0 ? addDays(windowStart, 1) : new Date(windowStart);
    for (; d <= windowEnd; d = addDays(d, 2)) {
      const dateStr = isoDate(d);
      if (isSkipped(dateStr, skippedDates)) continue;
      const isStartDate = dateStr === isoDate(subStart);
      const qty = isStartDate ? config.startDateQuantity : config.succeedingDayQuantity;
      for (const slot of slots) occurrences.push({ date: dateStr, slot, qty });
    }
  }

  if (subscription.frequency === 'CUSTOM') {
    const config = subscription.custom_config || {};
    const selectedDays = config.selectedDays || [];
    const quantityPerDay = config.quantityPerDay || {};
    for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
      const weekdayCode = WEEKDAY_CODES[d.getUTCDay()];
      if (!selectedDays.includes(weekdayCode)) continue;
      const dateStr = isoDate(d);
      if (isSkipped(dateStr, skippedDates)) continue;
      const qty = quantityPerDay[weekdayCode];
      if (!qty) continue;
      for (const slot of slots) occurrences.push({ date: dateStr, slot, qty });
    }
  }

  return occurrences;
}

// Writes each occurrence as a real row in `orders`. Wallet debit is deliberately
// NOT done here — debiting a customer for 30 days of milk the moment they
// subscribe would be a bad experience and a bad look. Debiting per-delivery,
// closer to the actual date, is a separate job (see jobs/debitSubscriptionOrders.js)
// — this function's only job is making sure the right order rows exist.
async function materializeOrders(client, subscription, product, occurrences) {
  const created = [];
  for (const occ of occurrences) {
    const orderId = await generateOrderId(product.slug, occ.date);
    const totalAmount = Number((product.price * occ.qty).toFixed(2));

    const { rows } = await client.query(
      `INSERT INTO orders
        (order_id, user_id, address_id, product_id, quantity, delivery_date, slot,
         price_at_order, total_amount, status, source, subscription_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SCHEDULED','SUBSCRIPTION',$10)
       ON CONFLICT (subscription_id, delivery_date, slot) DO NOTHING
       RETURNING *`,
      [
        orderId, subscription.user_id, subscription.address_id, subscription.product_id,
        occ.qty, occ.date, occ.slot, product.price, totalAmount, subscription.id,
      ]
    );
    if (rows[0]) created.push(rows[0]);
  }
  return created;
}

export default { computeOccurrences, materializeOrders };
import cron from 'node-cron';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pool from './db/pool.js';
import __cjsModule1 from './utils/generateOrderId.js';
const { generateOrderId } = __cjsModule1;
import __cjsModule2 from './utils/pushNotificationService.js';
const { sendNotification } = __cjsModule2;

export { pool };

const VALID_SLOTS = ['MORNING', 'EVENING'];
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ---------- helpers ----------
const parseJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

// MORNING: run before this IST hour (after midnight) -> TODAY; at/after it (e.g. 10 PM) -> TOMORROW.
const TODAY_CUTOFF_HOUR_IST = 12;

// target delivery date (YYYY-MM-DD) in IST
//  - EVENING: always TODAY (the 1:00 PM run generates that same evening's deliveries)
//  - MORNING: after midnight -> today, otherwise (10 PM run) -> tomorrow
function targetDateIST(slot) {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // shift to IST
  if (slot !== 'EVENING' && d.getUTCHours() >= TODAY_CUTOFF_HOUR_IST) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const toUTC = (s) => new Date(`${s}T00:00:00Z`);
const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

function isPaused(pausedRanges, target) {
  const ranges = parseJson(pausedRanges) || [];
  return ranges.some((range) => {
    const startDate = range.startDate ?? range.start;
    const endDate = range.endDate ?? range.end;
    return startDate && endDate && target >= String(startDate).slice(0, 10) && target <= String(endDate).slice(0, 10);
  });
}

// ---------- decision logic (returns qty + human-readable explanation) ----------
function getQuantity(sub, target) {
  switch (sub.frequency) {
    case 'DAILY':
      return {
        qty: sub.daily_quantity || 0,
        why: `DAILY -> daily_quantity = ${sub.daily_quantity}`,
      };

    case 'ALTERNATE': {
      const cfg = parseJson(sub.alternate_config) || {};
      const diff = daysBetween(sub.start_date, target);
      const isStartDay = diff % 2 === 0;
      const qty = Number(isStartDay ? cfg.startDateQuantity : cfg.succeedingDayQuantity) || 0;
      return {
        qty,
        why:
          `ALTERNATE -> ${diff} day(s) since start_date ${sub.start_date} ` +
          `(${isStartDay ? 'even' : 'odd'}) -> ` +
          `${isStartDay ? 'startDateQuantity' : 'succeedingDayQuantity'} = ${qty} ` +
          `[config: ${JSON.stringify(cfg)}]`,
      };
    }

    case 'CUSTOM': {
      const cfg = parseJson(sub.custom_config) || {};
      const code = DAY_CODES[toUTC(target).getUTCDay()];
      const selected = cfg.selectedDays || [];
      if (!selected.includes(code)) {
        return {
          qty: 0,
          why: `CUSTOM -> ${target} is ${code}, selectedDays = [${selected}] -> day not selected`,
        };
      }
      const qty = Number(cfg.quantityPerDay?.[code]) || 0;
      return {
        qty,
        why: `CUSTOM -> ${target} is ${code}, in selectedDays [${selected}] -> quantityPerDay[${code}] = ${qty}`,
      };
    }

    default:
      return { qty: 0, why: `unknown frequency "${sub.frequency}"` };
  }
}

// Runs every check in order; stops at the first failure. Returns { include, qty, checks[] }.
function evaluate(sub, target, slot) {
  const checks = [];
  const check = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    return pass;
  };
  const fail = () => ({ include: false, qty: 0, checks });

  if (!check('status is ACTIVE', sub.status === 'ACTIVE', `status = ${sub.status}`)) return fail();

  const slots = sub.daily_slots || [];
  if (!check(`slot ${slot} subscribed`, slots.includes(slot), `daily_slots = [${slots}]`)) return fail();

  if (!check('start_date <= target', sub.start_date <= target, `start_date = ${sub.start_date}, target = ${target}`))
    return fail();

  if (!check('not past end_date', !sub.end_date || sub.end_date >= target, `end_date = ${sub.end_date ?? 'none'}`))
    return fail();

  const skipped = sub.skipped_dates || [];
  if (!check('target not in skipped_dates', !skipped.includes(target), `skipped_dates = [${skipped}]`))
    return fail();

  const userPauseDates = sub.user_pause_dates || [];
  if (!check('target not in user pause_dates', !userPauseDates.includes(target), `pause_dates = [${userPauseDates}]`))
    return fail();

  if (!check('target not in paused_ranges', !isPaused(sub.paused_ranges, target), `paused_ranges = ${JSON.stringify(parseJson(sub.paused_ranges))}`))
    return fail();

  const { qty, why } = getQuantity(sub, target);
  if (!check('quantity > 0 for this date', qty > 0, why)) return fail();

  checks[checks.length - 1].detail = why;
  return { include: true, qty, checks };
}

// ---------- notification adapter ----------
// Default is a log-only stub. Plug in your real push helper once:
//   import { sendNotification } from './services/notification.service.js';
//   configure({ sendNotification });
let notify = sendNotification;
export function configure({ sendNotification } = {}) {
  if (sendNotification) notify = sendNotification;
}

// ---------- wallet + order placement ----------
const toCents = (v) => Math.round(Number(v) * 100);
const inr = (v) => `Rs.${Number(v).toFixed(2)}`;
const rand = () => crypto.randomBytes(4).toString('hex').toUpperCase();
const ymd = (t) => t.slice(2).replace(/-/g, '');
const makeTxnId = (t) => `WTX-${ymd(t)}-${rand()}`;
// deterministic + unique in wallet_transactions.reference -> a second debit for the same
// subscription/date/slot is impossible (same idea as creditOnce with the payment id)
const refFor = (o) => `SUB:${o.subscription_id}:${o.delivery_date}:${o.slot}`;

// One order = one DB transaction: lock wallet -> check -> debit -> wallet txn -> order.
// Any failure rolls the whole thing back, so money and order never get out of sync.
async function placeOrder(client, o, dryRun) {
  const reference = refFor(o);
  const finish = async (result) => {
    if (!dryRun) await client.query('rollback').catch(() => {});
    return result;
  };

  try {
    if (!dryRun) await client.query('begin');

    const w = await client.query(
      `select id, balance::text as balance, status
         from public.wallets where user_id = $1${dryRun ? '' : ' for update'}`,
      [o.user_id]
    );
    if (!w.rows.length) return finish({ status: 'NO_WALLET' });
    const wallet = w.rows[0];
    console.log(
      `   wallet ${wallet.id}: status=${wallet.status} balance=${inr(wallet.balance)} | needed=${inr(o.total_amount)}`
    );

    if (wallet.status !== 'active') return finish({ status: 'WALLET_INACTIVE', wallet });

    const dup = await client.query(
      `select order_id from public.orders
        where subscription_id = $1 and delivery_date = $2 and slot = $3`,
      [o.subscription_id, o.delivery_date, o.slot]
    );
    if (dup.rows.length) return finish({ status: 'ALREADY_EXISTS', detail: `order ${dup.rows[0].order_id}` });

    if (toCents(wallet.balance) < toCents(o.total_amount)) return finish({ status: 'INSUFFICIENT', wallet });

    if (dryRun) return { status: 'WOULD_CREATE', wallet };

    // 1) debit wallet
    const upd = await client.query(
      `update public.wallets set balance = balance - $1, updated_at = now()
        where id = $2 returning balance::text as balance`,
      [o.total_amount, wallet.id]
    );
    const balanceAfter = upd.rows[0].balance;

    // 2) wallet transaction (status must be 'completed' - the column default 'SUCCESS' fails the check)
    const transactionId = makeTxnId(o.delivery_date);
    const txn = await client.query(
      `insert into public.wallet_transactions
         (user_id, type, amount, balance_after, reference, status, wallet_id, transaction_id)
       values ($1, 'debit', $2, $3, $4, 'completed', $5, $6)
       on conflict (reference) do nothing
       returning id`,
      [o.user_id, o.total_amount, balanceAfter, reference, wallet.id, transactionId]
    );
    if (!txn.rowCount) return finish({ status: 'ALREADY_EXISTS', detail: `wallet txn reference ${reference}` });

    // 3) order, linked to the wallet transaction
    const orderId = await generateOrderId(
      o.product_slug,
      new Date(`${o.delivery_date}T12:00:00`)
    );
    const ord = await client.query(
      `insert into public.orders
         (order_id, user_id, address_id, product_id, quantity, delivery_date, slot,
          price_at_order, total_amount, status, wallet_transaction_id, source, subscription_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'SCHEDULED',$10,'SUBSCRIPTION',$11)
       on conflict (subscription_id, delivery_date, slot) where subscription_id is not null
       do nothing
       returning id`,
      [orderId, o.user_id, o.address_id, o.product_id, o.quantity, o.delivery_date, o.slot,
       o.price_at_order, o.total_amount, txn.rows[0].id, o.subscription_id]
    );
    if (!ord.rowCount) return finish({ status: 'ALREADY_EXISTS', detail: 'order unique index' });

    await client.query('commit');
    return {
      status: 'CREATED',
      wallet,
      orderId,
      transactionId,
      balanceBefore: wallet.balance,
      balanceAfter,
    };
  } catch (err) {
    return finish({ status: 'ERROR', error: err.message });
  }
}

// ---------- main job ----------
export async function generateOrdersForSlot(slot, target = targetDateIST(slot), { dryRun = false } = {}) {
  if (!VALID_SLOTS.includes(slot)) throw new Error(`Invalid slot "${slot}" (use MORNING or EVENING)`);
  const client = await pool.connect();
  const lockKey = `orders:${slot}:${target}`;
  let locked = false;
  try {
    // only ONE run per slot+date at a time (two server instances, cron + manual run, etc.).
    // Session-level advisory lock: Postgres drops it automatically if this process crashes.
    if (!dryRun) {
      const lk = await client.query('select pg_try_advisory_lock(hashtext($1)) as locked', [lockKey]);
      locked = lk.rows[0].locked;
      if (!locked) {
        console.log(`[${new Date().toISOString()}] ${lockKey} is already running elsewhere - skipping this run`);
        return { target, slot, dryRun, alreadyRunning: true, created: 0, orders: [] };
      }
    }

    // fetch ALL subscriptions so every decision (include or skip) can be logged
    const { rows: subs } = await client.query(
            `select s.id, s.user_id, s.address_id, s.product_id, s.frequency, s.status,
              s.daily_quantity, s.alternate_config, s.custom_config,
              s.start_date::text as start_date,
              s.end_date::text as end_date,
              s.skipped_dates::text[] as skipped_dates,
              s.paused_ranges, s.daily_slots,
              u.pause_dates::text[] as user_pause_dates,
              p.price, p.slug as product_slug
         from public.subscriptions s
         left join public.products p on p.id = s.product_id
         left join public.users u on u.id = s.user_id
        order by s.created_at`
    );

    // ONE query up front: which subscriptions already have an order for this date+slot?
    // They are skipped before anything else (no checks, no transaction, no wallet lock, no new IDs).
    const { rows: existingRows } = await client.query(
      `select subscription_id, order_id from public.orders
        where delivery_date = $1::date and slot = $2 and subscription_id is not null`,
      [target, slot]
    );
    const existing = new Map(existingRows.map((r) => [r.subscription_id, r.order_id]));

    console.log('='.repeat(80));
    console.log(
      `[${new Date().toISOString()}] JOB START  target=${target}  slot=${slot}  subs=${subs.length}  mode=${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`
    );
    console.log('='.repeat(80));

    const stat = { skipped: 0, created: 0, alreadyExisted: 0, insufficient: 0, walletIssues: 0, errors: 0 };
    const orders = [];
    const lowBalance = new Map(); // user_id -> { walletId, balance, neededCents, count }
    let debitedCents = 0;

    for (const [i, sub] of subs.entries()) {
      const doneOrderId = existing.get(sub.id);
      if (doneOrderId) {
        console.log(
          `\n#${i + 1} subscription ${sub.id}\n` +
            `   => ALREADY PROCESSED: order ${doneOrderId} exists for ${target} ${slot} - skipped before any wallet lock, nothing generated`
        );
        stat.alreadyExisted++;
        continue;
      }

      const r = evaluate(sub, target, slot);
      console.log(
        `\n#${i + 1} subscription ${sub.id}\n` +
          `   user=${sub.user_id}  product=${sub.product_id}  freq=${sub.frequency}`
      );
      r.checks.forEach((c) => console.log(`   ${c.pass ? '[PASS]' : '[FAIL]'} ${c.name}  ::  ${c.detail}`));

      if (!r.include) {
        console.log('   => DECISION: SKIP (no order)');
        stat.skipped++;
        continue;
      }

      if (sub.price == null || !(Number(sub.price) >= 0)) {
        console.log('   => DECISION: SKIP (product price missing, cannot charge)');
        stat.errors++;
        continue;
      }

      const priceCents = toCents(sub.price);
      const o = {
        subscription_id: sub.id,
        user_id: sub.user_id,
        address_id: sub.address_id,
        product_id: sub.product_id,
        product_slug: sub.product_slug,
        quantity: r.qty,
        delivery_date: target,
        slot,
        price_at_order: (priceCents / 100).toFixed(2),
        total_amount: ((priceCents * r.qty) / 100).toFixed(2),
      };
      console.log(`   => DECISION: CREATE ORDER qty=${o.quantity} price=${o.price_at_order} total=${o.total_amount}`);

      if (Number(o.total_amount) <= 0) {
        // wallet_transactions.amount must be > 0
        console.log('   => total is 0, skipping');
        stat.errors++;
        continue;
      }

      const res = await placeOrder(client, o, dryRun);

      switch (res.status) {
        case 'CREATED':
          console.log(
            `   => ORDER CREATED ${res.orderId} | wallet txn ${res.transactionId} | debited ${inr(o.total_amount)} | balance ${inr(res.balanceBefore)} -> ${inr(res.balanceAfter)}`
          );
          stat.created++;
          debitedCents += toCents(o.total_amount);
          orders.push({ order_id: res.orderId, ...o });
          break;
        case 'WOULD_CREATE':
          console.log(`   => [DRY RUN] would create order and debit ${inr(o.total_amount)}`);
          stat.created++;
          debitedCents += toCents(o.total_amount);
          orders.push({ order_id: '(dry run)', ...o });
          break;
        case 'ALREADY_EXISTS':
          console.log(`   => ALREADY PROCESSED (${res.detail}) - nothing charged, nothing created`);
          stat.alreadyExisted++;
          break;
        case 'INSUFFICIENT': {
          const short = (toCents(o.total_amount) - toCents(res.wallet.balance)) / 100;
          console.log(`   => INSUFFICIENT BALANCE: short by ${inr(short)} -> order NOT created, user will be notified`);
          stat.insufficient++;
          const lb = lowBalance.get(sub.user_id) || {
            walletId: res.wallet.id,
            balance: res.wallet.balance,
            neededCents: 0,
            count: 0,
          };
          lb.neededCents += toCents(o.total_amount);
          lb.count++;
          lowBalance.set(sub.user_id, lb);
          break;
        }
        case 'NO_WALLET':
          console.log('   => NO WALLET found for user - order NOT created');
          stat.walletIssues++;
          break;
        case 'WALLET_INACTIVE':
          console.log(`   => WALLET ${res.wallet.status} - order NOT created`);
          stat.walletIssues++;
          break;
        default:
          console.log(`   => ERROR, rolled back: ${res.error}`);
          stat.errors++;
      }
    }

    // one notification per user, even if several subscriptions failed
    if (lowBalance.size) console.log('\n' + '-'.repeat(80) + '\nLOW BALANCE NOTIFICATIONS');
    for (const [userId, lb] of lowBalance) {
      const payload = {
        type: 'GENERAL',
        title: 'Insufficient wallet balance',
        body:
          `Your wallet balance (${inr(lb.balance)}) is not enough for ${lb.count} ${slot.toLowerCase()} subscription order(s) ` +
          `on ${target}. ${inr(lb.neededCents / 100)} needed. Please top up to avoid missed deliveries.`,
        referenceId: lb.walletId,
      };
      if (dryRun) {
        console.log(`   [DRY RUN] would notify user=${userId}: ${payload.body}`);
        continue;
      }
      try {
        await notify(userId, payload);
        console.log(`   notified user=${userId}: ${payload.body}`);
      } catch (err) {
        console.log(`   FAILED to notify user=${userId}: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(
      `JOB SUMMARY  target=${target}  mode=${dryRun ? 'DRY RUN' : 'LIVE'}  checked=${subs.length}\n` +
        `   orders ${dryRun ? 'that would be created' : 'created'}: ${stat.created}  (total ${dryRun ? 'to debit' : 'debited'}: ${inr(debitedCents / 100)})\n` +
        `   skipped by rules: ${stat.skipped}  | already processed: ${stat.alreadyExisted}\n` +
        `   insufficient balance: ${stat.insufficient} (${lowBalance.size} user(s) notified)\n` +
        `   wallet problems: ${stat.walletIssues}  | errors: ${stat.errors}`
    );
    console.table(orders);

    return { target, dryRun, checked: subs.length, ...stat, notifiedUsers: lowBalance.size, debited: debitedCents / 100, orders };
  } catch (err) {
    console.error('Order generation failed:', err);
    throw err;
  } finally {
    if (locked) await client.query('select pg_advisory_unlock(hashtext($1))', [lockKey]).catch(() => {});
    client.release();
  }
}

// ---------- public methods ----------
export const generateMorningOrders = (target, opts) => generateOrdersForSlot('MORNING', target, opts);
export const generateEveningOrders = (target, opts) => generateOrdersForSlot('EVENING', target, opts);

// ---------- schedule ----------
const MORNING_CRON = '0 22 * * *'; // 10:00 PM IST -> tomorrow's morning deliveries
const EVENING_CRON = '0 13 * * *'; // 1:00 PM IST  -> today's evening deliveries

// Catch-up windows (IST hour). If the server was down at the scheduled time, the job is re-run on boot
// while we are still inside the window. Adjust to your real delivery times.
const MORNING_CATCHUP = (h) => h >= 22 || h < 6;  // 10 PM -> 6 AM
const EVENING_CATCHUP = (h) => h >= 13 && h < 17; // 1 PM -> 5 PM
const hourIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();

// Call this once from server.js (or just run this file directly).
// node-cron does not replay missed runs, so on boot we re-run any slot whose window is still open.
// Safe to repeat: finished orders are skipped, only the missing ones are created.
export function startScheduler() {
  (async () => {
    const h = hourIST();
    if (MORNING_CATCHUP(h)) {
      console.log('Startup catch-up: MORNING');
      await generateMorningOrders().catch((e) => console.error('catch-up MORNING failed:', e.message));
    }
    if (EVENING_CATCHUP(h)) {
      console.log('Startup catch-up: EVENING');
      await generateEveningOrders().catch((e) => console.error('catch-up EVENING failed:', e.message));
    }
  })();

  cron.schedule(MORNING_CRON, () => generateMorningOrders().catch((err) => {
    console.error('[cron] MORNING order generation failed:', err);
  }), { timezone: 'Asia/Kolkata' });
  cron.schedule(EVENING_CRON, () => generateEveningOrders().catch((err) => {
    console.error('[cron] EVENING order generation failed:', err);
  }), { timezone: 'Asia/Kolkata' });

 
}

// ---------- run directly: node job.js  (importing this file does NOT start anything) ----------
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--now')) {
    // manual run: node job.js --now [YYYY-MM-DD] [--slot=MORNING|EVENING|BOTH] [--dry]
    const date = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
    const slotArg = (process.argv.find((a) => a.startsWith('--slot=')) || '--slot=MORNING').split('=')[1].toUpperCase();
    const opts = { dryRun: process.argv.includes('--dry') };
    (async () => {
      if (slotArg === 'MORNING' || slotArg === 'BOTH') await generateMorningOrders(date, opts);
      if (slotArg === 'EVENING' || slotArg === 'BOTH') await generateEveningOrders(date, opts);
    })()
      .catch(() => (process.exitCode = 1))
      .finally(() => pool.end());
  } else {
    startScheduler();
  }
}
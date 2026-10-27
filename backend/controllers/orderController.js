import pool from '../db/pool.js';
import walletService from '../utils/walletService.js';
import __cjsModule3 from '../utils/generateOrderId.js';
const { generateOrderId } = __cjsModule3;
import { emitEvents } from '../kafka/producer.js';
import { EVENT_TYPES } from '../kafka/constants.js';
import __cjsModule5 from '../socket/socket.js';
const { emitToUser } = __cjsModule5;
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /orders — matches the "Select delivery date / slot / quantity / Confirm
// Order" screen exactly. Debits the wallet and creates the order in one real
// Postgres transaction — either both happen or neither does.
const createOrder = asyncHandler(async (req, res) => {
  const { productId, addressId, quantity, deliveryDate } = req.body;
  const slots = req.body.slots ?? [req.body.slot];

  const [{ rows: productRows }, { rows: addressRows }] = await Promise.all([
    pool.query('SELECT * FROM products WHERE id = $1', [productId]),
    pool.query('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [addressId, req.user.id]),
  ]);
  const product = productRows[0];
  const address = addressRows[0];
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

  const orderAmount = Number((product.price * quantity).toFixed(2));
  const totalAmount = Number((orderAmount * slots.length).toFixed(2));

  const client = await pool.connect();
  let orders;
  let walletTransaction;
  try {
    await client.query('BEGIN');

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.user.id]);
    const { rows: userRows } = await client.query(
      'SELECT pause_dates FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    if ((userRows[0]?.pause_dates ?? []).some((date) => new Date(date).toISOString().slice(0, 10) === deliveryDate)) {
      const error = new Error('Deliveries are paused for the selected date.');
      error.statusCode = 409;
      throw error;
    }
    walletTransaction = await walletService.debit(req.user.id, totalAmount, 'debit', null, client);
    orders = [];

    for (const selectedSlot of slots) {
      const orderId = await generateOrderId(product.slug, deliveryDate);
      const { rows } = await client.query(
        `INSERT INTO orders
          (order_id, user_id, address_id, product_id, quantity, delivery_date, slot,
           price_at_order, total_amount, wallet_transaction_id, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ONE_TIME') RETURNING *`,
        [orderId, req.user.id, addressId, productId, quantity, deliveryDate, selectedSlot, product.price, orderAmount, walletTransaction.id]
      );
      orders.push(rows[0]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.message === 'INSUFFICIENT_BALANCE') {
      e.message = 'Insufficient wallet balance to place this order.';
    }
    throw e;
  } finally {
    client.release();
  }

  const events = [];
  for (const order of orders) {
    const payload = { userId: req.user.id, orderId: order.order_id, productName: product.name,
      totalAmount: Number(order.total_amount), deliveryDate };
    events.push(
      { type: EVENT_TYPES.ORDER_CONFIRMED, payload },
      { type: EVENT_TYPES.INVOICE_GENERATE, payload }
    );
    emitToUser(req.user.id, 'order:created', { orderId: order.order_id, status: order.status });
  }
  emitEvents(req.user.id, events);

  const responseData = req.body.slots
    ? { orders, walletTransaction, balance: walletTransaction.balance_after }
    : orders[0];
  return ApiResponse.success(res, responseData, 201, 'Order placed');
});

// GET /orders?date=
const listOrders = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { rows } = date
    ? await pool.query(
    `SELECT o.id, o.order_id, o.product_id, o.quantity,
      to_char(o.delivery_date, 'YYYY-MM-DD') AS delivery_date,
      o.slot, o.price_at_order, o.total_amount, o.status,
      p.name AS product_name, p.images, p.main_img_nobg, p.quantity_label
         FROM orders o JOIN products p ON p.id = o.product_id
         WHERE o.user_id = $1 AND o.delivery_date = $2 ORDER BY o.created_at DESC`,
        [req.user.id, date]
      )
    : await pool.query(
    `SELECT o.id, o.order_id, o.product_id, o.quantity,
      to_char(o.delivery_date, 'YYYY-MM-DD') AS delivery_date,
      o.slot, o.price_at_order, o.total_amount, o.status,
      p.name AS product_name, p.images, p.main_img_nobg, p.quantity_label
         FROM orders o JOIN products p ON p.id = o.product_id
         WHERE o.user_id = $1 ORDER BY o.delivery_date DESC`,
        [req.user.id]
      );
  return ApiResponse.success(res, rows);
});

// GET /orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
        `SELECT o.id, o.order_id, o.product_id, o.quantity,
          to_char(o.delivery_date, 'YYYY-MM-DD') AS delivery_date,
          o.slot, o.price_at_order, o.total_amount, o.status, o.source,
          o.wallet_transaction_id,
          row_to_json(p) AS product, row_to_json(a) AS address
     FROM orders o
     JOIN products p ON p.id = o.product_id
     JOIN addresses a ON a.id = o.address_id
     WHERE o.id = $1 AND o.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
  return ApiResponse.success(res, rows[0]);
});

// GET /orders/:id/invoice
const getInvoice = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, p.name AS product_name, p.quantity_label,
            u.first_name, u.last_name, a.flat_no_apartment_floor,
            a.block_tower, a.landmark, a.pincode
     FROM orders o
     JOIN products p ON p.id = o.product_id
     JOIN users u ON u.id = o.user_id
     JOIN addresses a ON a.id = o.address_id
     WHERE o.id = $1 AND o.user_id = $2`,
    [req.params.id, req.user.id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const amount = Number(order.total_amount);
  const invoiceDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
  return ApiResponse.success(res, {
    invoiceNumber: `INV-${order.order_id}`,
    orderId: order.order_id,
    dateGenerated: invoiceDate,
    billedTo: [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer',
    deliveryAddress: [
      order.flat_no_apartment_floor,
      order.block_tower,
      order.landmark,
      order.pincode,
    ].filter(Boolean).join(', '),
    productName: `${order.product_name} ${order.quantity_label}`.trim(),
    quantity: order.quantity,
    rate: order.price_at_order,
    subtotal: amount,
    total: amount,
    paymentMode: order.wallet_transaction_id ? 'Wallet' : order.source === 'SUBSCRIPTION' ? 'Subscription payment' : 'Pending',
  });
});

// PATCH /orders/:id/cancel — only before it's out for delivery; refunds to wallet.
const cancelOrder = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  let order;
  let refund;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [req.user.id]);
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]
    );
    order = rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status !== 'SCHEDULED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This order can no longer be cancelled' });
    }

    await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['CANCELLED', order.id]);
    refund = await walletService.credit(req.user.id, order.total_amount, 'credit', order.order_id, client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  emitEvents(req.user.id, [
    {
      type: EVENT_TYPES.ORDER_CANCELLED,
      payload: { userId: req.user.id, orderId: order.order_id, cancelledBy: 'USER' },
    },
    {
      type: EVENT_TYPES.WALLET_REFUNDED,
      payload: {
        userId: req.user.id,
        amount: Number(order.total_amount),
        balanceAfter: refund.balance_after,
        orderId: order.order_id,
      },
    },
  ]);
  emitToUser(req.user.id, 'order:cancelled', { orderId: order.order_id });
  return ApiResponse.success(res, { ...order, status: 'CANCELLED' }, 200, 'Order cancelled and refunded to wallet');
});

export default { createOrder, listOrders, getOrderById, getInvoice, cancelOrder };

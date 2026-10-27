import crypto from 'crypto';
import pool from '../db/pool.js';
import razorpay from '../config/razorpay.js';
import walletService from '../utils/walletService.js';
import { emitEvent } from '../kafka/producer.js';
import { EVENT_TYPES } from '../kafka/constants.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /wallet
const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.user.id);
  return ApiResponse.success(res, {
    id: wallet.id,
    userId: wallet.user_id,
    balance: Number(wallet.balance),
    totalDeposit: Number(wallet.total_deposit),
    status: wallet.status,
  });
});

// POST /wallet/topup — creates a Razorpay order; the wallet is NOT credited yet.
const initiateTopup = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const normalizedAmount = Number(Number(amount).toFixed(2));
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(normalizedAmount * 100),
    currency: 'INR',
    receipt: `topup_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`,
    notes: { user_id: String(req.user.id) },
  });
  return ApiResponse.success(res, {
    razorpayOrder,
    keyId: process.env.RAZORPAY_KEY_ID,
    amount: normalizedAmount,
  }, 201);
});

// POST /wallet/topup/verify
// Verify the signature and fetch the order/payment from Razorpay before crediting.
const verifyTopup = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const receivedBuffer = Buffer.from(razorpaySignature, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(razorpayOrderId),
    razorpay.payments.fetch(razorpayPaymentId),
  ]);

  if (
    order.notes?.user_id !== String(req.user.id) ||
    order.currency !== 'INR' ||
    order.status !== 'paid' ||
    payment.order_id !== razorpayOrderId ||
    payment.currency !== 'INR' ||
    payment.status !== 'captured' ||
    Number(payment.amount) !== Number(order.amount)
  ) {
    return res.status(400).json({ success: false, message: 'Payment details could not be verified' });
  }

  const amount = Number((Number(order.amount) / 100).toFixed(2));
  const txn = await walletService.creditOnce(req.user.id, amount, 'credit', razorpayPaymentId);

  if (txn.inserted) {
    emitEvent(EVENT_TYPES.WALLET_TOPUP_SUCCESS, req.user.id, {
      userId: req.user.id,
      amount,
      balanceAfter: txn.balance_after,
    });
  }

  const balance = await walletService.getBalance(req.user.id);
  return ApiResponse.success(res, {
    transaction: txn,
    balance,
  }, 200, 'Wallet topped up');
});

// POST /wallet/withdraw — debits the wallet; external payouts are not configured yet.
const withdraw = asyncHandler(async (req, res) => {
  const amount = Number(Number(req.body.amount).toFixed(2));
  const wallet = await walletService.getWallet(req.user.id);
  if (wallet.status !== 'active') {
    const error = new Error('Wallet is not active. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  let transaction;
  try {
    transaction = await walletService.debit(
      req.user.id,
      amount,
      'debit',
      `wallet-withdrawal:${crypto.randomBytes(16).toString('hex')}`
    );
  } catch (error) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      error.message = 'Insufficient wallet balance.';
    }
    throw error;
  }

  emitEvent(EVENT_TYPES.WALLET_WITHDRAW_SUCCESS, req.user.id, {
    userId: req.user.id,
    amount,
    balanceAfter: transaction.balance_after,
  });

  return ApiResponse.success(res, {
    transaction,
    balance: transaction.balance_after,
  }, 200, 'Withdrawal recorded');
});

// GET /wallet/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const parsedOffset = Number.parseInt(req.query.offset ?? '0', 10);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const limit = 10;
  const [{ rows }, countResult] = await Promise.all([
    pool.query(
      `SELECT wt.id, wt.user_id, wt.wallet_id, wt.transaction_id, wt.type,
              wt.amount, wt.balance_after, wt.status, wt.reference, wt.created_at,
              (
                SELECT string_agg(DISTINCT p.name, ', ')
                FROM orders o
                JOIN products p ON p.id = o.product_id
                WHERE o.wallet_transaction_id = wt.id AND o.user_id = wt.user_id
              ) AS purchased_product_name
       FROM wallet_transactions wt
       WHERE wt.user_id = $1
       ORDER BY wt.created_at DESC, wt.id DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM wallet_transactions WHERE user_id = $1', [req.user.id]),
  ]);
  const total = countResult.rows[0].total;
  return ApiResponse.success(res, { items: rows, offset, limit, total, hasMore: offset + rows.length < total });
});

export default { getWallet, initiateTopup, verifyTopup, withdraw, getTransactions };

import crypto from 'crypto';
import pool from '../db/pool.js';

function generateTransactionId() {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `DFTNX${suffix}`;
}

async function getWallet(userId, client = pool) {
  const { rows } = await client.query(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  );
  if (!rows[0]) {
    const err = new Error('WALLET_NOT_FOUND');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

async function getBalance(userId, client = pool) {
  const wallet = await getWallet(userId, client);
  return Number(wallet.balance);
}

async function _writeEntry(client, userId, amount, type, reference, status = 'completed', wallet = null) {
  const walletRow = wallet ?? await getWallet(userId, client);
  const currentBalance = Number(walletRow.balance);

  if (amount < 0 && currentBalance < Math.abs(amount)) {
    const err = new Error('INSUFFICIENT_BALANCE');
    err.statusCode = 402;
    err.shortfall = Number((Math.abs(amount) - currentBalance).toFixed(2));
    throw err;
  }

  const nextBalance = Number((currentBalance + amount).toFixed(2));
  const transactionId = generateTransactionId();
  const { rows } = await client.query(
    `INSERT INTO wallet_transactions
      (user_id, wallet_id, transaction_id, type, amount, balance_after, status, reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, walletRow.id, transactionId, type, Math.abs(amount), nextBalance, status, reference]
  );

  if (status === 'completed') {
    await client.query(
      `UPDATE wallets SET balance = $1, total_deposit = total_deposit + $2, updated_at = now()
       WHERE id = $3`,
      [nextBalance, type === 'credit' ? Math.abs(amount) : 0, walletRow.id]
    );
  }

  return { ...rows[0], balance_after: Number(rows[0].balance_after), inserted: true };
}

async function credit(userId, amount, type, reference, existingClient = null) {
  if (existingClient) return _writeEntry(existingClient, userId, amount, type, reference, 'completed', null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
    const walletRow = await getWallet(userId, client);
    const result = await _writeEntry(client, userId, amount, type, reference, 'completed', walletRow);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function debit(userId, amount, type, reference, existingClient = null) {
  if (existingClient) return _writeEntry(existingClient, userId, -amount, type, reference, 'completed', null);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
    const walletRow = await getWallet(userId, client);
    const result = await _writeEntry(client, userId, -amount, type, reference, 'completed', walletRow);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function creditOnce(userId, amount, type, reference) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
    const walletRow = await getWallet(userId, client);
    const { rows } = await client.query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = $1 AND reference = $2 AND status = 'completed'
       LIMIT 1`,
      [userId, reference]
    );

    if (rows[0]) {
      if (Number(rows[0].amount) !== Number(amount)) {
        const err = new Error('PAYMENT_REFERENCE_AMOUNT_MISMATCH');
        err.statusCode = 409;
        throw err;
      }
      await client.query('COMMIT');
      return { ...rows[0], inserted: false };
    }

    const transaction = await _writeEntry(client, userId, amount, type, reference, 'completed', walletRow);
    await client.query('COMMIT');
    return { ...transaction, inserted: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function isWalletActive(userId) {
  const wallet = await getWallet(userId);
  return wallet.status === 'active';
}

export default { getBalance, getWallet, credit, creditOnce, debit, isWalletActive };

// kafka/handlers/delivery.handler.js
// The ONLY place that actually talks to Resend / FCM / the notifications table.
import pool from '../../db/pool.js';
import resend from '../../config/email.js';
import admin from '../../config/firebase.js';
import { EVENT_TYPES } from '../constants.js';

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const handleEmailSend = async ({ userId, from = 'orders@dineshfarms.app', subject, html }) => {
  const { rows } = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user?.email) {
    console.warn(`[kafka:delivery] Email skipped for user ${userId}: no email address is on the profile`);
    return;
  }
  if (!resend) {
    console.warn('[kafka:delivery] Email skipped: RESEND_API_KEY is not configured');
    return;
  }

  // Resend's SDK returns { data, error } instead of throwing, so convert to a
  // throw, otherwise failed emails would never be retried.
  const { error } = await resend.emails.send({
    from,
    to: user.email,
    subject,
    html: `<p>Hi ${user.first_name || 'there'},</p>${html}`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
};

const handlePushSend = async ({ userId, title, body, data = {} }) => {
  const { rows } = await pool.query(
    'SELECT device_tokens FROM users WHERE id = $1 AND active = true',
    [userId]
  );
  const tokens = rows[0]?.device_tokens || [];
  if (tokens.length === 0) return;
  if (!admin.apps.length) {
    console.warn(`[kafka:delivery] Push skipped for user ${userId}: Firebase is not configured`);
    return;
  }

  // FCM data values must all be strings.
  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: stringData,
    android: {
      priority: 'high',
      notification: { channelId: 'alerts', sound: 'default' },
    },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  const dead = [];
  let transient = 0;
  res.responses.forEach((r, i) => {
    if (r.success) return;
    if (DEAD_TOKEN_CODES.has(r.error?.code)) dead.push(tokens[i]);
    else transient += 1;
  });

  if (dead.length) {
    await pool.query(
      `UPDATE users
          SET device_tokens = ARRAY(SELECT t FROM unnest(device_tokens) t WHERE t <> ALL($2::text[]))
        WHERE id = $1`,
      [userId, dead]
    );
  }
  if (transient === tokens.length) throw new Error('FCM send failed for all tokens');
};

const handleSmsSend = async ({ userId }) => {
  // No SMS provider wired up yet.
  console.warn(`[kafka:delivery] SMS requested for user ${userId} but no provider is configured`);
};

const handleInappCreated = async ({ userId, type = 'GENERAL', title, body, referenceId }) => {
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, body, reference_id) VALUES ($1, $2, $3, $4, $5)',
    [userId, type, title, body, referenceId ?? null]
  );
};

const handleNotificationFailed = async (payload) => {
  console.error('[kafka:delivery] notification.failed', payload);
};

export const deliveryHandlers = {
  [EVENT_TYPES.NOTIFICATION_EMAIL_SEND]: handleEmailSend,
  [EVENT_TYPES.NOTIFICATION_PUSH_SEND]: handlePushSend,
  [EVENT_TYPES.NOTIFICATION_SMS_SEND]: handleSmsSend,
  [EVENT_TYPES.NOTIFICATION_INAPP_CREATED]: handleInappCreated,
  [EVENT_TYPES.NOTIFICATION_FAILED]: handleNotificationFailed,
};

export default deliveryHandlers;

// kafka/notify.js
// Used by domain handlers. Turns "tell this user X" into channel events.
import { publishEvents } from './producer.js';
import { EVENT_TYPES } from './constants.js';

/**
 * @param {string} userId
 * @param {object} opts
 * @param {string} [opts.type='GENERAL']  value allowed by notifications_type_check
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {object} [opts.data]        deep-link data for the push, e.g. { screen: 'OrderDetails', orderId }
 * @param {string} [opts.referenceId] stored in notifications.reference_id (defaults to data.orderId)
 * @param {object} [opts.email]       { subject, html, from? } -> omit to skip email
 * @param {boolean} [opts.push=true]
 * @param {boolean} [opts.inapp=true]
 */
export const notify = async (
  userId,
  { type = 'GENERAL', title, body, data = {}, referenceId, email, push = true, inapp = true }
) => {
  const events = [];
  const ref = referenceId ?? data.orderId ?? data.subscriptionId ?? null;
  if (inapp) events.push({ type: EVENT_TYPES.NOTIFICATION_INAPP_CREATED, payload: { userId, type, title, body, referenceId: ref } });
  if (push) events.push({ type: EVENT_TYPES.NOTIFICATION_PUSH_SEND, payload: { userId, title, body, data } });
  if (email && process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true') {
    events.push({ type: EVENT_TYPES.NOTIFICATION_EMAIL_SEND, payload: { userId, ...email } });
  }
  if (events.length) await publishEvents(userId, events);
};

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default notify;

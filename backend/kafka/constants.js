// kafka/constants.js
// NOTE: env vars are read at import time. Make sure `import 'dotenv/config'`
// is the very first import in your server entry file.
import 'dotenv/config';

export const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'dineshfarms-api';
export const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);
export const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'dineshfarms-api-consumers';

// Leave unset for a local/plaintext broker.
export const KAFKA_USERNAME = process.env.KAFKA_USERNAME || '';
export const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD || '';
export const KAFKA_SASL_MECHANISM = process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256';
export const KAFKA_CA_PATH = process.env.KAFKA_CA_PATH || '';

export const TOPICS = {
  NOTIFICATION_EVENTS: 'notification-events',
  NOTIFICATION_DLQ: 'notification-events-dlq',
};

// ALL events flow through ONE topic and are keyed by userId, so a user's
// events are processed in the order they were produced
// (e.g. order.confirmed -> order.out_for_delivery -> order.delivered).
export const EVENT_TYPES = {
  // Address
  ADDRESS_DARK_STORE_ASSIGNED: 'address.dark_store.assigned',
  ADDRESS_DARK_STORE_REASSIGNED: 'address.dark_store.reassigned',
  ADDRESS_UNSERVICEABLE: 'address.unserviceable',

  // Wallet
  WALLET_TOPUP_SUCCESS: 'wallet.topup.success',
  WALLET_TOPUP_FAILED: 'wallet.topup.failed',
  WALLET_WITHDRAW_SUCCESS: 'wallet.withdraw.success',
  WALLET_DEBITED: 'wallet.debited',
  WALLET_REFUNDED: 'wallet.refunded',
  WALLET_BALANCE_LOW: 'wallet.balance.low',

  // Orders
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled', // payload.cancelledBy: USER | SYSTEM_NO_STOCK | SUBSCRIPTION_PAUSED | ...
  ORDER_OUT_FOR_DELIVERY: 'order.out_for_delivery',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_DELIVERY_FAILED: 'order.delivery.failed',
  ORDER_PAYMENT_FAILED: 'order.payment.failed',
  INVOICE_GENERATE: 'invoice.generate',

  // Subscriptions
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',
  SUBSCRIPTION_SCHEDULE_UPDATED: 'subscription.schedule.updated',
  SUBSCRIPTION_DATES_SKIPPED: 'subscription.dates.skipped',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  DELIVERY_DATES_PAUSED: 'delivery.dates.paused',

  // Notification delivery (channel events, produced by notify())
  NOTIFICATION_EMAIL_SEND: 'notification.email.send',
  NOTIFICATION_PUSH_SEND: 'notification.push.send',
  NOTIFICATION_SMS_SEND: 'notification.sms.send',
  NOTIFICATION_INAPP_CREATED: 'notification.inapp.created',
  NOTIFICATION_FAILED: 'notification.failed',

  // General / campaigns
  CAMPAIGN_BROADCAST: 'campaign.broadcast',
  USER_BIRTHDAY: 'user.birthday',
};

export const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_RETRY_TIME: 300,
  RETRY_FACTOR: 2,
};

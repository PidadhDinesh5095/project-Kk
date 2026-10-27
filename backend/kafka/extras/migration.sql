-- 1. Allow the new notification types (keeps your existing ones)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'ORDER_CONFIRMED','ORDER_CANCELLED','ORDER_OUT_FOR_DELIVERY','ORDER_DELIVERED',
  'ORDER_DELIVERY_FAILED','ORDER_PAYMENT_FAILED',
  'SUBSCRIPTION_CREATED','SUBSCRIPTION_PAUSED','SUBSCRIPTION_RESUMED',
  'SUBSCRIPTION_SCHEDULE_UPDATED','SUBSCRIPTION_DATES_SKIPPED','SUBSCRIPTION_CANCELLED',
  'DELIVERY_DATES_PAUSED',
  'WALLET_TOPUP','WALLET_TOPUP_FAILED','WALLET_WITHDRAW','WALLET_DEBITED',
  'WALLET_REFUNDED','WALLET_BALANCE_LOW',
  'ADDRESS_UPDATE','GENERAL'
]));

-- 2. Unserviceable-address demand
CREATE TABLE IF NOT EXISTS unserviceable_demand (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id),
  address_id uuid REFERENCES addresses(id),
  pincode    text,
  lat        double precision,
  lng        double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

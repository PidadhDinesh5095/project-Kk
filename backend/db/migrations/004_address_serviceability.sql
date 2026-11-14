ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS is_serviceable BOOLEAN,
  ADD COLUMN IF NOT EXISTS dark_store_id UUID;

UPDATE addresses a
SET is_serviceable = (
  SELECT result.is_serviceable
  FROM check_serviceability(a.lat, a.lng) AS result
);

ALTER TABLE addresses
  ALTER COLUMN is_serviceable SET DEFAULT false,
  ALTER COLUMN is_serviceable SET NOT NULL;

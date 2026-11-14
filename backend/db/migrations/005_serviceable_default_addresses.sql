BEGIN;

UPDATE addresses
SET is_default = false
WHERE is_serviceable IS NOT TRUE OR deleted_at IS NOT NULL;

UPDATE users u
SET default_address_id = (
  SELECT a.id
  FROM addresses a
  WHERE a.user_id = u.id
    AND a.deleted_at IS NULL
    AND a.is_serviceable = true
  ORDER BY a.is_default DESC, a.created_at DESC
  LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1
  FROM addresses a
  WHERE a.id = u.default_address_id
    AND a.user_id = u.id
    AND a.deleted_at IS NULL
    AND a.is_serviceable = true
);

UPDATE addresses a
SET is_default = (a.id = u.default_address_id)
FROM users u
WHERE a.user_id = u.id
  AND a.deleted_at IS NULL;

COMMIT;

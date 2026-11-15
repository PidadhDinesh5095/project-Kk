import pool from '../db/pool.js';
import { emitEvent } from '../kafka/producer.js';
import { EVENT_TYPES } from '../kafka/constants.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const MAX_ADDRESSES_PER_USER = 5;

// POST /addresses
const createAddress = asyncHandler(async (req, res) => {
  const {
    residenceType, flatNoApartmentFloor, blockTower, pincode,
    landmark, lat, lng, deliveryInstructions, isDefault,
  } = req.body;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)
      || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return ApiResponse.error(res, 400, 'Invalid location coordinates');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const { rows: countRows } = await client.query(
      'SELECT count(*)::int AS count FROM addresses WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    if (countRows[0].count >= MAX_ADDRESSES_PER_USER) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `You can save up to ${MAX_ADDRESSES_PER_USER} addresses. Delete an existing address to add another.`,
      });
    }

    // 1. Create the address
    const { rows: inserted } = await client.query(
      `INSERT INTO addresses
        (user_id, residence_type, flat_no_apartment_floor, block_tower, pincode,
         landmark, lat, lng, delivery_instructions, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        req.user.id, residenceType, flatNoApartmentFloor, blockTower || null, pincode,
        landmark || null, latNum, lngNum, deliveryInstructions || [], false,
      ]
    );
    const addressId = inserted[0].id;

    // 2. Validate against dark stores
    const { rows: check } = await client.query(
      'SELECT * FROM check_serviceability($1, $2)',
      [latNum, lngNum]
    );
    const { is_serviceable, store_id, store_name } = check[0];
    const shouldSetDefault = Boolean(isDefault && is_serviceable);

    // 3. Save the state on the address
    const { rows } = await client.query(
      `UPDATE addresses
         SET is_serviceable = $1, dark_store_id = $2, is_default = $3
       WHERE id = $4
       RETURNING *`,
      [is_serviceable, store_id, shouldSetDefault, addressId]
    );
    const address = rows[0];

    // 4. Default address handling
    if (shouldSetDefault) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2 AND deleted_at IS NULL',
        [req.user.id, addressId]
      );
      await client.query(
        'UPDATE users SET default_address_id = $1 WHERE id = $2',
        [addressId, req.user.id]
      );
    }

    await client.query('COMMIT');

    // Notify only after the address and its serviceability have been committed.
    emitEvent(
      is_serviceable ? EVENT_TYPES.ADDRESS_DARK_STORE_ASSIGNED : EVENT_TYPES.ADDRESS_UNSERVICEABLE,
      req.user.id,
      {
        userId: req.user.id,
        addressId,
        addressLabel: [flatNoApartmentFloor, blockTower].filter(Boolean).join(', '),
        pincode,
        lat: latNum,
        lng: lngNum,
        storeId: store_id,
        storeName: store_name,
      }
    );

    return ApiResponse.success(
      res,
      { ...address, serviceable: is_serviceable },
      201,
      is_serviceable
        ? 'Address saved'
        : "Address saved, but we don't deliver here yet"
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});
// GET /addresses
const listAddresses = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM addresses WHERE user_id = $1 AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  return ApiResponse.success(res, rows);
});

// PATCH /addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const { residenceType, flatNoApartmentFloor, blockTower, pincode, landmark, lat, lng, deliveryInstructions } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: userRows } = await client.query(
      'SELECT default_address_id FROM users WHERE id = $1 FOR UPDATE',
      [req.user.id]
    );
    const { rows: updated } = await client.query(
      `UPDATE addresses SET
         residence_type = COALESCE($1, residence_type),
         flat_no_apartment_floor = COALESCE($2, flat_no_apartment_floor),
         block_tower = COALESCE($3, block_tower),
         pincode = COALESCE($4, pincode),
         landmark = COALESCE($5, landmark),
         lat = COALESCE($6, lat),
         lng = COALESCE($7, lng),
         delivery_instructions = COALESCE($8, delivery_instructions)
       WHERE id = $9 AND user_id = $10 AND deleted_at IS NULL RETURNING *`,
      [residenceType, flatNoApartmentFloor, blockTower, pincode, landmark, lat, lng, deliveryInstructions, req.params.id, req.user.id]
    );
    if (updated.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const previousAddress = updated[0];
    const wasDefault = previousAddress.is_default || userRows[0]?.default_address_id === previousAddress.id;
    const { rows: check } = await client.query(
      'SELECT * FROM check_serviceability($1, $2)',
      [previousAddress.lat, previousAddress.lng]
    );
    const { is_serviceable, store_id, store_name } = check[0];
    if (!is_serviceable) {
      const { rows: usageRows } = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM subscriptions s
           WHERE s.address_id = $1 AND s.status IN ('ACTIVE', 'PAUSED')
         ) AS has_linked_subscription,
         EXISTS (
           SELECT 1 FROM orders o
           WHERE o.address_id = $1
             AND o.delivery_date >= CURRENT_DATE
             AND o.status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')
         ) AS has_upcoming_order`,
        [previousAddress.id]
      );
      if (usageRows[0].has_linked_subscription || usageRows[0].has_upcoming_order) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: "This address can't be changed to a non-serviceable location while it's assigned to an active or paused subscription or an upcoming order. Choose a serviceable location or cancel or move those deliveries first.",
        });
      }
    }

    const { rows } = await client.query(
      `UPDATE addresses
       SET is_serviceable = $1,
           dark_store_id = $2,
           is_default = CASE WHEN $1 THEN is_default ELSE false END
       WHERE id = $3
       RETURNING *`,
      [is_serviceable, store_id, previousAddress.id]
    );
    const address = rows[0];

    if (wasDefault && !is_serviceable) {
      const { rows: nextDefaultRows } = await client.query(
        `SELECT id FROM addresses
         WHERE user_id = $1 AND id != $2 AND deleted_at IS NULL AND is_serviceable = true
         ORDER BY is_default DESC, created_at DESC
         LIMIT 1`,
        [req.user.id, previousAddress.id]
      );
      const nextDefaultId = nextDefaultRows[0]?.id ?? null;
      await client.query(
        'UPDATE addresses SET is_default = (id = $2) WHERE user_id = $1 AND deleted_at IS NULL',
        [req.user.id, nextDefaultId]
      );
      await client.query(
        'UPDATE users SET default_address_id = $1 WHERE id = $2',
        [nextDefaultId, req.user.id]
      );
    }

    await client.query('COMMIT');

    const locationChanged = lat !== undefined || lng !== undefined;
    const serviceabilityChanged = previousAddress.is_serviceable !== is_serviceable;
    const storeChanged = previousAddress.dark_store_id !== store_id;
    if (locationChanged && (serviceabilityChanged || (is_serviceable && storeChanged))) {
      const eventType = is_serviceable
        ? previousAddress.is_serviceable
          ? EVENT_TYPES.ADDRESS_DARK_STORE_REASSIGNED
          : EVENT_TYPES.ADDRESS_DARK_STORE_ASSIGNED
        : EVENT_TYPES.ADDRESS_UNSERVICEABLE;
      emitEvent(eventType, req.user.id, {
        userId: req.user.id,
        addressId: address.id,
        addressLabel: [address.flat_no_apartment_floor, address.block_tower].filter(Boolean).join(', '),
        pincode: address.pincode,
        lat: address.lat,
        lng: address.lng,
        storeId: store_id,
        storeName: store_name,
      });
    }

    return ApiResponse.success(res, address, 200, 'Address updated');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// DELETE /addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const { rows: addressRows } = await client.query(
      `SELECT a.is_default OR u.default_address_id = a.id AS was_default,
              EXISTS (
                SELECT 1 FROM subscriptions s
                WHERE s.address_id = a.id AND s.status IN ('ACTIVE', 'PAUSED')
              ) AS has_linked_subscription,
              EXISTS (
                SELECT 1 FROM orders o
                WHERE o.address_id = a.id
                  AND o.delivery_date >= CURRENT_DATE
                  AND o.status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')
              ) AS has_upcoming_order
       FROM addresses a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1 AND a.user_id = $2 AND a.deleted_at IS NULL
       FOR UPDATE OF a, u`,
      [req.params.id, req.user.id]
    );
    if (addressRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const { has_linked_subscription, has_upcoming_order } = addressRows[0];
    if (has_linked_subscription || has_upcoming_order) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: "This address can't be deleted while it's assigned to an active or paused subscription or an upcoming order. Cancel or move those deliveries first.",
      });
    }

    await client.query(
      'UPDATE users SET default_address_id = NULL WHERE id = $1 AND default_address_id = $2',
      [req.user.id, req.params.id]
    );
    await client.query(
      'UPDATE addresses SET deleted_at = now(), is_default = false WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (addressRows[0].was_default) {
      const { rows: remainingAddresses } = await client.query(
        `SELECT id FROM addresses
         WHERE user_id = $1 AND deleted_at IS NULL AND is_serviceable = true
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );
      const nextDefaultId = remainingAddresses[0]?.id ?? null;
      await client.query(
        'UPDATE addresses SET is_default = (id = $2) WHERE user_id = $1 AND deleted_at IS NULL',
        [req.user.id, nextDefaultId]
      );
      await client.query('UPDATE users SET default_address_id = $1 WHERE id = $2', [nextDefaultId, req.user.id]);
    }

    await client.query('COMMIT');
    return ApiResponse.success(res, null, 200, 'Address deleted');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

// PATCH /addresses/:id/set-default
const setDefaultAddress = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const { rows: addressRows } = await client.query(
      `SELECT id, is_serviceable FROM addresses
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (addressRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    if (!addressRows[0].is_serviceable) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Only serviceable addresses can be set as the default address.',
      });
    }

    await client.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    const { rows } = await client.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *',
      [req.params.id, req.user.id]
    );
    await client.query('UPDATE users SET default_address_id = $1 WHERE id = $2', [rows[0].id, req.user.id]);
    await client.query('COMMIT');
    return ApiResponse.success(res, rows[0], 200, 'Default address updated');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

export default { createAddress, listAddresses, updateAddress, deleteAddress, setDefaultAddress };

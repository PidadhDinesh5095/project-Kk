import pool from '../db/pool.js';
import { emitEvent } from '../kafka/producer.js';
import { EVENT_TYPES } from '../kafka/constants.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /addresses/check-serviceability?pincode=
// Called BEFORE letting the customer save an address — otherwise you'd accept
// addresses in areas you can't actually deliver to.
const checkServiceability = asyncHandler(async (req, res) => {
  const pincode = typeof req.query.pincode === 'string' ? req.query.pincode : '';
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ success: false, message: 'A valid 6-digit pincode is required' });
  }
  const serviceablePincodes = (process.env.SERVICEABLE_PINCODES || '').split(',').map((p) => p.trim());
  const serviceable = serviceablePincodes.includes(pincode);
  return ApiResponse.success(res, { serviceable });
});

// POST /addresses
const createAddress = asyncHandler(async (req, res) => {
  const {
    residenceType, flatNoApartmentFloor, blockTower, pincode,
    landmark, lat, lng, deliveryInstructions, isDefault,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO addresses
        (user_id, residence_type, flat_no_apartment_floor, block_tower, pincode,
         landmark, lat, lng, delivery_instructions, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.user.id, residenceType, flatNoApartmentFloor, blockTower || null, pincode,
        landmark || null, lat, lng, deliveryInstructions || [], !!isDefault,
      ]
    );
    const address = rows[0];

    if (isDefault) {
      await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2', [
        req.user.id, address.id,
      ]);
      await client.query('UPDATE users SET default_address_id = $1 WHERE id = $2', [address.id, req.user.id]);
    }

    await client.query('COMMIT');
    const serviceablePincodes = (process.env.SERVICEABLE_PINCODES || '').split(',').map((value) => value.trim());
    if (!serviceablePincodes.includes(pincode)) {
      emitEvent(EVENT_TYPES.ADDRESS_UNSERVICEABLE, req.user.id, {
        userId: req.user.id,
        addressId: address.id,
        pincode,
        lat,
        lng,
      });
    }
    return ApiResponse.success(res, address, 201, 'Address saved');
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
    'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
    [req.user.id]
  );
  return ApiResponse.success(res, rows);
});

// PATCH /addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const { residenceType, flatNoApartmentFloor, blockTower, pincode, landmark, lat, lng, deliveryInstructions } = req.body;
  const { rows } = await pool.query(
    `UPDATE addresses SET
       residence_type = COALESCE($1, residence_type),
       flat_no_apartment_floor = COALESCE($2, flat_no_apartment_floor),
       block_tower = COALESCE($3, block_tower),
       pincode = COALESCE($4, pincode),
       landmark = COALESCE($5, landmark),
       lat = COALESCE($6, lat),
       lng = COALESCE($7, lng),
       delivery_instructions = COALESCE($8, delivery_instructions)
     WHERE id = $9 AND user_id = $10 RETURNING *`,
    [residenceType, flatNoApartmentFloor, blockTower, pincode, landmark, lat, lng, deliveryInstructions, req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Address not found' });
  return ApiResponse.success(res, rows[0], 200, 'Address updated');
});

// DELETE /addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: addressRows } = await client.query(
      `SELECT a.is_default OR u.default_address_id = a.id AS was_default
       FROM addresses a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1 AND a.user_id = $2
       FOR UPDATE OF a, u`,
      [req.params.id, req.user.id]
    );
    if (addressRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await client.query(
      'UPDATE users SET default_address_id = NULL WHERE id = $1 AND default_address_id = $2',
      [req.user.id, req.params.id]
    );
    await client.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);

    if (addressRows[0].was_default) {
      const { rows: remainingAddresses } = await client.query(
        'SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      const nextDefaultId = remainingAddresses[0]?.id;
      if (nextDefaultId) {
        await client.query(
          'UPDATE addresses SET is_default = (id = $2) WHERE user_id = $1',
          [req.user.id, nextDefaultId]
        );
        await client.query('UPDATE users SET default_address_id = $1 WHERE id = $2', [nextDefaultId, req.user.id]);
      }
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
    await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const { rows } = await client.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
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

export default { checkServiceability, createAddress, listAddresses, updateAddress, deleteAddress, setDefaultAddress };

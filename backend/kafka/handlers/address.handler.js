// kafka/handlers/address.handler.js
import pool from '../../db/pool.js';
import { EVENT_TYPES } from '../constants.js';
import { notify } from '../notify.js';

const TYPE = 'ADDRESS_UPDATE';

const handleDarkStoreAssigned = async ({ userId, storeName, addressLabel }) => {
  await notify(userId, {
    type: TYPE,
    title: 'Delivery available',
    body: `${addressLabel || 'Your address'} will be served by ${storeName}.`,
    data: { screen: 'Addresses' },
  });
};

const handleDarkStoreReassigned = async ({ userId, storeName, addressLabel }) => {
  await notify(userId, {
    type: TYPE,
    title: 'Delivery store updated',
    body: `${addressLabel || 'Your address'} is now served by ${storeName}. Delivery slots may change.`,
    data: { screen: 'Addresses' },
  });
};

// Outside every dark store's area: tell the user AND record the demand.
const handleUnserviceable = async ({ userId, addressId, pincode, lat, lng }) => {
  await pool.query(
    `INSERT INTO unserviceable_demand (user_id, address_id, pincode, lat, lng)
     SELECT $1, $2, $3, $4, $5
     WHERE NOT EXISTS (
       SELECT 1 FROM unserviceable_demand WHERE user_id = $1 AND pincode = $3
     )`,
    [userId, addressId ?? null, pincode ?? null, lat ?? null, lng ?? null]
  );
  await notify(userId, {
    type: TYPE,
    title: "We don't deliver here yet",
    body: "Your area isn't covered yet. We'll let you know as soon as we start delivering there.",
    data: { screen: 'Addresses' },
  });
};

export const addressHandlers = {
  [EVENT_TYPES.ADDRESS_DARK_STORE_ASSIGNED]: handleDarkStoreAssigned,
  [EVENT_TYPES.ADDRESS_DARK_STORE_REASSIGNED]: handleDarkStoreReassigned,
  [EVENT_TYPES.ADDRESS_UNSERVICEABLE]: handleUnserviceable,
};

export default addressHandlers;

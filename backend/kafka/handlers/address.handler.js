// kafka/handlers/address.handler.js
import { EVENT_TYPES } from '../constants.js';
import { notify } from '../notify.js';

const TYPE = 'ADDRESS_UPDATE';

const handleDarkStoreAssigned = async ({ userId, addressId, storeName, addressLabel }) => {
  await notify(userId, {
    type: TYPE,
    title: 'Address assigned',
    body: `${addressLabel || 'Your address'} is assigned to ${storeName}. Delivery is available at this location.`,
    data: { screen: 'Addresses', addressId },
    referenceId: addressId,
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

// Outside every dark store's area: tell the user without recording a separate demand row.
const handleUnserviceable = async ({ userId, addressId, addressLabel }) => {
  await notify(userId, {
    type: TYPE,
    title: 'Service not available',
    body: `Delivery is not available at ${addressLabel || 'your address'} yet.`,
    data: { screen: 'Addresses', addressId },
    referenceId: addressId,
  });
};

export const addressHandlers = {
  [EVENT_TYPES.ADDRESS_DARK_STORE_ASSIGNED]: handleDarkStoreAssigned,
  [EVENT_TYPES.ADDRESS_DARK_STORE_REASSIGNED]: handleDarkStoreReassigned,
  [EVENT_TYPES.ADDRESS_UNSERVICEABLE]: handleUnserviceable,
};

export default addressHandlers;

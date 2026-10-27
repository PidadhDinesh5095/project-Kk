import Joi from 'joi';

// Indian mobile numbers, stored with country code and no symbols: 919876543210
const phone = Joi.string().pattern(/^91[6-9]\d{9}$/).required().messages({
  'string.pattern.base': 'Phone must be a valid Indian mobile number in the format 91XXXXXXXXXX',
});

const uuid = Joi.string().uuid();
const slot = Joi.string().valid('MORNING', 'EVENING');

const schemas = {
  sendOtp: Joi.object({ phone }),
  verifyOtp: Joi.object({ phone, otp: Joi.string().length(6).pattern(/^\d+$/).required() }),
  refresh: Joi.object({ refreshToken: Joi.string().required() }),

  completeProfile: Joi.object({
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().max(50).allow('', null),
    email: Joi.string().email().allow('', null),
    dob: Joi.date().iso().max('now').allow('', null),
  }),
  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(1).max(50),
    lastName: Joi.string().trim().max(50).allow('', null),
    email: Joi.string().email().allow('', null),
    dob: Joi.date().iso().max('now').allow('', null),
  }),

  createAddress: Joi.object({
    residenceType: Joi.string().valid('COMMUNITY_APARTMENT', 'INDEPENDENT').required(),
    flatNoApartmentFloor: Joi.string().trim().required(),
    // Block/Tower is required only for community/apartment residences, per the address screen.
    blockTower: Joi.when('residenceType', {
      is: 'COMMUNITY_APARTMENT',
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim().allow('', null),
    }),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    landmark: Joi.string().trim().allow('', null),
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    deliveryInstructions: Joi.array().items(
      Joi.string().valid('PET_AT_HOME', 'LEAVE_AT_DOOR', 'RING_BELL', 'PLACE_IN_BAG', 'AT_SHOE_RACK', 'AT_SECURITY')
    ),
    isDefault: Joi.boolean(),
  }),
  updateAddress: Joi.object({
    residenceType: Joi.string().valid('COMMUNITY_APARTMENT', 'INDEPENDENT'),
    flatNoApartmentFloor: Joi.string().trim(),
    blockTower: Joi.string().trim().allow('', null),
    pincode: Joi.string().pattern(/^\d{6}$/),
    landmark: Joi.string().trim().allow('', null),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    deliveryInstructions: Joi.array().items(
      Joi.string().valid('PET_AT_HOME', 'LEAVE_AT_DOOR', 'RING_BELL', 'PLACE_IN_BAG', 'AT_SHOE_RACK', 'AT_SECURITY')
    ),
  }),

  topup: Joi.object({ amount: Joi.number().min(100).max(5000).precision(2).required() }),
  withdraw: Joi.object({ amount: Joi.number().min(100).max(2000).precision(2).required() }),
  verifyTopup: Joi.object({
    razorpayOrderId: Joi.string().required(),
    razorpayPaymentId: Joi.string().required(),
    razorpaySignature: Joi.string().required(),
  }),

  createOrder: Joi.object({
    productId: uuid.required(),
    addressId: uuid.required(),
    quantity: Joi.number().integer().min(1).max(50).required(),
    deliveryDate: Joi.date().iso().custom((date, helpers) => {
      const requestedDate = date.toISOString().slice(0, 10);
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      return requestedDate < today ? helpers.error('date.min', { limit: today }) : date;
    }).required(),
    slot,
    slots: Joi.array().items(slot).min(1).max(2).unique(),
  }).xor('slot', 'slots'),

  // Three shapes, one per frequency, matching the three subscription screens.
  createSubscription: Joi.object({
    productId: uuid.required(),
    addressId: uuid.required(),
    frequency: Joi.string().valid('DAILY', 'ALTERNATE', 'CUSTOM').required(),
    startDate: Joi.date().iso().min('now').required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).allow(null),
    dailySlots: Joi.array().items(slot).min(1).max(2).unique().required(),

    dailyQuantity: Joi.when('frequency', {
      is: 'DAILY',
      then: Joi.number().integer().min(1).max(50).required(),
      otherwise: Joi.forbidden(),
    }),
    alternateConfig: Joi.when('frequency', {
      is: 'ALTERNATE',
      then: Joi.object({
        startDateQuantity: Joi.number().integer().min(1).max(50).required(),
        succeedingDayQuantity: Joi.number().integer().min(1).max(50).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
    customConfig: Joi.when('frequency', {
      is: 'CUSTOM',
      then: Joi.object({
        selectedDays: Joi.array().items(Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA')).min(1).required(),
        quantityPerDay: Joi.object().pattern(
          Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'),
          Joi.number().integer().min(1).max(50)
        ).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
  }),
  pauseSubscription: Joi.object({
    reason: Joi.string().max(200).allow('', null),
  }),
  updateSubscriptionSchedule: Joi.object({
    addressId: uuid.optional(),
    frequency: Joi.string().valid('DAILY', 'ALTERNATE', 'CUSTOM').required(),
    dailySlots: Joi.array().items(slot).min(1).max(2).unique().required(),
    dailyQuantity: Joi.when('frequency', {
      is: 'DAILY',
      then: Joi.number().integer().min(1).max(50).required(),
      otherwise: Joi.forbidden(),
    }),
    alternateConfig: Joi.when('frequency', {
      is: 'ALTERNATE',
      then: Joi.object({
        startDateQuantity: Joi.number().integer().min(1).max(50).required(),
        succeedingDayQuantity: Joi.number().integer().min(1).max(50).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
    customConfig: Joi.when('frequency', {
      is: 'CUSTOM',
      then: Joi.object({
        selectedDays: Joi.array().items(Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA')).min(1).unique().required(),
        quantityPerDay: Joi.object().pattern(
          Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'),
          Joi.number().integer().min(1).max(50)
        ).required(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
  }),
  skipDates: Joi.object({
    dates: Joi.array().items(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
      const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);
      if (!match) return helpers.error('date.format');

      const [year, month, day] = match[0].split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
        return helpers.error('date.format');
      }

      return value;
    })).min(1).required(),
  }),
  pauseDates: Joi.object({
    dates: Joi.array().items(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
        return helpers.error('date.format');
      }

      return value;
    })).min(1).unique().required(),
  }),

  deviceToken: Joi.object({ deviceToken: Joi.string().trim().min(1).max(4096).required() }),

  addPaymentMethod: Joi.object({
    type: Joi.string().valid('UPI', 'CARD').required(),
    razorpayTokenId: Joi.string().required(),
    displayLabel: Joi.string().max(60).required(),
    isDefault: Joi.boolean(),
  }),
};

export default schemas;

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isAxiosError } from 'axios';
import { api } from '@/store/api';
import {
  Subscription,
  SubscriptionApiFrequency,
  SubscriptionApiStatus,
  SubscriptionDayCode,
  SubscriptionFrequency,
  SubscriptionSlot,
} from '@/types/fresh';

type ApiSubscription = {
  id: string;
  product_id?: string;
  product_name?: string;
  product_image?: string;
  next_delivery_date?: string;
  user_id?: string;
  address_id?: string;
  frequency?: SubscriptionApiFrequency;
  status?: SubscriptionApiStatus;
  start_date?: string;
  end_date?: string | null;
  daily_quantity?: number;
  daily_slots?: Array<'MORNING' | 'EVENING'>;
  alternate_config?: { startDateQuantity?: number; succeedingDayQuantity?: number };
  custom_config?: { selectedDays?: SubscriptionDayCode[]; quantityPerDay?: Record<string, number> };
  skipped_dates?: string[];
  paused_ranges?: Array<{ reason?: string | null; startDate?: string | null; endDate?: string | null }>;
  created_at?: string;
};

type SubscriptionState = {
  items: Subscription[];
  activeId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  hasLoaded: boolean;
  error: string | null;
  counts: { total: number; active: number };
  countsIsLoading: boolean;
  countsHasLoaded: boolean;
};

type SubscriptionCreateInput = {
  productId: string;
  addressId: string;
  frequency: SubscriptionFrequency;
  startDate: string;
  dailyQuantity?: number;
  dailySlots: Array<'MORNING' | 'EVENING' | SubscriptionSlot>;
  alternateConfig?: {
    startDateQuantity: number;
    succeedingDayQuantity: number;
  };
  customConfig?: {
    selectedDays: SubscriptionDayCode[];
    quantityPerDay: Record<string, number>;
  };
};

const mapSlot = (slot?: string | null): 'MORNING' | 'EVENING' | undefined => {
  if (slot === 'EVENING' || slot === 'MORNING') return slot;
  if (slot === 'Evening') return 'EVENING';
  if (slot === 'Morning') return 'MORNING';
  return undefined;
};

const mapStatus = (status?: string | null): Subscription['status'] => {
  switch (status) {
    case 'PAUSED':
      return 'Paused';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ACTIVE':
    case 'Active':
    default:
      return 'Active';
  }
};

const mapFrequency = (frequency?: string | null): Subscription['frequency'] => {
  switch (frequency) {
    case 'DAILY':
    case 'Daily':
      return 'Daily';
    case 'ALTERNATE':
    case 'Alternate':
      return 'Alternate';
    case 'CUSTOM':
    case 'Custom':
      return 'Custom';
    default:
      return 'Daily';
  }
};

const normalizeSubscription = (item: Partial<ApiSubscription> | Subscription): Subscription => {
  const apiItem = item as Partial<ApiSubscription>;
  const legacyItem = item as Subscription;
  const frequency = mapFrequency(apiItem.frequency ?? legacyItem.frequency);
  const status = mapStatus(apiItem.status ?? legacyItem.status);
  const legacySlot = mapSlot(legacyItem.timeSlot);

  return {
    id: apiItem.id ?? legacyItem.id ?? '',
    productId: apiItem.product_id ?? legacyItem.productId ?? '',
    productName: apiItem.product_name ?? legacyItem.productName,
    productImage: apiItem.product_image ?? legacyItem.productImage,
    frequency,
    status,
    startDate: apiItem.start_date ?? legacyItem.startDate ?? new Date().toISOString(),
    nextDeliveryDate: apiItem.next_delivery_date ?? legacyItem.nextDeliveryDate ?? apiItem.start_date,
    createdDate: apiItem.created_at ?? legacyItem.createdDate,
    deliveryAddressId: apiItem.address_id ?? legacyItem.deliveryAddressId ?? legacyItem.addressId,
    addressId: apiItem.address_id ?? legacyItem.addressId,
    dailyQuantity: apiItem.daily_quantity ?? legacyItem.dailyQuantity ?? 1,
    dailySlots: apiItem.daily_slots ?? legacyItem.dailySlots ?? (legacySlot ? [legacySlot] : []),
    alternateConfig: apiItem.alternate_config ?? legacyItem.alternateConfig,
    customConfig: apiItem.custom_config ?? legacyItem.customConfig,
    skippedDates: (apiItem.skipped_dates ?? legacyItem.skippedDates ?? [])
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
    pausedRanges: apiItem.paused_ranges ?? legacyItem.pausedRanges ?? [],
    planTier: legacyItem.planTier,
    quantityPerDelivery: legacyItem.quantityPerDelivery,
    timeSlot: legacyItem.timeSlot,
    paymentMethod: legacyItem.paymentMethod,
    durationType: legacyItem.durationType,
    pausedRange: legacyItem.pausedRange,
  };
};

const buildSubscriptionPayload = (input: SubscriptionCreateInput) => {
  const payload: Record<string, unknown> = {
    productId: input.productId,
    addressId: input.addressId,
    frequency: input.frequency.toUpperCase(),
    startDate: input.startDate,
  };

  if (input.frequency === 'Daily') {
    payload.dailyQuantity = input.dailyQuantity ?? 1;
  }

  payload.dailySlots = [...new Set(input.dailySlots.map((slot) => slot.toString().toUpperCase()))];

  if (input.frequency === 'Alternate') {
    payload.alternateConfig = {
      startDateQuantity: input.alternateConfig?.startDateQuantity ?? 1,
      succeedingDayQuantity: input.alternateConfig?.succeedingDayQuantity ?? 1,
    };
  }

  if (input.frequency === 'Custom') {
    payload.customConfig = {
      selectedDays: input.customConfig?.selectedDays ?? ['MO'],
      quantityPerDay: input.customConfig?.quantityPerDay ?? { MO: 1 },
    };
  }

  return payload;
};

const getErrorMessage = (error: unknown, fallback = 'Unable to load subscriptions') => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const fetchSubscriptions = createAsyncThunk<Subscription[], void, { rejectValue: string }>(
  'subscription/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: ApiSubscription[] }>('/subscriptions');
      return (response.data.data ?? []).map((item: ApiSubscription) => normalizeSubscription(item));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to load subscriptions'));
    }
  },
);

export const fetchSubscriptionCounts = createAsyncThunk<
  { total: number; active: number },
  void,
  { rejectValue: string }
>(
  'subscription/fetchCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: { total: number; active: number } }>('/subscriptions/counts');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to load subscription counts'));
    }
  },
);

export const createSubscription = createAsyncThunk<Subscription, SubscriptionCreateInput, { rejectValue: string }>(
  'subscription/create',
  async (input, { rejectWithValue }) => {
    try {
      const response = await api.post<{ data: { subscription?: ApiSubscription } }>('/subscriptions', buildSubscriptionPayload(input));
      const subscription = response.data.data?.subscription ?? response.data.data ?? response.data;
      return normalizeSubscription(subscription as Partial<ApiSubscription>);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to create subscription'));
    }
  },
);

export const pauseSubscription = createAsyncThunk<Subscription, { id: string; reason?: string }, { rejectValue: string }>(
  'subscription/pause',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await api.patch<{ data: { subscription?: ApiSubscription } }>(`/subscriptions/${id}/pause`, { reason: reason ?? '' });
      const subscription = response.data.data?.subscription ?? response.data.data ?? response.data;
      return normalizeSubscription(subscription as Partial<ApiSubscription>);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to pause subscription'));
    }
  },
);

export const resumeSubscription = createAsyncThunk<Subscription, string, { rejectValue: string }>(
  'subscription/resume',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch<{ data: { subscription: ApiSubscription } }>(`/subscriptions/${id}/resume`);
      return normalizeSubscription(response.data.data.subscription);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to resume subscription'));
    }
  },
);

export const cancelSubscription = createAsyncThunk<Subscription, string, { rejectValue: string }>(
  'subscription/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete<{ data: { subscription?: ApiSubscription } }>(`/subscriptions/${id}`);
      const subscription = response.data.data?.subscription ?? response.data.data ?? response.data;
      return normalizeSubscription(subscription as Partial<ApiSubscription>);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to cancel subscription'));
    }
  },
);

export const skipSubscriptionDates = createAsyncThunk<
  { subscription: Subscription; cancelledOrdersCount: number },
  { id: string; dates: string[] },
  { rejectValue: string }
>(
  'subscription/skipDates',
  async ({ id, dates }, { rejectWithValue }) => {
    try {
      const response = await api.patch<{
        data: { subscription: ApiSubscription; cancelledOrdersCount: number };
      }>(`/subscriptions/${id}/skip`, { dates });
      return {
        subscription: normalizeSubscription(response.data.data.subscription),
        cancelledOrdersCount: response.data.data.cancelledOrdersCount,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to skip deliveries'));
    }
  },
);

const initialState: SubscriptionState = {
  items: [],
  activeId: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  hasLoaded: false,
  error: null,
  counts: { total: 0, active: 0 },
  countsIsLoading: false,
  countsHasLoaded: false,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    addSubscription: (state, action: PayloadAction<Subscription>) => {
      state.items.unshift(action.payload);
      state.activeId = action.payload.id;
      state.countsHasLoaded = false;
    },
    updateSubscription: (state, action: PayloadAction<Partial<Subscription> & { id?: string }>) => {
      const id = action.payload.id ?? state.activeId;
      const sub = state.items.find((item) => item.id === id);
      if (sub) Object.assign(sub, action.payload);
    },
    setActiveSubscription: (state, action: PayloadAction<string>) => {
      if (state.items.some((item) => item.id === action.payload)) state.activeId = action.payload;
    },
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      if (state.activeId === action.payload) state.activeId = state.items[0]?.id ?? null;
      state.countsHasLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.items = action.payload;
        state.activeId = action.payload.some((item) => item.id === state.activeId)
          ? state.activeId
          : action.payload[0]?.id ?? null;
        state.isLoading = false;
        state.hasLoaded = true;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.hasLoaded = true;
        state.error = action.payload ?? 'Unable to load subscriptions';
      })
      .addCase(fetchSubscriptionCounts.pending, (state) => {
        state.countsIsLoading = true;
      })
      .addCase(fetchSubscriptionCounts.fulfilled, (state, action) => {
        state.counts = action.payload;
        state.countsIsLoading = false;
        state.countsHasLoaded = true;
      })
      .addCase(fetchSubscriptionCounts.rejected, (state) => {
        state.countsIsLoading = false;
        state.countsHasLoaded = true;
      })
      .addCase(createSubscription.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)];
        state.activeId = action.payload.id;
        state.isCreating = false;
        state.countsHasLoaded = false;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload ?? 'Unable to create subscription';
      })
      .addCase(pauseSubscription.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(pauseSubscription.fulfilled, (state, action) => {
        const next = action.payload;
        state.items = state.items.map((item) => (item.id === next.id ? { ...item, ...next, productImage: next.productImage ?? item.productImage, status: 'Paused' } : item));
        state.activeId = next.id;
        state.isUpdating = false;
        state.countsHasLoaded = false;
      })
      .addCase(pauseSubscription.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload ?? 'Unable to pause subscription';
      })
      .addCase(resumeSubscription.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(resumeSubscription.fulfilled, (state, action) => {
        const next = action.payload;
        state.items = state.items.map((item) => (item.id === next.id ? { ...item, ...next, productImage: next.productImage ?? item.productImage, status: 'Active' } : item));
        state.activeId = next.id;
        state.isUpdating = false;
        state.countsHasLoaded = false;
      })
      .addCase(resumeSubscription.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload ?? 'Unable to resume subscription';
      })
      .addCase(cancelSubscription.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        const next = action.payload;
        state.items = state.items.map((item) => (item.id === next.id ? { ...item, ...next, productImage: next.productImage ?? item.productImage, status: 'Cancelled' } : item));
        state.activeId = next.id;
        state.isUpdating = false;
        state.countsHasLoaded = false;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload ?? 'Unable to cancel subscription';
      })
      .addCase(skipSubscriptionDates.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(skipSubscriptionDates.fulfilled, (state, action) => {
        const { subscription: next } = action.payload;
        state.items = state.items.map((item) => item.id === next.id ? { ...item, ...next, productImage: next.productImage ?? item.productImage } : item);
        state.activeId = next.id;
        state.isUpdating = false;
      })
      .addCase(skipSubscriptionDates.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload ?? 'Unable to skip deliveries';
      });
  },
});

export const { addSubscription, updateSubscription, setActiveSubscription, removeSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

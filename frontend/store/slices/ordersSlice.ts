import { isAxiosError } from 'axios';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/store/api';
import { orders as seededOrders } from '@/lib/mockData';
import { Order, OrderStatus } from '@/types/fresh';

type ApiOrder = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity_label: string;
  quantity: number;
  delivery_date: string;
  slot: 'MORNING' | 'EVENING';
  price_at_order: number | string;
  total_amount: number | string;
  status: 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
};

type ApiCreatedOrder = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  delivery_date: string;
  slot: 'MORNING' | 'EVENING';
  price_at_order: number | string;
  total_amount: number | string;
};

export type PlaceOneTimeOrderInput = {
  productId: string;
  addressId: string;
  quantity: number;
  deliveryDate: string;
  slots: ('MORNING' | 'EVENING')[];
  productName: string;
  productSize: string;
  deliveryAddress: string;
};

type ApiResponse<T> = { data: T };
type OrderCreateError = { message: string; shortfall?: number };
type OrdersState = {
  items: Order[];
  isLoading: boolean;
  isCreating: boolean;
  hasLoaded: boolean;
  error: string | null;
  createError: OrderCreateError | null;
};

function getErrorMessage(error: unknown, fallback = 'Unable to load deliveries') {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function getOrderCreateError(error: unknown): OrderCreateError {
  if (isAxiosError<{ message?: string; shortfall?: number | string }>(error)) {
    const shortfall = Number(error.response?.data?.shortfall);
    return {
      message: error.response?.data?.message ?? error.message ?? 'Unable to place this order',
      ...(Number.isFinite(shortfall) && shortfall > 0 ? { shortfall } : {}),
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unable to place this order',
  };
}

function toOrder(order: ApiOrder): Order {
  const status: OrderStatus = order.status === 'DELIVERED'
    ? 'Delivered'
    : order.status === 'CANCELLED'
      ? 'Cancelled'
      : 'Upcoming';
  const price = Number(order.price_at_order);

  return {
    id: order.id,
    date: order.delivery_date,
    items: [{
      productId: order.product_id,
      name: `${order.product_name} ${order.quantity_label}`.trim(),
      quantity: order.quantity,
      price,
    }],
    itemTotal: Number(order.total_amount),
    deliveryFee: 0,
    walletUsed: 0,
    totalPaid: Number(order.total_amount),
    status,
    deliveryAddress: '',
    deliverySlot: order.slot === 'MORNING' ? 'Morning' : 'Evening',
  };
}

function toCreatedOrder(order: ApiCreatedOrder, input: PlaceOneTimeOrderInput): Order {
  const price = Number(order.price_at_order);
  const total = Number(order.total_amount);

  return {
    id: order.id,
    date: order.delivery_date.slice(0, 10),
    items: [{
      productId: order.product_id,
      name: `${input.productName} ${input.productSize}`.trim(),
      quantity: order.quantity,
      price,
    }],
    itemTotal: total,
    deliveryFee: 0,
    walletUsed: total,
    totalPaid: total,
    status: 'Upcoming',
    deliveryAddress: input.deliveryAddress,
    deliverySlot: order.slot === 'MORNING' ? 'Morning' : 'Evening',
  };
}

export const fetchOrders = createAsyncThunk<Order[], void, { rejectValue: string }>(
  'orders/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiOrder[]>>('/orders');
      return response.data.data.map(toOrder);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const placeOneTimeOrder = createAsyncThunk<
  Order[],
  PlaceOneTimeOrderInput,
  { rejectValue: OrderCreateError }
>(
  'orders/placeOneTime',
  async (input, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<{ orders: ApiCreatedOrder[] }>>('/orders', {
        productId: input.productId,
        addressId: input.addressId,
        quantity: input.quantity,
        deliveryDate: input.deliveryDate,
        slots: input.slots,
      });
      return response.data.data.orders.map((order) => toCreatedOrder(order, input));
    } catch (error) {
      return rejectWithValue(getOrderCreateError(error));
    }
  },
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: seededOrders, isLoading: false, isCreating: false, hasLoaded: false, error: null, createError: null } as OrdersState,
  reducers: {
    addOrder: (state, action: PayloadAction<Order>) => { state.items.unshift(action.payload); },
    updateOrderStatus: (state, action: PayloadAction<{ id: string; status: OrderStatus }>) => {
      const order = state.items.find((item) => item.id === action.payload.id);
      if (order) order.status = action.payload.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
        state.hasLoaded = true;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load deliveries';
      })
      .addCase(placeOneTimeOrder.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
      })
      .addCase(placeOneTimeOrder.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(...action.payload);
      })
      .addCase(placeOneTimeOrder.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload ?? { message: 'Unable to place this order' };
      });
  },
});

export const { addOrder, updateOrderStatus } = ordersSlice.actions;
export default ordersSlice.reducer;

import { isAxiosError } from 'axios';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/store/api';
import { orders as seededOrders } from '@/lib/mockData';
import { Order, OrderInvoice, OrderStatus } from '@/types/fresh';

type ApiOrder = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity_label: string;
  images?: string[];
  main_img_nobg?: string;
  quantity: number;
  delivery_date: string;
  slot: 'MORNING' | 'EVENING';
  price_at_order: number | string;
  total_amount: number | string;
  status: 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
};

type ApiOrderDetail = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  delivery_date: string;
  slot: 'MORNING' | 'EVENING';
  price_at_order: number | string;
  total_amount: number | string;
  status: ApiOrder['status'];
  source: 'ONE_TIME' | 'SUBSCRIPTION';
  wallet_transaction_id: string | null;
  product: { name: string; quantity_label: string; images?: string[]; main_img_nobg?: string };
  address: { flat_no_apartment_floor: string; block_tower?: string | null; landmark?: string | null; pincode: string; delivery_instructions?: string[] };
};

type ApiOrderInvoice = {
  invoiceNumber: string;
  orderId: string;
  dateGenerated: string;
  billedTo: string;
  deliveryAddress: string;
  productName: string;
  quantity: number;
  rate: number | string;
  subtotal: number | string;
  total: number | string;
  paymentMode: string;
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
  detail: Order | null;
  detailIsLoading: boolean;
  detailError: string | null;
  invoice: OrderInvoice | null;
  invoiceIsLoading: boolean;
  invoiceError: string | null;
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
    orderId: order.order_id,
    date: order.delivery_date.slice(0, 10),
    items: [{
      productId: order.product_id,
      name: `${order.product_name} ${order.quantity_label}`.trim(),
      quantity: order.quantity,
      price,
      imageUri: order.main_img_nobg ?? order.images?.find(Boolean),
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

function toOrderDetail(order: ApiOrderDetail): Order {
  const total = Number(order.total_amount);
  const productImage = order.product.main_img_nobg ?? order.product.images?.find(Boolean);
  const address = [
    order.address.flat_no_apartment_floor,
    order.address.block_tower,
    order.address.landmark,
    order.address.pincode,
  ].filter(Boolean).join(', ');

  return {
    id: order.id,
    orderId: order.order_id,
    date: order.delivery_date.slice(0, 10),
    items: [{
      productId: order.product_id,
      name: `${order.product.name} ${order.product.quantity_label}`.trim(),
      quantity: order.quantity,
      price: Number(order.price_at_order),
      imageUri: productImage,
    }],
    itemTotal: total,
    deliveryFee: 0,
    walletUsed: order.wallet_transaction_id ? total : 0,
    totalPaid: total,
    status: order.status === 'DELIVERED' ? 'Delivered' : order.status === 'CANCELLED' ? 'Cancelled' : 'Upcoming',
    deliveryAddress: address,
    deliverySlot: order.slot === 'MORNING' ? 'Morning' : 'Evening',
    paymentStatus: order.wallet_transaction_id ? 'Paid from wallet' : order.source === 'SUBSCRIPTION' ? 'Subscription payment pending' : 'Payment pending',
  };
}

function toOrderInvoice(invoice: ApiOrderInvoice): OrderInvoice {
  return {
    ...invoice,
    rate: Number(invoice.rate),
    subtotal: Number(invoice.subtotal),
    total: Number(invoice.total),
  };
}

function toCreatedOrder(order: ApiCreatedOrder, input: PlaceOneTimeOrderInput): Order {
  const price = Number(order.price_at_order);
  const total = Number(order.total_amount);

  return {
    id: order.id,
    orderId: order.order_id,
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

export const fetchOrders = createAsyncThunk<Order[], string | undefined, { rejectValue: string }>(
  'orders/fetch',
  async (date, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiOrder[]>>('/orders', {
        params: date ? { date } : undefined,
      });
      return response.data.data.map(toOrder);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchOrderById = createAsyncThunk<Order, string, { rejectValue: string }>(
  'orders/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiOrderDetail>>(`/orders/${id}`);
      return toOrderDetail(response.data.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to load order details'));
    }
  },
);

export const fetchOrderInvoice = createAsyncThunk<OrderInvoice, string, { rejectValue: string }>(
  'orders/fetchInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiOrderInvoice>>(`/orders/${id}/invoice`);
      return toOrderInvoice(response.data.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to generate invoice'));
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
  initialState: { items: seededOrders, isLoading: false, isCreating: false, hasLoaded: false, error: null, createError: null, detail: null, detailIsLoading: false, detailError: null, invoice: null, invoiceIsLoading: false, invoiceError: null } as OrdersState,
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
      .addCase(fetchOrderById.pending, (state) => {
        state.detail = null;
        state.detailIsLoading = true;
        state.detailError = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.detail = action.payload;
        state.detailIsLoading = false;
        state.items = [action.payload, ...state.items.filter((item) => item.id !== action.payload.id)];
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.detailIsLoading = false;
        state.detailError = action.payload ?? 'Unable to load order details';
      })
      .addCase(fetchOrderInvoice.pending, (state) => {
        state.invoice = null;
        state.invoiceIsLoading = true;
        state.invoiceError = null;
      })
      .addCase(fetchOrderInvoice.fulfilled, (state, action) => {
        state.invoice = action.payload;
        state.invoiceIsLoading = false;
      })
      .addCase(fetchOrderInvoice.rejected, (state, action) => {
        state.invoiceIsLoading = false;
        state.invoiceError = action.payload ?? 'Unable to generate invoice';
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

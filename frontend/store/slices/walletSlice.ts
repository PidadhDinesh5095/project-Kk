import { isAxiosError } from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/store/api';
import { WalletTransaction } from '@/types/fresh';

type ApiWalletTransaction = {
  id: string;
  type: 'credit' | 'debit' | 'debit-ipo';
  amount: number | string;
  balance_after: number | string;
  reference: string | null;
  created_at: string;
};

type ApiResponse<T> = { data: T };
type TransactionsPage = {
  items: ApiWalletTransaction[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
type WalletPageRequest = { offset: number; append: boolean };
type WalletState = {
  balance: number;
  transactions: WalletTransaction[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingTransactions: boolean;
  isDepositing: boolean;
  hasMoreTransactions: boolean;
  transactionsOffset: number;
  transactionsError: string | null;
  error: string | null;
  depositError: string | null;
};

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function toWalletTransaction(transaction: ApiWalletTransaction): WalletTransaction {
  const amount = Number(transaction.amount);
  const isCredit = transaction.type === 'credit';
  const type = isCredit ? 'top-up' : 'payment';

  return {
    id: transaction.id,
    type,
    title: isCredit ? 'Wallet Credit' : 'Wallet Debit',
    timestamp: new Date(transaction.created_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    amount: Math.abs(amount),
    direction: amount >= 0 ? 'credit' : 'debit',
  };
}

export const fetchWallet = createAsyncThunk<number, void, { rejectValue: string }>(
  'wallet/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<{ balance: number | string }>>('/wallet');
      return Number(response.data.data.balance);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to load wallet balance'));
    }
  },
);

export const fetchWalletTransactions = createAsyncThunk<
  TransactionsPage,
  WalletPageRequest,
  { rejectValue: string }
>(
  'wallet/fetchTransactions',
  async ({ offset }, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<TransactionsPage>>('/wallet/transactions', {
        params: { offset },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to load transactions'));
    }
  },
);

export type TopupOrder = {
  razorpayOrder: { id: string; amount: number; currency: string };
  keyId: string;
  amount: number;
};

export const initiateWalletTopup = createAsyncThunk<
  TopupOrder,
  number,
  { rejectValue: string }
>(
  'wallet/initiateTopup',
  async (amount, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<TopupOrder>>('/wallet/topup', { amount });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to start wallet deposit'));
    }
  },
);

export type VerifyTopupResult = {
  transaction: ApiWalletTransaction;
  balance: number;
};

export const verifyWalletTopup = createAsyncThunk<
  VerifyTopupResult,
  { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  { rejectValue: string }
>(
  'wallet/verifyTopup',
  async (payment, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<VerifyTopupResult>>('/wallet/topup/verify', payment);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Payment verification failed'));
    }
  },
);

const initialState: WalletState = {
  balance: 0,
  transactions: [],
  hasLoaded: false,
  isLoading: false,
  isLoadingTransactions: false,
  isDepositing: false,
  hasMoreTransactions: true,
  transactionsOffset: 0,
  transactionsError: null,
  error: null,
  depositError: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    resetWalletError: (state) => { state.error = null; state.depositError = null; },
    cancelWalletTopup: (state) => { state.isDepositing = false; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.balance = action.payload;
        state.hasLoaded = true;
        state.isLoading = false;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load wallet balance';
      })
      .addCase(fetchWalletTransactions.pending, (state) => {
        state.isLoadingTransactions = true;
        state.transactionsError = null;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        const page = action.payload;
        const transactions = page.items.map(toWalletTransaction);
        state.transactions = action.meta.arg.append
          ? [...state.transactions, ...transactions]
          : transactions;
        state.transactionsOffset = page.offset + page.items.length;
        state.hasMoreTransactions = page.hasMore;
        state.isLoadingTransactions = false;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        state.isLoadingTransactions = false;
        state.transactionsError = action.payload ?? 'Unable to load transactions';
      })
      .addCase(initiateWalletTopup.pending, (state) => {
        state.isDepositing = true;
        state.depositError = null;
      })
      .addCase(initiateWalletTopup.rejected, (state, action) => {
        state.isDepositing = false;
        state.depositError = action.payload ?? 'Unable to start wallet deposit';
      })
      .addCase(verifyWalletTopup.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.transactions.unshift(toWalletTransaction(action.payload.transaction));
        state.transactionsOffset += 1;
        state.isDepositing = false;
      })
      .addCase(verifyWalletTopup.rejected, (state, action) => {
        state.isDepositing = false;
        state.depositError = action.payload ?? 'Payment verification failed';
      });
  },
});

export const { resetWalletError, cancelWalletTopup } = walletSlice.actions;
export default walletSlice.reducer;

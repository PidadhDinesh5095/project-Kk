import axios from 'axios';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/store/api';
import type { RootState } from '@/store';
import { Notification } from '@/types/fresh';

type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

type ApiResponse<T> = { data: T };
type NotificationsState = {
  items: Notification[];
  hasLoaded: boolean;
  isLoading: boolean;
  error: string | null;
};

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function toNotification(notification: ApiNotification): Notification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    timestamp: new Date(notification.created_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    isRead: notification.read,
  };
}

export const fetchNotifications = createAsyncThunk<
  Notification[],
  void,
  { rejectValue: string; state: RootState }
>(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiNotification[]>>('/notifications');
      return response.data.data.map(toNotification);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to load notifications'));
    }
  },
  {
    condition: (_, { getState }) => {
      return !getState().notifications.isLoading;
    },
  },
);

export const markNotificationRead = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await api.patch(`/notifications/${id}/read`);
    return id;
  } catch (error) {
    return rejectWithValue(errorMessage(error, 'Unable to mark notification as read'));
  }
});

export const clearNotifications = createAsyncThunk<void, void, { rejectValue: string }>(
  'notifications/clear',
  async (_, { rejectWithValue }) => {
    try {
      await api.delete('/notifications');
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to clear notifications'));
    }
  },
);

type NotificationInput = Omit<Notification, 'type'> & { type: string };

const initialState: NotificationsState = {
  items: [],
  hasLoaded: false,
  isLoading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationInput>) => {
      state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
        state.hasLoaded = true;
        state.isLoading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load notifications';
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notification = state.items.find((item) => item.id === action.payload);
        if (notification) notification.isRead = true;
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.error = action.payload ?? 'Unable to mark notification as read';
      })
      .addCase(clearNotifications.fulfilled, (state) => {
        state.items = [];
        state.hasLoaded = true;
        state.error = null;
      })
      .addCase(clearNotifications.rejected, (state, action) => {
        state.error = action.payload ?? 'Unable to clear notifications';
      });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;

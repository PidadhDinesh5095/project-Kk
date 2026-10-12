import { isAxiosError } from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/store/api';

type PauseDatesResponse = { data: { pauseDates: string[] } };

type PauseDeliveriesState = {
  dates: string[];
  isLoading: boolean;
  isSaving: boolean;
  hasLoaded: boolean;
  error: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export const fetchPauseDates = createAsyncThunk<string[], void, { rejectValue: string }>(
  'pauseDeliveries/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<PauseDatesResponse>('/profile/pause-dates');
      return response.data.data.pauseDates.map((date) => date.slice(0, 10));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to load paused dates'));
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { pauseDeliveries: PauseDeliveriesState };
      return !state.pauseDeliveries.hasLoaded && !state.pauseDeliveries.isLoading;
    },
  },
);

export const updatePauseDates = createAsyncThunk<
  string[],
  string[],
  { rejectValue: string }
>(
  'pauseDeliveries/update',
  async (dates, { rejectWithValue }) => {
    try {
      const response = await api.patch<PauseDatesResponse>('/profile/pause-dates', { dates });
      return response.data.data.pauseDates.map((date) => date.slice(0, 10));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to update paused dates'));
    }
  },
);

const initialState: PauseDeliveriesState = {
  dates: [],
  isLoading: false,
  isSaving: false,
  hasLoaded: false,
  error: null,
};

const pauseDeliveriesSlice = createSlice({
  name: 'pauseDeliveries',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPauseDates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPauseDates.fulfilled, (state, action) => {
        state.dates = action.payload;
        state.isLoading = false;
        state.hasLoaded = true;
      })
      .addCase(fetchPauseDates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load paused dates';
      })
      .addCase(updatePauseDates.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updatePauseDates.fulfilled, (state, action) => {
        state.dates = action.payload;
        state.isSaving = false;
        state.hasLoaded = true;
      })
      .addCase(updatePauseDates.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload ?? 'Unable to update paused dates';
      });
  },
});

export default pauseDeliveriesSlice.reducer;
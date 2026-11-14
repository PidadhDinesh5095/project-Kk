import axios from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '@/store/api';
import { Address } from '@/types/fresh';

export type ResidenceType = 'COMMUNITY_APARTMENT' | 'INDEPENDENT';
export type DeliveryInstruction =
  | 'PET_AT_HOME'
  | 'LEAVE_AT_DOOR'
  | 'RING_BELL'
  | 'PLACE_IN_BAG'
  | 'AT_SHOE_RACK'
  | 'AT_SECURITY';

export type AddressFields = {
  residenceType: ResidenceType;
  flatNoApartmentFloor: string;
  blockTower?: string | null;
  pincode: string;
  landmark?: string | null;
  lat: number;
  lng: number;
  deliveryInstructions: DeliveryInstruction[];
  isDefault?: boolean;
  city?: string;
};

export type UpdateAddressInput = Partial<AddressFields> & { id: string };

type ApiAddress = {
  id: string;
  residence_type: ResidenceType;
  flat_no_apartment_floor: string;
  block_tower: string | null;
  pincode: string;
  landmark: string | null;
  lat: number;
  lng: number;
  delivery_instructions: DeliveryInstruction[];
  is_default: boolean;
  is_serviceable: boolean;
};

type ApiResponse<T> = { data: T; message?: string };
type AddressMutationResult = { address: Address; message: string };

const instructionLabels: Record<DeliveryInstruction, string> = {
  PET_AT_HOME: 'Pet at home',
  LEAVE_AT_DOOR: 'Leave at door',
  RING_BELL: 'Ring bell',
  PLACE_IN_BAG: 'Place in bag',
  AT_SHOE_RACK: 'At shoe rack',
  AT_SECURITY: 'At security',
};

function toAddress(address: ApiAddress, city = ''): Address {
  return {
    id: address.id,
    label: address.residence_type === 'COMMUNITY_APARTMENT' ? 'Community/Apartment' : 'Independent',
    line1: [address.flat_no_apartment_floor, address.block_tower].filter(Boolean).join(', '),
    city,
    pincode: address.pincode,
    isDefault: address.is_default,
    isServiceable: address.is_serviceable,
    deliveryInstructions: address.delivery_instructions.map((item) => instructionLabels[item]).join(', '),
    lat: address.lat,
    lng: address.lng,
    residenceType: address.residence_type,
    flatNoApartmentFloor: address.flat_no_apartment_floor,
    blockTower: address.block_tower ?? '',
    landmark: address.landmark ?? '',
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export const fetchAddresses = createAsyncThunk<Address[], void, { rejectValue: string }>(
  'addresses/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<ApiAddress[]>>('/addresses');
      return response.data.data.map((address) => toAddress(address));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to load addresses'));
    }
  },
);

export const saveAddress = createAsyncThunk<AddressMutationResult, AddressFields, { rejectValue: string }>(
  'addresses/save',
  async ({ city = '', ...fields }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<ApiAddress>>('/addresses', fields);
      return {
        address: toAddress(response.data.data, city),
        message: response.data.message ?? 'Address saved',
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to save address'));
    }
  },
);

export const updateAddress = createAsyncThunk<AddressMutationResult, UpdateAddressInput, { rejectValue: string }>(
  'addresses/update',
  async ({ id, city = '', ...fields }, { rejectWithValue }) => {
    try {
      console.log('Updating address with fields:', fields);
      const response = await api.patch<ApiResponse<ApiAddress>>(`/addresses/${id}`, fields);
      return {
        address: toAddress(response.data.data, city),
        message: response.data.message ?? 'Address updated',
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to update address'));
    }
  },
);

export const deleteAddress = createAsyncThunk<
  { id: string; message: string },
  string,
  { rejectValue: string }
>(
  'addresses/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete<ApiResponse<null>>(`/addresses/${id}`);
      return { id, message: response.data.message ?? 'Address deleted' };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to delete address'));
    }
  },
);

export const setDefaultAddress = createAsyncThunk<string, string, { rejectValue: string }>(
  'addresses/setDefault',
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/addresses/${id}/set-default`, {});
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Unable to set default address'));
    }
  },
);

type AddressesState = {
  items: Address[];
  isLoading: boolean;
  isSaving: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  settingDefaultAddressId: string | null;
  error: string | null;
  hasLoaded: boolean;
};

const initialState: AddressesState = {
  items: [],
  isLoading: false,
  isSaving: false,
  isUpdating: false,
  isDeleting: false,
  settingDefaultAddressId: null,
  error: null,
  hasLoaded: false,
};

const addressesSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {
    clearAddressError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasLoaded = true;
        state.items = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to load addresses';
      })
      .addCase(saveAddress.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(saveAddress.fulfilled, (state, action) => {
        state.isSaving = false;
        if (action.payload.address.isDefault) {
          state.items = state.items.map((address) => ({ ...address, isDefault: false }));
        }
        state.items.push(action.payload.address);
      })
      .addCase(saveAddress.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload ?? 'Unable to save address';
      })
      .addCase(updateAddress.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedAddress = action.payload.address;
        const existing = state.items.find((address) => address.id === updatedAddress.id);
        if (updatedAddress.isDefault) {
          state.items = state.items.map((address) => ({ ...address, isDefault: false }));
        } else if (existing?.isDefault && !updatedAddress.isServiceable) {
          state.items = state.items.map((address) => ({ ...address, isDefault: false }));
          const nextDefault = state.items.find(
            (address) => address.id !== updatedAddress.id && address.isServiceable,
          );
          if (nextDefault) nextDefault.isDefault = true;
        }
        const index = state.items.findIndex((address) => address.id === updatedAddress.id);
        if (index !== -1) state.items[index] = updatedAddress;
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload ?? 'Unable to update address';
      })
      .addCase(deleteAddress.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.isDeleting = false;
        const removed = state.items.find((address) => address.id === action.payload.id);
        state.items = state.items.filter((address) => address.id !== action.payload.id);
        if (removed?.isDefault) {
          const nextDefault = state.items.find((address) => address.isServiceable);
          if (nextDefault) nextDefault.isDefault = true;
        }
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload ?? 'Unable to delete address';
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.settingDefaultAddressId = null;
        state.items = state.items.map((address) => ({
          ...address,
          isDefault: address.id === action.payload,
        }));
      })
      .addCase(setDefaultAddress.pending, (state, action) => {
        state.settingDefaultAddressId = action.meta.arg;
        state.error = null;
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.settingDefaultAddressId = null;
        state.error = action.payload ?? 'Unable to set default address';
      });
  },
});

export const { clearAddressError } = addressesSlice.actions;
export default addressesSlice.reducer;

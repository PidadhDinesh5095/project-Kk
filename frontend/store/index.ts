import { combineReducers, configureStore, type Reducer } from '@reduxjs/toolkit';
import addresses from '@/store/slices/addressesSlice';
import homeBanners from '@/store/slices/homeBannersSlice';
import notifications from '@/store/slices/notificationsSlice';
import orders from '@/store/slices/ordersSlice';
import pauseDeliveries from '@/store/slices/pauseDeliveriesSlice';
import profile from '@/store/slices/profileSlice';
import products from '@/store/slices/productsSlice';
import subscription from '@/store/slices/subscriptionSlice';
import user from '@/store/slices/userSlice';
import { logout } from '@/store/slices/userSlice';
import wallet from '@/store/slices/walletSlice';

const appReducer = combineReducers({ addresses, homeBanners, profile, user, wallet, subscription, notifications, orders, products, pauseDeliveries });

const rootReducer: Reducer<ReturnType<typeof appReducer>> = (state, action) => {
	if (logout.fulfilled.match(action)) {
		state = undefined;
	}

	return appReducer(state, action);
};

export const store = configureStore({ reducer: rootReducer });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

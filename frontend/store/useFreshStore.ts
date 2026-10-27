import { useCallback } from 'react';
import {
  addNotification,
  clearNotifications as clearNotificationsThunk,
  fetchNotifications as fetchNotificationsThunk,
  markNotificationRead as markNotificationReadThunk,
} from '@/store/slices/notificationsSlice';
import {
  addSubscription,
  cancelSubscription as cancelSubscriptionThunk,
  createSubscription as createSubscriptionThunk,
  fetchSubscriptionById as fetchSubscriptionByIdThunk,
  fetchSubscriptions as fetchSubscriptionsThunk,
  fetchSubscriptionCounts as fetchSubscriptionCountsThunk,
  pauseSubscription as pauseSubscriptionThunk,
  removeSubscription,
  restartSubscription as restartSubscriptionThunk,
  resumeSubscription as resumeSubscriptionThunk,
  setActiveSubscription,
  skipSubscriptionDates as skipSubscriptionDatesThunk,
  updateSubscriptionSchedule as updateSubscriptionScheduleThunk,
  updateSubscription,
} from '@/store/slices/subscriptionSlice';
import { addOrder, updateOrderStatus } from '@/store/slices/ordersSlice';
import { fetchPauseDates as fetchPauseDatesThunk, updatePauseDates as updatePauseDatesThunk } from '@/store/slices/pauseDeliveriesSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Notification, Order, OrderStatus, Subscription } from '@/types/fresh';

type SubscriptionCreatePayload = Parameters<typeof createSubscriptionThunk>[0];
type SubscriptionSchedulePayload = Parameters<typeof updateSubscriptionScheduleThunk>[0];

export function useFreshStore() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const addresses = useAppSelector((state) => state.addresses.items);
  const profile = useAppSelector((state) => state.profile);
  const wallet = useAppSelector((state) => state.wallet);
  const subscriptionState = useAppSelector((state) => state.subscription);
  const notifications = useAppSelector((state) => state.notifications.items);
  const notificationsHasLoaded = useAppSelector((state) => state.notifications.hasLoaded);
  const notificationsIsLoading = useAppSelector((state) => state.notifications.isLoading);
  const notificationsError = useAppSelector((state) => state.notifications.error);
  const products = useAppSelector((state) => state.products.items);
  const productsStatus = useAppSelector((state) => state.products.listStatus);
  const productsError = useAppSelector((state) => state.products.listError);
  const productsHasLoaded = useAppSelector((state) => state.products.listHasLoaded);
  const orders = useAppSelector((state) => state.orders.items);
  const pauseDeliveriesState = useAppSelector((state) => state.pauseDeliveries);

  const subscriptions = subscriptionState.items;
  const activeSubscription = subscriptions.find((sub) => sub.id === subscriptionState.activeId) ?? subscriptions[0] ?? null;

  return {
    user,
    addresses,
    profile,
    walletBalance: wallet.balance,
    transactions: wallet.transactions,
    walletIsLoading: wallet.isLoading,
    walletIsDepositing: wallet.isDepositing,
    walletIsLoadingTransactions: wallet.isLoadingTransactions,
    walletHasMoreTransactions: wallet.hasMoreTransactions,
    walletTransactionsOffset: wallet.transactionsOffset,
    walletError: wallet.error,
    walletDepositError: wallet.depositError,
    subscription: activeSubscription,
    subscriptions,
    subscriptionIsLoading: subscriptionState.isLoading,
    subscriptionIsCreating: subscriptionState.isCreating,
    subscriptionIsUpdating: subscriptionState.isUpdating,
    subscriptionError: subscriptionState.error,
    subscriptionHasLoaded: subscriptionState.hasLoaded,
    subscriptionCounts: subscriptionState.counts,
    subscriptionCountsIsLoading: subscriptionState.countsIsLoading,
    subscriptionCountsHasLoaded: subscriptionState.countsHasLoaded,
    notifications,
    notificationsHasLoaded,
    notificationsIsLoading,
    notificationsError,
    fetchNotifications: useCallback(() => dispatch(fetchNotificationsThunk()), [dispatch]),
    products,
    productsStatus,
    productsError,
    productsHasLoaded,
    orders,
    pauseDates: pauseDeliveriesState.dates,
    pauseDatesIsLoading: pauseDeliveriesState.isLoading,
    pauseDatesIsSaving: pauseDeliveriesState.isSaving,
    pauseDatesHasLoaded: pauseDeliveriesState.hasLoaded,
    pauseDatesError: pauseDeliveriesState.error,
    fetchPauseDates: useCallback(() => dispatch(fetchPauseDatesThunk()), [dispatch]),
    updatePauseDates: useCallback((dates: string[]) => dispatch(updatePauseDatesThunk(dates)), [dispatch]),
    addNotification: useCallback((notification: Notification) => dispatch(addNotification(notification)), [dispatch]),
    clearNotifications: useCallback(() => dispatch(clearNotificationsThunk()), [dispatch]),
    markNotificationRead: useCallback((id: string) => dispatch(markNotificationReadThunk(id)), [dispatch]),
    addSubscription: useCallback((subscription: Subscription) => dispatch(addSubscription(subscription)), [dispatch]),
    fetchSubscriptionById: useCallback((id: string) => dispatch(fetchSubscriptionByIdThunk(id)), [dispatch]),
    fetchSubscriptions: useCallback(() => dispatch(fetchSubscriptionsThunk()), [dispatch]),
    fetchSubscriptionCounts: useCallback(() => dispatch(fetchSubscriptionCountsThunk()), [dispatch]),
    createSubscription: useCallback((payload: SubscriptionCreatePayload) => dispatch(createSubscriptionThunk(payload)), [dispatch]),
    updateSubscriptionSchedule: useCallback((payload: SubscriptionSchedulePayload) => dispatch(updateSubscriptionScheduleThunk(payload)), [dispatch]),
    pauseSubscription: useCallback((id: string, reason?: string) => dispatch(pauseSubscriptionThunk({ id, reason })), [dispatch]),
    resumeSubscription: useCallback((id: string) => dispatch(resumeSubscriptionThunk(id)), [dispatch]),
    restartSubscription: useCallback((id: string) => dispatch(restartSubscriptionThunk(id)), [dispatch]),
    cancelSubscription: useCallback((id: string, reason?: string) => dispatch(cancelSubscriptionThunk({ id, reason })), [dispatch]),
    skipSubscriptionDates: useCallback((id: string, dates: string[]) => dispatch(skipSubscriptionDatesThunk({ id, dates })), [dispatch]),
    updateSubscription: useCallback((changes: Partial<Subscription> & { id?: string }) => dispatch(updateSubscription(changes)), [dispatch]),
    removeSubscription: useCallback((id: string) => dispatch(removeSubscription(id)), [dispatch]),
    setActiveSubscription: useCallback((id: string) => dispatch(setActiveSubscription(id)), [dispatch]),
    addOrder: useCallback((order: Order) => dispatch(addOrder(order)), [dispatch]),
    updateOrderStatus: useCallback((id: string, status: OrderStatus) => dispatch(updateOrderStatus({ id, status })), [dispatch]),
  };
}

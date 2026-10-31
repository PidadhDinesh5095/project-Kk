
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CalendarX,
  CircleCheck,
  CircleX,
  MapPin,
  PackageCheck,
  PackageX,
  Pause,
  Play,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { colors, EmptyState } from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';

const typeIcon = {
  ORDER_CONFIRMED: PackageCheck,
  ORDER_CANCELLED: PackageX,
  ORDER_OUT_FOR_DELIVERY: Truck,
  ORDER_DELIVERED: CircleCheck,
  ORDER_DELIVERY_FAILED: PackageX,
  ORDER_PAYMENT_FAILED: CircleX,
  WALLET_TOPUP: Wallet,
  WALLET_TOPUP_FAILED: CircleX,
  WALLET_REFUNDED: Wallet,
  WALLET_WITHDRAW: Wallet,
  WALLET_DEBITED: Wallet,
  WALLET_BALANCE_LOW: Wallet,
  SUBSCRIPTION_CREATED: CalendarDays,
  SUBSCRIPTION_PAUSED: Pause,
  SUBSCRIPTION_RESUMED: Play,
  SUBSCRIPTION_DATES_SKIPPED: CalendarX,
  SUBSCRIPTION_CANCELLED: CircleX,
  SUBSCRIPTION_SCHEDULE_UPDATED: CalendarDays,
  DELIVERY_DATES_PAUSED: CalendarX,
  ADDRESS_UPDATE: MapPin,
};

const typeColor = (type: string) => {
  if (type.startsWith('WALLET_')) return { color: '#15803D', background: '#F0FDF4' };
  if (type.includes('CANCELLED') || type.includes('FAILED')) {
    return { color: '#DC2626', background: '#FEF2F2' };
  }
  if (type.includes('PAUSED') || type.includes('SKIPPED')) {
    return { color: '#D97706', background: '#FFFBEB' };
  }
  return { color: colors.primary, background: '#EEF3FF' };
};

const renderTypeIcon = (type: string) => {
  const Icon = typeIcon[type as keyof typeof typeIcon] ?? Bell;
  const { color, background } = typeColor(type);
  return (
    <View
      className="h-16 w-10  items-center justify-center rounded-xl"
      
    >
      <Icon size={30} color={color} strokeWidth={1.8} />
    </View>
  );
};

export default function NotificationsScreen() {
  const {
    notifications,
    notificationsIsLoading,
    notificationsError,
    notificationsHasMore,
    fetchNotifications,
    clearNotifications,
    markNotificationRead,
  } = useFreshStore();

  const [confirm, setConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications({ offset: 0, limit: 10, reset: true });
    }, [fetchNotifications]),
  );

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentSize, contentOffset } = event.nativeEvent;
    const threshold = 120;
    const isAtEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;

    if (isAtEnd && !notificationsIsLoading && notificationsHasMore && notifications.length > 0) {
      void fetchNotifications({ offset: notifications.length, limit: 10, reset: false });
    }
  };

  const clearAll = async () => {
    setActionError(null);
    try {
      await clearNotifications().unwrap();
      setConfirm(false);
    } catch (error) {
      setActionError(typeof error === 'string' ? error : 'Unable to clear notifications');
    }
  };

  return (
    <View className="flex-1 bg-[#F7F9FC]">
      <View className="mb-4 flex-row items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-3">
        <Pressable
          className="h-10 w-10 items-start justify-center"
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={28} color="#111827" />
        </Pressable>

        <View className="flex-1 flex-row items-center justify-center gap-2">
        
          <Text
            className="text-[22px] text-[#111827]"
            style={{ fontFamily: 'RalewayBold' }}
          >
            Notifications
          </Text>
        </View>

        {notifications.length > 0 && (
          <Pressable
            className="h-10 w-10 items-end justify-center"
            onPress={() => setConfirm(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear all notifications"
          >
            <Trash2 size={22} color={colors.red} />
          </Pressable>
        )}
        {notifications.length === 0 && <View className="h-10 w-10" />}
      </View>

      {(actionError || notificationsError) && (
        <Text
          className="px-5 pb-3 text-[13px] text-red-600"
          style={{ fontFamily: 'RalewayMedium' }}
        >
          {actionError || notificationsError}
        </Text>
      )}

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={200}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
        {notificationsIsLoading && notifications.length === 0 ? (
          <Text
            className="py-8 text-center text-[14px] text-[#64748B]"
            style={{ fontFamily: 'RalewayMedium' }}
          >
            Loading notifications...
          </Text>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications"
            body="Updates about deliveries, wallet credits and offers will show up here."
          />
        ) : (
          <>
            {notifications.map((n) => (
              <Pressable
                key={n.id}
                className={`mb-2.5 flex-row items-start gap-3 rounded-[14px] border p-[8px] ${
                  n.isRead
                    ? 'border-[#E2E8F0] bg-white'
                    : 'border-[#023E8A] bg-[#F5F8FF]'
                }`}
                onPress={() => {
                  void markNotificationRead(n.id);
                }}
              >
                {renderTypeIcon(n.type)}

                <View className="flex-1">
                  <Text
                    className="text-[16px] text-[#111827]"
                    style={{ fontFamily: 'RalewayBold' }}
                  >
                    {n.title}
                  </Text>

                  <Text
                    className="mt-1 text-[13px] leading-[19px] text-[#000000]"
                    style={{ fontFamily: 'RalewaySemiBold' }}
                  >
                    {n.body}
                  </Text>

                  <Text
                    className="mt-1.5 text-[11px] text-[#64748B]"
                  >
                    {n.timestamp}
                  </Text>
                </View>

                {!n.isRead && (
                  <View className="mt-1.5 h-2 w-2 rounded-full bg-[#023E8A]" />
                )}
              </Pressable>
            ))}

            {notificationsIsLoading && notifications.length > 0 && (
              <Text
                className="py-4 text-center text-[12px] text-[#64748B]"
                style={{ fontFamily: 'RalewayMedium' }}
              >
                Loading more notifications...
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {confirm && (
        <Pressable
          className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center bg-black/40 px-10"
          onPress={() => setConfirm(false)}
        >
          <View className="w-full rounded-[20px] bg-white p-6">
            <View className="mb-3.5 h-11 w-11 self-center items-center justify-center rounded-full bg-[#FEE2E2]">
              <Trash2 size={20} color={colors.red} />
            </View>

            <Text
              className="text-center text-[17px] text-[#111827]"
              style={{ fontFamily: 'RalewayBold' }}
            >
              Clear all notifications?
            </Text>

            <Text
              className="mt-2 text-center text-[13px] leading-[19px] text-[#64748B]"
              style={{ fontFamily: 'Raleway' }}
            >
              This will remove all notifications. You can't undo this action.
            </Text>

            <View className="mt-5 flex-row gap-2.5">
              <Pressable
                className="flex-1 items-center rounded-[14px] border border-[#E2E8F0] py-3"
                onPress={() => setConfirm(false)}
              >
                <Text
                  className="text-[14px] text-[#111827]"
                  style={{ fontFamily: 'RalewaySemiBold' }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 items-center rounded-[14px] bg-[#EF4444] py-3"
                onPress={() => void clearAll()}
              >
                <Text
                  className="text-[14px] text-white"
                  style={{ fontFamily: 'RalewaySemiBold' }}
                >
                  Clear All
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

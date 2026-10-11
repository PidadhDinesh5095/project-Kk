import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, CalendarDays, ChevronRight, Clock3, Repeat } from 'lucide-react-native';
import { StatusPill } from '@/components/FreshComponents';
import { SubscriptionSkeleton } from '@/components/SubscriptionSkeleton';
import { useFreshStore } from '@/store/useFreshStore';
import { formatDate } from '@/lib/cutoff';
import { Subscription } from '@/types/fresh';

export default function SubscriptionsScreen() {
  const {
    subscriptions,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    subscriptionError,
    fetchSubscriptions,
    setActiveSubscription,
  } = useFreshStore();

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptions, subscriptionHasLoaded, subscriptionIsLoading]),
  );

  const openSubscription = (subscription: Subscription) => {
    setActiveSubscription(subscription.id);
    router.push({ pathname: '/subscription', params: { id: subscription.id } });
  };

  const isLoading = subscriptionIsLoading || !subscriptionHasLoaded;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 my-1 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 text-[22px] font-raleway-bold text-[#111827]">
          Subscriptions
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}>
        {subscriptionError && (
          <View className="mb-4 rounded-[12px] border border-[#FECACA] bg-white p-4">
            <Text className="font-raleway-semibold text-[13px] text-[#B91C1C]">{subscriptionError}</Text>
            <Pressable className="mt-3 self-start" onPress={() => { void fetchSubscriptions(); }}>
              <Text className="font-raleway-bold text-[13px] text-[#023E8A]">Retry</Text>
            </Pressable>
          </View>
        )}

        {isLoading && (
          <SubscriptionSkeleton variant="list" />
        )}

        {!isLoading && !subscriptionError && subscriptions.length === 0 && (
          <View className="items-center rounded-[14px] border border-[#E2E8F0] bg-white px-5 py-12">
            <Repeat size={28} color="#64748B" />
            <Text className="mt-3 font-raleway-bold text-[16px] text-[#111827]">No subscriptions yet</Text>
            <Text className="mt-1 text-center font-raleway-medium text-[13px] text-[#64748B]">
              Subscriptions you create will appear here.
            </Text>
          </View>
        )}

        {!isLoading && subscriptions.map((subscription: Subscription) => {
          const slotLabel = (subscription.dailySlots ?? [])
            .map((slot) => slot === 'MORNING' ? 'Morning' : 'Evening')
            .join(' + ') || subscription.timeSlot || 'Morning';
          const customQuantities = Object.values(subscription.customConfig?.quantityPerDay ?? {});
          const distinctCustomQuantities = [...new Set(customQuantities)].sort((left, right) => left - right);
          const quantityLabel = subscription.frequency === 'Daily'
            ? `${subscription.dailyQuantity ?? 1} per delivery`
            : subscription.frequency === 'Alternate' && subscription.alternateConfig
              ? `${subscription.alternateConfig.startDateQuantity} / ${subscription.alternateConfig.succeedingDayQuantity} per delivery`
              : subscription.frequency === 'Custom' && distinctCustomQuantities.length > 0
                ? `${distinctCustomQuantities.length === 1 ? distinctCustomQuantities[0] : `${distinctCustomQuantities[0]}-${distinctCustomQuantities[distinctCustomQuantities.length - 1]}`} per delivery`
                : `${subscription.dailyQuantity ?? subscription.quantityPerDelivery ?? 1} per delivery`;
          const nextDate = subscription.nextDeliveryDate ?? subscription.startDate;

          return (
            <Pressable
              key={subscription.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${subscription.productName ?? 'subscription'} details`}
              onPress={() => openSubscription(subscription)}
              className="mb-3 rounded-[14px] border border-[#E2E8F0] bg-white p-4 active:bg-[#F8FAFC]"
            >
              <View className="flex-row items-center gap-3">
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  {subscription.productImage ? (
                    <Image
                      source={{ uri: subscription.productImage }}
                      className="h-16 w-16 rounded-[8px] "
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-[8px] bg-[#F1F5F9]">
                      <Repeat size={16} color="#023E8A" />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-raleway-bold text-[18px] text-[#111827]">
                      {subscription.productName ?? 'Subscribed product'}
                    </Text>
                    <Text className="mt-1 font-raleway-semibold text-[14px] text-[#111827]">
                      {subscription.frequency} subscription
                    </Text>
                  </View>
                </View>
                <StatusPill label={subscription.status} />
              </View>

             

              <View className="mt-3 gap-2">
                <Text className="font-raleway-semibold text-[12px] text-[#64748B]">
                  {subscription.frequency} · {subscription.planTier ?? 'Standard'}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <CalendarDays size={16} color="#023E8A" />
                  <Text className="font-raleway-bold text-[14px] text-[#023E8A]">
                    Next delivery: {formatDate(nextDate)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

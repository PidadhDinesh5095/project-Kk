
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  Pause,
  Repeat,
  SkipForward,
} from 'lucide-react-native';
import {
  colors,
  PrimaryButton,
  SectionTitle,
  StatusPill,
} from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { formatDate } from '@/lib/cutoff';
import { Address, Product } from '@/types/fresh';
import { SubscriptionSkeleton } from '@/components/SubscriptionSkeleton';

export default function SubscriptionScreen() {
  const {
    subscription,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    subscriptionError,
    subscriptionIsUpdating,
    addresses,
    fetchSubscriptions,
    resumeSubscription,
    products,
  } = useFreshStore();

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptions, subscriptionHasLoaded, subscriptionIsLoading]),
  );

  if (subscriptionIsLoading || !subscriptionHasLoaded) {
    return (
      <View className="flex-1 bg-[#F7F9FC]">
        <Pressable className="ml-4 mt-2" onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          <Text className="mb-4 mt-2 font-raleway-bold text-[22px] text-[#111827]">My Subscription</Text>
          <SubscriptionSkeleton variant="detail" />
        </ScrollView>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F9FC] px-6">
        <Text className="font-raleway-bold text-[16px] text-[#111827]">Subscription not found</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="font-raleway-bold text-[#023E8A]">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const product = products.find(
    (productItem: Product) => productItem.id === subscription.productId
  );

  const addr = addresses.find(
    (addressItem: Address) => addressItem.id === subscription.deliveryAddressId
  ) ?? addresses[0];
  const nextDeliveryDate = subscription.nextDeliveryDate ?? subscription.startDate ?? new Date().toISOString();
  const slots = (subscription.dailySlots ?? [])
    .map((slot) => slot === 'MORNING' ? 'Morning' : 'Evening');
  const timeSlot = slots.join(' + ') || subscription.timeSlot || 'Morning';
  const productImage = subscription.productImage ?? product?.mainImgNobg ?? product?.images?.find(Boolean);
  const quantitySummary = subscription.frequency === 'Alternate' && subscription.alternateConfig
    ? `${subscription.alternateConfig.startDateQuantity} on first day, ${subscription.alternateConfig.succeedingDayQuantity} on alternate days`
    : `${subscription.dailyQuantity ?? subscription.quantityPerDelivery ?? 1} per delivery`;
  const dayNames: Record<string, string> = {
    SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday',
    TH: 'Thursday', FR: 'Friday', SA: 'Saturday',
  };
  const customSchedule = subscription.customConfig?.selectedDays?.map((day) => {
    const dayQuantity = subscription.customConfig?.quantityPerDay?.[day] ?? 1;
    return `${dayNames[day] ?? day}: ${dayQuantity}`;
  }).join(' · ');

  return (
    <View className="flex-1 bg-white ">
      <View className="flex-row items-center px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">My Subscription</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
        <View className="mt-4 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
          <View className="flex-row items-center justify-between gap-4">
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={{ width: 78, height: 78, borderRadius: 10, }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ width: 78, height: 78, borderRadius: 10 }}
                className="items-center justify-center "
              >
                <Repeat size={28} color={colors.primary} />
              </View>
            )}
            <View className="min-w-0 flex-1">
              <StatusPill label={subscription.status} />
              <Text className="mt-2 font-raleway-bold text-[18px] text-[#111827]">
                {product?.name ?? subscription.productName ?? 'Product'}
              </Text>
              {!!product?.size && (
                <Text className="mt-1 font-raleway-medium text-[13px] text-[#64748B]">
                  {product.size}
                </Text>
              )}
              <Text className="mt-2 font-raleway-semibold text-[13px] text-[#023E8A]">
                {subscription.frequency} subscription
              </Text>
            </View>
          </View>
        </View>

        <SectionTitle title="Delivery Details" />

        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-[14px]">
          <View className="flex-row items-center gap-3">
            <MapPin size={16} color={colors.primary} />

            <View className="flex-1">
              <Text className="font-raleway-medium text-[12px] text-[#64748B]">
                Address
              </Text>

              <Text className="mt-0.5 font-raleway-bold text-[14px] text-[#111827]">
                {addr ? `${addr.label} · ${addr.line1}, ${addr.city}` : 'Add a delivery address'}
              </Text>
            </View>
          </View>

          <View className="my-3 h-px bg-[#F1F5F9]" />

          <View className="flex-row items-center gap-3">
            <Repeat size={16} color={colors.primary} />

            <View className="flex-1">
              <Text className="font-raleway-medium text-[11px] text-[#64748B]">
                Schedule
              </Text>

              <Text className="mt-0.5 font-raleway-bold text-[14px] text-[#111827]">
                {subscription.frequency}{subscription.planTier ? ` · ${subscription.planTier}` : ''}
              </Text>
              <Text className="mt-1 font-raleway-medium text-[12px] text-black">
                {quantitySummary}
              </Text>
              {subscription.frequency === 'Custom' && !!customSchedule && (
                <Text className="mt-1 font-raleway-bold text-[12px] text-[#64748B]">
                  {customSchedule}
                </Text>
              )}
            </View>
          </View>

          <View className="my-3 h-px bg-[#F1F5F9]" />

          <View className="flex-row items-center gap-3">
            <Clock size={16} color={colors.primary} />

            <View className="flex-1">
              <Text className="font-raleway-medium text-[11px] text-[#64748B]">
                Delivery slots
              </Text>

              <Text className="mt-0.5 font-raleway-bold text-[14px] text-[#111827]">
                {timeSlot}
              </Text>
            </View>
          </View>

          <View className="my-3 h-px bg-[#F1F5F9]" />

          <View className="flex-row items-center gap-3">
            <Calendar size={16} color={colors.primary} />
            <View className="flex-1">
              <Text className="font-raleway-medium text-[11px] text-[#64748B]">Next delivery</Text>
              <Text className="mt-0.5 font-raleway-bold text-[14px] text-[#111827]">
                {formatDate(nextDeliveryDate)}
              </Text>
            </View>
          </View>
        </View>

        <SectionTitle title="Manage Subscription" />

        <Pressable
          className="mb-2.5 flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/subscription/pause')}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#FEF3C7]">
              <Pause size={18} color={colors.amber} />
            </View>

            <Text className="font-raleway-bold text-[14px] text-[#111827]">
              Pause Subscription
            </Text>
          </View>

          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          className="mb-2.5 flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/subscription/skip')}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#EEF3FF]">
              <SkipForward size={18} color={colors.primary} />
            </View>

            <Text className="font-raleway-bold text-[14px] text-[#111827]">
              Skip a Delivery
            </Text>
          </View>

          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          className="mb-2.5 flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/subscription/manage')}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#EEF3FF]">
              <Calendar size={18} color={colors.primary} />
            </View>

            <Text className="font-raleway-bold text-[14px] text-[#111827]">
              Change Schedule
            </Text>
          </View>

          <ChevronRight size={18} color={colors.muted} />
        </Pressable>

        <View className="mt-6">
          {subscriptionError && (
            <Text className="mb-3 text-center font-raleway-semibold text-[13px] text-[#B91C1C]">
              {subscriptionError}
            </Text>
          )}
          {subscription.status === 'Active' ||
          subscription.status === 'Paused' ? (
            <Pressable
              className="items-center py-3.5"
              onPress={() => router.push('/subscription/cancel')}
            >
              <Text className="font-raleway-bold text-[14px] text-[#EF4444] underline">
                Cancel Subscription
              </Text>
            </Pressable>
          ) : (
            <Text className="text-center font-raleway-medium text-[13px] text-[#64748B]">This subscription is cancelled.</Text>
          )}
          {subscription.status === 'Paused' && (
            <PrimaryButton
              label={subscriptionIsUpdating ? 'Resuming...' : 'Resume Subscription'}
              disabled={subscriptionIsUpdating}
              onPress={async () => {
                try {
                  await resumeSubscription(subscription.id).unwrap();
                } catch {
                  // The error state above keeps the failed operation visible.
                }
              }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

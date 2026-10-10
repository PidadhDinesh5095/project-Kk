
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Repeat, X } from 'lucide-react-native';
import {
  colors,
  PrimaryButton,
  StatusPill,
} from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { formatDate } from '@/lib/cutoff';
import { Product } from '@/types/fresh';
import { SubscriptionSkeleton } from '@/components/SubscriptionSkeleton';

const reasons = [
  'No longer need it',
  'Too expensive',
  'Quality issues',
  'Moving to a new address',
  'Trying a different service',
  'Other',
];

export default function CancelSubscriptionScreen() {
  const {
    subscription,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    fetchSubscriptions,
    cancelSubscription,
    subscriptionIsUpdating,
    subscriptionError,
    products,
  } = useFreshStore();

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptions, subscriptionHasLoaded, subscriptionIsLoading]),
  );

  const [selected, setSelected] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (subscriptionIsLoading || !subscriptionHasLoaded) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-4">
        <Text className="mb-4 text-[22px] font-bold text-[#111827]">Cancel Subscription</Text>
        <SubscriptionSkeleton variant="pause" />
      </View>
    );
  }

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F9FC] px-6">
        <Text className="text-[16px] font-bold text-[#111827]">Subscription not found</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="font-bold text-[#023E8A]">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const product = products.find(
    (productItem: Product) => productItem.id === subscription.productId
  );
  const nextDeliveryDate = subscription.nextDeliveryDate ?? subscription.startDate ?? new Date().toISOString();

  return (
    <View className="flex-1 bg-[#F7F9FC]">

      {/* Back Button */}
      <Pressable
        className="ml-4 mt-2"
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text className="text-[38px] leading-[30px] text-[#111827]">
          <ArrowLeft size={28} color="#111827" />
        </Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
        {/* Title */}
        <Text className="mt-2 mb-4 text-[22px] font-bold text-[#111827]">
          Cancel Subscription
        </Text>

        {/* Subscription Card */}
        <View className="rounded-[16px] border border-[#E2E8F0] bg-white p-[14px]">

          {/* Card Top */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1 rounded-[10px] bg-[#023E8A] px-2 py-1">
              <Repeat size={12} color="#fff" />

              <Text className="text-[10px] font-bold text-white">
                Subscription
              </Text>
            </View>

            <StatusPill label={subscription.status} />
          </View>

          {/* Product */}
          <Text className="mt-[10px] text-[18px] font-bold text-[#111827]">
            {product?.name ?? subscription.productName ?? 'Product'}
          </Text>

          <Text className="mt-[3px] text-[13px] text-[#64748B]">
            {subscription.planTier} · {subscription.frequency} ·{' '}
            {subscription.timeSlot}
          </Text>

          <Text className="mt-2 text-[12px] font-bold text-[#023E8A]">
            Next delivery: {formatDate(nextDeliveryDate)}
          </Text>
        </View>

        {/* Warning */}
        <View className="mt-4 flex-row items-center gap-3 rounded-[14px] bg-[#FEE2E2] p-[14px]">

          <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
            <X size={20} color={colors.red} />
          </View>

          <View className="flex-1">
            <Text className="text-[14px] font-bold text-[#991B1B]">
              Are you sure?
            </Text>

            <Text className="mt-[2px] text-[12px] leading-[18px] text-[#991B1B]">
              Cancelling will stop all future deliveries. You can
              resubscribe anytime.
            </Text>
          </View>
        </View>

        {/* Cancellation Reason */}
        <Text className="mt-6 mb-[10px] text-[15px] font-bold text-[#111827]">
          Tell us why you're cancelling
        </Text>

        {reasons.map((r) => {
          const active = selected === r;

          return (
            <Pressable
              key={r}
              onPress={() => setSelected(r)}
              className={`mb-2 min-h-[50px] flex-row items-center justify-between rounded-[14px] border bg-white p-[14px] ${
                active
                  ? 'border-[#023E8A] bg-[#F5F8FF]'
                  : 'border-[#E2E8F0]'
              }`}
            >
              <Text className="text-[14px] font-bold text-[#111827]">
                {r}
              </Text>

              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                  active
                    ? 'border-[#023E8A]'
                    : 'border-[#E2E8F0]'
                }`}
              >
                {active && (
                  <View className="mt-[3px] h-[10px] w-[10px] self-center rounded-full bg-[#023E8A]" />
                )}
              </View>
            </Pressable>
          );
        })}

        {/* Special Offer */}
        <View className="mt-5 rounded-[14px] bg-[#DCFCE7] p-4">

          <Text className="text-[14px] font-bold text-[#15803D]">
            Wait! Here's a special offer
          </Text>

          <Text className="mt-[6px] text-[12px] leading-[18px] text-[#15803D]">
            Get 20% off your next 3 deliveries if you continue your
            subscription.
          </Text>

          <Pressable className="mt-3 items-center rounded-xl bg-[#15803D] py-3">
            <Text className="text-[13px] font-bold text-white">
              Apply 20% Off & Continue
            </Text>
          </Pressable>
        </View>

        {/* Cancel Subscription */}
        <View className="mt-7 items-center">
          <Pressable
            disabled={subscriptionIsUpdating}
            onPress={async () => {
              try {
                await cancelSubscription(subscription.id).unwrap();
                setShowSuccess(true);
              } catch {
                // Keep the screen open so the user can retry after the API error.
              }
            }}
          >
            <Text className="text-[14px] font-bold text-[#EF4444] underline">
              {subscriptionIsUpdating ? 'Cancelling...' : 'Yes, Cancel Subscription'}
            </Text>
          </Pressable>
          {subscriptionError && (
            <Text className="mt-3 text-center text-[13px] text-[#B91C1C]">
              {subscriptionError}
            </Text>
          )}
        </View>

        {/* Keep Subscription */}
        <View className="mt-5">
          <PrimaryButton
            label="Keep My Subscription"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-10">

          <View className="w-full items-center rounded-[20px] bg-white p-7">

            {/* Icon */}
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#EF4444]">
              <X size={28} color="#fff" />
            </View>

            {/* Title */}
            <Text className="text-[18px] font-bold text-[#111827]">
              Subscription Cancelled
            </Text>

            {/* Body */}
            <Text className="mt-2 text-center text-[14px] leading-5 text-[#64748B]">
              Your subscription has been cancelled. No further
              deliveries will be made. You can resubscribe anytime.
            </Text>

            {/* Back Home */}
            <Pressable
              className="mt-5 w-full items-center rounded-[14px] bg-[#023E8A] px-8 py-[14px]"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)');
              }}
            >
              <Text className="text-[15px] font-bold text-white">
                Back to Home
              </Text>
            </Pressable>

          </View>
        </View>
      </Modal>
    </View>
  );
}

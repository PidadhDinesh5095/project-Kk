
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
import { ArrowLeft, Pause, Repeat } from 'lucide-react-native';
import {
  PrimaryButton,
  StatusPill,
} from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { Product } from '@/types/fresh';
import { SubscriptionSkeleton } from '@/components/SubscriptionSkeleton';

export default function PauseSubscriptionScreen() {
  const {
    subscription,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    fetchSubscriptions,
    pauseSubscription,
    subscriptionIsUpdating,
    subscriptionError,
    products,
  } = useFreshStore();

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptions, subscriptionHasLoaded, subscriptionIsLoading]),
  );

  const [showSuccess, setShowSuccess] = useState(false);

  if (subscriptionIsLoading || !subscriptionHasLoaded) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-4">
        <Text className="mb-4 text-[22px] font-bold text-[#111827]">Pause Subscription</Text>
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

  return (
    <View className="flex-1 bg-[#F7F9FC]">
      <Pressable
        className="ml-4 mt-2"
        onPress={() => router.back()}
        hitSlop={12}
      >
        <Text className="text-[32px] leading-[30px] text-[#111827]">
          <ArrowLeft size={28} color="#111827" />
        </Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
        <Text className="mt-2 mb-4 text-[22px] font-bold text-[#111827]">
          Pause Subscription
        </Text>

        <View className="rounded-[16px] border border-[#E2E8F0] bg-white p-[14px]">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1 rounded-[10px] bg-[#023E8A] px-2 py-1">
              <Repeat size={12} color="#fff" />

              <Text className="text-[10px] font-bold text-white">
                Subscription
              </Text>
            </View>

            <StatusPill label={subscription.status} />
          </View>

          <Text className="mt-[10px] text-[18px] font-bold text-[#111827]">
            {product?.name ?? subscription.productName ?? 'Product'}
          </Text>

          <Text className="mt-[3px] text-[13px] text-[#64748B]">
            {subscription.planTier} · {subscription.frequency} ·{' '}
            {subscription.timeSlot}
          </Text>
        </View>

        <View className="mt-6 rounded-[14px] bg-[#FEF3C7] p-[14px]">
          <Text className="text-[13px] font-bold text-[#92400E]">
            Subscription pause
          </Text>

          <Text className="mt-2 text-[12px] leading-5 text-[#92400E]">
            Your active product subscription will be paused. No new orders are generated while it is paused, and you can resume it at any time.
          </Text>
        </View>

        <View className="mt-7">
          <PrimaryButton
            label={subscriptionIsUpdating ? 'Pausing...' : 'Pause Subscription'}
            disabled={subscriptionIsUpdating}
            onPress={async () => {
              try {
                await pauseSubscription(subscription.id).unwrap();
                setShowSuccess(true);
              } catch {
                // The API error is rendered below so the user can retry.
              }
            }}
          />
          {subscriptionError && (
            <Text className="mt-3 text-center text-[13px] text-[#B91C1C]">
              {subscriptionError}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-10">
          <View className="w-full items-center rounded-[20px] bg-white p-7">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B]">
              <Pause size={28} color="#fff" />
            </View>

            <Text className="text-[18px] font-bold text-[#111827]">
              Subscription Paused
            </Text>

            <Text className="mt-2 text-center text-[14px] leading-5 text-[#64748B]">
              Your product subscription is paused. New deliveries stay on hold until you resume it.
            </Text>

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

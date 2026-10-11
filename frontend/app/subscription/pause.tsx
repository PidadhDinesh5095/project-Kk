
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Pause, Play, Repeat } from 'lucide-react-native';
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
    subscriptions,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    fetchSubscriptions,
    fetchSubscriptionById,
    pauseSubscription,
    resumeSubscription,
    subscriptionIsUpdating,
    subscriptionError,
    products,
  } = useFreshStore();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const currentSubscription = routeId ? subscriptions.find((item) => item.id === routeId) ?? subscription : subscription;

  useFocusEffect(
    useCallback(() => {
      if (routeId) {
        const exists = subscriptions.some((item) => item.id === routeId);
        if (!exists && !subscriptionIsLoading) void fetchSubscriptionById(routeId);
        return;
      }

      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptionById, fetchSubscriptions, routeId, subscriptionHasLoaded, subscriptionIsLoading, subscriptions]),
  );

  const activeSubscription = currentSubscription ?? subscription;

  const [showSuccess, setShowSuccess] = useState(false);
  const [completedAction, setCompletedAction] = useState<'pause' | 'resume' | null>(null);
  const isPaused = activeSubscription?.status === 'Paused';

  if ((routeId && !activeSubscription && (subscriptionIsLoading || !subscriptionHasLoaded)) || (!routeId && (subscriptionIsLoading || !subscriptionHasLoaded))) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-4">
        <Text className="mb-4 text-[22px] font-bold text-[#111827]">Pause Subscription</Text>
        <SubscriptionSkeleton variant="pause" />
      </View>
    );
  }

  if (!activeSubscription) {
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
    (productItem: Product) => productItem.id === activeSubscription.productId
  );
  const productImage = activeSubscription.productImage ?? product?.mainImgNobg ?? product?.images?.find(Boolean);
  const deliverySlots = (activeSubscription.dailySlots ?? [])
    .map((slot) => slot === 'MORNING' ? 'Morning' : 'Evening')
    .join(' + ') || activeSubscription.timeSlot || 'Morning';

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 mb-4 mt-2 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">
          {isPaused ? 'Resume Subscription' : 'Pause Subscription'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
       

        <View className="rounded-[16px] border border-[#E2E8F0] bg-white p-3">
          <View className="flex-row items-center ml-2 gap-6">
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={{ width: 68, height: 68, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ width: 68, height: 68, borderRadius: 10 }}
                className="items-center justify-center"
              >
                <Repeat size={24} color="#023E8A" />
              </View>
            )}
            <View className="min-w-0 flex-1 justify-center">
              <Text numberOfLines={1} className="font-raleway-bold text-[18px] text-[#111827]">
                {product?.name ?? activeSubscription.productName ?? 'Product'}
              </Text>
              <Text className="mt-1 font-raleway-semibold text-[13px] text-[#64748B]">
                {[activeSubscription.planTier, activeSubscription.frequency].filter(Boolean).join(' · ')}
              </Text>
              <Text className="mt-1 font-raleway-medium text-[13px] text-[#64748B]">
                {deliverySlots} delivery
              </Text>
            </View>
            <StatusPill label={activeSubscription.status} />
          </View>
        </View>

        <View className={`mt-6 rounded-[14px] p-[14px] ${isPaused ? 'bg-[#FFF7ED]' : 'bg-[#FEF3C7]'}`}>
          <Text className={`text-[15px] font-raleway-bold ${isPaused ? 'text-[#B45309]' : 'text-[#92400E]'}`}>
            {isPaused ? 'Subscription paused' : 'Pause subscription'}
          </Text>

          <Text className={`mt-2 text-[13px] font-raleway-semibold leading-5 ${isPaused ? 'text-[#B45309]' : 'text-[#92400E]'}`}>
            {isPaused
              ? 'Resume this subscription to continue its delivery schedule.'
              : 'Pausing stops future scheduled deliveries. You can resume the subscription at any time.'}
          </Text>
        </View>

        <View className="mt-7">
          <PrimaryButton
            label={subscriptionIsUpdating
              ? isPaused ? 'Resuming...' : 'Pausing...'
              : isPaused ? 'Resume Subscription' : 'Pause Subscription'}
            disabled={subscriptionIsUpdating}
            onPress={async () => {
              try {
                if (isPaused) {
                  await resumeSubscription(activeSubscription.id).unwrap();
                  setCompletedAction('resume');
                } else {
                  await pauseSubscription(activeSubscription.id).unwrap();
                  setCompletedAction('pause');
                }
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
            <View className={`mb-4 h-14 w-14 items-center justify-center rounded-full ${completedAction === 'resume' ? 'bg-[#023E8A]' : 'bg-[#F59E0B]'}`}>
              {completedAction === 'resume'
                ? <Play size={28} color="#fff" />
                : <Pause size={28} color="#fff" />}
            </View>

            <Text className="text-[20px] font-raleway-bold text-[#111827]">
              {completedAction === 'resume' ? 'Subscription Resumed' : 'Subscription Paused'}
            </Text>

            <Text className="mt-2 text-center font-raleway-semibold text-[15px] leading-5 text-[#64748B]">
              {completedAction === 'resume'
                ? 'Your delivery schedule is active again.'
                : 'New deliveries stay on hold until you resume the subscription.'}
            </Text>

            <Pressable
              className="mt-5 h-[55px] w-full items-center justify-center rounded-full bg-[#023E8A] px-8 py-[14px]"
              onPress={() => {
                setShowSuccess(false);
                router.back();
              }}
            >
              <Text className="text-[18px] font-raleway-bold text-white">
                Back to Subscription
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

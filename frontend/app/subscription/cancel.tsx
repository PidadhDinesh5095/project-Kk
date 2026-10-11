
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Repeat, X } from 'lucide-react-native';
import {
  colors,
  PrimaryButton,
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
    subscriptions,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    fetchSubscriptions,
    fetchSubscriptionById,
    cancelSubscription,
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

  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const maxOtherChars = 120;
  const otherReason = selected === 'Other' ? customReason.trim() : '';
  const cancelReason = selected === 'Other' ? otherReason : selected ?? '';
  const isOtherReasonValid = selected !== 'Other' || otherReason.length > 0;
  const isOtherReasonWithinLimit = selected !== 'Other' || otherReason.length <= maxOtherChars;

  useEffect(() => {
    if (!showSuccess) return;

    const timer = setTimeout(() => {
      setShowSuccess(false);
      router.back();
    }, 2000);

    return () => clearTimeout(timer);
  }, [showSuccess]);

  if ((routeId && !activeSubscription && (subscriptionIsLoading || !subscriptionHasLoaded)) || (!routeId && (subscriptionIsLoading || !subscriptionHasLoaded))) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-4">
        <Text className="mb-4 text-[22px] font-bold text-[#111827]">Cancel Subscription</Text>
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
  const nextDeliveryDate = activeSubscription.nextDeliveryDate ?? activeSubscription.startDate ?? new Date().toISOString();
  const productImage = activeSubscription.productImage ?? product?.mainImgNobg ?? product?.images?.find(Boolean);
  const isCancelDisabled = !selected || !isOtherReasonValid || !isOtherReasonWithinLimit || subscriptionIsUpdating;

  return (
    <View className="flex-1 bg-white">

      {/* Back Button */}
      <View className="mb-4 mt-2 flex-row items-center px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">
          Cancel Subscription
        </Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >

        {/* Product Card */}
        <View className="rounded-[16px] border border-[#E2E8F0] bg-white p-2 pl-4">
          <View className="flex-row items-center gap-5">
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={{ width: 68, height: 68, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ width: 68, height: 68, borderRadius: 10 }}
                className="items-center justify-center bg-[#EEF3FF]"
              >
                <Repeat size={28} color={colors.primary} />
              </View>
            )}

            <View className="min-w-0 flex-1 justify-around" style={{ height: 68 }}>
              <Text numberOfLines={1} className="font-raleway-bold text-[18px] text-[#111827]">
                {product?.name ?? activeSubscription.productName ?? 'Product'}
              </Text>
              <Text numberOfLines={1} className="font-raleway-semibold text-[13px] text-[#023E8A]">
                {product?.size ? `${product.size}` : activeSubscription.planTier || 'Standard Plan'}
              </Text>
              <Text numberOfLines={1} className="font-raleway-semibold text-[13px] text-[#023E8A]">
                {activeSubscription.frequency ? `${activeSubscription.frequency} Plan` : 'Subscription'}
              </Text>
            </View>
          </View>

          
        </View>

        {/* Warning */}
        <View className="mt-4 flex-row items-center gap-3 rounded-[14px] bg-[#FEE2E2] p-[14px]">

          <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
            <X size={20} color={colors.red} />
          </View>

          <View className="flex-1">
            <Text className="font-raleway-bold text-[14px] text-[#991B1B]">
              Are you sure?
            </Text>

            <Text className="mt-[2px] text-[12px] font-raleway-semibold leading-[18px] text-[#991B1B]">
              Cancelling will stop all future deliveries . 
            </Text>
          </View>
        </View>

        {/* Cancellation Reason */}
        <Text className="mb-[10px] mt-6 font-raleway-bold text-[15px] text-[#111827]">
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
              <Text className="font-raleway-bold text-[14px] text-[#111827]">
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
                  <View className="h-[10px] w-[10px] rounded-full bg-[#023E8A]" />
                )}
              </View>
            </Pressable>
          );
        })}

        {selected === 'Other' && (
          <View className="mt-3 rounded-[14px] border border-[#E2E8F0] bg-white p-3">
            <Text className="mb-2 font-raleway-semibold text-[12px] text-[#64748B]">
              Add your reason (max {maxOtherChars} characters)
            </Text>
            <TextInput
              value={customReason}
              onChangeText={(text) => {
                if (text.length <= maxOtherChars) {
                  setCustomReason(text);
                }
              }}
              placeholder="Tell us more..."
              multiline
              maxLength={maxOtherChars}
              textAlignVertical="top"
              className="min-h-[90px] rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-raleway-medium text-[14px] text-[#111827]"
              placeholderTextColor="#94A3B8"
            />
            <Text className="mt-2 text-right text-[11px] text-[#64748B]">
              {customReason.length}/{maxOtherChars}
            </Text>
          </View>
        )}

        {!isOtherReasonWithinLimit && selected === 'Other' && (
          <Text className="mt-2 text-[12px] text-[#B91C1C]">
            Please keep your custom reason under {maxOtherChars} characters.
          </Text>
        )}

        {/* Cancel Subscription */}
        <View className="mt-7 items-center">
          <Pressable
            disabled={isCancelDisabled}
            onPress={async () => {
              if (!selected) return;
              if (selected === 'Other' && (!customReason.trim() || !isOtherReasonWithinLimit)) return;

              try {
                await cancelSubscription(activeSubscription.id, cancelReason).unwrap();
                setShowSuccess(true);
              } catch {
                // Keep the screen open so the user can retry after the API error.
              }
            }}
          >
            <Text className={`font-raleway-bold text-[14px] underline ${isCancelDisabled ? 'text-[#94A3B8]' : 'text-[#EF4444]'}`}>
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
            <Text className="text-[20px] font-raleway-bold text-[#111827]">
              Subscription Cancelled
            </Text>

            {/* Body */}
            <Text className="mt-2 text-center font-raleway-semibold text-[15px] leading-5 text-[#64748B]">
              Your subscription has been cancelled. No further
              deliveries will be made. You can resubscribe anytime.
            </Text>

            <Text className="mt-4 text-center text-[13px] font-raleway-medium text-[#64748B]">
              Returning to the previous screen...
            </Text>

          </View>
        </View>
      </Modal>
    </View>
  );
}

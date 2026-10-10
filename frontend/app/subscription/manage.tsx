
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Check, Clock, Repeat } from 'lucide-react-native';
import {
  colors,
  PrimaryButton,
  StatusPill,
} from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { formatDate } from '@/lib/cutoff';

const frequencies = [
  'Daily',
  'Alternate Days',
  'Weekly',
  'Custom',
];

const slots = ['Morning', 'Evening'];
const plans = ['Starter', 'Family', 'Bulk'];

export default function ManageSubscriptionScreen() {
  const {
    subscription,
    updateSubscription,
    products,
  } = useFreshStore();

  const product = products.find(
    (p) => p.id === subscription.productId
  )!;

  const [plan, setPlan] = useState(subscription.planTier);
  const [freq, setFreq] = useState(subscription.frequency);
  const [slot, setSlot] = useState(subscription.timeSlot);
  const [showSuccess, setShowSuccess] = useState(false);

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
          Change Schedule
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
            {product.name}
          </Text>

          <Text className="mt-[3px] text-[13px] text-[#64748B]">
            {subscription.planTier} ·{' '}
            {subscription.quantityPerDelivery} × {product.size}
          </Text>
        </View>

        {/* Plan Tier */}
        <Text className="mt-6 mb-[10px] text-[15px] font-bold text-[#111827]">
          Plan Tier
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {plans.map((p) => {
            const active = plan === p;

            return (
              <Pressable
                key={p}
                onPress={() => setPlan(p as typeof plan)}
                className={`h-10 justify-center rounded-[14px] border px-4 ${
                  active
                    ? 'border-[#023E8A] bg-[#023E8A]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] font-bold leading-4 ${
                    active
                      ? 'text-white'
                      : 'text-[#111827]'
                  }`}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Delivery Frequency */}
        <Text className="mt-6 mb-[10px] text-[15px] font-bold text-[#111827]">
          Delivery Frequency
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {frequencies.map((f) => {
            const active = freq === f;

            return (
              <Pressable
                key={f}
                onPress={() => setFreq(f as typeof freq)}
                className={`h-10 justify-center rounded-[14px] border px-4 ${
                  active
                    ? 'border-[#023E8A] bg-[#023E8A]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] font-bold leading-4 ${
                    active
                      ? 'text-white'
                      : 'text-[#111827]'
                  }`}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Preferred Time Slot */}
        <Text className="mt-6 mb-[10px] text-[15px] font-bold text-[#111827]">
          Preferred Time Slot
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {slots.map((sl) => {
            const active = slot === sl;

            return (
              <Pressable
                key={sl}
                onPress={() => setSlot(sl as typeof slot)}
                className={`h-10 justify-center rounded-[14px] border px-4 ${
                  active
                    ? 'border-[#023E8A] bg-[#023E8A]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] font-bold leading-4 ${
                    active
                      ? 'text-white'
                      : 'text-[#111827]'
                  }`}
                >
                  {sl}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Cutoff Banner */}
        <View className="mt-6 flex-row items-center gap-2 rounded-xl bg-[#EEF3FF] p-3">
          <Clock size={14} color={colors.primary} />

          <Text className="flex-1 text-[12px] font-bold text-[#023E8A]">
            Changes apply from the next active delivery update at 10:00 PM
          </Text>
        </View>

        {/* Save Button */}
        <View className="mt-7">
          <PrimaryButton
            label="Save Changes"
            onPress={() => {
              updateSubscription({
                planTier: plan,
                frequency: freq,
                timeSlot: slot,
              });

              setShowSuccess(true);
            }}
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

            {/* Success Icon */}
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]">
              <Check size={28} color="#fff" />
            </View>

            {/* Title */}
            <Text className="text-[18px] font-bold text-[#111827]">
              Changes Saved!
            </Text>

            {/* Body */}
            <Text className="mt-2 text-center text-[14px] leading-5 text-[#64748B]">
              Your subscription schedule has been updated. The next active update will happen at 10:00 PM.
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

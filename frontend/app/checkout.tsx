
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Check, MapPin } from 'lucide-react-native';
import { colors, PrimaryButton } from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { formatDate } from '@/lib/cutoff';

export default function CheckoutScreen() {
  const { addresses, walletBalance, products } = useFreshStore();
  const serviceableAddresses = addresses.filter((address) => address.isServiceable);
  const deliveryAddress = serviceableAddresses.find((address) => address.isDefault) ?? serviceableAddresses[0];
  const item = products[0];
  const qty = 1;
  const itemTotal = item.price * qty;
  const deliveryFee = 0;
  const total = itemTotal + deliveryFee;
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePlaceOrder = () => {
    if (!deliveryAddress?.isServiceable) return;
    setShowSuccess(true);
  };

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
        <Text className="mb-4 mt-2 text-[22px] font-bold text-[#111827]">
          Checkout
        </Text>

        <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#111827]">
          Delivery Address
        </Text>

        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-[14px]">
          <View className="flex-row items-center gap-3">
            <MapPin size={16} color={colors.primary} />

            <View className="flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">
                {deliveryAddress?.label ?? (addresses.length ? 'No serviceable address saved' : 'No delivery address saved')}
              </Text>

              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                {[deliveryAddress?.line1, deliveryAddress?.city, deliveryAddress?.pincode].filter(Boolean).join(', ')}
              </Text>
              {!deliveryAddress && addresses.length > 0 ? (
                <Text className="mt-1 text-[12px] font-semibold text-[#B91C1C]">
                  Add an address within a delivery area to place your order.
                </Text>
              ) : null}

              {deliveryAddress?.recipientName ? (
                <Text className="mt-2.5 text-[12px] font-bold text-[#023E8A]">
                  For: {deliveryAddress.recipientName} ·{' '}
                  {deliveryAddress.recipientPhone}
                </Text>
              ) : null}
            </View>

            <Pressable onPress={() => router.push('/addresses')}>
              <Text className="text-[12px] font-bold text-[#023E8A]">
                Change
              </Text>
            </Pressable>
          </View>

          {deliveryAddress?.deliveryInstructions ? (
            <Text className="mt-2.5 text-[12px] font-bold text-[#023E8A]">
              Instructions: {deliveryAddress.deliveryInstructions}
            </Text>
          ) : null}
        </View>

        <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#111827]">
          Order Items
        </Text>

        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-[14px]">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-[10px] bg-[#E8EDF5]">
              <Text className="text-[9px] font-bold text-[#94A3B8]">
                {item.imageLabel}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[14px] font-bold text-[#111827]">
                {item.name}
              </Text>

              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                {item.size} · Qty {qty}
              </Text>
            </View>

            <Text className="text-[14px] font-bold text-[#111827]">
              ₹{itemTotal}
            </Text>
          </View>
        </View>

        <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#111827]">
          Delivery Slot
        </Text>

        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-[14px]">
          <Text className="text-[14px] font-bold text-[#111827]">
            Morning · 6-8 AM · {formatDate(item.nextDeliveryDate)}
          </Text>
        </View>

        <Text className="mb-2.5 mt-5 text-[15px] font-bold text-[#111827]">
          Payment Summary
        </Text>

        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-[14px]">
          <View className="flex-row justify-between py-1.5">
            <Text className="text-[14px] text-[#64748B]">
              Item total
            </Text>

            <Text className="text-[14px] font-bold text-[#111827]">
              ₹{itemTotal}
            </Text>
          </View>

          <View className="flex-row justify-between py-1.5">
            <Text className="text-[14px] text-[#64748B]">
              Delivery fee
            </Text>

            <Text className="text-[14px] font-bold text-[#111827]">
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>

          <View className="flex-row justify-between py-1.5">
            <Text className="text-[14px] text-[#64748B]">
              Wallet balance
            </Text>

            <Text className="text-[14px] font-bold text-[#111827]">
              ₹{walletBalance.toFixed(2)}
            </Text>
          </View>

          <View className="my-1.5 h-px bg-[#F1F5F9]" />

          <View className="flex-row justify-between py-1.5">
            <Text className="text-[15px] font-bold text-[#111827]">
              Total
            </Text>

            <Text className="text-[15px] font-bold text-[#111827]">
              ₹{total}
            </Text>
          </View>
        </View>

        <View className="mt-6">
          <PrimaryButton
            label={deliveryAddress ? 'Place Order' : 'Add serviceable address'}
            disabled={!deliveryAddress?.isServiceable}
            onPress={handlePlaceOrder}
          />
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
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#22C55E]">
              <Check size={28} color="#fff" />
            </View>

            <Text className="text-[18px] font-bold text-[#111827]">
              Order Placed!
            </Text>

            <Text className="mt-2 text-center text-[14px] leading-5 text-[#64748B]">
              Your order has been placed successfully. Delivery on{' '}
              {formatDate(item.nextDeliveryDate)} between 6-8 AM.
            </Text>

            <Pressable
              className="mt-5 w-full items-center rounded-[14px] bg-[#023E8A] px-8 py-3.5"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)/orders');
              }}
            >
              <Text className="text-[15px] font-bold text-white">
                Track My Order
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)');
              }}
            >
              <Text className="mt-3.5 text-[14px] font-bold text-[#023E8A]">
                Back to Home
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

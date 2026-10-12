
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import {
  colors,
  PrimaryButton,
  StatusPill,
} from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDate } from '@/lib/cutoff';
import { fetchOrderById } from '@/store/slices/ordersSlice';
import { OrderSkeleton } from '@/components/OrderSkeleton';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const detail = useAppSelector((state) => state.orders.detail);
  const isLoading = useAppSelector((state) => state.orders.detailIsLoading);
  const error = useAppSelector((state) => state.orders.detailError);
  const order = detail?.id === id ? detail : null;

  useEffect(() => {
    if (id) void dispatch(fetchOrderById(id));
  }, [dispatch, id]);

  if (!order && (isLoading || !error)) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-8">
        <OrderSkeleton variant="detail" />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F9FC] px-6">
        <Text className="text-center font-bold text-[#B91C1C]">{error ?? 'Order not found'}</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="font-bold text-[#023E8A]">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">

      {/* Back Button */}
      <View className="mb-4 mt-2 flex-row items-center justify-around px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="text-[22px] ml-4 font-bold text-[#111827]">
          {order.orderId ?? 'Order'}
        </Text>
        <StatusPill label={order.status} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
        

       

        <View className="rounded-[16px]  bg-neutral-100 p-[10px]">
          {order.items.map((item, i) => (
            <View
              key={i}
              className="flex-row items-center gap-3 "
            >
              {/* Item Thumbnail */}
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri  }} className="h-[65px] w-[65px] rounded-[10px]" resizeMode="cover" />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-[10px] bg-[#E8EDF5]">
                  <Text className="text-[9px] font-bold text-[#64748B]">ITEM</Text>
                </View>
              )}

              {/* Item Details */}
              <View className="flex-1 ml-2">
                <Text className="text-[16px] font-raleway-bold text-[#111827]">
                  {item.name}
                </Text>

                <Text className="mt-[2px] text-[14px] font-raleway-semibold  text-black">
                  {item.quantity} units 
                </Text>
                <Text className="mt-[2px] text-[14px] font-raleway-semibold text-black">
                  {order.deliverySlot ?? 'Delivery'}
                </Text>
              </View>

              {/* Price */}
              <Text className="text-[20px] mr-2 font-bold text-[#111827]">
                ₹{item.price}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <Text className="mt-3 mb-[10px] text-[16px] font-bold text-[#111827]">
          Delivery Address
        </Text>

        <View className="rounded-[16px]  bg-neutral-100 p-[10px]">
          <View className="flex-row items-center gap-[10px]">
            <MapPin size={16} color={colors.primary} />

            <View className="flex-1">
              <Text className="text-[14px] font-raleway-bold text-[#111827]">
                {order.deliveryAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <Text className="mt-3 mb-[10px] text-[16px] font-raleway-bold text-[#111827]">
          Payment Summary
        </Text>

        <View className="rounded-[16px]  bg-neutral-100 p-[10px]">

          {/* Item Total */}
          <View className="flex-row justify-between py-[6px]">
            <Text className="text-[14px] font-raleway-bold text-black">
              Item total
            </Text>

            <Text className="text-[14px] font-bold text-[#111827]">
              ₹{order.itemTotal}
            </Text>
          </View>

          <View className="flex-row justify-between py-[6px]">
            <Text className="text-[14px] font-raleway-bold text-black">
              Payment status
            </Text>
            <Text className="text-right text-[14px] font-raleway-bold text-[#111827]">
              {order.paymentStatus ?? 'Payment recorded'}
            </Text>
          </View>

          {/* Delivery Fee */}
          <View className="flex-row justify-between py-[6px]">
            <Text className="text-[14px] font-raleway-bold text-black">
              Delivery fee
            </Text>

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              {order.deliveryFee === 0
                ? 'FREE'
                : `₹${order.deliveryFee}`}
            </Text>
          </View>

          {/* Wallet Used */}
          {order.walletUsed > 0 && (
            <View className="flex-row justify-between py-[6px]">
              <Text className="text-[14px] font-raleway-bold text-black">
                Wallet used
              </Text>

              <Text className="text-[14px] font-bold text-[#111827]">
                -₹{order.walletUsed}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View className="my-[6px] h-px bg-[#F1F5F9]" />

          {/* Total */}
          <View className="flex-row justify-between py-[6px]">
            <Text className="text-[15px] font-raleway-bold text-[#111827]">
              Total Paid
            </Text>

            <Text className="text-[15px] font-bold text-[#111827]">
              ₹{order.totalPaid}
            </Text>
          </View>
        </View>

        {/* Download Invoice */}
        {order.status === 'Delivered' && (
          <View className="mt-6">
            <PrimaryButton
              label="View Invoice"
              onPress={() =>
                router.push(`/invoice/${order.id}`)
              }
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

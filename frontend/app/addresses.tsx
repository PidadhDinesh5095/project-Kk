
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { colors } from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
} from '@/store/slices/addressesSlice';
import { useFreshStore } from '@/store/useFreshStore';
import { Address } from '@/types/fresh';

export default function AddressesScreen() {
  const { addresses } = useFreshStore();
  const dispatch = useAppDispatch();
  const { isLoading, isDeleting, settingDefaultAddressId, error, hasLoaded } = useAppSelector((state) => state.addresses);
  const skeletonOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!isLoading) {
      skeletonOpacity.setValue(0.45);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [isLoading, skeletonOpacity]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded && !isLoading) dispatch(fetchAddresses());
    }, [dispatch, hasLoaded, isLoading]),
  );

  const openEdit = (address: Address) => {
    router.push({
      pathname: '/address-setup',
      params: {
        addressId: address.id,
        residenceType: address.residenceType ?? 'COMMUNITY_APARTMENT',
        flatNoApartmentFloor: address.flatNoApartmentFloor ?? address.line1,
        blockTower: address.blockTower ?? '',
        pincode: address.pincode,
        landmark: address.landmark ?? '',
        deliveryInstructions: address.deliveryInstructions ?? '',
        fullAddress: address.city || 'Saved location',
        city: address.city,
        latitude: String(address.lat ?? ''),
        longitude: String(address.lng ?? ''),
      },
    });
  };

  const confirmDelete = (address: Address) => {
    Alert.alert('Delete address?', 'This address will be removed from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void dispatch(deleteAddress(address.id));
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F7F9FC]">
      {/* Back */}
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
        {/* Title */}
        <Text className="mb-4 mt-2 text-[22px] font-raleway-semibold text-[#111827]">
          Delivery Addresses
        </Text>
        {isLoading && (
          <Animated.View
            accessibilityLabel="Loading addresses"
            style={{ opacity: skeletonOpacity }}
          >
            {Array.from({ length: 3 }, (_, index) => (
              <View
                key={index}
                className="mb-3 rounded-2xl border border-[#E2E8F0] bg-white p-[14px]"
              >
                <View className="flex-row gap-3">
                  <View className="h-9 w-9 rounded-[10px] bg-[#F1F5F9]" />
                  <View className="flex-1 gap-2">
                    <View className="h-4 w-32 rounded bg-[#F1F5F9]" />
                    <View className="h-3 w-4/5 rounded bg-[#F1F5F9]" />
                    <View className="h-3 w-2/5 rounded bg-[#F1F5F9]" />
                  </View>
                </View>
                <View className="mt-3.5 flex-row gap-2 border-t border-[#F1F5F9] pt-3.5">
                  <View className="h-9 flex-1 rounded-xl bg-[#F8FAFC]" />
                  <View className="h-9 flex-1 rounded-xl bg-[#F8FAFC]" />
                </View>
              </View>
            ))}
          </Animated.View>
        )}
        {!!error && <Text className="mb-3 text-[13px] text-red-600">{error}</Text>}

        {/* Address Cards */}
        {!isLoading && addresses.map((address : Address) => (
          <View
            key={address.id}
            className="mb-3 rounded-2xl border border-[#E2E8F0] bg-white p-[14px]"
          >
            {/* Card Top */}
            <View className="flex-row gap-3">
              {/* Location Icon */}
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#EEF3FF]">
                <MapPin
                  size={16}
                  color={colors.primary}
                />
              </View>

              <View className="flex-1">
                {/* Label */}
                <View className="flex-row items-center gap-2">
                  <Text className="text-[18px] font-raleway-bold text-[#111827]">
                    {address.line1} {address.isDefault && (
                      <View className="rounded-lg bg-[#023E8A] px-1.5 py-0.5">
                        <Text className="text-[12px]  font-bold  text-white">
                          Default
                        </Text>
                      </View>
                    )}
                  </Text>


                </View>

                {/* Address */}
                <Text className="mt-1.5 text-[13px] text-[#64748B]">
                  {address.label}
                </Text>

                {/* City */}
                <Text className="mt-0.5 text-[13px] text-[#64748B]">
                  {address.city ? `${address.city} - ` : ''}{address.pincode}
                </Text>

                {/* Recipient */}
                {address.recipientName ? (
                  <Text className="mt-1.5 text-[12px] font-raleway-semibold text-[#111827]">
                    For: {address.recipientName} ·{' '}
                    {address.recipientPhone}
                  </Text>
                ) : null}

                {/* Instructions */}
                {address.deliveryInstructions ? (
                  <Text className="mt-1.5 text-[12px] font-raleway-semibold text-[#023E8A]">
                    Instructions: {address.deliveryInstructions}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Actions */}
            <View className="mt-3.5 flex-row gap-2 border-t border-[#F1F5F9] pt-3.5">
              {!address.isDefault && (
                <Pressable
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#64748B] py-2.5 ${settingDefaultAddressId !== null ? 'opacity-60' : ''}`}
                  disabled={settingDefaultAddressId !== null}
                  onPress={() => dispatch(setDefaultAddress(address.id))}
                >
                  {settingDefaultAddressId === address.id ? (
                    <>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text className="text-[14px] font-raleway-semibold text-[#475569]">
                        Setting...
                      </Text>
                    </>
                  ) : (
                    <Text className="text-[14px] font-raleway-semibold text-[#475569]">Set default</Text>
                  )}
                </Pressable>
              )}
              {/* Edit */}
              <Pressable
                className="flex-1 h-12 items-center justify-center rounded-full border border-[#023E8A] py-2.5"
                onPress={() => openEdit(address)}
              >
                <Text className="text-[14px] font-raleway-semibold text-[#023E8A]">
                  Edit
                </Text>
              </Pressable>

              {/* Delete */}
              <Pressable
                className="flex-1 h-12 flex-row items-center justify-center gap-1 rounded-full border border-[#EF4444] py-2.5"
                onPress={() => confirmDelete(address)}
                disabled={isDeleting}
              >
                <Trash2
                  size={14}
                  color={
                    isDeleting
                      ? colors.muted
                      : colors.red
                  }
                />

                <Text
                  className={`text-[13px] font-raleway-semibold ${isDeleting
                      ? 'text-[#64748B]'
                      : 'text-[#EF4444]'
                    }`}
                >
                  <Text className="text-[14px] font-raleway-semibold">
                    Delete
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Add Address */}
        {!isLoading && <Pressable
          className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-[#023E8A] p-[18px]"
          onPress={() => router.push('/address-setup')}
        >
          <Plus
            size={18}
            color={colors.primary}
          />

          <Text className="text-[14px] font-bold text-[#023E8A]">
            Add New Address
          </Text>
        </Pressable>}
      </ScrollView>

    </View>
  );
}

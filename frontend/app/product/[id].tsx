
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { ArrowLeft, Check, MapPin, Share2, Calendar } from 'lucide-react-native';
import { PrimaryButton ,TrustBadgeRow } from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAddresses } from '@/store/slices/addressesSlice';
import { placeOneTimeOrder } from '@/store/slices/ordersSlice';
import { fetchProductById } from '@/store/slices/productsSlice';
import { fetchWallet } from '@/store/slices/walletSlice';
import { formatDate } from '@/lib/cutoff';
import { Address, Product } from '@/types/fresh';

function getDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatLiveDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getSlotAvailability(dateKey: string | null, currentDate: Date): {
  Morning: boolean;
  Evening: boolean;
} {
  if (!dateKey) {
    return { Morning: false, Evening: false };
  }

  const todayKey = getDateKey(currentDate);
  const nextDayKey = getDateKey(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));

  if (dateKey === todayKey) {
    return {
      Morning: false,
      Evening: currentDate.getHours() < 12,
    };
  }

  if (dateKey === nextDayKey && currentDate.getHours() >= 22) {
    return {
      Morning: false,
      Evening: true,
    };
  }

  return {
    Morning: true,
    Evening: true,
  };
}

function getDefaultSlots(dateKey: string | null, currentDate: Date): string[] {
  const availability = getSlotAvailability(dateKey, currentDate);

  if (availability.Morning && !availability.Evening) {
    return ['Morning'];
  }

  if (availability.Evening && !availability.Morning) {
    return ['Evening'];
  }

  if (availability.Morning && availability.Evening) {
    return ['Morning'];
  }

  return [];
}

const { width: SCREEN_W } = Dimensions.get('window');

function generateDeliveryDates(currentDate: Date = new Date()): {
  value: string;
  label: string;
  day: string;
  isSelectable: boolean;
}[] {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const isBeforeNoon = currentDate.getHours() < 12;

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);

    const value = getDateKey(date);
    const isSelectable = isBeforeNoon ? offset === 0 : offset > 0;

    return {
      value,
      label: String(date.getDate()),
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      isSelectable,
    };
  });
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const product = useAppSelector((state) => state.products.detailsById[id]);
  const detailStatus = useAppSelector((state) => state.products.detailStatusById[id] ?? 'idle');
  const detailError = useAppSelector((state) => state.products.detailErrorsById[id]);
  const productHasLoaded = useAppSelector((state) => state.products.detailHasLoadedById[id] ?? false);
  const addresses = useAppSelector((state) => state.addresses.items);
  const addressesAreLoading = useAppSelector((state) => state.addresses.isLoading);
  const addressesHaveLoaded = useAppSelector((state) => state.addresses.hasLoaded);
  const addressesError = useAppSelector((state) => state.addresses.error);
  const { isCreating, createError } = useAppSelector((state) => state.orders);
  const walletBalance = useAppSelector((state) => state.wallet.balance);
  const walletIsLoading = useAppSelector((state) => state.wallet.isLoading);

  useEffect(() => {
    if (!productHasLoaded && detailStatus !== 'loading') {
      dispatch(fetchProductById(id));
    }
  }, [detailStatus, dispatch, id, productHasLoaded]);

  const [showBuyOnce, setShowBuyOnce] = useState(false);
  const [liveDate, setLiveDate] = useState(new Date());
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [chosenAddressId, setChosenAddressId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [walletCheckError, setWalletCheckError] = useState('');
  const [checkedWalletBalance, setCheckedWalletBalance] = useState<number | null>(null);
  const [walletShortfall, setWalletShortfall] = useState<number | null>(null);
  const skeletonOpacity = useRef(new Animated.Value(0.45)).current;

  const selectedAddressId = addresses.some((address : Address) => address.id === chosenAddressId)
    ? chosenAddressId
    : addresses.find((address : Address) => address.isDefault)?.id ?? addresses[0]?.id ?? '';

  useEffect(() => {
    const interval = setInterval(() => setLiveDate(new Date()), 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.8,
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

    animation.start();
    return () => animation.stop();
  }, [skeletonOpacity]);

  const deliveryDates = useMemo(() => generateDeliveryDates(liveDate), [liveDate]);

  useEffect(() => {
    const defaultDate = deliveryDates.find((date) => date.isSelectable)?.value ?? null;

    const selectedDateStillValid =
      selectedDate && deliveryDates.some((date) => date.value === selectedDate && date.isSelectable);

    if (!selectedDate && defaultDate) {
      setSelectedDate(defaultDate);
    }

    if (selectedDate && !selectedDateStillValid && defaultDate) {
      setSelectedDate(defaultDate);
      setSelectedSlots(getDefaultSlots(defaultDate, liveDate));
      return;
    }

    if (!selectedSlots.length) {
      setSelectedSlots(getDefaultSlots(selectedDate ?? defaultDate, liveDate));
    }
  }, [deliveryDates, liveDate, selectedDate, selectedSlots.length]);

  useEffect(() => {
    if (showBuyOnce && !addressesHaveLoaded && !addressesAreLoading) {
      void dispatch(fetchAddresses());
    }
  }, [addressesAreLoading, addressesHaveLoaded, dispatch, showBuyOnce]);

  const selectedDateInfo = deliveryDates.find((date) => date.value === selectedDate);

  const slotOptions = useMemo(() => {
    return getSlotAvailability(selectedDate, liveDate);
  }, [liveDate, selectedDate]);

  const slotMultiplier = selectedSlots.length === 2 ? 2 : selectedSlots.length === 1 ? 1 : 0;
  const totalAmount = (product?.price ?? 0) * quantity * slotMultiplier;

  const highlightColors = [
    { bg: '#EAF3EA', text: '#023E8A' },
    { bg: '#F3E9DC', text: '#023E8A' },
    { bg: '#EAF1FF', text: '#023E8A' },
    { bg: '#F3E7F7', text: '#023E8A' },
    { bg: '#FFF3D6', text: '#023E8A' },
  ];

  const handleBuyOnceConfirm = async () => {
    const address = addresses.find((item : Address) => item.id === selectedAddressId);
    if (!selectedDate || !address || selectedSlots.length === 0) return;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setWalletCheckError('Unable to verify the order total. Please try again.');
      return;
    }

    setWalletCheckError('');
    setWalletShortfall(null);
    setIsCheckingBalance(true);
    let currentBalance: number;
    try {
      currentBalance = await dispatch(fetchWallet(true)).unwrap();
      setCheckedWalletBalance(currentBalance);
    } catch {
      setWalletCheckError('Unable to check your wallet balance. Please try again.');
      setIsCheckingBalance(false);
      return;
    }
    setIsCheckingBalance(false);

    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      setWalletCheckError('Unable to verify your wallet balance. Please try again.');
      return;
    }

    if (currentBalance < totalAmount) {
      setWalletShortfall(Number((totalAmount - currentBalance).toFixed(2)));
      return;
    }

    try {
      await dispatch(placeOneTimeOrder({
        productId: product.id,
        addressId: address.id,
        quantity,
        deliveryDate: selectedDate,
        slots: selectedSlots.map((slot) => slot === 'Morning' ? 'MORNING' : 'EVENING'),
        productName: product.name,
        productSize: product.size,
        deliveryAddress: [address.line1, address.city, address.pincode].filter(Boolean).join(', '),
      })).unwrap();
      void dispatch(fetchWallet(true));
      setShowBuyOnce(false);
      setShowSuccess(true);
    } catch (error) {
      const orderError = error as { shortfall?: number };
      if (orderError.shortfall && orderError.shortfall > 0) {
        setWalletShortfall(Number(orderError.shortfall.toFixed(2)));
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = Linking.createURL(`/product/${product.id}`);

    try {
      await Share.share({
        message: `Check out ${product.name} on Dinesh Farms: ${shareUrl}`,
        url: shareUrl,
        title: `Share ${product.name}`,
      });
    } catch (error) {
      console.error('Unable to share product:', error);
    }
  };

  if (!product) {
    if (detailStatus === 'failed') {
      return (
        <View className="flex-1 items-center justify-center bg-[#f5f4f1] px-8">
          <Text className="text-center text-[16px] font-raleway-semibold text-[#475569]">
            {detailError ?? 'Unable to load this product'}
          </Text>
          <Pressable
            onPress={() => dispatch(fetchProductById(id))}
            className="mt-5 rounded-full bg-[#023E8A] px-5 py-3"
          >
            <Text className="text-[14px] font-raleway-bold text-white">Try again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="mt-4 p-2">
            <Text className="text-[14px] font-raleway-bold text-[#023E8A]">Go back</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-[#f5f4f1]">
        <Animated.View className="h-[100vw] w-full rounded-b-[12px] bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
        <View className="px-5 pt-6">
          <Animated.View className="h-7 w-3/4 rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="mt-3 h-4 w-1/3 rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="mt-5 h-7 w-1/2 rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="mt-3 h-20 w-full rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="mt-6 h-7 w-2/3 rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="mt-3 h-28 w-full rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
        </View>
        <View className="absolute bottom-0 left-0 right-0 gap-3 border-t border-[#e7e5e2] bg-[#f5f4f1] px-4 pb-4 pt-3">
          <Animated.View className="h-8 w-2/3 rounded bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
          <Animated.View className="h-14 w-full rounded-full bg-[#E2E8F0]" style={{ opacity: skeletonOpacity }} />
        </View>
      </View>
    );
  }

  const detailImages = product.images?.filter(Boolean) ?? [];
  const galleryImages = detailImages.length ? detailImages : product.mainImgNobg ? [product.mainImgNobg] : [];

  return (
    <View className="flex-1 bg-[#f5f4f1]">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {galleryImages.map((image : string, index : number) => (
            <Image
              key={`${image}-${index}`}
              source={{ uri: image }}
              style={{ width: SCREEN_W, height: SCREEN_W, alignSelf: 'center' }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>

        <Pressable
          className="absolute left-5 top-[12px] h-9 w-9 items-center justify-center rounded-full "
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={26} color="#1F2937" />
        </Pressable>

        <Pressable
          className="absolute right-5 top-[12px] h-9 w-9 items-center justify-center rounded-full "
          onPress={handleShare}
          hitSlop={12}
          accessibilityLabel={`Share ${product.name}`}
          android_ripple={{ color: '#CBD5E1' }}
        >
          {({ pressed }) => (
            <Share2 size={24} color={pressed ? '#94A3B8' : '#1F2937'} />
          )}
        </Pressable>

        <View className="mx-4 mt-4 pb-2">
          <Text className="text-[26px] font-raleway-bold tracking-[-0.4px] text-[#141414]">
            {product.name}
          </Text>

          <Text className="mt-1 ml-1 text-[14px] font-bold text-[#4b5563]">
            {product.size}
          </Text>

          <View className="mt-2 flex-row flex-wrap gap-2.5">
            {product.tags.map((tag : string, index : number) => {
              const color = highlightColors[index % highlightColors.length];

              return (
                <View
                  key={tag}
                  className="rounded-[10px] px-3 py-[6px]"
                  style={{ backgroundColor: color.bg }}
                >
                  <Text
                    className="text-[13px] font-raleway-semibold"
                    style={{ color: color.text }}
                  >
                    {tag}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text className="mt-6 text-[20px] font-raleway-bold text-[#111827]">
            Description
          </Text>

          <Text className="mt-3 text-[14px] font-raleway-semibold leading-[24px] text-[#475569]">
            {product.description}
          </Text>

          <Text className="mt-6 text-[20px] font-raleway-bold text-[#111827]">
            Nutritional Benefits
          </Text>

          <View className="mt-4 overflow-hidden rounded-[14px] border border-[#e4dfd6] bg-transparent">
            {(product.nutritionBenefits ?? []).map((item : { label: string; value: string }, index : number, arr : { label: string; value: string }[]) => (
              <View
                key={`${item.label}-${index}`}
                className={
                  index === arr.length - 1
                    ? 'flex-row items-center justify-between px-4 py-4'
                    : 'flex-row items-center justify-between border-b border-[#e4dfd6] px-4 py-4'
                }
              >
                <Text className="text-[14px] font-raleway-bold text-[#1f2937]">
                  {item.label}
                </Text>
                <Text className="text-[14px] font-bold text-[#111827]">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
          <TrustBadgeRow />

         

        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[#e7e5e2] bg-[#f5f4f1] px-4 pb-4 pt-3">
        

        <View className="mb-3 ml-1 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-[30px] font-bold text-[#111827]">
              ₹{product.price}
            </Text>

            <Text className="text-[18px] font-raleway-semibold text-[#64748B] line-through">
              ₹{product.mrp}
            </Text>

            <View className="rounded-[8px] bg-[#DCFCE7] px-2 py-[2px]">
              <Text className="text-[11px] font-raleway-bold text-[#15803D]">
                Save ₹{product.mrp - product.price}
              </Text>
            </View>
          </View>

          <Text className="text-[15px] font-raleway-bold text-[#1f2937]">
            Delivery for {formatLiveDate(liveDate)}
          </Text>
        </View>

        <View className="flex-row gap-3 mb-2">
          <Pressable
            className="flex-1 h-15 items-center justify-center rounded-full border border-[#d8d5d0]   py-3"
            onPress={() => {
              setWalletShortfall(null);
              setWalletCheckError('');
              setShowBuyOnce(true);
            }}
          >
            <Text className="text-[18px] font-raleway-bold text-black ">
              Add
            </Text>
          </Pressable>

          <Pressable
            className="flex-1 h-15 flex-row items-center justify-center gap-2 rounded-full   bg-[#023E8A] py-3"
            onPress={() => router.push(`/subscribe/${product.id}`)}
          >
            <Calendar size={18} color="#ffffff" />
            <Text className="text-[16px] font-raleway-bold text-white">
              Subscribe
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Buy Once Modal */}
      <Modal
        visible={showBuyOnce}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBuyOnce(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView
            className="w-full"
            style={{ maxHeight: '92%', flexGrow: 0 }}
            contentContainerStyle={{ flexGrow: 0 }}
            keyboardShouldPersistTaps="handled"
          >
          <View className="w-full rounded-t-[24px] bg-white p-5 pb-[34px]">
            {/* Handle */}
            <View className="mb-4 h-1 w-10 self-center rounded-[2px] bg-[#E2E8F0]" />

            <Text className="mt-1 text-[18px] font-raleway-bold text-black">
              {product.name} · {product.size} · ₹{product.price}
            </Text>

            <Text className="mb-2.5 mt-4 text-[14px] font-raleway-bold text-[#111827]">
              Confirm delivery address
            </Text>

            {addressesAreLoading ? (
              <ActivityIndicator className="py-4" color="#023E8A" />
            ) : addressesError ? (
              <View className="rounded-[12px] border border-[#FECACA] bg-white p-3">
                <Text className="text-[13px] text-[#B91C1C]">{addressesError}</Text>
                <Pressable className="mt-2 self-start" onPress={() => { void dispatch(fetchAddresses()); }}>
                  <Text className="text-[13px] font-raleway-bold text-[#023E8A]">Retry</Text>
                </Pressable>
              </View>
            ) : addresses.length === 0 ? (
              <View className="rounded-[12px] border border-[#E2E8F0] bg-white p-3">
                <Text className="text-[13px] text-[#64748B]">Add a delivery address to continue.</Text>
                <Pressable className="mt-2 self-start" onPress={() => router.push('/address-setup')}>
                  <Text className="text-[13px] font-raleway-bold text-[#023E8A]">Add address</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-2">
                <ScrollView
                  style={{ maxHeight: 152 }}
                  contentContainerStyle={{ gap: 8 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={addresses.length > 2}
                >
                  {addresses.map((address : Address) => {
                    const isSelected = selectedAddressId === address.id;

                    return (
                      <Pressable
                        key={address.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        className={`min-h-[72px] flex-row items-center gap-3 rounded-[12px] border p-3 ${isSelected ? 'border-[#023E8A] bg-[#EEF3FF]' : 'border-[#E2E8F0] bg-white'}`}
                        onPress={() => setChosenAddressId(address.id)}
                      >
                        <MapPin size={17} color={isSelected ? '#023E8A' : '#64748B'} />
                        <View className="flex-1">
                          <Text numberOfLines={1} className="text-[13px] font-raleway-bold text-[#111827]">
                            {address.line1 || address.label}{address.isDefault ? ' · Default' : ''}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 text-[12px] text-[#64748B]">
                            {[address.city, address.pincode].filter(Boolean).join(', ')}
                          </Text>
                          {address.deliveryInstructions ? (
                            <Text numberOfLines={1} className="mt-0.5 text-[11px] text-[#64748B]">{address.deliveryInstructions}</Text>
                          ) : null}
                        </View>
                        {isSelected ? <Check size={18} color="#023E8A" /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable className="self-start py-1" onPress={() => router.push('/address-setup')}>
                  <Text className="text-[13px] font-raleway-bold text-[#023E8A]">Add another address</Text>
                </Pressable>
              </View>
            )}

            {/* Date */}
            <Text className="mb-2.5 mt-2 text-[14px] font-raleway-bold text-[#111827]">
              Select delivery date
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {deliveryDates.map((dateItem) => {
                const active = selectedDate === dateItem.value;
                const disabled = !dateItem.isSelectable;

                return (
                  <Pressable
                    key={dateItem.value}
                    className={
                      active
                        ? 'h-16 w-[60px] items-center justify-center rounded-[14px] bg-[#023E8A]'
                        : disabled
                          ? 'h-16 w-[60px] items-center justify-center rounded-[14px] bg-[#F3F4F6] opacity-40'
                          : 'h-16 w-[60px] items-center justify-center rounded-[14px] bg-[#F5F7FB]'
                    }
                    disabled={disabled}
                    onPress={() => {
                      if (!disabled) {
                        setSelectedDate(dateItem.value);
                        setSelectedSlots(getDefaultSlots(dateItem.value, liveDate));
                      }
                    }}
                  >
                    <Text
                      className={
                        active
                          ? 'text-[12px] font-raleway-bold text-[#DCE6FF]'
                          : disabled
                            ? 'text-[12px] font-raleway-bold text-[#94A3B8]'
                            : 'text-[12px] font-raleway-bold text-[#64748B]'
                      }
                    >
                      {dateItem.day}
                    </Text>

                    <Text
                      className={
                        active
                          ? 'mt-[3px] text-[18px] font-bold text-white'
                          : disabled
                            ? 'mt-[3px] text-[18px] font-bold text-[#94A3B8]'
                            : 'mt-[3px] text-[18px] font-bold text-[#111827]'
                      }
                    >
                      {dateItem.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Time Slot */}
            <Text className="mb-2.5 mt-5 text-[14px] font-raleway-bold text-[#111827]">
              Preferred time slot
            </Text>

            

            <View className="flex-row flex-wrap gap-2">
              {['Morning', 'Evening'].map((slot) => {
                const isSelected = selectedSlots.includes(slot);
                const disabled = !slotOptions[slot as keyof typeof slotOptions];

                return (
                  <Pressable
                    key={slot}
                    className={
                      isSelected
                        ? 'h-10 flex-row items-center gap-[5px] rounded-[14px] bg-[#023E8A] px-4'
                        : disabled
                          ? 'h-10 flex-row items-center gap-[5px] rounded-[14px] bg-[#F3F4F6] px-4 opacity-40'
                          : 'h-10 flex-row items-center gap-[5px] rounded-[14px] bg-[#F5F7FB] px-4'
                    }
                    disabled={disabled}
                    onPress={() => {
                      if (disabled) {
                        return;
                      }

                      setSelectedSlots((current) => {
                        const next = current.includes(slot)
                          ? current.filter((item) => item !== slot)
                          : [...current, slot];

                        return next;
                      });
                    }}
                  >
                    {isSelected && <Check size={12} color="#fff" />}

                    <Text
                      className={
                        isSelected
                          ? 'text-[13px] font-raleway-bold text-white'
                          : disabled
                            ? 'text-[13px] font-raleway-bold text-[#94A3B8]'
                            : 'text-[13px] font-raleway-bold text-[#111827]'
                      }
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-[14px]  bg-[#F5F7FB] px-3 py-3">
              <Text className="text-[16px] font-raleway-bold p-1 text-[#111827]">Quantity</Text>

              <View className="flex-row items-center gap-3">
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full"
                  onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Text className="text-[22px] font-raleway-bold text-[#111827]">−</Text>
                </Pressable>

                <Text className="min-w-[24px] text-center text-[16px]  text-[#111827]">
                  {quantity}
                </Text>

                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full "
                  onPress={() => setQuantity((current) => Math.min(9, current + 1))}
                >
                  <Text className="text-[22px] font-raleway-bold text-[#111827]">+</Text>
                </Pressable>
              </View>
            </View>

            {/* Summary */}
            <View className="mt-5 flex-row justify-between border-t border-[#F1F5F9] pt-4">
              <View>
                <Text className="text-[11px] font-raleway-bold text-[#64748B]">
                  Item
                </Text>

                <Text className="mt-[2px] text-[13px] font-raleway-bold text-[#111827]">
                  {product.name}
                </Text>
              </View>

              <View>
                <Text className="text-[11px] font-raleway-bold text-[#64748B]">
                  Delivery
                </Text>

                <Text className="mt-[2px] text-[13px] font-raleway-bold text-[#111827]">
                  {selectedDate
                    ? formatDate(selectedDate)
                    : 'Select date'}
                </Text>
              </View>

              <View>
                <Text className="text-[11px] font-raleway-bold text-[#64748B]">
                  Slot
                </Text>

                <Text className="mt-[2px] text-[13px] font-raleway-bold text-[#111827]">
                  {selectedSlots.length
                    ? selectedSlots.join(' + ')
                    : 'Select slot'}
                </Text>
              </View>

              <View>
                <Text className="text-[11px] font-raleway-bold text-[#64748B]">
                  Total
                </Text>

                <Text className="mt-[2px] text-[13px] font-raleway-bold text-[#111827]">
                  ₹{totalAmount}
                </Text>
              </View>
            </View>

            {/* Buttons */}
            {walletShortfall !== null ? (
              <View className="mt-4 rounded-[14px] border border-[#F59E0B] bg-[#FFFBEB] p-3.5">
                <Text className="text-[14px] font-raleway-bold text-[#92400E]">Insufficient wallet balance</Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#78350F]">
                  Order total ₹{totalAmount.toFixed(2)} · Available ₹{(checkedWalletBalance ?? walletBalance).toFixed(2)}. Add ₹{walletShortfall.toFixed(2)} more to place this order.
                </Text>
                <Pressable
                  className="mt-3 min-h-[42px] items-center justify-center rounded-[10px] bg-[#023E8A] px-4"
                  onPress={() => {
                    const amountToAdd = Math.min(5000, Math.max(100, walletShortfall));
                    setShowBuyOnce(false);
                    router.push({
                      pathname: '/(tabs)/wallet',
                      params: { amount: amountToAdd.toFixed(2), needed: walletShortfall.toFixed(2) },
                    });
                  }}
                >
                  <Text className="text-[14px] font-raleway-bold text-white">Add money to wallet</Text>
                </Pressable>
              </View>
            ) : null}
            {walletCheckError ? (
              <Text className="mt-3 text-[13px] font-raleway-semibold text-[#B91C1C]">{walletCheckError}</Text>
            ) : null}
            {createError ? (
              <Text className="mt-3 text-[13px] font-raleway-semibold text-[#B91C1C]">{createError.message}</Text>
            ) : null}
            <View className="mt-5 flex-row gap-2.5">
              <Pressable
                className="justify-center px-4"
                onPress={() => setShowBuyOnce(false)}
              >
                <Text className="text-[14px] font-raleway-bold text-[#64748B] underline">
                  Cancel
                </Text>
              </Pressable>

              <View className="flex-1">
                <PrimaryButton
                  label={isCheckingBalance ? 'Checking wallet…' : isCreating ? 'Placing order…' : 'Confirm Order'}
                  disabled={
                    !selectedAddressId ||
                    addressesAreLoading ||
                    walletIsLoading ||
                    isCheckingBalance ||
                    isCreating ||
                    !selectedDate ||
                    selectedSlots.length === 0 ||
                    !selectedDateInfo?.isSelectable ||
                    selectedSlots.some((slot) => !slotOptions[slot as keyof typeof slotOptions])
                  }
                  onPress={() => { void handleBuyOnceConfirm(); }}
                />
              </View>
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccess(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <View className="w-full max-w-[420px] items-center rounded-[20px] bg-white p-7">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#26964f]">
              <Check size={28} color="#fff" />
            </View>

            <Text className="text-[18px] font-raleway-bold text-[#111827]">
              Order Placed!
            </Text>

            <Text className="mt-2 text-center text-[14px] font-raleway-semibold leading-5 text-[#64748B]">
              Your {product.name} will be delivered on{' '}
              {selectedDate
                ? formatDate(selectedDate)
                : formatDate(product.nextDeliveryDate)}{' '}
              ({selectedSlots.join(' + ')}) in the selected slot.
            </Text>

            <Pressable
              className="mt-5 w-full items-center rounded-full bg-[#023E8A] px-8 py-[14px]"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)/orders');
              }}
            >
              <Text className="text-[15px] font-raleway-bold text-white">
                Track My Order
              </Text>
            </Pressable>

            <Pressable
              className="mt-[14px]"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)');
              }}
            >
              <Text className="text-[14px] font-raleway-bold text-[#023E8A]">
                Back to Home
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}


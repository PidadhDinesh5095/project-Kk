
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Pause,
  Plus,
} from 'lucide-react-native';
import { SectionTitle } from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchHomeBanners } from '@/store/slices/homeBannersSlice';
import { fetchProducts } from '@/store/slices/productsSlice';
import { fetchProfile } from '@/store/slices/profileSlice';
import { fetchAddresses } from '@/store/slices/addressesSlice';
import { fetchOrders } from '@/store/slices/ordersSlice';
import { fetchWallet } from '@/store/slices/walletSlice';
import { useFreshStore } from '@/store/useFreshStore';

const { width: SCREEN_W } = Dimensions.get('window');

const BANNER_H_PADDING = 20;
const BANNER_WIDTH = SCREEN_W - BANNER_H_PADDING * 2;
const BANNER_HEIGHT = BANNER_WIDTH * 1.15;
const AUTO_SCROLL_MS = 5000;

const LOGO_URI = require('@/assets/images/logo_nbg.png');

const fallbackBannerImage = require('@/assets/images/home-1.png');

function getGreeting(date: Date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';

  return 'Good Evening';
}

function formatDisplayDate(date: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Today';
  }

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getLocalDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const { items: homeBanners, status: bannerStatus } = useAppSelector((state) => state.homeBanners);
  const { listStatus: productsStatus, listError: productsError, listHasLoaded: productsHaveLoaded } = useAppSelector((state) => state.products);
  const { hasLoaded: profileHasLoaded, isLoading: profileIsLoading, error: profileError } = useAppSelector((state) => state.profile);
  const { hasLoaded: addressesHaveLoaded, isLoading: addressesAreLoading, error: addressesError } = useAppSelector((state) => state.addresses);
  const { hasLoaded: ordersHaveLoaded, isLoading: ordersAreLoading, error: ordersError } = useAppSelector((state) => state.orders);
  const { hasLoaded: walletHasLoaded, isLoading: walletIsLoading, error: walletError } = useAppSelector((state) => state.wallet);
  const bannerSkeletonOpacity = useRef(new Animated.Value(0.45)).current;
  const isBannerLoading = bannerStatus === 'idle' || bannerStatus === 'loading';
  const displayBanners =
    bannerStatus === 'failed' || homeBanners.length === 0
      ? [{ id: 'fallback', image_url: '', link_url: null }]
      : homeBanners;

  const {
    user,
    addresses,
    profile,
    walletBalance,
    products,
    orders,
  } = useFreshStore();

  const greeting = useMemo(() => getGreeting(), []);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const changeDate = (days: number) => {
    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + days);
      nextDate.setHours(0, 0, 0, 0);
      return nextDate;
    });
  };

  const selectedDateDelivery = useMemo(
    () => orders.find((order) =>
      order.status === 'Upcoming' && order.date.slice(0, 10) === getLocalDateKey(selectedDate)
    ),
    [orders, selectedDate]
  );
  const deliveryItem = selectedDateDelivery?.items[0];

  const isToday = isSameDate(selectedDate, today);

  const bannerScroll = useRef<ScrollView>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIndex = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (bannerStatus === 'idle' || bannerStatus === 'failed') dispatch(fetchHomeBanners());
      if (!productsHaveLoaded && productsStatus !== 'loading') dispatch(fetchProducts());
      if (!profileHasLoaded && !profileIsLoading) dispatch(fetchProfile());
      if (!addressesHaveLoaded && !addressesAreLoading) dispatch(fetchAddresses());
      if (!ordersHaveLoaded && !ordersAreLoading) dispatch(fetchOrders());
      if (!walletHasLoaded && !walletIsLoading && !walletError) dispatch(fetchWallet());
    }, [
      addressesAreLoading,
      addressesHaveLoaded,
      bannerStatus,
      dispatch,
      ordersAreLoading,
      ordersHaveLoaded,
      productsHaveLoaded,
      productsStatus,
      profileHasLoaded,
      profileIsLoading,
      walletHasLoaded,
      walletIsLoading,
    ]),
  );

  useEffect(() => {
    if (!isBannerLoading) {
      bannerSkeletonOpacity.setValue(0.45);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(bannerSkeletonOpacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(bannerSkeletonOpacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [isBannerLoading, bannerSkeletonOpacity]);

  useEffect(() => {
    setActiveBanner(0);
    bannerIndex.current = 0;
    bannerScroll.current?.scrollTo({ x: 0, animated: false });
  }, [displayBanners.length]);

  useEffect(() => {
    if (displayBanners.length < 2) return;

    const interval = setInterval(() => {
      const nextIndex =
        (bannerIndex.current + 1) % displayBanners.length;

      bannerIndex.current = nextIndex;
      setActiveBanner(nextIndex);

      bannerScroll.current?.scrollTo({
        x: nextIndex * SCREEN_W,
        animated: nextIndex !== 0,
      });
    }, AUTO_SCROLL_MS);

    return () => clearInterval(interval);
  }, [displayBanners.length]);

  const handleBannerMomentumEnd = (e: any) => {
    const idx = Math.round(
      e.nativeEvent.contentOffset.x / SCREEN_W
    );

    bannerIndex.current = idx;
    setActiveBanner(idx);
  };

  const safeWalletBalance =
    typeof walletBalance === 'number'
      ? walletBalance
      : Number(walletBalance) || 0;

  return (
    <View className="flex-1 bg-white">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
      >
        <View className="w-full">
          <SafeAreaView edges={['top']} style={{ paddingTop: 0 }}>
            <View className="flex-row items-center justify-between px-5 pb-3">
              <Image
                source={LOGO_URI}
                className="h-11 w-11"
                resizeMode="contain"
              />

              <View className="flex-1 items-center">
                <Text
                  className=" text-[18px] font-raleway-bold text-[#111827]"
                  numberOfLines={1}
                >
                  {greeting}, {profile.details.firstName || user.name}!
                </Text>

                <Text
                  className="mt-[2px] text-[11px] font-raleway-semibold text-[#32323366]"
                  numberOfLines={1}
                >
                  {addresses?.[0]?.line1 ??
                    addresses?.[0]?.city ??
                    ''}
                </Text>
              </View>

              <View className="w-8 items-end pr-2">
                <Pressable
                  onPress={() => router.push('/notifications')}
                  hitSlop={10}
                >
                  <Bell
                    size={25}
                    color="#000000"
                  />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>

          <View className="px-5 pb-5">
            <View className="rounded-[18px] bg-[#EEF3FF] pt-5">
              <View className="mt-3 flex-row items-center justify-between">
                <View className="h-[36px] w-[36px] pl-8 items-center justify-center">
                  <Pressable
                    onPress={() => changeDate(-1)}
                    className="h-[36px] w-[36px] items-center justify-center rounded-full bg-[#023E8A]"
                    hitSlop={8}
                  >
                    <ChevronLeft
                      size={19}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>

                <View className="flex-1 items-center px-3">
                  <Text className="text-[16px] font-raleway-semibold text-[#111827]">
                    {isToday
                      ? 'Today'
                      : formatDisplayDate(selectedDate)}
                  </Text>

                  <Text className="mt-[2px] text-[11px] font-raleway-semibold text-[#94A3B8]">
                    Update by 10:00 PM
                  </Text>
                </View>

                <View className="h-[36px] w-[36px] pr-8 items-center justify-center">
                  <Pressable
                    onPress={() => changeDate(1)}
                    className="h-[36px] w-[36px] items-center justify-center rounded-full bg-[#023E8A]"
                    hitSlop={8}
                  >
                    <ChevronRight
                      size={19}
                      color="#ffffff"
                    />
                  </Pressable>
                </View>
              </View>

              <Text className="mt-4 text-center text-[13px] font-raleway-semibold text-[#94A3B8]">
                {ordersAreLoading
                  ? 'Loading delivery schedule...'
                  : ordersError
                    ? 'Delivery schedule unavailable'
                  : deliveryItem
                    ? `${deliveryItem.name} · ${selectedDateDelivery?.deliverySlot ?? ''}`
                    : 'No Scheduled deliveries'}
              </Text>

              <View className="mt-4 h-[54px] flex-row overflow-hidden border-t border-[#DCE5FF]">
                <Pressable className="flex-1 flex-row items-center justify-center rounded-bl-full bg-[#EEF3FF]">
                  <View className="h-[45%] w-[13%] items-center justify-center">
                    <Pause
                      size={15}
                      color="#023E8A"
                      strokeWidth={2.5}
                    />
                  </View>

                  <Text className="ml-3 text-[17px] font-raleway-semibold text-[#023E8A]">
                    Pause Orders
                  </Text>
                </Pressable>

                <View className="w-[1.5px] bg-[#DCE5FF]" />

                <Pressable
                  className="flex-1 flex-row items-center justify-center rounded-br-full bg-[#EEF3FF]"
                  onPress={() => router.push('/products')}
                >
                  <Plus
                    size={24}
                    color="#111827"
                    strokeWidth={2}
                  />

                  <Text className="ml-3 text-[17px] font-raleway-semibold text-[#111827]">
                    Add Items
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-1">
          {isBannerLoading ? (
            <View style={{ width: SCREEN_W }} className="items-center justify-center px-5">
              <Animated.View
                accessibilityLabel="Loading banners"
                style={{
                  width: BANNER_WIDTH,
                  height: BANNER_HEIGHT,
                  opacity: bannerSkeletonOpacity,
                }}
                className="rounded-[24px] bg-[#E2E8F0]"
              />
            </View>
          ) : (
            <>
              <ScrollView
                ref={bannerScroll}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerMomentumEnd}
                scrollEventThrottle={16}
              >
                {displayBanners.map((banner, i) => (
                  <View
                    key={banner.id}
                    style={{ width: SCREEN_W }}
                    className="items-center justify-center px-5"
                  >
                    <Pressable
                      disabled={!banner.link_url}
                      onPress={() => {
                        if (banner.link_url) void Linking.openURL(banner.link_url);
                      }}
                    >
                      <Image
                        source={banner.image_url ? { uri: banner.image_url } : fallbackBannerImage}
                        style={{
                          width: BANNER_WIDTH,
                          height: BANNER_HEIGHT,
                        }}
                        className="rounded-[24px]"
                      />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>

              <View className="mt-3 flex-row items-center justify-center gap-[6px]">
                {displayBanners.map((banner, i) => (
                  <View
                    key={banner.id}
                    className={
                      i === activeBanner
                        ? 'h-[4px] w-[18px] rounded-full bg-[#023E8A]'
                        : 'h-[4px] w-[8px] rounded-full bg-[#CBD5E1]'
                    }
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View className="bg-white px-5 pt-5">
          <SectionTitle title="Popular Products" />

          <View className="mt-1 flex-row flex-wrap justify-between">
            {productsStatus === 'idle' || productsStatus === 'loading' ? (
              Array.from({ length: 6 }, (_, index) => (
                <View key={index} style={{ width: '48%' }} className="mb-4 rounded-[16px] bg-neutral-100 p-[10px]">
                  <View className="h-[140px] w-full rounded bg-[#E2E8F0]" />
                  <View className="mt-3 ml-2 h-4 w-4/5 rounded bg-[#E2E8F0]" />
                  <View className="mt-3 ml-2 h-4 w-2/5 rounded bg-[#E2E8F0]" />
                </View>
              ))
            ) : productsStatus === 'failed' ? (
              <Pressable
                onPress={() => dispatch(fetchProducts())}
                className="w-full items-center py-8"
              >
                <Text className="text-[14px] font-raleway-semibold text-[#475569]">
                  {productsError ?? 'Unable to load products'}
                </Text>
                <Text className="mt-2 text-[14px] font-raleway-bold text-[#023E8A]">Try again</Text>
              </Pressable>
            ) : products.slice(0, 6).map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/product/${p.id}`)}
                style={{ width: '48%' }}
                className="mb-4 rounded-[16px]  bg-neutral-100 p-[10px]"
              >
                <Image
                  source={p.mainImgNobg ? { uri: p.mainImgNobg } : fallbackBannerImage}
                  className="h-[140px] w-full"
                  resizeMode="contain"
                />

                <Text
                  className="mt-2 ml-2 text-[16px] font-raleway-bold text-[#111827]"
                  numberOfLines={1}
                >
                  {p.name}
                </Text>

                <View className="mt-1 ml-2 flex-row items-center">
                  <Text
                    className="mr-2 text-[14px] text-[#94A3B8]"
                    style={{
                      textDecorationLine: 'line-through',
                    }}
                  >
                    ₹{p.mrp}
                  </Text>

                  <Text className="text-[17px] text-[#023E8A]">
                    ₹{p.price}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable
            className="mt-1 flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
            onPress={() => router.push('/products')}
          >
            <Text className="text-[14px] font-raleway-semibold text-[#023E8A]">
              View all products
            </Text>

            <ChevronRight
              size={16}
              color="#023E8A"
            />
          </Pressable>
        </View>
      </ScrollView>

      
    </View>
  );
}

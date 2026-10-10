
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  MapPin,
  Repeat,
  Wallet,
} from 'lucide-react-native';
import {
  PrimaryButton,
  SectionTitle,
} from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/userSlice';
import { fetchProfile } from '@/store/slices/profileSlice';
import { fetchProducts } from '@/store/slices/productsSlice';
import { fetchSubscriptionCounts } from '@/store/slices/subscriptionSlice';

export default function AccountScreen() {
  const dispatch = useAppDispatch();
  const {
    user,
    profile,
    walletBalance,
    productsStatus,
    productsHasLoaded,
    subscriptionCounts,
    subscriptionCountsHasLoaded,
    subscriptionCountsIsLoading,
  } = useFreshStore();
  const profileName = [profile.details.firstName, profile.details.lastName].filter(Boolean).join(' ') || user.name;

  const {isLoggingOut} = user;

  useFocusEffect(
    useCallback(() => {
      if (!profile.hasLoaded && !profile.isLoading) dispatch(fetchProfile());
      if (!productsHasLoaded && productsStatus !== 'loading') dispatch(fetchProducts());
      if (!subscriptionCountsHasLoaded && !subscriptionCountsIsLoading) dispatch(fetchSubscriptionCounts());
    }, [dispatch, productsHasLoaded, productsStatus, profile.hasLoaded, profile.isLoading, subscriptionCountsHasLoaded, subscriptionCountsIsLoading]),
  );

  const handleLogout = async () => {
    try {
      const result = await dispatch(logout()).unwrap();
      router.replace('/onboarding');

      if (!result.serverLogoutSucceeded) {
        Alert.alert(
          'Signed out',
          'This device is signed out, but the server could not invalidate the session.'
        );
      }
    } catch {
      Alert.alert('Logout failed', 'Unable to clear the saved session. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-[#F7F9FC]">

      {/* Top Bar */}
      <View className="mb-2 px-5">
        <Text className="text-[22px] font-bold text-[#111827]">
          Account
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >

        {/* Profile Card */}
        <View className="mb-4 flex-row items-center gap-[14px] rounded-[16px] border border-[#E2E8F0] bg-white p-[14px]">

          {/* Avatar */}
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#4a5373]">
            <Text className="text-[20px] font-bold  text-white">
              {profileName[0]}
            </Text>
          </View>

          {/* User Details */}
          <View className="flex-1">
            <Text className="text-[16px] font-bold text-[#7389b6]">
              {profileName}
            </Text>

            <Text className="mt-[2px] text-[13px] text-[#64748B]">
              {user.phone}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="mb-5 flex-row rounded-[16px] border border-[#E2E8F0] bg-white p-[14px]">

          {/* Active Subs */}
          <View className="flex-1 items-center">
            <Text className="text-[18px] font-bold text-[#111827]">
              {subscriptionCounts.active}
            </Text>

            <Text className="mt-[2px] text-[11px] text-[#64748B]">
              Active Subs
            </Text>
          </View>

          {/* Divider */}
          <View className="w-px bg-[#F1F5F9]" />

          {/* Wallet */}
          <View className="flex-1 items-center">
            <Text className="text-[18px] font-bold text-[#111827]">
              ₹{walletBalance}
            </Text>

            <Text className="mt-[2px] text-[11px] text-[#64748B]">
              Wallet
            </Text>
          </View>

          {/* Divider */}
          <View className="w-px bg-[#F1F5F9]" />

          {/* Orders */}
          <View className="flex-1 items-center">
            <Text className="text-[18px] font-bold text-[#111827]">
              4
            </Text>

            <Text className="mt-[2px] text-[11px] text-[#64748B]">
              Orders
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <SectionTitle title="Account Settings" />

        {/* Subscriptions */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/subscriptions')}
        >
          <View className="flex-row items-center gap-3">
            <Repeat size={20} color="#023E8A" />

            <View>
              <Text className="text-[14px] font-bold text-[#111827]">
                Subscriptions
              </Text>
              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                {subscriptionCounts.total} saved
              </Text>
            </View>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Delivery Addresses */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/addresses')}
        >
          <View className="flex-row items-center gap-3">
            <MapPin size={20} color="#023E8A" />

            <Text className="text-[14px] font-bold text-[#111827]">
              Delivery Addresses
            </Text>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Payment Methods */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/payment')}
        >
          <View className="flex-row items-center gap-3">
            <CreditCard size={20} color="#023E8A" />

            <Text className="text-[14px] font-bold text-[#111827]">
              Payment Methods
            </Text>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Wallet */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/wallet')}
        >
          <View className="flex-row items-center gap-3">
            <Wallet size={20} color="#023E8A" />

            <Text className="text-[14px] font-bold text-[#111827]">
              Wallet
            </Text>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Notifications */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/notifications')}
        >
          <View className="flex-row items-center gap-3">
            <Bell size={20} color="#023E8A" />

            <Text className="text-[14px] font-bold text-[#111827]">
              Notifications
            </Text>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Order History */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] border border-[#E2E8F0] bg-white p-[14px]"
          onPress={() => router.push('/(tabs)/orders')}
        >
          <View className="flex-row items-center gap-3">
            <Calendar size={20} color="#023E8A" />

            <Text className="text-[14px] font-bold text-[#111827]">
              Order History
            </Text>
          </View>

          <ChevronRight size={18} color="#64748B" />
        </Pressable>

        {/* Logout */}
        <View className="mt-6">
          <PrimaryButton
            label={isLoggingOut ? 'Logging Out...' : 'Log Out'}
            onPress={handleLogout}
            disabled={isLoggingOut}
          />
        </View>

        {/* Version */}
        <Text className="mt-5 text-center text-[11px] text-[#64748B]">
          Dinesh Farms v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}



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
  FileText,
  PauseCircle,
  Pencil,
  MapPin,
  Receipt,
  Repeat,
  ShieldCheck,
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
  const profileName = profile.details.firstName || user.name;
  const needsProfileCompletion = profile.hasLoaded && !profile.profileCompleted;

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
21
  return (
    <View className="flex-1 bg-white">

      {/* Top Bar */}
      <View className="my-2 px-5">
        <Text className="text-[24px] font-raleway-bold text-[#111827]">
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
        <View className="mb-3 flex-row items-center gap-[14px] rounded-[16px] bg-[#023E8A] p-4">

          

          {/* User Details */}
          <View className="flex-1">
            <Text className="text-[26px] my-1 ml-2 font-raleway-bold text-white">
              {needsProfileCompletion ? 'Complete your profile' : profileName || 'Your profile'}
            </Text>

            <Text className="my-1 ml-1 text-[19px] font-bold text-white">
              +91 {user.phone}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={needsProfileCompletion ? 'Complete profile' : 'Edit profile'}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.push('/complete-profile')}
          >
            <Pencil size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Stats */}
        <View className="mb-3 flex-row rounded-[16px]  bg-gray-100 p-[14px]">

          {/* Active Subs */}
          <View className="flex-1 items-center">
            <Text className="text-[18px] font-bold text-[#111827]">
              {subscriptionCounts.active}
            </Text>

            <Text className="mt-[2px] text-[11px] font-raleway-semibold text-[#64748B]">
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

            <Text className="mt-[2px] text-[11px] font-raleway-semibold text-[#64748B]">
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

            <Text className="mt-[2px] text-[11px] font-raleway-semibold text-[#64748B]">
              Orders
            </Text>
          </View>
        </View>

       

        {/* Subscriptions */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/subscriptions')}
        >
          <View className="flex-row items-center gap-3">
            <Repeat size={20} color="#023E8A" />

            <View>
              <Text className="text-[14px] font-raleway-bold text-[#111827]">
                Subscriptions
              </Text>
              
            </View>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Delivery Addresses */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/addresses')}
        >
          <View className="flex-row items-center gap-3">
            <MapPin size={20} color="#023E8A" />

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              Delivery Addresses
            </Text>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Payment Methods */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/payment')}
        >
          <View className="flex-row items-center gap-3">
            <CreditCard size={20} color="#023E8A" />

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              Payment Methods
            </Text>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Wallet */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/wallet')}
        >
          <View className="flex-row items-center gap-3">
            <Wallet size={20} color="#023E8A" />

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              Wallet
            </Text>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Notifications */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/notifications')}
        >
          <View className="flex-row items-center gap-3">
            <Bell size={20} color="#023E8A" />

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              Notifications
            </Text>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Order History */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px]  bg-gray-100 p-[14px]"
          onPress={() => router.push('/(tabs)/orders')}
        >
          <View className="flex-row items-center gap-3">
            <Calendar size={20} color="#023E8A" />

            <Text className="text-[14px] font-raleway-bold text-[#111827]">
              Order History
            </Text>
          </View>

          <ChevronRight size={18} color="#000000" />
        </Pressable>

       

        {/* Transaction History */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] bg-gray-100 p-[14px]"
          onPress={() => router.push('/wallet')}
        >
          <View className="flex-row items-center gap-3">
            <Receipt size={20} color="#023E8A" />
            <Text className="text-[14px] font-raleway-bold text-[#111827]">Transaction History</Text>
          </View>
          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Pause Deliveries */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] bg-gray-100 p-[14px]"
          onPress={() => router.push('/pause-deliveries')}
        >
          <View className="flex-row items-center gap-3">
            <PauseCircle size={20} color="#023E8A" />
            <Text className="text-[14px] font-raleway-bold text-[#111827]">Pause Deliveries</Text>
          </View>
          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Privacy Policy */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] bg-gray-100 p-[14px]"
          onPress={() => router.push('/privacy-policy')}
        >
          <View className="flex-row items-center gap-3">
            <ShieldCheck size={20} color="#023E8A" />
            <Text className="text-[14px] font-raleway-bold text-[#111827]">Privacy Policy</Text>
          </View>
          <ChevronRight size={18} color="#000000" />
        </Pressable>

        {/* Terms */}
        <Pressable
          className="mb-[10px] flex-row items-center justify-between rounded-[14px] bg-gray-100 p-[14px]"
          onPress={() => router.push('/terms')}
        >
          <View className="flex-row items-center gap-3">
            <FileText size={20} color="#023E8A" />
            <Text className="text-[14px] font-raleway-bold text-[#111827]">Terms & Conditions</Text>
          </View>
          <ChevronRight size={18} color="#000000" />
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
        <Text className="mt-5 text-center text-[11px] font-raleway-medium text-[#64748B]">
          Dinesh Farms v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}


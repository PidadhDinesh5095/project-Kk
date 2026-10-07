
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { PrimaryButton } from '@/components/FreshComponents';

export default function DepositSuccessScreen() {
  const { amount, balance } = useLocalSearchParams<{ amount?: string; balance?: string }>();
  const creditedAmount = Number(amount) || 0;
  const walletBalance = Number(balance) || 0;

  const scaleAnim = useMemo(() => new Animated.Value(0.6), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);
  const ringAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const checkAnimation = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    checkAnimation.start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const ringAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const startAnimations = setTimeout(() => {
      pulseAnimation.start();
      ringAnimation.start();
    }, 500);

    return () => {
      clearTimeout(startAnimations);
      checkAnimation.stop();
      pulseAnimation.stop();
      ringAnimation.stop();
    };
  }, [opacityAnim, ringAnim, scaleAnim]);

  return (
    <View className="flex-1 bg-[#F7F9FC]  px-5">
      <Pressable
        className="ml-[4px] mt-4"
        onPress={() => router.replace('/(tabs)/wallet')}
        hitSlop={12}
      >
        <ArrowLeft size={28} color="#111827" />
      </Pressable>

      <View className="flex-1 items-center justify-center pb-4">
        <View className="relative mb-5 h-[150px] w-[150px] items-center justify-center">
          <Animated.View
            className="absolute h-[150px] w-[150px] rounded-full border-[6px] border-[#BBF7D0]"
            style={{
              transform: [
                {
                  scale: ringAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1.4],
                  }),
                },
              ],
              opacity: ringAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            }}
          />

          <Animated.View
            className="h-[104px] w-[104px] items-center justify-center rounded-full bg-[#DCFCE7]"
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <Check
              size={58}
              color="#15803D"
              strokeWidth={3}
            />
          </Animated.View>
        </View>

        <Animated.Text
          className="text-center text-[34px] font-raleway-bold text-[#111827]"
          style={{ opacity: opacityAnim }}
        >
          Payment successful
        </Animated.Text>

        <Animated.Text
          className="mt-2 text-[44px] font-bold text-[#15803D]"
          style={{ opacity: opacityAnim }}
        >
          ₹{creditedAmount.toFixed(2)}
        </Animated.Text>

        <Text className="mt-2 text-center font-raleway-bold text-[14px] text-[#64748B]">
          Your wallet is ready for your next order.
        </Text>

        <View className="mt-2 flex w-full items-center justify-center rounded-[14px] p-4">
          <Text className="text-[20px] font-raleway-bold text-[#64748B]">
            Updated wallet balance
          </Text>

          <Text className="mt-1 text-[28px] font-bold text-[#023E8A]">
            ₹{walletBalance.toFixed(2)}
          </Text>
        </View>

        <View className="mt-8 w-full">
          <Pressable
            className="h-16 w-full items-center justify-center rounded-full bg-[#023E8A]"
            onPress={() => router.replace('/(tabs)/wallet')}
          >
            <Text
              className="text-[20px] font-raleway-semibold text-white"
              style={{ fontFamily: 'RalewaySemiBold' }}
            >
              Back to Wallet
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}


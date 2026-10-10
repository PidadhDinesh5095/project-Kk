import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  X,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import { colors, SectionTitle } from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  cancelWalletTopup,
  fetchWallet,
  fetchWalletTransactions,
  initiateWalletTopup,
  verifyWalletTopup,
  withdrawWallet,
  resetWithdrawalError,
} from '@/store/slices/walletSlice';
import type { VerifyTopupResult } from '@/store/slices/walletSlice';
import type { WalletTransaction } from '@/types/fresh';

const quickAmounts = [100, 200, 500, 1000];

type WalletAlert = {
  title: string;
  message: string;
  actions: Array<{ label: string; onPress?: () => void; style?: 'primary' | 'secondary' | 'danger' }>;
};

type WithdrawalFeedback = {
  status: 'success' | 'error';
  message: string;
};

const transactionStyles = {
  container: {
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderColor: '#E2E8F0',
  },
  titleFont: 'font-raleway-bold',
  metaFont: 'font-raleway-semibold',
  amountFont: 'font-raleway-bold',
  creditColor: '#22C55E',
  debitColor: '#EF4444',
  iconBackground: {
    credit: '#DCFCE7',
    debit: '#FEE2E2',
  },
};

function VerificationStatusModal({
  isVisible,
  isSuccess,
}: {
  isVisible: boolean;
  isSuccess: boolean;
}) {
  const pulseAnim = useMemo(() => new Animated.Value(0.8), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.7), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);
  const sparkleAnims = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => ({
        anim: new Animated.Value(0),
        angle: (Math.PI * 2 * index) / 8,
      })),
    [],
  );

  useEffect(() => {
    if (!isVisible) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 900, useNativeDriver: true }),
      ]),
    );

    const entrance = Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);

    const sparkleAnimations = sparkleAnims.map((sparkle) =>
      Animated.sequence([
        Animated.delay(sparkle.angle * 150),
        Animated.timing(sparkle.anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(sparkle.anim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );

    pulse.start();
    entrance.start();
    if (isSuccess) {
      Animated.stagger(80, sparkleAnimations).start();
    }

    return () => {
      pulse.stop();
      sparkleAnimations.forEach((animation) => animation.stop());
    };
  }, [isSuccess, isVisible, opacityAnim, pulseAnim, scaleAnim, sparkleAnims]);

  const checkStyles = isSuccess
    ? { backgroundColor: '#16A34A', borderColor: '#86EFAC' }
    : { backgroundColor: '#EEF3FF', borderColor: '#C7D9FF' };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="fade" onRequestClose={() => {}}>
      <View className="flex-1 items-center justify-center bg-white px-8">
      <Animated.View
        className="w-full items-center rounded-[32px] bg-white p-8 "
        style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}
      >
        <View className="relative mb-6 h-28 w-28 items-center justify-center">
          <Animated.View
            className="absolute h-28 w-28 rounded-full "
            style={{ transform: [{ scale: pulseAnim }] }}
          />
          <Animated.View
            className="absolute h-24 w-24 items-center justify-center rounded-full "
            style={{
              backgroundColor: checkStyles.backgroundColor,
              borderColor: isSuccess ? '#86EFAC' : '#C7D9FF',
            }}
          >
            {isSuccess ? (
              <Check size={54} color="#FFFFFF" strokeWidth={3} />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </Animated.View>

          {isSuccess && sparkleAnims.map((sparkle, index) => (
            <Animated.View
              key={index}
              className="absolute h-3 w-3 rounded-full bg-[#FBBF24]"
              style={{
                opacity: sparkle.anim,
                transform: [
                  { translateX: sparkle.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(sparkle.angle) * 52] }) },
                  { translateY: sparkle.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(sparkle.angle) * 52] }) },
                  { scale: sparkle.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) },
                ],
              }}
            />
          ))}
        </View>

        <Text className="text-center text-[24px] font-raleway-bold text-[#111827]">
          {isSuccess ? 'Payment Successful' : 'Verifying Payment'}
        </Text>
        <Text className="mt-2 text-center font-raleway-bold text-[14px] text-[#64748B]">
          {isSuccess
            ? 'Your wallet has been updated.'
            : 'Please wait while we confirm your payment.'}
        </Text>
      </Animated.View>
      </View>
    </Modal>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const isCredit = transaction.direction === 'credit';
  const isPurchase = transaction.title.startsWith('Purchased ');
  const amountColor = isCredit ? '#023E8A' : isPurchase ? '#bda87f' : '#EF4444';
  
  const iconBackground = isCredit ? transactionStyles.iconBackground.credit : transactionStyles.iconBackground.debit;

  return (
    <View
      className="mx-2.5 p-2 flex-row items-center gap-3 bg-white"
      style={{
        marginBottom: transactionStyles.container.marginBottom,
        borderRadius: transactionStyles.container.borderRadius,
        padding: transactionStyles.container.padding,
        borderColor: transactionStyles.container.borderColor,
      }}
    >
      

      <View className="flex-1">
        <Text className={`text-[16px] font-raleway-bold text-[#000000]`}>{transaction.title}</Text>
        <Text className={`mt-0.5 text-[12px] text-[#64748B]`}>{transaction.timestamp}</Text>
      </View>

      <Text className="text-[14px]" style={{ color: amountColor }}>
        {isCredit ? '+' : '-'}₹{transaction.amount.toFixed(2)}
      </Text>
    </View>
  );
}

function WalletAlertModal({
  alert,
  isVisible,
  onClose,
}: {
  alert: WalletAlert | null;
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!isVisible || !alert) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-[#0F172A]/60 px-6">
      <View className="w-full overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <View className="border-b border-[#E2E8F0] bg-[#023E8A] px-6 py-5">
          <Text className="text-center text-[20px] font-raleway-bold text-white">{alert.title}</Text>
        </View>

        <View className="px-6 py-6">
          <Text className="text-center text-[15px] leading-6 font-raleway-semibold text-[#475569]">
            {alert.message}
          </Text>
        </View>

        <View className="flex-row gap-3 border-t border-[#E2E8F0] px-6 py-4">
          {alert.actions.map((action, index) => {
            const buttonStyle = action.style === 'danger'
              ? 'bg-[#FEE2E2]'
              : action.style === 'secondary'
                ? 'bg-[#EEF3FF]'
                : 'bg-[#023E8A]';
            const buttonTextColor = action.style === 'danger' ? '#B91C1C' : '#FFFFFF';

            return (
              <Pressable
                key={`${action.label}-${index}`}
                className={`flex-1 items-center justify-center rounded-full px-4 py-3 ${buttonStyle}`}
                onPress={() => { action.onPress?.(); onClose(); }}
              >
                <Text className="text-[14px] font-raleway-bold" style={{ color: buttonTextColor }}>
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function WithdrawalStatusModal({
  isLoading,
  feedback,
  onClose,
}: {
  isLoading: boolean;
  feedback: WithdrawalFeedback | null;
  onClose: () => void;
}) {
  const isVisible = isLoading || feedback !== null;
  if (!isVisible) return null;

  const isSuccess = feedback?.status === 'success';

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      onRequestClose={() => { if (!isLoading) onClose(); }}
    >
      <View className="flex-1 items-center justify-center bg-white px-8">
        <View className={`mb-6 h-24 w-24 items-center justify-center rounded-full ${isLoading ? 'bg-[#EEF3FF]' : isSuccess ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'}`}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : isSuccess ? (
            <Check size={54} color="#16A34A" strokeWidth={3} />
          ) : (
            <X size={54} color="#DC2626" strokeWidth={3} />
          )}
        </View>
        <Text className="text-center text-[28px] font-raleway-bold text-[#111827]">
          {isLoading ? 'Processing Withdrawal' : isSuccess ? 'Withdrawal Recorded' : 'Withdrawal Failed'}
        </Text>
        <Text className="mt-3 text-center text-[18px] leading-6 font-raleway-semibold text-[#64748B]">
          {isLoading ? 'Checking your balance and updating your wallet.' : feedback?.message}
        </Text>
        {!isLoading ? (
          <Pressable
            className="mt-7 h-[50px] min-w-[140px] items-center rounded-full bg-[#023E8A] px-6 py-3"
            onPress={onClose}
          >
            <Text className="text-[20px] font-raleway-bold text-white">Done</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

export default function WalletScreen() {
  const dispatch = useAppDispatch();
  const { amount: amountParam, needed: neededParam } = useLocalSearchParams<{ amount?: string; needed?: string }>();
  const wallet = useAppSelector((state) => state.wallet);
  const user = useAppSelector((state) => state.user);
  const profile = useAppSelector((state) => state.profile.details);
  const [amountInput, setAmountInput] = useState(amountParam ?? '200');
  const [walletAlert, setWalletAlert] = useState<WalletAlert | null>(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState<WithdrawalFeedback | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const pageRequestActive = useRef(false);
  const isRefreshing = wallet.isLoading || (wallet.isLoadingTransactions && wallet.transactionsOffset === 0);

  useFocusEffect(
    useCallback(() => {
      if (amountParam && /^\d+(\.\d{1,2})?$/.test(amountParam)) {
        setAmountInput(amountParam);
      }
    }, [amountParam]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!wallet.hasLoaded && !wallet.error) {
        void dispatch(fetchWallet());
      }
      if (
        wallet.transactions.length === 0 &&
        wallet.hasMoreTransactions &&
        !wallet.isLoadingTransactions &&
        !wallet.transactionsError
      ) {
        pageRequestActive.current = true;
        void dispatch(fetchWalletTransactions({ offset: 0, append: false }))
          .finally(() => { pageRequestActive.current = false; });
      }
    }, [dispatch, wallet.error, wallet.hasLoaded, wallet.hasMoreTransactions, wallet.isLoadingTransactions, wallet.transactions.length, wallet.transactionsError]),
  );

  const loadMoreTransactions = useCallback(async (retry = false) => {
    if (pageRequestActive.current || wallet.isLoadingTransactions || !wallet.hasMoreTransactions || (wallet.transactionsError && !retry)) return;
    pageRequestActive.current = true;
    try {
      await dispatch(fetchWalletTransactions({
        offset: wallet.transactionsOffset,
        append: wallet.transactionsOffset > 0,
      })).unwrap();
    } catch {
      // Keep the loaded page visible; a later scroll can retry.
    } finally {
      pageRequestActive.current = false;
    }
  }, [dispatch, wallet.hasMoreTransactions, wallet.isLoadingTransactions, wallet.transactionsError, wallet.transactionsOffset]);

  const refreshWallet = useCallback(() => {
    void dispatch(fetchWallet(true));
    pageRequestActive.current = true;
    void dispatch(fetchWalletTransactions({ offset: 0, append: false }))
      .finally(() => { pageRequestActive.current = false; });
  }, [dispatch]);

  const completeWalletDeposit = async (payment: NonNullable<typeof pendingPayment>): Promise<VerifyTopupResult> => {
    setIsVerifyingPayment(true);
    const result = await dispatch(verifyWalletTopup({
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature,
    })).unwrap();

    setPendingPayment(null);
    await Promise.all([
      dispatch(fetchWallet(true)),
      dispatch(fetchWalletTransactions({ offset: 0, append: false })),
    ]);
    const params = {
      amount: String(result.transaction.amount),
      balance: String(result.balance),
    };
    setIsVerifyingPayment(false);
    router.replace({ pathname: '/wallet/deposit-success', params });
    return result;
  };

  const handleDeposit = async () => {
    if (!user.isAuthenticated) {
      setWalletAlert({
        title: 'Sign in required',
        message: 'Please log in to deposit funds.',
        actions: [
          { label: 'Cancel', style: 'secondary' },
          { label: 'Log in', onPress: () => router.push('/auth'), style: 'primary' },
        ],
      });
      return;
    }

    if (Platform.OS === 'web') {
      setWalletAlert({
        title: 'Unavailable',
        message: 'Wallet deposits are available in the Android and iOS apps.',
        actions: [{ label: 'OK', style: 'primary' }],
      });
      return;
    }

    const amount = Number(amountInput);
    if (!/^\d+(\.\d{1,2})?$/.test(amountInput) || !Number.isFinite(amount) || amount < 100 || amount > 5000) {
      setWalletAlert({
        title: 'Invalid amount',
        message: 'Enter an amount between ₹100 and ₹5,000.',
        actions: [{ label: 'OK', style: 'primary' }],
      });
      return;
    }

    let paymentAuthorized = false;
    try {
      const order = await dispatch(initiateWalletTopup(amount)).unwrap();
      if (typeof RazorpayCheckout?.open !== 'function') {
        setWalletAlert({
          title: 'Wallet payment unavailable',
          message: 'Razorpay is not available in this app build. Rebuild the Android or iOS app with the native Razorpay module linked.',
          actions: [{ label: 'OK', style: 'primary' }],
        });
        return;
      }

      const payment = await RazorpayCheckout.open({
        key: order.keyId,
        amount: String(order.razorpayOrder.amount),
        currency: order.razorpayOrder.currency,
        name: 'Dinesh Farms',
        description: 'Wallet deposit',
        order_id: order.razorpayOrder.id,
        timeout: 300000,
        prefill: {
          name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user.name,
          email: profile.email || undefined,
          contact: user.phone,
        },
        theme: { color: '#023E8A' },
      });


      paymentAuthorized = true;
      setPendingPayment(payment);
      try {
        await completeWalletDeposit(payment);
      } catch {
        setIsVerifyingPayment(false);
        setPendingPayment(null);
        setWalletAlert({
          title: 'Payment verification pending',
          message: 'Razorpay completed the payment, but the wallet could not confirm it yet. Retry verification before making another deposit.',
          actions: [{ label: 'OK', style: 'primary' }],
        });
      }
    } catch (error) {
      dispatch(cancelWalletTopup());
      const paymentError = error as { code?: number; description?: string; message?: string };
      if (paymentError?.code === 0) return;

      if (paymentAuthorized) return;
      const message = typeof error === 'string'
        ? error
        : paymentError?.description ?? paymentError?.message ?? 'Unable to complete the wallet deposit.';
      setWalletAlert({
        title: 'Deposit not completed',
        message,
        actions: [{ label: 'OK', style: 'primary' }],
      });
    }
  };

  const handleWithdraw = async () => {
    if (!user.isAuthenticated) {
      setWithdrawalFeedback({ status: 'error', message: 'Please sign in before withdrawing wallet funds.' });
      return;
    }

    const amount = Number(amountInput);
    if (!/^\d+(\.\d{1,2})?$/.test(amountInput) || !Number.isFinite(amount) || amount < 100 || amount > 2000) {
      setWithdrawalFeedback({ status: 'error', message: 'Enter a withdrawal amount between ₹100 and ₹2,000.' });
      return;
    }

    setWithdrawalFeedback(null);
    try {
      await dispatch(withdrawWallet(amount)).unwrap();
      setWithdrawalFeedback({
        status: 'success',
        message: `₹${amount.toFixed(2)} has been deducted from your wallet. Bank or UPI payout is not connected yet.`,
      });
    } catch (error) {
      setWithdrawalFeedback({
        status: 'error',
        message: typeof error === 'string' ? error : 'Unable to withdraw from your wallet. Please try again.',
      });
    }
  };

  const header = (
    <View className="px-5 pb-3">
      <Text className="mb-4 mt-2 text-[24px] font-raleway-bold text-[#111827]">My Wallet</Text>

      <View className="rounded-[20px] bg-[#023E8A] p-5">
        <View className="flex-row items-center gap-2">
          <WalletIcon size={20} color="#fff" />
          <Text className="text-[16px] font-raleway-bold text-[#DCE6FF]">Available Balance</Text>
        </View>
        <Text className="mt-2 text-[34px] font-bold text-white">₹{wallet.balance.toFixed(2)}</Text>
        <Text className="mt-2 text-[13px] font-raleway-semibold text-[#DCE6FF]">Use wallet for faster checkout and cashback rewards</Text>
      </View>

      {Number(neededParam) > 0 ? (
        <View className="mt-4 rounded-[12px] border border-[#C7D9FF] bg-[#EEF3FF] p-3">
          <Text className="text-[13px] font-raleway-bold text-[#023E8A]">
            Your order needs ₹{Number(neededParam).toFixed(2)} more.
          </Text>
          <Text className="mt-1 text-[12px] text-[#475569]">
            {Number(neededParam) < 100
              ? 'The minimum wallet top-up is ₹100; that amount is entered below.'
              : Number(neededParam) > 5000
                ? 'Top-ups are limited to ₹5,000 each. Add ₹5,000 first, then top up the remaining amount.'
              : 'The required top-up amount is entered below.'}
          </Text>
        </View>
      ) : null}

      <Text className="mb-2.5 mt-6 text-[16px] font-raleway-bold text-[#111827]">Add Money</Text>
      <View className="flex-row flex-wrap gap-2">
        {quickAmounts.map((amount) => (
          <Pressable
            key={amount}
            accessibilityRole="button"
            accessibilityState={{ selected: amountInput === String(amount) }}
            className={`min-w-[70px] flex-1 items-center rounded-full border bg-white py-3.5 ${amountInput === String(amount) ? 'border-[#023E8A] bg-[#EEF3FF]' : 'border-[#E2E8F0]'}`}
            onPress={() => setAmountInput(String(amount))}
          >
            <Text className={`text-[15px] font-bold ${amountInput === String(amount) ? 'text-[#023E8A]' : 'text-[#111827]'}`}>
              ₹{amount}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-2 mt-4 text-[14px] font-raleway-bold text-[#111827]">Custom amount (₹)</Text>
      <TextInput
        accessibilityLabel="Custom wallet amount for adding or withdrawing"
        className="rounded-[12px] h-[50px] border border-[#E2E8F0] bg-white px-4 py-3.5 text-[18px] text-[#111827]"
        value={amountInput}
        onChangeText={setAmountInput}
        keyboardType="decimal-pad"
        placeholder="Enter amount"
        placeholderTextColor="#94A3B8"
        maxLength={8}
      />

      <View className="mt-4 flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ₹${Number(amountInput) || 0} to wallet`}
          className="min-h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#023E8A] px-3"
          onPress={() => { void handleDeposit(); }}
          disabled={wallet.isDepositing || wallet.isWithdrawing || pendingPayment !== null}
          style={{ opacity: wallet.isDepositing || wallet.isWithdrawing || pendingPayment !== null ? 0.45 : 1 }}
        >
          <ArrowDownLeft size={17} color="#FFFFFF" />
          <Text className="text-[16px] font-raleway-bold text-white">
            {pendingPayment ? 'Payment Pending' : wallet.isDepositing ? 'Adding…' : 'Add Money'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Withdraw ₹${Number(amountInput) || 0} from wallet`}
          className="min-h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[#023E8A] bg-white px-3"
          onPress={() => { void handleWithdraw(); }}
          disabled={wallet.isWithdrawing || wallet.isDepositing}
          style={{ opacity: wallet.isWithdrawing || wallet.isDepositing ? 0.45 : 1 }}
        >
          <ArrowUpRight size={17} color="#023E8A" />
          <Text className="text-[16px] font-raleway-bold text-[#023E8A]">
            {wallet.isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
          </Text>
        </Pressable>
      </View>

      {pendingPayment ? (
        <Pressable
          className="mt-3 items-center rounded-[12px] border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3"
          disabled={wallet.isDepositing}
          onPress={() => {
            void completeWalletDeposit(pendingPayment).catch(() => {
              dispatch(cancelWalletTopup());
              setWalletAlert({
                title: 'Verification still pending',
                message: 'Please retry shortly. Do not make another deposit for this payment.',
                actions: [{ label: 'OK', style: 'primary' }],
              });
            });
          }}
        >
          <Text className="text-[13px] font-raleway-bold text-[#92400E]">
            {wallet.isDepositing ? 'Verifying payment…' : 'Retry payment verification'}
          </Text>
        </Pressable>
      ) : null}

      <View className="mt-7">
        <SectionTitle title="Transaction History" />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F7F9FC]">
      <Pressable className="ml-4 mt-2" onPress={() => router.back()} hitSlop={12}>
        <ArrowLeft size={28} color="#111827" />
      </Pressable>
      <FlatList
        data={wallet.transactions}
        keyExtractor={(transaction) => transaction.id}
        renderItem={({ item }) => <TransactionRow transaction={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={wallet.isLoadingTransactions ? null : (
          <Text className="px-5 py-8 text-center text-[14px] text-[#64748B]">No transactions yet.</Text>
        )}
        ListFooterComponent={wallet.isLoadingTransactions ? (
          <ActivityIndicator className="py-5" color={colors.primary} />
        ) : wallet.transactionsError ? (
          <Pressable className="items-center py-4" onPress={() => { void loadMoreTransactions(true); }}>
            <Text className="text-[13px] font-bold text-[#B91C1C]">Couldn’t load transactions. Tap to retry.</Text>
          </Pressable>
        ) : wallet.hasMoreTransactions && wallet.transactions.length > 0 ? (
          <Pressable className="items-center py-4" onPress={() => { void loadMoreTransactions(); }}>
            <Text className="text-[13px] font-bold text-[#023E8A]">Load more</Text>
          </Pressable>
        ) : null}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={() => { void loadMoreTransactions(); }}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshWallet} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      />
      <VerificationStatusModal isVisible={isVerifyingPayment} isSuccess={false} />
      <WithdrawalStatusModal
        isLoading={wallet.isWithdrawing}
        feedback={withdrawalFeedback}
        onClose={() => {
          setWithdrawalFeedback(null);
          dispatch(resetWithdrawalError());
        }}
      />
      <WalletAlertModal alert={walletAlert} isVisible={walletAlert !== null} onClose={() => setWalletAlert(null)} />
    </View>
  );
}


import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Repeat, SkipForward, X } from 'lucide-react-native';
import { colors, PrimaryButton, StatusPill } from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';
import { canPauseDeliveryDate, formatDate } from '@/lib/cutoff';
import { usePauseDateCutoff } from '@/hooks/usePauseDateCutoff';
import { Product, Subscription } from '@/types/fresh';
import { SubscriptionSkeleton } from '@/components/SubscriptionSkeleton';

const weekdayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getUpcomingDeliveryDates(subscription: Subscription | null) {
  if (!subscription) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startYear, startMonth, startDay] = subscription.startDate.slice(0, 10).split('-').map(Number);
  const startDate = new Date(startYear, startMonth - 1, startDay);
  const dates: string[] = [];

  for (let offset = 0; offset < 90; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (date < startDate) continue;

    const diffDays = Math.round((date.getTime() - startDate.getTime()) / 86400000);
    const weekday = weekdayCodes[date.getDay()];
    const isScheduled = subscription.frequency === 'Daily'
      || (subscription.frequency === 'Alternate' && diffDays % 2 === 0)
      || (subscription.frequency === 'Custom' && subscription.customConfig?.selectedDays?.includes(weekday as 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'));
    const dateKey = getDateKey(date);

    if (isScheduled) dates.push(dateKey);
  }

  return dates;
}

export default function SkipDeliveryScreen() {
  const {
    subscription,
    subscriptions,
    subscriptionIsLoading,
    subscriptionHasLoaded,
    fetchSubscriptions,
    fetchSubscriptionById,
    skipSubscriptionDates,
    subscriptionIsUpdating,
    subscriptionError,
    products,
  } = useFreshStore();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const currentSubscription = routeId ? subscriptions.find((item) => item.id === routeId) ?? subscription : subscription;
  useFocusEffect(
    useCallback(() => {
      if (routeId) {
        const exists = subscriptions.some((item) => item.id === routeId);
        if (!exists && !subscriptionIsLoading) void fetchSubscriptionById(routeId);
        return;
      }

      if (!subscriptionHasLoaded && !subscriptionIsLoading) void fetchSubscriptions();
    }, [fetchSubscriptionById, fetchSubscriptions, routeId, subscriptionHasLoaded, subscriptionIsLoading, subscriptions]),
  );

  const activeSubscription = currentSubscription ?? subscription;

  const product = activeSubscription
    ? products.find((productItem: Product) => productItem.id === activeSubscription.productId)
    : undefined;
  const productImage = activeSubscription?.productImage ?? product?.mainImgNobg ?? product?.images?.find(Boolean);
  const deliverySlots = (activeSubscription?.dailySlots ?? [])
    .map((slot) => slot === 'MORNING' ? 'Morning' : 'Evening')
    .join(' + ') || activeSubscription?.timeSlot || 'Morning';
  const deliveryDates = useMemo(() => getUpcomingDeliveryDates(activeSubscription), [activeSubscription]);
  const skippedSet = useMemo(() => new Set(activeSubscription?.skippedDates ?? []), [activeSubscription]);

  const [selected, setSelected] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showingNextMonth, setShowingNextMonth] = useState(false);
  const { firstAvailableDate, tomorrowIsAvailable } = usePauseDateCutoff();

  const today = new Date();
  const calendarDate = new Date(today.getFullYear(), today.getMonth() + (showingNextMonth ? 1 : 0), 1);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthName = calendarDate.toLocaleString('en-US', {
    month: 'long',
  });

  /*
   * Number of days in the month.
   */
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /*
   * Weekday of the first day.
   * 0 = Sunday
   * 1 = Monday
   * ...
   * 6 = Saturday
   */
  const firstDay = new Date(year, month, 1).getDay();

  /*
   * Create the actual calendar cells.
   * Empty cells are added before day 1 so dates line up correctly.
   */
  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;

      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      return {
        day,
        date,
        available: deliveryDates.includes(date),
      };
    }),
  ];

  const toggleDate = (date: string) => {
    if (!deliveryDates.includes(date) || (!skippedSet.has(date) && !canPauseDeliveryDate(date))) return;

    setSelected((prev) =>
      prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date]
    );
  };

  const sortedSelected = [...selected].sort();
  const selectedSkipCount = sortedSelected.filter((date) => !skippedSet.has(date)).length;
  const selectedUnskipCount = sortedSelected.filter((date) => skippedSet.has(date)).length;
  const updateButtonLabel = selected.length === 0
    ? 'Select dates to skip'
    : selectedUnskipCount === selected.length
      ? `Unskip ${selected.length} ${selected.length === 1 ? 'delivery' : 'deliveries'}`
      : selectedSkipCount === selected.length
        ? `Skip ${selected.length} ${selected.length === 1 ? 'delivery' : 'deliveries'}`
        : `Apply changes`;

  const confirmSkip = async () => {
    if (!activeSubscription) return;
    try {
      await skipSubscriptionDates(activeSubscription.id, sortedSelected).unwrap();
      setSelected([]);
      setShowConfirm(false);
      router.back();
    } catch {
      // The API error is rendered below and the selected dates remain editable.
    }
  };

  if ((routeId && !activeSubscription && (subscriptionIsLoading || !subscriptionHasLoaded)) || (!routeId && (subscriptionIsLoading || !subscriptionHasLoaded))) {
    return (
      <View className="flex-1 bg-[#F7F9FC] px-5 pt-4">
        <Text className="mb-4 font-raleway-bold text-[22px] text-[#111827]">Skip a Delivery</Text>
        <SubscriptionSkeleton variant="skip" />
      </View>
    );
  }

  if (!activeSubscription) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F9FC] px-6">
        <Text className="font-raleway-bold text-[16px] text-[#111827]">Subscription not found</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="font-raleway-bold text-[#023E8A]">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Pressable
        className="ml-2 mt-2 mb-4"
        onPress={() => router.back()}
        hitSlop={12}
      >
        <View className="flex-row items-center px-4  pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">
          Skip a Delivery
        </Text>
      </View>
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
       

        {/* Subscription Card */}
        <View className="rounded-[14px] border border-[#E2E8F0] bg-white p-3">
          <View className="flex-row items-center ml-2 gap-6">
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={{ width: 68, height: 68, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{ width: 68, height: 68, borderRadius: 10 }}
                className="items-center justify-center bg-[#EEF3FF]"
              >
                <Repeat size={24} color={colors.primary} />
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-raleway-bold text-[17px] text-[#111827]">
                {product?.name ?? activeSubscription.productName ?? 'Product'}
              </Text>
              <Text className="mt-1 font-raleway-semibold text-[13px] text-[#64748B]">
                {[product?.size, activeSubscription.frequency].filter(Boolean).join(' · ')}
              </Text>
              <Text className="mt-1 font-raleway-medium text-[13px] text-[#64748B]">
                {deliverySlots} delivery
              </Text>
            </View>
            <StatusPill label={activeSubscription.status} />
          </View>
        </View>

        {/* Calendar Heading */}
        <Text className="mb-1 ml-2 mt-3 font-raleway-bold text-[17px] text-[#111827]">
          Select dates to skip
        </Text>

        <Text className="mb-3 ml-2 font-raleway-medium text-[13px] text-[#64748B]">
          Select your scheduled delivery dates
        </Text>
        <Text className="mb-3 rounded-lg bg-[#EEF3FF] p-3 font-raleway-medium text-[13px] leading-5 text-[#334155]">
          {`Today's deliveries can't be skipped. `}
          {tomorrowIsAvailable
            ? <>Tomorrow can be skipped until <Text className="font-bold">10 PM</Text>.</>
            : <>Tomorrow can no longer be skipped after <Text className="font-bold">10 PM</Text>. You can skip deliveries from <Text className="font-bold">{formatDate(firstAvailableDate)}</Text>.</>}
        </Text>

        {/* Calendar */}
        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {/* Month */}
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setShowingNextMonth(false)}
              disabled={!showingNextMonth}
              accessibilityLabel="Show current month"
              className="h-9 w-9 items-center justify-center"
            >
              {showingNextMonth && <ChevronLeft size={20} color={colors.primary} />}
            </Pressable>
            <Text className="font-raleway-bold text-[19px] text-[#111827]">
              {monthName} <Text className="font-bold" >{year}</Text>
            </Text>
            <Pressable
              onPress={() => setShowingNextMonth(true)}
              disabled={showingNextMonth}
              accessibilityLabel="Show next month"
              className="h-9 w-9 items-center justify-center"
            >
              {!showingNextMonth && <ChevronRight size={20} color={colors.primary} />}
            </Pressable>
          </View>

          {/* Weekday Header */}
          <View className="mb-2 flex-row">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
              (day) => (
                <View
                  key={day}
                  className="w-[14.285%] items-center"
                >
                  <Text className="font-raleway-semibold text-[12px] text-[#64748B]">
                    {day}
                  </Text>
                </View>
              )
            )}
          </View>

          {/* Calendar Dates */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((item, index) => {
              if (!item) {
                return (
                  <View
                    key={`empty-${index}`}
                    className="h-[52px] w-[14.285%]"
                  />
                );
              }

              const isSelected = selected.includes(item.date);
              const isSkipped = skippedSet.has(item.date);
              const canSelectDate = item.available && (isSkipped || item.date >= firstAvailableDate);

              return (
                <View
                  key={item.date}
                  className="mb-2 h-[52px] w-[14.285%] items-center justify-center"
                >
                  <Pressable
                    disabled={!canSelectDate}
                    onPress={() => toggleDate(item.date)}
                    className={`h-10 w-10 items-center justify-center rounded-[12px] ${
                      isSelected
                        ? 'bg-[#023E8A]'
                        : isSkipped
                          ? 'border border-[#F59E0B] bg-[#FFF7ED]'
                          : canSelectDate
                            ? 'border border-[#023E8A] bg-[#EEF3FF]'
                            : 'bg-transparent'
                    }`}
                  >
                    <Text
                      style={{ fontFamily: 'System' }}
                      className={`font-extrabold text-[13px] ${
                        isSelected
                          ? 'text-white'
                          : isSkipped
                            ? 'text-[#B45309]'
                            : canSelectDate
                              ? 'text-[#023E8A]'
                              : 'text-[#CBD5E1]'
                      }`}
                    >
                      {item.day}
                    </Text>
                    {isSelected && (
                      <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-white">
                        <Check size={10} color={colors.primary} />
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View className="mt-2 flex-row items-center justify-center gap-5 border-t border-[#F1F5F9] pt-3">
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 rounded-md border border-[#023E8A] bg-[#EEF3FF]" />

              <Text className="font-raleway-medium text-[11px] text-[#64748B]">
                Delivery date
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 rounded-md bg-[#023E8A]" />

              <Text className="font-raleway-medium text-[11px] text-[#64748B]">
                Selected
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 rounded-md border border-[#F59E0B] bg-[#FFF7ED]" />

              <Text className="font-raleway-medium text-[11px] text-[#64748B]">
                Skipped
              </Text>
            </View>
          </View>
        </View>

        {/* Selected Count */}
        {selected.length > 0 && (
          <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-[#EEF3FF] p-3">
            <SkipForward size={14} color={colors.primary} />

            <Text className="font-raleway-semibold text-[13px] text-[#023E8A]">
              {selectedUnskipCount === selected.length
                ? `Unskip ${selected.length} ${selected.length === 1 ? 'delivery' : 'deliveries'}`
                : selectedSkipCount === selected.length
                  ? `Skip ${selected.length} ${selected.length === 1 ? 'delivery' : 'deliveries'}`
                  : `Update ${selected.length} ${selected.length === 1 ? 'date' : 'dates'}`}
            </Text>
          </View>
        )}

        {/* Selected Dates */}
        {sortedSelected.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {sortedSelected.map((date) => (
              <View
                key={date}
                className="flex-row items-center gap-1.5 rounded-full border border-[#023E8A] bg-white px-2.5 py-1.5"
              >
                <Text style={{ fontFamily: 'System' }} className="text-[12px] text-[#023E8A]">
                  {formatDate(date)}
                </Text>

                <Pressable
                  onPress={() => toggleDate(date)}
                  hitSlop={8}
                >
                  <X size={13} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View className="mt-4 rounded-[17px] bg-[#EEF3FF] p-[14px]">
          <Text className="font-raleway-bold text-[16px] text-[#023E8A]">
            Skip details
          </Text>

          <Text className="mt-2 font-raleway-medium text-[13px] leading-5 text-[#111827]">
            • No delivery on the selected date(s){'\n'}
            • No charge for skipped deliveries{'\n'}
            • Subscription continues normally after{'\n'}
            • You can skip multiple dates at once
          </Text>
        </View>

        {/* Button */}
        <View className="mt-7">
          {subscriptionError && (
            <Text className="mb-3 text-center font-raleway-semibold text-[13px] text-[#B91C1C]">
              {subscriptionError}
            </Text>
          )}
          <PrimaryButton
            label={
              subscriptionIsUpdating
                ? 'Updating...'
                : updateButtonLabel
            }
            disabled={selected.length === 0 || subscriptionIsUpdating}
            onPress={() => setShowConfirm(true)}
          />
        </View>
      </ScrollView>

      {/* Confirmation Popup */}
      {showConfirm && (
        <View className="absolute inset-0 items-center justify-center bg-black/40 px-5">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="font-raleway-bold text-[18px] text-[#111827]">
              Confirm skipped deliveries
            </Text>

            <Text className="mt-2 font-raleway-medium text-[13px] leading-5 text-[#64748B]">
              {selectedUnskipCount === selected.length
                ? `These ${selected.length} skipped dates will be restored to your schedule.`
                : selectedSkipCount === selected.length
                  ? `Are you sure you want to skip ${selected.length === 1 ? 'this delivery' : `these ${selected.length} deliveries`}?`
                  : `These ${selected.length} selected dates will be updated.`}
            </Text>

            <View className="mt-4 rounded-full bg-[#F5F7FB] p-3">
              {sortedSelected.map((date) => (
                <Text
                  key={date}
                  className="mb-1 text-[12px] font-bold text-[#111827]"
                >
                  • {formatDate(date)}
                </Text>
              ))}
            </View>

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setShowConfirm(false)}
                className="flex-1 items-center rounded-full border border-[#E2E8F0] py-3"
              >
                <Text className="font-raleway-semibold text-[#64748B]">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmSkip}
                disabled={subscriptionIsUpdating}
                className="flex-1 items-center rounded-full bg-[#023E8A] py-3"
              >
                <Text className="font-raleway-bold text-white">
                  {subscriptionIsUpdating ? 'Updating...' : selectedUnskipCount === selected.length ? 'Confirm Unskip' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

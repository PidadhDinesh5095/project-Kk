
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, CalendarDays, Check, MapPin, Plus, Minus } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAddresses } from '@/store/slices/addressesSlice';
import { useFreshStore } from '@/store/useFreshStore';
import { Address, Product } from '@/types/fresh';
import { firstAvailablePauseDate } from '@/lib/cutoff';
import { usePauseDateCutoff } from '@/hooks/usePauseDateCutoff';

const dayCodeMap: Record<string, string> = {
  Su: 'SU',
  Mo: 'MO',
  Tu: 'TU',
  We: 'WE',
  Th: 'TH',
  Fr: 'FR',
  Sa: 'SA',
};

const slotCodeMap: Record<string, 'MORNING' | 'EVENING'> = {
  Morning: 'MORNING',
  Evening: 'EVENING',
};

const dayShortNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dayLongNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDisplayDate(date: Date) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDateKey(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function generateUpcomingDates(startDate: Date) {
  const today = new Date(startDate);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      value: date,
      label: `${date.getDate()}`,
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      full: formatDisplayDate(date),
    };
  });
}

export default function SubscribeScreen() {
  const { id, subscriptionId } = useLocalSearchParams<{ id: string; subscriptionId?: string }>();
  const dispatch = useAppDispatch();
  const {
    isLoading: addressesAreLoading,
    hasLoaded: addressesHaveLoaded,
    error: addressesError,
  } = useAppSelector((state) => state.addresses);
  const {
    products,
    addresses,
    subscriptions,
    createSubscription,
    updateSubscriptionSchedule,
    fetchSubscriptions,
    subscriptionIsCreating,
    subscriptionIsUpdating,
    subscriptionError,
  } = useFreshStore();

  const editingSubscription = subscriptions.find((item) => item.id === subscriptionId);
  const isEditing = Boolean(editingSubscription);
  const product = products.find((item: Product) => item.id === id) ?? products[0];
  const defaultAddress = addresses.find((item: Address) => item.isDefault) ?? addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const [frequency, setFrequency] = useState<'Daily' | 'Alternate' | 'Custom'>('Daily');
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['Morning']);
  const [selectedDate, setSelectedDate] = useState(() => dateFromKey(firstAvailablePauseDate()));
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mo', 'Tu', 'We']);
  const [dailyQty, setDailyQty] = useState(1);
  const [startQty, setStartQty] = useState(1);
  const [succeedingQty, setSucceedingQty] = useState(1);
  const [customQty, setCustomQty] = useState<Record<string, number>>({
    Mo: 1,
    Tu: 1,
    We: 1,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!editingSubscription) return;

    setFrequency(editingSubscription.frequency === 'Alternate' || editingSubscription.frequency === 'Custom'
      ? editingSubscription.frequency
      : 'Daily');
    setSelectedSlots((editingSubscription.dailySlots ?? ['MORNING'])
      .map((slot) => slot === 'EVENING' ? 'Evening' : 'Morning'));
    setDailyQty(editingSubscription.dailyQuantity ?? 1);
    setStartQty(editingSubscription.alternateConfig?.startDateQuantity ?? 1);
    setSucceedingQty(editingSubscription.alternateConfig?.succeedingDayQuantity ?? 1);

    const shortDayByCode: Record<string, string> = {
      SU: 'Su', MO: 'Mo', TU: 'Tu', WE: 'We', TH: 'Th', FR: 'Fr', SA: 'Sa',
    };
    const initialDays = (editingSubscription.customConfig?.selectedDays ?? ['MO', 'TU', 'WE'])
      .map((day) => shortDayByCode[day])
      .filter(Boolean);
    setSelectedDays(initialDays);
    setCustomQty(Object.fromEntries(
      Object.entries(editingSubscription.customConfig?.quantityPerDay ?? {})
        .map(([day, quantity]) => [shortDayByCode[day], quantity])
        .filter(([day]) => Boolean(day)),
    ));
  }, [editingSubscription]);

  useEffect(() => {
    if (editingSubscription && !selectedAddressId) {
      const currentAddressId = editingSubscription.deliveryAddressId ?? editingSubscription.addressId;
      if (currentAddressId) {
        setSelectedAddressId(currentAddressId);
        return;
      }
    }

    if (!isEditing && defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, editingSubscription, isEditing, selectedAddressId]);

  useEffect(() => {
    if (!addressesHaveLoaded && !addressesAreLoading) {
      void dispatch(fetchAddresses());
    }
  }, [addressesAreLoading, addressesHaveLoaded, dispatch]);

  const { firstAvailableDate, tomorrowIsAvailable } = usePauseDateCutoff();
  const upcomingDates = useMemo(
    () => generateUpcomingDates(dateFromKey(firstAvailableDate)),
    [firstAvailableDate],
  );
  const effectiveStartDate = getDateKey(selectedDate) < firstAvailableDate
    ? dateFromKey(firstAvailableDate)
    : selectedDate;
  const selectedAddress = addresses.find((item: Address) => item.id === selectedAddressId) ?? defaultAddress;

  const activeDayRows = useMemo(
    () =>
      dayShortNames.filter((day) => selectedDays.includes(day)).map((day) => ({
        day,
        label: dayLongNames[dayShortNames.indexOf(day)],
      })),
    [selectedDays]
  );

  const toggleSlot = (slot: string) => {
    setSelectedSlots((current) =>
      current.includes(slot)
        ? current.length > 1 ? current.filter((item) => item !== slot) : current
        : [...current, slot]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((current) => {
      const exists = current.includes(day);
      const next = exists ? current.filter((item) => item !== day) : [...current, day];

      if (!next.length) {
        return [day];
      }

      return next;
    });

    setCustomQty((current) => ({
      ...current,
      [day]: current[day] ?? 1,
    }));
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0 || !product) return;

    const nextAddressId = selectedAddress?.id ?? selectedAddressId ?? editingSubscription?.deliveryAddressId ?? editingSubscription?.addressId;

    if (!isEditing && !nextAddressId) return;

    const schedule = {
      frequency,
      dailySlots: selectedSlots.map((slot) => slotCodeMap[slot] ?? 'MORNING'),
      dailyQuantity: frequency === 'Daily' ? dailyQty : undefined,
      alternateConfig: frequency === 'Alternate' ? {
        startDateQuantity: startQty,
        succeedingDayQuantity: succeedingQty,
      } : undefined,
      customConfig: frequency === 'Custom' ? {
        selectedDays: selectedDays.map((day) => (dayCodeMap[day] ?? 'MO') as 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'),
        quantityPerDay: Object.fromEntries(
          selectedDays.map((day) => [dayCodeMap[day] ?? 'MO', customQty[day] ?? 1])
        ),
      } : undefined,
    };

    try {
      if (editingSubscription) {
        if (!nextAddressId) return;
        await updateSubscriptionSchedule({ id: editingSubscription.id, addressId: nextAddressId, ...schedule }).unwrap();
        await fetchSubscriptions();
      } else {
        if (!nextAddressId) return;
        await createSubscription({
          productId: product.id,
          addressId: nextAddressId,
          startDate: getDateKey(effectiveStartDate),
          ...schedule,
        }).unwrap();
      }

      setShowSuccess(true);
    } catch {
      // The store exposes the request error alongside the update button.
    }
  };

  const currentQuantity =
    frequency === 'Daily'
      ? dailyQty
      : frequency === 'Alternate'
        ? startQty
        : selectedDays.length;

  const totalUnits =
    frequency === 'Daily'
      ? dailyQty
      : frequency === 'Alternate'
        ? startQty + succeedingQty
        : Object.values(customQty).reduce((sum, qty) => sum + (qty ?? 1), 0);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-4 mb-4 mt-2 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">
          {isEditing ? 'Change Schedule' : 'Subscribe'}
        </Text>
      </View>

      

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 120,
        }}
      >
        <View className="mt-1 flex-row items-center justify-between rounded-[14px] bg-neutral-100 pr-4 pl-2 py-2">
          <View className="flex-row items-center gap-4 ">
            <View className="h-[72px] w-[72px]  items-center justify-center overflow-hidden ">
              <Image
                source={
                  product.mainImgNobg
                    ? { uri: product.mainImgNobg }
                    : require('@/assets/images/products/CowMilk-removebg-preview.png')
                }
                className="h-[64px] w-[64px]"
                resizeMode="contain"
              />
            </View>

            <View>
              <Text className="text-[18px] font-raleway-bold text-[#111827]">
                {product.name}
              </Text>
              <Text className="mt-1 text-[14px] text-[#475569]">{product.size}</Text>
            </View>
          </View>

          <Text className="text-[22px] font-bold text-[#023E8A]">
            ₹{product.price}
          </Text>
        </View>

        <Text className="mt-4 text-[16px] font-raleway-bold text-[#111827]">
          Frequency
        </Text>

        <View className="mt-3 flex-row gap-3">
          {(['Daily', 'Alternate', 'Custom'] as const).map((item) => {
            const active = frequency === item;

            return (
              <Pressable
                key={item}
                onPress={() => setFrequency(item)}
                className={`flex-row items-center justify-center gap-2 rounded-[18px] px-4 py-2.5 ${
                  active ? 'bg-[#023E8A]' : 'bg-[#F1F1EE]'
                }`}
              >
                
                <Text
                  className={`text-[15px] font-raleway-bold ${
                    active ? 'text-white' : 'text-[#111827]'
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-6 text-[16px] font-raleway-bold text-[#111827]">
          Preferred time slot
        </Text>

        <View className="mt-3 flex-row gap-2">
          {['Morning', 'Evening'].map((slot) => {
            const isSelected = selectedSlots.includes(slot);

            return (
              <Pressable
                key={slot}
                onPress={() => toggleSlot(slot)}
                className={`flex-row items-center justify-center gap-2 rounded-[18px] px-4 py-2.5 ${
                  isSelected ? 'bg-[#023E8A]' : 'bg-[#F1F1EE]'
                }`}
              >
                {isSelected && <Check size={12} color="#fff" />}
                <Text
                  className={`text-[15px] font-raleway-bold ${
                    isSelected ? 'text-white' : 'text-[#111827]'
                  }`}
                >
                  {slot}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {(!isEditing || editingSubscription) && (
          <View className="mt-6">
            <Text className="mb-3 text-[16px] font-raleway-bold text-[#111827]">
              Delivery Address
            </Text>

            {addressesAreLoading ? (
              <View className="items-center justify-center py-3">
                <ActivityIndicator color="#023E8A" />
              </View>
            ) : addressesError ? (
              <View className="rounded-[14px] border border-[#FECACA] bg-white p-3">
                <Text className="text-[13px] text-[#B91C1C]">{addressesError}</Text>
                <Pressable className="mt-2 self-start" onPress={() => { void dispatch(fetchAddresses()); }}>
                  <Text className="text-[13px] font-raleway-bold text-[#023E8A]">Retry</Text>
                </Pressable>
              </View>
            ) : addresses.length === 0 ? (
              <View className="rounded-[14px] border border-[#E2E8F0] bg-white p-3">
                <Text className="text-[13px] text-[#64748B]">Add a delivery address to continue.</Text>
                <Pressable className="mt-2 self-start" onPress={() => router.push('/address-setup')}>
                  <Text className="text-[13px] font-raleway-bold text-[#023E8A]">Add address</Text>
                </Pressable>
              </View>
            ) : selectedAddress ? (
              <View className="rounded-[18px]  bg-[#F1F1E] p-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#023E8A]">
                    <MapPin size={17} color="#fff" />
                  </View>

                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-[13px] font-raleway-bold text-[#111827]">
                      {selectedAddress.line1 || selectedAddress.label}{selectedAddress.isDefault ? ' · Default' : ''}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[12px] text-[#64748B]">
                      {[selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(', ')}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setShowAddressPicker(true)}
                    className="rounded-full bg-[#023E8A] px-3 py-1.5"
                  >
                    <Text className="text-[12px] font-raleway-bold text-[#fff]">Change</Text>
                  </Pressable>
                </View>

              </View>
            ) : null}

            {!isEditing && (
              <>
                <Text className="mt-6 text-[16px] font-raleway-bold text-[#111827]">
                  Select Starting Date
                </Text>

                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className="mt-3 flex-row items-center justify-between rounded-[18px] bg-[#f1f1ee] py-3.5 pl-4 pr-6"
                >
                  <Text className="text-[18px] font-bold text-[#111827]">
                    {formatDisplayDate(effectiveStartDate)}
                  </Text>
                  <View className="h-[1rem] w-[1rem] items-center justify-center rounded-[10px] bg-[#EAF1FF]">
                    <CalendarDays size={22} color="#023E8A" />
                  </View>
                </Pressable>
              </>
            )}
          </View>
        )}

        {frequency === 'Daily' && (
          <View className="mt-4">
            <Text className="text-[16px] font-raleway-bold text-[#111827]">
              Select Quantity
            </Text>
            <View className="mt-3 flex-row items-center justify-between rounded-[18px]  bg-[#f1f1ee] px-4 py-2.5">
              <View className="flex-row items-center gap-2">
                <Text className="text-[18px] font-bold text-[#111827]">{dailyQty}</Text>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-[10px] "
                  onPress={() => setDailyQty((qty) => Math.max(1, Math.min(10, qty - 1)))}
                >
                  <Minus size={18} color="#023E8A" />
                </Pressable>
                <Text className="text-[18px] font-bold text-[#111827]">{dailyQty}</Text>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-[10px] "
                  onPress={() => setDailyQty((qty) => Math.min(10, qty + 1))}
                >
                  <Plus size={18} color="#023E8A" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {frequency === 'Alternate' && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-raleway-bold text-[#111827]">
                Start Date Quantity
              </Text>

              <View className="mt-2 flex-row items-center gap-3 rounded-[18px]  bg-[#f1f1ee] px-3 py-2.5">
                <Pressable onPress={() => setStartQty((qty) => Math.max(1, Math.min(10, qty - 1)))}>
                  <Minus size={18} color="#023E8A" />
                </Pressable>
                <Text className="min-w-[24px] text-center text-[18px] font-bold text-[#111827]">
                  {startQty}
                </Text>
                <Pressable onPress={() => setStartQty((qty) => Math.min(10, qty + 1))}>
                  <Plus size={18} color="#023E8A" />
                </Pressable>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-[17px] font-raleway-bold text-[#111827]">
                Succeeding Day Quantity
              </Text>

              <View className="mt-2 flex-row items-center gap-3 rounded-[18px]  bg-[#f1f1ee] px-3 py-2.5">
                <Pressable onPress={() => setSucceedingQty((qty) => Math.max(1, Math.min(10, qty - 1)))}>
                  <Minus size={18} color="#023E8A" />
                </Pressable>
                <Text className="min-w-[24px] text-center text-[18px] font-bold text-[#111827]">
                  {succeedingQty}
                </Text>
                <Pressable onPress={() => setSucceedingQty((qty) => Math.min(10, qty + 1))}>
                  <Plus size={18} color="#023E8A" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        

        {frequency === 'Custom' && (
          <View className="mt-6">
            <Text className="text-[18px] font-raleway-bold text-[#111827]">
              Select Days
            </Text>

            <View className="mt-3 flex-row gap-2">
              {dayShortNames.map((day) => {
                const active = selectedDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    className={`h-[44px] w-[48px] items-center justify-center rounded-[12px] ${
                      active ? 'bg-[#023E8A] text-white' : 'bg-[#f1f1ee] text-black'
                    }`}
                  >
                    <Text
                      className={`text-[16px] font-raleway-bold ${
                        active ? 'text-white' : 'text-[#111827]'
                      }`}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-6 text-[18px] font-raleway-bold text-[#111827]">
              Select Quantity Per Day
            </Text>

            <View className="mt-3 gap-4">
              {activeDayRows.map(({ day, label }) => (
                <View key={day} className="flex-row items-center justify-between">
                  <Text className="text-[16px] font-raleway-bold text-[#111827]">{label}</Text>

                  <View className="flex-row items-center gap-3 rounded-[18px]  bg-[#f1f1ee] px-3 py-2.5">
                    <Pressable onPress={() => setCustomQty((current) => ({
                      ...current,
                      [day]: Math.max(1, Math.min(10, (current[day] ?? 1) - 1)),
                    }))}>
                      <Minus size={18} color="#023E8A" />
                    </Pressable>
                    <Text className="min-w-[24px] text-center text-[18px] font-bold text-[#111827]">
                      {customQty[day] ?? 1}
                    </Text>
                    <Pressable onPress={() => setCustomQty((current) => ({
                      ...current,
                      [day]: Math.min(10, (current[day] ?? 1) + 1),
                    }))}>
                      <Plus size={18} color="#023E8A" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-[#f6f5f3] px-4 pb-6 pt-3">
        <Pressable
          onPress={handleSubmit}
          disabled={subscriptionIsCreating || subscriptionIsUpdating || (!isEditing && !selectedAddress) || selectedSlots.length === 0}
          className="h-16 items-center justify-center rounded-[30px] bg-[#023E8A]"
        >
          <Text className="text-[20px] font-raleway-bold text-white">
            {isEditing
              ? subscriptionIsUpdating ? 'Updating...' : 'Update Schedule'
              : subscriptionIsCreating ? 'Creating...' : 'Place Order'}
          </Text>
        </Pressable>
      </View>

      {subscriptionError && (
        <View className="absolute bottom-20 left-4 right-4 rounded-xl bg-white px-4 py-2">
          <Text className="text-center font-raleway-semibold text-[13px] text-red-600">
            {subscriptionError}
          </Text>
        </View>
      )}

      <Modal
        visible={showAddressPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[26px] bg-white px-4 pb-8 pt-4">
            <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-[#D1D5DB]" />
            <Text className="mb-4 text-center text-[20px] font-raleway-bold text-[#111827]">
              Select Delivery Address
            </Text>

            <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator>
              {addresses.map((address: Address) => {
                const isSelected = selectedAddressId === address.id || (!selectedAddressId && address.isDefault);

                return (
                  <Pressable
                    key={address.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setSelectedAddressId(address.id);
                      setShowAddressPicker(false);
                    }}
                    className={`min-h-[72px] flex-row items-center gap-3 rounded-[12px] border p-3 ${isSelected ? 'border-[#023E8A] bg-[#EEF3FF]' : 'border-[#E2E8F0] bg-white'}`}
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
                        <Text numberOfLines={1} className="mt-0.5 text-[11px] text-[#64748B]">
                          {address.deliveryInstructions}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? <Check size={18} color="#023E8A" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              className="mt-4 h-[50px] items-center justify-center rounded-full bg-[#023E8A]"
              onPress={() => setShowAddressPicker(false)}
            >
              <Text className="text-[18px] font-raleway-bold text-white">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40 mb-3">
          <View className="rounded-t-[26px] bg-white px-4 pb-8 pt-4">
            <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-[#D1D5DB]" />
            <Text className="mb-4 text-center text-[20px] font-raleway-bold text-[#111827]">
              Select Delivery Date
            </Text>
            <Text className="mb-3 text-center font-raleway-medium text-[13px] leading-5 text-[#475569]">
              {tomorrowIsAvailable
                ? <>Choose a start date from tomorrow. Tomorrow is available until <Text className="font-bold">10 PM</Text>.</>
                : <>After <Text className="font-bold">10 PM</Text>, the earliest start date is the day after tomorrow.</>}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3 px-1 mb-4">
                {upcomingDates.map((dateItem) => {
                  const active = formatDisplayDate(effectiveStartDate) === dateItem.full;

                  return (
                    <Pressable
                      key={dateItem.full}
                      onPress={() => {
                        setSelectedDate(dateItem.value);
                        setShowDatePicker(false);
                      }}
                      className={`h-16 w-[60px] items-center justify-center rounded-[14px]  ${
                        active
                          ? ' bg-[#023E8A] '
                          : 'bg-[#E5E7EB]'
                      }`}
                    >
                      <Text className={`text-[12px] font-raleway-bold ${active ? 'text-white' : 'text-black'}`}>
                        {dateItem.day}
                      </Text>
                      <Text className={`mt-2 text-[18px] font-bold ${active ? 'text-white' : 'text-[#111827]'}`}>
                        {dateItem.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showSuccess && (
        <View className="absolute inset-0 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-[22px] bg-white p-6">
            <View className="mb-4 h-14 w-14 items-center justify-center self-center rounded-full bg-[#174929]">
              <Check size={28} color="#fff" />
            </View>

            <Text className="text-center text-[22px] font-raleway-bold text-[#111827]">
              {isEditing ? 'Schedule Updated' : 'Subscription Added'}
            </Text>

            <Text className="mt-2 text-center text-[14px] font-raleway-semibold text-[#475569]">
              {isEditing
                ? `${product.name}'s delivery schedule has been updated.`
                : `${product.name} is scheduled from ${formatDisplayDate(effectiveStartDate)} with ${selectedSlots.join(' + ')} slot.`}
            </Text>

            <Pressable
              className="mt-4 pb-4 h-18 rounded-full bg-[#023E8A] px-5 py-3"
              onPress={() => {
                setShowSuccess(false);
                if (isEditing) router.back();
                else router.replace('/(tabs)');
              }}
            >
              <Text className="text-center text-[15px] font-raleway-bold text-white">
                {isEditing ? 'Back to Subscription' : 'Back to Home'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

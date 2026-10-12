import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, PauseCircle, PlayCircle, X } from 'lucide-react-native';
import { PrimaryButton, colors } from '@/components/FreshComponents';
import { useFreshStore } from '@/store/useFreshStore';

import { canPauseDeliveryDate, formatDate } from '@/lib/cutoff';
import { usePauseDateCutoff } from '@/hooks/usePauseDateCutoff';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PauseDeliveriesScreen() {
  const {
    pauseDates,
    pauseDatesIsLoading,
    pauseDatesIsSaving,
    pauseDatesHasLoaded,
    pauseDatesError,
    fetchPauseDates,
    updatePauseDates,
  } = useFreshStore();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const { firstAvailableDate, tomorrowIsAvailable } = usePauseDateCutoff();

  useFocusEffect(
    useCallback(() => {
      if (!pauseDatesHasLoaded && !pauseDatesIsLoading) void fetchPauseDates();
    }, [fetchPauseDates, pauseDatesHasLoaded, pauseDatesIsLoading]),
  );

  const pausedSet = useMemo(() => new Set(pauseDates), [pauseDates]);
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return { day, date: dateKey(new Date(year, month, day)) };
    }),
  ];
  const sortedSelected = [...selectedDates].sort();
  const selectedPauseCount = sortedSelected.filter((date) => !pausedSet.has(date)).length;
  const selectedUnpauseCount = sortedSelected.length - selectedPauseCount;
  const buttonLabel = pauseDatesIsSaving
    ? 'Saving dates...'
    : selectedDates.length === 0
      ? 'Select dates'
      : selectedPauseCount > 0 && selectedUnpauseCount > 0
        ? 'Apply date changes'
        : selectedUnpauseCount > 0
          ? `Unpause ${selectedUnpauseCount} ${selectedUnpauseCount === 1 ? 'date' : 'dates'}`
          : `Pause ${selectedPauseCount} ${selectedPauseCount === 1 ? 'date' : 'dates'}`;

  const toggleDate = (date: string) => {
    if (!pausedSet.has(date) && !canPauseDeliveryDate(date)) return;
    setSelectedDates((current) => current.includes(date)
      ? current.filter((item) => item !== date)
      : [...current, date]);
  };

  const saveDates = async () => {
    try {
      await updatePauseDates(sortedSelected).unwrap();
      setSelectedDates([]);
      setShowCalendar(false);
    } catch {
      // Keep the selection so the user can retry.
    }
  };

  const changeMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };
  const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canGoPrevious = calendarMonth > currentMonth;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pb-3 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-raleway-bold text-[22px] text-[#111827]">Choose delivery dates</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        
       
        <Text className="mb-4 rounded-lg bg-[#EEF3FF] p-3 font-raleway-medium text-[13px] leading-5 text-[#334155]">
             
          Pausing a date skips every scheduled delivery. Select a paused date to turn deliveries back on.
          
        
          {`Today's deliveries can't be paused. `}
          {tomorrowIsAvailable
            ? <>Tomorrow can be paused until <Text className="font-bold">10 PM</Text>.</>
            : <>Tomorrow can no longer be paused after <Text className="font-bold">10 PM</Text>. Select a date from <Text className="font-bold">{formatDate(firstAvailableDate)}</Text>.</>}
        </Text>

        {pauseDates.length > 0 && (
          <View className="mb-4 rounded-xl bg-[#FFF7ED] p-3">
            <Text className="mb-2 font-raleway-bold text-[15px] text-[#92400E]">Currently paused</Text>
            <Text className="font-bold text-[13px] leading-5 text-[#78350F]">
              {[...pauseDates].sort().map(formatDate).join('  ·  ')}
            </Text>
          </View>
        )}

        {pauseDatesIsLoading && !pauseDatesHasLoaded && (
          <Text className="mb-3 text-center font-raleway-medium text-[13px] text-[#64748B]">Loading paused dates...</Text>
        )}
        {pauseDatesError && (
          <View className="mb-3">
            <Text className="mb-2 text-center font-raleway-semibold text-[13px] text-[#B91C1C]">{pauseDatesError}</Text>
            {!pauseDatesHasLoaded && <Pressable onPress={() => fetchPauseDates()}><Text className="text-center font-raleway-bold text-[#023E8A]">Retry</Text></Pressable>}
          </View>
        )}

        <Pressable
          className="mb-4 flex-row items-center justify-center gap-2 rounded-xl border border-[#023E8A] px-4 py-3"
          onPress={() => setShowCalendar((visible) => !visible)}
          disabled={!pauseDatesHasLoaded}
        >
          <CalendarDays size={18} color={colors.primary} />
          <Text className="font-raleway-bold text-[14px] text-[#023E8A]">
            {showCalendar ? 'Close calendar' : pauseDates.length > 0 ? 'Change paused dates' : 'Add pause dates'}
          </Text>
        </Pressable>

        {showCalendar && <>
        <View className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => changeMonth(-1)}
              disabled={!canGoPrevious}
              accessibilityLabel="Previous month"
              className="h-10 w-10 items-center justify-center"
            >
              {canGoPrevious && <ChevronLeft size={21} color={colors.primary} />}
            </Pressable>
            <Text className="font-raleway-bold text-[20px] text-[#111827]">
              {calendarMonth.toLocaleString('en-US', { month: 'long' })} {year}
            </Text>
            <Pressable
              onPress={() => changeMonth(1)}
              accessibilityLabel="Next month"
              className="h-10 w-10 items-center justify-center"
            >
              <ChevronRight size={21} color={colors.primary} />
            </Pressable>
          </View>

          <View className="mb-2 flex-row">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} className="w-[14.285%] items-center">
                <Text className="font-raleway-semibold text-[13px] text-[#64748B]">{day}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {calendarDays.map((item, index) => {
              if (!item) return <View key={`blank-${index}`} className="mb-2 h-12 w-[14.285%]" />;
              const isSelected = selectedDates.includes(item.date);
              const isPaused = pausedSet.has(item.date);
              const isUnavailable = item.date < firstAvailableDate && !isPaused;
              return (
                <View key={item.date} className="mb-2 h-12 w-[14.285%] items-center justify-center">
                  <Pressable
                    disabled={isUnavailable || pauseDatesIsSaving}
                    onPress={() => toggleDate(item.date)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.date}${isPaused ? ', paused' : ''}`}
                    className={`h-10 w-10 items-center justify-center rounded-xl ${
                      isSelected ? 'bg-[#023E8A]' : isPaused ? 'border border-[#D97706] bg-[#FFF7ED]' : 'bg-transparent'
                    }`}
                  >
                    <Text className={`font-bold text-[13px] ${
                      isSelected ? 'text-white' : isUnavailable ? 'text-[#CBD5E1]' : isPaused ? 'text-[#B45309]' : 'text-[#111827]'
                    }`}>{item.day}</Text>
                    {isSelected && <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-white"><Check size={10} color={colors.primary} /></View>}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View className="mt-2 flex-row justify-center gap-5 border-t border-[#F1F5F9] pt-3">
            <View className="flex-row items-center gap-2">
              <View className="h-3.5 w-3.5 rounded border border-[#D97706] bg-[#FFF7ED]" />
              <Text className="font-raleway-medium text-[11px] text-[#64748B]">Paused</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3.5 w-3.5 rounded bg-[#023E8A]" />
              <Text className="font-raleway-medium text-[11px] text-[#64748B]">Selected</Text>
            </View>
          </View>
        </View>

        {sortedSelected.length > 0 && (
          <View className="mt-4">
            <Text className="mb-2 font-raleway-semibold text-[13px] text-[#475569]">Selected dates</Text>
            <View className="flex-row flex-wrap gap-2">
              {sortedSelected.map((date) => (
                <View key={date} className="flex-row items-center gap-1.5 rounded-full border border-[#CBD5E1] px-2.5 py-1.5">
                  <Text className="font-raleway-medium text-[12px] text-[#334155]">{formatDate(date)}</Text>
                  <Pressable onPress={() => toggleDate(date)} hitSlop={8} accessibilityLabel={`Remove ${formatDate(date)} from selection`}>
                    <X size={13} color="#64748B" />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="mt-6 flex-row items-center gap-2">
          {selectedUnpauseCount > 0 && selectedPauseCount === 0
            ? <PlayCircle size={18} color="#B45309" />
            : <PauseCircle size={18} color={colors.primary} />}
          <Text className="flex-1 font-raleway-medium text-[12px] leading-5 text-[#64748B]">
            {pauseDates.length === 0 ? 'No dates paused.' : `${pauseDates.length} ${pauseDates.length === 1 ? 'date' : 'dates'} currently paused.`}
          </Text>
        </View>
        <View className="mt-4">
          <PrimaryButton
            label={buttonLabel}
            onPress={saveDates}
            disabled={selectedDates.length === 0 || pauseDatesIsSaving || !pauseDatesHasLoaded}
          />
        </View>
        </>}
      </ScrollView>
    </View>
  );
}
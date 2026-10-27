

import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import {
  EmptyState,
} from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOrders } from '@/store/slices/ordersSlice';
import { formatDate } from '@/lib/cutoff';
import { OrderSkeleton } from '@/components/OrderSkeleton';

const dayNames = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type Filter = 'All' | 'Upcoming' | 'Delivered' | 'Cancelled';

const filters: Filter[] = [
  'All',
  'Upcoming',
  'Delivered',
  'Cancelled',
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function OrdersScreen() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(
    (state) => state.orders.items
  );
  const ordersAreLoading = useAppSelector((state) => state.orders.isLoading);
  const ordersError = useAppSelector((state) => state.orders.error);

  const [filter, setFilter] = useState<Filter>('All');
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const dateStripRef = useRef<ScrollView>(null);
  const [dateStripWidth, setDateStripWidth] = useState(0);

  useEffect(() => {
    void dispatch(fetchOrders(selectedDate));
  }, [dispatch, selectedDate]);

  const dates = useMemo(() => {
    const daysInMonth = new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();

    return Array.from(
      { length: daysInMonth },
      (_, i) => {
        const dayNum = i + 1;

        const date = new Date(
          viewYear,
          viewMonth,
          dayNum
        );

        const value = dateKey(date);

        return {
          value,
          day: dayNames[date.getDay()],
          dateNum: dayNum,
        };
      }
    );
  }, [viewMonth, viewYear]);

  useEffect(() => {
    if (dateStripWidth === 0) return;
    const todayIndex = dates.findIndex((date) => date.value === dateKey(new Date()));
    if (todayIndex < 0) return;

    const cellWidth = 48;
    const cellGap = 8;
    const targetOffset = 20 + todayIndex * (cellWidth + cellGap) - (dateStripWidth - cellWidth) / 2;
    dateStripRef.current?.scrollTo({ x: Math.max(0, targetOffset), animated: false });
  }, [dateStripWidth, dates]);

  const filtered = useMemo(() => {
    let result =
      filter === 'All'
        ? orders
        : orders.filter(
            (order) => order.status === filter
          );

    if (selectedDate) {
      result = result.filter(
        (order) => order.date === selectedDate
      );
    }

    return result;
  }, [filter, selectedDate, orders]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();

    filtered.forEach((order) => {
      const list = map.get(order.date) ?? [];

      list.push(order);
      map.set(order.date, list);
    });

    return Array.from(map.entries()).sort(
      (left, right) =>
        left[0].localeCompare(right[0])
    );
  }, [filtered]);

  const dateHasOrders = (date: string) =>
    orders.some(
      (order) => order.date === date
    );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <View className="flex-1 bg-white">

      {/* ================= HEADER ================= */}

      <View className="bg-white">

       

        {/* Month Selector */}
        <View className="mb-3 mt-1 flex-row items-center justify-center gap-4">

          <Pressable
            onPress={prevMonth}
            hitSlop={12}
          >
            <ChevronLeft
              size={22}
              color="#111827"
            />
          </Pressable>

          <Text className="text-[22px] font-raleway-bold text-[#111827]">
            {monthNames[viewMonth]} {viewYear}
          </Text>

          <Pressable
            onPress={nextMonth}
            hitSlop={12}
          >
            <ChevronRight
              size={22}
              color="#111827"
            />
          </Pressable>

        </View>

        {/* Date Strip */}
        <ScrollView
          ref={dateStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setDateStripWidth(event.nativeEvent.layout.width)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 8,
            
          }}
        >
          {dates.map((d) => {
            const isSelected =
              selectedDate === d.value;

            const hasOrders =
              dateHasOrders(d.value);

            return (
              <Pressable
                key={d.value}
                className={
                  isSelected
                    ? 'h-[54px] w-[48px] p-1 items-center justify-center rounded-[14px] border border-[#023E8A] bg-[#023E8A]'
                    : 'h-[54px] w-[48px] p-1 items-center justify-center rounded-[14px] border border-[#E2E8F0] bg-white'
                }
                onPress={() => setSelectedDate(d.value)}
              >

                

                <Text
                  className={
                    isSelected
                      ? 'mt-[1px] text-[18px] font-bold text-white'
                      : 'mt-[1px] text-[18px] font-bold text-[#111827]'
                  }
                >
                  {d.dateNum}
                </Text>

                

              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filters */}
        <View className="my-[16px] flex-row gap-2 px-5">

          {filters.map((f) => {
            const active = filter === f;

            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={
                  active
                    ? 'h-8 justify-center rounded-[14px] border border-[#023E8A] bg-[#023E8A] px-[14px]'
                    : 'h-8 justify-center rounded-[14px] border border-[#E2E8F0] bg-white px-[14px]'
                }
              >
                <Text
                  className={
                    active
                      ? 'text-[12px] font-bold leading-[15px] text-white'
                      : 'text-[12px] font-bold leading-[15px] text-[#111827]'
                  }
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}

        </View>

        

      </View>


      {/* ================= ORDER LIST ================= */}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >

        {ordersAreLoading ? (
          <OrderSkeleton variant="list" />
        ) : ordersError ? (
          <View className="py-8">
            <Text className="text-center text-[14px] font-bold text-[#B91C1C]">{ordersError}</Text>
            <Pressable className="mt-3 items-center" onPress={() => dispatch(fetchOrders(selectedDate))}>
              <Text className="font-bold text-[#023E8A]">Retry</Text>
            </Pressable>
          </View>
        ) : grouped.length === 0 ? (

          <EmptyState
            icon="📦"
            title="No orders found"
            body={
              'No orders on this date. Try another date or filter.'
            }
            action="Browse products"
            onAction={() =>
              router.push('/products')
            }
          />

        ) : (

          grouped.map(
            ([date, dateOrders]) => (

              <View
                key={date}
                className="mb-5"
              >

               


                {/* Orders */}
                {dateOrders.map((order) => (

                  <Pressable
                    key={order.id}
                    className="mb-[10px] rounded-[16px] border border-[#E2E8F0] bg-white p-[14px]"
                    onPress={() =>
                      router.push(
                        `/order/${order.id}`
                      )
                    }
                  >

                    {/* Order Top */}
                    <View className="flex-row items-center justify-between">

                      <Text className="text-[16px] font-bold text-[#111827]">
                        {order.orderId ?? 'Order'}
                      </Text>

                      <View className="self-start rounded-xl bg-[#023E8A] px-[9px] py-1">
                        <Text className="text-[11px] font-raleway-semibold text-white">
                          {order.status}
                        </Text>
                      </View>

                    </View>


                    {/* Items */}
                    <Text
                      className="mt-2 text-[15px] font-raleway-bold text-[#111827]"
                      numberOfLines={1}
                    >
                      {order.items
                        .map((i) => i.name)
                        .join(', ')}
                    </Text>


                    {/* Bottom */}
                    <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">

                      <View>

                        <Text className="text-[17px] font-bold text-[#111827]">
                          ₹{order.totalPaid}
                        </Text>

                        <Text className="mt-[2px] text-[13px] font-raleway-semibold text-[#64748B]">
                          {order.items.reduce((units, item) => units + item.quantity, 0)} units
                        </Text>

                      </View>

                      <Text className="text-[13px] font-bold text-[#023E8A]">
                        View details 
                      </Text>

                    </View>

                  </Pressable>

                ))}

              </View>

            )
          )

        )}

      </ScrollView>

    </View>
  );
}

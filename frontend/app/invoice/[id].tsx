
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Download } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchOrderInvoice } from '@/store/slices/ordersSlice';

function SkeletonBar({ className }: { className: string }) {
  return <View className={`rounded bg-[#E2E8F0] ${className}`} />;
}

function InvoiceSkeleton() {
  return (
    <View className="flex-1 bg-[#F7F9FC]" accessibilityLabel="Loading invoice">
      <View className="mb-4 mt-2 flex-row items-center px-4 pt-2">
        <ArrowLeft size={28} color="#CBD5E1" />
        <SkeletonBar className="ml-3 h-6 w-36" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
        <View className="mt-2 rounded-[16px] border border-[#E2E8F0] bg-white p-3">
          <View className="flex-row justify-between border-b border-[#F1F5F9] pb-[14px]">
            <View>
              <SkeletonBar className="h-3 w-14" />
              <SkeletonBar className="mt-2 h-4 w-28" />
            </View>
            <View className="items-end">
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="mt-2 h-4 w-24" />
              <SkeletonBar className="mt-2 h-3 w-20" />
            </View>
          </View>
          <View className="flex-row justify-between border-b border-[#F1F5F9] py-3">
            <View>
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="mt-2 h-3 w-28" />
            </View>
            <View className="items-end">
              <SkeletonBar className="h-3 w-14" />
              <SkeletonBar className="mt-2 h-3 w-28" />
            </View>
          </View>
          <View className="border-b border-[#F1F5F9] py-3">
            <SkeletonBar className="h-3 w-32" />
            <SkeletonBar className="mt-2 h-3 w-4/5" />
          </View>
          <View className="mt-2 flex-row justify-between border-b border-[#F1F5F9] py-[10px]">
            <SkeletonBar className="h-4 w-14" />
            <SkeletonBar className="h-4 w-8" />
            <SkeletonBar className="h-4 w-10" />
            <SkeletonBar className="h-4 w-14" />
          </View>
          <View className="flex-row justify-between py-3">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-4 w-6" />
            <SkeletonBar className="h-4 w-10" />
            <SkeletonBar className="h-4 w-14" />
          </View>
          <View className="my-2 h-px bg-[#F1F5F9]" />
          <View className="flex-row justify-between py-2">
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-4 w-14" />
          </View>
          <View className="flex-row justify-between py-2">
            <SkeletonBar className="h-5 w-12" />
            <SkeletonBar className="h-5 w-16" />
          </View>
          <SkeletonBar className="mt-3 h-3 w-36" />
        </View>
        <SkeletonBar className="mt-5 h-[60px] w-full rounded-full" />
      </ScrollView>
    </View>
  );
}

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const inv = useAppSelector((state) => state.orders.invoice);
  const isLoading = useAppSelector((state) => state.orders.invoiceIsLoading);
  const error = useAppSelector((state) => state.orders.invoiceError);

  useEffect(() => {
    if (id) void dispatch(fetchOrderInvoice(id));
  }, [dispatch, id]);

  const handleDownload = () => {
    if (!inv) return;
    const content = [
      'DINESH FARMS - TAX INVOICE',
      `Invoice: ${inv.invoiceNumber}`,
      `Order: ${inv.orderId}`,
      `Date: ${inv.dateGenerated}`,
      '',
      'Sold By: Dinesh Farms',
      '',
      `Billed To: ${inv.billedTo}`,
      `Delivery Address: ${inv.deliveryAddress}`,
      '',
      'ITEM\t\tQTY\tRATE\tAMOUNT',
      `${inv.productName}\t\t${inv.quantity}\t${inv.rate}\t${inv.subtotal}`,
      '',
      `Subtotal: ${inv.subtotal}`,
      `Total: ${inv.total}`,
      `Payment Mode: ${inv.paymentMode}`,
      '',
      'Thank you for your business!',
    ].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([content], {
        type: 'text/plain',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `invoice-${inv.invoiceNumber}.txt`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } else {
      Alert.alert(
        'Invoice Downloaded',
        `Invoice ${inv.invoiceNumber} has been downloaded.`
      );
    }
  };

  if (!inv) {
    if (isLoading) return <InvoiceSkeleton />;

    return (
      <View className="flex-1 items-center justify-center bg-[#F7F9FC] px-6">
        <Text className="text-center font-bold text-[#475569]">
          {error ?? 'Invoice unavailable'}
        </Text>
        <Pressable className="mt-4" onPress={() => router.back()}><Text className="font-bold text-[#023E8A]">Go back</Text></Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F9FC]">

      {/* Back Button */}
     <View className="mb-4 mt-2 flex-row items-center px-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-3 font-bold text-[22px] text-[#111827]">
          {inv.invoiceNumber}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
       

        {/* Invoice Card */}
        <View className="mt-2 rounded-[16px] border border-[#E2E8F0] bg-white p-4
        
        ">

          {/* Seller / Customer */}
          <View className="flex-row justify-between border-b border-[#F1F5F9] pb-[14px]">

            <View>
              <Text className="text-[12px] font-raleway-bold text-black">
                Sold By
              </Text>

              <Text className="mt-[2px] text-[16px] font-raleway-bold text-[#111827]">Dinesh Farms</Text>
            </View>

            <View className="items-end">
              <Text className="text-[12px] font-raleway-bold text-black">
                Billed To
              </Text>

              <Text className="mt-[2px] text-[16px] font-raleway-bold text-[#111827]">
                {inv.billedTo}
              </Text>

              <Text className="mt-[2px] text-[12px] text-black">{inv.dateGenerated}</Text>
            </View>

          </View>

          <View className="flex-row justify-between border-b border-[#F1F5F9] py-3">
            <View className="flex-1 pr-2">
              <Text className="text-[12px] font-raleway-bold text-[#64748B]">Invoice ID</Text>
              <Text className="mt-1 text-[13px] font-bold text-[#111827]">{inv.invoiceNumber}</Text>
            </View>
            <View className="flex-1 items-end pl-2">
              <Text className="text-[12px] font-raleway-bold text-[#64748B]">Order ID</Text>
              <Text className="mt-1 text-[13px] font-bold text-[#111827]">{inv.orderId}</Text>
            </View>
          </View>

          <View className="border-b border-[#F1F5F9] py-3">
            <Text className="text-[14px] font-raleway-bold text-[#64748B]">Delivery Address</Text>
            <Text className="mt-1 text-[13px] font-raleway-bold text-[#111827]">{inv.deliveryAddress}</Text>
          </View>

          {/* Table Header */}
          <View className="mt-2 flex-row border-b border-[#F1F5F9] py-[10px]">

            <Text className="flex-[2] text-[15px] font-raleway-bold text-[#111827]">
              Item
            </Text>

            <Text className="flex-1 text-[15px] font-raleway-bold text-[#111827]">
              Qty
            </Text>

            <Text className="flex-1 text-[15px] font-raleway-bold text-[#111827]">
              Rate
            </Text>

            <Text className="flex-1 text-right text-[15px] font-raleway-bold text-[#111827]">
              Amount
            </Text>

          </View>

          {/* Items */}
          <View className="flex-row py-[10px]">
            <Text className="flex-[2] text-[15px] font-raleway-bold text-[#111827]">{inv.productName}</Text>
            <Text className="flex-1 text-[15px] font-bold text-[#111827]">{inv.quantity}</Text>
            <Text className="flex-1 text-[15px] font-bold text-[#111827]">₹{inv.rate}</Text>
            <Text className="flex-1 text-right text-[15px] font-bold text-[#111827]">₹{inv.subtotal}</Text>
          </View>

          {/* Divider */}
          <View className="my-2 h-px bg-[#F1F5F9]" />

          {/* Summary */}
          <View className="flex-row justify-between py-1">
            <Text className="text-[15px] font-raleway-bold text-[#64748B]">
              Subtotal
            </Text>

            <Text className="text-[15px] font-bold text-[#111827]">
              ₹{inv.subtotal}
            </Text>
          </View>

          {/* Total Divider */}
          <View className="my-2 h-px bg-[#F1F5F9]" />

          {/* Total */}
          <View className="flex-row justify-between py-1">
            <Text className="text-[16px] font-raleway-bold text-[#111827]">
              Total
            </Text>

            <Text className="text-[15px] font-bold text-[#111827]">
              ₹{inv.total}
            </Text>
          </View>

          {/* Payment Mode */}
          <Text className="mt-[10px] text-[13px] font-raleway-bold text-[#64748B]">
            Payment Mode: {inv.paymentMode}
          </Text>

        </View>

        {/* Download Button */}
        <Pressable
          className="mt-5 flex-row  h-[60px] items-center justify-center gap-2 rounded-full bg-[#023E8A] py-[14px]"
          onPress={handleDownload}
        >
          <Download size={16} color="#fff" />

          <Text className="text-[16px] font-raleway-bold text-white">
            Download Invoice
          </Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

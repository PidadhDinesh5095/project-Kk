import { View } from 'react-native';

type OrderSkeletonVariant = 'list' | 'detail';

function Bar({ className }: { className: string }) {
  return <View className={`rounded bg-[#E2E8F0] ${className}`} />;
}

function OrderCardSkeleton() {
  return (
    <View className="mb-3 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Bar className="h-4 w-40" />
        <Bar className="h-6 w-20 rounded-full" />
      </View>
      <Bar className="mt-4 h-4 w-3/4" />
      <View className="mt-4 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
        <View>
          <Bar className="h-4 w-20" />
          <Bar className="mt-2 h-3 w-14" />
        </View>
        <Bar className="h-3 w-24" />
      </View>
    </View>
  );
}

export function OrderSkeleton({ variant }: { variant: OrderSkeletonVariant }) {
  if (variant === 'list') {
    return (
      <View accessibilityLabel="Loading orders">
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </View>
    );
  }

  return (
    <View accessibilityLabel="Loading order details">
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Bar className="h-5 w-44" />
          <Bar className="mt-2 h-3 w-24" />
        </View>
        <Bar className="h-6 w-20 rounded-full" />
      </View>
      <View className="rounded-[14px] border border-[#E2E8F0] bg-white p-4">
        <Bar className="h-4 w-20" />
        <View className="mt-4 flex-row items-center gap-3">
          <Bar className="h-14 w-14 rounded-[10px]" />
          <View className="flex-1">
            <Bar className="h-4 w-3/4" />
            <Bar className="mt-2 h-3 w-1/2" />
          </View>
          <Bar className="h-4 w-14" />
        </View>
      </View>
      <View className="mt-5 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
        <Bar className="h-4 w-36" />
        <Bar className="mt-4 h-3 w-4/5" />
        <Bar className="mt-3 h-3 w-2/3" />
      </View>
      <View className="mt-5 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
        <Bar className="h-4 w-32" />
        <Bar className="mt-4 h-3 w-full" />
        <Bar className="mt-3 h-3 w-full" />
        <Bar className="mt-3 h-px w-full" />
        <Bar className="mt-3 h-4 w-full" />
      </View>
    </View>
  );
}

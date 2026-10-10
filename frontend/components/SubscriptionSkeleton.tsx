import { View } from 'react-native';

type SubscriptionSkeletonVariant = 'list' | 'detail' | 'pause' | 'skip';

function Bar({ className }: { className: string }) {
  return <View className={`rounded bg-[#E2E8F0] ${className}`} />;
}

function SubscriptionCardSkeleton() {
  return (
    <View className="mb-3 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Bar className="h-4 w-36" />
        <Bar className="h-6 w-20 rounded-full" />
      </View>
      <Bar className="mt-3 h-3 w-3/4" />
      <Bar className="mt-2 h-3 w-1/2" />
      <View className="mt-4 flex-row gap-2 border-t border-[#F1F5F9] pt-3">
        <Bar className="h-9 w-20 rounded-[9px]" />
        <Bar className="h-9 w-20 rounded-[9px]" />
        <Bar className="h-9 w-20 rounded-[9px]" />
      </View>
    </View>
  );
}

export function SubscriptionSkeleton({ variant }: { variant: SubscriptionSkeletonVariant }) {
  if (variant === 'list') {
    return (
      <View accessibilityLabel="Loading subscriptions">
        <SubscriptionCardSkeleton />
        <SubscriptionCardSkeleton />
      </View>
    );
  }

  return (
    <View accessibilityLabel="Loading subscription details">
      <View className="rounded-[14px] border border-[#E2E8F0] bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Bar className="h-4 w-32" />
          <Bar className="h-6 w-20 rounded-full" />
        </View>
        <Bar className="mt-4 h-5 w-2/3" />
        <Bar className="mt-3 h-3 w-1/2" />
        {variant !== 'detail' && <Bar className="mt-2 h-3 w-3/4" />}
      </View>

      {variant === 'detail' && (
        <View className="mt-5 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
          <Bar className="h-4 w-36" />
          <Bar className="mt-4 h-3 w-4/5" />
          <Bar className="mt-3 h-3 w-2/3" />
          <Bar className="mt-3 h-3 w-3/4" />
        </View>
      )}

      {variant === 'skip' && (
        <View className="mt-5 rounded-[14px] border border-[#E2E8F0] bg-white p-4">
          <Bar className="mb-5 h-4 w-32 self-center" />
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {Array.from({ length: 35 }, (_, index) => (
              <Bar key={index} className="h-9 w-[11%] rounded-full" />
            ))}
          </View>
        </View>
      )}

      {variant !== 'detail' && variant !== 'skip' && (
        <View className="mt-5 rounded-[14px] bg-white p-4">
          <Bar className="h-3 w-4/5" />
          <Bar className="mt-3 h-3 w-2/3" />
          <Bar className="mt-6 h-12 w-full rounded-[12px]" />
        </View>
      )}
    </View>
  );
}
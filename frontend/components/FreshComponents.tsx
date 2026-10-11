
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { Product } from '@/types/fresh';
import { router } from 'expo-router';

export const colors = {
  primary: '#023E8A',
  deep: '#173FCC',
  bg: '#FFFFFF',
  mist: '#F5F7FB',
  green: '#22C55E',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  red: '#EF4444',
  amber: '#F59E0B',
};

export function WalletChip({
  balance,
  onPress,
}: {
  balance: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-[5px] rounded-[18px] bg-[#EEF3FF] px-[11px] py-2"
    >
      <Text className="text-[13px] font-raleway-semibold text-[#023E8A]">
        ▣
      </Text>

      <Text className="text-[12px]  text-[#023E8A]">
        ₹{balance.toFixed(2)}
      </Text>

      <ChevronRight
        size={14}
        color={colors.primary}
      />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[55px] flex-row items-center justify-center gap-2 rounded-full bg-[#023E8A] ${disabled ? 'opacity-[0.45]' : ''
        }`}
    >
      <Text className="text-[18px] font-raleway-semibold text-white">
        {label}
      </Text>

     
    </Pressable>
  );
}

export function StatusPill({
  label,
}: {
  label: string;
}) {
  const tone = label === 'Active'
    ? 'active'
    : label === 'Delivered'
    ? 'green'
    : label === 'Cancelled'
      ? 'red'
      : label === 'Paused'
        ? 'paused'
      : 'blue';

  return (
    <View
      className={`self-start rounded-xl px-[9px] py-1 ${tone === 'green'
        ? 'bg-[#DCFCE7]'
        : tone === 'red'
          ? 'bg-[#FEE2E2]'
          : tone === 'active'
            ? 'bg-[#023E8A]'
            : tone === 'paused'
              ? 'bg-[#FFF7ED]'
            : 'bg-[#E0EAFF]'
        }`}
    >
      <Text
        className={`text-[11px] font-raleway-semibold ${tone === 'green'
          ? 'text-[#15803D]'
          : tone === 'red'
            ? 'text-[#B91C1C]'
            : tone === 'active'
              ? 'text-white'
              : tone === 'paused'
                ? 'text-[#B45309]'
              : 'text-[#023E8A]'
          }`}
      >
        {label}
      </Text>
    </View>
  );
}

const productImages: Record<string, any> = {
  'A2BufalloMilk-removebg-preview.png': require('@/assets/images/products/A2BufalloMilk-removebg-preview.png'),
  'CowMilk-removebg-preview.png': require('@/assets/images/products/CowMilk-removebg-preview.png'),
  'TonedMilk-removebg-preview.png': require('@/assets/images/products/TonedMilk-removebg-preview.png'),
  'SkimMilk-removebg-preview.png': require('@/assets/images/products/SkimMilk-removebg-preview.png'),
  'HighProteinMilk-removebg-preview.png': require('@/assets/images/products/HighProteinMilk-removebg-preview.png'),
  'malaipanner-removebg-preview.png': require('@/assets/images/products/malaipanner-removebg-preview.png'),
  'Curd-removebg-preview.png': require('@/assets/images/products/Curd-removebg-preview.png'),
  'CowCurd-removebg-preview.png': require('@/assets/images/products/CowCurd-removebg-preview.png'),
  'buffaloghee-removebg-preview.png': require('@/assets/images/products/buffaloghee-removebg-preview.png'),
  'cowghee-removebg-preview.png': require('@/assets/images/products/cowghee-removebg-preview.png'),
  'buffalobutter-removebg-preview.png': require('@/assets/images/products/buffalobutter-removebg-preview.png'),
  'cowbutter-removebg-preview.png': require('@/assets/images/products/cowbutter-removebg-preview.png'),
};


export function ProductCard({
  product,
  onPress,
  onAdd,
}: {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
}) {
  const imageSource = product.mainImgNobg
    ? { uri: product.mainImgNobg }
    : product.imageFile
    ? productImages[product.imageFile]
    : productImages[product.id];

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl  p-2"
    >
      <View className="flex-row">
        <View className="h-[110px] w-[110px] items-center m-2 justify-center overflow-hidden rounded-xl">
          {imageSource ? (
            <Image
              source={imageSource}
              className="h-full w-full"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-[13px] font-raleway-semibold text-[#94A3B8]">
              {product.imageLabel}
            </Text>
          )}
        </View>

        <View className="ml-6 mt-2 flex-1">
          <Text
            numberOfLines={1}
            className="text-[1.25rem] font-raleway-bold text-[#0F172A]"
          >
            {product.name}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-1 text-[0.88rem] font-raleway-semibold text-[#64748B]"
          >
            <Text style={{ fontFamily: 'System',  }}>
              {product.size}
            </Text>
            {' · Fresh daily'}
          </Text>

          <View className="mt-2 flex-row gap-[5px]">
            {product.tags.slice(0, 2).map((tag) => (
              <View
                key={tag}
                className="rounded-[10px] bg-[#EEF3FF] px-1 py-[3px]"
              >
                <Text className="text-[0.85rem] font-raleway-semibold text-[#023E8A]">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-2 flex-row items-center">
            <Text className="text-[1.25rem]  text-[#0F172A]">
              ₹{product.price}
            </Text>

            <Text className="ml-2 text-[0.88rem] font-raleway-semibold text-[#64748B] line-through">
              ₹{product.mrp}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={() => router.push(`/subscribe/${product.id}`)}
          className="flex-1 h-12 items-center justify-center rounded-full border border-[#023E8A] py-[8px]"
        >
          <Text className="text-[16px] font-raleway-bold text-[#023E8A]">
            Subscribe
          </Text>
        </Pressable>

        <Pressable
          onPress={onAdd}
          className="flex-1 h-12 flex-row items-center justify-center gap-[4px] rounded-full bg-[#023E8A] py-[8px]"
        >
          <Plus size={14} color="#FFFFFF" />

          <Text className="text-[16px] font-raleway-bold text-white">
            Add
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ProductCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl bg-neutral-100 p-2">
      <View className="flex-row">
        <View className="m-2 h-[110px] w-[110px] rounded-xl bg-[#E2E8F0]" />
        <View className="ml-6 mt-3 flex-1">
          <View className="h-5 w-4/5 rounded bg-[#E2E8F0]" />
          <View className="mt-3 h-3 w-3/5 rounded bg-[#E2E8F0]" />
          <View className="mt-3 h-5 w-2/3 rounded bg-[#E2E8F0]" />
          <View className="mt-3 h-5 w-1/2 rounded bg-[#E2E8F0]" />
        </View>
      </View>
      <View className="mt-2 h-12 rounded-full bg-[#E2E8F0]" />
    </View>
  );
}


export function TrustBadgeRow() {
  return (
    <View className="my-3 h-14  flex-row justify-around rounded-[14px] bg-neutral-100 p-3">
      <View className="flex-row items-center gap-1">
        <ShieldCheck
          size={18}
          color={colors.primary}
        />

        <Text className="text-[14px] font-raleway-semibold text-[#0F172A]">
          Lab Tested
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        <ShieldCheck
          size={18}
          color={colors.green}
        />

        <Text className="text-[14px] font-raleway-semibold text-[#0F172A]">
          No Additives
        </Text>
      </View>

      <View className="flex-row items-center gap-1">
        <ShieldCheck
          size={18}
          color={colors.primary}
        />

        <Text className="text-[14px] font-raleway-semibold   text-[#0F172A]">
          Farm Fresh
        </Text>
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="min-h-[300px] flex-1 items-center justify-center px-7">
      <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EEF3FF]">
        <Text className="text-[28px] text-[#023E8A]">
          {icon}
        </Text>
      </View>

      <Text className="text-[16px] font-raleway-semibold text-[#0F172A]">
        {title}
      </Text>

      <Text className="mt-2 max-w-[280px] text-center font-raleway-semibold leading-5 text-[#64748B]">
        {body}
      </Text>

      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text className="text-[12px] font-raleway-semibold text-[#023E8A]">
            {action} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View className="h-[54px] flex-row items-center justify-between border-b border-[#F1F5F9]">
      <Pressable
        className="ml-4 mt-2"
        onPress={onBack}
        hitSlop={12}
      >
        {onBack ? <ArrowLeft size={28} color="#0F172A" /> : null}
      </Pressable>

      <Text className="text-[22px] font-raleway-semibold text-[#0F172A]">
        {title}
      </Text>

      <View className="w-[76px] items-end">
        {right}
      </View>
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3 mt-2 flex-row items-center justify-between">
      <Text className="text-[18px] font-raleway-bold text-[#0F172A]">
        {title}
      </Text>

      {action ? (
        <Pressable onPress={onAction}>
          <Text className="text-[12px] font-raleway-semibold text-[#023E8A]">
            {action} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
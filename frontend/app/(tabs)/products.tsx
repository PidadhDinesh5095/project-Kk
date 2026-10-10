
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ProductCard, ProductCardSkeleton, TrustBadgeRow, WalletChip } from '@/components/FreshComponents';
import { fetchProductCategories, fetchProducts } from '@/store/slices/productsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useFreshStore } from '@/store/useFreshStore';

export default function ProductsScreen() {
  const [type, setType] = useState<'Dairy' | 'Non-Dairy'>('Dairy');
  const [category, setCategory] = useState('All');
  const dispatch = useAppDispatch();
  const { categories, categoriesStatus, categoriesError, categoriesHasLoaded } = useAppSelector((state) => state.products);
  const { walletBalance, products, productsStatus, productsError, productsHasLoaded } = useFreshStore();

  useFocusEffect(
    useCallback(() => {
      if (!productsHasLoaded && productsStatus !== 'loading') dispatch(fetchProducts());
      if (!categoriesHasLoaded && categoriesStatus !== 'loading') dispatch(fetchProductCategories());
    }, [categoriesHasLoaded, categoriesStatus, dispatch, productsHasLoaded, productsStatus]),
  );

  const categoryOptions = categories.filter((item) =>
    item.type === 'All' || (type === 'Dairy'
      ? item.type !== 'Dairy' && item.type !== 'Non Dairy'
      : false)
  );
  const typeImages = {
    Dairy: categories.find((item) => item.type === 'Dairy')?.image_url,
    'Non-Dairy': categories.find((item) => item.type === 'Non Dairy')?.image_url,
  };

  const visibleProducts = useMemo(() => {
    const source = products.filter((product) =>
      type === 'Dairy' ? product.category !== 'NON_DAIRY' : product.category === 'NON_DAIRY'
    );
    return category === 'All'
      ? source
      : source.filter((product) => product.category === category);
  }, [category, type, products]);

  const chooseType = (next: 'Dairy' | 'Non-Dairy') => {
    setType(next);
    setCategory('All');
  };

  return (
    <View className="flex-1 pt-2 bg-white">

      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-5">
        <Text className="text-[22px] font-raleway-bold text-[#111827]">
          Products
        </Text>

        <WalletChip
          balance={walletBalance}
          onPress={() => router.push('/wallet')}
        />
      </View>

      <View className="mt-4 px-5">
        <View className="flex-row items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
          {(['Dairy', 'Non-Dairy'] as const).map((item) => {
            const active = type === item;

            return (
              <Pressable
                key={item}
                onPress={() => chooseType(item)}
                className={`flex-1 items-center justify-center border-b-2 pb-2 ${
                  active ? 'border-[#023E8A]' : 'border-transparent'
                }`}
              >
                <View className="flex-row items-center gap-2">
                  <Image
                    source={typeImages[item] ? { uri: typeImages[item] } : undefined}
                    className="h-8 w-8"
                    resizeMode="contain"
                  />
                  <Text
                    className={`text-[14px] font-raleway-bold ${
                      active ? 'text-[#023E8A]' : 'text-[#64748B]'
                    }`}
                  >
                    {item}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-1 flex-row gap-2">
          {categoriesStatus === 'loading' || categoriesStatus === 'idle' ? (
            Array.from({ length: type === 'Dairy' ? 6 : 1 }, (_, index) => (
              <View key={index} className="flex-1 items-center">
                <View className="h-10 w-10 rounded-xl bg-[#E2E8F0]" />
                <View className="mt-2 h-3 w-10 rounded bg-[#E2E8F0]" />
              </View>
            ))
          ) : categoriesStatus === 'failed' ? (
            <Pressable
              onPress={() => dispatch(fetchProductCategories())}
              className="flex-1 items-center py-4"
            >
              <Text className="text-[12px] font-raleway-semibold text-[#64748B]">
                {categoriesError ?? 'Unable to load categories'}
              </Text>
              <Text className="mt-1 text-[12px] font-raleway-bold text-[#023E8A]">Tap to retry</Text>
            </Pressable>
          ) : categoryOptions.map((item) => {
            const label = item.type;
            const currentKey = label === 'All' ? 'All' : label.toUpperCase();
            const active = category === currentKey;

            return (
              <Pressable
                key={currentKey}
                onPress={() => setCategory(currentKey)}
                className={`flex-1 items-center justify-center rounded-[18px] `}
                style={{ minWidth: 0 }}
              >
                <Image
                  source={{ uri: item.image_url }}
                  className="h-10 w-10"
                  resizeMode="contain"
                />

                <Text
                  className={`mt-2 text-center text-[12px] font-raleway-bold ${
                    active ? 'text-[#023E8A]' : 'text-[#475569]'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-4 flex-row px-5">

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 100,
          }}
        >
          {productsStatus === 'idle' || productsStatus === 'loading' ? (
            Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
          ) : productsStatus === 'failed' ? (
            <View className="items-center py-10">
              <Text className="text-center text-[14px] font-raleway-semibold text-[#475569]">
                {productsError ?? 'Unable to load products'}
              </Text>
              <Pressable
                onPress={() => dispatch(fetchProducts())}
                className="mt-4 rounded-full bg-[#023E8A] px-5 py-3"
              >
                <Text className="text-[14px] font-raleway-bold text-white">Try again</Text>
              </Pressable>
            </View>
          ) : visibleProducts.length === 0 ? (
            <View className="items-center py-[60px]">
              <Text className="text-[16px] font-bold text-[#111827]">
                No products found
              </Text>
            </View>
          ) : (
            visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
                onAdd={() => router.push(`/product/${product.id}`)}
              />
            ))
          )}

          <TrustBadgeRow />
        </ScrollView>
      </View>
    </View>
  );
}

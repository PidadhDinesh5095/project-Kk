import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  DoorOpen,
  Footprints,
  Home,
  MapPin,
  Package,
  PawPrint,
  ShieldCheck,
} from 'lucide-react-native';
import { colors } from '@/components/FreshComponents';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  AddressFields,
  DeliveryInstruction,
  ResidenceType as ApiResidenceType,
  clearAddressError,
  saveAddress,
  updateAddress,
} from '@/store/slices/addressesSlice';
import { useFreshStore } from '@/store/useFreshStore';

const residenceTypes = [
  { key: 'Community/Apartment', icon: Building2 },
  { key: 'Independent', icon: Home },
] as const;

type ResidenceType = (typeof residenceTypes)[number]['key'];
type AddressResultModal = {
  title: string;
  message: string;
  tone: 'success' | 'warning' | 'error';
  destination: 'addresses' | 'subscriptions' | 'tabs' | 'complete-profile' | null;
};

// Each instruction can conflict with others — selecting one clears/disables its conflicts.
const instructionOptions = [
  { key: 'Pet at home', icon: PawPrint },
  { key: 'Leave at door', icon: DoorOpen },
  { key: 'Ring bell', icon: Bell },
  { key: 'Place in bag', icon: Package },
  { key: 'At shoe rack', icon: Footprints },
  { key: 'At security', icon: ShieldCheck },
] as const;

const CONFLICTS: Record<string, string[]> = {
  'Pet at home': ['Ring bell', 'At security'],
  'Ring bell': ['Pet at home', 'At security',],
  'Place in bag': ['Leave at door', 'At security', 'At shoe rack',],
  'Leave at door': ['Place in bag', 'At security', 'At shoe rack',],
  'At shoe rack': ['Place in bag', 'Leave at door', 'At security',],
};

export default function AddressSetupScreen() {
  const { addresses, profile } = useFreshStore();
  const dispatch = useAppDispatch();
  const addressLoading = useAppSelector((state) => state.addresses.isSaving || state.addresses.isUpdating);
  const params = useLocalSearchParams<{
    addressId?: string;
    returnTo?: string;
    residenceType?: string;
    flatNoApartmentFloor?: string;
    blockTower?: string;
    landmark?: string;
    deliveryInstructions?: string;
    fullAddress?: string;
    areaName?: string;
    city?: string;
    pincode?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const [residenceType, setResidenceType] = useState<ResidenceType>(
    'Community/Apartment',
  );
  const [flatDetails, setFlatDetails] = useState('');
  const [blockTower, setBlockTower] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [currentLocationText, setCurrentLocationText] = useState('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [resultModal, setResultModal] = useState<AddressResultModal | null>(null);

  // Populate address fields when editing or returning from the map picker.
  useEffect(() => {
    if (params.addressId || params.flatNoApartmentFloor) {
      setResidenceType(params.residenceType === 'INDEPENDENT' ? 'Independent' : 'Community/Apartment');
      setFlatDetails(params.flatNoApartmentFloor ?? '');
      setBlockTower(params.blockTower ?? '');
      setLandmark(params.landmark ?? '');
      setInstructions(
        (params.deliveryInstructions ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      );
      setCurrentLocationText(params.fullAddress || params.city || 'Saved location');
    }
    if (params.fullAddress) setCurrentLocationText(params.fullAddress);
    if (params.pincode) setPincode(params.pincode);
  }, [
    params.addressId,
    params.residenceType,
    params.flatNoApartmentFloor,
    params.blockTower,
    params.landmark,
    params.deliveryInstructions,
    params.fullAddress,
    params.city,
    params.pincode,
  ]);

  const toggleInstruction = (key: string) => {
    setInstructions((prev) => {
      const isSelected = prev.includes(key);

      if (isSelected) {
        return prev.filter((item) => item !== key);
      }

      // Remove any conflicting selections before adding this one
      const conflicts = CONFLICTS[key] ?? [];
      const withoutConflicts = prev.filter((item) => !conflicts.includes(item));
      return [...withoutConflicts, key];
    });
  };

  const isInstructionDisabled = (key: string) => {
    const conflicts = CONFLICTS[key] ?? [];
    return conflicts.some((c) => instructions.includes(c));
  };

  const canSubmit =
    flatDetails.trim().length > 0 &&
    (residenceType === 'Independent' || blockTower.trim().length > 0) &&
    /^\d{6}$/.test(pincode.trim()) &&
    currentLocationText.trim().length > 0 &&
    params.latitude !== undefined && Number.isFinite(Number(params.latitude)) &&
    params.longitude !== undefined && Number.isFinite(Number(params.longitude));

  const handleSubmit = async () => {
    if (!canSubmit || addressLoading) return;

    const instructionValues: Record<string, DeliveryInstruction> = {
      'Pet at home': 'PET_AT_HOME',
      'Leave at door': 'LEAVE_AT_DOOR',
      'Ring bell': 'RING_BELL',
      'Place in bag': 'PLACE_IN_BAG',
      'At shoe rack': 'AT_SHOE_RACK',
      'At security': 'AT_SECURITY',
    };

    try {
      const addressFields: AddressFields = {
        residenceType: (residenceType === 'Community/Apartment' ? 'COMMUNITY_APARTMENT' : 'INDEPENDENT') as ApiResidenceType,
        flatNoApartmentFloor: flatDetails.trim(),
        blockTower: residenceType === 'Community/Apartment' ? blockTower.trim() : '',
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        lat: Number(params.latitude),
        lng: Number(params.longitude),
        deliveryInstructions: instructions.map((instruction) => instructionValues[instruction]),
        city: params.city ?? '',
      };

      if (params.addressId) {
        const result = await dispatch(updateAddress({ ...addressFields, id: params.addressId })).unwrap();
        const isServiceable = result.address.isServiceable;
        setResultModal({
          title: isServiceable ? 'Address updated' : 'Address updated, service unavailable',
          message: isServiceable
            ? result.message
            : `${result.message}. Delivery is not available at this location.`,
          tone: isServiceable ? 'success' : 'warning',
          destination: params.returnTo === 'subscriptions' ? 'subscriptions' : 'addresses',
        });
        return;
      }

      const result = await dispatch(saveAddress({
        ...addressFields,
        isDefault: !addresses.some((address) => address.isServiceable),
      })).unwrap();

      const isServiceable = result.address.isServiceable;
      setResultModal({
        title: isServiceable ? 'Address saved' : 'Service not available',
        message: result.message,
        tone: isServiceable ? 'success' : 'warning',
        destination: params.returnTo === 'subscriptions'
          ? 'subscriptions'
          : profile.profileCompleted
            ? 'tabs'
            : 'complete-profile',
      });
    } catch (error) {
      const message = typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : 'Unable to save the address. Please try again.';
      dispatch(clearAddressError());
      const cannotEdit = params.addressId && message.toLowerCase().includes("can't be changed");
      setResultModal({
        title: cannotEdit ? "Address can't be edited" : params.addressId ? 'Unable to update address' : 'Unable to save address',
        message,
        tone: cannotEdit ? 'warning' : 'error',
        destination: null,
      });
    }
  };

  return (
    <View className="flex-1  bg-white">
      <View className="flex-row items-center px-4 mb-4 mt-2 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <ArrowLeft size={28} color="#111827" />
        </Pressable>
        <Text className="ml-4 text-[24px] font-raleway-semibold text-[#111827]">
          {params.addressId ? 'Edit Address' : 'Address'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>


        {/* Residence Type */}
        <Text className="mb-2  text-[14px] font-raleway-semibold text-[#64748B]">
          Select your Residence Type
        </Text>

        <View className="flex-row gap-2.5">
          {residenceTypes.map(({ key, icon: Icon }) => {
            const selected = residenceType === key;
            return (
              <Pressable
                key={key}
                onPress={() => setResidenceType(key)}
                className={`flex-1 flex-row items-center gap-2 rounded-full px-4 py-3.5 ${selected ? 'bg-[#111827]' : 'bg-[#F5F7FB]'
                  }`}
              >
                <View
                  className={`h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${selected ? 'border-[#023E8A] bg-[#023E8A]' : 'border-[#CBD5E1]'
                    }`}
                >
                  {selected && <View className="h-[8px] w-[8px] rounded-full bg-black" />}
                </View>
                <Text
                  className={`text-[13px] font-raleway-semibold ${selected ? 'text-white' : 'text-[#111827]'
                    }`}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Current Location — filled from the map picker, tap to change */}
        <Text className="mb-2 mt-2.5 text-[15px] font-raleway-semibold text-[#111827]">
          Current Location <Text className="text-red-500">*</Text>
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/map-picker',
              params: {
                addressId: params.addressId ?? '',
                returnTo: params.returnTo ?? '',
                residenceType: residenceType === 'Community/Apartment' ? 'COMMUNITY_APARTMENT' : 'INDEPENDENT',
                flatNoApartmentFloor: flatDetails,
                blockTower,
                landmark,
                deliveryInstructions: instructions.join(', '),
                currentFullAddress: currentLocationText,
                city: params.city ?? '',
                pincode,
                latitude: params.latitude ?? '',
                longitude: params.longitude ?? '',
              },
            })
          }
          className="mb-2.5 flex-row items-start gap-2 rounded-xl border border-[#E2E8F0] px-[14px] py-[14px]"
        >
          <MapPin size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-[14px] leading-[20px] font-raleway-semibold text-[#111827]">
            {currentLocationText || 'Tap to select your location on map'}
          </Text>
        </Pressable>
        {/* Flat / Apartment */}
        <Text className="mb-2 mt-6 text-[15px] font-raleway-semibold text-[#111827]">
          Flat No./Apartment Name/Floor <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className="mb-2.5 rounded-xl border border-[#E2E8F0] px-[14px] py-[14px] text-[15px] font-raleway-semibold text-[#111827]"
          placeholder="e.g. N2001, Purva Highland, 20th Floor"
          placeholderTextColor={colors.muted}
          value={flatDetails}
          onChangeText={setFlatDetails}
        />

        {/* Block/Tower — only relevant for apartments/communities */}
        {residenceType === 'Community/Apartment' && (
          <>
            <Text className="mb-2 mt-2.5 text-[15px] font-raleway-semibold text-[#111827]">
              Block/Tower <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="mb-2.5 rounded-xl border border-[#E2E8F0] px-[14px] py-[14px] text-[15px] font-raleway-semibold text-[#111827]"
              placeholder="e.g. N Block"
              placeholderTextColor={colors.muted}
              value={blockTower}
              onChangeText={setBlockTower}
            />
          </>
        )}

        {/* Pincode */}
        <Text className="mb-2 mt-2.5 text-[15px] font-raleway-semibold text-[#111827]">
          Pincode <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className="mb-2.5 rounded-xl border border-[#E2E8F0] px-[14px] py-[14px] text-[15px] font-raleway-semibold text-[#111827]"
          placeholder="e.g. 500039"
          placeholderTextColor={colors.muted}
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          maxLength={6}
        />

        {/* Landmark */}
        <Text className="mb-2 mt-2.5 text-[15px] font-raleway-semibold text-[#111827]">
          Landmark
        </Text>
        <TextInput
          className="mb-2.5 rounded-xl border border-[#E2E8F0] px-[14px] py-[14px] text-[15px] font-raleway-semibold text-[#111827]"
          placeholder="e.g. Near Holiday Village"
          placeholderTextColor={colors.muted}
          value={landmark}
          onChangeText={setLandmark}
        />



        {/* Delivery Instructions */}
        <Text className="mb-2 mt-6 text-[15px] font-raleway-semibold text-[#111827]">
          Delivery Instructions
        </Text>

        <View className="flex-row flex-wrap gap-2.5">
          {instructionOptions.map(({ key, icon: Icon }) => {
            const selected = instructions.includes(key);
            const disabled = !selected && isInstructionDisabled(key);

            return (
              <Pressable
                key={key}
                onPress={() => !disabled && toggleInstruction(key)}
                disabled={disabled}
                className={`w-[31%] items-center gap-1.5 rounded-2xl border px-2 py-3.5 ${selected
                    ? 'border-[#111827] bg-[#111827]'
                    : disabled
                      ? 'border-[#E2E8F0] opacity-40'
                      : 'border-[#E2E8F0]'
                  }`}
              >
                <View className="relative">
                  <Icon size={26} color={selected ? '#023E8A' : '#64748B'} />
                  {selected && (
                    <View className="absolute -right-1.5 -top-1.5 h-[16px] w-[16px] items-center justify-center rounded-md bg-[#023E8A]">
                      <Check size={10} color="#111827" />
                    </View>
                  )}
                </View>
                <Text
                  className={`text-center text-[12px] font-raleway-semibold ${selected ? 'text-white' : 'text-[#111827]'
                    }`}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Cutoff */}
        <View className="mt-5 flex-row items-center gap-2 rounded-xl bg-[#EEF3FF] p-3">
          <Clock size={14} color={colors.primary} />
          <Text className="flex-1 text-[12px] font-raleway-semibold text-[#023E8A]">
            Order before 10 PM for next-day morning delivery
          </Text>
        </View>

        <View className="mt-7">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || addressLoading}
            className={`h-16 items-center justify-center rounded-full px-4 py-3 ${canSubmit && !addressLoading ? 'bg-[#023E8A]' : 'bg-[#93A9FF]'}`}
          >
            {addressLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-center text-[20px] font-raleway-semibold text-white">
                {params.addressId ? 'Update Address' : 'Save & Continue'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={resultModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setResultModal(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-[380px] rounded-[24px] bg-white px-6 pb-6 pt-7">
            <View className={`mb-4 h-14 w-14 self-center items-center justify-center rounded-full ${
              resultModal?.tone === 'success'
                ? 'bg-[#DCFCE7]'
                : resultModal?.tone === 'warning'
                  ? 'bg-[#FEF3C7]'
                  : 'bg-[#FEE2E2]'
            }`}>
              {resultModal?.tone === 'success' ? (
                <CircleCheck size={28} color="#16A34A" />
              ) : (
                <CircleAlert
                  size={28}
                  color={resultModal?.tone === 'warning' ? '#B45309' : colors.red}
                />
              )}
            </View>
            <Text className="text-center text-[20px] font-raleway-semibold text-[#111827]">
              {resultModal?.title}
            </Text>
            <Text className="mt-2 text-center text-[14px] font-raleway-semibold leading-5 text-[#64748B]">
              {resultModal?.message}
            </Text>
            <Pressable
              className={`mt-6 h-12 items-center justify-center rounded-full ${
                resultModal?.tone === 'success'
                  ? 'bg-[#023E8A]'
                  : resultModal?.tone === 'warning'
                    ? 'bg-[#B45309]'
                    : 'bg-[#EF4444]'
              }`}
              onPress={() => {
                const destination = resultModal?.destination;
                setResultModal(null);
                if (destination === 'addresses') router.replace('/addresses');
                if (destination === 'subscriptions') router.replace('/subscriptions');
                if (destination === 'tabs') router.replace('/(tabs)');
                if (destination === 'complete-profile') router.replace('/complete-profile');
              }}
            >
              <Text className="text-[15px] font-raleway-semibold text-white">
                {resultModal?.destination ? 'Continue' : 'Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

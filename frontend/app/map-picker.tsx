import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, LocateFixed, MapPin, Search } from 'lucide-react-native';
import { colors } from '@/components/FreshComponents';

const DEFAULT_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function MapPickerScreen() {
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{
    addressId?: string;
    returnTo?: string;
    residenceType?: string;
    flatNoApartmentFloor?: string;
    blockTower?: string;
    landmark?: string;
    deliveryInstructions?: string;
    currentFullAddress?: string;
    city?: string;
    pincode?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const hasInitialLocation = Boolean(
    params.addressId && params.latitude && params.longitude &&
    Number.isFinite(Number(params.latitude)) && Number.isFinite(Number(params.longitude))
  );
  const initialRegion: Region = hasInitialLocation
    ? {
        ...DEFAULT_REGION,
        latitude: Number(params.latitude),
        longitude: Number(params.longitude),
      }
    : DEFAULT_REGION;
  const [region, setRegion] = useState<Region>(initialRegion);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locatingDevice, setLocatingDevice] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [areaName, setAreaName] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState(params.pincode ?? '');
  const [city, setCity] = useState(params.city ?? '');

  // Resolve the selected coordinates using the device geocoder.
  const reverseGeocodeRegion = async (r: Region) => {
    try {
      setResolvingAddress(true);
      setLocationError('');
      setFullAddress('');
      setPincode('');
      setCity('');
      const results = await Location.reverseGeocodeAsync({
        latitude: r.latitude,
        longitude: r.longitude,
      });
      const result = results[0];

      if (!result) {
        setLocationError('Could not find an address for this map location. Move the map and try again.');
        return;
      }

      const area =
        result.district || result.subregion || result.city || 'Selected location';
      const address = [
        result.name,
        result.street,
        result.streetNumber,
        result.district,
        result.subregion,
        result.city,
        result.region,
        result.postalCode,
      ].filter((part): part is string => !!part);

      setAreaName(area);
      setFullAddress([...new Set(address)].join(', '));
      setCity(result.city || result.subregion || '');
      setPincode(result.postalCode || '');
    } catch (error) {
      console.log('Reverse geocode error:', error);
      setLocationError('Could not read this location. Move the map and try again.');
    } finally {
      setResolvingAddress(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setLocatingDevice(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError('Location permission is needed to use your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
      await reverseGeocodeRegion(nextRegion);
    } catch (error) {
      console.log('Location error:', error);
      setLocationError('Could not get your live location. Check location services and try again.');
    } finally {
      setLocatingDevice(false);
    }
  };

  useEffect(() => {
    if (hasInitialLocation) {
      void reverseGeocodeRegion(initialRegion);
    } else {
      void useCurrentLocation();
    }
  }, []);

  // Forward geocode: search text -> coordinates.
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setLocationError('');
      const results = await Location.geocodeAsync(searchQuery.trim());
      if (!results.length) {
        setLocationError('No matching location found. Try another search.');
        return;
      }

      const location = results[0];
      const nextRegion: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
      reverseGeocodeRegion(nextRegion);
    } catch (error) {
      console.log('Search error:', error);
      setLocationError('Location search failed. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleRegionChangeComplete = (r: Region) => {
    setRegion(r);
    reverseGeocodeRegion(r);
  };

  const handleConfirm = () => {
    router.navigate({
      pathname: '/address-setup',
      params: {
        addressId: params.addressId ?? '',
        returnTo: params.returnTo ?? '',
        residenceType: params.residenceType ?? '',
        flatNoApartmentFloor: params.flatNoApartmentFloor ?? '',
        blockTower: params.blockTower ?? '',
        landmark: params.landmark ?? '',
        deliveryInstructions: params.deliveryInstructions ?? '',
        fullAddress,
        areaName,
        city,
        pincode,
        latitude: String(region.latitude),
        longitude: String(region.longitude),
      },
    });
  };

  return (
    <View style={{ flex: 1 }} className="bg-white">
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1, width: '100%', height: '100%' }}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={false}
        showsMyLocationButton={false}
        scrollEnabled
        zoomEnabled
        rotateEnabled
        pitchEnabled
      />

      {/* Fixed center pin — the map moves under it, not the pin itself */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
        style={{ marginBottom: 36 }}
      >
        <MapPin size={42} color="#ffffff" fill="#023E8A" />
      </View>

      {/* Top bar */}
      <View
        className="absolute left-0 right-0 flex-row items-center gap-2 "
        style={{ top: Platform.OS === 'ios' ? 56 : 20 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="ml-2 h-12 w-12 items-center justify-center rounded-full bg-white shadow"
          hitSlop={12}
        >
          <ArrowLeft size={22} color="#111827" />
        </Pressable>

        <View className="h-12 flex-1 flex-row items-center gap-2 rounded-full bg-white px-4 shadow">
          <Search size={16} color={colors.muted} />
          <TextInput
            className="flex-1 text-[14px] text-[#111827]"
            placeholder="Search for area, street name..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      {/* Bottom sheet */}
      <View className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white px-5 pb-8 pt-4 shadow-lg">
        <Pressable
          onPress={useCurrentLocation}
          disabled={locatingDevice}
          className={`mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-[#023E8A] py-3.5 ${
            locatingDevice ? 'opacity-60' : ''
          }`}
        >
          <LocateFixed size={16} color="#fff" />
          <Text className="text-[14px] font-bold text-white">
            {locatingDevice ? 'Locating…' : 'Use Current Location'}
          </Text>
        </Pressable>

        <View className="flex-row items-start gap-2.5">
          <MapPin size={18} color="#ffffff" fill="#023E8A" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text className="text-[16px] font-bold text-[#111827]">
              {resolvingAddress ? 'Finding address…' : areaName || 'Move the map to select'}
            </Text>
            {!!fullAddress && (
              <Text className="mt-1 text-[13px] leading-[19px] text-[#475569]">
                {fullAddress}
              </Text>
            )}
          </View>
        </View>

        {!!locationError && (
          <Text className="mt-2 text-[13px] leading-[18px] text-red-600">{locationError}</Text>
        )}

        <Pressable
          onPress={handleConfirm}
          disabled={!fullAddress || resolvingAddress}
          className={`mt-5 items-center justify-center rounded-xl py-4 ${
            fullAddress && !resolvingAddress ? 'bg-[#023E8A]' : 'bg-[#93A9FF]'
          }`}
        >
          <Text className="text-[15px] font-bold text-white">Confirm Location</Text>
        </Pressable>
      </View>
    </View>
  );
}
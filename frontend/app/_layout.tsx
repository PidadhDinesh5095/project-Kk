import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { initializePushNotifications } from '@/lib/pushNotifications';
import { fetchNotifications } from '@/store/slices/notificationsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import '../global.css';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

function PushNotificationSetup() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Alerts',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: true,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      if (!mounted) return;

      const stopListening = await initializePushNotifications({
        requestPermission: true,
        onForegroundNotification: () => {
          void dispatch(fetchNotifications());
        },
      });

      if (mounted) {
        unsubscribe = stopListening;
      } else {
        stopListening?.();
      }
    };

    void initialize().catch((error: unknown) => {
      console.error('[notifications] failed to initialize push notifications', error);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [dispatch, isAuthenticated]);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    Raleway: require('../assets/fonts/static/Raleway-Regular.ttf'),
    RalewayLight: require('../assets/fonts/static/Raleway-Light.ttf'),
    RalewayMedium: require('../assets/fonts/static/Raleway-Medium.ttf'),
    RalewaySemiBold: require('../assets/fonts/static/Raleway-SemiBold.ttf'),
    RalewayBold: require('../assets/fonts/static/Raleway-Bold.ttf'),
    RalewayExtraBold: require('../assets/fonts/static/Raleway-ExtraBold.ttf'),
    RalewayBlack: require('../assets/fonts/static/Raleway-Black.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaView
        className="flex-1 bg-white"
        edges={['top']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={true}
        />

        <View className="flex-1">
          <PushNotificationSetup />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </SafeAreaView>
    </Provider>
  );
}
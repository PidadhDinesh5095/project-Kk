import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { api } from '@/store/api';

type InitializeOptions = {
  requestPermission?: boolean;
  onForegroundNotification?: (notification: { title: string; body: string }) => void;
};

export async function initializePushNotifications(
  {
    requestPermission: shouldRequestPermission = false,
    onForegroundNotification,
  }: InitializeOptions = {},
): Promise<(() => void) | undefined> {
  if (Platform.OS === 'web') return undefined;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    console.warn('[push] React Native Firebase requires a development build; skipping in Expo Go');
    return undefined;
  }

  let stopListening: (() => void) | undefined;
  try {
    const {
      AuthorizationStatus,
      getMessaging,
      getToken,
      hasPermission,
      onMessage,
      onTokenRefresh,
      requestPermission,
    } = await import('@react-native-firebase/messaging');
    const firebaseMessaging = getMessaging();

    if (Platform.OS === 'ios') {
      let permission = await hasPermission(firebaseMessaging);
      if (
        shouldRequestPermission &&
        permission === AuthorizationStatus.NOT_DETERMINED
      ) {
        permission = await requestPermission(firebaseMessaging);
      }
      if (
        permission !== AuthorizationStatus.AUTHORIZED &&
        permission !== AuthorizationStatus.PROVISIONAL
      ) {
        return undefined;
      }
    } else if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      let permission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!permission && shouldRequestPermission) {
        permission =
          (await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          )) === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (!permission) return undefined;
    }

    stopListening = onMessage(firebaseMessaging, async (message) => {
      const title = message.notification?.title ?? message.data?.title;
      const body = message.notification?.body ?? message.data?.body;
      onForegroundNotification?.({
        title: title ?? '',
        body: body ?? '',
      });

      if (!title && !body) return;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title ?? '',
            body: body ?? '',
            data: message.data ?? {},
            sound: 'default',
          },
          trigger: Platform.OS === 'android' ? { channelId: 'alerts' } : null,
        });
      } catch (error) {
        console.error('[push] failed to display foreground notification', error);
      }
    });

    const registerToken = async (token: string) => {
      await api.post('/notifications/device-token', { deviceToken: token });
    };

    try {
      await registerToken(await getToken(firebaseMessaging));
    } catch (error) {
      console.warn('[push] failed to register device token', error);
    }

    const stopRefreshingToken = onTokenRefresh(firebaseMessaging, (token: string) => {
      void registerToken(token).catch((error: unknown) => {
        console.warn('[push] failed to register refreshed device token', error);
      });
    });

    return () => {
      stopListening?.();
      stopRefreshingToken();
    };
  } catch (error) {
    console.warn('[push] device token registration unavailable', error);
    stopListening?.();
    return undefined;
  }
}
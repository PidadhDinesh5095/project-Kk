import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.31.156:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

type RefreshResponse = {
  data: {
    accessToken: string;
  };
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const response = await axios.post<RefreshResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { timeout: 10000, headers: { 'Content-Type': 'application/json' } },
  );

  const accessToken = response.data.data.accessToken;
  await AsyncStorage.setItem('token', accessToken);
  return accessToken;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequestConfig | undefined;
    const isAuthRequest = request?.url?.includes('/auth/');

    if (error.response?.status !== 401 || !request || request._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    request._retry = true;
    const activeRefreshRequest = refreshRequest ?? (refreshRequest = refreshAccessToken());

    try {
      const accessToken = await activeRefreshRequest;
      if (!accessToken) {
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        return Promise.reject(error);
      }

      request.headers.Authorization = `Bearer ${accessToken}`;
      return api(request);
    } catch {
      await AsyncStorage.multiRemove(['token', 'refreshToken']).catch(() => {});
      return Promise.reject(error);
    } finally {
      if (refreshRequest === activeRefreshRequest) {
        refreshRequest = null;
      }
    }
  },
);

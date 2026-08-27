import Constants from 'expo-constants';

type AppEnvironment = 'development' | 'test' | 'production';

type ExtraConfig = {
  EXPO_PUBLIC_API_URL?: string;
  EXPO_PUBLIC_APP_ENV?: AppEnvironment;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ??
    extra.EXPO_PUBLIC_API_URL ??
    'http://localhost:8000/api/v1',
  appEnvironment:
    process.env.EXPO_PUBLIC_APP_ENV ??
    extra.EXPO_PUBLIC_APP_ENV ??
    'development',
} as const;

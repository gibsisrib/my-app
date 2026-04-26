import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getExpoHost(): string | null {
  const expoConfigHost = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  const debuggerHost = (Constants as any)?.manifest?.debuggerHost as string | undefined;
  const hostWithPort = expoConfigHost || debuggerHost;
  if (!hostWithPort) return null;
  return hostWithPort.split(':')[0] || null;
}

/** Origin only: trim, strip trailing slashes, strip mistaken `/analyze-meal` suffix so POST /analyze-meal resolves. */
export function normalizeMealApiBaseUrl(url: string): string {
  const t = url.trim().replace(/\/+$/, '');
  return t.replace(/\/analyze-meal$/i, '');
}

export function getApiBaseUrl(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  if (!envBaseUrl) return '';

  // In Expo Go / dev, replace localhost with the machine running Metro so the phone can reach your PC.
  if (Platform.OS !== 'web' && envBaseUrl.includes('localhost')) {
    const expoHost = getExpoHost();
    if (expoHost) {
      return normalizeMealApiBaseUrl(envBaseUrl.replace('localhost', expoHost));
    }
    // TestFlight / App Store builds: no Metro host — localhost would mean "this phone" and always fails.
    if (!__DEV__) {
      return '';
    }
  }

  return normalizeMealApiBaseUrl(envBaseUrl);
}

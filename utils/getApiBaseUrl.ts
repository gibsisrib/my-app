import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getExpoHost(): string | null {
  const expoConfigHost = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  const debuggerHost = (Constants as any)?.manifest?.debuggerHost as string | undefined;
  const hostWithPort = expoConfigHost || debuggerHost;
  if (!hostWithPort) return null;
  return hostWithPort.split(':')[0] || null;
}

export function getApiBaseUrl(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  if (!envBaseUrl) return '';

  // In Expo Go on a real phone, localhost points to the phone itself.
  if (Platform.OS !== 'web' && envBaseUrl.includes('localhost')) {
    const expoHost = getExpoHost();
    if (expoHost) {
      return envBaseUrl.replace('localhost', expoHost);
    }
  }

  return envBaseUrl;
}

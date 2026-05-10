import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_WELCOME_SEEN = '@kaizen_welcomeTourSeen';

export async function hasSeenWelcomeTour(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WELCOME_SEEN);
    return raw === 'true';
  } catch {
    return true; // Fail closed so we don't loop the modal on storage errors.
  }
}

export async function markWelcomeTourSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_WELCOME_SEEN, 'true');
  } catch {
    // Best-effort; not critical to surface to the user.
  }
}

export async function resetWelcomeTour(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_WELCOME_SEEN);
  } catch {
    // Best-effort; not critical to surface to the user.
  }
}

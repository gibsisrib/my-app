import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

const KEY_LAST_PROMPTED = '@kaizen_review_lastPrompted';
const KEY_PROMPT_RESPONSE = '@kaizen_review_response';

const ANDROID_PACKAGE = 'com.cutiescaloriecounter.app';
const IOS_APP_ID = '6763739422';

const COOLDOWN_DAYS = 60;
const DAY_MS = 1000 * 60 * 60 * 24;

export type RatingResponse = 'pending' | 'rated' | 'dismissed' | 'later';

async function readNumber(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function getLastPromptedAt(): Promise<number | null> {
  return readNumber(KEY_LAST_PROMPTED);
}

async function getPromptResponse(): Promise<RatingResponse> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROMPT_RESPONSE);
    if (raw === 'rated' || raw === 'dismissed' || raw === 'later') return raw;
    return 'pending';
  } catch {
    return 'pending';
  }
}

export async function markPromptShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_PROMPTED, Date.now().toString());
  } catch {
    // Best-effort; not critical to surface to the user.
  }
}

export async function setPromptResponse(response: RatingResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PROMPT_RESPONSE, response);
  } catch {
    // Best-effort; not critical to surface to the user.
  }
}

export async function resetRatingPromptState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_LAST_PROMPTED, KEY_PROMPT_RESPONSE]);
  } catch {
    // Best-effort; not critical to surface to the user.
  }
}

export async function shouldShowSmartPrompt(args: {
  streakDays: number;
  totalMealEntries: number;
}): Promise<boolean> {
  const response = await getPromptResponse();
  if (response === 'rated' || response === 'dismissed') return false;

  const last = await getLastPromptedAt();
  if (last && Date.now() - last < COOLDOWN_DAYS * DAY_MS) return false;

  // Require some meaningful engagement before asking.
  const earnedByStreak = args.streakDays >= 7;
  const earnedByEntries = args.totalMealEntries >= 10;
  if (!earnedByStreak && !earnedByEntries) return false;

  return true;
}

export async function requestNativeReview(): Promise<boolean> {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return false;
    if (typeof StoreReview.hasAction === 'function') {
      const hasAction = await StoreReview.hasAction();
      if (!hasAction) return false;
    }
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

export async function openStoreListing(): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review`
      : `market://details?id=${ANDROID_PACKAGE}`;
  const fallbackUrl =
    Platform.OS === 'ios'
      ? `https://apps.apple.com/app/id${IOS_APP_ID}`
      : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : fallbackUrl);
  } catch {
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      // If both fail, silently no-op rather than crashing the UI.
    }
  }
}

export async function rateApp(): Promise<void> {
  const opened = await requestNativeReview();
  if (!opened) {
    await openStoreListing();
  }
}

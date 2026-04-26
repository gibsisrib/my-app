import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptics are unsupported on web; native calls can reject and break onPress handlers. */
export function safeImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style).catch(() => {});
}

export function safeSelection() {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync().catch(() => {});
}

export function safeNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(type).catch(() => {});
}

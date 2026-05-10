import { Camera, Droplet, Flame } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RoseTheme } from '../constants/RoseTheme';

type Tip = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const TIPS: Tip[] = [
  {
    icon: <Camera size={36} color={RoseTheme.colors.primary} />,
    title: 'Log meals in seconds',
    body: 'Snap a photo of your plate or describe it in your own words. Cutie matches against USDA nutrition data when possible and uses AI when no match is found.',
  },
  {
    icon: <Droplet size={36} color={RoseTheme.colors.waterFill} />,
    title: 'Track water & macros',
    body: 'Tap the droplets to log glasses of water. Watch protein, carbs, and fats fill up as you log meals so you stay balanced.',
  },
  {
    icon: <Flame size={36} color={RoseTheme.colors.streakFire} />,
    title: 'Build your streak',
    body: 'Log at least one meal each day to grow your streak. Hit your daily goal to celebrate with confetti! Always review entries before saving.',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function WelcomeTour({ visible, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const onScrollLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!cardWidth) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const next = Math.round(offsetX / cardWidth);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (index < TIPS.length - 1) {
      const nextIndex = index + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * cardWidth, animated: true });
      setIndex(nextIndex);
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Welcome to Cutie&apos;s 🎀</Text>
            <TouchableOpacity onPress={onClose} style={styles.skipButton} hitSlop={8}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={onScrollLayout}
            style={styles.tipScrollView}
          >
            {TIPS.map((tip, i) => (
              <View key={i} style={[styles.tipCard, cardWidth ? { width: cardWidth } : { width: '100%' }]}>
                <View style={styles.tipIcon}>{tip.icon}</View>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {TIPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity onPress={goNext} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {index === TIPS.length - 1 ? "Let's go" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(75, 33, 50, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 28,
    padding: 24,
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
    width: '100%',
    maxWidth: 460,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 20,
    color: RoseTheme.colors.primaryDeep,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
  },
  tipCard: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tipIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: RoseTheme.colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tipTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: RoseTheme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  tipBody: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RoseTheme.colors.border,
  },
  dotActive: {
    backgroundColor: RoseTheme.colors.primary,
    width: 18,
  },
  tipScrollView: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: RoseTheme.colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: 'white',
  },
});

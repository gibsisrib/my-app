import { Heart } from 'lucide-react-native';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoseTheme } from '../constants/RoseTheme';

type Props = {
  visible: boolean;
  onLove: () => void;
  onNotReally: () => void;
  onLater: () => void;
};

export default function RatingPrompt({ visible, onLove, onNotReally, onLater }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Heart size={32} color={RoseTheme.colors.primary} />
          </View>
          <Text style={styles.title}>Loving Cutie&apos;s so far?</Text>
          <Text style={styles.body}>
            Your feedback helps us grow. If the app is making your goals easier, a quick rating
            means the world to us.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onLove}>
            <Text style={styles.primaryButtonText}>Yes, love it!</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onNotReally}>
            <Text style={styles.secondaryButtonText}>Not really</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={onLater}>
            <Text style={styles.linkButtonText}>Maybe later</Text>
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
    maxWidth: 420,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: RoseTheme.colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 20,
    color: RoseTheme.colors.primaryDeep,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: RoseTheme.colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  primaryButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: 'white',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: RoseTheme.colors.borderLight,
    marginBottom: 4,
  },
  secondaryButtonText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 14,
    color: RoseTheme.colors.text,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 13,
    color: RoseTheme.colors.textMuted,
  },
});

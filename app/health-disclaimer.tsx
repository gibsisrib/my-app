import { router } from 'expo-router';
import { ExternalLink, HeartPulse, X } from 'lucide-react-native';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoseTheme } from '../constants/RoseTheme';

const sources = [
  {
    title: 'Mifflin-St Jeor BMR equation',
    description: 'Used to estimate basal metabolic rate from age, sex, height, and weight.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  {
    title: 'USDA FoodData Central',
    description: 'Reference database for verifying food calories and macronutrients.',
    url: 'https://fdc.nal.usda.gov/',
  },
  {
    title: 'USDA Dietary Guidelines for Americans',
    description: 'General public nutrition guidance and healthy eating information.',
    url: 'https://www.dietaryguidelines.gov/',
  },
  {
    title: 'CDC Healthy Weight',
    description: 'General healthy weight and weight management guidance.',
    url: 'https://www.cdc.gov/healthy-weight-growth/',
  },
  {
    title: 'NIH/NIDDK Weight Management',
    description: 'General information about weight management and health.',
    url: 'https://www.niddk.nih.gov/health-information/weight-management',
  },
];

function openSource(url: string) {
  Linking.openURL(url).catch(() => {
    // If the device cannot open the link, the visible URL still lets users copy it.
  });
}

export default function HealthDisclaimerScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <HeartPulse size={28} color={RoseTheme.colors.primary} />
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={22} color={RoseTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Health Disclaimer & Sources</Text>
      <Text style={styles.updated}>Last updated: April 2026</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Not medical advice</Text>
        <Text style={styles.bodyText}>
          Cutie&apos;s Calorie Counter provides calorie, macro, and weight-goal estimates for general
          informational purposes only. The app is not medical advice, diagnosis, treatment, or a
          substitute for guidance from a doctor, registered dietitian, or other qualified healthcare
          professional.
        </Text>
        <Text style={styles.bodyText}>
          Always speak with a qualified healthcare professional before making medical, dietary,
          weight-loss, exercise, or health decisions, especially if you are pregnant, under 18, have a
          medical condition, have a history of disordered eating, or take medication.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>AI estimates can be wrong</Text>
        <Text style={styles.bodyText}>
          Food photo scanning and text estimates use AI to identify foods and estimate portions. When
          available, nutrition values may be matched against USDA FoodData Central; otherwise the app
          uses AI-generated estimates. Both methods may still be inaccurate. Portion size,
          ingredients, cooking oils, sauces, brands, and preparation methods can significantly change
          calories and macros.
        </Text>
        <Text style={styles.bodyText}>
          Please review and edit results before saving them. For the most accurate food calorie and
          macro information, verify entries with nutrition labels, restaurant nutrition information,
          or authoritative references such as USDA FoodData Central.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How calorie goals are estimated</Text>
        <Text style={styles.bodyText}>
          The app estimates BMR using the Mifflin-St Jeor equation, a widely used evidence-based BMR
          formula for adults. It then estimates TDEE by multiplying BMR by standard activity factors:
        </Text>
        <View style={styles.factorList}>
          <Text style={styles.factorText}>Sedentary: BMR x 1.2</Text>
          <Text style={styles.factorText}>Lightly active: BMR x 1.375</Text>
          <Text style={styles.factorText}>Moderately active: BMR x 1.55</Text>
          <Text style={styles.factorText}>Very active: BMR x 1.725</Text>
        </View>
        <Text style={styles.bodyText}>
          Weight-change projections use a common calorie-balance approximation where about 3,500 kcal
          is associated with about one pound of body weight. Real results vary based on metabolism,
          adherence, water weight, health conditions, activity, and other factors.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sources and references</Text>
        {sources.map((source) => (
          <TouchableOpacity key={source.url} style={styles.sourceRow} onPress={() => openSource(source.url)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>{source.title}</Text>
              <Text style={styles.sourceDescription}>{source.description}</Text>
              <Text style={styles.sourceUrl}>{source.url}</Text>
            </View>
            <ExternalLink size={18} color={RoseTheme.colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: RoseTheme.colors.soft,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: RoseTheme.colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RoseTheme.colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RoseTheme.colors.borderLight,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 30,
    color: RoseTheme.colors.primaryDeep,
  },
  updated: {
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
  },
  sectionTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: RoseTheme.colors.text,
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    color: RoseTheme.colors.text,
    marginBottom: 10,
  },
  factorList: {
    backgroundColor: RoseTheme.colors.gray50,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  factorText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 13,
    color: RoseTheme.colors.text,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: RoseTheme.colors.borderLight,
  },
  sourceTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.primaryDeep,
  },
  sourceDescription: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 13,
    color: RoseTheme.colors.text,
    marginTop: 4,
  },
  sourceUrl: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
    marginTop: 4,
  },
});

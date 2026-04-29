import { router } from 'expo-router';
import { Sparkles, Target } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { useCalories } from '../CaloriesContext';
import { RoseTheme } from '../constants/RoseTheme';

type OnboardingProfile = {
  profileCompleted: boolean;
  age: number;
  sex: string;
  heightCm: number;
  currentWeight: number;
  baseWeight: number;
  goalWeight: number;
  activityLevel: string;
  goalType: string;
};

type CalculatedGoals = {
  tdee: number;
  targetCalories: number;
  proteinGoal: number;
  carbsGoal: number;
  fatsGoal: number;
};

function calculateGoals(profile: OnboardingProfile): CalculatedGoals {
  const weightKg = profile.currentWeight * 0.453592;
  const bmr = profile.sex === 'male'
    ? 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5
    : 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };
  const tdee = Math.round(bmr * (activityMultipliers[profile.activityLevel] || 1.2));
  const targetCalories = profile.goalType === 'lose'
    ? tdee - 500
    : profile.goalType === 'gain'
      ? tdee + 250
      : tdee;

  return {
    tdee,
    targetCalories,
    proteinGoal: Math.round((targetCalories * 0.3) / 4),
    carbsGoal: Math.round((targetCalories * 0.4) / 4),
    fatsGoal: Math.round((targetCalories * 0.3) / 9),
  };
}

export default function ProfileOnboarding() {
  const { updateUserData, userData, dogImage, clearAppHistory } = useCalories();
  const [step, setStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedGoals, setCalculatedGoals] = useState<CalculatedGoals | null>(null);
  const [pendingProfile, setPendingProfile] = useState<OnboardingProfile | null>(null);

  const [age, setAge] = useState('');
  const [sex, setSex] = useState('female');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const [goalType, setGoalType] = useState('lose');

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    clearAppHistory();
    const profile = {
      profileCompleted: false,
      age: parseInt(age) || 25,
      sex,
      heightCm: (((parseInt(heightFt) || 5) * 12) + (parseInt(heightIn) || 4)) * 2.54,
      currentWeight: parseInt(weight) || 140,
      baseWeight: parseInt(weight) || 140,
      goalWeight: parseInt(goalWeight) || 130,
      activityLevel,
      goalType
    };
    const goals = calculateGoals(profile);

    setPendingProfile(profile);
    setIsCalculating(true);
    updateUserData(profile);

    setTimeout(() => {
      setCalculatedGoals(goals);
      setIsCalculating(false);
    }, 1400);
  };

  const handleStartTracking = () => {
    updateUserData({
      ...(pendingProfile || {}),
      profileCompleted: true,
    });
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    clearAppHistory();
    updateUserData({
      profileCompleted: true,
      // Default basic stats so the math engine doesn't break
      age: 25,
      sex: 'female',
      heightCm: 165,
      currentWeight: 140,
      baseWeight: 140,
      goalWeight: 130,
      activityLevel: 'sedentary',
      goalType: 'lose'
    });
    router.replace('/(tabs)');
  };

  const hasExistingProfile = userData && Object.keys(userData).length > 0;

  if (isCalculating) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <Animated.View entering={FadeIn} style={styles.calculatingCard}>
          <ActivityIndicator size="large" color={RoseTheme.colors.primary} />
          <Text style={styles.calculatingTitle}>Calculating...</Text>
          <Text style={styles.calculatingSubtitle}>
            Crunching your stats into a calorie goal that fits you.
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (calculatedGoals) {
    return (
      <ScrollView contentContainerStyle={[styles.container, styles.centeredContainer]}>
        <Animated.View entering={FadeInUp} style={styles.resultsCard}>
          <View style={styles.resultsIcon}>
            <Target size={36} color={RoseTheme.colors.primary} />
          </View>
          <Text style={styles.resultsTitle}>Boom! Here are your goals</Text>
          <Text style={styles.resultsSubtitle}>You can adjust these anytime from your profile.</Text>

          <View style={styles.goalSummaryCard}>
            <Text style={styles.goalSummaryLabel}>Daily calorie goal</Text>
            <Text style={styles.goalSummaryValue}>{calculatedGoals.targetCalories.toLocaleString()}</Text>
            <Text style={styles.goalSummaryHint}>
              Maintenance: {calculatedGoals.tdee.toLocaleString()} kcal
            </Text>
          </View>

          <View style={styles.macroSummaryRow}>
            <View style={styles.macroSummaryCard}>
              <Text style={styles.macroSummaryLabel}>Protein</Text>
              <Text style={styles.macroSummaryValue}>{calculatedGoals.proteinGoal}g</Text>
            </View>
            <View style={styles.macroSummaryCard}>
              <Text style={styles.macroSummaryLabel}>Carbs</Text>
              <Text style={styles.macroSummaryValue}>{calculatedGoals.carbsGoal}g</Text>
            </View>
            <View style={styles.macroSummaryCard}>
              <Text style={styles.macroSummaryLabel}>Fat</Text>
              <Text style={styles.macroSummaryValue}>{calculatedGoals.fatsGoal}g</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleStartTracking}>
            <Text style={styles.primaryButtonText}>Start tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disclaimerLink} onPress={() => router.push('/health-disclaimer')}>
            <Text style={styles.disclaimerLinkText}>Health disclaimer & sources</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {hasExistingProfile && (
        <Animated.View entering={FadeIn} style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={[styles.bubbleTitle, { marginBottom: 12 }]}>Log back in as</Text>
          <TouchableOpacity
            style={styles.existingProfileBubble}
            onPress={() => {
              updateUserData({ profileCompleted: true });
              router.replace('/(tabs)');
            }}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: dogImage }}
                style={styles.bubbleAvatar}
              />
              <View style={styles.bowContainer}>
                <Text style={{ fontSize: 32 }}>🎀</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={[styles.bubbleName, { marginTop: 12 }]}>Cutie ✨</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeIn} style={styles.header}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/images/cute_scene.jpg')}
            style={{ width: 120, height: 120, borderRadius: 24, resizeMode: 'cover' }}
          />
        </View>
        <Text style={styles.title}>Baby Girl’s tracker 💖</Text>
        <Text style={styles.subtitle}>Let’s make your goals super cute & clear ✨</Text>
      </Animated.View>

      <View style={styles.formContainer}>
        {step === 1 && (
          <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>HOW OLD ARE YOU?</Text>
              <TextInput
                style={styles.input}
                placeholder="Age"
                placeholderTextColor={RoseTheme.colors.textMuted}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next step ➔</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={handleSkip}>
              <Text style={{ color: RoseTheme.colors.textMuted, fontFamily: RoseTheme.fonts.medium }}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SEX</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.toggleButton, sex === 'female' && styles.toggleButtonActive]}
                  onPress={() => setSex('female')}
                >
                  <Text style={[styles.toggleButtonText, sex === 'female' && styles.toggleButtonTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, sex === 'male' && styles.toggleButtonActive]}
                  onPress={() => setSex('male')}
                >
                  <Text style={[styles.toggleButtonText, sex === 'male' && styles.toggleButtonTextActive]}>Male</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>HEIGHT (FT)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ft"
                  placeholderTextColor={RoseTheme.colors.textMuted}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>HEIGHT (IN)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="in"
                  placeholderTextColor={RoseTheme.colors.textMuted}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CURRENT WEIGHT (LBS)</Text>
              <TextInput
                style={styles.input}
                placeholder="lbs"
                placeholderTextColor={RoseTheme.colors.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GOAL WEIGHT (LBS)</Text>
              <TextInput
                style={styles.input}
                placeholder="lbs"
                placeholderTextColor={RoseTheme.colors.textMuted}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginTop: 0 }]} onPress={handleNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {step === 4 && (
          <Animated.View entering={SlideInRight} style={styles.stepContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ACTIVITY LEVEL</Text>
              <View style={styles.stack}>
                {[
                  { id: 'sedentary', title: 'Sedentary (Office job)' },
                  { id: 'lightly_active', title: 'Lightly Active (1-2 days/week)' },
                  { id: 'moderately_active', title: 'Moderately Active (3-5 days/week)' },
                  { id: 'very_active', title: 'Very Active (6-7 days/week)' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.selectOption, activityLevel === item.id && styles.selectOptionActive]}
                    onPress={() => setActivityLevel(item.id)}
                  >
                    <Text style={[styles.selectOptionText, activityLevel === item.id && styles.selectOptionTextActive]}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>YOUR GOAL</Text>
              <View style={styles.row}>
                {['lose', 'maintain', 'gain'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.goalButton, goalType === type && styles.goalButtonActive]}
                    onPress={() => setGoalType(type)}
                  >
                    <Text style={[styles.goalButtonText, goalType === type && styles.goalButtonTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.row, { marginTop: 24 }]}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={handleSubmit}>
                <Text style={styles.finishButtonText}>Finish </Text>
                <Sparkles size={20} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: RoseTheme.colors.soft,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredContainer: {
    minHeight: '100%',
  },
  calculatingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  calculatingTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.primaryDeep,
    marginTop: 20,
  },
  calculatingSubtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 15,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  resultsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  resultsIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: RoseTheme.colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 26,
    color: RoseTheme.colors.primaryDeep,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  goalSummaryCard: {
    width: '100%',
    backgroundColor: RoseTheme.colors.soft,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
  },
  goalSummaryLabel: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 11,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  goalSummaryValue: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 46,
    color: RoseTheme.colors.primaryDeep,
    marginTop: 4,
  },
  goalSummaryHint: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 13,
    color: RoseTheme.colors.textMuted,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  macroSummaryCard: {
    flex: 1,
    backgroundColor: RoseTheme.colors.gray50,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  macroSummaryLabel: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  macroSummaryValue: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: RoseTheme.colors.text,
    marginTop: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  iconContainer: {
    width: 128,
    height: 128,
    backgroundColor: RoseTheme.colors.softLavender,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: RoseTheme.colors.cardWhite,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.primaryDeep,
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  stepContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 241, 242, 0.5)', // rose-soft/50
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stack: {
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  toggleButtonActive: {
    backgroundColor: RoseTheme.colors.primary,
    borderColor: RoseTheme.colors.primary,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  selectOption: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  selectOptionActive: {
    backgroundColor: RoseTheme.colors.primary,
    borderColor: RoseTheme.colors.primary,
  },
  selectOptionText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
  },
  selectOptionTextActive: {
    color: 'white',
  },
  goalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  goalButtonActive: {
    backgroundColor: RoseTheme.colors.primary,
    borderColor: RoseTheme.colors.primary,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  goalButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
  },
  goalButtonTextActive: {
    color: 'white',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    backgroundColor: RoseTheme.colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: 'white',
  },
  disclaimerLink: {
    marginTop: 18,
    paddingVertical: 8,
  },
  disclaimerLinkText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.primaryDeep,
    textDecorationLine: 'underline',
  },
  backButton: {
    flex: 1,
    height: 56,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
  },
  finishButton: {
    flex: 1,
    height: 56,
    backgroundColor: RoseTheme.colors.primary,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 3,
    borderColor: RoseTheme.colors.cardWhite,
    shadowColor: RoseTheme.colors.primaryDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  finishButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: 'white',
  },
  existingProfileBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: RoseTheme.colors.primary,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  bubbleAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  bowContainer: {
    position: 'absolute',
    top: -20,
    right: -16,
    transform: [{ rotate: '15deg' }],
  },
  bubbleTextContainer: {
    marginLeft: 16,
  },
  bubbleTitle: {
    fontSize: 12,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bubbleName: {
    fontSize: 18,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.text,
  },
});

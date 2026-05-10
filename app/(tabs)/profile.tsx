import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Heart, Scale, Sparkles, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useCalories } from '../../CaloriesContext';
import { RoseTheme } from '../../constants/RoseTheme';
import { rateApp, resetRatingPromptState } from '../../utils/storeReview';
import { resetWelcomeTour } from '../../utils/welcomeTour';

export default function ProfileScreen() {
  const { userData, updateUserData, weights, addWeight, deleteWeight, tdee, targetCalories } = useCalories();

  const [age, setAge] = useState(userData?.age?.toString() || '');
  const [sex, setSex] = useState(userData?.sex || 'female');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState(userData?.currentWeight?.toString() || '');
  const [goalWeight, setGoalWeight] = useState(userData?.goalWeight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState(userData?.activityLevel || 'sedentary');
  const [goalType, setGoalType] = useState(userData?.goalType || 'lose');

  const [logWeight, setLogWeight] = useState('');

  useEffect(() => {
    if (userData?.heightCm) {
      const totalInches = Math.round(userData.heightCm / 2.54);
      setHeightFt(Math.floor(totalInches / 12).toString());
      setHeightIn((totalInches % 12).toString());
    }
  }, [userData]);

  useEffect(() => {
    if (userData?.currentWeight) {
      setWeight(userData.currentWeight.toString());
    }
  }, [userData?.currentWeight]);

  const handleSave = () => {
    const hFt = parseInt(heightFt) || 0;
    const hIn = parseInt(heightIn) || 0;
    const heightCm = ((hFt * 12) + hIn) * 2.54;

    const dataToSave: any = {
      age: parseInt(age) || 25,
      sex,
      heightCm,
      currentWeight: parseInt(weight) || 140,
      baseWeight: parseInt(weight) || 140,
      goalWeight: parseInt(goalWeight) || 130,
      activityLevel,
      goalType
    };

    updateUserData(dataToSave);
    alert('Settings Saved! 💾');
  };

  const handleLogWeight = () => {
    const w = parseInt(logWeight);
    if (isNaN(w) || w <= 0) {
      alert("Please enter a valid weight! ⚖️");
      return;
    }
    if (w > 1500) {
      alert("That number seems a bit high, please check it! 👀");
      return;
    }
    addWeight(w);
    setLogWeight('');
  };

  const getProjectionText = () => {
    const curr = parseInt(weight) || 140;
    const goal = parseInt(goalWeight) || 130;

    if (curr === goal) return "You are already at your goal weight! 🎉";
    if (goalType === 'maintain') return "You are maintaining your weight beautifully. ⚖️";

    const diffLbs = Math.abs(curr - goal);
    const calorieDeficitOrSurplus = Math.abs(tdee - targetCalories);

    // Check conflicts
    if (goalType === 'lose' && goal > curr) return "Hmm, you want to lose weight but your goal is higher! 😅";
    if (goalType === 'gain' && goal < curr) return "Hmm, you want to gain weight but your goal is lower! 😅";
    if (calorieDeficitOrSurplus === 0) return "Please select a goal type to see your projection.";

    const dailyPoundsChanged = calorieDeficitOrSurplus / 3500;
    const weeklyPoundsChanged = dailyPoundsChanged * 7;
    const weeks = Math.ceil(diffLbs / weeklyPoundsChanged);

    return `Estimated timeline: ~${weeks} weeks to reach ${goal} lbs`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your profile 🎀</Text>
        <Text style={styles.subtitle}>Tweak your stats & goals anytime, bestie</Text>
      </View>

      <TouchableOpacity style={styles.disclaimerCard} onPress={() => router.push('/health-disclaimer')}>
        <View style={{ flex: 1 }}>
          <Text style={styles.disclaimerTitle}>Health Disclaimer & Sources</Text>
          <Text style={styles.disclaimerText}>
            Review how calorie goals are estimated, source links, and important AI accuracy notes.
          </Text>
        </View>
        <Text style={styles.disclaimerArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.rateCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          rateApp();
        }}
      >
        <View style={styles.rateIconWrap}>
          <Heart size={20} color={RoseTheme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.disclaimerTitle}>Rate Cutie&apos;s Calorie Counter</Text>
          <Text style={styles.disclaimerText}>
            Loving the app? A quick rating helps other cuties find us 🎀
          </Text>
        </View>
        <Text style={styles.disclaimerArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>AGE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25"
              placeholderTextColor={RoseTheme.colors.textMuted}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>SEX</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.smallToggle, sex === 'female' && styles.toggleActive]}
                onPress={() => setSex('female')}
              >
                <Text style={[styles.smallToggleText, sex === 'female' && styles.toggleTextActive]}>F</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallToggle, sex === 'male' && styles.toggleActive]}
                onPress={() => setSex('male')}
              >
                <Text style={[styles.smallToggleText, sex === 'male' && styles.toggleTextActive]}>M</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

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

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>WEIGHT</Text>
            <TextInput
              style={styles.input}
              placeholder="lbs"
              placeholderTextColor={RoseTheme.colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>GOAL LBS</Text>
            <TextInput
              style={styles.input}
              placeholder="lbs"
              placeholderTextColor={RoseTheme.colors.textMuted}
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ACTIVITY LEVEL</Text>
          <View style={{ gap: 8 }}>
            {[
              { id: 'sedentary', title: 'Sedentary' },
              { id: 'lightly_active', title: 'Lightly Active' },
              { id: 'moderately_active', title: 'Moderately Active' },
              { id: 'very_active', title: 'Very Active' },
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.selectOption, activityLevel === item.id && styles.toggleActive]}
                onPress={() => setActivityLevel(item.id)}
              >
                <Text style={[styles.selectOptionText, activityLevel === item.id && styles.toggleTextActive]}>
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
                style={[styles.goalButton, goalType === type && styles.toggleActive]}
                onPress={() => setGoalType(type)}
              >
                <Text style={[styles.goalButtonText, goalType === type && styles.toggleTextActive]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save changes ✨</Text>
      </TouchableOpacity>

      {/* Projection Section */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Goal Projection</Text>
          <Sparkles size={20} color={RoseTheme.colors.primary} />
        </View>

        <View style={{ backgroundColor: RoseTheme.colors.gray50, borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 12 }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <Text style={{ color: RoseTheme.colors.textMuted, fontFamily: RoseTheme.fonts.medium }}>Maintenance (TDEE)</Text>
            <Text style={{ color: RoseTheme.colors.text, fontFamily: RoseTheme.fonts.bold }}>{tdee} kcal</Text>
          </View>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <Text style={{ color: RoseTheme.colors.textMuted, fontFamily: RoseTheme.fonts.medium }}>Adjustment</Text>
            <Text style={{ color: goalType === 'lose' ? RoseTheme.colors.primary : (goalType === 'gain' ? '#10b981' : RoseTheme.colors.textMuted), fontFamily: RoseTheme.fonts.bold }}>
              {goalType === 'lose' ? '-500 kcal' : (goalType === 'gain' ? '+250 kcal' : '0 kcal')}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: RoseTheme.colors.text, fontFamily: RoseTheme.fonts.bold }}>Daily Target</Text>
            <Text style={{ color: RoseTheme.colors.primary, fontFamily: RoseTheme.fonts.bold, fontSize: 16 }}>{targetCalories} kcal</Text>
          </View>
        </View>

        <Text style={styles.projectionText}>{getProjectionText()}</Text>
        <Text style={styles.projectionSubtext}>
          {goalType === 'lose' ? 'A 500 kcal deficit results in ~1 lb of weight loss per week.' :
            goalType === 'gain' ? 'A 250 kcal surplus results in ~0.5 lb of weight gain per week.' :
              'Eating at maintenance keeps your weight stable.'}
        </Text>
        <TouchableOpacity style={styles.inlineDisclaimerLink} onPress={() => router.push('/health-disclaimer')}>
          <Text style={styles.inlineDisclaimerText}>View calculation sources and medical disclaimer</Text>
        </TouchableOpacity>
      </View>

      {/* Weight Log Section */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Weight Log</Text>
          <Scale size={20} color={RoseTheme.colors.primary} />
        </View>

        <View style={[styles.row, { marginTop: 16 }]}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 16 }]}
            placeholder="Today's weight (lbs)"
            placeholderTextColor={RoseTheme.colors.textMuted}
            value={logWeight}
            onChangeText={setLogWeight}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.logButton} onPress={handleLogWeight}>
            <Text style={styles.logButtonText}>Log</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weightList}>
          {weights.slice().reverse().map((w: any) => (
            <View key={w.id} style={[styles.weightItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.weightDate}>{w.date}</Text>
                <Text style={styles.weightVal}>{w.weight} <Text style={styles.lbsText}>lbs</Text></Text>
              </View>
              <TouchableOpacity
                style={{ padding: 8, marginLeft: 16 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  deleteWeight(w.id);
                }}
              >
                <Trash2 size={18} color={RoseTheme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: '#fee2e2', marginTop: 12, borderWidth: 1, borderColor: '#ef4444' }]} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          updateUserData({ profileCompleted: false });
          router.replace('/profile-onboarding');
        }}
      >
        <Text style={[styles.saveButtonText, { color: '#ef4444' }]}>Log Out</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={[styles.card, { marginTop: 24, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }]}>
          <Text style={[styles.sectionTitle, { color: '#92400e' }]}>Dev tools 🛠️</Text>
          <Text style={[styles.projectionSubtext, { marginTop: 4, marginBottom: 12 }]}>
            Only visible in development builds. Use these to retest the welcome tour and rating
            prompt without uninstalling the app.
          </Text>

          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await resetWelcomeTour();
              router.replace({ pathname: '/', params: { devTour: '1' } });
            }}
          >
            <Text style={styles.devButtonText}>Show welcome tour now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await resetRatingPromptState();
              router.replace({ pathname: '/', params: { devRating: '1' } });
            }}
          >
            <Text style={styles.devButtonText}>Show rating prompt now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await resetWelcomeTour();
              await resetRatingPromptState();
              alert(
                'Welcome tour and rating prompt state cleared. They will fire on the next eligible Home focus.'
              );
            }}
          >
            <Text style={styles.devButtonText}>Reset both (no force-show)</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.primaryDeep,
  },
  subtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 28,
    padding: 24,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 2,
    borderColor: RoseTheme.colors.borderLight,
  },
  disclaimerCard: {
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: RoseTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  disclaimerTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.primaryDeep,
  },
  disclaimerText: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 13,
    color: RoseTheme.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  disclaimerArrow: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 30,
    color: RoseTheme.colors.primary,
  },
  rateCard: {
    backgroundColor: RoseTheme.colors.cardWhite,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: RoseTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: RoseTheme.colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
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
    backgroundColor: 'rgba(255, 241, 242, 0.5)',
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallToggle: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  toggleActive: {
    backgroundColor: RoseTheme.colors.primary,
    borderColor: RoseTheme.colors.primary,
  },
  smallToggleText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
  },
  toggleTextActive: {
    color: 'white',
  },
  selectOption: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: RoseTheme.colors.gray50,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  selectOptionText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
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
  goalButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
  },
  saveButton: {
    width: '100%',
    height: 56,
    backgroundColor: RoseTheme.colors.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 3,
    borderColor: RoseTheme.colors.cardWhite,
    shadowColor: RoseTheme.colors.fabGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 18,
    color: 'white',
  },
  sectionTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 20,
    color: RoseTheme.colors.text,
  },
  projectionText: {
    fontFamily: RoseTheme.fonts.semiBold,
    fontSize: 16,
    color: RoseTheme.colors.primary,
    marginTop: 12,
  },
  projectionSubtext: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
    marginTop: 8,
  },
  inlineDisclaimerLink: {
    marginTop: 14,
    paddingVertical: 4,
  },
  inlineDisclaimerText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 13,
    color: RoseTheme.colors.primaryDeep,
    textDecorationLine: 'underline',
  },
  logButton: {
    backgroundColor: RoseTheme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    color: 'white',
    fontSize: 16,
  },
  weightList: {
    marginTop: 24,
    gap: 12,
  },
  weightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: RoseTheme.colors.gray50,
  },
  weightDate: {
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
    fontSize: 14,
  },
  weightVal: {
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.text,
    fontSize: 16,
  },
  lbsText: {
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
  },
  devButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginTop: 8,
  },
  devButtonText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: '#92400e',
  },
});
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useCalories } from '../CaloriesContext';
import { RoseTheme } from '../constants/RoseTheme';
import { Flame, Droplets, ChevronLeft, Award, Zap } from 'lucide-react-native';
import { getDayNutrition } from '../utils/diaryAggregates';

export default function ProgressScreen() {
  const { entries = [], waterLogs = [], targetCalories = 2200 } = useCalories();

  // Helper: Get past 7 days as YYYY-MM-DD strings
  const getPast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
    }
    return dates;
  };

  const past7Days = getPast7Days();

  // Calorie Adherence Calculation
  // A day is "adherent" if calories > 0 AND calories <= targetCalories (or close enough)
  // Actually, let's just say if they logged anything and were within target (or +100 overhead)
  const isDayAdherent = (dateStr: string) => {
    const { calories: dayCals } = getDayNutrition(entries, dateStr);
    return dayCals > 0 && dayCals <= (targetCalories + 100);
  };

  // Hydration Calculation
  // A day is "hydrated" if water >= 6 glasses
  const isDayHydrated = (dateStr: string) => {
    const log = waterLogs.find((w: any) => w.date === dateStr);
    return log && log.amount >= 6;
  };

  // Streak Calculations
  const calculateCalorieStreak = () => {
    let streak = 0;
    // Start from today and go backwards
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      // If it's today and they haven't logged yet, ignore it for streak break purposes
      if (i === 0 && !isDayAdherent(dateStr)) {
        continue;
      }
      
      if (isDayAdherent(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const calculateWaterStreak = () => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      if (i === 0 && !isDayHydrated(dateStr)) {
        continue;
      }
      
      if (isDayHydrated(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const calorieStreak = calculateCalorieStreak();
  const waterStreak = calculateWaterStreak();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={RoseTheme.colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Progress ✨</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Calorie Adherence Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBoxFiery}>
              <Flame color="#ef4444" size={24} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Calorie Target Streak</Text>
              <Text style={styles.cardSubtitle}>Days under target</Text>
            </View>
          </View>
          
          <View style={styles.streakNumberBox}>
            <Text style={styles.streakNumber}>{calorieStreak}</Text>
            <Text style={styles.streakLabel}>DAYS IN A ROW</Text>
          </View>

          {/* Past 7 Days Visual */}
          <Text style={styles.gridTitle}>Past 7 Days</Text>
          <View style={styles.daysGrid}>
            {past7Days.map((date, idx) => {
              const adherent = isDayAdherent(date);
              const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(date).getDay()];
              return (
                <View key={date} style={styles.dayCol}>
                  <View style={[styles.dayCircle, adherent && styles.dayCircleActive]}>
                    {adherent ? <Zap size={14} color="white" /> : <View style={styles.dayDot} />}
                  </View>
                  <Text style={[styles.dayText, adherent && styles.dayTextActive]}>{dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Hydration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBoxFiery, { backgroundColor: '#e0f2fe' }]}>
              <Droplets color="#0ea5e9" size={24} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Hydration Streak</Text>
              <Text style={styles.cardSubtitle}>Days hitting 6+ glasses</Text>
            </View>
          </View>
          
          <View style={styles.streakNumberBox}>
            <Text style={[styles.streakNumber, { color: '#0ea5e9' }]}>{waterStreak}</Text>
            <Text style={styles.streakLabel}>DAYS IN A ROW</Text>
          </View>

          {/* Past 7 Days Visual */}
          <Text style={styles.gridTitle}>Past 7 Days</Text>
          <View style={styles.daysGrid}>
            {past7Days.map((date, idx) => {
              const hydrated = isDayHydrated(date);
              const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(date).getDay()];
              return (
                <View key={date} style={styles.dayCol}>
                  <View style={[styles.dayCircle, hydrated && { backgroundColor: '#0ea5e9', borderWidth: 0 }]}>
                    {hydrated ? <Droplets size={14} color="white" /> : <View style={styles.dayDot} />}
                  </View>
                  <Text style={[styles.dayText, hydrated && { color: '#0ea5e9', fontFamily: RoseTheme.fonts.bold }]}>{dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Motivation Card */}
        <View style={[styles.card, { backgroundColor: RoseTheme.colors.primary, borderWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Award color="white" size={32} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ color: 'white', fontFamily: RoseTheme.fonts.bold, fontSize: 18 }}>Keep going!</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: RoseTheme.fonts.medium, marginTop: 4 }}>
                Consistency is the secret to everything. Every small step counts.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: RoseTheme.colors.gray50,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.text,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: RoseTheme.colors.gray50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBoxFiery: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
    marginTop: 2,
  },
  streakNumberBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: RoseTheme.colors.gray50,
    borderRadius: 16,
    marginBottom: 24,
  },
  streakNumber: {
    fontSize: 48,
    fontFamily: RoseTheme.fonts.bold,
    color: '#ef4444',
    lineHeight: 56,
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.textMuted,
    letterSpacing: 1,
  },
  gridTitle: {
    fontSize: 14,
    fontFamily: RoseTheme.fonts.bold,
    color: RoseTheme.colors.textMuted,
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: RoseTheme.colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dayCircleActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  dayText: {
    fontSize: 12,
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
  },
  dayTextActive: {
    color: '#ef4444',
    fontFamily: RoseTheme.fonts.bold,
  },
});

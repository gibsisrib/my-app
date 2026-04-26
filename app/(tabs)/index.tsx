import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Droplet, Edit2, Flame, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCalories } from '../../CaloriesContext';
import { RoseTheme } from '../../constants/RoseTheme';

export default function HomeScreen() {
  const {
    consumed, meals, deleteEntry,
    currentStreak, addFavorite, todayWater, setWater,
    selectedDate, changeDate, getTodayString,
    consumedProtein, consumedCarbs, consumedFats, userData,
    dogImage, tdee, targetCalories
  } = useCalories();

  const goal = targetCalories || 2200;
  const remaining = goal - consumed;

  const statusLabel = consumed > goal ? 'OVER TARGET' : 'ON TARGET';
  const progressPercent = Math.min((consumed / goal) * 100, 100);

  const [showConfetti, setShowConfetti] = useState(false);
  const [waterConfettiKey, setWaterConfettiKey] = useState(0);
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Animate progress bar on mount or when percent changes
    animatedWidth.value = withTiming(progressPercent, {
      duration: 1200,
      easing: Easing.out(Easing.exp),
    });

    // Trigger confetti if goal is reached for the first time
    if (consumed >= goal && goal > 0 && !showConfetti) {
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (consumed < goal) {
      setShowConfetti(false); // Reset if they delete a meal
    }
    // animatedWidth is a Reanimated shared value (stable ref); showConfetti avoids duplicate confetti.
  }, [consumed, goal, progressPercent, showConfetti, animatedWidth]);

  useEffect(() => {
    if (todayWater === 6) {
      setWaterConfettiKey(prev => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [todayWater]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`
    };
  });

  const getEncouragingMessage = () => {
    if (consumed === 0) return "Let's fuel up for the day! 🥐";
    if (remaining > 500) return "You're doing great! Keep it up! 🌟";
    if (remaining > 0) return "Almost at your goal! You got this! 💪";
    return "Goal reached! Amazing job today! 🎉";
  };

  const isToday = selectedDate === getTodayString();

  // Rough Macro Goals based on Calorie Goal (30% P / 40% C / 30% F)
  const proteinGoal = Math.round((goal * 0.3) / 4);
  const carbsGoal = Math.round((goal * 0.4) / 4);
  const fatsGoal = Math.round((goal * 0.3) / 9);

  const pPercent = Math.min((consumedProtein / proteinGoal) * 100, 100) || 0;
  const cPercent = Math.min((consumedCarbs / carbsGoal) * 100, 100) || 0;
  const fPercent = Math.min((consumedFats / fatsGoal) * 100, 100) || 0;

  const formatTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Use a reversed copy of meals
  const displayMeals = meals ? [...meals].reverse() : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.nameText}>Cutie ✨</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge}>
            <Flame size={16} color="#ef4444" />
            <Text style={styles.streakText}>{currentStreak}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/progress')}
            style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: 'white' }}
          >
            <Image source={{ uri: dogImage }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Calorie Goal Card */}
        <View style={styles.gradientCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>Target ({userData?.goalType?.toUpperCase() || 'MAINTAIN'})</Text>
              <Text style={styles.cardGoalNum}>{goal.toLocaleString()}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: RoseTheme.fonts.medium, marginTop: 2 }}>
                Maint: {tdee.toLocaleString()} kcal
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.eatenCircle}>
              <Text style={styles.eatenNum}>{consumed}</Text>
              <Text style={styles.eatenLabel}>EATEN</Text>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.remainingLineWrap}>
                  <Text style={styles.remainingLine} numberOfLines={1}>
                    <Text style={styles.remainingLabel}>Remaining </Text>
                    <Text style={styles.remainingNum}>
                      {remaining.toLocaleString()} kcal
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, animatedStyle]} />
              </View>
            </View>
          </View>
          <View style={styles.encouragementBox}>
            <Text style={styles.encouragementText}>{getEncouragingMessage()}</Text>
          </View>

          {/* Macros Section */}
          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{consumedProtein} / {proteinGoal}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { backgroundColor: '#ef4444', width: `${pPercent}%` }]} />
              </View>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{consumedCarbs} / {carbsGoal}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { backgroundColor: '#3b82f6', width: `${cPercent}%` }]} />
              </View>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroLabel}>Fats</Text>
                <Text style={styles.macroValue}>{consumedFats} / {fatsGoal}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { backgroundColor: '#eab308', width: `${fPercent}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Water Tracker */}
        <View style={styles.waterSection}>
          <Text style={styles.waterTitle}>Daily Hydration 💧</Text>
          <View style={styles.waterGlasses}>
            {[...Array(6)].map((_, i) => {
              const isFilled = i < (todayWater || 0);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (isFilled && (todayWater || 0) === i + 1) {
                      setWater(i);
                    } else {
                      setWater(i + 1);
                    }
                  }}
                  style={styles.waterGlass}
                >
                  <Droplet
                    size={32}
                    color={isFilled ? '#3b82f6' : '#d1d5db'}
                    fill={isFilled ? '#3b82f6' : 'transparent'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <Slider
            style={{ width: '100%', height: 40, marginTop: 4, marginBottom: 4 }}
            minimumValue={0}
            maximumValue={6}
            step={1}
            value={todayWater || 0}
            onValueChange={(val) => {
              // Trigger a light haptic feedback when sliding past a tick mark
              Haptics.selectionAsync();
              setWater(val);
            }}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#e5e7eb"
            thumbTintColor="#3b82f6"
          />
          <Text style={styles.waterSubtext}>
            {todayWater || 0}/6 glasses ({((todayWater || 0) * 8)} oz)
          </Text>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.dateNavigator}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavBtn}>
                <ChevronLeft size={20} color={RoseTheme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.historyTitle}>
                {isToday ? "Today's Fuel" : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => changeDate(1)} disabled={isToday} style={[styles.dateNavBtn, isToday && { opacity: 0.3 }]}>
                <ChevronRight size={20} color={RoseTheme.colors.text} />
              </TouchableOpacity>
            </View>
            {isToday && (
              <View style={styles.liveLogBadge}>
                <View style={styles.liveLogDot} />
                <Text style={styles.liveLogText}>LIVE LOG</Text>
              </View>
            )}
          </View>

          {displayMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No log entries yet...</Text>
              <Text style={styles.emptyStateSubtext}>READY FOR BREAKFAST? 🍎</Text>
            </View>
          ) : (
            <View style={styles.mealList}>
              {displayMeals.map((meal: any, index: number) => (
                <View key={meal.id || index} style={styles.logItem}>
                  <View style={styles.iconBox}>
                    <Text style={{ fontSize: 20 }}>{meal.type === 'drink' ? '🥤' : '🥗'}</Text>
                  </View>
                  <View style={styles.logItemContent}>
                    <Text style={styles.logItemName} numberOfLines={1}>{meal.name}</Text>
                    <Text style={styles.logItemType}>{meal.type ? meal.type.toUpperCase() : 'MEAL'} • {formatTime(meal.timestamp)}</Text>
                  </View>
                  <View style={styles.logItemRight}>
                    <Text style={styles.logItemCalories}>{meal.calories} <Text style={styles.kcalText}>kcal</Text></Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      addFavorite(meal.name, meal.calories, meal.type);
                      alert(`Saved ${meal.name} to Favorites! ⭐`);
                    }} style={styles.actionButton}>
                      <Star size={16} color={RoseTheme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/add-meal', params: { id: meal.id } })} style={styles.actionButton}>
                      <Edit2 size={16} color={RoseTheme.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      deleteEntry(meal.id);
                    }} style={styles.actionButton}>
                      <Trash2 size={16} color={RoseTheme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/add-meal');
        }}>
          <Text style={styles.fabText}>+ Add Fuel</Text>
        </TouchableOpacity>
      </View>

      {showConfetti && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            fallSpeed={3000}
            fadeOut={true}
            autoStart={true}
          />
        </View>
      )}

      {waterConfettiKey > 0 && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            key={`water-confetti-${waterConfettiKey}`}
            count={100}
            origin={{ x: -10, y: 0 }}
            fallSpeed={2500}
            fadeOut={true}
            autoStart={true}
            colors={['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#ffffff']}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RoseTheme.colors.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 24,
  },
  greetingText: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    color: RoseTheme.colors.textMuted,
  },
  nameText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2', // red-100
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: '#ef4444',
  },
  dogAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  gradientCard: {
    backgroundColor: RoseTheme.colors.primary, // fallback for gradient
    borderRadius: 32,
    padding: 24,
    shadowColor: RoseTheme.colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 32,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 14,
    color: '#FFE4E6', // rose-100 equivalent
  },
  cardGoalNum: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 48,
    color: 'white',
    letterSpacing: -1,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: 'white',
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
    marginHorizontal: -8,
  },
  eatenCircle: {
    width: 112,
    height: 112,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eatenNum: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: 'white',
  },
  eatenLabel: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: 'white',
    opacity: 0.8,
    letterSpacing: 1.5,
  },
  encouragementBox: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  encouragementText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: 'white',
  },
  progressSection: {
    flex: 1,
    minWidth: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  remainingLineWrap: {
    flex: 1,
    minWidth: 0,
  },
  remainingLine: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
  },
  remainingLabel: {
    color: '#FFE4E6',
  },
  remainingNum: {
    color: 'white',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 5,
  },
  historySection: {
    flex: 1,
    marginTop: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 20,
    color: RoseTheme.colors.text,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateNavBtn: {
    padding: 4,
  },
  macrosRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  macroItem: {
    marginBottom: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: RoseTheme.fonts.medium,
  },
  macroValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: RoseTheme.fonts.bold,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  liveLogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveLogDot: {
    width: 8,
    height: 8,
    backgroundColor: '#4ade80', // green-400
    borderRadius: 4,
  },
  liveLogText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 12,
    color: RoseTheme.colors.textMuted,
    letterSpacing: 1,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 241, 242, 0.5)',
    borderWidth: 2,
    borderColor: RoseTheme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 32,
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
    fontStyle: 'italic',
  },
  emptyStateSubtext: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    opacity: 0.6,
    letterSpacing: 1.5,
    marginTop: 8,
  },
  mealList: {
    gap: 12,
  },
  logItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#fff7ed', // orange-50
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logItemContent: {
    flex: 1,
  },
  logItemName: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.text,
  },
  logItemType: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 10,
    color: RoseTheme.colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  logItemRight: {
    alignItems: 'flex-end',
  },
  logItemCalories: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.primary,
  },
  kcalText: {
    fontSize: 10,
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
  },
  fab: {
    backgroundColor: RoseTheme.colors.text,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: 'white',
  },
  waterSection: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 32,
    marginTop: 24,
    marginBottom: 18,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  waterTitle: {
    fontSize: 16,
    fontFamily: RoseTheme.fonts.semiBold,
    color: RoseTheme.colors.text,
    marginBottom: 16,
  },
  waterGlasses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterGlass: {
    padding: 2,
  },
  waterSubtext: {
    fontSize: 12,
    fontFamily: RoseTheme.fonts.medium,
    color: RoseTheme.colors.textMuted,
    textAlign: 'center',
  },
});
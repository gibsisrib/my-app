import { router } from 'expo-router';
import { Calendar, Edit2, Trash2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCalories } from '../../CaloriesContext';
import { RoseTheme } from '../../constants/RoseTheme';

interface MealEntry {
  id: string;
  name: string;
  calories: number;
  type: 'drink' | 'meal';
  timestamp: number;
  date: string;
}

interface GroupedEntries {
  [date: string]: MealEntry[];
}

const getMealEmoji = (type?: string): string => {
  return type === 'drink' ? '🥤' : '🥗';
};

interface MealCardProps {
  meal: MealEntry;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const MealCard: React.FC<MealCardProps> = ({ meal, index, onEdit, onDelete }) => {
  const formatTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View key={meal.id || index} style={styles.logItem}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 20 }}>{getMealEmoji(meal.type)}</Text>
      </View>
      <View style={styles.logItemContent}>
        <Text style={styles.logItemName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.logItemType}>
          {meal.type ? meal.type.toUpperCase() : 'MEAL'} • {formatTime(meal.timestamp)}
        </Text>
      </View>
      <View style={styles.logItemRight}>
        <Text style={styles.logItemCalories}>
          {meal.calories} <Text style={styles.kcalText}>kcal</Text>
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => onEdit(meal.id)} style={styles.actionButton}>
          <Edit2 size={16} color={RoseTheme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(meal.id)} style={styles.actionButton}>
          <Trash2 size={16} color={RoseTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function HistoryScreen() {
  const { entries, deleteEntry } = useCalories();

  const { grouped, dates } = useMemo(() => {
    const groupedData: GroupedEntries = (entries as MealEntry[]).reduce((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {} as GroupedEntries);

    const sortedDates = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));
    return { grouped: groupedData, dates: sortedDates };
  }, [entries]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>All your past logs</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {dates.length === 0 ? (
          <View style={styles.emptyState}>
             <Calendar size={48} color={RoseTheme.colors.gray50} />
             <Text style={styles.emptyStateText}>No history yet.</Text>
          </View>
        ) : (
          dates.map(date => {
            const dayEntries = [...grouped[date]].reverse();
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.calories, 0);
            return (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateText}>{date}</Text>
                  <Text style={styles.dateTotal}>{dayTotal} kcal</Text>
                </View>
                {dayEntries.map((meal, index) => (
                  <MealCard
                    key={meal.id || index}
                    meal={meal}
                    index={index}
                    onEdit={(id) => router.push({ pathname: '/add-meal', params: { id } })}
                    onDelete={deleteEntry}
                  />
                ))}
              </View>
            );
          })
        )}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: RoseTheme.colors.gray50,
  },
  title: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 28,
    color: RoseTheme.colors.text,
  },
  subtitle: {
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
  },
  content: {
    padding: 24,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontFamily: RoseTheme.fonts.medium,
    fontSize: 16,
    color: RoseTheme.colors.textMuted,
  },
  dateGroup: {
    marginBottom: 32,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dateText: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 16,
    color: RoseTheme.colors.text,
  },
  dateTotal: {
    fontFamily: RoseTheme.fonts.bold,
    fontSize: 14,
    color: RoseTheme.colors.primary,
  },
  logItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: RoseTheme.colors.border,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: RoseTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: RoseTheme.colors.iconBackground,
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
});


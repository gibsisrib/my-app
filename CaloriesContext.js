import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDayNutrition } from './utils/diaryAggregates';

const CaloriesContext = createContext();

function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

export const CaloriesProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [weights, setWeights] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [userData, setUserData] = useState({
    profileCompleted: false,
    calorieGoal: null,
    currentWeight: null,
    goalWeight: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [dogImage, setDogImage] = useState('https://images.dog.ceo/breeds/corgi-pembroke/n02113023_137.jpg');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedEntries = await AsyncStorage.getItem('@kaizen_entries');
      const storedWeights = await AsyncStorage.getItem('@kaizen_weights');
      const storedFavorites = await AsyncStorage.getItem('@kaizen_favorites');
      const storedWater = await AsyncStorage.getItem('@kaizen_water');
      const storedUserData = await AsyncStorage.getItem('@kaizen_userData');

      if (storedEntries) setEntries(asArray(safeJsonParse(storedEntries, [])));
      if (storedWeights) setWeights(asArray(safeJsonParse(storedWeights, [])));
      if (storedFavorites) setFavorites(asArray(safeJsonParse(storedFavorites, [])));
      if (storedWater) setWaterLogs(asArray(safeJsonParse(storedWater, [])));

      if (storedUserData) {
        const parsedUser = asObject(safeJsonParse(storedUserData, null));
        if (parsedUser) setUserData((prev) => ({ ...prev, ...parsedUser }));
      } else {
        const oldGoal = await AsyncStorage.getItem('@kaizen_goal');
        const oldProfile = await AsyncStorage.getItem('@kaizen_profile');
        if (oldGoal || oldProfile) {
          setUserData((prev) => ({
            ...prev,
            calorieGoal: oldGoal ? parseInt(oldGoal, 10) : null,
            profileCompleted: oldProfile === 'true',
          }));
        }
      }

      try {
        const res = await fetch('https://dog.ceo/api/breed/corgi/images/random');
        const data = await res.json();
        if (data.status === 'success') {
          setDogImage(data.message);
        }
      } catch (e) {
        console.log('Failed to fetch dog image', e);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveData = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  };

  const clearAppHistory = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@kaizen_entries',
        '@kaizen_weights',
        '@kaizen_water'
      ]);
      setEntries([]);
      setWeights([]);
      setWaterLogs([]);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  };

  // Automatic Calculation Engine (TDEE & Target)
  const calculateTDEE = () => {
    if (!userData.age) return 2200; // fallback
    const ageNum = parseInt(userData.age);
    const heightCm = userData.heightCm || 170;
    const weightKg = (parseInt(userData.currentWeight) || 140) * 0.453592;

    let bmr;
    if (userData.sex === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;
    }

    let activityNum = 1.2;
    if (userData.activityLevel === 'lightly_active') activityNum = 1.375;
    if (userData.activityLevel === 'moderately_active') activityNum = 1.55;
    if (userData.activityLevel === 'very_active') activityNum = 1.725;
    if (userData.activityLevel === 'extra_active') activityNum = 1.9;

    return Math.round(bmr * activityNum);
  };

  const tdee = calculateTDEE();

  const calculateTarget = () => {
    if (userData.goalType === 'lose') return tdee - 500; // 1 lb/week loss
    if (userData.goalType === 'gain') return tdee + 250; // 0.5 lb/week gain
    return tdee; // maintain
  };
  const targetCalories = calculateTarget();

  // Derived state for selected date (shared aggregation — see utils/diaryAggregates)
  const {
    entries: selectedDateEntries,
    calories: consumed,
    protein: consumedProtein,
    carbs: consumedCarbs,
    fats: consumedFats,
  } = getDayNutrition(entries, selectedDate);

  const selectedDateWater = waterLogs.find(w => w.date === selectedDate)?.amount || 0;

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Streak Calculation
  const calculateTrueStreak = () => {
    if (!entries || entries.length === 0) return 0;

    // Get unique dates sorted descending
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if streak is alive
    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return 0; // Streak broken
    }

    let currentDate = uniqueDates.includes(todayStr) ? today : yesterday;

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1); // Move back 1 day
      } else {
        break; // Gap found
      }
    }

    return streak;
  };

  const currentStreak = calculateTrueStreak();

  // Entries API
  const addEntry = (name, calories, type = 'meal', notes = '', photoUri = null, protein = 0, carbs = 0, fats = 0) => {
    const newEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      calories,
      protein,
      carbs,
      fats,
      type,
      notes,
      photoUri,
      date: selectedDate, // Save to the currently viewed date!
      timestamp: Date.now(),
    };
    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    saveData('@kaizen_entries', newEntries);
  };

  const updateEntry = (id, updatedData) => {
    const newEntries = entries.map(e => e.id === id ? { ...e, ...updatedData } : e);
    setEntries(newEntries);
    saveData('@kaizen_entries', newEntries);
  };

  const deleteEntry = (id) => {
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    saveData('@kaizen_entries', newEntries);
  };

  // Weight API
  const addWeight = (weight) => {
    const newWeight = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      weight,
      date: getTodayString(),
      timestamp: Date.now(),
    };
    // remove existing weight for today if any to prevent duplicates
    const filtered = weights.filter(w => w.date !== getTodayString());
    const newWeights = [...filtered, newWeight];
    setWeights(newWeights);
    saveData('@kaizen_weights', newWeights);

    // store baseWeight if we don't have one, so we can revert if needed
    if (!userData.baseWeight && userData.currentWeight) {
      updateUserData({ baseWeight: userData.currentWeight, currentWeight: weight });
    } else {
      updateUserData({ currentWeight: weight });
    }
  };

  const deleteWeight = (id) => {
    const newWeights = weights.filter(w => w.id !== id);
    setWeights(newWeights);
    saveData('@kaizen_weights', newWeights);

    if (newWeights.length > 0) {
      const lastWeight = newWeights[newWeights.length - 1].weight;
      updateUserData({ currentWeight: lastWeight });
    } else {
      if (userData.baseWeight) {
        updateUserData({ currentWeight: userData.baseWeight });
      }
    }
  };

  // User Data API
  const updateUserData = (data) => {
    const newData = { ...userData, ...data };
    setUserData(newData);
    saveData('@kaizen_userData', newData);
  };

  // Favorites API
  const addFavorite = (name, calories, type = 'meal', protein = 0, carbs = 0, fats = 0) => {
    const newFavorite = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      calories,
      protein,
      carbs,
      fats,
      type,
    };
    const newFavorites = [...favorites, newFavorite];
    setFavorites(newFavorites);
    saveData('@kaizen_favorites', newFavorites);
  };

  const removeFavorite = (id) => {
    const newFavorites = favorites.filter(f => f.id !== id);
    setFavorites(newFavorites);
    saveData('@kaizen_favorites', newFavorites);
  };

  // Water API
  const logWater = (change) => {
    const existingLog = waterLogs.find(w => w.date === selectedDate);
    let newAmount = existingLog ? existingLog.amount + change : change;

    // Bounds check (0 to 10 glasses)
    if (newAmount < 0) newAmount = 0;
    if (newAmount > 10) newAmount = 10;

    let newLogs = [];
    if (existingLog) {
      newLogs = waterLogs.map(w => w.date === selectedDate ? { ...w, amount: newAmount } : w);
    } else {
      newLogs = [...waterLogs, { date: selectedDate, amount: newAmount }];
    }

    setWaterLogs(newLogs);
    saveData('@kaizen_water', newLogs);
  };

  const setWater = (amount) => {
    let newAmount = amount;
    if (newAmount < 0) newAmount = 0;
    if (newAmount > 10) newAmount = 10;

    const existingLog = waterLogs.find(w => w.date === selectedDate);
    let newLogs = [];
    if (existingLog) {
      newLogs = waterLogs.map(w => w.date === selectedDate ? { ...w, amount: newAmount } : w);
    } else {
      newLogs = [...waterLogs, { date: selectedDate, amount: newAmount }];
    }
    setWaterLogs(newLogs);
    saveData('@kaizen_water', newLogs);
  };

  // Legacy mappings to avoid immediate breaking changes
  const addCalories = (amount) => {
    // No-op, because addMeal now handles adding to total by calculating from entries
  };
  const addMeal = (name, calories) => {
    addEntry(name, calories, 'meal', '');
  };
  const setCalorieGoal = (goal) => updateUserData({ calorieGoal: goal });
  const setProfileCompleted = (completed) => updateUserData({ profileCompleted: completed });

  return (
    <CaloriesContext.Provider value={{
      isLoaded,
      entries,
      todayEntries: selectedDateEntries, // Map for compatibility
      weights,
      userData,
      dogImage,
      updateUserData,
      clearAppHistory,
      addEntry,
      updateEntry,
      deleteEntry,
      addWeight,
      deleteWeight,
      currentStreak,
      favorites,
      addFavorite,
      removeFavorite,
      waterLogs,
      todayWater: selectedDateWater, // Map for compatibility
      logWater,
      setWater,

      // Time Travel
      selectedDate,
      setSelectedDate,
      changeDate,
      getTodayString,

      // Auto Engine Calculations
      tdee,
      targetCalories,

      // Macros
      consumedProtein,
      consumedCarbs,
      consumedFats,

      // Legacy API
      consumed,
      addCalories,
      calorieGoal: userData.calorieGoal,
      setCalorieGoal,
      meals: selectedDateEntries, // Map meals to selectedDateEntries
      addMeal,
      profileCompleted: userData.profileCompleted,
      setProfileCompleted
    }}>
      {children}
    </CaloriesContext.Provider>
  );
};

export const useCalories = () => useContext(CaloriesContext);

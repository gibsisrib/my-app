/**
 * Single source of truth for per-day meal totals (home screen, progress, tests).
 */

export type DiaryEntry = {
  date: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  [key: string]: unknown;
};

function safeNumber(n: unknown): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function entriesForDate(entries: readonly DiaryEntry[], date: string): DiaryEntry[] {
  if (!Array.isArray(entries) || !date) return [];
  return entries.filter((e) => e && e.date === date);
}

export type DayNutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export function sumNutritionForEntries(dayEntries: readonly DiaryEntry[]): DayNutritionTotals {
  if (!Array.isArray(dayEntries) || dayEntries.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }
  return dayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + safeNumber(e.calories),
      protein: acc.protein + safeNumber(e.protein),
      carbs: acc.carbs + safeNumber(e.carbs),
      fats: acc.fats + safeNumber(e.fats),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

/** Entries for `date` plus macro totals in one pass. */
export function getDayNutrition(
  entries: readonly DiaryEntry[],
  date: string
): { entries: DiaryEntry[] } & DayNutritionTotals {
  const day = entriesForDate(entries, date);
  const totals = sumNutritionForEntries(day);
  return { entries: day, ...totals };
}

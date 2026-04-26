// Food search goes through your backend (`/food-search`): Open Food Facts.
export const FOOD_SEARCH_API_CONFIG = {
  endpoint: '/food-search',
  timeout: 8000,
};

export const OPEN_FOOD_FACTS_CONFIG = {
  baseUrl: '',
  timeout: 5000,
};

export interface FoodItem {
  id: string;
  name: string;
  /** Extra line in search results (serving, pack size, category) */
  subtitle?: string;
  /** Macros are a reference portion only (e.g. per 100g) — not a full menu item */
  per100gOnly?: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  servingSizeGrams: number;
  source: 'openfoodfacts';
}

export const CACHE_CONFIG = {
  ttlMinutes: 24 * 60,
  maxCacheSize: 500,
  debounceMs: 300,
};

'use strict';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

const NUTRIENT_ALIASES = {
  calories: ['1008', 'energy'],
  protein: ['1003', 'protein'],
  carbs: ['1005', 'carbohydrate, by difference', 'carbohydrate'],
  fats: ['1004', 'total lipid', 'fat'],
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'with',
  'the',
  'of',
  'in',
  'on',
  'cooked',
  'prepared',
  'visible',
  'piece',
  'pieces',
  'serving',
]);

function clampNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function round(value) {
  return Math.max(0, Math.round(clampNumber(value)));
}

function cleanSearchTerm(food) {
  return String(food || '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function significantTokens(text) {
  return cleanSearchTerm(text)
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function tokenOverlapScore(query, candidate) {
  const queryTokens = significantTokens(query);
  if (queryTokens.length === 0) return 0;
  const candidateText = cleanSearchTerm(candidate).toLowerCase();
  const matches = queryTokens.filter((token) => candidateText.includes(token)).length;
  return matches / queryTokens.length;
}

function getNutrientValue(food, aliases) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  for (const nutrient of nutrients) {
    const number = String(nutrient?.nutrientNumber || nutrient?.number || '').toLowerCase();
    const name = String(nutrient?.nutrientName || nutrient?.name || '').toLowerCase();
    const aliasMatch = aliases.some((alias) => number === alias || name.includes(alias));
    if (aliasMatch) {
      const value = Number(nutrient?.value ?? nutrient?.amount);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function nutrientsPer100g(food) {
  const calories = getNutrientValue(food, NUTRIENT_ALIASES.calories);
  const protein = getNutrientValue(food, NUTRIENT_ALIASES.protein);
  const carbs = getNutrientValue(food, NUTRIENT_ALIASES.carbs);
  const fats = getNutrientValue(food, NUTRIENT_ALIASES.fats);

  if ([calories, protein, carbs, fats].some((value) => value === null)) {
    return null;
  }

  return {
    calories: clampNumber(calories),
    protein: clampNumber(protein),
    carbs: clampNumber(carbs),
    fats: clampNumber(fats),
  };
}

function scaleNutrients(per100g, portionGrams) {
  const multiplier = clampNumber(portionGrams) / 100;
  return {
    calories: round(per100g.calories * multiplier),
    protein: round(per100g.protein * multiplier),
    carbs: round(per100g.carbs * multiplier),
    fats: round(per100g.fats * multiplier),
  };
}

function chooseBestUsdaFood(query, foods) {
  const candidates = (Array.isArray(foods) ? foods : [])
    .map((food) => {
      const description = food?.description || food?.lowercaseDescription || '';
      const per100g = nutrientsPer100g(food);
      return {
        food,
        description,
        per100g,
        score: tokenOverlapScore(query, description),
      };
    })
    .filter((candidate) => candidate.per100g && candidate.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

async function searchUsdaFood(query, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  const cleaned = cleanSearchTerm(query);
  if (!cleaned) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    query: cleaned,
    pageSize: '8',
    dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'].join(','),
  });

  const response = await fetchImpl(`${USDA_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status}`);
  }

  const data = await response.json();
  return chooseBestUsdaFood(cleaned, data?.foods);
}

async function enrichItemWithUsda(item, options) {
  const food = cleanSearchTerm(item?.food);
  const portionGrams = clampNumber(item?.portionGrams);
  if (!food || portionGrams <= 0) {
    return { ...item, source: 'ai_estimate' };
  }

  const match = await searchUsdaFood(food, options);
  if (!match) {
    return { ...item, source: 'ai_estimate' };
  }

  return {
    ...item,
    ...scaleNutrients(match.per100g, portionGrams),
    source: 'usda_fooddata_central',
    sourceFood: match.description,
    fdcId: match.food?.fdcId,
  };
}

async function applyUsdaNutrition(data, options = {}) {
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!options.apiKey || items.length === 0) {
    return data;
  }

  try {
    const enrichedItems = await Promise.all(items.map((item) => enrichItemWithUsda(item, options)));
    return {
      ...data,
      items: enrichedItems,
      nutritionSource: enrichedItems.some((item) => item.source === 'usda_fooddata_central')
        ? 'usda_fooddata_central_with_ai_portion_estimates'
        : 'ai_estimate',
    };
  } catch (error) {
    console.warn('USDA nutrition enrichment skipped:', error?.message || error);
    return data;
  }
}

module.exports = {
  cleanSearchTerm,
  chooseBestUsdaFood,
  nutrientsPer100g,
  scaleNutrients,
  searchUsdaFood,
  applyUsdaNutrition,
};

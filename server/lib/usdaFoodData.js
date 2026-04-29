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
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]);

const OIL_TERMS = new Set(['oil', 'butter', 'fat', 'grease']);
const SAUCE_TERMS = new Set(['sauce', 'dressing', 'gravy', 'juice', 'juices', 'pan']);
const MIXED_FOOD_KEYWORDS = [
  'pizza',
  'burger',
  'sandwich',
  'burrito',
  'taco',
  'quesadilla',
  'pasta',
  'lasagna',
  'casserole',
];

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
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function simplifyMixedFoodQuery(food) {
  const cleaned = cleanSearchTerm(food).toLowerCase();
  const tokens = significantTokens(cleaned);
  const keyword = MIXED_FOOD_KEYWORDS.find((term) => tokens.includes(term));
  if (!keyword) return cleaned;

  const ignoredMixedFoodTokens = new Set([
    'slice',
    'piece',
    'meat',
    'mixed',
    'topping',
  ]);
  const usefulModifiers = tokens.filter(
    (token) =>
      token !== keyword &&
      !ignoredMixedFoodTokens.has(token)
  );
  const modifiers = usefulModifiers.slice(0, 2).join(' ');
  return modifiers ? `${modifiers} ${keyword}` : keyword;
}

function mixedFoodSearchVariants(food) {
  const cleaned = cleanSearchTerm(food).toLowerCase();
  const simplified = simplifyMixedFoodQuery(cleaned);
  const tokens = significantTokens(cleaned);
  const keyword = MIXED_FOOD_KEYWORDS.find((term) => tokens.includes(term));
  if (!keyword) return [simplified];

  const modifiers = simplified
    .split(/\s+/)
    .filter((token) => token && token !== keyword);
  const variants = [simplified];
  for (const modifier of modifiers) {
    variants.push(`${modifier} ${keyword}`);
  }
  variants.push(keyword);
  return [...new Set(variants)];
}

function normalizeToken(token) {
  const cleaned = token.toLowerCase();
  if (cleaned === 'slices') return 'slice';
  if (cleaned === 'pieces') return 'piece';
  if (cleaned.endsWith('ies') && cleaned.length > 4) return `${cleaned.slice(0, -3)}y`;
  if (cleaned.length > 4 && cleaned.endsWith('es')) return cleaned.slice(0, -2);
  if (cleaned.length > 3 && cleaned.endsWith('s')) return cleaned.slice(0, -1);
  return cleaned;
}

function significantTokens(text) {
  return cleanSearchTerm(text)
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function tokenOverlapScore(query, candidate) {
  const queryTokens = significantTokens(query);
  if (queryTokens.length === 0) return 0;
  const candidateText = cleanSearchTerm(candidate).toLowerCase();
  const matches = queryTokens.filter((token) => candidateText.includes(token)).length;
  return matches / queryTokens.length;
}

function hasAnyToken(tokens, lookup) {
  return tokens.some((token) => lookup.has(token));
}

function isAllowedSpecialMatch(queryTokens, candidateText) {
  const candidate = candidateText.toLowerCase();
  const queryMentionsOil = hasAnyToken(queryTokens, OIL_TERMS);
  const queryMentionsSauce = hasAnyToken(queryTokens, SAUCE_TERMS);

  if (queryMentionsOil) {
    return /\b(oil|butter|fat|margarine|shortening)\b/.test(candidate);
  }

  if (queryMentionsSauce) {
    return /\b(sauce|dressing|gravy|broth|stock|juice|juices)\b/.test(candidate);
  }

  return true;
}

function isConfidentUsdaMatch(query, candidate, score) {
  const queryTokens = significantTokens(query);
  const candidateText = cleanSearchTerm(candidate).toLowerCase();
  if (queryTokens.length === 0) return false;
  if (!isAllowedSpecialMatch(queryTokens, candidateText)) return false;

  const threshold = queryTokens.length <= 2 ? 0.75 : 0.67;
  return score >= threshold;
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
    .filter((candidate) => candidate.per100g && isConfidentUsdaMatch(query, candidate.description, candidate.score))
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

async function fetchUsdaCandidates(cleaned, { apiKey, fetchImpl }) {
  const params = new URLSearchParams({
    api_key: apiKey,
    query: cleaned,
    pageSize: '8',
  });

  const response = await fetchImpl(`${USDA_SEARCH_URL}?${params.toString()}`);
  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`USDA API error: ${response.status}${body ? ` ${body.slice(0, 160)}` : ''}`);
  }

  const data = await response.json();
  return data?.foods;
}

async function searchUsdaFood(query, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) return null;
  const variants = mixedFoodSearchVariants(query).filter(Boolean);
  if (variants.length === 0) return null;

  for (const cleaned of variants) {
    const foods = await fetchUsdaCandidates(cleaned, { apiKey, fetchImpl });
    const match = chooseBestUsdaFood(cleaned, foods);
    if (match) {
      console.log(`USDA match: "${cleaned}" -> "${match.description}"`);
      return match;
    }
    console.log(`USDA no match: "${cleaned}"`);
  }

  return null;
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
  simplifyMixedFoodQuery,
  mixedFoodSearchVariants,
  chooseBestUsdaFood,
  nutrientsPer100g,
  scaleNutrients,
  searchUsdaFood,
  applyUsdaNutrition,
};

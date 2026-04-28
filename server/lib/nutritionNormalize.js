'use strict';

function clampInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  if (rounded < 0) return 0;
  return rounded;
}

function parseJsonFromAiContent(content) {
  const trimmed = String(content).trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('AI response was not valid JSON');
  }
}

function sumMealItemField(items, key) {
  return items.reduce((sum, row) => sum + clampInt(row?.[key]), 0);
}

function normalizeAiPayload(data) {
  const type = data?.type?.toLowerCase() === 'drink' ? 'drink' : 'meal';
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const usableItems = rawItems.filter(
    (row) => row && typeof row.food === 'string' && String(row.food).trim().length > 0
  );

  if (usableItems.length > 0) {
    const calories = sumMealItemField(usableItems, 'calories');
    const protein = sumMealItemField(usableItems, 'protein');
    const carbs = sumMealItemField(usableItems, 'carbs');
    const fats = sumMealItemField(usableItems, 'fats');
    let name =
      typeof data?.name === 'string' && data.name.trim()
        ? data.name.trim()
        : usableItems
            .map((row) => {
              const food = String(row.food).trim();
              const portion =
                typeof row.portion === 'string' && row.portion.trim()
                  ? ` — ${String(row.portion).trim()}`
                  : '';
              return `${food}${portion}`;
            })
            .join(' · ');
    if (name.length > 240) {
      name = `${name.slice(0, 237)}…`;
    }
    return { name, calories, protein, carbs, fats, type };
  }

  return {
    name: typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : 'Scanned Food',
    calories: clampInt(data?.calories),
    protein: clampInt(data?.protein),
    carbs: clampInt(data?.carbs),
    fats: clampInt(data?.fats),
    type,
  };
}

/**
 * When declared calories drift far from classic Atwater (4/4/9), trust macro-derived kcal
 * so logged totals stay internally consistent (common LLM mistake: row cals vs row macros).
 */
function applyAtwaterReconciliation(payload) {
  const calories = clampInt(payload?.calories);
  const protein = clampInt(payload?.protein);
  const carbs = clampInt(payload?.carbs);
  const fats = clampInt(payload?.fats);
  const macroCal = Math.round(4 * protein + 4 * carbs + 9 * fats);
  if (calories <= 0 || macroCal <= 0) {
    return { ...payload, calories, protein, carbs, fats };
  }
  const hi = Math.max(calories, macroCal);
  const lo = Math.min(calories, macroCal);
  const relativeDrift = (hi - lo) / hi;
  if (relativeDrift <= 0.28) {
    return { ...payload, calories, protein, carbs, fats };
  }
  return { ...payload, calories: macroCal, protein, carbs, fats };
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function getMentionedServingCount(text) {
  if (/\b(two|2)\s+(whole\s+)?grilled\s+cheese(\s+sandwich(es)?)?\b/.test(text)) return 2;
  if (/\b(three|3)\s+(whole\s+)?grilled\s+cheese(\s+sandwich(es)?)?\b/.test(text)) return 3;
  return 1;
}

function isPlainGrilledCheeseEstimate(text) {
  return (
    text.includes('grilled cheese') &&
    !includesAny(text, [
      'soup',
      'chips',
      'fries',
      'bacon',
      'ham',
      'turkey',
      'burger',
      'tomato soup',
      'side',
      'combo',
    ])
  );
}

function outsideRange(value, min, max) {
  return value < min || value > max;
}

/**
 * Food-specific guardrails catch LLM slips that are internally consistent but
 * nutritionally impossible for the named food (for example, a 25 kcal grilled cheese).
 */
function applyFoodBallparkSanity(payload, context = {}) {
  const name = typeof payload?.name === 'string' ? payload.name : '';
  const description = typeof context?.description === 'string' ? context.description : '';
  const text = `${name} ${description}`.toLowerCase();

  if (!isPlainGrilledCheeseEstimate(text)) {
    return payload;
  }

  const count = getMentionedServingCount(text);
  const perSandwich = {
    calories: 430,
    protein: 16,
    carbs: 36,
    fats: 25,
  };
  const range = {
    calories: [280 * count, 750 * count],
    protein: [8 * count, 32 * count],
    carbs: [20 * count, 80 * count],
    fats: [10 * count, 55 * count],
  };

  const calories = clampInt(payload?.calories);
  const protein = clampInt(payload?.protein);
  const carbs = clampInt(payload?.carbs);
  const fats = clampInt(payload?.fats);

  const implausible =
    outsideRange(calories, range.calories[0], range.calories[1]) ||
    outsideRange(protein, range.protein[0], range.protein[1]) ||
    outsideRange(carbs, range.carbs[0], range.carbs[1]) ||
    outsideRange(fats, range.fats[0], range.fats[1]);

  if (!implausible) {
    return { ...payload, calories, protein, carbs, fats };
  }

  return {
    ...payload,
    name: name || (count > 1 ? `${count} grilled cheese sandwiches` : 'Grilled cheese sandwich'),
    calories: perSandwich.calories * count,
    protein: perSandwich.protein * count,
    carbs: perSandwich.carbs * count,
    fats: perSandwich.fats * count,
  };
}

module.exports = {
  clampInt,
  parseJsonFromAiContent,
  sumMealItemField,
  normalizeAiPayload,
  applyAtwaterReconciliation,
  applyFoodBallparkSanity,
};

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  applyUsdaNutrition,
  chooseBestUsdaFood,
  mixedFoodSearchVariants,
  simplifyMixedFoodQuery,
  scaleNutrients,
} = require('./usdaFoodData');

const grilledChickenFood = {
  fdcId: 123,
  description: 'Chicken breast, grilled, cooked',
  foodNutrients: [
    { nutrientNumber: '1008', nutrientName: 'Energy', value: 165 },
    { nutrientNumber: '1003', nutrientName: 'Protein', value: 31 },
    { nutrientNumber: '1005', nutrientName: 'Carbohydrate, by difference', value: 0 },
    { nutrientNumber: '1004', nutrientName: 'Total lipid (fat)', value: 3.6 },
  ],
};

const roastedChickenFood = {
  fdcId: 124,
  description: 'Chicken breast, roasted, cooked',
  foodNutrients: grilledChickenFood.foodNutrients,
};

const hashBrownFood = {
  fdcId: 456,
  description: 'Potatoes, hash brown, refrigerated, prepared, pan-fried in canola oil',
  foodNutrients: grilledChickenFood.foodNutrients,
};

const oliveOilFood = {
  fdcId: 789,
  description: 'Oil, olive, salad or cooking',
  foodNutrients: [
    { nutrientNumber: '1008', nutrientName: 'Energy', value: 884 },
    { nutrientNumber: '1003', nutrientName: 'Protein', value: 0 },
    { nutrientNumber: '1005', nutrientName: 'Carbohydrate, by difference', value: 0 },
    { nutrientNumber: '1004', nutrientName: 'Total lipid (fat)', value: 100 },
  ],
};

const pineapplePizzaFood = {
  fdcId: 987,
  description: 'Pizza with pineapple and ham, regular crust',
  foodNutrients: [
    { nutrientNumber: '1008', nutrientName: 'Energy', value: 250 },
    { nutrientNumber: '1003', nutrientName: 'Protein', value: 11 },
    { nutrientNumber: '1005', nutrientName: 'Carbohydrate, by difference', value: 30 },
    { nutrientNumber: '1004', nutrientName: 'Total lipid (fat)', value: 10 },
  ],
};

describe('USDA FoodData helpers', () => {
  it('chooses a matching USDA food with complete nutrients', () => {
    const match = chooseBestUsdaFood('grilled chicken breast', [
      { description: 'Rice, white, cooked', foodNutrients: grilledChickenFood.foodNutrients },
      grilledChickenFood,
    ]);

    assert.equal(match.description, 'Chicken breast, grilled, cooked');
    assert.equal(match.per100g.protein, 31);
  });

  it('scales per-100g nutrition by AI-estimated portion grams', () => {
    assert.deepEqual(scaleNutrients({ calories: 165, protein: 31, carbs: 0, fats: 3.6 }, 200), {
      calories: 330,
      protein: 62,
      carbs: 0,
      fats: 7,
    });
  });

  it('enriches AI items with USDA nutrients when the API returns a match', async () => {
    const payload = {
      type: 'meal',
      items: [
        {
          food: 'grilled chicken breast',
          portion: '~200g cooked',
          portionGrams: 200,
          calories: 999,
          protein: 1,
          carbs: 1,
          fats: 1,
        },
      ],
    };

    const enriched = await applyUsdaNutrition(payload, {
      apiKey: 'test-key',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ foods: [grilledChickenFood] }),
      }),
    });

    assert.equal(enriched.nutritionSource, 'usda_fooddata_central_with_ai_portion_estimates');
    assert.equal(enriched.items[0].source, 'usda_fooddata_central');
    assert.equal(enriched.items[0].calories, 330);
    assert.equal(enriched.items[0].protein, 62);
    assert.equal(enriched.items[0].fdcId, 123);
  });

  it('ignores count words for matching but scales nutrition by total portion grams', async () => {
    const payload = {
      type: 'meal',
      items: [
        {
          food: 'Two roasted chicken breasts',
          portion: '2 roasted chicken breasts, ~300g total cooked weight',
          portionGrams: 300,
          calories: 999,
          protein: 1,
          carbs: 1,
          fats: 1,
        },
      ],
    };

    const enriched = await applyUsdaNutrition(payload, {
      apiKey: 'test-key',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ foods: [roastedChickenFood] }),
      }),
    });

    assert.equal(enriched.items[0].source, 'usda_fooddata_central');
    assert.equal(enriched.items[0].calories, 495);
    assert.equal(enriched.items[0].protein, 93);
    assert.equal(enriched.items[0].sourceFood, 'Chicken breast, roasted, cooked');
  });

  it('falls back to AI estimates when no USDA API key is configured', async () => {
    const payload = {
      type: 'meal',
      items: [{ food: 'toast', portionGrams: 40, calories: 110, protein: 4, carbs: 20, fats: 2 }],
    };

    assert.deepEqual(await applyUsdaNutrition(payload), payload);
  });

  it('rejects ambiguous pan juice matches to unrelated pan-fried foods', () => {
    const match = chooseBestUsdaFood('pan juices oil', [hashBrownFood]);
    assert.equal(match, null);
  });

  it('allows oil queries to match actual oil foods', () => {
    const match = chooseBestUsdaFood('olive oil', [hashBrownFood, oliveOilFood]);
    assert.equal(match.description, 'Oil, olive, salad or cooking');
  });

  it('simplifies mixed pizza labels into a common USDA-searchable term', () => {
    assert.equal(simplifyMixedFoodQuery('Meat and pineapple pizza slices'), 'pizza');
  });

  it('uses broad common terms first for mixed-food searches', () => {
    assert.deepEqual(mixedFoodSearchVariants('pineapple ham pizza'), [
      'pizza',
    ]);
  });

  it('uses simplified mixed-food labels while preserving total portion grams', async () => {
    const payload = {
      type: 'meal',
      items: [
        {
          food: 'Meat and pineapple pizza slices',
          portion: '2 slices, ~220g total',
          portionGrams: 220,
          calories: 999,
          protein: 1,
          carbs: 1,
          fats: 1,
        },
      ],
    };

    const enriched = await applyUsdaNutrition(payload, {
      apiKey: 'test-key',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ foods: [pineapplePizzaFood] }),
      }),
    });

    assert.equal(enriched.items[0].source, 'usda_fooddata_central');
    assert.equal(enriched.items[0].calories, 550);
    assert.equal(enriched.items[0].protein, 24);
    assert.equal(enriched.items[0].carbs, 66);
    assert.equal(enriched.items[0].fats, 22);
  });

  it('uses broad mixed-food USDA searches for more reliable matching', async () => {
    const payload = {
      type: 'meal',
      items: [
        {
          food: 'pineapple ham pizza',
          portion: '2 slices, ~220g total',
          portionGrams: 220,
          calories: 999,
          protein: 1,
          carbs: 1,
          fats: 1,
        },
      ],
    };
    const queries = [];

    const enriched = await applyUsdaNutrition(payload, {
      apiKey: 'test-key',
      fetchImpl: async (url) => {
        const query = new URL(url).searchParams.get('query');
        queries.push(query);
        return {
          ok: true,
          json: async () => ({
            foods: query === 'pizza' ? [pineapplePizzaFood] : [],
          }),
        };
      },
    });

    assert.deepEqual(queries, ['pizza']);
    assert.equal(enriched.items[0].source, 'usda_fooddata_central');
    assert.equal(enriched.items[0].calories, 550);
  });

  it('does not collapse specific sandwiches into generic sandwich searches', () => {
    assert.equal(simplifyMixedFoodQuery('grilled cheese sandwich'), 'grilled cheese sandwich');
  });
});

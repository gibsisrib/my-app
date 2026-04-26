'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAiPayload, applyAtwaterReconciliation } = require('./nutritionNormalize');

function macroDerivedKcal(p, c, f) {
  return Math.round(4 * p + 4 * c + 9 * f);
}

describe('AI payload ballpark (post-reconciliation)', () => {
  it('keeps internally consistent meal totals', () => {
    const raw = normalizeAiPayload({
      type: 'meal',
      items: [
        { food: 'Chicken', portion: '6 oz', calories: 280, protein: 45, carbs: 0, fats: 10 },
        { food: 'Rice', portion: '1 cup', calories: 200, protein: 4, carbs: 45, fats: 0 },
      ],
    });
    const out = applyAtwaterReconciliation(raw);
    const m = macroDerivedKcal(out.protein, out.carbs, out.fats);
    const hi = Math.max(out.calories, m);
    const lo = Math.min(out.calories, m);
    assert.ok(hi === 0 || (hi - lo) / hi <= 0.35, `cal ${out.calories} vs macro ${m} too far apart`);
  });

  it('pulls calories toward macros for wildly high declared kcal (LLM slip)', () => {
    const raw = normalizeAiPayload({
      type: 'drink',
      name: 'Bubble tea',
      items: [
        { food: 'Milk tea + boba', portion: 'medium', calories: 900, protein: 4, carbs: 55, fats: 12 },
      ],
    });
    const out = applyAtwaterReconciliation(raw);
    const m = macroDerivedKcal(out.protein, out.carbs, out.fats);
    assert.ok(Math.abs(out.calories - m) / Math.max(out.calories, m) <= 0.35);
  });
});

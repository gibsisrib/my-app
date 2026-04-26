'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAiPayload,
  applyAtwaterReconciliation,
  clampInt,
  parseJsonFromAiContent,
} = require('./nutritionNormalize');

describe('clampInt', () => {
  it('rounds and rejects negatives', () => {
    assert.equal(clampInt(12.4), 12);
    assert.equal(clampInt(-3), 0);
    assert.equal(clampInt('9'), 9);
    assert.equal(clampInt('x', 7), 7);
  });
});

describe('parseJsonFromAiContent', () => {
  it('parses JSON embedded in noise', () => {
    const out = parseJsonFromAiContent('here {"a":1} tail');
    assert.deepEqual(out, { a: 1 });
  });
});

describe('normalizeAiPayload', () => {
  it('sums a realistic single-plate multi-item response', () => {
    const ai = {
      type: 'meal',
      items: [
        { food: 'Grilled chicken breast', portion: '1 medium ~170g', calories: 280, protein: 52, carbs: 0, fats: 6 },
        { food: 'Cooked white rice', portion: '~1 cup', calories: 205, protein: 4, carbs: 45, fats: 0 },
        { food: 'Steamed broccoli', portion: '~1 cup', calories: 55, protein: 4, carbs: 11, fats: 1 },
      ],
    };
    const n = normalizeAiPayload(ai);
    assert.equal(n.calories, 540);
    assert.equal(n.protein, 60);
    assert.equal(n.carbs, 56);
    assert.equal(n.fats, 7);
    assert.ok(n.name.includes('chicken'));
  });

  it('falls back to flat fields when no usable items', () => {
    const n = normalizeAiPayload({ name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, type: 'meal' });
    assert.equal(n.calories, 95);
    assert.equal(n.protein, 1);
    assert.equal(n.carbs, 25);
    assert.equal(n.fats, 0);
  });
});

describe('applyAtwaterReconciliation', () => {
  it('leaves consistent AI totals unchanged', () => {
    const base = { name: 'x', calories: 540, protein: 60, carbs: 56, fats: 7, type: 'meal' };
    const macroCal = Math.round(4 * 60 + 4 * 56 + 9 * 7);
    assert.ok(Math.abs(macroCal - 540) / 540 < 0.28);
    const r = applyAtwaterReconciliation(base);
    assert.equal(r.calories, 540);
  });

  it('replaces calories when macros and declared kcal wildly disagree', () => {
    const bad = { name: 'bad llm', calories: 900, protein: 40, carbs: 30, fats: 10, type: 'meal' };
    const macroCal = Math.round(4 * 40 + 4 * 30 + 9 * 10);
    const r = applyAtwaterReconciliation(bad);
    assert.equal(r.calories, macroCal);
    assert.equal(r.protein, 40);
  });
});

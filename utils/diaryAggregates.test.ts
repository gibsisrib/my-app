import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  entriesForDate,
  getDayNutrition,
  sumNutritionForEntries,
  type DiaryEntry,
} from './diaryAggregates';

const sample: DiaryEntry[] = [
  {
    date: '2026-04-20',
    calories: 400,
    protein: 20,
    carbs: 40,
    fats: 10,
  },
  {
    date: '2026-04-20',
    calories: 300,
    protein: undefined,
    carbs: 30,
    fats: 5,
  },
  { date: '2026-04-21', calories: 500, protein: 50, carbs: 50, fats: 20 },
];

describe('entriesForDate', () => {
  it('returns only matching date', () => {
    const d = entriesForDate(sample, '2026-04-20');
    assert.equal(d.length, 2);
    assert.ok(d.every((e) => e.date === '2026-04-20'));
  });

  it('returns empty for unknown date', () => {
    assert.deepEqual(entriesForDate(sample, '1999-01-01'), []);
  });

  it('handles non-array', () => {
    assert.deepEqual(entriesForDate(null as unknown as DiaryEntry[], 'x'), []);
  });
});

describe('sumNutritionForEntries', () => {
  it('treats missing macros as zero', () => {
    const totals = sumNutritionForEntries(entriesForDate(sample, '2026-04-20'));
    assert.equal(totals.calories, 700);
    assert.equal(totals.protein, 20);
    assert.equal(totals.carbs, 70);
    assert.equal(totals.fats, 15);
  });

  it('ignores non-finite numbers', () => {
    const weird: DiaryEntry[] = [
      { date: 'd', calories: NaN as unknown as number, protein: 'x' as unknown as number, carbs: 10, fats: 1 },
    ];
    const t = sumNutritionForEntries(weird);
    assert.equal(t.calories, 0);
    assert.equal(t.protein, 0);
    assert.equal(t.carbs, 10);
    assert.equal(t.fats, 1);
  });
});

describe('getDayNutrition', () => {
  it('returns entries and totals together', () => {
    const r = getDayNutrition(sample, '2026-04-21');
    assert.equal(r.entries.length, 1);
    assert.equal(r.calories, 500);
    assert.equal(r.protein, 50);
    assert.equal(r.carbs, 50);
    assert.equal(r.fats, 20);
  });
});

import { describe, expect, it } from 'vitest'
import {
  RANGES,
  buildSeries,
  datesBetween,
  earliestDate,
  thin,
  windowFor,
} from '../chartSeries'
import type { DayRecord } from '../nutrition'
import type { WeightLog } from '../types'

const TODAY = '2026-09-01'

const day = (date: string, kcal: number, burned = 0): DayRecord => ({
  date,
  kcal,
  protein: kcal ? 90 : 0,
  carbs: kcal ? 120 : 0,
  fat: kcal ? 50 : 0,
  fibre: kcal ? 25 : 0,
  burned,
  salmonMeals: 0,
})

const weigh = (date: string, weightKg: number): WeightLog => ({
  id: date,
  date,
  weightKg,
  waistCm: null,
  hipCm: null,
})

const profile = {
  startWeightKg: 62,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'sedentary' as const,
}

describe('the window follows the data, not the calendar', () => {
  /*
   * The bug this module exists to prevent: the old chart always drew twelve
   * weeks, so one week of diary rendered as a single bar pinned to the right
   * edge with eleven weeks of white space, under an axis running from June for
   * a diary that started in August. It looked broken.
   */
  it('starts at the first logged day when the diary is younger than the range', () => {
    const w = windowFor('quarter', '2026-08-25', TODAY)
    expect(w.from).toBe('2026-08-25')
    expect(w.to).toBe(TODAY)
  })

  it('starts at the range when the diary is older than it', () => {
    const w = windowFor('month', '2025-01-01', TODAY)
    expect(w.from).toBe('2026-08-03')
    expect(datesBetween(w.from, w.to)).toHaveLength(30)
  })

  it('collapses to a single day for an empty diary', () => {
    const w = windowFor('all', null, TODAY)
    // No data means no history to draw; it must not invent two years of blanks.
    expect(datesBetween(w.from, w.to).length).toBeGreaterThan(0)
    const one = windowFor('month', TODAY, TODAY)
    expect(datesBetween(one.from, one.to)).toEqual([TODAY])
  })

  it('never starts in the future, however odd the data', () => {
    const w = windowFor('month', '2030-01-01', TODAY)
    expect(w.from).toBe(TODAY)
    expect(w.from <= w.to).toBe(true)
  })

  it('offers exactly the three ranges, shortest first', () => {
    expect(RANGES.map((r) => r.value)).toEqual(['month', 'quarter', 'all'])
    expect(RANGES.map((r) => r.days)).toEqual([...RANGES.map((r) => r.days)].sort((a, b) => a - b))
  })
})

describe('finding where the diary starts', () => {
  it('takes the earliest of a logged day or a weigh-in', () => {
    expect(
      earliestDate([day('2026-08-20', 1500), day('2026-08-10', 0)], [weigh('2026-08-15', 62)])
    ).toBe('2026-08-15')
  })

  it('ignores days with nothing logged', () => {
    // An empty day is not evidence the diary had started.
    expect(earliestDate([day('2026-01-01', 0), day('2026-08-20', 1500)], [])).toBe('2026-08-20')
  })

  it('returns null for a diary with nothing in it', () => {
    expect(earliestDate([], [])).toBeNull()
  })
})

describe('the plotted series', () => {
  const days = [
    day('2026-08-28', 1500),
    day('2026-08-29', 0),
    day('2026-08-30', 1400, 200),
    day('2026-08-31', 1600),
  ]
  const weights = [weigh('2026-08-28', 62), weigh('2026-08-31', 61.4)]
  const s = buildSeries(days, weights, profile)

  it('leaves an unlogged day as a gap, never as a zero', () => {
    // Plotting 0 kcal for a day nobody logged would draw a crash to the floor
    // and read as a fast, which is a lie the chart has no business telling.
    expect(s.points[1].kcal).toBeNull()
    expect(s.points[1].protein).toBeNull()
    expect(s.loggedDays).toBe(3)
  })

  it('carries every macro through for the macro chart', () => {
    expect(s.points[0].protein).toBe(90)
    expect(s.points[0].carbs).toBe(120)
    expect(s.points[0].fat).toBe(50)
    expect(s.points[0].fibre).toBe(25)
  })

  it('adds logged exercise on top of resting burn', () => {
    const plain = s.points[0].burned as number
    const trained = s.points[2].burned as number
    expect(trained - plain).toBeGreaterThan(150)
  })

  it('uses the weight you were at the time, not the weight you are now', () => {
    /*
     * Resting burn scales with body mass. Using today's weight across a month
     * of history would silently redraw the past every time you step on the
     * scale — the same chart would show a different burn tomorrow.
     */
    const heavier = buildSeries(days, [weigh('2026-08-28', 80)], profile)
    expect(heavier.points[0].burned).toBeGreaterThan(s.points[0].burned as number)
    // The later days follow the later weigh-in, so the two series diverge.
    expect(heavier.points[3].burned).toBeGreaterThan(s.points[3].burned as number)
  })

  it('gives no burn line at all without height and age', () => {
    // Better an absent line than one built on an invented body.
    const bare = buildSeries(days, weights, { ...profile, heightCm: null, age: null })
    expect(bare.points.every((p) => p.burned === null)).toBe(true)
  })

  it('marks weigh-ins only on the days they happened', () => {
    expect(s.points.map((p) => p.weightKg)).toEqual([62, null, null, 61.4])
    expect(s.weighIns).toBe(2)
  })

  it('carries the trend line across the days between weigh-ins', () => {
    /*
     * Averaging over the calendar would mean one reading plus six blanks, so
     * the line would jump on weigh-in day and flatline between. Averaging over
     * the readings and carrying it forward is what makes it a trend.
     */
    expect(s.points.every((p) => p.weightAvgKg !== null)).toBe(true)
    expect(s.points[1].weightAvgKg).toBe(62)
    expect(s.points[3].weightAvgKg).toBeCloseTo(61.7, 1)
  })

  it('reports the span it actually covers', () => {
    expect(s.from).toBe('2026-08-28')
    expect(s.to).toBe('2026-08-31')
  })

  it('survives a diary with no weigh-ins at all', () => {
    const none = buildSeries(days, [], profile)
    expect(none.weighIns).toBe(0)
    expect(none.points.every((p) => p.weightAvgKg === null)).toBe(true)
    expect(none.points.every((p) => p.burned !== null)).toBe(true)
  })
})

describe('thinning for the phone', () => {
  it('leaves a short series alone', () => {
    expect(thin([1, 2, 3], 10)).toEqual([1, 2, 3])
  })

  it('keeps the ends, so the axis labels stay true', () => {
    const long = Array.from({ length: 700 }, (_, i) => i)
    const out = thin(long, 60)
    expect(out).toHaveLength(60)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(699)
  })

  it('stays in order', () => {
    const out = thin(Array.from({ length: 300 }, (_, i) => i), 40)
    expect(out).toEqual([...out].sort((a, b) => a - b))
  })
})

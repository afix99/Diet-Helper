import { describe, expect, it } from 'vitest'
import {
  AGREEMENT_KCAL,
  MIN_BAND_KCAL,
  MIN_COMPLETENESS,
  burnRate,
  burnRateCopy,
} from '../burnRate'
import { trends, type TrendInput } from '../trends'
import { addDays } from '../dates'
import type { DayRecord } from '../nutrition'
import type { Targets, WeightLog } from '../types'

const TODAY = '2026-08-30'

const targets: Targets = {
  kcal: 1800,
  protein: 100,
  carbs: 180,
  fat: 60,
  fibre: 25,
  waterMl: 2200,
}

const profile = {
  startWeightKg: 70,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'moderate' as const,
}

const weigh = (date: string, weightKg: number): WeightLog => ({
  id: date,
  date,
  weightKg,
  waistCm: null,
  hipCm: null,
})

const daysOf = (n: number, kcal: number, burned = 0): DayRecord[] =>
  Array.from({ length: n }, (_, i) => ({
    date: addDays(TODAY, -(n - i)),
    kcal,
    protein: 100,
    carbs: 0,
    fat: 0,
    fibre: 25,
    burned,
    salmonMeals: 0,
  }))

/** Weigh-ins every `everyDays` over `weeks`, losing `perWeek` kg throughout. */
const scaleOf = (weeks: number, start: number, perWeek: number, everyDays = 7): WeightLog[] => {
  const total = weeks * 7
  const out: WeightLog[] = []
  for (let d = 0; d <= total; d += everyDays) {
    out.push(weigh(addDays(TODAY, -(total - d)), start - (perWeek * d) / 7))
  }
  return out
}

const input = (over: Partial<TrendInput> = {}): TrendInput => ({
  days: daysOf(56, 1700),
  weights: scaleOf(8, 70, 0.45),
  targets,
  profile,
  goalWeightKg: 60,
  today: TODAY,
  ...over,
})

const rateFor = (over: Partial<TrendInput> = {}) => burnRate(trends(input(over)))

describe('burnRate', () => {
  describe('the arithmetic', () => {
    /*
     * The case the whole feature rests on, worked by hand: eating 1,500 a day
     * and losing half a kilo a week means the body is spending
     *   1500 + (0.5 / 7) * 7700 = 1500 + 550 = 2050
     * a day. Anything else here is a bug in the inversion, not a judgement
     * call, so this is asserted to the calorie.
     */
    it('inverts energy balance exactly', () => {
      const r = rateFor({ days: daysOf(56, 1500), weights: scaleOf(8, 70, 0.5) })
      expect(r.ready).toBe(true)
      expect(r.observedKcal).toBe(2050)
    })

    it('adds rather than subtracts when the weight is going up', () => {
      // Gaining 0.25 kg/week on 2,400 a day: 2400 - (0.25/7)*7700 = 2125.
      const r = rateFor({ days: daysOf(56, 2400), weights: scaleOf(8, 62, -0.25) })
      expect(r.observedKcal).toBe(2125)
    })

    it('holds intake steady and lands on intake when weight is flat', () => {
      const r = rateFor({ days: daysOf(56, 1900), weights: scaleOf(8, 65, 0) })
      // No weight change means expenditure equalled intake, whatever the formula thinks.
      expect(r.observedKcal).toBe(1900)
    })

    /*
     * Logged exercise comes off, because `maintenanceFor` in this app excludes
     * it and every caller adds it back on top. Leaving it in would double-count
     * the gym on exactly the weeks someone went.
     */
    it('excludes logged exercise, matching what maintenanceFor means', () => {
      const plain = rateFor({ days: daysOf(56, 1800, 0), weights: scaleOf(8, 70, 0.4) })
      const trained = rateFor({ days: daysOf(56, 1800, 300), weights: scaleOf(8, 70, 0.4) })
      expect(plain.observedKcal! - trained.observedKcal!).toBe(300)
    })
  })

  describe('the gates', () => {
    it('waits for whatever the trend is waiting for, in the trend’s own words', () => {
      const t = trends(input({ weights: scaleOf(1, 70, 0.4) }))
      const r = burnRate(t)
      expect(r.ready).toBe(false)
      expect(r.needs).toBe(t.needs)
      expect(r.observedKcal).toBeNull()
    })

    it('refuses when height or age is missing rather than inventing a formula', () => {
      const r = rateFor({ profile: { ...profile, heightCm: null } })
      expect(r.ready).toBe(false)
      expect(r.needs).toMatch(/height and age/i)
    })

    /*
     * The gate that matters most. `trends` is satisfied by eight logged days
     * inside a two-month window; on a diary that sparse the average intake is
     * not an average of what was eaten, and the estimate would read low by
     * however much went uncounted.
     */
    it('refuses a diary too patchy to average, where trends would not', () => {
      const sparse = daysOf(56, 1700).map((d, i) => (i % 3 === 0 ? d : { ...d, kcal: 0 }))
      const t = trends(input({ days: sparse }))
      expect(t.ready).toBe(true)

      const r = burnRate(t)
      expect(r.ready).toBe(false)
      expect(r.completeness).toBeLessThan(MIN_COMPLETENESS)
      expect(r.needs).toMatch(/nothing logged/i)
      // And it says how many, because "be more complete" is not actionable.
      expect(r.needs).toMatch(/\d+ days/)
    })

    it('accepts a diary with ordinary gaps', () => {
      // One skipped day a week is 86% — a real diary, not a perfect one.
      const gappy = daysOf(56, 1700).map((d, i) => (i % 7 === 0 ? { ...d, kcal: 0 } : d))
      const r = burnRate(trends(input({ days: gappy })))
      expect(r.ready).toBe(true)
      expect(r.completeness).toBeGreaterThanOrEqual(MIN_COMPLETENESS)
    })

    it('counts completeness inside the weigh-in window, not across the whole diary', () => {
      // Weigh-ins cover the last four weeks; the diary is complete there and
      // empty before. That is a usable estimate, and loggedDays alone cannot see it.
      const days = daysOf(56, 1700).map((d, i) => (i < 28 ? { ...d, kcal: 0 } : d))
      const r = burnRate(trends(input({ days, weights: scaleOf(4, 70, 0.45) })))
      expect(r.ready).toBe(true)
    })
  })

  describe('the band', () => {
    it('never claims precision tighter than the 7,700 kcal/kg approximation allows', () => {
      const r = rateFor({ weights: scaleOf(8, 70, 0.45, 1) })
      expect(r.highKcal! - r.observedKcal!).toBeGreaterThanOrEqual(MIN_BAND_KCAL)
    })

    it('is wider when the scale is noisy than when it is clean', () => {
      const clean = rateFor({ weights: scaleOf(8, 70, 0.45) })
      const noisy = rateFor({
        weights: scaleOf(8, 70, 0.45).map((w, i) =>
          weigh(w.date, w.weightKg + (i % 2 === 0 ? 0.9 : -0.9))
        ),
      })
      const width = (r: { lowKcal: number | null; highKcal: number | null }) =>
        r.highKcal! - r.lowKcal!
      expect(width(noisy)).toBeGreaterThan(width(clean))
    })

    it('brackets the estimate symmetrically', () => {
      const r = rateFor()
      expect(r.observedKcal! - r.lowKcal!).toBe(r.highKcal! - r.observedKcal!)
    })
  })

  describe('the reading', () => {
    it('calls a small difference agreement', () => {
      const t = trends(input())
      const r = burnRate({ ...t, gapKcal: AGREEMENT_KCAL - 10 })
      expect(r.reading).toBe('agrees')
    })

    it('names the direction when the body burns more than the formula thought', () => {
      const t = trends(input())
      const r = burnRate({ ...t, gapKcal: 400 })
      expect(r.reading).toBe('above_formula')
      expect(r.differenceKcal).toBe(400)
    })

    it('names the direction when it comes in under', () => {
      const t = trends(input())
      const r = burnRate({ ...t, gapKcal: -400 })
      expect(r.reading).toBe('below_formula')
    })
  })

  /*
   * These are the assertions that keep the feature honest. The arithmetic
   * could be perfect and the feature still harmful if the sentence under the
   * number read as "your metabolism is slow, eat less".
   */
  describe('the copy', () => {
    const copyFor = (gapKcal: number) => burnRateCopy(burnRate({ ...trends(input()), gapKcal }))

    it('blames measurement before metabolism when the number comes in low', () => {
      const said = copyFor(-400)
      expect(said).toMatch(/unlogged/i)
      // And the explanation comes before any mention of metabolism.
      expect(said.indexOf('unlogged')).toBeLessThan(said.indexOf('metabolism'))
    })

    it('never tells her to eat less, in any direction', () => {
      /*
       * Matching "eat less" alone fails on the sentence that exists precisely
       * to rule it out — "it is not a reason to eat less" — so the phrase is
       * dropped where it is explicitly negated, and what remains has to be
       * clean. A naive regex here would have forced the copy to stop saying
       * the most protective thing in it.
       */
      for (const gap of [-600, -400, -200, 0, 200, 400, 600]) {
        const said = copyFor(gap)
          .toLowerCase()
          .replace(/\bnot a reason to eat less\b/g, '')
        expect(said).not.toMatch(/eat less|cut back|reduce your|too much|should be eating/)
      }
    })

    it('rules out eating less in so many words when the number reads low', () => {
      expect(copyFor(-400).toLowerCase()).toContain('not a reason to eat less')
    })

    it('says plainly when the body is doing more than the formula credited', () => {
      expect(copyFor(400)).toMatch(/more than the (formula|estimate)/i)
    })

    it('stays silent rather than guessing when not ready', () => {
      expect(burnRateCopy(burnRate(trends(input({ weights: scaleOf(1, 70, 0.4) }))))).toBe('')
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  GAP_NOISE_KCAL,
  MIN_LOGGED_DAYS,
  MIN_SPAN_DAYS,
  MIN_WEIGH_INS,
  ratePerWeek,
  trends,
  type TrendInput,
} from '../trends'
import { KCAL_PER_KG_FAT } from '../macroFate'
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

/** `n` completed days ending yesterday, each logged at `kcal`. */
const daysOf = (n: number, kcal: number, burned = 0): DayRecord[] =>
  Array.from({ length: n }, (_, i) => ({
    date: addDays(TODAY, -(n - i)),
    kcal,
    protein: 100,
    fibre: 25,
    burned,
    salmonMeals: 0,
  }))

/** Weekly weigh-ins over `weeks`, losing `perWeek` kg each time. */
const scaleOf = (weeks: number, start: number, perWeek: number): WeightLog[] =>
  Array.from({ length: weeks + 1 }, (_, i) =>
    weigh(addDays(TODAY, -7 * (weeks - i)), start - perWeek * i)
  )

const input = (over: Partial<TrendInput> = {}): TrendInput => ({
  days: daysOf(56, 1700),
  weights: scaleOf(8, 70, 0.45),
  targets,
  profile,
  goalWeightKg: 60,
  today: TODAY,
  ...over,
})

describe('ratePerWeek', () => {
  it('recovers a known slope', () => {
    expect(ratePerWeek(scaleOf(8, 70, 0.45))).toBeCloseTo(0.45, 2)
  })

  it('reports gaining as a negative rate', () => {
    expect(ratePerWeek(scaleOf(6, 70, -0.3))!).toBeCloseTo(-0.3, 2)
  })

  it('is steadier than first-versus-last when one reading is off', () => {
    const clean = scaleOf(4, 70, 0.5)
    const noisy = clean.map((w, i) =>
      i === clean.length - 1 ? { ...w, weightKg: w.weightKg + 1.5 } : w
    )
    const firstLast = (ws: WeightLog[]) => ((ws[0].weightKg - ws[ws.length - 1].weightKg) / 28) * 7

    const regressionShift = Math.abs(ratePerWeek(clean)! - ratePerWeek(noisy)!)
    const firstLastShift = Math.abs(firstLast(clean) - firstLast(noisy))
    expect(regressionShift).toBeLessThan(firstLastShift)
  })

  it('returns null below two readings', () => {
    expect(ratePerWeek([])).toBeNull()
    expect(ratePerWeek([weigh(TODAY, 70)])).toBeNull()
  })
})

describe('trends: the evidence gates', () => {
  it('asks for weigh-ins first', () => {
    const t = trends(input({ weights: [weigh('2026-08-01', 70), weigh('2026-08-20', 69)] }))
    expect(t.ready).toBe(false)
    expect(t.needs).toContain('1 more weigh-in')
    expect(MIN_WEIGH_INS).toBe(3)
  })

  it('refuses to draw a line through a short span', () => {
    const t = trends({
      ...input(),
      weights: [
        weigh(addDays(TODAY, -8), 70),
        weigh(addDays(TODAY, -4), 69.6),
        weigh(TODAY, 69.4),
      ],
    })
    expect(t.ready).toBe(false)
    expect(t.needs).toContain(`${MIN_SPAN_DAYS}`)
  })

  it('asks for logged days once the scale side is satisfied', () => {
    const t = trends(input({ days: daysOf(3, 1700) }))
    expect(t.ready).toBe(false)
    expect(t.needs).toContain(`${MIN_LOGGED_DAYS - 3} more logged days`)
  })

  it('still returns the weekly buckets while locked, so the chart has something to draw', () => {
    const t = trends(input({ weights: [weigh(addDays(TODAY, -20), 70)] }))
    expect(t.ready).toBe(false)
    expect(t.weeks.length).toBeGreaterThan(0)
  })
})

describe('trends: the arithmetic', () => {
  it('turns the measured rate into a daily deficit', () => {
    const t = trends(input())
    expect(t.ready).toBe(true)
    expect(t.ratePerWeekKg).toBeCloseTo(0.45, 2)
    expect(t.impliedDeficitKcal).toBeCloseTo(Math.round((0.45 * KCAL_PER_KG_FAT) / 7), -1)
    expect(t.avgIntakeKcal).toBe(1700)
  })

  it('calls the diary and the scale agreed when they are close', () => {
    // Maintenance for this profile is about 2130; eating 1700 implies ~430/day,
    // and 0.4 kg a week is about 440.
    const t = trends(input({ weights: scaleOf(8, 70, 0.4) }))
    expect(t.reading).toBe('agrees')
    expect(Math.abs(t.gapKcal!)).toBeLessThanOrEqual(GAP_NOISE_KCAL)
  })

  it('reports the ordinary under-reporting direction as a negative gap', () => {
    const t = trends(input({ weights: scaleOf(8, 70, 0.15) }))
    expect(t.reading).toBe('slower_than_diary')
    expect(t.gapKcal!).toBeLessThan(0)
  })

  it('separates a stall from under-reporting', () => {
    const t = trends(input({ weights: scaleOf(8, 70, 0) }))
    expect(t.reading).toBe('stalled')
  })
})

describe('trends: what it declines to project', () => {
  it('gives no arrival date below a real pace', () => {
    expect(trends(input({ weights: scaleOf(8, 70, 0.05) })).etaWeeks).toBeNull()
    expect(trends(input({ weights: scaleOf(8, 70, -0.2) })).etaWeeks).toBeNull()
  })

  it('gives no arrival date once the goal is met', () => {
    const t = trends(input({ weights: scaleOf(8, 62, 0.45), goalWeightKg: 60 }))
    expect(t.ratePerWeekKg).toBeCloseTo(0.45, 2)
    expect(t.etaWeeks).toBeNull()
  })

  it('projects from the measured rate, not the target', () => {
    const t = trends(input())
    // 70 - 8 x 0.45 = 66.4 left of a 60 kg goal, at 0.45 a week.
    expect(t.etaWeeks).toBe(Math.ceil((70 - 8 * 0.45 - 60) / 0.45))
    expect(t.etaDate).toBe(addDays(TODAY, t.etaWeeks! * 7))
  })
})

describe('trends: the weekly buckets', () => {
  it('leaves an unlogged week blank rather than calling it a fast', () => {
    const sparse = daysOf(56, 1700).filter((d) => d.date < addDays(TODAY, -14))
    const t = trends(input({ days: sparse }))
    const last = t.weeks[t.weeks.length - 1]
    expect(last.daysLogged).toBe(0)
    expect(last.avgKcal).toBeNull()
  })

  it('ends on the current week', () => {
    const t = trends(input())
    const last = t.weeks[t.weeks.length - 1]
    expect(last.start).toBe(addDays(TODAY, -6))
  })

  it('averages only the days that were logged', () => {
    const mixed = daysOf(56, 1700).map((d, i) => (i % 2 === 0 ? { ...d, kcal: 0 } : d))
    const t = trends(input({ days: mixed }))
    for (const w of t.weeks) {
      if (w.avgKcal !== null) expect(w.avgKcal).toBe(1700)
    }
  })
})

describe('logged exercise sits on the expenditure side', () => {
  const weighIns = [
    weigh('2026-08-01', 62),
    weigh('2026-08-15', 61.4),
    weigh('2026-08-29', 60.8),
  ]
  const run = (days: DayRecord[]) =>
    trends({ days, weights: weighIns, targets, profile, goalWeightKg: 55, today: TODAY })

  it('widens the deficit the diary claims, and leaves intake alone', () => {
    const plain = run(daysOf(20, 1600))
    const trained = run(daysOf(20, 1600, 300))

    expect(plain.ready && trained.ready).toBe(true)
    // Intake is what you ate. Exercise does not un-eat it.
    expect(trained.avgIntakeKcal).toBe(plain.avgIntakeKcal)
    expect(trained.avgBurnedKcal).toBe(300)
    expect(trained.loggedDeficitKcal).toBe((plain.loggedDeficitKcal ?? 0) + 300)
  })

  it('moves the gap by the same amount, and only that', () => {
    const plain = run(daysOf(20, 1600))
    const trained = run(daysOf(20, 1600, 300))
    // The scale has not changed, so the whole difference is the burn.
    expect(trained.impliedDeficitKcal).toBe(plain.impliedDeficitKcal)
    expect(trained.gapKcal).toBe((plain.gapKcal ?? 0) - 300)
  })

  it('reports zero when nothing was logged', () => {
    expect(run(daysOf(20, 1600)).avgBurnedKcal).toBe(0)
  })
})

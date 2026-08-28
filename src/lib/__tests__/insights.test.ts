import { describe, expect, it } from 'vitest'
import { insights, type InsightInput } from '../insights'
import type { DayRecord } from '../nutrition'
import type { Targets, WeightLog } from '../types'

const TARGETS: Targets = {
  kcal: 1500,
  protein: 90,
  carbs: 130,
  fat: 50,
  fibre: 30,
  waterMl: 2500,
}

/** 2026-08-24 is a Monday, so index 5 and 6 are Sat/Sun. */
const WEEK = [
  '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
  '2026-08-28', '2026-08-29', '2026-08-30',
]

const day = (
  date: string,
  kcal: number,
  protein = 95,
  fibre = 30,
  salmonMeals = 0
): DayRecord => ({ date, kcal, protein, fibre, salmonMeals })

const run = (over: Partial<InsightInput>) =>
  insights({
    days: [],
    targets: TARGETS,
    weights: [],
    startWeightKg: 62,
    goalWeightKg: 55,
    ...over,
  })

const ids = (over: Partial<InsightInput>) => run(over).map((i) => i.id)

describe('stays silent without enough evidence', () => {
  it('says nothing with no data', () => {
    expect(run({})).toEqual([])
  })

  it('says nothing from one or two logged days', () => {
    expect(run({ days: [day(WEEK[0], 1400), day(WEEK[1], 1400)] })).toEqual([])
  })

  it('never comments on the weekend gap without weekend days', () => {
    const days = WEEK.slice(0, 5).map((d) => day(d, 1400))
    expect(ids({ days })).not.toContain('weekend_gap')
  })
})

describe('weekday vs weekend', () => {
  it('flags a large weekend swing', () => {
    const days = [
      ...WEEK.slice(0, 5).map((d) => day(d, 1300)),
      day(WEEK[5], 2200),
      day(WEEK[6], 2100),
    ]
    const found = run({ days }).find((i) => i.id === 'weekend_gap')
    expect(found?.tone).toBe('watch')
    expect(found?.detail).toContain('1300')
    expect(found?.detail).toContain('2150')
  })

  it('ignores a small swing', () => {
    const days = WEEK.map((d) => day(d, 1400))
    expect(ids({ days })).not.toContain('weekend_gap')
  })
})

describe('protein', () => {
  it('praises a high hit rate', () => {
    const days = WEEK.map((d) => day(d, 1400, 95))
    expect(ids({ days })).toContain('protein_strong')
  })

  it('flags a consistently low intake', () => {
    const days = WEEK.map((d) => day(d, 1400, 45))
    const found = run({ days }).find((i) => i.id === 'protein_low')
    expect(found?.tone).toBe('watch')
    expect(found?.detail).toContain('45g')
  })
})

describe('fibre', () => {
  it('flags fibre that is low on most days', () => {
    const days = WEEK.map((d) => day(d, 1400, 95, 10))
    expect(ids({ days })).toContain('fibre_low')
  })

  it('says nothing when fibre is fine', () => {
    const days = WEEK.map((d) => day(d, 1400, 95, 32))
    expect(ids({ days })).not.toContain('fibre_low')
  })
})

describe('omega-3', () => {
  it('credits three salmon meals a week', () => {
    const days = WEEK.map((d, i) => day(d, 1400, 95, 30, i < 3 ? 1 : 0))
    expect(ids({ days })).toContain('omega_good')
  })

  it('mentions cheaper oily fish when none is logged', () => {
    const days = WEEK.map((d) => day(d, 1400))
    const found = run({ days }).find((i) => i.id === 'omega_none')
    expect(found?.detail).toContain('kembung')
  })
})

describe('rate of loss', () => {
  const w = (date: string, weightKg: number): WeightLog => ({
    id: date,
    date,
    weightKg,
    waistCm: null,
    hipCm: null,
  })
  const days = WEEK.map((d) => day(d, 1400))

  it('needs at least ten days between weigh-ins before judging pace', () => {
    const weights = [w('2026-08-24', 62), w('2026-08-27', 61)]
    expect(ids({ days, weights })).not.toContain('rate_ideal')
  })

  it('recognises a sustainable rate', () => {
    // 1.0 kg over 14 days = 0.5 kg/week.
    const weights = [w('2026-08-10', 62), w('2026-08-24', 61)]
    expect(ids({ days, weights })).toContain('rate_ideal')
  })

  it('warns when loss is too fast', () => {
    // 3 kg over 14 days = 1.5 kg/week.
    const weights = [w('2026-08-10', 62), w('2026-08-24', 59)]
    const found = run({ days, weights }).find((i) => i.id === 'rate_fast')
    expect(found?.tone).toBe('watch')
    // The advice is to eat more, not less — this must not read as "cut harder".
    expect(found?.detail).toContain('a little more')
  })

  it('notes a stall only after three weeks', () => {
    const weights = [w('2026-08-01', 62), w('2026-08-24', 62)]
    expect(ids({ days, weights })).toContain('rate_stalled')
  })

  it('projects a finish date from the current pace', () => {
    const weights = [w('2026-08-10', 62), w('2026-08-24', 61)]
    const eta = run({ days, weights }).find((i) => i.id === 'eta')
    expect(eta?.title).toMatch(/weeks to go/)
    // 6 kg left at 0.5/week = 12 weeks.
    expect(eta?.title).toContain('12')
  })
})

describe('tone', () => {
  it('only ever uses the three defined tones', () => {
    const days = WEEK.map((d) => day(d, 1400, 40, 8))
    for (const i of run({ days })) {
      expect(['good', 'neutral', 'watch']).toContain(i.tone)
    }
  })
})

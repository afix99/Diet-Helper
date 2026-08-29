import { describe, expect, it } from 'vitest'
import { MIN_LOW_DAYS, underEating } from '../underEating'
import type { DayRecord } from '../nutrition'

const day = (date: string, kcal: number): DayRecord => ({
  date,
  kcal,
  protein: 0,
  fibre: 0,
  salmonMeals: 0,
})

const profile = {
  startWeightKg: 62,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
}
const TODAY = '2026-08-29'

describe('underEating', () => {
  it('fires after two completed days below the floor', () => {
    const r = underEating(
      [day('2026-08-26', 900), day('2026-08-27', 1050), day('2026-08-28', 1600)],
      profile,
      TODAY
    )
    expect(r.triggered).toBe(true)
    expect(r.lowDays.map((d) => d.date)).toEqual(['2026-08-26', '2026-08-27'])
  })

  it('stays quiet on a single low day', () => {
    const r = underEating([day('2026-08-27', 900), day('2026-08-28', 1700)], profile, TODAY)
    expect(r.triggered).toBe(false)
    expect(MIN_LOW_DAYS).toBe(2)
  })

  it('never counts today, which is still in progress', () => {
    // A real morning: yesterday was low, and today only has breakfast in it.
    const r = underEating([day('2026-08-28', 800), day(TODAY, 300)], profile, TODAY)
    expect(r.triggered).toBe(false)
    expect(r.lowDays.map((d) => d.date)).toEqual(['2026-08-28'])
  })

  it('never counts unlogged days as starvation', () => {
    const r = underEating(
      [day('2026-08-26', 0), day('2026-08-27', 0), day('2026-08-28', 0)],
      profile,
      TODAY
    )
    expect(r.triggered).toBe(false)
    expect(r.lowDays).toEqual([])
  })

  it('forgets low days older than the window', () => {
    const old = Array.from({ length: 8 }, (_, i) =>
      day(`2026-08-${String(10 + i).padStart(2, '0')}`, 700)
    )
    const recent = Array.from({ length: 7 }, (_, i) =>
      day(`2026-08-${String(22 + i).padStart(2, '0')}`, 1800)
    )
    expect(underEating([...old, ...recent], profile, TODAY).triggered).toBe(false)
  })

  it('reports resting burn only when it is above the floor', () => {
    expect(underEating([], profile, TODAY).restingKcal).toBeGreaterThan(1200)
    // No height or age: nothing personal to say.
    expect(underEating([], { ...profile, heightCm: null }, TODAY).restingKcal).toBeNull()
    // A small profile whose BMR sits under the floor: the floor is the story.
    const small = { startWeightKg: 44, heightCm: 147, age: 70, sex: 'female' as const }
    expect(underEating([], small, TODAY).restingKcal).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { KCAL_PER_KG_FAT, macroFate, type MacroFateInput, type MacroKey } from '../macroFate'
import { statusBand } from '../nutrition'
import type { Macros, Targets } from '../types'

const targets: Targets = {
  kcal: 1800,
  protein: 100,
  carbs: 180,
  fat: 60,
  fibre: 25,
  waterMl: 2200,
}

/** Height and age present, so maintenance is computable. Mifflin gives ~2050 TDEE. */
const profile = {
  startWeightKg: 62,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'moderate' as const,
}

const totals = (over: Partial<Macros> = {}): Macros => ({
  kcal: 1600,
  protein: 90,
  carbs: 170,
  fat: 50,
  fibre: 20,
  ...over,
})

const input = (t: Macros): MacroFateInput => ({ totals: t, targets, profile })
const ALL: MacroKey[] = ['protein', 'carbs', 'fat', 'fibre']

/** Every word the sheet puts in front of someone, as one string. */
const said = (key: MacroKey, t: Macros) => {
  const f = macroFate(input(t), key)
  return [
    f.headline,
    f.verdict.line,
    f.verdict.detail,
    ...f.steps.flatMap((s) => [s.lead, s.detail]),
    f.footer,
  ].join(' ')
}

describe('macroFate: the overage itself', () => {
  it('reports nothing over at or below target', () => {
    expect(macroFate(input(totals({ carbs: 180 })), 'carbs').overBy).toBe(0)
    expect(macroFate(input(totals({ carbs: 120 })), 'carbs').overBy).toBe(0)
  })

  it('converts grams over into calories at the right rate', () => {
    const f = macroFate(input(totals({ carbs: 230 })), 'carbs')
    expect(f.overBy).toBe(50)
    expect(f.overKcal).toBe(200) // 50g x 4
  })

  it('never prices fibre in calories, because it is not fuel', () => {
    const f = macroFate(input(totals({ fibre: 45 })), 'fibre')
    expect(f.overBy).toBe(20)
    expect(f.overKcal).toBeNull()
  })
})

describe('macroFate: what it is willing to claim', () => {
  it('claims no fat gain from a macro overage while eating below maintenance', () => {
    // 400g of carbs, more than double the target, but only 1600 kcal for the day.
    const f = macroFate(input(totals({ carbs: 400, kcal: 1600 })), 'carbs')
    expect(f.energy).toBe('deficit')
    expect(f.fatGainG).toBe(0)
    expect(f.verdict.line).toBe('None of it gets stored.')
    expect(said('carbs', totals({ carbs: 400, kcal: 1600 }))).not.toMatch(/could stick/)
  })

  it('quantifies a real surplus in grams, never kilograms', () => {
    // 2550 kcal against ~2050 maintenance: about 500 over.
    const f = macroFate(input(totals({ kcal: 2550, fat: 110 })), 'fat')
    expect(f.energy).toBe('surplus')
    expect(f.balanceKcal).toBeGreaterThan(400)
    expect(f.fatGainG).toBeCloseTo(Math.round((f.balanceKcal! / KCAL_PER_KG_FAT) * 1000), 0)
    expect(f.fatGainG).toBeLessThan(100)
    expect(f.verdict.line).toMatch(/^About \d+g of it could stick\.$/)
    expect(said('fat', totals({ kcal: 2550, fat: 110 }))).not.toMatch(/kilograms? of/)
  })

  it('never prints the 7700 figure without calling it rough', () => {
    const body = said('fat', totals({ kcal: 2550, fat: 110 }))
    expect(body).toContain('7,700')
    expect(body).toContain('Rough')
  })

  it('refuses to guess when maintenance cannot be computed', () => {
    const f = macroFate(
      { totals: totals({ carbs: 300 }), targets, profile: { ...profile, heightCm: null } },
      'carbs'
    )
    expect(f.energy).toBe('unknown')
    expect(f.maintenanceKcal).toBeNull()
    expect(f.fatGainG).toBe(0)
    expect(f.verdict.line).toBe('Cannot tell yet.')
    expect(f.verdict.detail).toContain('not the same thing as what you burn')
    expect(f.verdict.detail).not.toMatch(/could stick|\d+g of/)
  })

  it('says fibre is not stored, in every energy state', () => {
    for (const dayKcal of [1200, 1900, 2600]) {
      const body = said('fibre', totals({ fibre: 50, kcal: dayKcal }))
      expect(body).toContain('floor, not a ceiling')
      expect(body).toContain('Most passes straight through')
    }
  })

  it('always closes on the portion nudge', () => {
    for (const key of ALL) {
      const f = macroFate(input(totals({ protein: 150, carbs: 300, fat: 90, fibre: 40 })), key)
      expect(f.footer).toMatch(/portion guess is probably off by more than \d+g/)
    }
  })
})

describe('macroFate: what it deliberately does not say', () => {
  /*
   * The medical footer was removed at the user's request. The app still carries
   * the full disclaimer once, in Settings, which is where it belongs. This pins
   * the removal so it cannot creep back in a later copy edit.
   */
  it('sends nobody to a doctor', () => {
    for (const key of ALL) {
      for (const dayKcal of [1200, 1900, 2600]) {
        const body = said(key, totals({ protein: 150, carbs: 300, fat: 90, fibre: 40, kcal: dayKcal }))
        expect(body).not.toMatch(/doctor|dietitian|clinician|medical advice/i)
      }
    }
  })

  /*
   * It first shipped at about 250 words, which is a wall — and a wall is a thing
   * people close rather than read. This is the guard against it growing back.
   */
  it('stays short enough to read in one glance', () => {
    const longest = ALL.flatMap((key) =>
      [1200, 1900, 2600].map((kcal) => ({
        key,
        kcal,
        words: said(key, totals({ carbs: 300, kcal })).split(/\s+/).length,
      }))
    ).sort((a, b) => b.words - a.words)[0]
    expect(longest.words, `${longest.key} at ${longest.kcal} kcal`).toBeLessThanOrEqual(90)
  })

  it('gives every macro exactly two steps', () => {
    for (const key of ALL) {
      expect(macroFate(input(totals()), key).steps).toHaveLength(2)
    }
  })
})

describe('macroFate: agreement with the rest of the screen', () => {
  it('never calls a day a surplus that the status pill calls well under', () => {
    for (const dayKcal of [900, 1300, 1600, 1800, 2100, 2600]) {
      const f = macroFate(input(totals({ kcal: dayKcal })), 'carbs')
      const band = statusBand(dayKcal, targets.kcal)
      if (f.energy === 'surplus') expect(band).not.toBe('under')
      if (band === 'under') expect(f.energy).not.toBe('surplus')
    }
  })

  it('uses the latest weigh-in for maintenance, not the starting weight', () => {
    const base = macroFate(input(totals({ kcal: 2100 })), 'carbs')
    const heavier = macroFate(
      { totals: totals({ kcal: 2100 }), targets, profile, latestWeightKg: 90 },
      'carbs'
    )
    expect(heavier.maintenanceKcal!).toBeGreaterThan(base.maintenanceKcal!)
  })

  it('reports the burn figure the maintenance calculation actually used', () => {
    const f = macroFate(input(totals({ kcal: 1600 })), 'carbs')
    expect(f.verdict.detail).toContain(f.maintenanceKcal!.toLocaleString('en-GB'))
  })
})

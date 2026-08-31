import { describe, expect, it } from 'vitest'
import exercisesJson from '../../../seed/exercises.json'
import { EXERCISES, EXERCISE_CATEGORIES } from '../catalogue'
import {
  MAX_MINUTES,
  MENTAL_CATEGORY,
  REST_MET,
  bodyWeightFor,
  burnFor,
  clampMinutes,
  exerciseById,
  isMentalWork,
  netMet,
  totalBurn,
} from '../exercise'
import { particlesFor } from '../burst'
import { EXERCISE_STYLES, FALLBACK, exerciseStyleFor } from '../burstPalette'
import { addActivity, removeActivity, setActivityMinutes } from '../logEdits'
import { defaultData } from '../store/defaults'

const WEIGHT = 62

describe('the resting correction', () => {
  it('charges nothing for a 1-MET activity', () => {
    // The whole point: one MET is what the target already contains.
    expect(burnFor(REST_MET, WEIGHT, 60)).toBe(0)
  })

  it('never refunds calories for something below resting', () => {
    expect(netMet(0.8)).toBe(0)
    expect(burnFor(0.8, WEIGHT, 60)).toBe(0)
  })

  it('matches the formula by hand', () => {
    // (8.3 - 1) x 3.5 x 62 / 200 x 30 = 237.6...
    expect(burnFor(8.3, WEIGHT, 30)).toBe(238)
    // (2.5 - 1) x 3.5 x 62 / 200 x 60 = 97.65
    expect(burnFor(2.5, WEIGHT, 60)).toBe(98)
  })

  it('comes in below the gross figure every app quotes', () => {
    const gross = Math.round((2.5 * 3.5 * WEIGHT * 60) / 200) // 163
    expect(burnFor(2.5, WEIGHT, 60)).toBeLessThan(gross)
    // A 40% correction for gentle work, which is where it matters most.
    expect(burnFor(2.5, WEIGHT, 60) / gross).toBeLessThan(0.65)
  })

  it('scales linearly with minutes and with weight', () => {
    expect(burnFor(6, WEIGHT, 60)).toBe(burnFor(6, WEIGHT, 30) * 2)
    expect(burnFor(6, 2 * WEIGHT, 30)).toBe(burnFor(6, WEIGHT, 30) * 2)
  })

  it('refuses to invent a burn from nothing', () => {
    expect(burnFor(8, 0, 30)).toBe(0)
    expect(burnFor(8, WEIGHT, 0)).toBe(0)
    expect(burnFor(8, WEIGHT, -30)).toBe(0)
  })
})

describe('the catalogue', () => {
  it('loads every seeded row', () => {
    expect(EXERCISES.length).toBe(exercisesJson.length)
    expect(EXERCISES.length).toBeGreaterThanOrEqual(70)
  })

  it('gives every row a unique slug', () => {
    const slugs = EXERCISES.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('keeps every MET inside the range the Compendium covers', () => {
    for (const e of EXERCISES) {
      expect(e.met).toBeGreaterThanOrEqual(1)
      expect(e.met).toBeLessThanOrEqual(20)
    }
  })

  it('gives every row a name, a category and a note', () => {
    for (const e of EXERCISES) {
      expect(e.name.length).toBeGreaterThan(0)
      expect(EXERCISE_CATEGORIES).toContain(e.category)
      expect(e.notes && e.notes.length).toBeTruthy()
    }
  })

  it('is resolvable by id', () => {
    expect(exerciseById('badminton-casual')?.name).toBe('Badminton, social')
    expect(exerciseById('not-a-thing')).toBeUndefined()
  })
})

describe('mental work is honest about its size', () => {
  const hour = (id: string) => burnFor(exerciseById(id)!.met, WEIGHT, 60)

  it('prices an hour of study at about fifty calories', () => {
    expect(hour('study')).toBeGreaterThan(40)
    expect(hour('study')).toBeLessThan(65)
  })

  it('never lets a study session look like a meal', () => {
    // Three solid hours of revision, and it is still under a plate of rice.
    expect(burnFor(exerciseById('study')!.met, WEIGHT, 180)).toBeLessThan(250)
  })

  it('puts reading and sitting quietly near twenty', () => {
    expect(hour('reading')).toBeLessThan(30)
    expect(hour('sitting-quietly')).toBeLessThan(30)
  })

  it('costs less than driving, which is the point', () => {
    expect(hour('study')).toBeLessThan(hour('driving'))
  })

  it('explains itself on every row in the group', () => {
    const mental = EXERCISES.filter(isMentalWork)
    expect(mental.length).toBeGreaterThan(5)
    for (const e of mental) {
      expect(e.category).toBe(MENTAL_CATEGORY)
      // Each one says, in its own words, that tiredness is not fuel.
      expect(e.notes).toMatch(/mental fatigue/i)
    }
  })
})

describe('logging an activity', () => {
  const base = defaultData()
  let n = 0
  const mint = () => `a${(n += 1)}`
  const badminton = exerciseById('badminton-casual')!

  it('snapshots the kcal so it cannot re-price itself later', () => {
    const d = addActivity(base, '2026-08-31', badminton, 30, WEIGHT, mint)
    const logged = d.activities[0]
    expect(logged.kcal).toBe(burnFor(badminton.met, WEIGHT, 30))

    // Weighing in heavier next month must not rewrite last month's badminton.
    const later = addActivity(d, '2026-09-30', badminton, 30, 70, mint)
    expect(later.activities[0].kcal).toBe(logged.kcal)
    expect(later.activities[1].kcal).toBeGreaterThan(logged.kcal)
  })

  it('re-prices a duration change at the rate it was first logged at', () => {
    const d = addActivity(base, '2026-08-31', badminton, 30, WEIGHT, mint)
    const doubled = setActivityMinutes(d, d.activities[0].id, 60)
    expect(doubled.activities[0].minutes).toBe(60)
    expect(doubled.activities[0].kcal).toBe(d.activities[0].kcal * 2)
  })

  it('clamps a mistyped duration rather than believing it', () => {
    expect(clampMinutes(0)).toBe(1)
    expect(clampMinutes(99999)).toBe(MAX_MINUTES)
    expect(clampMinutes(Number.NaN)).toBe(30)
  })

  it('removes cleanly', () => {
    const d = addActivity(base, '2026-08-31', badminton, 30, WEIGHT, mint)
    expect(removeActivity(d, d.activities[0].id).activities).toHaveLength(0)
  })

  it('totals what was logged', () => {
    let d = addActivity(base, '2026-08-31', badminton, 30, WEIGHT, mint)
    d = addActivity(d, '2026-08-31', exerciseById('study')!, 60, WEIGHT, mint)
    expect(totalBurn(d.activities)).toBe(d.activities[0].kcal + d.activities[1].kcal)
  })
})

describe('which body the burn is priced against', () => {
  it('prefers the latest weigh-in and falls back to the start weight', () => {
    expect(bodyWeightFor(62, 58)).toBe(58)
    expect(bodyWeightFor(62, null)).toBe(62)
    expect(bodyWeightFor(62, 0)).toBe(62)
  })
})

describe('a logged workout looks like movement, not dinner', () => {
  it('gives every catalogue group its own burst style', () => {
    for (const cat of EXERCISE_CATEGORIES) {
      expect(EXERCISE_STYLES[cat]).toBeDefined()
      expect(exerciseStyleFor(cat)).not.toBe(FALLBACK)
    }
  })

  it('draws exercise from the exercise palette, never the food one', () => {
    const badminton = exerciseById('badminton-casual')!
    const asExercise = particlesFor(100, 100, badminton, { kind: 'exercise' })
    const asFood = particlesFor(100, 100, badminton)
    expect(asExercise[0].colour).toBe(EXERCISE_STYLES.SPORTS.colours[0])
    // SPORTS is not a food category, so the food lookup would fall back.
    expect(asFood[0].colour).toBe(FALLBACK.colours[0])
  })

  it('throws the faintest particles for mental work', () => {
    const study = exerciseById('study')!
    const run = exerciseById('run-moderate')!
    const quiet = particlesFor(0, 0, study, { kind: 'exercise' })[0]
    const loud = particlesFor(0, 0, run, { kind: 'exercise' })[0]
    expect(quiet.weight).toBeLessThan(loud.weight)
  })
})

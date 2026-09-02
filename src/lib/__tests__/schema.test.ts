import { describe, expect, it } from 'vitest'
import { repair } from '../store/schema'
import { defaultData } from '../store/defaults'
import { DEFAULT_TARGETS } from '../seedDefaults'

/**
 * The contract these all check is one sentence: a bad row costs you that row
 * and nothing else. Anything that drops a whole collection because one member
 * of it was unreadable is a regression, however well-intentioned.
 */

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'e1',
  date: '2026-08-30',
  slot: 'lunch' as const,
  foodId: 'nasi-lemak',
  recipeId: null,
  customName: null,
  servings: 1,
  notes: null,
  macros: { kcal: 389, protein: 8.4, carbs: 52.1, fat: 16.3, fibre: 2.2 },
  ...over,
})

describe('repair', () => {
  it('leaves a good document alone', () => {
    const good = defaultData()
    good.entries = [entry()]
    const { data, repaired } = repair(JSON.parse(JSON.stringify(good)))
    expect(repaired).toBe(false)
    expect(data).toEqual(good)
  })

  it('returns a usable diary from nothing at all', () => {
    for (const junk of [null, undefined, {}, [], 'a string', 42]) {
      const { data } = repair(junk)
      expect(data.targets).toEqual(DEFAULT_TARGETS)
      expect(data.entries).toEqual([])
      // Complete, not partial — the screens downstream index into all of these.
      expect(data.water).toEqual({})
      expect(data.pet.worn).toEqual({})
      expect(data.dismissals.underEating).toBeNull()
    }
  })

  describe('salvage, not rejection', () => {
    it('keeps the good entries and drops only the bad one', () => {
      const { data, dropped, repaired } = repair({
        entries: [entry({ id: 'a' }), { id: 'b' }, entry({ id: 'c' })],
      })
      expect(data.entries.map((e) => e.id)).toEqual(['a', 'c'])
      expect(dropped.entries).toBe(1)
      expect(repaired).toBe(true)
    })

    /*
     * The case that motivated the whole file. `servings: null` survives JSON
     * perfectly well, multiplies into NaN, and one of them makes every total on
     * Today read NaN with nothing to say where it came from.
     */
    it('drops an entry whose servings would poison every total', () => {
      for (const bad of [null, undefined, 'two', NaN, -1]) {
        const { data } = repair({ entries: [entry({ servings: bad }), entry({ id: 'ok' })] })
        expect(data.entries.map((e) => e.id)).toEqual(['ok'])
      }
    })

    it('drops a weigh-in with no weight but keeps the rest of the scale', () => {
      const { data, dropped } = repair({
        weights: [
          { id: 'w1', date: '2026-08-01', weightKg: 62 },
          { id: 'w2', date: '2026-08-08', weightKg: null },
          { id: 'w3', date: '2026-08-15', weightKg: 61.4 },
        ],
      })
      expect(data.weights.map((w) => w.id)).toEqual(['w1', 'w3'])
      expect(dropped.weights).toBe(1)
      // Optional measurements are allowed to be missing; they are not the point.
      expect(data.weights[0].waistCm).toBeNull()
    })

    it('drops junk keys and junk values from the water map', () => {
      const { data, dropped } = repair({
        water: { '2026-08-30': 2000, notADate: 500, '2026-08-31': 'lots' },
      })
      expect(data.water).toEqual({ '2026-08-30': 2000 })
      expect(dropped.water).toBe(2)
    })

    it('does not treat a collection of the wrong type as rows to count', () => {
      // `entries: {}` has no rows, so there is nothing to report dropping.
      const { data, dropped, repaired } = repair({ entries: {}, weights: 'gone' })
      expect(data.entries).toEqual([])
      expect(dropped.entries).toBe(0)
      expect(repaired).toBe(false)
    })
  })

  describe('scalars fall back one at a time', () => {
    it('keeps a valid target and replaces only the broken one', () => {
      const { data } = repair({ targets: { ...DEFAULT_TARGETS, kcal: 1650, protein: NaN } })
      expect(data.targets.kcal).toBe(1650)
      expect(data.targets.protein).toBe(DEFAULT_TARGETS.protein)
    })

    it('refuses an impossible height rather than carrying it into the BMR', () => {
      const { data } = repair({ profile: { heightCm: 16500, age: 28 } })
      expect(data.profile.heightCm).toBeNull()
      expect(data.profile.age).toBe(28)
    })

    it('falls back on an unknown preset and an unknown activity level', () => {
      const { data } = repair({ targetPreset: 'keto', profile: { activityLevel: 'olympian' } })
      expect(data.targetPreset).toBe('balanced')
      expect(data.profile.activityLevel).toBe('sedentary')
    })

    it('keeps only real locks, so a stray value cannot pin a target', () => {
      const { data } = repair({ targetLocks: { protein: true, carbs: 'yes', nonsense: true } })
      expect(data.targetLocks).toEqual({ protein: true })
    })
  })

  describe('the cat', () => {
    it('backfills a pet object written before the wardrobe existed', () => {
      const { data } = repair({ pet: { name: 'Comel', out: true, seenStage: 3 } })
      expect(data.pet.name).toBe('Comel')
      expect(data.pet.seenStage).toBe(3)
      expect(data.pet.worn).toEqual({})
      expect(data.pet.seenUnlocks).toEqual([])
      expect(data.pet.costume).toBeNull()
    })

    it('drops a garment in a slot the cat does not have', () => {
      const { data } = repair({
        pet: { worn: { head: 'beanie', tail: 'ribbon', face: null } },
      })
      expect(data.pet.worn).toEqual({ head: 'beanie', face: null })
    })
  })

  describe('the under-eating dismissal', () => {
    it('keeps a complete one', () => {
      const d = { at: '2026-08-30T10:00:00Z', targetKcal: 1500, throughDate: '2026-09-06' }
      expect(repair({ dismissals: { underEating: d } }).data.dismissals.underEating).toEqual(d)
    })

    /*
     * Deliberately asymmetric: a half-written dismissal shows the warning
     * again. Erring towards showing a warning about eating too little is the
     * safe direction; erring towards hiding it is not.
     */
    it('treats a half-written one as never dismissed', () => {
      const { data } = repair({
        dismissals: { underEating: { at: '2026-08-30T10:00:00Z', targetKcal: 1500 } },
      })
      expect(data.dismissals.underEating).toBeNull()
    })
  })

  describe('the shopping list', () => {
    it('keeps a list the user cleared on purpose empty', () => {
      // An absent key means a new account and should seed; [] is a decision.
      expect(repair({ shopping: [] }).data.shopping).toEqual([])
      expect(repair({}).data.shopping.length).toBeGreaterThan(0)
    })
  })

  it('marks a custom food as custom even if the stored row forgot', () => {
    // Without an owner it would read as a catalogue row and become undeletable.
    const { data } = repair({
      customFoods: [{ id: 'x', name: 'Mak punya rendang', kcal: 300, ownerId: null }],
    })
    expect(data.customFoods[0].ownerId).toBe('local')
    expect(data.customFoods[0].source).toBe('custom')
  })

  it('survives a document truncated mid-write', () => {
    // What a localStorage quota failure actually leaves behind: valid JSON,
    // arbitrary depth, half the diary missing.
    const full = defaultData()
    full.entries = [entry({ id: 'a' }), entry({ id: 'b' })]
    const text = JSON.stringify(full)
    const truncated = text.slice(0, Math.floor(text.length * 0.6))
    let parsed: unknown = null
    try {
      parsed = JSON.parse(truncated)
    } catch {
      parsed = null // which is exactly what local.ts does, then defaults
    }
    const { data } = repair(parsed)
    expect(data.targets).toEqual(DEFAULT_TARGETS)
    expect(Array.isArray(data.entries)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  ACCESSORIES,
  ALL_PIECES,
  COSTUMES,
  NEVER_UNLOCKS,
  SLOTS,
  looseAccessories,
  pieceById,
  requirementFor,
  unlockedIds,
  wornPieces,
  freshUnlocks,
  type UnlockSource,
} from '../petWardrobe'
import { DRAWN_PIECES } from '@/components/PetAccessory'
import { PET_STAGES } from '../pet'
import { badges } from '../nutrition'
import {
  markUnlocksSeen,
  removeItem,
  takeOffCostume,
  wearCostume,
  wearItem,
} from '../logEdits'
import { defaultData, defaultPet } from '../store/defaults'
import type { PetState } from '../types'

/** Every badge, all unlocked, so the catalogue can be exercised against real ids. */
const allBadges = badges({
  days: Array.from({ length: 40 }, () => ({
    date: '2026-01-01',
    kcal: 1500,
    protein: 999,
    carbs: 100,
    fat: 50,
    fibre: 999,
    salmonMeals: 3,
  })),
  targets: { kcal: 1500, protein: 100, carbs: 150, fat: 50, fibre: 25, waterMl: 2000 },
  startWeightKg: 62,
  goalWeightKg: 55,
  latestWeightKg: 54,
  bestStreak: 60,
  foodsTried: 40,
  categoriesTried: 12,
  recipesCooked: 9,
  hydratedDays: 9,
  returned: true,
})

const noBadges = allBadges.map((b) => ({ ...b, unlocked: false, progress: 0 }))
const sources: UnlockSource[] = [
  ...ACCESSORIES.map((a) => a.from),
  ...COSTUMES.map((c) => c.from),
]

const pet = (over: Partial<PetState> = {}): PetState => ({ ...defaultPet(), ...over })

describe('nothing in here is unlocked by losing weight', () => {
  /*
   * This is the values decision made mechanical rather than merely intended.
   * `badges()` promises that a badge may reward logging, consistency, variety,
   * adequacy or coming back, and never eating less. Hanging desirable cosmetics
   * off the scale would break that quietly, on the same screen that carries the
   * under-eating warning — so the four weight badges are swept out by id.
   */
  it('names the four weight badges', () => {
    expect([...NEVER_UNLOCKS].sort()).toEqual(
      ['down_1kg', 'down_3kg', 'down_5kg', 'goal_reached'].sort()
    )
  })

  it('has those four in the badge case, so the sweep is against real ids', () => {
    for (const id of NEVER_UNLOCKS) {
      expect(allBadges.some((b) => b.id === id)).toBe(true)
    }
  })

  it('never lists one as an unlock source', () => {
    for (const from of sources) {
      const ids =
        from.kind === 'badge' ? [from.badgeId] : from.kind === 'badges' ? from.badgeIds : []
      for (const id of ids) expect(NEVER_UNLOCKS).not.toContain(id)
    }
  })

  it('unlocks nothing extra when only the weight badges are earned', () => {
    const onlyWeight = allBadges.map((b) => ({
      ...b,
      unlocked: NEVER_UNLOCKS.includes(b.id),
    }))
    expect(unlockedIds(onlyWeight, 0).size).toBe(0)
  })
})

describe('the catalogue holds together', () => {
  it('gives every piece a unique id', () => {
    const ids = ALL_PIECES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    const costumeIds = COSTUMES.map((c) => c.id)
    expect(new Set(costumeIds).size).toBe(costumeIds.length)
    // A costume id must not collide with a piece id: `unlockedIds` puts both in
    // one set, and the UI asks the same question of both.
    for (const id of costumeIds) expect(ids).not.toContain(id)
  })

  it('puts every piece in a real slot', () => {
    for (const a of ALL_PIECES) expect(SLOTS).toContain(a.slot)
  })

  it('resolves every badge id against the real badge case', () => {
    for (const from of sources) {
      const ids =
        from.kind === 'badge' ? [from.badgeId] : from.kind === 'badges' ? from.badgeIds : []
      for (const id of ids) {
        expect(allBadges.some((b) => b.id === id)).toBe(true)
      }
    }
  })

  it('keeps every stage index in range', () => {
    const max = PET_STAGES.length - 1
    for (const from of sources) {
      const index = from.kind === 'stage' ? from.index : from.stageIndex
      if (index === undefined) continue
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThanOrEqual(max)
    }
  })

  it('can actually draw every piece it lists', () => {
    // A catalogue entry with no art would render an invisible item that still
    // takes a slot, which looks like the app losing the hat you just put on.
    for (const a of ALL_PIECES) expect(DRAWN_PIECES).toContain(a.id)
  })

  it('spreads across every slot rather than being all hats', () => {
    for (const slot of SLOTS) {
      expect(ALL_PIECES.filter((a) => a.slot === slot).length).toBeGreaterThan(0)
    }
    // The badges skew head-heavy on their own; the stage rewards exist to fix that.
    expect(looseAccessories('neck').length).toBeGreaterThanOrEqual(3)
    expect(looseAccessories('back').length).toBeGreaterThanOrEqual(3)
  })
})

describe('a costume is a look, not a preset', () => {
  it('resolves every piece to a real accessory', () => {
    for (const c of COSTUMES) {
      for (const id of c.pieces) expect(pieceById(id)).toBeDefined()
    }
  })

  it('fills more than one slot', () => {
    for (const c of COSTUMES) {
      const slots = new Set(c.pieces.map((id) => pieceById(id)!.slot))
      expect(slots.size).toBeGreaterThan(1)
      // One item per slot — two hats in one costume would silently drop one.
      expect(slots.size).toBe(c.pieces.length)
    }
  })

  it('carries at least one piece you cannot get loose', () => {
    const loose = new Set(ACCESSORIES.map((a) => a.id))
    for (const c of COSTUMES) {
      expect(c.pieces.some((id) => !loose.has(id))).toBe(true)
    }
  })
})

describe('the locked hint comes from the badge, so the two cannot drift', () => {
  it('reuses the badge’s own requirement string verbatim', () => {
    for (const a of ACCESSORIES) {
      if (a.from.kind !== 'badge') continue
      const source = allBadges.find(
        (x) => a.from.kind === 'badge' && x.id === a.from.badgeId
      )!
      expect(requirementFor(a.id, allBadges)).toBe(source.requirement)
    }
  })

  it('says something for every single item, locked or not', () => {
    for (const a of ACCESSORIES) expect(requirementFor(a.id, allBadges).length).toBeGreaterThan(0)
    for (const c of COSTUMES) expect(requirementFor(c.id, allBadges).length).toBeGreaterThan(0)
  })

  it('names the streak for a stage unlock rather than inventing a rule', () => {
    const scarf = requirementFor('scarf', allBadges)
    expect(scarf).toContain('Kitten')
    expect(scarf).toContain('1-day')
  })

  it('summarises rather than listing fourteen badge names', () => {
    const royal = requirementFor('royal', allBadges)
    expect(royal.length).toBeLessThan(60)
    expect(royal).toContain('14')
  })
})

describe('unlocking', () => {
  it('gives nothing away at the start', () => {
    expect(unlockedIds(noBadges, 0).size).toBe(0)
  })

  it('unlocks exactly the item for the badge just earned', () => {
    const one = noBadges.map((b) => ({ ...b, unlocked: b.id === 'first_step' }))
    expect([...unlockedIds(one, 0)]).toEqual(['bell_collar'])
  })

  it('unlocks a stage item as the streak passes it, and never takes it back', () => {
    expect(unlockedIds(noBadges, 0).has('scarf')).toBe(false)
    expect(unlockedIds(noBadges, 1).has('scarf')).toBe(true)
    expect(unlockedIds(noBadges, 6).has('scarf')).toBe(true)
  })

  it('brings a costume’s own pieces with it', () => {
    const all = unlockedIds(allBadges, 6)
    for (const c of COSTUMES) {
      expect(all.has(c.id)).toBe(true)
      for (const p of c.pieces) expect(all.has(p)).toBe(true)
    }
  })

  it('withholds a costume until every one of its badges is in', () => {
    const chef = COSTUMES.find((c) => c.id === 'chef')!
    const partial = noBadges.map((b) => ({ ...b, unlocked: b.id === 'home_cook' }))
    expect(unlockedIds(partial, 6).has(chef.id)).toBe(false)
    const both = noBadges.map((b) => ({
      ...b,
      unlocked: b.id === 'home_cook' || b.id === 'well_rounded',
    }))
    expect(unlockedIds(both, 6).has(chef.id)).toBe(true)
  })

  it('holds the Explorer costume back on the stage as well as the badge', () => {
    const earned = noBadges.map((b) => ({ ...b, unlocked: b.id === 'explorer' }))
    expect(unlockedIds(earned, 3).has('explorer_kit')).toBe(false)
    expect(unlockedIds(earned, 4).has('explorer_kit')).toBe(true)
  })

  it('opens everything at a full badge case and a full-grown cat', () => {
    const all = unlockedIds(allBadges, 6)
    for (const a of ACCESSORIES) expect(all.has(a.id)).toBe(true)
    for (const c of COSTUMES) expect(all.has(c.id)).toBe(true)
  })
})

describe('what is actually drawn', () => {
  const all = unlockedIds(allBadges, 6)

  it('draws one item per slot', () => {
    const worn = wornPieces(pet({ worn: { head: 'crown', neck: 'bow_tie' } }), all)
    expect(worn.head).toBe('crown')
    expect(worn.neck).toBe('bow_tie')
    expect(worn.face).toBeNull()
  })

  it('lets a costume override the per-slot choices while it is on', () => {
    const p = pet({ worn: { head: 'crown', neck: 'bow_tie' }, costume: 'chef' })
    const worn = wornPieces(p, all)
    expect(worn.head).toBe('chef_hat')
    expect(worn.body).toBe('apron')
    // The bow tie is not drawn — but it is still in the store, untouched.
    expect(worn.neck).toBeNull()
    expect(p.worn.neck).toBe('bow_tie')
  })

  it('restores what was underneath when the costume comes off', () => {
    const p = pet({ worn: { head: 'crown', neck: 'bow_tie' }, costume: 'chef' })
    expect(wornPieces({ ...p, costume: null }, all).neck).toBe('bow_tie')
  })

  it('does not draw something no longer earned, but does not forget it either', () => {
    /*
     * A diary edit can un-earn a badge. Confiscating the hat would be punishing
     * someone for correcting their own record, so the choice survives and comes
     * back the moment the badge does.
     */
    const p = pet({ worn: { head: 'crown' } })
    const lost = unlockedIds(
      allBadges.map((b) => ({ ...b, unlocked: b.id !== 'thirty_days' && b.unlocked })),
      6
    )
    expect(wornPieces(p, lost).head).toBeNull()
    expect(p.worn.head).toBe('crown')
    expect(wornPieces(p, all).head).toBe('crown')
  })

  it('survives a pet saved before the wardrobe existed', () => {
    // Old diaries merge one level deep, so these three fields can be missing.
    const old = { name: 'Comel', out: true, seenStage: 3 } as unknown as PetState
    expect(() => wornPieces(old, all)).not.toThrow()
    expect(wornPieces(old, all).head).toBeNull()
    expect(freshUnlocks(old, all).length).toBe(all.size)
  })
})

describe('the reducers', () => {
  const base = { ...defaultData(), pet: pet({ worn: { head: 'crown' }, costume: 'chef' }) }

  it('takes the costume off when you wear a single item', () => {
    const next = wearItem(base, 'neck', 'bow_tie')
    expect(next.pet.costume).toBeNull()
    expect(next.pet.worn.neck).toBe('bow_tie')
    // What the costume was covering is still there.
    expect(next.pet.worn.head).toBe('crown')
  })

  it('empties one slot without touching the others', () => {
    const next = removeItem(wearItem(base, 'neck', 'bow_tie'), 'neck')
    expect(next.pet.worn.neck).toBeNull()
    expect(next.pet.worn.head).toBe('crown')
  })

  it('leaves the per-slot choices alone when a costume goes on', () => {
    const next = wearCostume({ ...base, pet: pet({ worn: { head: 'crown' } }) }, 'royal')
    expect(next.pet.costume).toBe('royal')
    expect(next.pet.worn.head).toBe('crown')
    expect(takeOffCostume(next).pet.worn.head).toBe('crown')
  })

  it('marks unlocks seen idempotently, and only ever adds', () => {
    const once = markUnlocksSeen(base, ['crown', 'scarf'])
    expect([...once.pet.seenUnlocks].sort()).toEqual(['crown', 'scarf'])
    // Same ids again: no new object, so nothing re-renders and nothing re-saves.
    expect(markUnlocksSeen(once, ['crown', 'scarf'])).toBe(once)
    // A second screen must not be able to un-see something.
    const twice = markUnlocksSeen(once, ['cape'])
    expect([...twice.pet.seenUnlocks].sort()).toEqual(['cape', 'crown', 'scarf'])
  })

  it('reports only the unlocks not yet looked at', () => {
    const all = unlockedIds(allBadges, 6)
    const seen = pet({ seenUnlocks: [...all] })
    expect(freshUnlocks(seen, all)).toEqual([])
    expect(freshUnlocks(pet({ seenUnlocks: ['crown'] }), all)).not.toContain('crown')
  })
})

describe('the copy stays kind', () => {
  it('never scolds, and never mentions weight', () => {
    /*
     * The same forbidden list the pet's own copy is held to. A wardrobe is
     * exactly where "you have not earned this yet" turns into a reprimand.
     */
    const banned = /\b(fat|skinny|slim|lose weight|guilt|lazy|failed|shame|cheat)\b/i
    const copy = [
      ...ALL_PIECES.map((a) => a.name),
      ...COSTUMES.map((c) => c.name),
      ...ACCESSORIES.map((a) => requirementFor(a.id, allBadges)),
      ...COSTUMES.map((c) => requirementFor(c.id, allBadges)),
    ]
    for (const line of copy) expect(line).not.toMatch(banned)
  })
})

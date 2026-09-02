/**
 * The cat's wardrobe.
 *
 * Eighteen badges existed and did nothing except sit in a case, looked at once.
 * This gives them a job: fourteen of them, plus the six streak stages, unlock
 * something the cat can wear.
 *
 * Three decisions shape the whole file.
 *
 * 1. **Nothing here unlocks from losing weight.** Four badges are scale badges
 *    — Down 1 kg, Down 3 kg, Down 5 kg, Goal Reached. `badges()` in
 *    nutrition.ts already states the rule this app is built on: a badge may
 *    reward logging, consistency, variety, adequacy or coming back, and *never
 *    eating less*. Hanging desirable cosmetics off the scale would break that
 *    quietly, on the same screen that carries the under-eating warning. They
 *    keep their medals. They unlock nothing, and `NEVER_UNLOCKS` plus a test
 *    sweep make that mechanical rather than merely intended.
 * 2. **Unlocks are derived, never stored.** They come out of `badgesFor()` and
 *    `stageFor()`, both of which already exist and are already tested, so
 *    there is no second achievement engine to keep in sync with the diary.
 * 3. **Nothing is ever confiscated.** A diary edit can un-earn a badge — delete
 *    a week and Full Week goes away. An item worn at that moment stops being
 *    *drawn*, but the choice stays in the store, so it comes back when the
 *    badge does. Taking a hat off someone as a punishment for editing their
 *    own diary would be the pettiest thing in the app.
 *
 * There is no shop, no currency, no drops and nothing time-limited. Every item
 * has one stated requirement and is earned by doing the thing.
 */

import type { Badge } from './nutrition'
import { PET_STAGES } from './pet'
import type { AccessorySlot, PetState } from './types'

export type { AccessorySlot }

export const SLOTS: readonly AccessorySlot[] = ['head', 'face', 'neck', 'body', 'back']

/** Human labels for the slot picker. */
export const SLOT_NAMES: Record<AccessorySlot, string> = {
  head: 'Head',
  face: 'Face',
  neck: 'Neck',
  body: 'Body',
  back: 'Back',
}

export type UnlockSource =
  | { kind: 'badge'; badgeId: string }
  | { kind: 'stage'; index: number }
  /** Costumes: several badges at once, and optionally a stage as well. */
  | { kind: 'badges'; badgeIds: readonly string[]; stageIndex?: number }

export interface Accessory {
  id: string
  name: string
  slot: AccessorySlot
  from: UnlockSource
}

export interface Costume {
  id: string
  name: string
  /** Accessory ids, each filling its own slot. */
  pieces: readonly string[]
  from: UnlockSource
}

/**
 * The four badge ids that may never appear in an unlock source.
 *
 * Exported so the test can sweep every `from` against it. This constant is the
 * values decision made checkable — if someone later adds "Down 5 kg unlocks the
 * crown" because it seems like a nice reward, the suite fails.
 */
export const NEVER_UNLOCKS: readonly string[] = [
  'down_1kg',
  'down_3kg',
  'down_5kg',
  'goal_reached',
]

const badge = (badgeId: string): UnlockSource => ({ kind: 'badge', badgeId })
const stage = (index: number): UnlockSource => ({ kind: 'stage', index })

/*
 * Fourteen from the behaviour badges and six from the streak stages. The badges
 * skew towards hats on their own — party hat, beanie, crown, chef hat — so the
 * stage rewards deliberately spread across neck, face and back to make mixing
 * worthwhile.
 *
 * The costume-only pieces (apron, spoon, satchel, helmet, jetpack, and the
 * golden pair) sit in this list too, so every drawn piece has exactly one
 * definition; they carry the costume's own unlock source and are filtered out
 * of the loose grid by `looseAccessories()`.
 */
export const ACCESSORIES: readonly Accessory[] = [
  // --- from behaviour badges ---
  { id: 'bell_collar', name: 'Bell collar', slot: 'neck', from: badge('first_step') },
  { id: 'bow_tie', name: 'Bow tie', slot: 'neck', from: badge('three_in_a_row') },
  { id: 'party_hat', name: 'Party hat', slot: 'head', from: badge('full_week') },
  { id: 'beanie', name: 'Beanie', slot: 'head', from: badge('two_weeks') },
  { id: 'crown', name: 'Crown', slot: 'head', from: badge('thirty_days') },
  { id: 'bandana', name: 'Bandana', slot: 'neck', from: badge('comeback') },
  { id: 'fish_charm', name: 'Fish charm', slot: 'neck', from: badge('omega_squad') },
  { id: 'sweatband', name: 'Sweatband', slot: 'head', from: badge('protein_power') },
  { id: 'sprout', name: 'Sprout', slot: 'head', from: badge('fibre_friend') },
  { id: 'snorkel', name: 'Snorkel', slot: 'face', from: badge('hydrated') },
  { id: 'glasses', name: 'Round glasses', slot: 'face', from: badge('disiplin') },
  { id: 'explorer_cap', name: 'Explorer cap', slot: 'head', from: badge('explorer') },
  { id: 'flower_crown', name: 'Flower crown', slot: 'head', from: badge('well_rounded') },
  { id: 'chef_hat', name: 'Chef hat', slot: 'head', from: badge('home_cook') },

  // --- from streak stages ---
  { id: 'scarf', name: 'Scarf', slot: 'neck', from: stage(1) },
  { id: 'cape', name: 'Cape', slot: 'back', from: stage(2) },
  { id: 'wings', name: 'Butterfly wings', slot: 'back', from: stage(3) },
  { id: 'sunglasses', name: 'Sunglasses', slot: 'face', from: stage(4) },
  { id: 'star_clip', name: 'Star clip', slot: 'head', from: stage(5) },
  { id: 'angel_wings', name: 'Angel wings', slot: 'back', from: stage(6) },

  /*
   * --- from pairs of badges ---
   *
   * The Body slot had nothing wearable in it: all twenty items above are head,
   * face, neck or back, and the only two body pieces are locked inside
   * costumes. Every one of the fourteen everyday badges was already spoken for
   * by a single item, so there was no unused source left — these hang off
   * *pairs* instead, using the same `badges` source the costumes use. No new
   * badge, no new stage, and a pair is a slightly longer road than a single
   * one, which suits a whole garment.
   */
  {
    id: 'knitted_vest',
    name: 'Knitted vest',
    slot: 'body',
    from: { kind: 'badges', badgeIds: ['comeback', 'two_weeks'] },
  },
  {
    id: 'stripy_jumper',
    name: 'Stripy jumper',
    slot: 'body',
    from: { kind: 'badges', badgeIds: ['full_week', 'protein_power'] },
  },
  {
    id: 'dungarees',
    name: 'Dungarees',
    slot: 'body',
    from: { kind: 'badges', badgeIds: ['home_cook', 'fibre_friend'] },
  },
]

/*
 * Each costume fills several slots and each carries at least one piece that
 * exists nowhere else, so putting one on is a look rather than a preset you
 * could have assembled yourself. A test pins both properties.
 */
export const COSTUMES: readonly Costume[] = [
  {
    id: 'chef',
    name: 'Chef',
    pieces: ['chef_hat', 'apron', 'spoon'],
    from: { kind: 'badges', badgeIds: ['home_cook', 'well_rounded'] },
  },
  {
    id: 'explorer_kit',
    name: 'Explorer',
    pieces: ['explorer_cap', 'scarf', 'satchel'],
    from: { kind: 'badges', badgeIds: ['explorer'], stageIndex: 4 },
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    pieces: ['space_helmet', 'jetpack'],
    from: {
      kind: 'badges',
      badgeIds: ['first_step', 'three_in_a_row', 'full_week', 'two_weeks', 'thirty_days'],
    },
  },
  {
    id: 'royal',
    name: 'Royal',
    pieces: ['golden_crown', 'royal_cape'],
    from: {
      kind: 'badges',
      badgeIds: ACCESSORIES.filter((a) => a.from.kind === 'badge').map((a) =>
        a.from.kind === 'badge' ? a.from.badgeId : ''
      ),
    },
  },
]

/** The costume-only pieces, defined here so every drawn piece has a slot. */
const COSTUME_PIECES: readonly Accessory[] = [
  { id: 'apron', name: 'Apron', slot: 'body', from: COSTUMES[0].from },
  { id: 'spoon', name: 'Wooden spoon', slot: 'back', from: COSTUMES[0].from },
  { id: 'satchel', name: 'Satchel', slot: 'body', from: COSTUMES[1].from },
  { id: 'space_helmet', name: 'Space helmet', slot: 'face', from: COSTUMES[2].from },
  { id: 'jetpack', name: 'Jetpack', slot: 'back', from: COSTUMES[2].from },
  { id: 'golden_crown', name: 'Golden crown', slot: 'head', from: COSTUMES[3].from },
  { id: 'royal_cape', name: 'Royal cape', slot: 'back', from: COSTUMES[3].from },
]

/** Every drawable piece, loose and costume-only alike. */
export const ALL_PIECES: readonly Accessory[] = [...ACCESSORIES, ...COSTUME_PIECES]

export function pieceById(id: string): Accessory | undefined {
  return ALL_PIECES.find((a) => a.id === id)
}

/** The items that appear in the slot grid — costume-only pieces are not worn alone. */
export function looseAccessories(slot: AccessorySlot): Accessory[] {
  return ACCESSORIES.filter((a) => a.slot === slot)
}

const earned = (badges: readonly Badge[], id: string): boolean =>
  badges.some((b) => b.id === id && b.unlocked)

function sourceMet(
  from: UnlockSource,
  badges: readonly Badge[],
  stageIndex: number
): boolean {
  if (from.kind === 'badge') return earned(badges, from.badgeId)
  if (from.kind === 'stage') return stageIndex >= from.index
  return (
    from.badgeIds.every((id) => earned(badges, id)) &&
    stageIndex >= (from.stageIndex ?? 0)
  )
}

/**
 * Everything currently earned — accessory ids and costume ids in one set,
 * because the UI asks the same question of both.
 */
export function unlockedIds(badges: readonly Badge[], stageIndex: number): Set<string> {
  const out = new Set<string>()
  for (const a of ACCESSORIES) {
    if (sourceMet(a.from, badges, stageIndex)) out.add(a.id)
  }
  for (const c of COSTUMES) {
    if (!sourceMet(c.from, badges, stageIndex)) continue
    out.add(c.id)
    // A costume's own pieces come with it — that is what wearing it means.
    for (const p of c.pieces) out.add(p)
  }
  return out
}

/**
 * What to show under a locked item.
 *
 * For a badge unlock this returns the badge's *own* `requirement` string rather
 * than a second copy of it written here, so the two cannot drift apart when a
 * threshold changes.
 */
export function requirementFor(id: string, badges: readonly Badge[]): string {
  const from = pieceById(id)?.from ?? COSTUMES.find((c) => c.id === id)?.from
  if (!from) return ''

  const nameOf = (badgeId: string) => badges.find((b) => b.id === badgeId)?.name ?? badgeId
  const stageName = (index: number) =>
    PET_STAGES.find((s) => s.index === index)?.name ?? `stage ${index}`

  if (from.kind === 'badge') {
    return badges.find((b) => b.id === from.badgeId)?.requirement ?? ''
  }
  if (from.kind === 'stage') {
    const s = PET_STAGES.find((x) => x.index === from.index)
    return s ? `Reach ${s.name} — a ${s.minStreak}-day streak` : ''
  }

  const names = from.badgeIds.map(nameOf)
  /*
   * "all N everyday badges" is only true when the list *is* every everyday
   * badge — which is Royal, and Royal alone. Astronaut wants five specific
   * streak badges, and read "Earn all 5 everyday badges", which is wrong twice
   * over: there are fourteen, and these five are not an arbitrary subset. A
   * locked item's one job is telling you what to go and do, so it has to name
   * them.
   */
  const everyday = badges.filter((b) => !NEVER_UNLOCKS.includes(b.id)).length
  const list =
    names.length >= everyday && everyday > 0
      ? `all ${names.length} everyday badges`
      : names.length > 3
        ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : names.join(', ')
  return from.stageIndex
    ? `Earn ${list}, and reach ${stageName(from.stageIndex)}`
    : `Earn ${list}`
}

/**
 * What the cat is actually wearing right now, per slot.
 *
 * A worn costume overrides the per-slot choices while it is on; the choices
 * stay in the store underneath, so taking the costume off restores them.
 * Anything no longer unlocked is dropped here rather than in the store — see
 * the third rule at the top of this file.
 */
export function wornPieces(
  pet: PetState,
  unlocked: ReadonlySet<string>
): Record<AccessorySlot, string | null> {
  const out: Record<AccessorySlot, string | null> = {
    head: null,
    face: null,
    neck: null,
    body: null,
    back: null,
  }

  const costume = pet.costume ? COSTUMES.find((c) => c.id === pet.costume) : undefined
  if (costume && unlocked.has(costume.id)) {
    for (const id of costume.pieces) {
      const piece = pieceById(id)
      if (piece) out[piece.slot] = id
    }
    return out
  }

  for (const slot of SLOTS) {
    const id = pet.worn?.[slot] ?? null
    if (id && unlocked.has(id)) out[slot] = id
  }
  return out
}

/** Unlocked but not yet looked at — the dot on the wardrobe row. */
export function freshUnlocks(pet: PetState, unlocked: ReadonlySet<string>): string[] {
  const seen = new Set(pet.seenUnlocks ?? [])
  return [...unlocked].filter((id) => !seen.has(id))
}

import { describe, expect, it } from 'vitest'
import { HALF_LIFE_DAYS, oftenLogged, usualFor, weightFor } from '../usual'
import { FOODS } from '../catalogue'
import { addDays } from '../dates'
import { defaultData } from '../store/defaults'
import type { AppData } from '../store/types'
import type { LogEntry, MealSlot } from '../types'

const TODAY = '2026-08-30'
const at = (i: number) => FOODS[i]

const log = (date: string, foodId: string, slot: MealSlot = 'breakfast'): LogEntry => {
  const f = FOODS.find((x) => x.id === foodId)!
  return {
    id: `${date}-${slot}-${foodId}`,
    date,
    slot,
    foodId,
    recipeId: null,
    customName: null,
    servings: 1,
    notes: null,
    macros: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fibre: f.fibre },
  }
}

const store = (entries: LogEntry[] = [], favourites: string[] = []): AppData => ({
  ...defaultData(),
  entries,
  favourites,
})

describe('weightFor', () => {
  it('counts today in full', () => {
    expect(weightFor(TODAY, TODAY)).toBe(1)
  })

  it('halves over the half-life', () => {
    expect(weightFor(addDays(TODAY, -HALF_LIFE_DAYS), TODAY)).toBeCloseTo(0.5, 5)
    expect(weightFor(addDays(TODAY, -HALF_LIFE_DAYS * 2), TODAY)).toBeCloseTo(0.25, 5)
  })

  it('drops anything older than the window, and anything in the future', () => {
    expect(weightFor(addDays(TODAY, -91), TODAY)).toBe(0)
    expect(weightFor(addDays(TODAY, 1), TODAY)).toBe(0)
  })
})

describe('usualFor', () => {
  it('offers nothing for a diary with no history', () => {
    expect(usualFor(store(), 'breakfast', { today: TODAY })).toEqual([])
  })

  it('ranks by how often you log it in that slot', () => {
    const a = at(0).id
    const b = at(1).id
    const entries = [
      ...[1, 2, 3, 4].map((d) => log(addDays(TODAY, -d), a)),
      ...[1, 2].map((d) => log(addDays(TODAY, -d), b)),
    ]
    const picks = usualFor(store(entries), 'breakfast', { today: TODAY })
    expect(picks.map((f) => f.id)).toEqual([a, b])
  })

  it('keeps each slot separate', () => {
    const morning = at(0).id
    const evening = at(1).id
    const entries = [
      ...[1, 2, 3].map((d) => log(addDays(TODAY, -d), morning, 'breakfast')),
      ...[1, 2, 3].map((d) => log(addDays(TODAY, -d), evening, 'dinner')),
    ]
    const data = store(entries)
    expect(usualFor(data, 'breakfast', { today: TODAY }).map((f) => f.id)).toEqual([morning])
    expect(usualFor(data, 'dinner', { today: TODAY }).map((f) => f.id)).toEqual([evening])
  })

  /*
   * The reason for weighting rather than counting: a food dropped a month ago
   * would otherwise outrank the one being eaten this week, permanently.
   */
  it('lets this week beat a bigger habit from two months ago', () => {
    const old = at(0).id
    const now = at(1).id
    const entries = [
      // Eight logs, but all around 60 days back.
      ...Array.from({ length: 8 }, (_, i) => log(addDays(TODAY, -(58 + i)), old)),
      // Three logs, all in the last few days.
      ...[1, 2, 3].map((d) => log(addDays(TODAY, -d), now)),
    ]
    const picks = usualFor(store(entries), 'breakfast', { today: TODAY })
    expect(picks[0].id).toBe(now)
  })

  it('never offers what is already logged today', () => {
    const a = at(0).id
    const entries = [
      ...[1, 2, 3, 4].map((d) => log(addDays(TODAY, -d), a)),
      log(TODAY, a),
    ]
    expect(usualFor(store(entries), 'breakfast', { today: TODAY }).map((f) => f.id)).not.toContain(a)
  })

  it('ignores history older than the window', () => {
    const a = at(0).id
    const entries = [1, 2, 3].map((d) => log(addDays(TODAY, -(120 + d)), a))
    expect(usualFor(store(entries), 'breakfast', { today: TODAY })).toEqual([])
  })

  it('falls back to favourites when a slot has no history of its own', () => {
    const fav = at(5).id
    const picks = usualFor(store([], [fav]), 'lunch', { today: TODAY })
    expect(picks.map((f) => f.id)).toEqual([fav])
  })

  it('tops a short history up with favourites, without repeating', () => {
    const a = at(0).id
    const fav = at(5).id
    const entries = [1, 2].map((d) => log(addDays(TODAY, -d), a))
    const picks = usualFor(store(entries, [a, fav]), 'breakfast', { today: TODAY })
    expect(picks.map((f) => f.id)).toEqual([a, fav])
  })

  it('respects the limit and is stable across calls', () => {
    const entries = [0, 1, 2, 3].flatMap((i) =>
      [1, 2, 3].map((d) => log(addDays(TODAY, -d - i), at(i).id))
    )
    const a = usualFor(store(entries), 'breakfast', { today: TODAY })
    const b = usualFor(store(entries), 'breakfast', { today: TODAY })
    expect(a).toHaveLength(3)
    expect(a.map((f) => f.id)).toEqual(b.map((f) => f.id))
  })

  it('ignores entries with no catalogue food behind them', () => {
    const freeText: LogEntry = {
      id: 'x', date: addDays(TODAY, -1), slot: 'breakfast', foodId: null, recipeId: null,
      customName: 'Something I typed', servings: 1, notes: null,
      macros: { kcal: 300, protein: 10, carbs: 40, fat: 8, fibre: 2 },
    }
    expect(usualFor(store([freeText]), 'breakfast', { today: TODAY })).toEqual([])
  })
})

describe('oftenLogged', () => {
  /*
   * The Foods list needs a different question from the one `usualFor` answers.
   * That one is scoped to a meal slot and hides whatever is already on today's
   * plate — both correct for Today, both wrong for a browsable catalogue.
   */
  it('counts every slot, not just one', () => {
    const d = store([
      log(TODAY, at(0).id, 'breakfast'),
      log(TODAY, at(1).id, 'dinner'),
      log(addDays(TODAY, -1), at(1).id, 'lunch'),
    ])
    const ids = oftenLogged(d, { today: TODAY }).map((f) => f.id)
    // The one eaten twice across two different slots ranks first.
    expect(ids[0]).toBe(at(1).id)
    expect(ids).toContain(at(0).id)
  })

  it('still lists something eaten today', () => {
    // usualFor deliberately hides these; a catalogue that made a food vanish
    // the moment you logged it would be broken.
    const d = store([log(TODAY, at(0).id)])
    expect(oftenLogged(d, { today: TODAY }).map((f) => f.id)).toEqual([at(0).id])
  })

  it('prefers what you eat now over what you ate months ago', () => {
    const d = store([
      log(addDays(TODAY, -1), at(0).id),
      log(addDays(TODAY, -60), at(1).id),
      log(addDays(TODAY, -61), at(1).id),
      log(addDays(TODAY, -62), at(1).id),
    ])
    expect(oftenLogged(d, { today: TODAY })[0].id).toBe(at(0).id)
  })

  it('ignores the future and returns nothing for an empty diary', () => {
    expect(oftenLogged(store([log(addDays(TODAY, 1), at(0).id)]), { today: TODAY })).toEqual([])
    expect(oftenLogged(store(), { today: TODAY })).toEqual([])
  })

  it('honours the limit', () => {
    const d = store([0, 1, 2, 3, 4].map((i) => log(addDays(TODAY, -i), at(i).id)))
    expect(oftenLogged(d, { today: TODAY, limit: 3 })).toHaveLength(3)
  })
})

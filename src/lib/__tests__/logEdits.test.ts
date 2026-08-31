import { describe, expect, it } from 'vitest'
import {
  MIN_SERVINGS,
  addCustomFood,
  addFood,
  addRecipe,
  copyDay,
  deleteCustomFood,
  newId,
  removeEntry,
  setServings,
  toggleFavourite,
} from '../logEdits'
import { FOODS, RECIPES } from '../catalogue'
import { defaultData } from '../store/defaults'
import type { AppData } from '../store/types'
import type { Food } from '../types'

const DAY = '2026-08-30'
const OTHER = '2026-08-31'
const food = FOODS[0]
const second = FOODS[1]

/** Deterministic ids, so assertions can name them. */
const ids = () => {
  let n = 0
  return () => `id-${++n}`
}

const base = (): AppData => defaultData()

describe('addFood', () => {
  it('appends without touching what is already there', () => {
    const one = addFood(base(), DAY, 'lunch', food, 1, ids())
    const two = addFood(one, DAY, 'dinner', second, 1, ids())
    expect(two.entries).toHaveLength(2)
    expect(two.entries[0]).toBe(one.entries[0])
  })

  it('snapshots the macros, so editing the food later cannot rewrite history', () => {
    const d = addFood(base(), DAY, 'lunch', food, 1, ids())
    expect(d.entries[0].macros).toEqual({
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fibre: food.fibre,
    })
    expect(d.entries[0].macros).not.toBe(food)
  })

  it('snapshots the name only for a custom food, which can be deleted', () => {
    expect(addFood(base(), DAY, 'lunch', food, 1, ids()).entries[0].customName).toBeNull()
    const mine: Food = { ...food, id: 'custom-1', ownerId: 'local', name: 'My thing' }
    expect(addFood(base(), DAY, 'lunch', mine, 1, ids()).entries[0].customName).toBe('My thing')
  })

  it('never mutates the input', () => {
    const before = base()
    const snapshot = before.entries
    addFood(before, DAY, 'lunch', food, 1, ids())
    expect(before.entries).toBe(snapshot)
    expect(before.entries).toHaveLength(0)
  })
})

describe('addRecipe', () => {
  it('records the recipe rather than a food', () => {
    const d = addRecipe(base(), DAY, 'dinner', RECIPES[0], 1, ids())
    expect(d.entries[0].recipeId).toBe(RECIPES[0].id)
    expect(d.entries[0].foodId).toBeNull()
    expect(d.entries[0].macros.kcal).toBe(RECIPES[0].kcal)
  })
})

describe('removeEntry', () => {
  it('removes only the one named', () => {
    let d = addFood(base(), DAY, 'lunch', food, 1, () => 'a')
    d = addFood(d, DAY, 'dinner', second, 1, () => 'b')
    const after = removeEntry(d, 'a')
    expect(after.entries.map((e) => e.id)).toEqual(['b'])
  })

  it('is a no-op for an id that is not there', () => {
    const d = addFood(base(), DAY, 'lunch', food, 1, () => 'a')
    expect(removeEntry(d, 'nope').entries).toHaveLength(1)
  })
})

describe('setServings', () => {
  it('rounds to a quarter step', () => {
    const d = addFood(base(), DAY, 'lunch', food, 1, () => 'a')
    expect(setServings(d, 'a', 1.3).entries[0].servings).toBe(1.25)
    expect(setServings(d, 'a', 1.4).entries[0].servings).toBe(1.5)
    expect(setServings(d, 'a', 2).entries[0].servings).toBe(2)
  })

  /*
   * Holding "−" must never delete the meal by stealth. There is an X for that,
   * and it is deliberate rather than the end of a long press.
   */
  it('floors at a quarter portion, so stepping down cannot erase the entry', () => {
    const d = addFood(base(), DAY, 'lunch', food, 1, () => 'a')
    for (const v of [0.25, 0, -1, -99]) {
      expect(setServings(d, 'a', v).entries[0].servings).toBe(MIN_SERVINGS)
    }
  })

  it('leaves other entries alone', () => {
    let d = addFood(base(), DAY, 'lunch', food, 1, () => 'a')
    d = addFood(d, DAY, 'dinner', second, 2, () => 'b')
    const after = setServings(d, 'a', 3)
    expect(after.entries[1].servings).toBe(2)
  })
})

describe('copyDay', () => {
  /*
   * It replaces rather than merges — "make Tuesday look like Monday". Appending
   * would silently double a day that was copied onto twice.
   */
  it('replaces the destination day instead of adding to it', () => {
    let d = addFood(base(), DAY, 'lunch', food, 1, () => 'src')
    d = addFood(d, OTHER, 'lunch', second, 1, () => 'old')
    const after = copyDay(d, DAY, OTHER, ids())
    const dest = after.entries.filter((e) => e.date === OTHER)
    expect(dest).toHaveLength(1)
    expect(dest[0].foodId).toBe(food.id)
    expect(after.entries.some((e) => e.id === 'old')).toBe(false)
  })

  it('leaves the source day untouched and gives the copies new ids', () => {
    const d = addFood(base(), DAY, 'lunch', food, 1, () => 'src')
    const after = copyDay(d, DAY, OTHER, ids())
    expect(after.entries.filter((e) => e.date === DAY)).toHaveLength(1)
    expect(after.entries.find((e) => e.date === OTHER)!.id).not.toBe('src')
  })

  it('copying an empty day clears the destination', () => {
    const d = addFood(base(), OTHER, 'lunch', food, 1, () => 'old')
    expect(copyDay(d, DAY, OTHER, ids()).entries).toHaveLength(0)
  })

  it('keeps servings and slot', () => {
    const d = addFood(base(), DAY, 'evening', food, 2.5, () => 'src')
    const copy = copyDay(d, DAY, OTHER, ids()).entries.find((e) => e.date === OTHER)!
    expect(copy.slot).toBe('evening')
    expect(copy.servings).toBe(2.5)
  })
})

describe('favourites and custom foods', () => {
  it('toggles a favourite on and off', () => {
    const on = toggleFavourite(base(), food.id)
    expect(on.favourites).toEqual([food.id])
    expect(toggleFavourite(on, food.id).favourites).toEqual([])
  })

  it('creates a custom food with a stable, prefixed id', () => {
    const { data, id } = addCustomFood(
      base(),
      { ...food, name: 'Mak punya rendang', source: 'custom' },
      () => 'x'
    )
    expect(id).toBe('custom-x')
    expect(data.customFoods[0].id).toBe('custom-x')
    expect(data.customFoods[0].slug).toBe('custom-x')
    expect(data.customFoods[0].ownerId).toBe('local')
  })

  it('deleting a custom food leaves past entries readable', () => {
    const mine: Food = { ...food, id: 'custom-x', ownerId: 'local', name: 'Mine' }
    let d: AppData = { ...base(), customFoods: [mine], favourites: ['custom-x'] }
    d = addFood(d, DAY, 'lunch', mine, 1, () => 'a')
    const after = deleteCustomFood(d, 'custom-x')

    expect(after.customFoods).toHaveLength(0)
    expect(after.favourites).toEqual([])
    // The entry survives, and still knows what it was and what it cost.
    expect(after.entries).toHaveLength(1)
    expect(after.entries[0].customName).toBe('Mine')
    expect(after.entries[0].macros.kcal).toBe(mine.kcal)
  })
})

describe('newId', () => {
  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newId()))
    expect(seen.size).toBe(200)
  })
})

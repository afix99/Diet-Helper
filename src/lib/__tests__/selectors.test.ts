import { describe, expect, it } from 'vitest'
import { badgesFor, dayRecords, entryName, streakFor } from '../selectors'
import { addDays, todayIso, weekOf } from '../dates'
import { defaultData } from '../store/defaults'
import type { AppData } from '../store/types'
import type { LogEntry } from '../types'

const entry = (date: string, kcal: number, name = 'Chicken Breast, grilled'): LogEntry => ({
  id: `${date}-${name}-${kcal}`,
  date,
  slot: 'lunch',
  foodId: name === 'Atlantic Salmon, raw' ? 'atlantic-salmon-raw' : 'chicken-breast-grilled',
  recipeId: null,
  customName: null,
  servings: 1,
  macros: { kcal, protein: 40, carbs: 0, fat: 5, fibre: 0 },
  notes: null,
})

const withEntries = (entries: LogEntry[]): AppData => ({ ...defaultData(), entries })

describe('streaks count today', () => {
  it('counts a meal logged today, in the user’s own timezone', () => {
    // The timezone bug dropped today out of the streak window entirely.
    const today = todayIso()
    expect(streakFor(withEntries([entry(today, 1400)])).current).toBe(1)
  })

  it('counts consecutive days ending today', () => {
    const today = todayIso()
    const data = withEntries([
      entry(addDays(today, -2), 1400),
      entry(addDays(today, -1), 1400),
      entry(today, 1400),
    ])
    expect(streakFor(data, today).current).toBe(3)
  })
})

describe('planned meals are not logged meals', () => {
  it('ignores future days when counting a streak', () => {
    const today = todayIso()
    const data = withEntries([entry(addDays(today, 1), 1400), entry(addDays(today, 2), 1400)])
    expect(streakFor(data, today).current).toBe(0)
  })

  it('does not unlock Full Week from a week planned ahead', () => {
    // Planning all seven days on Monday must not award a badge for adherence.
    const today = weekOf(todayIso())[0] // Monday
    const data = withEntries(weekOf(today).map((d) => entry(d, 1400)))
    const fullWeek = badgesFor(data, today).find((b) => b.id === 'full_week')
    expect(fullWeek?.unlocked).toBe(false)
  })

  it('still unlocks First Step from a meal logged today', () => {
    const today = todayIso()
    const data = withEntries([entry(today, 1400)])
    expect(badgesFor(data, today).find((b) => b.id === 'first_step')?.unlocked).toBe(true)
  })
})

describe('entryName', () => {
  it('resolves catalogue foods', () => {
    expect(entryName(entry('2026-08-29', 250))).toBe('Chicken Breast, grilled')
  })

  it('resolves a custom food from the store rather than showing "Food"', () => {
    const custom: LogEntry = { ...entry('2026-08-29', 300), foodId: 'custom-1' }
    const customFoods = [
      {
        id: 'custom-1',
        slug: 'custom-1',
        category: 'MY FOODS',
        name: 'Mak’s rendang',
        servingSize: '1 plate',
        kcal: 300,
        protein: 20,
        carbs: 10,
        fat: 18,
        fibre: 1,
        glycemicLoad: null,
        notes: null,
        ownerId: 'local',
        source: 'custom' as const,
      },
    ]
    expect(entryName(custom, customFoods)).toBe('Mak’s rendang')
    expect(entryName(custom)).toBe('Food')
  })
})

describe('custom foods survive being deleted', () => {
  const customFood = {
    id: 'custom-1',
    slug: 'custom-1',
    category: 'MY FOODS',
    name: 'Mak’s rendang',
    servingSize: '1 plate',
    kcal: 420,
    protein: 24,
    carbs: 12,
    fat: 30,
    fibre: 2,
    glycemicLoad: null,
    ownerId: 'local',
    notes: null,
    source: 'custom' as const,
  }

  /** What logFood writes for a custom food: name snapshotted onto the entry. */
  const loggedCustom: LogEntry = {
    id: 'e-custom',
    date: '2026-08-29',
    slot: 'dinner',
    foodId: customFood.id,
    recipeId: null,
    customName: customFood.name,
    servings: 1,
    macros: { kcal: 420, protein: 24, carbs: 12, fat: 30, fibre: 2 },
    notes: null,
  }

  it('keeps the name on the entry once the food is gone', () => {
    // customFoods deliberately empty: the food has been deleted.
    expect(entryName(loggedCustom, [])).toBe('Mak’s rendang')
  })

  it('still names it while the food exists', () => {
    expect(entryName(loggedCustom, [customFood])).toBe('Mak’s rendang')
  })

  it('falls back to the store for an entry logged before the snapshot existed', () => {
    const legacy: LogEntry = { ...loggedCustom, customName: null }
    expect(entryName(legacy, [customFood])).toBe('Mak’s rendang')
    expect(entryName(legacy, [])).toBe('Food')
  })

  it('counts a deleted custom food toward the day total', () => {
    const data = { ...defaultData(), entries: [loggedCustom] }
    const [record] = dayRecords(data, ['2026-08-29'])
    expect(record.kcal).toBe(420)
    expect(record.protein).toBe(24)
  })
})

describe('dayRecords', () => {
  it('counts salmon meals for the Omega Squad badge', () => {
    const today = todayIso()
    const data = withEntries([
      entry(today, 310, 'Atlantic Salmon, raw'),
      entry(today, 250, 'Chicken Breast, grilled'),
    ])
    const [record] = dayRecords(data, [today])
    expect(record.salmonMeals).toBe(1)
    expect(record.kcal).toBe(560)
  })
})

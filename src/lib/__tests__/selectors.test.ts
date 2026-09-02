import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { badgesFor, dayRecords, entryName, streakFor } from '../selectors'
import { streak } from '../nutrition'
import { FOODS, RECIPES } from '../catalogue'
import { addDays, daysBetween, todayIso, weekDates, weekOf } from '../dates'
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

/*
 * Qwen's audit flagged this as a live bug; it is not, but only because
 * `streakFor` is the single caller and it happens to feed `streak()` a gapless
 * span. That is an invariant nothing was enforcing, so these two tests make it
 * load-bearing: the first proves the invariant actually matters, the second
 * proves `streakFor` still honours it.
 */
describe('the grace day needs the whole span, not a window off the end', () => {
  const today = todayIso()

  /**
   * Three weeks of logging with two misses: one at day -7, one at day -1.
   *
   * The gap between them is six days, so on the whole diary the second miss
   * falls inside the first one's seven-day window and is *not* forgiven — the
   * run breaks. A seven-day window ending today cannot see the miss at -7 at
   * all, so it forgives the one at -1 and reports a run six times too long.
   * That difference is the entire reason the invariant exists.
   */
  const hiatusDiary = () => {
    const entries: LogEntry[] = []
    for (let d = 20; d >= 0; d -= 1) {
      if (d === 7 || d === 1) continue
      entries.push(entry(addDays(today, -d), 1400))
    }
    return withEntries(entries)
  }

  it('reads the streak differently when it can only see the last seven days', () => {
    const data = hiatusDiary()
    const full = streakFor(data, today)

    // The same diary, but sliced the way Qwen worried a caller might: only the
    // current week, with no sight of the grace already spent before it.
    const bare = streak(dayRecords(data, weekDates(today, 7)))

    expect(bare.current).not.toBe(full.current)
    // And specifically too high: the window cannot see the earlier forgiveness,
    // so it hands out a second one inside the same seven days.
    expect(bare.current).toBeGreaterThan(full.current)
  })

  it('streakFor hands streak() every day in the span, in order', () => {
    const data = hiatusDiary()
    // Recompute the span the way streakFor must: first entry to today, no holes.
    const first = data.entries.map((e) => e.date).sort()[0]
    const span = weekDates(today, daysBetween(first, today) + 1)

    const dates = span
    for (let i = 1; i < dates.length; i += 1) {
      expect(daysBetween(dates[i - 1], dates[i])).toBe(1)
    }
    expect(dates[dates.length - 1]).toBe(today)

    // The contract in streak()'s doc comment, asserted rather than trusted.
    expect(streakFor(data, today)).toEqual(streak(dayRecords(data, dates)))
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

describe('the whole-diary badges', () => {
  const food = FOODS[0]
  const other = FOODS[1]

  const withEntries = (entries: LogEntry[], over: Partial<AppData> = {}): AppData => ({
    ...defaultData(),
    entries,
    ...over,
  })

  const meal = (date: string, foodId: string | null, recipeId: string | null = null): LogEntry => ({
    id: `${date}-${foodId ?? recipeId}`,
    date,
    slot: 'lunch',
    foodId,
    recipeId,
    customName: null,
    servings: 1,
    notes: null,
    macros: { kcal: 300, protein: 20, carbs: 30, fat: 10, fibre: 5 },
  })

  const badge = (data: AppData, id: string, today = '2026-08-30') =>
    badgesFor(data, today).find((b) => b.id === id)!

  it('offers eighteen badges, every one with artwork', () => {
    const list = badgesFor(defaultData(), '2026-08-30')
    expect(list).toHaveLength(18)
    expect(new Set(list.map((b) => b.id)).size).toBe(18)
    for (const b of list) {
      expect(existsSync(`public/badges/${b.id}.png`)).toBe(true)
      expect(existsSync(`public/badges/${b.id}-locked.png`)).toBe(true)
    }
  })

  it('starts every badge locked on a fresh diary', () => {
    expect(badgesFor(defaultData(), '2026-08-30').filter((b) => b.unlocked)).toHaveLength(0)
  })

  it('counts distinct logged days, not entries', () => {
    // Three entries across two dates should read as two days, not three.
    const entries = [
      meal('2026-08-01', food.id),
      { ...meal('2026-08-01', other.id), id: 'second' },
      meal('2026-08-02', food.id),
    ]
    expect(badge(withEntries(entries), 'thirty_days').progress).toBeCloseTo(2 / 30, 5)
  })

  it('ignores days logged in the future', () => {
    const entries = [meal('2026-08-29', food.id), meal('2026-09-20', other.id)]
    expect(badge(withEntries(entries), 'thirty_days').progress).toBeCloseTo(1 / 30, 5)
  })

  /*
   * The one badge for something that looks like failure. All-or-nothing
   * collapse after a missed week is how a food diary usually dies.
   */
  it('unlocks Comeback only after a real gap', () => {
    const steady = ['2026-08-20', '2026-08-21', '2026-08-22'].map((d) => meal(d, food.id))
    expect(badge(withEntries(steady), 'comeback').unlocked).toBe(false)

    const lapsed = [meal('2026-08-10', food.id), meal('2026-08-20', other.id)]
    expect(badge(withEntries(lapsed), 'comeback').unlocked).toBe(true)
  })

  it('does not call a three-day gap a comeback', () => {
    const entries = [meal('2026-08-20', food.id), meal('2026-08-23', other.id)]
    expect(badge(withEntries(entries), 'comeback').unlocked).toBe(false)
  })

  it('counts distinct foods and food groups, not helpings', () => {
    const twice = [meal('2026-08-20', food.id), meal('2026-08-21', food.id)]
    expect(badge(withEntries(twice), 'explorer').progress).toBeCloseTo(1 / 25, 5)
    expect(badge(withEntries(twice), 'well_rounded').progress).toBeGreaterThan(0)
  })

  it('counts recipes for Home Cook and not for Explorer', () => {
    const entries = [meal('2026-08-20', null, RECIPES[0].id)]
    expect(badge(withEntries(entries), 'home_cook').progress).toBeCloseTo(1 / 5, 5)
    expect(badge(withEntries(entries), 'explorer').progress).toBe(0)
  })

  it('counts a hydrated day only when the target is actually met', () => {
    const target = defaultData().targets.waterMl
    const data = withEntries([], {
      water: { '2026-08-20': target, '2026-08-21': target - 1, '2026-08-22': target + 500 },
    })
    // Two of the three days cleared it.
    expect(badge(data, 'hydrated').progress).toBeCloseTo(2 / 5, 5)
  })

  it('extends the weight ladder without disturbing the earlier rungs', () => {
    const data: AppData = {
      ...defaultData(),
      weights: [{ id: 'w', date: '2026-08-20', weightKg: defaultData().profile.startWeightKg - 5 }]
        .map((w) => ({ ...w, waistCm: null, hipCm: null })),
    }
    expect(badge(data, 'down_1kg').unlocked).toBe(true)
    expect(badge(data, 'down_3kg').unlocked).toBe(true)
    expect(badge(data, 'down_5kg').unlocked).toBe(true)
  })

  /*
   * The rule the whole set is held to: a badge may reward logging, consistency,
   * variety, adequacy or coming back — never eating less.
   */
  /*
   * The bug this pins: badgesFor used to scope the week badges to the current
   * calendar week, so on a Monday morning with nothing logged yet the week held
   * exactly one empty day — and First Step read as locked to someone on a
   * nineteen-day streak. Badges are achievements; they do not expire.
   */
  it('keeps earned badges earned on a Monday morning', () => {
    // 2026-08-31 is a Monday. Log the fortnight before it, and nothing today.
    const monday = '2026-08-31'
    const entries = Array.from({ length: 14 }, (_, i) => ({
      ...meal(addDays(monday, -(i + 1)), food.id),
      id: `d${i}`,
      macros: { kcal: 1500, protein: 120, carbs: 150, fat: 50, fibre: 40 },
    }))
    const data = withEntries(entries)

    for (const id of ['first_step', 'full_week', 'protein_power', 'fibre_friend', 'disiplin']) {
      expect(badge(data, id, monday).unlocked, `${id} on a Monday`).toBe(true)
    }
  })

  it('measures the week badges over the best week, not the latest one', () => {
    // A strong week, then a fortnight of nothing but a token entry a day.
    const today = '2026-08-31'
    const strong = Array.from({ length: 7 }, (_, i) => ({
      ...meal(addDays(today, -(21 + i)), food.id),
      id: `s${i}`,
      macros: { kcal: 1500, protein: 120, carbs: 150, fat: 50, fibre: 40 },
    }))
    const thin = Array.from({ length: 14 }, (_, i) => ({
      ...meal(addDays(today, -(i + 1)), other.id),
      id: `t${i}`,
      macros: { kcal: 200, protein: 2, carbs: 40, fat: 1, fibre: 1 },
    }))
    const data = withEntries([...strong, ...thin])
    expect(badge(data, 'full_week', today).unlocked).toBe(true)
    expect(badge(data, 'protein_power', today).unlocked).toBe(true)
  })

  it('never rewards eating less', () => {
    for (const b of badgesFor(defaultData(), '2026-08-30')) {
      expect(`${b.name} ${b.requirement}`).not.toMatch(
        /fast|skip|under|less|lowest|smallest|deficit|restrict|empty/i
      )
    }
  })

  it('keeps every requirement short enough to read on a card', () => {
    for (const b of badgesFor(defaultData(), '2026-08-30')) {
      expect(b.requirement.length).toBeLessThanOrEqual(42)
      expect(b.name.length).toBeLessThanOrEqual(16)
    }
  })
})

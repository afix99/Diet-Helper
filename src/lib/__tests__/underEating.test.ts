import { describe, expect, it } from 'vitest'
import {
  MIN_LOW_DAYS,
  RESURFACE_GAP_DAYS,
  dismissalFor,
  targetWarningVisible,
  underEating,
  underEatingVisible,
  type UnderEatingDismissal,
} from '../underEating'
import type { DayRecord } from '../nutrition'

const day = (date: string, kcal: number, burned = 0): DayRecord => ({
  date,
  kcal,
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  burned,
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

describe('exercise counts against the floor', () => {
  const profile = { startWeightKg: 62, heightCm: 165, age: 28, sex: 'female' as const }

  it('catches a day that only goes under once training is subtracted', () => {
    // 1,300 eaten looks fine and is not: 700 kcal of it went into a workout.
    const days = [day('2026-08-27', 1300, 700), day('2026-08-28', 1350, 700)]
    const gross = days.map((d) => ({ ...d, burned: 0 }))

    expect(underEating(gross, profile, '2026-08-29').triggered).toBe(false)

    const net = underEating(days, profile, '2026-08-29')
    expect(net.triggered).toBe(true)
    expect(net.lowDays).toHaveLength(2)
    expect(net.exerciseCounted).toBe(true)
  })

  it('leaves a well-fed training day alone', () => {
    const days = [day('2026-08-27', 2200, 600), day('2026-08-28', 2100, 500)]
    expect(underEating(days, profile, '2026-08-29').triggered).toBe(false)
  })

  it('does not claim exercise when there was none', () => {
    const days = [day('2026-08-27', 900), day('2026-08-28', 950)]
    const result = underEating(days, profile, '2026-08-29')
    expect(result.triggered).toBe(true)
    expect(result.exerciseCounted).toBe(false)
  })

  it('still needs something logged before it says anything', () => {
    // A blank day with a workout on it is not evidence of not eating.
    const days = [day('2026-08-27', 0, 700), day('2026-08-28', 0, 700)]
    expect(underEating(days, profile, '2026-08-29').triggered).toBe(false)
  })
})


/* --- closing it ----------------------------------------------------------- */

/** A fortnight ending the day before TODAY, with the named dates run low. */
const fortnight = (lowDates: string[], normalKcal = 1800): DayRecord[] =>
  Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 7, 15 + i)).toISOString().slice(0, 10)
    return day(d, lowDates.includes(d) ? 500 : normalKcal)
  })

const check = (days: DayRecord[], today = TODAY) =>
  underEating(days, profile, today, 62)

describe('the warning can be closed, and stays closed', () => {
  const days = fortnight(['2026-08-26', '2026-08-27'])
  const live = check(days)

  it('is on screen before anything is dismissed', () => {
    expect(live.triggered).toBe(true)
    expect(underEatingVisible(live, null, 800, days)).toBe(true)
  })

  it('goes quiet once closed', () => {
    /*
     * The whole point of the change. A warning you cannot dismiss stops being
     * information and becomes furniture.
     */
    const d = dismissalFor(live, 800, TODAY)
    expect(underEatingVisible(live, d, 800, days)).toBe(false)
  })

  it('records the situation rather than a bare flag', () => {
    const d = dismissalFor(live, 800, TODAY)
    expect(d.targetKcal).toBe(800)
    expect(d.throughDate).toBe('2026-08-27')
    expect(d.at).toBe(TODAY)
  })

  it('stays quiet while the same stretch simply continues', () => {
    // One more low day, no normal days in between: same situation, not news.
    const more = fortnight(['2026-08-26', '2026-08-27', '2026-08-28'])
    const d: UnderEatingDismissal = {
      at: TODAY,
      targetKcal: 800,
      throughDate: '2026-08-27',
    }
    expect(underEatingVisible(check(more), d, 800, more)).toBe(false)
  })

  it('stays quiet when the target goes up', () => {
    const d = dismissalFor(live, 800, TODAY)
    expect(underEatingVisible(live, d, 1400, days)).toBe(false)
  })
})

describe('what counts as the situation changing', () => {
  it('speaks again when the target is lowered further', () => {
    // Dropping the target after reading the warning is a new decision about
    // the very number the warning is about.
    const days = fortnight(['2026-08-26', '2026-08-27'])
    const d = dismissalFor(check(days), 800, TODAY)
    expect(underEatingVisible(check(days), d, 700, days)).toBe(true)
  })

  it('speaks again when low days restart after a normal stretch', () => {
    /*
     * A dip, then a clear run of normal days, then another dip is a different
     * pattern from one long stretch — and only the second one is news.
     */
    const days = fortnight(['2026-08-20', '2026-08-21', '2026-08-27', '2026-08-28'])
    const d: UnderEatingDismissal = {
      at: '2026-08-22',
      targetKcal: 800,
      throughDate: '2026-08-21',
    }
    expect(underEatingVisible(check(days), d, 800, days)).toBe(true)
  })

  it('needs a real break, not one quiet day', () => {
    // 2026-08-22 normal, then low again: only one normal day, so it is the
    // same stretch wobbling rather than a new one starting.
    const days = fortnight(['2026-08-20', '2026-08-21', '2026-08-23'])
    const d: UnderEatingDismissal = {
      at: '2026-08-22',
      targetKcal: 800,
      throughDate: '2026-08-21',
    }
    expect(RESURFACE_GAP_DAYS).toBeGreaterThan(1)
    expect(underEatingVisible(check(days), d, 800, days)).toBe(false)
  })

  it('cannot be tricked into a break by simply not logging', () => {
    /*
     * Unlogged days are not evidence of eating. If they counted as the normal
     * stretch, stopping logging for a few days would resurface the warning —
     * rewarding the one behaviour the app least wants to encourage.
     */
    const days = fortnight(['2026-08-20', '2026-08-21', '2026-08-27']).map((d) =>
      d.date > '2026-08-21' && d.date < '2026-08-27' ? { ...d, kcal: 0 } : d
    )
    const dis: UnderEatingDismissal = {
      at: '2026-08-22',
      targetKcal: 800,
      throughDate: '2026-08-21',
    }
    expect(underEatingVisible(check(days), dis, 800, days)).toBe(false)
  })

  it('never shows when there is nothing to warn about', () => {
    const fine = fortnight([])
    expect(check(fine).triggered).toBe(false)
    expect(underEatingVisible(check(fine), null, 1800, fine)).toBe(false)
  })
})

describe('the small reminder shares the dismissal', () => {
  it('hides once the big one is closed', () => {
    // Two lines about one subject, one of them un-silenceable, reads as the
    // app ignoring you.
    const d: UnderEatingDismissal = { at: TODAY, targetKcal: 800, throughDate: TODAY }
    expect(targetWarningVisible(true, null, 800)).toBe(true)
    expect(targetWarningVisible(true, d, 800)).toBe(false)
  })

  it('comes back if the target is lowered again', () => {
    const d: UnderEatingDismissal = { at: TODAY, targetKcal: 800, throughDate: TODAY }
    expect(targetWarningVisible(true, d, 750)).toBe(true)
  })

  it('says nothing when the target is not below resting', () => {
    expect(targetWarningVisible(false, null, 1800)).toBe(false)
  })
})

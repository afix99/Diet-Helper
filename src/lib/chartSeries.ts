/**
 * The numbers behind the Progress charts.
 *
 * Split out from the components for the usual reason — arithmetic in a render
 * function cannot be tested — but also because the old charts had a specific
 * failure this module exists to prevent.
 *
 * **The window follows the data, not the calendar.** The previous "Is it
 * working?" chart always drew twelve weeks. With one week logged you got a
 * single bar pinned to the right-hand edge and eleven weeks of white space, and
 * an axis running from June to August for a diary that started in August. It
 * looked broken, and it made a real reading ("you have one week of data") look
 * like a rendering fault. `windowFor` trims to what actually exists, so an
 * empty chart is empty because your diary is, and a full one uses its whole
 * width.
 */

import { addDays, todayIso } from './dates'
import { bmr, rollingAverage, type DayRecord } from './nutrition'
import type { ActivityLevel, Sex, WeightLog } from './types'

/** How far back the charts look. */
export type Range = 'month' | 'quarter' | 'all'

export const RANGES: readonly { value: Range; label: string; days: number }[] = [
  { value: 'month', label: '1M', days: 30 },
  { value: 'quarter', label: '3M', days: 90 },
  // Two years, which is past the point where a phone chart is legible anyway;
  // `windowFor` trims it down to whatever the diary actually holds.
  { value: 'all', label: 'All', days: 730 },
]

export interface SeriesProfile {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
  activityLevel: ActivityLevel
}

/** One day, with everything the three charts need. */
export interface DayPoint {
  date: string
  /** Null where nothing was logged — a gap, not a zero. */
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fibre: number | null
  /** Resting burn plus whatever exercise was logged. Null without a full profile. */
  burned: number | null
  /** A weigh-in on this exact day, if there was one. */
  weightKg: number | null
  /** Seven-day mean of the weigh-ins, which is the line worth reading. */
  weightAvgKg: number | null
}

export interface Series {
  points: DayPoint[]
  /** The days that carry a weigh-in, for the "you have N readings" copy. */
  weighIns: number
  loggedDays: number
  from: string
  to: string
}

/**
 * The date range to draw.
 *
 * Starts at the later of "range days back" and "the first thing you ever
 * logged", so a two-week-old diary never renders three months of nothing.
 */
export function windowFor(
  range: Range,
  earliest: string | null,
  today: string = todayIso()
): { from: string; to: string } {
  const days = RANGES.find((r) => r.value === range)?.days ?? 30
  const byRange = addDays(today, -(days - 1))
  const from = earliest && earliest > byRange ? earliest : byRange
  return { from: from > today ? today : from, to: today }
}

/** Every ISO date from `from` to `to`, inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push(d)
    if (out.length > 800) break // a runaway loop must not hang the phone
  }
  return out
}

/** The earliest date the diary knows about, or null for an empty one. */
export function earliestDate(
  days: readonly { date: string; kcal: number }[],
  weights: readonly WeightLog[]
): string | null {
  const dates = [
    ...days.filter((d) => d.kcal > 0).map((d) => d.date),
    ...weights.map((w) => w.date),
  ]
  return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null
}

/**
 * Build the plotted series.
 *
 * `burned` is resting burn for the body you had *at the time* — the weigh-in
 * carried forward — plus logged activity. Using today's weight for a month of
 * history would quietly redraw the past every time you step on the scale.
 */
export function buildSeries(
  days: readonly DayRecord[],
  weights: readonly WeightLog[],
  profile: SeriesProfile
): Series {
  const byWeight = new Map(weights.map((w) => [w.date, w.weightKg]))

  // Weigh-ins in order, so each day can find the most recent one at or before it.
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  let cursor = 0
  let carried: number | null = null

  const raw = days.map((d) => {
    while (cursor < sorted.length && sorted[cursor].date <= d.date) {
      carried = sorted[cursor].weightKg
      cursor += 1
    }
    const weightForDay = carried ?? profile.startWeightKg
    const resting =
      profile.heightCm && profile.age
        ? bmr(weightForDay, profile.heightCm, profile.age, profile.sex)
        : null
    const logged = d.kcal > 0
    return {
      date: d.date,
      kcal: logged ? d.kcal : null,
      protein: logged ? d.protein : null,
      carbs: logged ? d.carbs : null,
      fat: logged ? d.fat : null,
      fibre: logged ? d.fibre : null,
      burned: resting === null ? null : Math.round(resting + d.burned),
      weightKg: byWeight.get(d.date) ?? null,
    }
  })

  /*
   * The average runs over the weigh-ins themselves, not over the calendar. A
   * seven-*day* mean of a diary weighed weekly would average one reading with
   * six blanks and draw a line that jumps on weigh-in day and flatlines
   * between — which is the opposite of what a trend line is for.
   */
  const readings = raw.filter((p) => p.weightKg !== null)
  const avgOfReadings = rollingAverage(
    readings.map((p) => p.weightKg as number),
    7
  )
  const avgByDate = new Map(readings.map((p, i) => [p.date, avgOfReadings[i]]))

  let lastAvg: number | null = null
  const points: DayPoint[] = raw.map((p) => {
    const a = avgByDate.get(p.date)
    if (a !== undefined && a !== null) lastAvg = a
    // Carried forward so the trend line is continuous between weigh-ins
    // rather than a dotted scatter of single points.
    return { ...p, weightAvgKg: p.weightKg === null ? lastAvg : (a ?? lastAvg) }
  })

  return {
    points,
    weighIns: readings.length,
    loggedDays: raw.filter((p) => p.kcal !== null).length,
    from: points[0]?.date ?? '',
    to: points[points.length - 1]?.date ?? '',
  }
}

/**
 * Thin a series down to at most `max` points for plotting.
 *
 * Two years of daily dots on a 320-wide chart is six days per pixel: slower to
 * draw and no more informative. Always keeps the first and last so the axis
 * labels stay truthful.
 */
export function thin<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items]
  const step = (items.length - 1) / (max - 1)
  const out: T[] = []
  for (let i = 0; i < max; i += 1) out.push(items[Math.round(i * step)])
  return out
}

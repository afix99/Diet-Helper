/**
 * Observations drawn from the user's own log.
 *
 * MyNetDiary calls this an AI Coach. Everything genuinely useful it says about
 * *your* diary is arithmetic over data we already hold, so this is rules — which
 * has the advantage of being explainable, instant, offline and free.
 *
 * Two principles:
 * - Every rule states its own minimum evidence and stays silent below it.
 *   A "coach" that draws conclusions from two days is noise.
 * - The workbook's non-judgemental voice carries over. Observations, not
 *   scolding, and never a comment on appearance or worth.
 * - Nothing here repeats what the trend card above it already says. The finish
 *   -date projection used to live here as well, on weaker evidence than the
 *   card demands, and two different arrival dates on one screen is worse than
 *   either alone.
 */
import { isOnTarget, round1, type DayRecord } from './nutrition'
import { ratePerWeek } from './trends'
import { underEating, type UnderEatingProfile } from './underEating'
import type { Targets, WeightLog } from './types'
import type { Need } from './suggest'

export type InsightTone = 'good' | 'neutral' | 'watch'

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  detail: string
  /**
   * A gap the catalogue can help close. The rule states the need; picking the
   * foods is the UI's job, so this module stays pure and testable and does not
   * pull 415 rows of JSON into the coach.
   */
  suggest?: Need
}

export interface InsightInput {
  /** Days up to today, oldest first. Planned future days must be excluded. */
  days: readonly DayRecord[]
  targets: Targets
  weights: readonly WeightLog[]
  startWeightKg: number
  goalWeightKg: number
  /** Today's key, so the intake check can exclude a day still in progress. */
  today?: string
  /** Height, age and sex, for the resting-burn line. Optional. */
  profile?: UnderEatingProfile
  /** Latest weigh-in, so the resting figure matches the rest of the app. */
  latestWeightKg?: number | null
}

const mean = (ns: readonly number[]) =>
  ns.length === 0 ? 0 : ns.reduce((a, b) => a + b, 0) / ns.length

/** Saturday and Sunday, from an ISO day key, in UTC to match the date helpers. */
const isWeekend = (iso: string) => {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return day === 0 || day === 6
}

export function insights(input: InsightInput): Insight[] {
  const { days, targets, weights, startWeightKg } = input
  const logged = days.filter((d) => d.kcal > 0)
  const out: Insight[] = []

  /*
   * Intake safety runs before the three-day evidence gate and outside it.
   * Every other rule here is an observation that can afford to wait for more
   * data; this one is the reason someone might need to act now, and two low
   * days is already the threshold it was designed around.
   */
  if (input.today && input.profile) {
    const low = underEating(days, input.profile, input.today, input.latestWeightKg)
    if (low.triggered) {
      out.push({
        id: 'intake_too_low',
        tone: 'watch',
        title: 'Intake has been very low',
        detail:
          `${low.lowDays.length} of the last few logged days came in under ` +
          `${low.floor.toLocaleString('en-GB')} kcal. If that is under-logging rather ` +
          `than under-eating, ignore this. If it isn't, eating this little costs muscle ` +
          `and sleep and gets harder to hold — and it is worth raising with a doctor.`,
      })
    }
  }

  // Nothing meaningful can be said from fewer than three logged days.
  if (logged.length < 3) return out

  // --- Weekday vs weekend ------------------------------------------------
  const weekdays = logged.filter((d) => !isWeekend(d.date))
  const weekends = logged.filter((d) => isWeekend(d.date))
  if (weekdays.length >= 3 && weekends.length >= 2) {
    const wd = Math.round(mean(weekdays.map((d) => d.kcal)))
    const we = Math.round(mean(weekends.map((d) => d.kcal)))
    const gap = we - wd
    if (Math.abs(gap) >= 250) {
      out.push({
        id: 'weekend_gap',
        tone: gap > 0 ? 'watch' : 'neutral',
        title: gap > 0 ? 'Weekends run higher' : 'Weekends run lighter',
        detail:
          `You average ${wd} kcal on weekdays and ${we} at weekends — a ` +
          `${Math.abs(gap)} kcal swing. Two heavy weekend days can cancel five ` +
          `careful weekdays, so it is usually the cheapest thing to even out.`,
      })
    }
  }

  // --- Protein -----------------------------------------------------------
  const proteinDays = logged.filter((d) => d.protein >= targets.protein).length
  const proteinRate = proteinDays / logged.length
  if (proteinRate >= 0.7) {
    out.push({
      id: 'protein_strong',
      tone: 'good',
      title: 'Protein is holding',
      detail:
        `You hit ${targets.protein}g on ${proteinDays} of ${logged.length} logged days. ` +
        `That is the single biggest protector of muscle while losing weight.`,
    })
  } else if (proteinRate <= 0.35) {
    const avg = Math.round(mean(logged.map((d) => d.protein)))
    out.push({
      id: 'protein_low',
      tone: 'watch',
      suggest: 'protein',
      title: 'Protein is running short',
      detail:
        `Averaging ${avg}g against a ${targets.protein}g target. It is the one macro ` +
        `worth chasing in a deficit — it is what keeps the weight coming off muscle.`,
    })
  }

  // --- Consistency of logging -------------------------------------------
  const rate = logged.length / days.length
  if (days.length >= 7 && rate >= 0.85) {
    out.push({
      id: 'consistent',
      tone: 'good',
      title: 'Logging is consistent',
      detail:
        `${logged.length} of the last ${days.length} days logged. Self-monitoring ` +
        `is the habit most strongly linked to keeping weight off — this is the one to protect.`,
    })
  } else if (days.length >= 7 && rate < 0.5) {
    out.push({
      id: 'gaps',
      tone: 'neutral',
      title: 'Plenty of gaps',
      detail:
        `${logged.length} of the last ${days.length} days logged. A rough entry counts — ` +
        `describing a meal in the quick-add box beats skipping it.`,
    })
  }

  // --- Fibre -------------------------------------------------------------
  const avgFibreDays = logged.length
  if (avgFibreDays >= 4) {
    const under = logged.filter((d) => d.fibre < targets.fibre * 0.7)
    if (under.length / avgFibreDays >= 0.7) {
      out.push({
        id: 'fibre_low',
        tone: 'watch',
        suggest: 'fibre',
        title: 'Fibre is low most days',
        detail:
          `Under ${Math.round(targets.fibre * 0.7)}g on ${under.length} of ${avgFibreDays} days. ` +
          `Fibre is what makes a deficit feel survivable.`,
      })
    }
  }

  // --- Salmon / omega-3 --------------------------------------------------
  if (days.length >= 7) {
    const salmon = logged.reduce((sum, d) => sum + d.salmonMeals, 0)
    const weeks = days.length / 7
    const perWeek = salmon / weeks
    if (perWeek >= 3) {
      out.push({
        id: 'omega_good',
        tone: 'good',
        title: 'Omega-3 is covered',
        detail: `About ${round1(perWeek)} salmon meals a week — at or above the 3× target.`,
      })
    } else if (salmon === 0) {
      out.push({
        id: 'omega_none',
        tone: 'neutral',
        suggest: 'omega3',
        title: 'No oily fish logged',
        detail: `The plan leans on oily fish for EPA/DHA, and none has been logged this week.`,
      })
    }
  }

  // --- Rate of loss ------------------------------------------------------
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length >= 2) {
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const dayGap =
      (new Date(`${last.date}T00:00:00Z`).getTime() -
        new Date(`${first.date}T00:00:00Z`).getTime()) /
      86_400_000
    // One shared rate for the whole app: the Progress screen shows a regression
    // slope beside these lines, and two pace numbers that disagreed would be
    // worse than either on its own.
    const perWeek = ratePerWeek(sorted)
    if (dayGap >= 10 && perWeek !== null) {
      if (perWeek >= 0.4 && perWeek <= 0.7) {
        out.push({
          id: 'rate_ideal',
          tone: 'good',
          title: 'Losing at a sustainable rate',
          detail:
            `About ${perWeek} kg a week, right in the 0.4–0.6 band the programme aims for. ` +
            `Faster is mostly water and muscle.`,
        })
      } else if (perWeek > 0.9) {
        out.push({
          id: 'rate_fast',
          tone: 'watch',
          title: 'Dropping quite fast',
          detail:
            `About ${perWeek} kg a week. Above roughly 0.7 kg you start losing more ` +
            `lean tissue. Eating a little more, not less, is usually the fix.`,
        })
      } else if (perWeek <= 0 && dayGap >= 21) {
        out.push({
          id: 'rate_stalled',
          tone: 'neutral',
          title: 'Weight has been flat',
          detail:
            `No net change over ${Math.round(dayGap)} days. Before cutting further, check ` +
            `whether the last two weeks were logged as fully as the first.`,
        })
      }
    }
  } else if (sorted.length === 1 && sorted[0].weightKg !== startWeightKg) {
    out.push({
      id: 'weigh_again',
      tone: 'neutral',
      title: 'One weigh-in so far',
      detail: 'Log a second, a week apart, and the trend line and pace estimate appear.',
    })
  }

  return out
}

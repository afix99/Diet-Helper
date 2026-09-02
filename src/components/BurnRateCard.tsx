'use client'

import { useMemo } from 'react'
import { Card } from './ui'
import { burnRate, burnRateCopy } from '@/lib/burnRate'
import { dayRecords, weekDates } from '@/lib/selectors'
import { trends } from '@/lib/trends'
import { useData } from '@/lib/store/provider'

const kcal = (n: number) => Math.round(n).toLocaleString('en-GB')

/**
 * What her body actually burns, next to what the formula guessed.
 *
 * The reasoning and every safeguard live in `lib/burnRate.ts`; this only
 * renders them. Three choices worth knowing about here:
 *
 * - **The band is the headline, not a footnote.** The big number is the range.
 *   A single confident figure would be claiming a precision that four weigh-ins
 *   cannot support, and the whole point of the estimate is that it is more
 *   honest than the formula it replaces — not that it is exact.
 * - **There is no button.** Nothing on this card changes her calorie target,
 *   and it deliberately does not offer to. It corrects what the app *reports*.
 * - **Not-ready is a sentence, not a lock icon.** `needs` already says the one
 *   thing that would fill it in, which is the same pattern the trend card and
 *   the insights use.
 */
export function BurnRateCard({ today }: { today: string }) {
  const { data } = useData()

  const rate = useMemo(() => {
    const t = trends({
      // Same window and the same exclusion of today as TrendCard: a day still
      // in progress carries a part-eaten intake and would drag the average down.
      days: dayRecords(data, weekDates(today, 84).filter((d) => d < today)),
      weights: data.weights,
      targets: data.targets,
      profile: data.profile,
      goalWeightKg: data.profile.goalWeightKg,
      today,
    })
    return burnRate(t)
  }, [data, today])

  return (
    <Card className="mb-4">
      <h2 className="mb-1 text-secondary font-bold">What your body actually burns</h2>
      <p className="mb-3 text-caption leading-relaxed text-faint">
        Not the textbook estimate — this one is read backwards out of your own weight and your
        own diary.
      </p>

      {rate.ready ? (
        <>
          <p className="text-large-title tabular-nums text-primary-ink">
            {kcal(rate.lowKcal!)}&ndash;{kcal(rate.highKcal!)}
          </p>
          <p className="mt-0.5 text-caption text-faint">
            kcal a day, before any exercise you log on top &middot; measured over{' '}
            {rate.spanDays} days
          </p>

          <p className="mt-3 text-tertiary leading-relaxed text-muted">{burnRateCopy(rate)}</p>

          <p className="mt-3 border-t border-line pt-3 text-caption leading-relaxed text-faint">
            The formula had you at {kcal(rate.formulaKcal!)}. This estimate rests on 7,700 kcal
            per kilogram, which is an approximation, so it is a range and not a number. It does
            not change your target &mdash; nothing here is asking you to eat differently.
          </p>
        </>
      ) : (
        <p className="text-tertiary leading-relaxed text-muted">{rate.needs}</p>
      )}
    </Card>
  )
}

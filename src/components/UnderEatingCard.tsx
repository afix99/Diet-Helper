'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Emoji } from './Emoji'
import { Icon } from './icons'
import { Card } from './ui'
import { addDays, formatDay } from '@/lib/dates'
import { useLogging } from '@/lib/logging'
import { dayRecords, latestWeight } from '@/lib/selectors'
import { dismissalFor, underEating, underEatingVisible } from '@/lib/underEating'
import { useData } from '@/lib/store/provider'

/**
 * The app's one raised voice, on the screen people actually open.
 *
 * Tone is deliberate. The workbook's disclaimer cautions around a history of
 * disordered eating, so this states what it sees, allows that it may be wrong,
 * and points at a human rather than diagnosing anything. No red, no alarm
 * language, no counting up how badly someone did.
 *
 * And it can be closed. A warning you cannot dismiss stops being information
 * and becomes furniture — you learn to look past it, which costs you the one
 * time it matters. Closing it is remembered against the situation that caused
 * it, so it stays shut about a decision you have already made and still speaks
 * up if the target drops again or a fresh run of low days starts. The rule
 * lives in `underEatingVisible`; Settings has the way to bring it back.
 */
export function UnderEatingCard({ date }: { date: string }) {
  const { data } = useData()
  const { dismissUnderEating } = useLogging()

  const { check, days } = useMemo(() => {
    // Fourteen days back, so the seven-day window is always fully populated.
    const dates = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13))
    const records = dayRecords(data, dates)
    return {
      check: underEating(records, data.profile, date, latestWeight(data)),
      days: records,
    }
  }, [data, date])

  if (!underEatingVisible(check, data.dismissals.underEating, data.targets.kcal, days)) {
    return null
  }

  const when = check.lowDays
    .slice(-3)
    .map((d) => formatDay(d.date, { weekday: 'long' }))
    .join(', ')

  return (
    <Card className="mb-4 border-amber/40 bg-amber/5">
      <div className="flex gap-3">
        <Emoji name="clock" size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 text-secondary font-bold">
              That&rsquo;s very little food
            </h2>
            <button
              type="button"
              onClick={() => dismissUnderEating(dismissalFor(check, data.targets.kcal, date))}
              aria-label="Close this reminder"
              className="tap -mr-1 -mt-1 shrink-0 rounded-pill p-1.5 text-amber/70"
            >
              <Icon name="close" size={16} strokeWidth={2.2} />
            </button>
          </div>
          <p className="mt-1 text-tertiary leading-relaxed text-muted">
            {when} came in under {check.floor.toLocaleString('en-GB')} kcal
            {check.exerciseCounted ? ' once training was taken off' : ''}
            {check.restingKcal
              ? ` — below the ${check.restingKcal.toLocaleString('en-GB')} you burn just being alive`
              : ''}
            . If you ate more than you logged, nothing to worry about.
          </p>
          <p className="mt-2 text-tertiary leading-relaxed text-muted">
            If you didn&rsquo;t, eating this little tends to backfire: it costs muscle and
            sleep, and it gets harder to hold, not easier. Slower usually wins.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link
              href="/more/settings"
              className="tap text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
            >
              Review my target
            </Link>
            <Link
              href="/more/recipes"
              className="tap text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
            >
              Find something to eat
            </Link>
          </div>
          <p className="mt-3 text-caption leading-relaxed text-faint">
            This is a planning tool, not a clinician. If eating has felt hard to control
            lately, in either direction, that is worth raising with a doctor or dietitian.
          </p>
          <p className="mt-2 text-caption leading-relaxed text-faint">
            Close this and it stays closed. It only comes back if you lower your target
            again, or if low days start again after a normal stretch.
          </p>
        </div>
      </div>
    </Card>
  )
}

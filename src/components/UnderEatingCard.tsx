'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Emoji } from './Emoji'
import { Card } from './ui'
import { addDays, formatDay } from '@/lib/dates'
import { dayRecords } from '@/lib/selectors'
import { underEating } from '@/lib/underEating'
import { useData } from '@/lib/store/provider'

/**
 * The app's one raised voice, on the screen people actually open.
 *
 * Tone is deliberate. The workbook's disclaimer cautions around a history of
 * disordered eating, so this states what it sees, allows that it may be wrong,
 * and points at a human rather than diagnosing anything. No red, no alarm
 * language, no counting up how badly someone did.
 */
export function UnderEatingCard({ date }: { date: string }) {
  const { data } = useData()

  const check = useMemo(() => {
    // Fourteen days back, so the seven-day window is always fully populated.
    const dates = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13))
    return underEating(dayRecords(data, dates), data.profile, date)
  }, [data, date])

  if (!check.triggered) return null

  const when = check.lowDays
    .slice(-3)
    .map((d) => formatDay(d.date, { weekday: 'long' }))
    .join(', ')

  return (
    <Card className="mb-4 border-amber/40 bg-amber/5">
      <div className="flex gap-3">
        <Emoji name="clock" size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-secondary font-bold">That&rsquo;s very little food</h2>
          <p className="mt-1 text-tertiary leading-relaxed text-muted">
            {when} came in under {check.floor.toLocaleString('en-GB')} kcal
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
        </div>
      </div>
    </Card>
  )
}

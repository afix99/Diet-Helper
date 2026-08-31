'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card } from './ui'
import { Icon } from './icons'
import { PressButton } from './PressButton'
import { ExercisePicker } from './ExercisePicker'
import { usePresence } from '@/hooks/usePresence'
import { sound } from '@/lib/sound'
import { exerciseById } from '@/lib/exercise'
import { useLogging } from '@/lib/logging'
import { activitiesFor, dayTotals } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'

const n = (v: number) => Math.round(v).toLocaleString('en-GB')

/**
 * What today's movement bought back.
 *
 * The ring above already spends this — exercise raises the allowance rather
 * than reducing what you ate, which is the direction that matches what the body
 * is doing. So this card's job is to keep the raise legible: every bout, what
 * it cost, and the plain net at the bottom, so nothing important is hidden
 * behind a bigger number.
 */
export function ExerciseCard({ date }: { date: string }) {
  const { data } = useData()
  const { removeActivity } = useLogging()
  const [picking, setPicking] = useState(false)
  const [heldPicking, pickingLeaving] = usePresence(picking || null)

  const activities = useMemo(() => activitiesFor(data, date), [data, date])
  const eaten = useMemo(() => dayTotals(data, date).kcal, [data, date])
  const burned = activities.reduce((sum, a) => sum + a.kcal, 0)

  /*
   * The profile's activity level already multiplies BMR up to a maintenance
   * figure that assumes some exercise. Logging workouts on top of "Active"
   * counts part of the same energy twice. Said plainly, once, rather than
   * quietly corrected: it is the user's number to set.
   */
  const doubleCounting = data.profile.activityLevel !== 'sedentary' && burned > 0

  return (
    <>
      <Card className="mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-secondary font-bold">Exercise</h2>
          <span className="text-tertiary tabular-nums text-muted">
            {burned > 0 ? (
              <>
                +{n(burned)} <span className="text-faint">kcal earned</span>
              </>
            ) : (
              <span className="text-faint">Nothing logged</span>
            )}
          </span>
        </div>

        {activities.length > 0 && (
          <ul className="stack mb-3 gap-1">
            {activities.map((a) => {
              const name = a.customName ?? exerciseById(a.exerciseId ?? '')?.name ?? 'Activity'
              return (
                <li
                  key={a.id}
                  data-activity
                  className="flex items-center gap-2 border-b border-line py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-tertiary font-semibold">{name}</span>
                    <span className="block text-caption text-faint">{a.minutes} min</span>
                  </span>
                  <span className="shrink-0 text-tertiary font-bold tabular-nums text-primary-ink">
                    +{n(a.kcal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound('undo')
                      removeActivity(a.id)
                    }}
                    aria-label={`Remove ${name}`}
                    className="tap shrink-0 px-1 text-faint"
                  >
                    <Icon name="close" size={15} strokeWidth={2.25} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <PressButton
          full
          variant="quiet"
          hapticWeight="medium"
          onClick={() => setPicking(true)}
          className="!rounded-pill !py-2.5"
        >
          <Icon name="activity" size={17} strokeWidth={2} />
          Add exercise
        </PressButton>

        {burned > 0 && (
          <p className="mt-3 text-caption leading-relaxed text-faint tabular-nums">
            {n(eaten)} eaten, {n(burned)} burned — {n(eaten - burned)} net. The ring above
            counts the burn as more room to eat, not as food removed.
          </p>
        )}

        {doubleCounting && (
          <Link
            href="/more/settings"
            className="tap mt-2 flex items-center gap-2 rounded-inner bg-amber/10 px-3 py-2 text-left text-caption leading-snug text-amber"
          >
            <span className="flex-1">
              Your activity level is not set to Sedentary, so your target already assumes some
              exercise. Logging sessions on top counts part of it twice.
            </span>
            <Icon name="chevron" size={13} strokeWidth={2.5} className="shrink-0" />
          </Link>
        )}
      </Card>

      {heldPicking && (
        <ExercisePicker date={date} leaving={pickingLeaving} onClose={() => setPicking(false)} />
      )}
    </>
  )
}

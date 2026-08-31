'use client'

import { useMemo, useState } from 'react'
import { Sheet } from './ui'
import { PressButton } from './PressButton'
import { burstFrom } from './BurstLayer'
import { useCountUp } from '@/hooks/useCountUp'
import { EXERCISES, EXERCISE_CATEGORIES } from '@/lib/catalogue'
import {
  DEFAULT_MINUTES,
  MAX_MINUTES,
  MENTAL_CATEGORY,
  MINUTE_PRESETS,
  bodyWeightFor,
  burnFor,
  clampMinutes,
} from '@/lib/exercise'
import { useLogging } from '@/lib/logging'
import { latestWeight } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import type { Exercise } from '@/lib/types'

/**
 * Pick an activity, then say how long for.
 *
 * Two steps rather than one form, for the same reason the food picker is a list
 * of taps: choosing from a list is a recognition task and filling a form is a
 * recall one. The kcal figure appears only on the second step, once it can be a
 * real number rather than a placeholder.
 */
export function ExercisePicker({
  date,
  onClose,
  leaving,
}: {
  date: string
  onClose: () => void
  leaving?: boolean
}) {
  const { data } = useData()
  const { logActivity } = useLogging()
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<Exercise | null>(null)
  const [minutes, setMinutes] = useState<number>(DEFAULT_MINUTES)

  const weightKg = bodyWeightFor(data.profile.startWeightKg, latestWeight(data))

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return EXERCISES.filter(
      (e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    )
  }, [query])

  const choose = (exercise: Exercise) => {
    setChosen(exercise)
    setMinutes(DEFAULT_MINUTES)
  }

  const confirm = (from?: Element | null) => {
    if (!chosen) return
    logActivity(date, chosen, minutes)
    burstFrom(from ?? null, chosen, { kind: 'exercise' })
    onClose()
  }

  if (chosen) {
    return (
      <Sheet onClose={onClose} leaving={leaving} labelledBy="exercise-duration-title">
        <Duration
          exercise={chosen}
          weightKg={weightKg}
          minutes={minutes}
          onMinutes={setMinutes}
          onBack={() => setChosen(null)}
          onConfirm={confirm}
        />
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="exercise-picker-title">
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <div>
          <p id="exercise-picker-title" className="text-secondary font-bold">
            Add exercise
          </p>
          <p className="text-tertiary text-faint">Raises what you can eat today</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tap px-2 text-secondary font-semibold text-primary-ink"
        >
          Done
        </button>
      </div>

      <div className="px-4 pb-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activities…"
          aria-label="Search exercises"
          className="w-full rounded-pill border border-line bg-surface px-4 py-3 text-body outline-none placeholder:text-faint focus:border-primary"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {results === null ? (
          EXERCISE_CATEGORIES.map((cat) => (
            <div key={cat} className="mb-4">
              <SectionTitle title={cat} />
              {cat === MENTAL_CATEGORY && <MentalNote />}
              {EXERCISES.filter((e) => e.category === cat).map((e) => (
                <Row key={e.id} exercise={e} weightKg={weightKg} onPick={choose} />
              ))}
            </div>
          ))
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-secondary text-faint">No matches.</p>
        ) : (
          results.map((e) => (
            <Row key={e.id} exercise={e} weightKg={weightKg} onPick={choose} />
          ))
        )}
      </div>
    </Sheet>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="sticky top-0 z-10 bg-bg py-2 text-caption font-bold uppercase tracking-wide text-faint">
      {title}
    </h3>
  )
}

/**
 * Said once, where it is relevant, and not repeated anywhere else in the app.
 *
 * Thinking is genuinely expensive — the brain takes about a fifth of resting
 * metabolism — but it spends that whether you revise or watch television, and
 * the target already contains it. What is left over for hard concentration is
 * small, and the thing that actually arrives after three hours of study is
 * mental fatigue, which feels like hunger and is not.
 */
function MentalNote() {
  return (
    <p className="mb-2 rounded-inner bg-raised px-3 py-2 text-caption leading-relaxed text-muted">
      Your brain uses about a fifth of your resting calories — but it spends them
      whether you study or nap, and your target already includes that. What hard
      concentration adds on top is small: an hour of revision is around 50 kcal, a
      banana&rsquo;s worth. Worth logging, and worth knowing that the flatness after a long
      session is mental fatigue, not an empty tank.
    </p>
  )
}

/** One catalogue row, with what an ordinary half hour of it would cost. */
function Row({
  exercise,
  weightKg,
  onPick,
}: {
  exercise: Exercise
  weightKg: number
  onPick: (e: Exercise) => void
}) {
  const half = burnFor(exercise.met, weightKg, 30)
  return (
    <button
      type="button"
      onClick={() => onPick(exercise)}
      className="tap flex w-full items-center justify-between gap-3 border-b border-line py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-secondary font-semibold">{exercise.name}</span>
        {exercise.notes && (
          <span className="block text-tertiary leading-snug text-faint">{exercise.notes}</span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-secondary font-bold tabular-nums text-primary-ink">
          {half}
        </span>
        <span className="block text-caption text-faint">kcal / 30m</span>
      </span>
    </button>
  )
}

function Duration({
  exercise,
  weightKg,
  minutes,
  onMinutes,
  onBack,
  onConfirm,
}: {
  exercise: Exercise
  weightKg: number
  minutes: number
  onMinutes: (m: number) => void
  onBack: () => void
  onConfirm: (from?: Element | null) => void
}) {
  const kcal = burnFor(exercise.met, weightKg, minutes)
  // Counts rather than snaps, so changing the duration reads as a consequence.
  const shown = useCountUp(kcal)

  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="tap px-2 text-secondary font-semibold text-primary-ink"
        >
          Back
        </button>
        <p id="exercise-duration-title" className="text-secondary font-bold">
          How long?
        </p>
        {/* Balances the Back button so the title stays centred. */}
        <span className="w-12" aria-hidden />
      </div>

      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="text-secondary font-semibold">{exercise.name}</p>
        {exercise.notes && (
          <p className="mt-0.5 text-tertiary leading-snug text-faint">{exercise.notes}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              onClick={() => onMinutes(m)}
              className={`tap rounded-pill px-4 py-2 text-tertiary font-semibold transition ${
                minutes === m ? 'bg-primary text-on-primary' : 'bg-raised text-muted'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-tertiary text-muted">
          <span className="font-semibold">Or</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_MINUTES}
            value={minutes}
            onChange={(e) => onMinutes(clampMinutes(Number(e.target.value)))}
            aria-label="Minutes"
            className="w-24 rounded-inner border border-line bg-surface px-3 py-2 text-body tabular-nums outline-none focus:border-primary"
          />
          <span>minutes</span>
        </label>

        <div className="mt-4 rounded-inner bg-raised px-3 py-3 text-center">
          <p className="text-3xl font-extrabold tabular-nums text-primary-ink">
            {Math.round(shown)}
            <span className="ml-1 text-secondary font-semibold text-faint">kcal</span>
          </p>
          <p className="mt-1 text-caption leading-relaxed text-faint">
            Above what you burn sitting still, at {Math.round(weightKg)} kg. An estimate from
            population averages — individuals sit 20–30% either side of it.
          </p>
        </div>

        <PressButton
          full
          cue="log"
          hapticWeight="medium"
          onClick={(e) => onConfirm(e.currentTarget)}
          className="mt-4"
        >
          Log {minutes} min
        </PressButton>
      </div>
    </>
  )
}

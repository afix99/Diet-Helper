'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BadgeArt, Emoji, type EmojiName } from './Emoji'
import { PressButton } from './PressButton'
import { SegmentedControl } from './ui'
import { markGuideSeen, suggestedCalories } from '@/lib/onboarding'
import { bmr, tdee } from '@/lib/nutrition'
import { distributeTargets, energyBalance } from '@/lib/targets'
import { useData } from '@/lib/store/provider'
import type { ActivityLevel, Sex } from '@/lib/types'

const QUESTS = 6

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
]
const SEXES: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

/**
 * The first run: six cards that teach the app and configure it at the same time.
 *
 * A tour that only explains would leave someone on the workbook's own numbers —
 * 62 kg down to 55 kg at 1500 kcal — which are a stranger's. Since the targets
 * have to be right before any figure on the Today screen means anything, the
 * cards ask as they teach.
 *
 * Skip is on every card and never discards what has already been typed. Someone
 * who bails on card 3 keeps the weights they entered on card 2.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const { data, update } = useData()
  const [step, setStep] = useState(0)
  const panel = useRef<HTMLDivElement>(null)
  const headingId = useId()

  // Local until committed, so Back never loses a value and Skip can still save.
  const [startWeight, setStartWeight] = useState<number | null>(data.profile.startWeightKg)
  const [goalWeight, setGoalWeight] = useState<number | null>(data.profile.goalWeightKg)
  const [heightCm, setHeightCm] = useState<number | null>(data.profile.heightCm)
  const [age, setAge] = useState<number | null>(data.profile.age)
  const [sex, setSex] = useState<Sex>(data.profile.sex)
  const [activity, setActivity] = useState<ActivityLevel>(data.profile.activityLevel)
  const [kcal, setKcal] = useState<number | null>(data.targets.kcal)
  const [touchedKcal, setTouchedKcal] = useState(false)

  const profileDraft = useMemo(
    () => ({
      startWeightKg: startWeight ?? data.profile.startWeightKg,
      heightCm,
      age,
      sex,
      activityLevel: activity,
    }),
    [startWeight, heightCm, age, sex, activity, data.profile.startWeightKg]
  )

  const basal = heightCm && age ? bmr(profileDraft.startWeightKg, heightCm, age, sex) : null
  const maintenance = basal === null ? null : tdee(basal, activity)
  const suggestion = suggestedCalories(profileDraft)

  // Until they edit it themselves, the target tracks what their numbers imply.
  useEffect(() => {
    if (!touchedKcal && suggestion !== null) setKcal(suggestion)
  }, [suggestion, touchedKcal])

  const effectiveKcal = kcal ?? data.targets.kcal
  const preview = useMemo(
    () =>
      distributeTargets({
        kcal: effectiveKcal,
        goalWeightKg: goalWeight ?? data.profile.goalWeightKg,
        bodyWeightKg: startWeight ?? data.profile.startWeightKg,
        preset: data.targetPreset,
        locks: {},
        current: data.targets,
      }),
    [effectiveKcal, goalWeight, startWeight, data.targetPreset, data.targets, data.profile]
  )
  const verdict = energyBalance({ ...profileDraft }, effectiveKcal)

  /** Writes whatever has been entered so far. Runs on finish AND on skip. */
  const commit = () => {
    update((d) => {
      const profile = {
        ...d.profile,
        startWeightKg: startWeight ?? d.profile.startWeightKg,
        goalWeightKg: goalWeight ?? d.profile.goalWeightKg,
        heightCm,
        age,
        sex,
        activityLevel: activity,
      }
      const targets = distributeTargets({
        kcal: effectiveKcal,
        goalWeightKg: profile.goalWeightKg,
        bodyWeightKg: profile.startWeightKg,
        preset: d.targetPreset,
        locks: d.targetLocks,
        current: d.targets,
      })
      return { ...d, profile, targets }
    })
    markGuideSeen()
    onDone()
  }

  // Escape leaves, the same as Skip: an intro you cannot dismiss is a trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') commit()
      if (e.key !== 'Tab' || !panel.current) return
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const next = () => (step === QUESTS - 1 ? commit() : setStep((s) => s + 1))

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      ref={panel}
    >
      <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-tertiary font-semibold text-muted" aria-live="polite">
          Quest {step + 1} of {QUESTS}
        </p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-raised">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-500"
            style={{ width: `${((step + 1) / QUESTS) * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={commit}
          className="tap -mr-2 px-2 text-tertiary font-semibold text-primary-ink"
        >
          Skip
        </button>
      </header>

      <div key={step} className="animate-rise-in flex-1 overflow-y-auto px-5 pb-4">
        {step === 0 && (
          <Quest art="bowl" title="Welcome" id={headingId}>
            <p className="text-secondary text-muted">
              This started life as a spreadsheet. It now knows what nasi lemak costs you,
              what a ZUS latte costs you, and it works with no signal at all.
            </p>
            <p className="mt-3 text-secondary text-muted">
              The next four questions set up your numbers. It takes about two minutes, and
              you can skip out at any point — anything you have already typed is kept.
            </p>
          </Quest>
        )}

        {step === 1 && (
          <Quest art="scales" title="Where you're starting" id={headingId}>
            <p className="mb-4 text-secondary text-muted">
              Two numbers. Everything else in the app is built from them.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starting weight (kg)" value={startWeight} step={0.1} onChange={setStartWeight} />
              <Field label="Goal weight (kg)" value={goalWeight} step={0.1} onChange={setGoalWeight} />
            </div>
            <Aside>
              Weigh yourself every few days, not daily. The app plots a seven-day average
              precisely so one salty dinner doesn&rsquo;t look like failure.
            </Aside>
          </Quest>
        )}

        {step === 2 && (
          <Quest art="muscle" title="About you" id={headingId}>
            <p className="mb-4 text-secondary text-muted">
              These four turn your weight into an actual energy budget.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)" value={heightCm} onChange={setHeightCm} />
              <Field label="Age" value={age} onChange={setAge} />
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="mb-1.5 text-tertiary font-semibold text-muted">Sex</p>
                <SegmentedControl label="Sex" options={SEXES} value={sex} onChange={setSex} />
              </div>
              <div>
                <p className="mb-1.5 text-tertiary font-semibold text-muted">
                  How active are you day to day?
                </p>
                <SegmentedControl
                  label="Activity level"
                  options={ACTIVITY}
                  value={activity}
                  onChange={setActivity}
                />
              </div>
            </div>
            {maintenance === null ? (
              <Aside>Fill in height and age and your energy budget appears here.</Aside>
            ) : (
              <div className="mt-5 rounded-card border border-primary/30 bg-primary-container/60 p-4 text-center">
                <p className="text-tertiary font-semibold text-muted">You burn about</p>
                <p className="text-4xl font-extrabold tabular-nums text-primary-ink">
                  {maintenance}
                  <span className="ml-1 text-body font-semibold text-muted">kcal/day</span>
                </p>
                <p className="mt-1 text-tertiary text-faint">
                  {basal} at rest, times your activity level
                </p>
              </div>
            )}
          </Quest>
        )}

        {step === 3 && (
          <Quest art="target" title="Your daily target" id={headingId}>
            <p className="mb-4 text-secondary text-muted">
              {suggestion === null
                ? 'Set a daily calorie goal. Protein, carbs and fat follow it automatically.'
                : 'Suggested from your own numbers. Change it and the macros follow.'}
            </p>
            <Field
              label="Calories per day"
              value={kcal}
              step={50}
              onChange={(v) => {
                setTouchedKcal(true)
                setKcal(v)
              }}
            />
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                ['Protein', preview.protein],
                ['Carbs', preview.carbs],
                ['Fat', preview.fat],
                ['Fibre', preview.fibre],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-card bg-raised p-2">
                  <p className="text-body font-extrabold tabular-nums">{value as number}g</p>
                  <p className="text-caption text-faint">{label as string}</p>
                </div>
              ))}
            </div>
            {verdict.balance === 'surplus' && (
              <Aside tone="warn">
                That is about {verdict.diff} kcal above what you burn, so this would add
                weight rather than lose it.
              </Aside>
            )}
            {verdict.balance === 'deficit' && verdict.diff !== null && verdict.diff < -750 && (
              <Aside tone="warn">
                That is a steep deficit. Faster loss costs muscle and is harder to hold —
                300–500 below maintenance is the usual advice.
              </Aside>
            )}
            <Aside>
              A planning tool, not medical advice. The full disclaimer is in Settings.
            </Aside>
          </Quest>
        )}

        {step === 4 && (
          <Quest art="search" title="Logging a meal" id={headingId}>
            <p className="text-secondary text-muted">There are two ways in, both on Today.</p>
            <ol className="mt-4 stack gap-3">
              <Way n="1" title="+ Add food">
                Search all 147 foods. Your recents and favourites sit at the top, because
                most logging is repeat logging.
              </Way>
              <Way n="2" title="Describe a whole meal">
                Type it in plain English — <em>&ldquo;nasi lemak with an extra egg and a
                kopi tarik&rdquo;</em> — and it logs all of it. Nothing is written until
                you confirm.
              </Way>
            </ol>
            <Aside>
              Missing a food is not a dead end: search for it and the app offers to create
              it from what you typed.
            </Aside>
          </Quest>
        )}

        {step === 5 && (
          <div className="pt-6 text-center">
            <BadgeArt id="first_step" unlocked size={104} className="mx-auto animate-badge-pop" />
            <h2 id={headingId} className="mt-4 text-2xl font-extrabold">
              You&rsquo;re set up
            </h2>
            <p className="mx-auto mt-2 max-w-[30ch] text-secondary text-muted">
              Nine badges are waiting. This is the first one, and it asks for the smallest
              possible thing.
            </p>
            <div className="mx-auto mt-5 max-w-xs rounded-card border border-primary/30 bg-primary-container/60 p-4">
              <p className="font-extrabold text-primary-ink">First Step</p>
              <p className="mt-0.5 text-secondary text-muted">Log any single day</p>
            </div>
            <p className="mx-auto mt-5 max-w-[32ch] text-tertiary text-faint">
              Streaks forgive one missed day a week. A system that punishes one bad Tuesday
              is a system you quit.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <PressButton full hapticWeight={step === QUESTS - 1 ? 'success' : 'light'} onClick={next}>
          {step === QUESTS - 1 ? 'Start logging' : 'Next'}
        </PressButton>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="tap mt-1 w-full text-tertiary font-semibold text-muted"
          >
            Back
          </button>
        )}
      </div>
    </div>
  )
}

function Quest({
  art,
  title,
  id,
  children,
}: {
  art: EmojiName
  title: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="pt-4">
      <Emoji name={art} size={64} className="mx-auto block" />
      <h2 id={id} className="mt-3 text-center text-2xl font-extrabold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Way({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-card bg-raised p-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-primary text-caption font-bold text-on-primary">
        {n}
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="block text-tertiary text-muted">{children}</span>
      </span>
    </li>
  )
}

function Aside({ children, tone = 'quiet' }: { children: React.ReactNode; tone?: 'quiet' | 'warn' }) {
  return (
    <p
      className={`mt-4 rounded-card border-l-[3px] p-3 text-tertiary leading-relaxed ${
        tone === 'warn' ? 'border-amber bg-amber/10 text-secondary' : 'border-line bg-raised text-muted'
      }`}
    >
      {children}
    </p>
  )
}

function Field({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string
  value: number | null
  step?: number
  onChange: (v: number | null) => void
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-tertiary font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="mt-1 w-full rounded-input border border-line bg-surface px-3 py-2.5 text-body font-semibold tabular-nums"
      />
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePresence } from '@/hooks/usePresence'
import { FoodPicker } from '@/components/FoodPicker'
import { PressButton } from '@/components/PressButton'
import { BadgeArt, Emoji } from '@/components/Emoji'
import { Icon } from '@/components/icons'
import { QuickAdd } from '@/components/QuickAdd'
import { MealSlotCard } from '@/components/MealSlotCard'
import { MacroFateSheet } from '@/components/MacroFateSheet'
import { ExerciseCard } from '@/components/ExerciseCard'
import { PetCard } from '@/components/PetCard'
import { UnderEatingCard } from '@/components/UnderEatingCard'
import { WaterCard } from '@/components/WaterCard'
import { BudgetRing, Card, MacroBar, PageHeader, StatusPill } from '@/components/ui'
import { statusBand } from '@/lib/nutrition'
import { sound } from '@/lib/sound'
import { burstAt } from '@/components/BurstLayer'
import { targetRisk } from '@/lib/targets'
import { PET_ENABLED } from '@/lib/pet'
import type { MacroKey } from '@/lib/macroFate'
import {
  badgesFor,
  burnedOn,
  dayRecords,
  dayTotals,
  entriesBySlot,
  latestWeight,
  streakFor,
} from '@/lib/selectors'
import { addDays, formatDay, slotForNow } from '@/lib/dates'
import { useLogging } from '@/lib/logging'
import { dismissalFor, targetWarningVisible, underEating } from '@/lib/underEating'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from '@/lib/types'

export default function TodayPage() {
  const { data, ready } = useData()
  const { callPetOut, dismissUnderEating } = useLogging()
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [quickAdding, setQuickAdding] = useState<MealSlot | null>(null)
  const [explaining, setExplaining] = useState<MacroKey | null>(null)
  /* One meal open at a time. Six expanded cards was a wall in front of the one
     thing anyone opens this screen to do. */
  const [openSlot, setOpenSlot] = useState<MealSlot>(() => slotForNow())
  const [showMacros, setShowMacros] = useState(false)
  const [heldPicking, pickingLeaving] = usePresence(picking)
  const [heldQuickAdding, quickAddLeaving] = usePresence(quickAdding)
  const [heldExplaining, explainLeaving] = usePresence(explaining)
  const date = todayIso()

  const totals = useMemo(() => dayTotals(data, date), [data, date])
  // One pass over the diary for all six cards, rather than one pass each.
  const bySlot = useMemo(() => entriesBySlot(data, date), [data, date])

  /*
   * The ring measures against the target you set, whatever it is. An earlier
   * version silently swapped in a 1,200 kcal floor, which replaced your number
   * with someone else's. If the target is worth a second look the reminder
   * below says so, in your own figures.
   */
  const risk = useMemo(
    () => targetRisk(data.profile, data.targets.kcal, latestWeight(data)),
    [data]
  )

  /*
   * The same check the card below runs, needed here only so that closing the
   * small reminder records *what* was closed rather than a bare flag. Cheap:
   * dayRecords buckets the log in one pass precisely because this reads a
   * fortnight of it on every render.
   */
  const underEatingCheck = useMemo(() => {
    const dates = Array.from({ length: 14 }, (_, i) => addDays(date, i - 13))
    return underEating(dayRecords(data, dates), data.profile, date, latestWeight(data))
  }, [data, date])

  /*
   * Exercise raises the allowance rather than subtracting from what you ate.
   * Both directions produce the same remaining number, but only this one says
   * the true thing: after training you need *more* food, not less credit for
   * the food you already had. The sub-line under the ratio keeps the two parts
   * separate so the raise is never mistaken for a moved goalpost — and the band
   * is computed from the same figure, so the pill cannot contradict the ring.
   */
  const burned = useMemo(() => burnedOn(data, date), [data, date])
  const allowance = data.targets.kcal + burned
  const band = statusBand(totals.kcal, allowance)
  /*
   * A target being reached is the one moment on this screen worth marking, so
   * it gets a glow and a cue. Once each, per target, per day: the whole value
   * of a small celebration is that it does not keep happening.
   */
  const hit = useMemo(() => {
    const t = data.targets
    return [
      totals.protein >= t.protein,
      totals.fibre >= t.fibre,
      ready && totals.kcal > 0 && band === 'on_target',
    ].filter(Boolean).length
  }, [totals, data.targets, band, ready])
  const [glow, setGlow] = useState(0)
  const lastHit = useRef<number | null>(null)
  useEffect(() => {
    if (lastHit.current === null) {
      // First render of the day's data is not an achievement, it is a load.
      lastHit.current = hit
      return
    }
    if (hit > lastHit.current) {
      setGlow((n) => n + 1)
      sound('goal')
      // From the ring, and bigger than a food landing: a target is the one
      // thing on this screen worth a real flourish.
      const ring = document.querySelector('[data-ring-value]')
      if (ring) {
        const r = ring.getBoundingClientRect()
        burstAt({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          food: null,
          seed: `target-${hit}`,
          scale: 1.5,
        })
      }
    }
    lastHit.current = hit
  }, [hit])

  const run = useMemo(() => streakFor(data, date), [data, date])
  const unlocked = useMemo(
    () => badgesFor(data, date, run.best).filter((b) => b.unlocked),
    [data, date, run.best]
  )

  if (!ready) {
    return <p className="py-20 text-center text-secondary text-faint">Loading…</p>
  }

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatDay(date, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        action={
          run.current > 0 ? (
            /*
             * When the cat is at home the pill is how you call it back: the
             * glyph becomes a curled cat and the whole thing becomes a button.
             * It costs no vertical space and puts the cat where the streak
             * already lives. `/more` carries the same action permanently,
             * because this pill disappears at a zero streak and the cat must
             * never be strandable.
             */
            !PET_ENABLED || data.pet.out ? (
              <span className="pill bg-primary/15 text-primary-ink" title="Streak">
                <Emoji name="flame" size={14} className="animate-breathe" />
                {run.current}-day streak
              </span>
            ) : (
              <button
                type="button"
                data-call-pet
                onClick={() => callPetOut()}
                aria-label={`Call ${data.pet.name} back out`}
                className="pill bg-primary/15 text-primary-ink"
              >
                <Icon name="cat" size={14} strokeWidth={1.9} />
                {run.current}-day streak
              </button>
            )
          ) : null
        }
      />

      <Card className="mb-4">
        <div className="relative">
          {glow > 0 && (
            /*
              Centred by the grid, not by a transform.
              `-translate-x-1/2 -translate-y-1/2` used to do this job, and
              `badge-glow` animates `transform` — so the moment the animation
              started it overwrote the centring, and the glow slid half its own
              width to the right, off the screen edge and out past the document.
              A grid parent centres it with no transform of its own, leaving the
              whole transform channel to the animation.
            */
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 grid place-items-center"
            >
              <span
                key={glow}
                className="h-40 w-40 animate-badge-glow rounded-full bg-avocado/40"
              />
            </span>
          )}
          <BudgetRing
            consumed={totals.kcal}
            target={allowance}
            band={band}
            note={
              burned > 0
                ? `${data.targets.kcal.toLocaleString('en-GB')} target + ${burned.toLocaleString('en-GB')} exercise`
                : undefined
            }
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <StatusPill band={band} />
          {/* No background: the 44px tap minimum would otherwise make this
              pill visibly taller than the status pill beside it. */}
          <Link
            href="/more/settings"
            className="tap inline-flex items-center px-2 text-tertiary font-semibold text-primary-ink underline decoration-primary-ink/30 underline-offset-4"
          >
            Edit target
          </Link>
        </div>
        {/* Closeable, and it shares the big card's dismissal — see
            targetWarningVisible. Two lines about the same subject, one of them
            un-silenceable, is how a reminder turns into nagging. */}
        {targetWarningVisible(
          risk.belowResting,
          data.dismissals.underEating,
          data.targets.kcal
        ) &&
          risk.restingKcal !== null && (
            <div className="mt-3 flex items-center gap-1 rounded-inner bg-amber/10 pr-1 text-caption leading-snug text-amber">
              <Link href="/more/settings" className="tap flex flex-1 items-center gap-2 px-3 py-2 text-left">
                <span className="flex-1">
                  A reminder, not a rule: {data.targets.kcal.toLocaleString('en-GB')} kcal is
                  under the {risk.restingKcal.toLocaleString('en-GB')} your body burns at rest.
                </span>
                <Icon name="chevron" size={13} strokeWidth={2.5} className="shrink-0" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  dismissUnderEating(dismissalFor(underEatingCheck, data.targets.kcal, date))
                }
                aria-label="Close this reminder"
                className="tap shrink-0 rounded-pill p-1.5 text-amber/70"
              >
                <Icon name="close" size={14} strokeWidth={2.2} />
              </button>
            </div>
          )}

        <button
          type="button"
          onClick={() => setShowMacros((v) => !v)}
          aria-expanded={showMacros}
          data-macro-toggle
          className="tap mt-4 flex w-full items-center justify-center gap-2 text-tertiary tabular-nums text-muted"
        >
          <span>
            <b className="font-semibold">P</b> {Math.round(totals.protein)}
            <span className="mx-1 text-faint">·</span>
            <b className="font-semibold">C</b> {Math.round(totals.carbs)}
            <span className="mx-1 text-faint">·</span>
            <b className="font-semibold">F</b> {Math.round(totals.fat)}
            <span className="mx-1 text-faint">·</span>
            <b className="font-semibold">Fibre</b> {Math.round(totals.fibre)}
          </span>
          <Icon
            name="chevron"
            size={13}
            strokeWidth={2.5}
            className={`text-faint transition-transform ${showMacros ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>

        {showMacros && (
        <div className="mt-4 stack gap-3">
          <MacroBar
            label="Protein"
            value={totals.protein}
            target={data.targets.protein}
            tone="primary"
            onExplain={() => setExplaining('protein')}
          />
          <MacroBar
            label="Carbs"
            value={totals.carbs}
            target={data.targets.carbs}
            tone="amber"
            onExplain={() => setExplaining('carbs')}
          />
          <MacroBar
            label="Fat"
            value={totals.fat}
            target={data.targets.fat}
            tone="ocean"
            onExplain={() => setExplaining('fat')}
          />
          <MacroBar
            label="Fibre"
            value={totals.fibre}
            target={data.targets.fibre}
            tone="avocado"
            onExplain={() => setExplaining('fibre')}
          />
        </div>
        )}
      </Card>

      {PET_ENABLED && data.pet.out && <PetCard date={date} />}

      {unlocked.length > 0 && (
        <Link href="/more/badges" className="mb-4 block">
          <Card className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden>
              {unlocked.slice(0, 5).map((b) => (
                <BadgeArt key={b.id} id={b.id} unlocked size={30} />
              ))}
            </div>
            <p className="flex-1 text-secondary font-semibold">
              {unlocked.length} {unlocked.length === 1 ? 'badge' : 'badges'}
              <span className="ml-1 font-normal text-faint">unlocked</span>
            </p>
            <Icon name="chevron" size={16} strokeWidth={2.25} className="text-faint" />
          </Card>
        </Link>
      )}

      <UnderEatingCard date={date} />

      <WaterCard date={date} />

      <ExerciseCard date={date} />

      {/* Buried inside the picker, nobody found this. It is the fastest way to
          log, so it belongs on the front screen. */}
      <PressButton
        full
        hapticWeight="medium"
        onClick={() => setQuickAdding(openSlot)}
        className="mb-3 !rounded-card"
      >
        <Icon name="pencil" size={18} strokeWidth={2} />
        Describe a whole meal
      </PressButton>

      <div className="stack gap-3">
        {MEAL_SLOTS.map((slot) => (
          <MealSlotCard
            key={slot}
            date={date}
            slot={slot}
            entries={bySlot[slot]}
            open={openSlot === slot}
            onToggle={() => setOpenSlot(slot)}
            onOpenPicker={() => setPicking(slot)}
          />
        ))}
      </div>

      {heldPicking && (
        <FoodPicker
          date={date}
          slot={heldPicking}
          leaving={pickingLeaving}
          onClose={() => setPicking(null)}
        />
      )}
      {heldExplaining && (
        <MacroFateSheet
          date={date}
          macro={heldExplaining}
          leaving={explainLeaving}
          onClose={() => setExplaining(null)}
        />
      )}
      {heldQuickAdding && (
        <QuickAdd
          date={date}
          slot={heldQuickAdding}
          leaving={quickAddLeaving}
          onClose={() => setQuickAdding(null)}
        />
      )}
    </>
  )
}

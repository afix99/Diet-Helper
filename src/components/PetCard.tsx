'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from './ui'
import { Icon } from './icons'
import { PetCat, type PetCatHandle } from './PetCat'
import { PetSheet } from './PetSheet'
import { burstAt } from './BurstLayer'
import { usePresence } from '@/hooks/usePresence'
import { flourishesOn } from '@/lib/motion'
import { hush, sound } from '@/lib/sound'
import { nextStage, poseFor, stageFor, statusLine } from '@/lib/pet'
import { freshUnlocks, unlockedIds, wornPieces } from '@/lib/petWardrobe'
import {
  VOICE_FOR,
  nextAmbientDelay,
  pickAmbient,
  pickReaction,
  play,
  stop,
  type AmbientId,
  type ReactionId,
  type Rig,
} from '@/lib/petMotion'
import { useLogging } from '@/lib/logging'
import { badgesFor, entriesFor, streakFor } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'

/**
 * The streak, with a body.
 *
 * Three moments are animated, and each is driven by a change in the data rather
 * than by a tap, because the point of a pet is that it reacts to your day:
 *
 * - **wake** — the first thing logged today. The cat was curled; now it is not.
 * - **grow** — a new stage reached. Fires once ever, guarded by `seenStage` in
 *   the store, because a celebration that replays on every visit is a
 *   notification rather than a reward. (The badges screen still has that bug;
 *   this deliberately does not copy it.)
 * - **greet** — called back out of its house.
 *
 * Underneath all three, `idle` runs forever with `composite: 'add'`, so the cat
 * keeps breathing and blinking *through* a leap instead of freezing for it.
 *
 * Two more layers make it an animal rather than a diagram:
 *
 * - **ambients** fire on a random 2.6–7.2s gap — a blink, a yawn, a look
 *   across the room, a wash. Unrequested and unpredictable, which is the
 *   difference between something alive and something looping.
 * - **reactions** fire when you touch it, picked at random from fifteen with
 *   no immediate repeat.
 *
 * Because the cat is now the toy, it no longer opens the sheet: the name and
 * streak beside it do that instead. A tap that both played an animation and
 * covered it with a sheet would have shown you neither.
 */
export function PetCard({ date }: { date: string }) {
  const { data } = useData()
  const { markPetStageSeen, sendPetHome } = useLogging()
  const cat = useRef<PetCatHandle>(null)
  const glow = useRef<HTMLSpanElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [heldOpen, openLeaving] = usePresence(open || null)

  const run = useMemo(() => streakFor(data, date), [data, date])
  const loggedToday = useMemo(() => entriesFor(data, date).length > 0, [data, date])
  const stage = stageFor(run.best)
  const pose = poseFor(loggedToday)
  const upcoming = nextStage(run.best)

  const badges = useMemo(() => badgesFor(data, date, run.best), [data, date, run.best])
  const unlocked = useMemo(() => unlockedIds(badges, stage.index), [badges, stage.index])
  const worn = useMemo(() => wornPieces(data.pet, unlocked), [data.pet, unlocked])
  const fresh = freshUnlocks(data.pet, unlocked).length

  /** The rig, plus the two parts that live in the card rather than in the cat. */
  const rigOf = (): Rig => ({ ...(cat.current?.rig() ?? {}), glow: glow.current, count: count.current })

  /* Idle runs for the life of the card. Restarted when the pose changes,
     because the curled and sitting rigs are different shapes. */
  useEffect(() => {
    if (!flourishesOn()) return
    const anims = play(rigOf(), 'idle')
    return () => stop(anims)
  }, [pose, stage.index])

  /* Wake: the first food of the day. Skipped on the initial mount, since a
     page load is not an event. */
  const wokeFor = useRef<string | null>(null)
  useEffect(() => {
    if (wokeFor.current === null) {
      wokeFor.current = loggedToday ? date : ''
      return
    }
    if (loggedToday && wokeFor.current !== date) {
      wokeFor.current = date
      play(rigOf(), 'wake')
      /*
       * No cue here on purpose. Waking is *caused* by logging, and the log tap
       * already sounds; adding a second tone to the same action made one tap
       * play three overlapping cues. The `pet` cue is kept for greet, which is
       * an action of its own with nothing else attached to it.
       */
    }
    if (!loggedToday) wokeFor.current = ''
  }, [loggedToday, date])

  /* Grow: once per stage, ever. */
  const celebrated = useRef(false)
  useEffect(() => {
    if (celebrated.current) return
    if (stage.index <= data.pet.seenStage) return
    celebrated.current = true
    markPetStageSeen(stage.index)
    if (!flourishesOn()) return
    play(rigOf(), 'grow')
    sound('goal')
    /*
     * Confetti at the moment of landing — thrown from just above the cat's
     * head rather than from its centre. `burstFrom` uses the element's middle,
     * which put every particle across the face; the eyes and whiskers are the
     * thing you are meant to be looking at.
     */
    window.setTimeout(() => {
      const r = shell.current?.getBoundingClientRect()
      if (!r) return
      burstAt({
        x: r.left + r.width / 2,
        y: r.top + 6,
        food: null,
        seed: `pet-${stage.index}`,
        scale: 0.85,
        kind: 'pet',
      })
    }, 440)
  }, [stage.index, data.pet.seenStage, markPetStageSeen])

  /*
   * Ambients: the layer that makes it read as awake.
   *
   * A self-rescheduling timeout rather than an interval, so each gap is its own
   * random length — an interval would put the cat on a metronome, and anything
   * you can predict stops looking alive.
   *
   * It stands down whenever the cat is not actually being watched: with the tab
   * hidden, with the sheet covering it, or while a reaction is mid-flight.
   * A timer firing animations into a background tab is battery spent on
   * something nobody can see.
   */
  const lastAmbient = useRef<AmbientId | null>(null)
  const reactingUntil = useRef(0)
  useEffect(() => {
    if (!flourishesOn()) return
    let timer = 0
    const tick = () => {
      const idleEnough = Date.now() >= reactingUntil.current
      if (idleEnough && !open && document.visibilityState === 'visible') {
        const next = pickAmbient(lastAmbient.current)
        lastAmbient.current = next
        play(rigOf(), next)
      }
      timer = window.setTimeout(tick, nextAmbientDelay())
    }
    timer = window.setTimeout(tick, nextAmbientDelay())
    return () => window.clearTimeout(timer)
  }, [open, pose, stage.index])

  /*
   * Reactions: one random animation per touch.
   *
   * The previous reaction is cancelled first. Tapping quickly used to stack
   * animations on the same parts, and the sum of three overlapping pounces is
   * not three pounces — it is a cat that flies off the card.
   */
  const lastReaction = useRef<ReactionId | null>(null)
  const reaction = useRef<Animation[]>([])
  const voice = useRef<OscillatorNode[]>([])
  const poke = () => {
    if (!flourishesOn()) return
    stop(reaction.current)
    // The sound is cut for the same reason the animation is: ten purrs stacked
    // on top of each other stop being a purr and become a drone.
    hush(voice.current)
    const next = pickReaction(lastReaction.current)
    lastReaction.current = next
    reaction.current = play(rigOf(), next)
    const [cue, steps] = VOICE_FOR[next]
    voice.current = sound(cue, steps)
    // Long enough that an ambient cannot interrupt the reaction it overlaps.
    reactingUntil.current = Date.now() + 1300
  }
  useEffect(
    () => () => {
      stop(reaction.current)
      hush(voice.current)
    },
    []
  )

  /* Greet: arriving from the house. `out` flipping true is the trigger. */
  const wasOut = useRef(data.pet.out)
  useEffect(() => {
    if (data.pet.out && !wasOut.current) {
      play(rigOf(), 'greet')
      sound('pet')
    }
    wasOut.current = data.pet.out
  }, [data.pet.out])

  const goHome = () => {
    const anims = play(rigOf(), 'tuck', { onDone: () => sendPetHome() })
    if (anims.length === 0) sendPetHome()
    sound('undo')
  }

  return (
    <>
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          {/* The cat is the toy: tapping it plays, it does not navigate. */}
          <button
            type="button"
            onClick={poke}
            aria-label={`Play with ${data.pet.name}`}
            data-pet
            data-poke
            className="tap relative shrink-0"
          >
            {/*
              The celebration glow. Base art is 96px and the timeline peaks at
              1.9x = 182px, which still fits inside the card at a 320px
              viewport — a decoration that escaped its container cost this app
              two sessions, so the number is checked in petMotion.test.ts.
            */}
            <span
              ref={glow}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-avocado/45"
              style={{ opacity: 0 }}
            />
            <span ref={shell} className="block">
              <PetCat ref={cat} stage={stage} pose={pose} size={92} worn={worn} />
            </span>
            {/* One dot for "there is something new in the wardrobe". A count
                would turn a wardrobe into an inbox. */}
            {fresh > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface"
              />
            )}
          </button>

          {/* ...and the name beside it is the way in. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-pet-open
            aria-label={
              fresh > 0
                ? `${data.pet.name}, ${stage.name}. Open details — new in the wardrobe`
                : `${data.pet.name}, ${stage.name}. Open details`
            }
            className="tap min-w-0 flex-1 text-left"
          >
            <p className="truncate text-secondary font-bold">
              {data.pet.name}
              <span className="ml-1.5 font-normal text-faint">{stage.name}</span>
            </p>
            <p className="text-tertiary text-muted">
              <span ref={count} className="inline-block font-bold tabular-nums text-primary-ink">
                {run.current}
              </span>
              <span className="ml-1">{run.current === 1 ? 'day' : 'days'}</span>
              <span className="mx-1.5 text-faint">·</span>
              {statusLine(pose, run.current)}
            </p>
            {upcoming && (
              <p className="mt-0.5 text-caption text-faint">
                {upcoming.daysAway} more {upcoming.daysAway === 1 ? 'day' : 'days'} to{' '}
                {upcoming.stage.name}
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={goHome}
            aria-label={`Send ${data.pet.name} home`}
            className="tap shrink-0 self-start rounded-pill p-1.5 text-faint"
          >
            <Icon name="house" size={17} strokeWidth={1.9} />
          </button>
        </div>
      </Card>

      {heldOpen && (
        <PetSheet
          date={date}
          leaving={openLeaving}
          onClose={() => setOpen(false)}
          onSendHome={() => {
            setOpen(false)
            goHome()
          }}
        />
      )}
    </>
  )
}

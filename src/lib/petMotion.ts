/**
 * The cat's motion, as data.
 *
 * A CSS class that scales something is a transition. Character animation is
 * several tracks running at *different offsets* on *different parts*, where the
 * secondary parts lag the primary one. That lag is the entire trick: a tail
 * that whips 120ms after the body lands reads as a live animal, and a tail that
 * moves with the body reads as a sticker being scaled. Every `delay` below is
 * doing that job, and the tests assert the lag ordering because it is the one
 * property that, if it drifted to zero, would leave the thing technically
 * animating and visibly dead.
 *
 * Why this lives in TypeScript rather than in tailwind.config.ts:
 *
 * - CSS cannot express per-part offsets without one class per part per state.
 * - CSS cannot compose. A keyframe that animates `transform` *replaces* the
 *   whole transform, which is precisely how `badge-glow` overwrote a centring
 *   translate and shoved the layout off-screen twice. WAAPI's
 *   `composite: 'add'` concatenates instead, so an idle breath keeps running
 *   underneath a leap rather than fighting it.
 * - Timelines as plain objects can be unit-tested. Keyframes in a CSS file
 *   cannot.
 *
 * Every track ends on `transform: 'none'` — identity — so the rig can never be
 * left deformed after an animation finishes. The single exception is `tuck`,
 * whose whole point is to end off-stage, and which is named in the test's
 * allowlist so that it reads as a decision rather than an oversight.
 */
import { prefersReducedMotion } from './motion'

export type RigPart =
  | 'root'
  /**
   * The hips. Carries vertical travel for the whole animal.
   *
   * Body and head are siblings in the drawing, so animating travel on each of
   * them independently made them drift apart — the head visibly detached and
   * floated above the body during the leap. Travel belongs to one node that
   * both hang from; the body then only squashes, and the head only lags. The
   * shadow deliberately sits *outside* this, so the cat can leave the ground
   * while its shadow stays on it.
   */
  | 'hop'
  | 'body'
  | 'head'
  | 'earL'
  | 'earR'
  | 'eyeL'
  | 'eyeR'
  | 'whiskers'
  /**
   * The head-slot accessory, hung off the head with its own lag.
   *
   * A hat that moved in perfect lockstep with the skull reads as painted on. A
   * beat of delay and a small overshoot give it weight, which is the whole
   * point of hanging it on a joint instead of drawing it into the head.
   */
  | 'hat'
  | 'tailBase'
  | 'tailTip'
  | 'shadow'
  | 'glow'
  | 'count'

export const RIG_PARTS: readonly RigPart[] = [
  'root',
  'hop',
  'body',
  'head',
  'earL',
  'earR',
  'eyeL',
  'eyeR',
  'whiskers',
  'hat',
  'tailBase',
  'tailTip',
  'shadow',
  'glow',
  'count',
]

export type TimelineId = 'idle' | 'wake' | 'grow' | 'greet' | 'tuck'

export interface Track {
  part: RigPart
  /** Milliseconds after the timeline starts. This is where the life comes from. */
  delay: number
  duration: number
  frames: Keyframe[]
  easing: string
  /** Infinity for the idle loops. */
  iterations?: number
  /**
   * 'add' concatenates onto whatever is already running, so idle keeps
   * breathing under a one-shot. 'replace' where a track owns an absolute
   * property outright, such as the shadow's opacity.
   */
  composite?: CompositeOperation
}

export interface Timeline {
  id: TimelineId
  /** Longest delay + duration across the tracks. */
  duration: number
  tracks: readonly Track[]
}

/** Identity. Every track's last frame, so nothing is left deformed. */
const REST: Keyframe = { transform: 'none' }

/* Easings, named for what they are doing rather than for their numbers. */
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const OVERSHOOT = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const ACCELERATE = 'cubic-bezier(0.5, 0, 0.75, 0)'
const BREATH = 'cubic-bezier(0.45, 0, 0.55, 1)'

/*
 * Idle: four loops on deliberately non-harmonic periods. If these shared a
 * common factor the cat would visibly resync every few seconds and read as a
 * machine; at 3.2 / 6.1 / 4.3 / 9.7 seconds the combination does not repeat for
 * over two hours.
 */
const idle: Timeline = {
  id: 'idle',
  duration: 9700,
  tracks: [
    {
      part: 'body',
      delay: 0,
      duration: 3200,
      easing: BREATH,
      iterations: Infinity,
      frames: [REST, { transform: 'scale(0.992, 1.035)' }, REST],
    },
    {
      part: 'eyeL',
      delay: 0,
      duration: 6100,
      easing: 'ease-in-out',
      iterations: Infinity,
      // Open for 92% of the cycle; a blink you can see is a blink that annoys.
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'none', offset: 0.92 },
        { transform: 'scaleY(0.06)', offset: 0.955 },
        { transform: 'none', offset: 0.99 },
        REST,
      ],
    },
    {
      part: 'eyeR',
      delay: 40,
      duration: 6100,
      easing: 'ease-in-out',
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'none', offset: 0.92 },
        { transform: 'scaleY(0.06)', offset: 0.955 },
        { transform: 'none', offset: 0.99 },
        REST,
      ],
    },
    {
      part: 'tailBase',
      delay: 0,
      duration: 4300,
      easing: BREATH,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(5deg)', offset: 0.25 },
        { transform: 'none', offset: 0.5 },
        { transform: 'rotate(-4deg)', offset: 0.75 },
        REST,
      ],
    },
    {
      // The tip trails the base — the same lag rule as everywhere else, applied
      // to a loop rather than to a hit.
      part: 'tailTip',
      delay: 260,
      duration: 4300,
      easing: BREATH,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(8deg)', offset: 0.25 },
        { transform: 'none', offset: 0.5 },
        { transform: 'rotate(-7deg)', offset: 0.75 },
        REST,
      ],
    },
    {
      part: 'earR',
      delay: 0,
      duration: 9700,
      easing: OVERSHOOT,
      iterations: Infinity,
      // Still for most of ten seconds, then one twitch. Constant motion is
      // noise; a rare twitch is a living thing.
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'none', offset: 0.86 },
        { transform: 'rotate(-11deg)', offset: 0.9 },
        { transform: 'rotate(4deg)', offset: 0.94 },
        { transform: 'none', offset: 0.98 },
        REST,
      ],
    },
  ],
}

/*
 * Wake: curled to sitting, on the first thing logged today. The eyes opening
 * are the beat that sells it, and they are late on purpose — the body moves
 * first, the animal notices second.
 */
const wake: Timeline = {
  id: 'wake',
  duration: 800,
  tracks: [
    {
      part: 'hop',
      delay: 0,
      duration: 620,
      easing: OVERSHOOT,
      frames: [
        { transform: 'translateY(7px)', offset: 0 },
        { transform: 'translateY(-7px)', offset: 0.42 },
        { transform: 'translateY(1px)', offset: 0.72 },
        REST,
      ],
    },
    {
      part: 'body',
      delay: 0,
      duration: 620,
      easing: OVERSHOOT,
      frames: [
        { transform: 'scale(1.07, 0.9)', offset: 0 },
        { transform: 'scale(0.96, 1.07)', offset: 0.42 },
        { transform: 'scale(1.02, 0.98)', offset: 0.72 },
        REST,
      ],
    },
    {
      part: 'head',
      delay: 60,
      duration: 560,
      easing: OVERSHOOT,
      frames: [
        { transform: 'translateY(4px) rotate(7deg)', offset: 0 },
        { transform: 'translateY(-2px) rotate(-3deg)', offset: 0.5 },
        REST,
      ],
    },
    {
      part: 'eyeL',
      delay: 150,
      duration: 300,
      easing: SETTLE,
      frames: [{ transform: 'scaleY(0.08)', offset: 0 }, REST],
    },
    {
      part: 'eyeR',
      delay: 190,
      duration: 300,
      easing: SETTLE,
      frames: [{ transform: 'scaleY(0.08)', offset: 0 }, REST],
    },
    {
      part: 'earL',
      delay: 140,
      duration: 480,
      easing: OVERSHOOT,
      frames: [
        { transform: 'rotate(-18deg)', offset: 0 },
        { transform: 'rotate(7deg)', offset: 0.55 },
        REST,
      ],
    },
    {
      part: 'earR',
      delay: 170,
      duration: 480,
      easing: OVERSHOOT,
      frames: [
        { transform: 'rotate(18deg)', offset: 0 },
        { transform: 'rotate(-7deg)', offset: 0.55 },
        REST,
      ],
    },
    {
      // A beat behind the head, and it keeps rocking after the head has stopped.
      part: 'hat',
      delay: 130,
      duration: 620,
      easing: OVERSHOOT,
      frames: [
        { transform: 'rotate(9deg) translateY(2px)', offset: 0 },
        { transform: 'rotate(-5deg) translateY(-1px)', offset: 0.48 },
        { transform: 'rotate(2deg)', offset: 0.76 },
        REST,
      ],
    },
    {
      part: 'tailBase',
      delay: 180,
      duration: 520,
      easing: OVERSHOOT,
      frames: [
        { transform: 'rotate(-26deg)', offset: 0 },
        { transform: 'rotate(9deg)', offset: 0.55 },
        REST,
      ],
    },
    {
      part: 'tailTip',
      delay: 270,
      duration: 520,
      easing: OVERSHOOT,
      frames: [
        { transform: 'rotate(-32deg)', offset: 0 },
        { transform: 'rotate(12deg)', offset: 0.55 },
        REST,
      ],
    },
  ],
}

/*
 * Grow — the one big moment, when a streak reaches a new stage.
 *
 * The beat sheet, and the reason for each:
 *   0-180    crouch. Anticipation. Nothing reads as a jump without it.
 *   180-320  leap, stretching along the direction of travel.
 *   320-460  fall and land, squashing on impact.
 *   460-1300 two decaying bounces, because one bounce reads as a bug.
 *   +60..320 head, ears, tail and whiskers each arrive late, in that order.
 *   180-1080 the glow flashes and fades behind.
 *   700-1320 the streak number slams in from 2.4x with a blur.
 *
 * The shadow is the cheapest trick here and the most effective: it scales
 * *inversely* to the cat's height and snaps wide on impact. Without it a leap
 * is a thing moving up and down; with it, the thing has weight.
 */
const grow: Timeline = {
  id: 'grow',
  duration: 1800,
  tracks: [
    {
      // The hips: all of the vertical travel, and none of the deformation.
      part: 'hop',
      delay: 0,
      duration: 1300,
      easing: 'linear',
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'translateY(6px)', offset: 0.138, easing: ACCELERATE },
        {
          transform: 'translateY(-30px)',
          offset: 0.246,
          easing: 'cubic-bezier(0.15, 0.8, 0.4, 1)',
        },
        { transform: 'translateY(0px)', offset: 0.354, easing: ACCELERATE },
        { transform: 'translateY(-11px)', offset: 0.5, easing: SETTLE },
        { transform: 'translateY(0px)', offset: 0.63, easing: ACCELERATE },
        { transform: 'translateY(-4px)', offset: 0.77, easing: SETTLE },
        { transform: 'translateY(0px)', offset: 0.88, easing: ACCELERATE },
        REST,
      ],
    },
    {
      // The body: squash and stretch only. It hangs off the hips.
      part: 'body',
      delay: 0,
      duration: 1300,
      easing: 'linear',
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'scale(1.08, 0.88)', offset: 0.138, easing: ACCELERATE },
        {
          transform: 'scale(0.9, 1.16)',
          offset: 0.246,
          easing: 'cubic-bezier(0.15, 0.8, 0.4, 1)',
        },
        { transform: 'scale(1.14, 0.84)', offset: 0.354, easing: ACCELERATE },
        { transform: 'scale(0.97, 1.05)', offset: 0.5, easing: SETTLE },
        { transform: 'scale(1.06, 0.95)', offset: 0.63, easing: ACCELERATE },
        { transform: 'scale(0.99, 1.02)', offset: 0.77, easing: SETTLE },
        { transform: 'scale(1.02, 0.98)', offset: 0.88, easing: ACCELERATE },
        REST,
      ],
    },
    {
      // Absolute opacity, so this one replaces rather than adds.
      part: 'shadow',
      delay: 0,
      duration: 1300,
      easing: 'linear',
      composite: 'replace',
      frames: [
        { transform: 'scaleX(1)', opacity: 0.22, offset: 0 },
        { transform: 'scaleX(1.1)', opacity: 0.26, offset: 0.138 },
        { transform: 'scaleX(0.6)', opacity: 0.09, offset: 0.246 },
        { transform: 'scaleX(1.24)', opacity: 0.3, offset: 0.354 },
        { transform: 'scaleX(0.84)', opacity: 0.16, offset: 0.5 },
        { transform: 'scaleX(1.12)', opacity: 0.26, offset: 0.63 },
        { transform: 'scaleX(0.95)', opacity: 0.2, offset: 0.77 },
        { transform: 'none', opacity: 0.22, offset: 1 },
      ],
    },
    {
      part: 'head',
      delay: 60,
      duration: 1240,
      easing: 'linear',
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'translateY(2px)', offset: 0.15 },
        { transform: 'translateY(-5px) rotate(-4deg)', offset: 0.26, easing: SETTLE },
        { transform: 'translateY(3px) rotate(4deg)', offset: 0.37, easing: ACCELERATE },
        { transform: 'translateY(-2px) rotate(-2deg)', offset: 0.52, easing: SETTLE },
        { transform: 'translateY(0px) rotate(1deg)', offset: 0.66 },
        REST,
      ],
    },
    {
      part: 'earL',
      delay: 140,
      duration: 1000,
      easing: OVERSHOOT,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(-17deg)', offset: 0.16 },
        { transform: 'rotate(9deg)', offset: 0.46 },
        { transform: 'rotate(-4deg)', offset: 0.7 },
        REST,
      ],
    },
    {
      part: 'earR',
      delay: 170,
      duration: 1000,
      easing: OVERSHOOT,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(17deg)', offset: 0.16 },
        { transform: 'rotate(-9deg)', offset: 0.46 },
        { transform: 'rotate(4deg)', offset: 0.7 },
        REST,
      ],
    },
    {
      /*
       * The hat rides the leap a beat late in both directions: it lifts off the
       * skull on the way up, then thumps back down and rocks itself still. The
       * translate stays tiny — a hat that separated by more than a couple of
       * pixels would look like it had come off.
       */
      part: 'hat',
      delay: 200,
      duration: 1220,
      easing: 'linear',
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'translateY(2px) rotate(3deg)', offset: 0.14 },
        { transform: 'translateY(-4px) rotate(-11deg)', offset: 0.28, easing: SETTLE },
        { transform: 'translateY(3px) rotate(10deg)', offset: 0.42, easing: ACCELERATE },
        { transform: 'translateY(-1px) rotate(-6deg)', offset: 0.58, easing: SETTLE },
        { transform: 'rotate(3deg)', offset: 0.74 },
        { transform: 'rotate(-1deg)', offset: 0.88 },
        REST,
      ],
    },
    {
      part: 'tailBase',
      delay: 120,
      duration: 1100,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(-19deg)', offset: 0.2 },
        { transform: 'rotate(23deg)', offset: 0.45 },
        { transform: 'rotate(-10deg)', offset: 0.68 },
        { transform: 'rotate(4deg)', offset: 0.85 },
        REST,
      ],
    },
    {
      part: 'tailTip',
      delay: 210,
      duration: 1100,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(-27deg)', offset: 0.2 },
        { transform: 'rotate(31deg)', offset: 0.45 },
        { transform: 'rotate(-14deg)', offset: 0.68 },
        { transform: 'rotate(6deg)', offset: 0.85 },
        REST,
      ],
    },
    {
      part: 'whiskers',
      delay: 320,
      duration: 760,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(-5deg)', offset: 0.25 },
        { transform: 'rotate(4deg)', offset: 0.5 },
        { transform: 'rotate(-2deg)', offset: 0.75 },
        REST,
      ],
    },
    {
      /*
       * Sized so that 1.9x still fits inside the card at a 320px viewport
       * (96 * 1.9 = 182 against 256 of content width). The last thing this app
       * needs is another decoration that widens the document.
       */
      part: 'glow',
      delay: 180,
      duration: 900,
      easing: 'ease-out',
      composite: 'replace',
      frames: [
        { transform: 'scale(0.5)', opacity: 0, offset: 0 },
        { transform: 'scale(1.05)', opacity: 0.5, offset: 0.22 },
        { transform: 'scale(1.9)', opacity: 0, offset: 0.999 },
        { transform: 'none', opacity: 0, offset: 1 },
      ],
    },
    {
      part: 'count',
      delay: 700,
      duration: 620,
      easing: OVERSHOOT,
      composite: 'replace',
      frames: [
        { transform: 'scale(2.4)', opacity: 0, filter: 'blur(7px)', offset: 0 },
        { transform: 'scale(0.94)', opacity: 1, filter: 'blur(0px)', offset: 0.38 },
        { transform: 'scale(1.06)', opacity: 1, filter: 'blur(0px)', offset: 0.62 },
        { transform: 'none', opacity: 1, filter: 'blur(0px)', offset: 1 },
      ],
    },
  ],
}

/** Called back out of its house. */
const greet: Timeline = {
  id: 'greet',
  duration: 800,
  tracks: [
    {
      part: 'root',
      delay: 0,
      duration: 700,
      easing: OVERSHOOT,
      composite: 'replace',
      frames: [
        { transform: 'translateX(-46px) scale(0.86)', opacity: 0, offset: 0 },
        { transform: 'translateX(7px) scale(1.04)', opacity: 1, offset: 0.62 },
        { transform: 'none', opacity: 1, offset: 1 },
      ],
    },
    {
      part: 'earL',
      delay: 300,
      duration: 400,
      easing: OVERSHOOT,
      frames: [{ transform: 'rotate(-13deg)', offset: 0 }, REST],
    },
    {
      part: 'earR',
      delay: 330,
      duration: 400,
      easing: OVERSHOOT,
      frames: [{ transform: 'rotate(13deg)', offset: 0 }, REST],
    },
    {
      part: 'tailBase',
      delay: 240,
      duration: 460,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(21deg)', offset: 0.4 },
        REST,
      ],
    },
    {
      part: 'tailTip',
      delay: 330,
      duration: 460,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(28deg)', offset: 0.4 },
        REST,
      ],
    },
  ],
}

/**
 * Sent home. The only timeline that deliberately does *not* end at rest — the
 * card unmounts underneath it, which is the point.
 */
const tuck: Timeline = {
  id: 'tuck',
  duration: 460,
  tracks: [
    {
      part: 'root',
      delay: 0,
      duration: 460,
      easing: ACCELERATE,
      composite: 'replace',
      frames: [
        { transform: 'none', opacity: 1, offset: 0 },
        { transform: 'translateX(10px) scale(1.03)', opacity: 1, offset: 0.22 },
        { transform: 'translateX(40px) scale(0.7)', opacity: 0, offset: 1 },
      ],
    },
    {
      part: 'tailBase',
      delay: 0,
      duration: 300,
      easing: SETTLE,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(-24deg)', offset: 0.5 },
        REST,
      ],
    },
  ],
}

export const TIMELINES: Record<TimelineId, Timeline> = {
  idle,
  wake,
  grow,
  greet,
  tuck,
}

/** Timelines whose last frame is intentionally not identity. */
export const EXITS: readonly TimelineId[] = ['tuck']

export type Rig = Partial<Record<RigPart, Element | null>>

/**
 * Run a timeline over a rig.
 *
 * One `el.animate()` per track — the delays are what make it a performance
 * rather than a transition. Missing parts are skipped silently, because a
 * stage-0 cat has no tail and asking the caller to prune the timeline per stage
 * would put the rig's shape in two places.
 */
export function play(
  rig: Rig,
  id: TimelineId,
  opts: { onDone?: () => void } = {}
): Animation[] {
  const timeline = TIMELINES[id]
  const reduced = prefersReducedMotion()
  const out: Animation[] = []

  for (const track of timeline.tracks) {
    const el = rig[track.part]
    if (!el || typeof el.animate !== 'function') continue

    const iterations = track.iterations ?? 1
    // finish() throws on an infinite animation, so reduced motion drops the
    // loops rather than trying to land them.
    if (reduced && iterations === Infinity) continue

    let anim: Animation
    try {
      anim = el.animate(track.frames, {
        delay: track.delay,
        duration: track.duration,
        easing: track.easing,
        iterations,
        composite: track.composite ?? 'add',
        fill: 'none',
      })
    } catch {
      // A browser that refuses one keyframe list should not take the card down.
      continue
    }
    // Land the pose instantly rather than animating to it.
    if (reduced) anim.finish()
    out.push(anim)
  }

  if (opts.onDone) {
    const longest = out.reduce<Animation | null>((best, a) => {
      if (!best) return a
      const end = (x: Animation) => {
        const t = x.effect?.getTiming()
        return Number(t?.delay ?? 0) + Number(t?.duration ?? 0)
      }
      return end(a) > end(best) ? a : best
    }, null)
    if (longest) {
      // Cancelling rejects `finished`; a caller's cleanup is not an error.
      longest.finished.then(() => opts.onDone?.()).catch(() => {})
    } else {
      opts.onDone()
    }
  }

  return out
}

export function stop(anims: Animation[]): void {
  for (const a of anims) {
    try {
      a.cancel()
    } catch {
      /* already gone */
    }
  }
}

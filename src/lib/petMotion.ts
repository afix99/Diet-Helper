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
import type { CatVoice } from './sound'

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
  /**
   * The front paws. Cheap to add and they carry most of what reads as
   * cat-ness up close — a paw lifted to the face is grooming, a paw held out
   * is a wave, and neither is expressible by moving the body around.
   */
  | 'pawL'
  | 'pawR'
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
  'pawL',
  'pawR',
  'shadow',
  'glow',
  'count',
]

export type AmbientId = (typeof AMBIENT_IDS)[number]
export type ReactionId = (typeof REACTION_IDS)[number]

/**
 * Every timeline the rig can play.
 *
 * Five staged moments, plus the two pools that make it feel alive: ambients it
 * does on its own, and reactions it does when touched.
 */
export type TimelineId =
  | 'idle'
  | 'wake'
  | 'grow'
  | 'greet'
  | 'tuck'
  | AmbientId
  | ReactionId

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
  /*
   * The longest loop, not the sum — these all run at once. Hand-written because
   * `idle` predates the `scene()` builder below and is the one timeline whose
   * tracks never end; keep it equal to the longest `delay + duration` here, and
   * the "never runs a track past its timeline" test will say so if it drifts.
   */
  duration: 11300,
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
    {
      // The other ear on its own clock, so the two never twitch together.
      part: 'earL',
      delay: 0,
      duration: 11300,
      easing: OVERSHOOT,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'none', offset: 0.72 },
        { transform: 'rotate(9deg)', offset: 0.76 },
        { transform: 'rotate(-3deg)', offset: 0.8 },
        { transform: 'none', offset: 0.85 },
        REST,
      ],
    },
    {
      /*
       * A slow head drift. This is the loop that does the most work for "it is
       * always moving": a cat at rest is never perfectly square to you, and a
       * head that is very slightly, continuously wandering is the difference
       * between an animal sitting still and a drawing that has stopped.
       */
      part: 'head',
      delay: 0,
      duration: 7300,
      easing: BREATH,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(1.4deg) translateY(-0.6px)', offset: 0.28 },
        { transform: 'rotate(0.2deg)', offset: 0.5 },
        { transform: 'rotate(-1.6deg) translateY(0.5px)', offset: 0.76 },
        REST,
      ],
    },
    {
      // Weight shifting from one hip to the other. Sub-pixel on purpose: felt
      // rather than seen, and it keeps the whole silhouette from looking pinned.
      part: 'hop',
      delay: 0,
      duration: 5900,
      easing: BREATH,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'translateX(0.9px) rotate(0.5deg)', offset: 0.3 },
        { transform: 'translateX(-0.8px) rotate(-0.4deg)', offset: 0.72 },
        REST,
      ],
    },
    {
      // Whiskers drift last and least — they are hair, not muscle.
      part: 'whiskers',
      delay: 0,
      duration: 8300,
      easing: BREATH,
      iterations: Infinity,
      frames: [
        { transform: 'none', offset: 0 },
        { transform: 'rotate(0.8deg) translateY(0.4px)', offset: 0.33 },
        { transform: 'rotate(-0.7deg) translateY(-0.3px)', offset: 0.71 },
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

/* --- the living layer ------------------------------------------------------
 *
 * The loops above keep the cat breathing, but a loop is a loop: watch it for
 * thirty seconds and you can feel the period. What makes an animal read as
 * *awake* is that it does unrequested things at unpredictable times — it looks
 * at something, it grooms, it yawns, and you cannot tell when the next one is
 * coming.
 *
 * So there are two pools below.
 *
 * **Ambients** fire on their own, on a random interval, over the top of the
 * idle loops. They are small on purpose: the cat is not performing, it is just
 * alive in the corner of your eye.
 *
 * **Reactions** fire when you touch it, and are the opposite — big, varied,
 * and picked at random so that tapping twice never gives you the same thing.
 *
 * Both compose additively onto the idle loops, so the cat keeps breathing and
 * blinking *through* a pounce rather than freezing for it.
 */

const beat = (
  part: RigPart,
  delay: number,
  duration: number,
  easing: string,
  frames: Keyframe[]
): Track => ({ part, delay, duration, easing, frames })

/**
 * A track on `root`.
 *
 * `root` owns its transform outright rather than adding to it — it is the one
 * node with no idle loop underneath, and a whole-body spin must not be
 * arithmetic on top of something else.
 */
const rootBeat = (
  delay: number,
  duration: number,
  easing: string,
  frames: Keyframe[]
): Track => ({ part: 'root', delay, duration, easing, frames, composite: 'replace' })

/**
 * Assemble a timeline, deriving its length from its own tracks.
 *
 * The alternative is a hand-written `duration` that silently truncates a track
 * the moment someone extends one — which is exactly the bug the "never runs a
 * track past its timeline" test exists to catch. Computing it makes that class
 * of mistake unrepresentable rather than merely tested.
 */
const scene = (id: TimelineId, tracks: Track[]): Timeline => ({
  id,
  duration: Math.max(...tracks.map((t) => t.delay + t.duration)),
  tracks,
})

/* --- ambients: what it does when you are not looking ----------------------- */

const blinkTwice = scene('blinkTwice', [
  beat('eyeL', 0, 640, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.05)', offset: 0.18 },
    { transform: 'none', offset: 0.34 },
    { transform: 'scaleY(0.05)', offset: 0.52 },
    { transform: 'none', offset: 0.7 },
    REST,
  ]),
  beat('eyeR', 30, 640, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.05)', offset: 0.18 },
    { transform: 'none', offset: 0.34 },
    { transform: 'scaleY(0.05)', offset: 0.52 },
    { transform: 'none', offset: 0.7 },
    REST,
  ]),
])

const yawn = scene('yawn', [
  // The head goes back before the mouth would open, which is the order a real
  // yawn happens in and the reason it reads as a yawn rather than a nod.
  beat('head', 0, 1150, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-4deg) translateY(-2px)', offset: 0.34 },
    { transform: 'rotate(-3deg) translateY(-1.5px)', offset: 0.52 },
    REST,
  ]),
  beat('eyeL', 60, 900, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.08)', offset: 0.3 },
    { transform: 'scaleY(0.12)', offset: 0.55 },
    REST,
  ]),
  beat('eyeR', 90, 900, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.08)', offset: 0.3 },
    { transform: 'scaleY(0.12)', offset: 0.55 },
    REST,
  ]),
  beat('body', 40, 1100, BREATH, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.025, 1.045)', offset: 0.38 },
    REST,
  ]),
  beat('earL', 160, 940, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-9deg)', offset: 0.36 },
    REST,
  ]),
  beat('earR', 200, 940, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(9deg)', offset: 0.36 },
    REST,
  ]),
])

const stretch = scene('stretch', [
  beat('body', 0, 1250, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.1, 0.92)', offset: 0.36 },
    { transform: 'scale(0.98, 1.03)', offset: 0.66 },
    REST,
  ]),
  beat('hop', 0, 1250, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(3px)', offset: 0.36 },
    REST,
  ]),
  beat('head', 70, 1180, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(3px) rotate(2deg)', offset: 0.36 },
    REST,
  ]),
  // The tail is the last thing to come down out of a stretch.
  beat('tailBase', 130, 1120, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-15deg)', offset: 0.4 },
    { transform: 'rotate(4deg)', offset: 0.74 },
    REST,
  ]),
  beat('tailTip', 210, 1040, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-20deg)', offset: 0.4 },
    { transform: 'rotate(7deg)', offset: 0.76 },
    REST,
  ]),
])

/** Looking at something. The hold in the middle is what stops it being a sway. */
const look = (id: TimelineId, dir: 1 | -1) =>
  scene(id, [
    beat('head', 0, 1400, SETTLE, [
      { transform: 'none', offset: 0 },
      { transform: `rotate(${8 * dir}deg) translateX(${1.5 * dir}px)`, offset: 0.26 },
      { transform: `rotate(${8 * dir}deg) translateX(${1.5 * dir}px)`, offset: 0.6 },
      REST,
    ]),
    beat('eyeL', 60, 1300, SETTLE, [
      { transform: 'none', offset: 0 },
      { transform: `translateX(${2 * dir}px)`, offset: 0.22 },
      { transform: `translateX(${2 * dir}px)`, offset: 0.62 },
      REST,
    ]),
    beat('eyeR', 60, 1300, SETTLE, [
      { transform: 'none', offset: 0 },
      { transform: `translateX(${2 * dir}px)`, offset: 0.22 },
      { transform: `translateX(${2 * dir}px)`, offset: 0.62 },
      REST,
    ]),
    beat('earL', 140, 1200, OVERSHOOT, [
      { transform: 'none', offset: 0 },
      { transform: `rotate(${5 * dir}deg)`, offset: 0.3 },
      REST,
    ]),
    beat('earR', 170, 1200, OVERSHOOT, [
      { transform: 'none', offset: 0 },
      { transform: `rotate(${5 * dir}deg)`, offset: 0.3 },
      REST,
    ]),
  ])

const lookLeft = look('lookLeft', -1)
const lookRight = look('lookRight', 1)

const earFlick = scene('earFlick', [
  beat('earL', 0, 620, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(15deg)', offset: 0.2 },
    { transform: 'rotate(-6deg)', offset: 0.48 },
    { transform: 'rotate(2deg)', offset: 0.74 },
    REST,
  ]),
  beat('head', 60, 540, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-1.5deg)', offset: 0.3 },
    REST,
  ]),
])

const tailFlick = scene('tailFlick', [
  beat('tailBase', 0, 820, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-13deg)', offset: 0.22 },
    { transform: 'rotate(7deg)', offset: 0.55 },
    REST,
  ]),
  beat('tailTip', 110, 760, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-22deg)', offset: 0.24 },
    { transform: 'rotate(12deg)', offset: 0.58 },
    REST,
  ]),
])

const headTilt = scene('headTilt', [
  beat('head', 0, 1300, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(11deg)', offset: 0.24 },
    { transform: 'rotate(11deg)', offset: 0.62 },
    REST,
  ]),
  beat('earL', 120, 1180, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(6deg)', offset: 0.26 },
    { transform: 'rotate(6deg)', offset: 0.6 },
    REST,
  ]),
  beat('earR', 150, 1150, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(4deg)', offset: 0.26 },
    { transform: 'rotate(4deg)', offset: 0.6 },
    REST,
  ]),
  beat('whiskers', 220, 1080, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(5deg)', offset: 0.28 },
    { transform: 'rotate(5deg)', offset: 0.6 },
    REST,
  ]),
])

const groom = scene('groom', [
  // The paw goes up and the head comes down to meet it. Neither alone reads as
  // washing; the two closing on each other does.
  beat('pawR', 0, 1450, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translate(3px, -13px) rotate(-16deg)', offset: 0.26 },
    { transform: 'translate(4px, -15px) rotate(-11deg)', offset: 0.44 },
    { transform: 'translate(3px, -13px) rotate(-16deg)', offset: 0.6 },
    REST,
  ]),
  beat('head', 60, 1360, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(4px) rotate(7deg)', offset: 0.28 },
    { transform: 'translateY(5px) rotate(5deg)', offset: 0.46 },
    { transform: 'translateY(4px) rotate(7deg)', offset: 0.62 },
    REST,
  ]),
  beat('eyeL', 100, 1200, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.3)', offset: 0.3 },
    { transform: 'scaleY(0.3)', offset: 0.64 },
    REST,
  ]),
  beat('eyeR', 100, 1200, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.3)', offset: 0.3 },
    { transform: 'scaleY(0.3)', offset: 0.64 },
    REST,
  ]),
])

const perk = scene('perk', [
  beat('earL', 0, 760, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-7deg) scaleY(1.1)', offset: 0.24 },
    REST,
  ]),
  beat('earR', 20, 760, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(7deg) scaleY(1.1)', offset: 0.24 },
    REST,
  ]),
  beat('head', 0, 720, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-2.5px)', offset: 0.26 },
    REST,
  ]),
])

const shiver = scene('shiver', [
  beat('body', 0, 640, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(1.6deg)', offset: 0.12 },
    { transform: 'rotate(-1.6deg)', offset: 0.28 },
    { transform: 'rotate(1.2deg)', offset: 0.44 },
    { transform: 'rotate(-0.8deg)', offset: 0.62 },
    REST,
  ]),
  beat('head', 40, 600, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-2.2deg)', offset: 0.14 },
    { transform: 'rotate(2deg)', offset: 0.3 },
    { transform: 'rotate(-1.2deg)', offset: 0.5 },
    REST,
  ]),
])

/* --- reactions: what it does when you touch it ----------------------------- */

const pounce = scene('pounce', [
  beat('body', 0, 900, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.14, 0.84)', offset: 0.16 },
    { transform: 'scale(0.88, 1.18)', offset: 0.34 },
    { transform: 'scale(1.16, 0.82)', offset: 0.56 },
    { transform: 'scale(0.98, 1.02)', offset: 0.76 },
    REST,
  ]),
  beat('hop', 0, 900, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(4px)', offset: 0.16 },
    { transform: 'translateY(-26px)', offset: 0.36 },
    { transform: 'translateY(0px)', offset: 0.56 },
    { transform: 'translateY(-6px)', offset: 0.72 },
    REST,
  ]),
  // The shadow is the same impact seen from below, so it moves with the body
  // and never after it.
  beat('shadow', 0, 900, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scaleX(1.1)', offset: 0.16 },
    { transform: 'scaleX(0.6)', offset: 0.36 },
    { transform: 'scaleX(1.28)', offset: 0.56 },
    REST,
  ]),
  beat('head', 70, 820, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-3px) rotate(-6deg)', offset: 0.3 },
    { transform: 'translateY(3px) rotate(5deg)', offset: 0.52 },
    REST,
  ]),
  beat('tailBase', 130, 760, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-18deg)', offset: 0.3 },
    { transform: 'rotate(10deg)', offset: 0.62 },
    REST,
  ]),
  beat('tailTip', 200, 700, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-28deg)', offset: 0.32 },
    { transform: 'rotate(16deg)', offset: 0.64 },
    REST,
  ]),
])

const spin = scene('spin', [
  rootBeat(0, 850, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-20deg)', offset: 0.12 },
    { transform: 'rotate(360deg)', offset: 0.82 },
    REST,
  ]),
  beat('hop', 40, 780, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-9px)', offset: 0.34 },
    REST,
  ]),
  beat('tailTip', 160, 660, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(24deg)', offset: 0.4 },
    REST,
  ]),
])

const wiggle = scene('wiggle', [
  // The pre-pounce shuffle. Hips lead, everything else is dragged along late.
  beat('hop', 0, 900, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'translateX(4px) rotate(3deg)', offset: 0.16 },
    { transform: 'translateX(-4px) rotate(-3deg)', offset: 0.36 },
    { transform: 'translateX(3.4px) rotate(2.4deg)', offset: 0.56 },
    { transform: 'translateX(-2.6px) rotate(-2deg)', offset: 0.76 },
    REST,
  ]),
  beat('head', 90, 830, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'translateX(-2px) rotate(-2deg)', offset: 0.2 },
    { transform: 'translateX(2px) rotate(2deg)', offset: 0.42 },
    { transform: 'translateX(-1.4px)', offset: 0.64 },
    REST,
  ]),
  beat('tailBase', 150, 760, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(11deg)', offset: 0.22 },
    { transform: 'rotate(-11deg)', offset: 0.46 },
    { transform: 'rotate(7deg)', offset: 0.7 },
    REST,
  ]),
])

const bounce = scene('bounce', [
  beat('hop', 0, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-18px)', offset: 0.2 },
    { transform: 'translateY(0px)', offset: 0.4 },
    { transform: 'translateY(-11px)', offset: 0.58 },
    { transform: 'translateY(0px)', offset: 0.74 },
    { transform: 'translateY(-5px)', offset: 0.86 },
    REST,
  ]),
  beat('body', 0, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(0.92, 1.1)', offset: 0.2 },
    { transform: 'scale(1.12, 0.88)', offset: 0.4 },
    { transform: 'scale(0.96, 1.05)', offset: 0.58 },
    { transform: 'scale(1.06, 0.95)', offset: 0.74 },
    REST,
  ]),
  beat('shadow', 0, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scaleX(0.7)', offset: 0.2 },
    { transform: 'scaleX(1.2)', offset: 0.4 },
    { transform: 'scaleX(0.82)', offset: 0.58 },
    REST,
  ]),
  beat('earL', 120, 860, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-13deg)', offset: 0.22 },
    { transform: 'rotate(6deg)', offset: 0.5 },
    REST,
  ]),
  beat('earR', 150, 840, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(13deg)', offset: 0.22 },
    { transform: 'rotate(-6deg)', offset: 0.5 },
    REST,
  ]),
])

const squish = scene('squish', [
  // Being petted: it flattens happily rather than recoiling.
  beat('body', 0, 800, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.15, 0.85)', offset: 0.26 },
    { transform: 'scale(1.1, 0.9)', offset: 0.5 },
    REST,
  ]),
  beat('head', 30, 770, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(6px) scale(1.03)', offset: 0.26 },
    { transform: 'translateY(4px)', offset: 0.52 },
    REST,
  ]),
  beat('eyeL', 60, 700, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.22)', offset: 0.28 },
    { transform: 'scaleY(0.22)', offset: 0.6 },
    REST,
  ]),
  beat('eyeR', 60, 700, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.22)', offset: 0.28 },
    { transform: 'scaleY(0.22)', offset: 0.6 },
    REST,
  ]),
  beat('tailBase', 140, 650, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(9deg)', offset: 0.34 },
    REST,
  ]),
])

const surprise = scene('surprise', [
  beat('hop', 0, 900, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-14px)', offset: 0.18 },
    { transform: 'translateY(2px)', offset: 0.44 },
    REST,
  ]),
  beat('body', 0, 900, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(0.9, 1.16)', offset: 0.18 },
    { transform: 'scale(1.08, 0.94)', offset: 0.44 },
    REST,
  ]),
  // Eyes go wide, which is the whole read. Ears go back, which sells it.
  beat('eyeL', 40, 820, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.24)', offset: 0.2 },
    { transform: 'scale(1.1)', offset: 0.5 },
    REST,
  ]),
  beat('eyeR', 40, 820, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.24)', offset: 0.2 },
    { transform: 'scale(1.1)', offset: 0.5 },
    REST,
  ]),
  beat('earL', 70, 800, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(19deg)', offset: 0.2 },
    REST,
  ]),
  beat('earR', 100, 780, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-19deg)', offset: 0.2 },
    REST,
  ]),
])

const headbutt = scene('headbutt', [
  // Coming at you: the head scales up as it thrusts, which is the only depth
  // cue a flat rig has.
  beat('head', 0, 750, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-2px) rotate(-6deg)', offset: 0.16 },
    { transform: 'translateY(5px) scale(1.12)', offset: 0.42 },
    { transform: 'translateY(2px) scale(1.04)', offset: 0.66 },
    REST,
  ]),
  beat('body', 40, 700, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.05, 0.96)', offset: 0.4 },
    REST,
  ]),
  beat('hop', 40, 700, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(3px)', offset: 0.4 },
    REST,
  ]),
  beat('tailBase', 160, 580, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-12deg)', offset: 0.4 },
    REST,
  ]),
])

const roll = scene('roll', [
  // Tips onto its side and rights itself. Deliberately not a full rotation, so
  // it cannot be mistaken for `spin`.
  rootBeat(0, 1100, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-14deg)', offset: 0.12 },
    { transform: 'rotate(-72deg)', offset: 0.38 },
    { transform: 'rotate(-72deg)', offset: 0.56 },
    { transform: 'rotate(6deg)', offset: 0.84 },
    REST,
  ]),
  beat('body', 60, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.08, 0.93)', offset: 0.34 },
    REST,
  ]),
  beat('pawL', 120, 900, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-6px) rotate(-20deg)', offset: 0.36 },
    { transform: 'translateY(-4px) rotate(-12deg)', offset: 0.6 },
    REST,
  ]),
  beat('pawR', 160, 880, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-5px) rotate(-16deg)', offset: 0.36 },
    REST,
  ]),
])

const flop = scene('flop', [
  beat('hop', 0, 950, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-5px)', offset: 0.14 },
    { transform: 'translateY(5px) rotate(9deg)', offset: 0.42 },
    { transform: 'translateY(4px) rotate(7deg)', offset: 0.66 },
    REST,
  ]),
  beat('body', 0, 950, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.2, 0.8)', offset: 0.42 },
    { transform: 'scale(1.12, 0.88)', offset: 0.66 },
    REST,
  ]),
  beat('head', 80, 870, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(6px) rotate(14deg)', offset: 0.44 },
    { transform: 'translateY(5px) rotate(11deg)', offset: 0.68 },
    REST,
  ]),
  beat('shadow', 0, 950, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scaleX(1.24)', offset: 0.44 },
    REST,
  ]),
])

const wave = scene('wave', [
  beat('pawR', 0, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(-15px) rotate(-14deg)', offset: 0.2 },
    { transform: 'translateY(-15px) rotate(12deg)', offset: 0.38 },
    { transform: 'translateY(-15px) rotate(-12deg)', offset: 0.56 },
    { transform: 'translateY(-15px) rotate(8deg)', offset: 0.72 },
    REST,
  ]),
  beat('head', 60, 900, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-7deg)', offset: 0.26 },
    { transform: 'rotate(-7deg)', offset: 0.66 },
    REST,
  ]),
  beat('body', 40, 920, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-2deg)', offset: 0.3 },
    REST,
  ]),
])

const nod = scene('nod', [
  beat('head', 0, 700, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(5px) rotate(4deg)', offset: 0.2 },
    { transform: 'translateY(-2px)', offset: 0.42 },
    { transform: 'translateY(4px) rotate(3deg)', offset: 0.64 },
    REST,
  ]),
  beat('earL', 80, 620, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-8deg)', offset: 0.24 },
    { transform: 'rotate(5deg)', offset: 0.56 },
    REST,
  ]),
  beat('earR', 110, 590, OVERSHOOT, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(8deg)', offset: 0.24 },
    { transform: 'rotate(-5deg)', offset: 0.56 },
    REST,
  ]),
])

const shake = scene('shake', [
  // Shaking off water: it travels head to tail, which is why every part has a
  // different delay rather than one shared wobble.
  beat('head', 0, 700, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(9deg)', offset: 0.14 },
    { transform: 'rotate(-9deg)', offset: 0.3 },
    { transform: 'rotate(7deg)', offset: 0.46 },
    { transform: 'rotate(-4deg)', offset: 0.64 },
    REST,
  ]),
  beat('earL', 40, 700, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-17deg)', offset: 0.16 },
    { transform: 'rotate(14deg)', offset: 0.34 },
    { transform: 'rotate(-8deg)', offset: 0.54 },
    REST,
  ]),
  beat('earR', 40, 700, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(17deg)', offset: 0.16 },
    { transform: 'rotate(-14deg)', offset: 0.34 },
    { transform: 'rotate(8deg)', offset: 0.54 },
    REST,
  ]),
  beat('body', 90, 690, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(-4deg)', offset: 0.18 },
    { transform: 'rotate(4deg)', offset: 0.36 },
    { transform: 'rotate(-2.4deg)', offset: 0.56 },
    REST,
  ]),
  beat('tailBase', 170, 630, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(16deg)', offset: 0.2 },
    { transform: 'rotate(-14deg)', offset: 0.42 },
    { transform: 'rotate(8deg)', offset: 0.64 },
    REST,
  ]),
])

const purr = scene('purr', [
  // A vibration, not a movement: fast, tiny, and the eyes close over it.
  beat('body', 0, 900, 'linear', [
    { transform: 'none', offset: 0 },
    { transform: 'translateX(0.7px) scale(1.012)', offset: 0.1 },
    { transform: 'translateX(-0.7px)', offset: 0.2 },
    { transform: 'translateX(0.6px) scale(1.01)', offset: 0.3 },
    { transform: 'translateX(-0.6px)', offset: 0.4 },
    { transform: 'translateX(0.5px)', offset: 0.5 },
    { transform: 'translateX(-0.4px)', offset: 0.62 },
    { transform: 'translateX(0.3px)', offset: 0.76 },
    REST,
  ]),
  beat('eyeL', 40, 820, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.18)', offset: 0.22 },
    { transform: 'scaleY(0.18)', offset: 0.7 },
    REST,
  ]),
  beat('eyeR', 40, 820, 'ease-in-out', [
    { transform: 'none', offset: 0 },
    { transform: 'scaleY(0.18)', offset: 0.22 },
    { transform: 'scaleY(0.18)', offset: 0.7 },
    REST,
  ]),
  beat('head', 60, 800, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(2px) rotate(3deg)', offset: 0.3 },
    { transform: 'translateY(2px) rotate(3deg)', offset: 0.66 },
    REST,
  ]),
])

const backflip = scene('backflip', [
  rootBeat(0, 1200, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(14deg)', offset: 0.12 },
    { transform: 'rotate(-360deg)', offset: 0.8 },
    REST,
  ]),
  beat('hop', 0, 1200, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateY(5px)', offset: 0.12 },
    { transform: 'translateY(-24px)', offset: 0.42 },
    { transform: 'translateY(0px)', offset: 0.72 },
    { transform: 'translateY(-6px)', offset: 0.86 },
    REST,
  ]),
  beat('body', 0, 1200, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.12, 0.88)', offset: 0.12 },
    { transform: 'scale(0.9, 1.14)', offset: 0.42 },
    { transform: 'scale(1.14, 0.86)', offset: 0.72 },
    REST,
  ]),
  beat('shadow', 0, 1200, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scaleX(0.58)', offset: 0.42 },
    { transform: 'scaleX(1.26)', offset: 0.72 },
    REST,
  ]),
])

const zoom = scene('zoom', [
  // Across and back. The travel is capped well inside the card, because a
  // decoration that escaped its container cost this app two sessions.
  beat('hop', 0, 1100, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateX(-10px) rotate(-7deg)', offset: 0.22 },
    { transform: 'translateX(10px) rotate(7deg)', offset: 0.54 },
    { transform: 'translateX(-5px) rotate(-4deg)', offset: 0.78 },
    REST,
  ]),
  beat('body', 0, 1100, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'scale(1.1, 0.92)', offset: 0.22 },
    { transform: 'scale(1.1, 0.92)', offset: 0.54 },
    REST,
  ]),
  beat('head', 90, 1000, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'translateX(-3px) rotate(-5deg)', offset: 0.22 },
    { transform: 'translateX(3px) rotate(5deg)', offset: 0.56 },
    REST,
  ]),
  beat('tailBase', 170, 920, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(22deg)', offset: 0.24 },
    { transform: 'rotate(-22deg)', offset: 0.58 },
    REST,
  ]),
  beat('tailTip', 250, 840, SETTLE, [
    { transform: 'none', offset: 0 },
    { transform: 'rotate(30deg)', offset: 0.26 },
    { transform: 'rotate(-30deg)', offset: 0.6 },
    REST,
  ]),
])

/**
 * The ambient pool, fired on a random interval while the cat is just sitting
 * there. Ordered roughly least to most conspicuous; the picker does not care,
 * but a human reading this file does.
 */
export const AMBIENT_IDS = [
  'blinkTwice',
  'earFlick',
  'tailFlick',
  'perk',
  'shiver',
  'lookLeft',
  'lookRight',
  'headTilt',
  'groom',
  'yawn',
  'stretch',
] as const

/** The tap pool. Fifteen, so that tapping repeatedly keeps finding new ones. */
export const REACTION_IDS = [
  'pounce',
  'spin',
  'wiggle',
  'bounce',
  'squish',
  'surprise',
  'headbutt',
  'roll',
  'flop',
  'wave',
  'nod',
  'shake',
  'purr',
  'backflip',
  'zoom',
] as const

/**
 * What each reaction sounds like: a voice, and how far up the scale.
 *
 * Every one of the fifteen speaks. They come from five timbres rather than
 * fifteen unrelated noises, and the second number moves the voice by whole
 * degrees of the pentatonic table in sound.ts — so all fifteen are
 * distinguishable while remaining, unmistakably, one cat. Nothing can land
 * off-scale, because transposing walks the table rather than multiplying.
 *
 * The mapping is by temperament, not by mechanics: affectionate reactions purr,
 * playful ones chirp, showy ones trill, startled ones mew.
 */
export const VOICE_FOR: Record<ReactionId, readonly [CatVoice, number]> = {
  // Affection — low and rough.
  squish: ['purr', 0],
  purr: ['purr', 0],
  nod: ['purr', 1],
  wave: ['purr', 2],
  headbutt: ['purr', -1],

  // Play — short and rising.
  pounce: ['chirp', 0],
  bounce: ['chirp', 1],
  wiggle: ['chirp', -1],
  zoom: ['chirp', 2],

  // Showing off — rolled and climbing.
  spin: ['trill', 0],
  backflip: ['trill', 1],
  roll: ['trill', -1],

  // Startled, and the small collapse after it.
  surprise: ['mew', 1],
  flop: ['mew', -1],

  // The one that is neither: shaking itself off.
  shake: ['brrp', 0],
}

export const TIMELINES: Record<TimelineId, Timeline> = {
  idle,
  wake,
  grow,
  greet,
  tuck,
  // Ambients
  blinkTwice,
  earFlick,
  tailFlick,
  perk,
  shiver,
  lookLeft,
  lookRight,
  headTilt,
  groom,
  yawn,
  stretch,
  // Reactions
  pounce,
  spin,
  wiggle,
  bounce,
  squish,
  surprise,
  headbutt,
  roll,
  flop,
  wave,
  nod,
  shake,
  purr,
  backflip,
  zoom,
}

/**
 * Pick from a pool, never repeating what just played.
 *
 * The no-repeat rule is the whole reason this is a function rather than a bare
 * `Math.random()` at the call site. With fifteen reactions, a plain random pick
 * still shows you the same one twice in a row about seven percent of the time,
 * and two identical taps in a row is exactly the moment a toy stops feeling
 * responsive and starts feeling broken.
 *
 * `rng` is injectable so the tests can assert the behaviour rather than sample
 * it and hope.
 */
function pickFrom<T>(pool: readonly T[], last: T | null, rng: () => number): T {
  const choices = pool.length > 1 && last !== null ? pool.filter((x) => x !== last) : pool
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))]
}

export function pickReaction(last: ReactionId | null = null, rng = Math.random): ReactionId {
  return pickFrom(REACTION_IDS, last, rng)
}

export function pickAmbient(last: AmbientId | null = null, rng = Math.random): AmbientId {
  return pickFrom(AMBIENT_IDS, last, rng)
}

/**
 * How long to wait before the next ambient.
 *
 * Randomised rather than fixed, because a behaviour on a metronome is a
 * behaviour you can predict, and a cat you can predict is a clock.
 */
export const AMBIENT_MIN_GAP = 1900
export const AMBIENT_MAX_GAP = 5400

export function nextAmbientDelay(rng = Math.random): number {
  return Math.round(AMBIENT_MIN_GAP + rng() * (AMBIENT_MAX_GAP - AMBIENT_MIN_GAP))
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

/**
 * The streak cat.
 *
 * The streak was one number in a pill in the corner — the app's only measure of
 * "you showed up", and the least visible thing on the screen. This gives it a
 * body.
 *
 * Two rules decide everything here, and both are deliberate refusals of how
 * streak pets are normally built:
 *
 * 1. **The cat reacts to whether you showed up, never to what the numbers
 *    said.** It is dozing, or it is awake. It does not look pleased when you
 *    come in under your calorie target and it does not look disappointed when
 *    you go over. `badges()` in nutrition.ts already carries this rule — "a
 *    badge may reward logging, consistency, variety, adequacy or coming back,
 *    and never eating less" — and the cat inherits it. A pet whose mood tracked
 *    a deficit would be the most coercive thing in the app, on the same screen
 *    as the under-eating warning.
 * 2. **Growth is monotonic.** The stage comes from the *best* streak, which
 *    cannot decrease, so a gap changes the pose and never the stage. Pets that
 *    sicken, shrink or die when you miss a day are a dark pattern; this one
 *    curls up and waits.
 *
 * Deriving the stage from `run.best` rather than storing it means there is no
 * high-water mark to migrate and nothing that can drift out of sync with the
 * diary.
 */

/**
 * Whether the cat appears in the app at all.
 *
 * On. It was off through two commits while the art was redrawn — flat vector
 * was the wrong call for what this is meant to feel like — and this is the
 * line that turned it back on.
 *
 * It stays because it is worth keeping, not because it is still needed. It
 * gates exactly three places: the Today card, the streak pill, and the row in
 * More. A pet lives on the screen you open every day, which is the one kind of
 * feature that can turn out to be irritating only after a week of actually
 * using it. If that happens, this goes back to `false` and the cat is gone,
 * with the behaviour, the motion rig, the wardrobe and every test around them
 * still in the build and still passing — no revert, nothing lost, and it can
 * come back the same way.
 */
export const PET_ENABLED = true

/** The drawable features. Additive: each stage keeps everything before it. */
export type PetPart =
  | 'body'
  | 'ears'
  | 'eyes'
  | 'whiskers'
  | 'tail'
  | 'markings'
  /**
   * Blush on the cheeks. Took the collar's place at stage 5 when the collar
   * became a wardrobe accessory — a permanent collar would have occupied the
   * neck slot forever and made every other neck item undrawable.
   */
  | 'cheeks'
  | 'ruff'
  /** The streak flame above the head, at the last stage. */
  | 'flame'

/**
 * Curled, or sitting up. Two states and no third, because a third would have to
 * mean something, and the only honest thing left to mean is a judgement about
 * what you ate.
 */
export type PetPose = 'curled' | 'awake'

export interface PetStage {
  index: number
  /** Best-streak days at which this stage is reached. */
  minStreak: number
  name: string
  parts: readonly PetPart[]
  /** Drawn size relative to the full-grown cat. */
  scale: number
}

/*
 * Thresholds line up with badges that already exist — Three in a Row (3), Full
 * Week (7), Two Weeks (14), Thirty Days (30) — so a stage-up and a badge tend
 * to land in the same moment rather than competing for attention.
 */
export const PET_STAGES: readonly PetStage[] = [
  { index: 0, minStreak: 0, name: 'Asleep', scale: 0.82, parts: ['body', 'ears'] },
  { index: 1, minStreak: 1, name: 'Kitten', scale: 0.86, parts: ['body', 'ears', 'eyes'] },
  {
    index: 2,
    minStreak: 3,
    name: 'Curious',
    scale: 0.9,
    parts: ['body', 'ears', 'eyes', 'whiskers'],
  },
  {
    index: 3,
    minStreak: 7,
    name: 'Playful',
    scale: 0.94,
    parts: ['body', 'ears', 'eyes', 'whiskers', 'tail'],
  },
  {
    index: 4,
    minStreak: 14,
    name: 'Settled',
    scale: 0.97,
    parts: ['body', 'ears', 'eyes', 'whiskers', 'tail', 'markings'],
  },
  {
    index: 5,
    minStreak: 30,
    name: 'Companion',
    scale: 1,
    parts: ['body', 'ears', 'eyes', 'whiskers', 'tail', 'markings', 'cheeks'],
  },
  {
    index: 6,
    minStreak: 60,
    name: 'Old Friend',
    scale: 1,
    parts: [
      'body',
      'ears',
      'eyes',
      'whiskers',
      'tail',
      'markings',
      'cheeks',
      'ruff',
      'flame',
    ],
  },
]

/**
 * The stage for a best-ever streak.
 *
 * Monotonic non-decreasing in its argument, which is the whole "never
 * regresses" promise — and is asserted across four hundred days in the tests
 * rather than merely claimed in this comment.
 */
export function stageFor(bestStreak: number): PetStage {
  const days = Number.isNaN(bestStreak) ? 0 : Math.max(0, bestStreak)
  let found = PET_STAGES[0]
  for (const stage of PET_STAGES) {
    if (days >= stage.minStreak) found = stage
  }
  return found
}

/**
 * Curled or awake — and note the signature. The only input is whether anything
 * was logged today. There is deliberately no way to pass this function a
 * calorie total, so no future edit can quietly make the cat's mood depend on
 * one.
 */
export function poseFor(loggedToday: boolean): PetPose {
  return loggedToday ? 'awake' : 'curled'
}

/** The next stage and how far off it is. Null once fully grown. */
export function nextStage(
  bestStreak: number
): { stage: PetStage; daysAway: number } | null {
  const days = Number.isNaN(bestStreak) ? 0 : Math.max(0, bestStreak)
  const next = PET_STAGES.find((s) => s.minStreak > days)
  return next ? { stage: next, daysAway: next.minStreak - days } : null
}

export const DEFAULT_PET_NAME = 'Comel'
export const MAX_PET_NAME = 16

/** Trimmed, capped, and never empty — an unnamed pet is worse than a default. */
export function normalisePetName(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_PET_NAME)
  return trimmed.length > 0 ? trimmed : DEFAULT_PET_NAME
}

/**
 * What the card says under the name. Never "sad", "hungry", "lonely", or
 * "misses you" — a test pins that list, because this is exactly the copy that
 * drifts one guilt-trip at a time.
 */
export function statusLine(pose: PetPose, currentStreak: number): string {
  if (pose === 'awake') return currentStreak > 0 ? 'Awake' : 'Awake · new run'
  return currentStreak > 0 ? 'Dozing' : 'Resting'
}

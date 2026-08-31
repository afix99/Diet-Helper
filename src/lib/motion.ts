/**
 * How much motion this device wants.
 *
 * Sibling of `theme.ts` and `sound.ts`, and stored the same way: in
 * localStorage, because it belongs to the device rather than the account, and
 * because the burst layer has to know before React has finished thinking.
 *
 * Two levels rather than an on/off, because "off" already exists and belongs to
 * the operating system:
 *
 * - **full** — everything, including particles and per-badge choreography.
 * - **calm** — functional motion only. Sheets still slide, lists still arrive,
 *   values still count. Flourishes stop.
 *
 * `prefers-reduced-motion` overrides both and always wins. That is an
 * accessibility setting, not a preference, and someone who set it did not set
 * it to be talked out of.
 */
export type MotionLevel = 'full' | 'calm'

export const MOTION_KEY = 'memey-motion'
export const DEFAULT_MOTION: MotionLevel = 'full'

export const MOTION_OPTIONS: { value: MotionLevel; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'calm', label: 'Calm' },
]

export function isMotionLevel(v: unknown): v is MotionLevel {
  return v === 'full' || v === 'calm'
}

/** True when the OS has asked for less movement. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function readMotion(): MotionLevel {
  if (typeof window === 'undefined') return DEFAULT_MOTION
  try {
    const stored = window.localStorage.getItem(MOTION_KEY)
    return isMotionLevel(stored) ? stored : DEFAULT_MOTION
  } catch {
    // Private mode and blocked site data throw rather than return null.
    return DEFAULT_MOTION
  }
}

export function writeMotion(level: MotionLevel): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MOTION_KEY, level)
  } catch {
    // Nothing to do; the caller's own state still holds for this session.
  }
}

/**
 * Whether a flourish — a particle burst, a badge's own choreography — should
 * play at all. The single question every decorative effect asks.
 */
export function flourishesOn(): boolean {
  return !prefersReducedMotion() && readMotion() === 'full'
}

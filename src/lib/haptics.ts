/**
 * A tick of haptic feedback where the device supports it.
 *
 * Silent under prefers-reduced-motion: someone who has asked the system to
 * calm things down has usually asked for the same reason a buzzing phone is
 * unwelcome, and vibration is motion the vestibular system notices.
 */
type Weight = 'light' | 'medium' | 'success' | 'warning'

const PATTERNS: Record<Weight, number | number[]> = {
  light: 8,
  medium: 16,
  success: [10, 40, 18],
  warning: [22, 60, 22],
}

export function haptic(weight: Weight = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(PATTERNS[weight])
  } catch {
    // Some browsers expose vibrate but reject it outside a user gesture.
  }
}

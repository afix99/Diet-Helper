/**
 * Short synthesised cues, so a tap has something to land on.
 *
 * Sibling of `haptics.ts`, and called from the same places: one function, one
 * argument, silent when it cannot work.
 *
 * **Synthesised rather than sampled.** Five oscillator envelopes cost nothing to
 * ship, need no network, work offline, and never wait on a cache — where five
 * audio files would be five requests and a service-worker problem. This is the
 * same reasoning that replaced a 42 kB animation library with thirty lines of
 * hook.
 *
 * The cues are deliberately quiet and short: a marimba, not an arcade. Logging
 * food is a chore with no natural payoff, and the point of a sound here is to
 * close the loop on the action — "yes, that landed" — not to congratulate
 * anyone. Nothing here plays unless a finger caused it.
 */
export type Cue = 'tap' | 'log' | 'undo' | 'water' | 'goal' | 'pet'

export const SOUND_KEY = 'memey-sound'

/** One partial of a cue: frequency in Hz, start offset and length in seconds. */
interface Note {
  hz: number
  at: number
  len: number
  gain: number
}

/*
 * D5, A5 and D6. A rising fifth reads as completion and a falling one as
 * reversal, which is why log and undo are the same two notes in opposite
 * order — the pair is learnable without anyone being told.
 */
const D5 = 587.33
const A5 = 880
const D6 = 1174.66

const CUES: Record<Cue, Note[]> = {
  tap: [{ hz: A5, at: 0, len: 0.03, gain: 0.05 }],
  log: [
    { hz: D5, at: 0, len: 0.09, gain: 0.11 },
    { hz: A5, at: 0.055, len: 0.13, gain: 0.09 },
  ],
  undo: [
    { hz: A5, at: 0, len: 0.09, gain: 0.09 },
    { hz: D5, at: 0.055, len: 0.13, gain: 0.08 },
  ],
  water: [{ hz: 392, at: 0, len: 0.11, gain: 0.08 }],
  /*
   * The cat waking or arriving. Deliberately the quietest thing here and a
   * major sixth rather than the fifth `log` uses, so it reads as a different
   * kind of event and never competes with the sound of logging food.
   */
  pet: [
    { hz: A5, at: 0, len: 0.06, gain: 0.05 },
    { hz: D6, at: 0.05, len: 0.11, gain: 0.045 },
  ],
  goal: [
    { hz: D5, at: 0, len: 0.1, gain: 0.1 },
    { hz: A5, at: 0.075, len: 0.1, gain: 0.09 },
    { hz: D6, at: 0.15, len: 0.22, gain: 0.08 },
  ],
}

let ctx: AudioContext | null = null
let enabled: boolean | null = null

type AudioCtor = typeof AudioContext

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/**
 * The context is built on first use, never at import time.
 *
 * iOS refuses to run an AudioContext that was not created inside a user
 * gesture, and one constructed while the module loads is exactly that. Every
 * caller is a tap handler, so building it here means the first one always
 * counts.
 */
function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = audioCtor()
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

export function soundEnabled(): boolean {
  if (enabled !== null) return enabled
  if (typeof window === 'undefined') return true
  try {
    // Default on: the sound is the reward, and there is a switch in Settings.
    enabled = window.localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    // Private mode and blocked site data throw rather than return null.
    enabled = true
  }
  return enabled
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // Nothing to do; the in-memory value still holds for this session.
  }
}

export function sound(cue: Cue): void {
  if (!soundEnabled()) return
  const ac = context()
  if (!ac) return

  try {
    // Safari suspends the context when the tab backgrounds and does not always
    // resume it on its own.
    if (ac.state === 'suspended') void ac.resume()

    const now = ac.currentTime
    for (const n of CUES[cue]) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      // A triangle is soft enough not to be piercing on a phone speaker but
      // still carries over a noisy room. A sine disappears; a square grates.
      osc.type = 'triangle'
      osc.frequency.value = n.hz

      const start = now + n.at
      // Ramps rather than steps: an instant gain change clicks audibly.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(n.gain, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.len)

      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.len + 0.02)
    }
  } catch {
    // Autoplay policy, a closed context, a browser without Web Audio: a missing
    // sound is never worth breaking the tap that caused it.
  }
}

/** Test seam: forget the cached context and preference. */
export function resetSoundForTests(): void {
  ctx = null
  enabled = null
}

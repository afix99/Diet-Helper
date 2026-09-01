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
/**
 * The cat's own voices, on top of the UI cues.
 *
 * Every tap reaction makes one of these. Five timbres rather than fifteen
 * because fifteen unrelated noises is how an app stops being nice to hold.
 */
export type CatVoice = 'purr' | 'chirp' | 'trill' | 'mew' | 'brrp'

export type Cue = 'tap' | 'log' | 'undo' | 'water' | 'goal' | 'pet' | CatVoice

export const SOUND_KEY = 'memey-sound'

/** One partial of a cue: frequency in Hz, start offset and length in seconds. */
interface Note {
  hz: number
  at: number
  len: number
  gain: number
  /** Softer than the default triangle where a voice wants less edge. */
  type?: OscillatorType
  /**
   * Glide to this frequency across the note.
   *
   * A chirp is not a short note — it is a note that *moves*. Without the glide
   * every cat voice collapses back into a beep, which is the whole thing we are
   * trying not to build.
   */
  to?: number
  /**
   * Amplitude modulation in Hz. This is the purr.
   *
   * A real cat purrs at about 25 Hz, and a phone speaker cannot reproduce 25 Hz
   * at all — a literal purr would be silence. So the carrier is audible and the
   * *amplitude* is modulated at purr rate, which is the part the ear actually
   * hears as purring. It is an impression, honestly, not a recording.
   */
  am?: number
}

/*
 * D major pentatonic, four octaves.
 *
 * Every frequency in every cue below is drawn from this table, and a test
 * sweeps them all against it. That constraint is doing more work than any
 * amount of taste: a pentatonic scale contains no semitone and no tritone, so
 * *no two notes in it can clash* — in any order, against any other cue, ever.
 * It is the one mechanical guarantee available that the cat cannot make the app
 * sound bad.
 */
export const PENTATONIC = [
  146.83, 164.81, 185.0, 220.0, 246.94, // D3 E3 F#3 A3 B3
  293.66, 329.63, 369.99, 440.0, 493.88, // D4 E4 F#4 A4 B4
  587.33, 659.25, 739.99, 880.0, 987.77, // D5 E5 F#5 A5 B5
  1174.66, // D6
] as const

const [D3, , FS3, A3, , D4, E4, FS4, A4, , D5, E5, FS5, A5, B5, D6] = PENTATONIC

/**
 * Move a frequency by whole scale degrees, staying inside the table.
 *
 * Transposing by ratio would land between the rungs and break the no-clash
 * guarantee; walking the table cannot. Out-of-range steps clamp rather than
 * wrap, because a voice that suddenly jumped an octave would read as a bug.
 */
export function transpose(hz: number, steps: number): number {
  const i = PENTATONIC.indexOf(hz as (typeof PENTATONIC)[number])
  if (i < 0 || steps === 0) return hz
  return PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, i + steps))]
}

/*
 * log and undo are the same two notes in opposite order — a rising fifth reads
 * as completion and a falling one as reversal, so the pair is learnable without
 * anyone being told. D5, A5 and D6 now come out of the pentatonic table above,
 * which is where they always were in spirit.
 */

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

  /* --- the cat ------------------------------------------------------------
   *
   * All five sit below `log`'s 0.11 peak. The diary is the point of the app and
   * the cat is decoration; decoration that shouts over the thing it decorates
   * is how a nice app turns annoying.
   */

  /** Contentment. Low, long, and rough at purr rate rather than pitched. */
  purr: [
    { hz: A3, at: 0, len: 0.5, gain: 0.055, type: 'sine', am: 25 },
    // A whisper of the octave above, so it reads as warm rather than as a hum.
    { hz: A4, at: 0.02, len: 0.42, gain: 0.012, type: 'sine', am: 25 },
  ],

  /** The short interrogative noise a cat makes at a bird. Rises and stops. */
  chirp: [{ hz: D5, at: 0, len: 0.085, gain: 0.06, to: A5 }],

  /** Excitement: the chirp rolled, twice, climbing. */
  trill: [
    { hz: A5, at: 0, len: 0.055, gain: 0.05, to: B5 },
    { hz: A5, at: 0.062, len: 0.1, gain: 0.055, to: D6 },
  ],

  /** A small enquiring mew. Falls, which is what makes it a question. */
  mew: [{ hz: FS5, at: 0, len: 0.17, gain: 0.05, type: 'sine', to: D5 }],

  /** The low flutter of a cat shaking itself off. */
  brrp: [{ hz: D4, at: 0, len: 0.2, gain: 0.055, type: 'sine', am: 38 }],
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

/**
 * Play a cue.
 *
 * Returns the oscillators it started, so a caller that can fire cues faster
 * than they finish — tapping the cat — can cut the previous one instead of
 * letting ten purrs pile into a drone. Callers that cannot do that ignore it.
 */
export function sound(cue: Cue, steps = 0): OscillatorNode[] {
  if (!soundEnabled()) return []
  const ac = context()
  if (!ac) return []
  const started: OscillatorNode[] = []

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
      osc.type = n.type ?? 'triangle'

      const hz = transpose(n.hz, steps)
      osc.frequency.value = hz

      const start = now + n.at

      // A glide, where the voice has one: set the start, then ramp.
      if (n.to !== undefined) {
        osc.frequency.setValueAtTime(hz, start)
        osc.frequency.exponentialRampToValueAtTime(transpose(n.to, steps), start + n.len)
      }

      // Ramps rather than steps: an instant gain change clicks audibly.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(n.gain, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.len)

      /*
       * The purr: a second gain stage the LFO multiplies, rather than an LFO
       * added onto the envelope's own gain.
       *
       * Adding it was the obvious way and it was wrong. The envelope decays
       * exponentially toward silence, so for most of a half-second note it sits
       * well below the LFO's depth; the sum then goes negative on every trough,
       * the waveform inverts instead of dropping out, and the roughness you
       * hear comes out at twice the LFO rate. Rendering the cue to a file and
       * measuring it put the "25 Hz" purr at about 50 — a buzz, not a cat.
       *
       * Multiplying cannot do that. `0.55 ± 0.45` stays inside 0.1–1.0 whatever
       * the envelope is doing, so the rate you set is the rate you get.
       */
      let tail: AudioNode = gain
      if (n.am) {
        const trem = ac.createGain()
        const lfo = ac.createOscillator()
        const depth = ac.createGain()
        trem.gain.value = 0.55
        lfo.type = 'sine'
        lfo.frequency.value = n.am
        depth.gain.value = 0.45
        lfo.connect(depth).connect(trem.gain)
        lfo.start(start)
        lfo.stop(start + n.len + 0.02)
        started.push(lfo)
        gain.connect(trem)
        tail = trem
      }

      osc.connect(gain)
      tail.connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.len + 0.02)
      started.push(osc)
    }
  } catch {
    // Autoplay policy, a closed context, a browser without Web Audio: a missing
    // sound is never worth breaking the tap that caused it.
  }
  return started
}

/** Cut a cue short. Used when a new tap arrives before the last one finished. */
export function hush(nodes: OscillatorNode[]): void {
  for (const n of nodes) {
    try {
      n.stop()
    } catch {
      /* already stopped, or never started */
    }
  }
}

/** Test seam: forget the cached context and preference. */
export function resetSoundForTests(): void {
  ctx = null
  enabled = null
}

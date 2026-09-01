import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PENTATONIC,
  SOUND_KEY,
  hush,
  resetSoundForTests,
  setSoundEnabled,
  sound,
  soundEnabled,
  transpose,
  type CatVoice,
} from '../sound'
import { VOICE_FOR } from '../petMotion'

/**
 * Records what a cue actually asked the audio hardware to do.
 *
 * `frequency` has to be a real-ish AudioParam, not a bare `{ value }`. The cat
 * voices glide, `sound()` swallows every exception so that a missing cue can
 * never break the tap that caused it, and the two together mean a fake without
 * ramp methods would let every test here pass while the feature was dead in the
 * browser. Ask me how I know to write this comment.
 */
class FakeParam {
  value = 0
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
  /** Ramp targets, in order, for assertions about direction. */
  get ramps(): number[] {
    return this.exponentialRampToValueAtTime.mock.calls.map((c) => Number(c[0]))
  }
}
class FakeOscillator {
  type = ''
  frequency = new FakeParam()
  started: number[] = []
  stopped = 0
  connect(next: unknown) { return next }
  start(t: number) { this.started.push(t) }
  stop() { this.stopped += 1 }
}
class FakeGain {
  gain = new FakeParam()
  connect(next: unknown) { return next }
}

let built = 0
let oscillators: FakeOscillator[] = []
let gains: FakeGain[] = []

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  constructor() { built += 1 }
  createOscillator() { const o = new FakeOscillator(); oscillators.push(o); return o }
  createGain() { const g = new FakeGain(); gains.push(g); return g }
  resume() {}
}

const win = globalThis as unknown as {
  window?: unknown
  AudioContext?: unknown
  localStorage?: Storage
}

const store = new Map<string, string>()
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as unknown as Storage

beforeEach(() => {
  built = 0
  oscillators = []
  gains = []
  store.clear()
  win.AudioContext = FakeAudioContext
  win.localStorage = fakeStorage
  win.window = win
  resetSoundForTests()
})

afterEach(() => {
  delete win.window
  delete win.AudioContext
  delete win.localStorage
})

describe('sound', () => {
  /*
   * iOS refuses an AudioContext created outside a user gesture, and one built
   * while the module loads is exactly that. Importing must construct nothing.
   */
  it('constructs no audio context until a cue actually plays', () => {
    expect(built).toBe(0)
    soundEnabled()
    expect(built).toBe(0)
    sound('tap')
    expect(built).toBe(1)
  })

  it('reuses the one context across cues', () => {
    sound('tap')
    sound('log')
    sound('goal')
    expect(built).toBe(1)
  })

  it('plays every note of a cue', () => {
    sound('log')
    expect(oscillators).toHaveLength(2)
    sound('goal')
    expect(oscillators).toHaveLength(5)
  })

  it('gives the cat a rising cue of its own, quieter than logging', () => {
    // The envelope starts at a 0.0001 floor and *ramps* to the note's gain, so
    // the peak is the first ramp target rather than the first set value.
    const peak = () =>
      Math.max(
        ...gains.map((g) =>
          Number(g.gain.exponentialRampToValueAtTime.mock.calls[0]?.[0] ?? 0)
        )
      )

    sound('log')
    const logPeak = peak()
    oscillators = []
    gains = []

    sound('pet')
    const notes = oscillators.map((o) => o.frequency.value)
    expect(notes).toHaveLength(2)
    // Rising, so it reads as arrival rather than as departure.
    expect(notes[1]).toBeGreaterThan(notes[0])
    // And never loud enough to compete with the sound of logging food.
    expect(peak()).toBeLessThan(logPeak)
  })

  it('makes undo the reverse of log, so the pair is learnable', () => {
    sound('log')
    const up = oscillators.map((o) => o.frequency.value)
    oscillators = []
    sound('undo')
    const down = oscillators.map((o) => o.frequency.value)
    expect(down).toEqual([...up].reverse())
  })

  it('stays silent when switched off, and plays again when switched back', () => {
    setSoundEnabled(false)
    sound('log')
    expect(built).toBe(0)
    expect(store.get(SOUND_KEY)).toBe('off')

    setSoundEnabled(true)
    sound('log')
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it('remembers being off across a reload', () => {
    setSoundEnabled(false)
    resetSoundForTests()
    expect(soundEnabled()).toBe(false)
  })

  it('defaults to on for a device that has never chosen', () => {
    expect(soundEnabled()).toBe(true)
  })

  it('says nothing and throws nothing when Web Audio is missing', () => {
    delete win.AudioContext
    resetSoundForTests()
    expect(() => sound('log')).not.toThrow()
  })

  it('survives a browser that throws on construction', () => {
    win.AudioContext = class { constructor() { throw new Error('blocked') } }
    resetSoundForTests()
    expect(() => sound('log')).not.toThrow()
  })

  it('survives blocked site data', () => {
    win.localStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    } as unknown as Storage
    resetSoundForTests()
    expect(soundEnabled()).toBe(true)
    expect(() => setSoundEnabled(false)).not.toThrow()
  })
})

const VOICES: CatVoice[] = ['purr', 'chirp', 'trill', 'mew', 'brrp']
const inScale = (hz: number) =>
  PENTATONIC.some((p) => Math.abs(p - hz) < 0.01)

describe('the cat has a voice', () => {
  const peakOf = () =>
    Math.max(...gains.map((g) => Number(g.gain.ramps[0] ?? 0)))

  it('plays something for every voice', () => {
    for (const v of VOICES) {
      oscillators = []
      sound(v)
      expect(`${v}:${oscillators.length > 0}`).toBe(`${v}:true`)
    }
  })

  it('never leaves the pentatonic scale, so nothing can clash', () => {
    /*
     * The one mechanical guarantee that the cat cannot make the app sound bad.
     * A pentatonic scale has no semitone and no tritone, so any two of these
     * notes sound fine together in any order — including against log, undo and
     * goal, which are built from the same table.
     */
    for (const v of VOICES) {
      for (const steps of [-2, -1, 0, 1, 2]) {
        oscillators = []
        sound(v, steps)
        for (const o of oscillators) {
          // The LFO is a modulator, not a note; it is meant to be sub-audio.
          if (o.frequency.value < PENTATONIC[0]) continue
          expect(`${v}${steps}: ${o.frequency.value}`).toBe(
            `${v}${steps}: ${inScale(o.frequency.value) ? o.frequency.value : 'off-scale'}`
          )
        }
      }
    }
  })

  it('stays quieter than logging food', () => {
    sound('log')
    const logPeak = peakOf()
    for (const v of VOICES) {
      gains = []
      sound(v)
      expect(`${v}: ${peakOf() < logPeak}`).toBe(`${v}: true`)
    }
  })

  it('gives the purr its modulation rather than a plain tone', () => {
    // Without the LFO a purr is just a low beep, which is the exact thing we
    // were asked not to build.
    sound('purr')
    const lfos = oscillators.filter((o) => o.frequency.value < 60)
    expect(lfos.length).toBeGreaterThan(0)
    // Purr rate: fast enough to be roughness, slow enough not to be a pitch.
    for (const l of lfos) {
      expect(l.frequency.value).toBeGreaterThanOrEqual(18)
      expect(l.frequency.value).toBeLessThanOrEqual(45)
    }
  })

  it('glides the chirp up and the mew down — that is what makes them calls', () => {
    sound('chirp')
    const chirp = oscillators[0]
    expect(chirp.frequency.ramps[0]).toBeGreaterThan(chirp.frequency.value)

    oscillators = []
    sound('mew')
    const mew = oscillators[0]
    expect(mew.frequency.ramps[0]).toBeLessThan(mew.frequency.value)
  })

  it('transposes by walking the scale, never between its rungs', () => {
    expect(transpose(880, 1)).toBe(987.77)
    expect(transpose(880, -1)).toBe(739.99)
    expect(transpose(880, 0)).toBe(880)
    // Off the end clamps rather than wrapping an octave.
    expect(transpose(PENTATONIC[0], -5)).toBe(PENTATONIC[0])
    expect(transpose(PENTATONIC[PENTATONIC.length - 1], 5)).toBe(
      PENTATONIC[PENTATONIC.length - 1]
    )
    // A frequency that is not in the table is left alone rather than snapped.
    expect(transpose(1000, 2)).toBe(1000)
  })

  it('is reachable from every reaction the cat can perform', () => {
    for (const [cue, steps] of Object.values(VOICE_FOR)) {
      oscillators = []
      expect(() => sound(cue, steps)).not.toThrow()
      expect(oscillators.length).toBeGreaterThan(0)
    }
  })

  it('hands back its nodes so a fast tap can cut the last one', () => {
    const nodes = sound('purr') as unknown as FakeOscillator[]
    expect(nodes.length).toBeGreaterThan(0)
    // Every note already has a scheduled stop at the end of its envelope; hush
    // adds a second, earlier one, which is how Web Audio cancels a voice — the
    // last stop() wins.
    const before = nodes.map((n) => n.stopped)
    hush(nodes as unknown as OscillatorNode[])
    nodes.forEach((n, i) => expect(n.stopped).toBe(before[i] + 1))
  })

  it('says nothing when sound is switched off', () => {
    setSoundEnabled(false)
    expect(sound('purr')).toEqual([])
    expect(oscillators).toHaveLength(0)
  })
})

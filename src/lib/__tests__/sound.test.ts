import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SOUND_KEY, resetSoundForTests, setSoundEnabled, sound, soundEnabled } from '../sound'

/** Records what a cue actually asked the audio hardware to do. */
class FakeOscillator {
  type = ''
  frequency = { value: 0 }
  started: number[] = []
  connect(next: unknown) { return next }
  start(t: number) { this.started.push(t) }
  stop() {}
}
class FakeGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
  connect(next: unknown) { return next }
}

let built = 0
let oscillators: FakeOscillator[] = []

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  constructor() { built += 1 }
  createOscillator() { const o = new FakeOscillator(); oscillators.push(o); return o }
  createGain() { return new FakeGain() }
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

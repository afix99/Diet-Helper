import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_MOTION,
  MOTION_KEY,
  flourishesOn,
  isMotionLevel,
  prefersReducedMotion,
  readMotion,
  writeMotion,
} from '../motion'

const win = globalThis as unknown as {
  window?: unknown
  localStorage?: Storage
  matchMedia?: unknown
}

const store = new Map<string, string>()
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as unknown as Storage

const setReduced = (on: boolean) => {
  win.matchMedia = () => ({ matches: on }) as MediaQueryList
}

beforeEach(() => {
  store.clear()
  win.localStorage = fakeStorage
  win.window = win
  setReduced(false)
})

afterEach(() => {
  delete win.window
  delete win.localStorage
  delete win.matchMedia
})

describe('motion preference', () => {
  it('defaults to full, because the point was more animation', () => {
    expect(readMotion()).toBe('full')
    expect(DEFAULT_MOTION).toBe('full')
  })

  it('round-trips a choice', () => {
    writeMotion('calm')
    expect(readMotion()).toBe('calm')
    expect(store.get(MOTION_KEY)).toBe('calm')
    writeMotion('full')
    expect(readMotion()).toBe('full')
  })

  it('ignores a value it does not recognise', () => {
    store.set(MOTION_KEY, 'disco')
    expect(readMotion()).toBe('full')
    expect(isMotionLevel('disco')).toBe(false)
  })

  it('survives blocked site data', () => {
    win.localStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    } as unknown as Storage
    expect(readMotion()).toBe('full')
    expect(() => writeMotion('calm')).not.toThrow()
  })
})

describe('flourishesOn', () => {
  it('is on by default', () => {
    expect(flourishesOn()).toBe(true)
  })

  it('is off in Calm', () => {
    writeMotion('calm')
    expect(flourishesOn()).toBe(false)
  })

  /*
   * The rule that matters: prefers-reduced-motion is an accessibility setting,
   * not a preference, so it wins even over an explicit Full.
   */
  it('is off under reduced motion, whatever the app was told', () => {
    setReduced(true)
    writeMotion('full')
    expect(readMotion()).toBe('full')
    expect(prefersReducedMotion()).toBe(true)
    expect(flourishesOn()).toBe(false)
  })

  it('treats a browser with no matchMedia as no preference', () => {
    delete win.matchMedia
    expect(prefersReducedMotion()).toBe(false)
    expect(flourishesOn()).toBe(true)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { LOCAL_KEY, hasRealContent, readLocalData } from '../store/local'
import { defaultData } from '../store/defaults'

/**
 * Guards the switch from browser storage to an account. The failure this
 * prevents looks exactly like data loss to the person it happens to.
 */
const store: Record<string, string> = {}

/** Minimal stand-in for the browser globals the store reaches for. */
type WindowShim = { window: { localStorage: Partial<Storage> } }
const asGlobal = () => globalThis as unknown as WindowShim

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  asGlobal().window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    },
  }
})

describe('adopting a local diary on first sign-in', () => {
  it('reads back what the browser stored', () => {
    store[LOCAL_KEY] = JSON.stringify({ entries: [{ id: 'a' }] })
    expect(readLocalData()).toEqual({ entries: [{ id: 'a' }] })
  })

  it('returns null when nothing is stored', () => {
    expect(readLocalData()).toBeNull()
  })

  it('does not mistake untouched defaults for a real diary', () => {
    expect(hasRealContent(defaultData())).toBe(false)
    expect(hasRealContent(null)).toBe(false)
    expect(hasRealContent({})).toBe(false)
  })

  it('recognises a diary worth keeping', () => {
    expect(hasRealContent({ entries: [{ id: 'x' }] as never })).toBe(true)
    expect(hasRealContent({ weights: [{ id: 'w' }] as never })).toBe(true)
    expect(hasRealContent({ customFoods: [{ id: 'f' }] as never })).toBe(true)
    // Someone who completed the starter guide but has not logged a meal yet
    // still entered real numbers, and should not be reset to a stranger's.
    expect(hasRealContent({ ...defaultData(), profile: { ...defaultData().profile, heightCm: 170 } })).toBe(true)
  })

  it('survives storage that throws, as private mode does', () => {
    asGlobal().window = {
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
      },
    }
    expect(readLocalData()).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { backupFilename, readBackup, toBackup } from '../backup'
import { defaultData } from '../store/defaults'
import type { AppData } from '../store/types'
import type { LogEntry } from '../types'

const entry = (date: string): LogEntry => ({
  id: `e-${date}`,
  date,
  slot: 'lunch' as const,
  foodId: 'nasi-lemak',
  recipeId: null,
  customName: null,
  servings: 1,
  notes: null,
  macros: { kcal: 389, protein: 8.4, carbs: 52.1, fat: 16.3, fibre: 2.2 },
})

const diary = (): AppData => ({
  ...defaultData(),
  entries: [entry('2026-08-30'), entry('2026-08-31')],
  weights: [{ id: 'w1', date: '2026-08-30', weightKg: 61.4, waistCm: null, hipCm: null }],
})

describe('backup', () => {
  it('round-trips a diary through the file it writes', () => {
    const before = diary()
    const text = JSON.stringify(toBackup(before), null, 2)
    const read = readBackup(text)
    expect(read.ok).toBe(true)
    expect(read.result!.repaired).toBe(false)
    // The whole point: what comes back is what went in, not an approximation.
    expect(read.result!.data).toEqual(before)
  })

  it('names the file by date so a folder of them sorts', () => {
    expect(backupFilename(new Date('2026-09-02T15:00:00Z'))).toBe(
      'memey-diet-planner-2026-09-02.json'
    )
  })

  it('accepts a bare diary someone pulled out of localStorage by hand', () => {
    // No wrapper, no version — refusing it would help nobody, and repair() is
    // what makes accepting it safe.
    const read = readBackup(JSON.stringify(diary()))
    expect(read.ok).toBe(true)
    expect(read.summary!.meals).toBe(2)
  })

  it('salvages a file with a bad row rather than refusing the whole thing', () => {
    const d = diary() as unknown as { entries: unknown[] }
    d.entries.push({ id: 'broken', date: '2026-09-01', servings: null })
    const read = readBackup(JSON.stringify(d))
    expect(read.ok).toBe(true)
    expect(read.result!.repaired).toBe(true)
    expect(read.result!.dropped.entries).toBe(1)
    expect(read.summary!.meals).toBe(2)
  })

  it('refuses a file that is not JSON, and says what to pick instead', () => {
    const read = readBackup('<!doctype html><html>oops')
    expect(read.ok).toBe(false)
    expect(read.error).toMatch(/\.json/i)
    expect(read.result).toBeNull()
  })

  /*
   * The one unrecoverable mistake available on this screen is replacing a real
   * diary with an empty file, so an empty one is refused outright rather than
   * quietly restored.
   */
  it('refuses an empty diary rather than wiping a real one with it', () => {
    for (const empty of ['{}', JSON.stringify(toBackup(defaultData())), '[]']) {
      const read = readBackup(empty)
      expect(read.ok).toBe(false)
      expect(read.error).toMatch(/nothing was changed/i)
    }
  })
})

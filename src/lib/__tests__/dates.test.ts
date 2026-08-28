import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfWeek,
  daysBetween,
  formatDay,
  todayIso,
  weekDates,
  weekOf,
} from '../dates'

/**
 * These run under TZ=Asia/Kuala_Lumpur (see vitest.config.ts). Every one of
 * them passed in UTC before the fix; the bug only appeared east of Greenwich,
 * which is exactly where this app is used.
 */
describe('date keys are timezone-stable', () => {
  it('keeps a Monday-first week aligned to real weekdays', () => {
    // 2026-08-29 is a Saturday; its week runs Mon 24th to Sun 30th.
    expect(weekOf('2026-08-29')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ])
  })

  it('puts Monday at index 0 and Sunday at index 6', () => {
    expect(dayOfWeek('2026-08-24')).toBe(0) // Monday
    expect(dayOfWeek('2026-08-29')).toBe(5) // Saturday
    expect(dayOfWeek('2026-08-30')).toBe(6) // Sunday
  })

  it('includes the end date in a trailing range', () => {
    // The regression: this used to drop today, so logging never hit the streak.
    expect(weekDates('2026-08-29', 3)).toEqual(['2026-08-27', '2026-08-28', '2026-08-29'])
    expect(weekDates('2026-08-29', 7)).toContain('2026-08-29')
  })

  it("always contains today in today's week", () => {
    const t = todayIso()
    expect(weekOf(t)).toContain(t)
    expect(weekDates(t, 7)).toContain(t)
  })

  it('labels a day key with the weekday that key actually is', () => {
    expect(formatDay('2026-08-29', { weekday: 'long' })).toBe('Saturday')
    expect(formatDay('2026-08-24', { weekday: 'long' })).toBe('Monday')
  })

  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('survives a daylight-saving transition without drifting', () => {
    // Northern-hemisphere DST weekend; UTC arithmetic must not lose an hour.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('measures spans inclusively for streak windows', () => {
    expect(daysBetween('2026-08-29', '2026-08-29')).toBe(0)
    expect(daysBetween('2026-08-24', '2026-08-29')).toBe(5)
    expect(daysBetween('2026-08-29', '2026-08-24')).toBe(-5)
  })

  it('returns a valid key for today', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

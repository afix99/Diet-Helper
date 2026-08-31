'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from './ui'
import { Icon } from './icons'
import { useLogging } from '@/lib/logging'
import { allFoods, entryMacros, entryName } from '@/lib/selectors'
import { sound } from '@/lib/sound'
import { haptic } from '@/lib/haptics'
import { usualFor } from '@/lib/usual'
import { useData } from '@/lib/store/provider'
import { SLOT_LABELS, type LogEntry, type MealSlot } from '@/lib/types'

/**
 * One meal, open or folded.
 *
 * Today used to render all six of these expanded at once — a wall of controls
 * in front of the single thing anyone opens the app to do. Only the meal you
 * are plausibly eating is open now; the rest fold to a line that still says
 * what is in them, so nothing is hidden, only quiet.
 *
 * The "usual" chips are the other half. Logging a familiar breakfast used to
 * cost five steps for a food eaten forty times before, and every step is a
 * place to give up.
 */
export function MealSlotCard({
  date,
  slot,
  entries,
  open,
  onToggle,
  onOpenPicker,
}: {
  date: string
  slot: MealSlot
  /** This slot's entries, bucketed once by the parent. */
  entries: LogEntry[]
  open: boolean
  onToggle: () => void
  onOpenPicker: () => void
}) {
  const { data } = useData()
  const { logFood, removeEntry, setServings } = useLogging()

  const label = SLOT_LABELS[slot]
  const slotKcal = entries.reduce((sum, e) => sum + entryMacros(e).kcal, 0)

  /*
   * logFood mints the entry id internally, so the row that just arrived is
   * found by watching the list grow rather than by being told. Entries are
   * appended, so the newest is the last one.
   */
  const [landed, setLanded] = useState<string | null>(null)
  const count = useRef(entries.length)
  const newest = entries.length > 0 ? entries[entries.length - 1].id : null

  /*
   * Depends on the *length*, not the array: entriesForSlot builds a new array
   * every render, so an array dependency re-ran this on every render — and any
   * re-render inside the 900ms window fired the cleanup, killed the timer, then
   * took the else branch and scheduled no replacement. The flash class stayed on
   * that row for the rest of the session.
   */
  useEffect(() => {
    const grew = entries.length > count.current
    count.current = entries.length
    if (!grew || !newest) return
    setLanded(newest)
    const t = setTimeout(() => setLanded((id) => (id === newest ? null : id)), 900)
    return () => clearTimeout(t)
  }, [entries.length, newest])

  /*
   * A tapped chip is gone from `usuals` on the very next render, because a food
   * already logged today is never offered again. Holding it here for the length
   * of the exit keeps it on screen long enough to visibly hand itself over.
   */
  const [committing, setCommitting] = useState<string | null>(null)
  useEffect(() => {
    if (!committing) return
    const t = setTimeout(() => setCommitting(null), 240)
    return () => clearTimeout(t)
  }, [committing])

  const usuals = useMemo(() => {
    if (!open) return []
    const list = usualFor(data, slot, { today: date })
    if (!committing || list.some((f) => f.id === committing)) return list
    const leaving = allFoods(data).find((f) => f.id === committing)
    return leaving ? [...list, leaving] : list
  }, [data, slot, date, open, committing])

  const summary = entries.length
    ? entryName(entries[0], data.customFoods) +
      (entries.length > 1 ? ` +${entries.length - 1}` : '')
    : label.time

  if (!open) {
    return (
      <Card className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          data-slot={slot}
          className="tap-row flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <span className="shrink-0 text-secondary font-bold">{label.label}</span>
          <span className="min-w-0 flex-1 truncate text-tertiary text-faint">{summary}</span>
          <span className="shrink-0 text-tertiary tabular-nums text-muted">
            {slotKcal > 0 ? `${Math.round(slotKcal)} kcal` : ''}
          </span>
          <Icon name="chevron" size={14} strokeWidth={2.5} className="shrink-0 text-faint" />
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        data-slot={slot}
        className="mb-2 flex w-full items-baseline justify-between text-left"
      >
        <h2 className="text-secondary font-bold">{label.label}</h2>
        <span className="text-tertiary tabular-nums text-faint">
          {slotKcal > 0 ? `${Math.round(slotKcal)} kcal` : label.time}
        </span>
      </button>

      {entries.length > 0 && (
        <ul className="mb-2 divide-y divide-line">
          {entries.map((e) => {
            const m = entryMacros(e)
            return (
              <li
                key={e.id}
                className={`flex items-center gap-2 rounded-inner py-2 ${
                  landed === e.id ? 'animate-land-flash' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-secondary">
                    {entryName(e, data.customFoods)}
                  </span>
                  <span className="block text-tertiary text-faint tabular-nums">
                    {Math.round(m.kcal)} kcal · {Math.round(m.protein)}g P
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease servings"
                    onClick={() => {
                      sound('tap')
                      setServings(e.id, e.servings - 0.5)
                    }}
                    className="tap grid h-8 w-8 place-items-center rounded-pill bg-raised text-secondary font-bold"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-tertiary font-semibold tabular-nums">
                    ×{e.servings}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase servings"
                    onClick={() => {
                      sound('tap')
                      setServings(e.id, e.servings + 0.5)
                    }}
                    className="tap grid h-8 w-8 place-items-center rounded-pill bg-raised text-secondary font-bold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${entryName(e, data.customFoods)}`}
                    onClick={() => {
                      sound('undo')
                      removeEntry(e.id)
                    }}
                    className="tap grid h-8 w-8 place-items-center rounded-pill text-faint"
                  >
                    <Icon name="close" size={15} strokeWidth={2.25} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {usuals.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {usuals.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                aria-label={`Log ${food.name} to ${label.label}`}
                onClick={() => {
                  haptic('medium')
                  sound('log')
                  setCommitting(food.id)
                  logFood(date, slot, food)
                }}
                className={`tap flex items-center gap-1.5 rounded-pill bg-raised px-3 py-1.5 text-tertiary font-semibold ${
                  committing === food.id ? 'animate-chip-commit' : ''
                }`}
              >
                <Icon name="plus" size={13} strokeWidth={2.5} className="text-primary-ink" />
                <span className="max-w-[9.5rem] truncate">{food.name}</span>
                <span className="tabular-nums text-faint">{Math.round(food.kcal)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => {
          sound('tap')
          onOpenPicker()
        }}
        className="tap w-full rounded-pill border border-dashed border-line py-2.5 text-secondary font-semibold text-primary-ink"
      >
        + Add food
      </button>
    </Card>
  )
}

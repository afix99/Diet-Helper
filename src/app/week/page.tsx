'use client'

import { useMemo, useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { FoodPicker } from '@/components/FoodPicker'
import { Card, ListGroup, PageHeader, StatusPill } from '@/components/ui'
import { Icon } from '@/components/icons'
import { useLogging } from '@/lib/logging'
import { statusBand } from '@/lib/nutrition'
import { dayTotals, entriesForSlot, entryMacros, entryName, weekOf } from '@/lib/selectors'
import { addDays, formatDay } from '@/lib/dates'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from '@/lib/types'

const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export default function WeekPage() {
  const { data, ready } = useData()
  const { copyDay, removeEntry } = useLogging()
  const today = todayIso()
  const [anchor, setAnchor] = useState(today)
  const [open, setOpen] = useState<string>(today)
  const [picking, setPicking] = useState<{ date: string; slot: MealSlot } | null>(null)
  const [heldPicking, pickingLeaving] = usePresence(picking)
  const [copySource, setCopySource] = useState<string | null>(null)

  const dates = useMemo(() => weekOf(anchor), [anchor])

  const shift = (weeks: number) => setAnchor(addDays(anchor, weeks * 7))

  if (!ready) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>

  const weekTotal = dates.reduce((sum, d) => sum + dayTotals(data, d).kcal, 0)
  const loggedDays = dates.filter((d) => dayTotals(data, d).kcal > 0).length

  return (
    <>
      <PageHeader title="Week" subtitle="Plan ahead, copy days" />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="tap px-2" aria-label="Previous week">
            <Icon name="chevron" size={20} strokeWidth={2.25} className="rotate-180" />
          </button>
          <div className="text-center">
            <p className="text-secondary font-bold">
              {formatDay(dates[0], {
                day: 'numeric',
                month: 'short',
              })}{' '}
              –{' '}
              {formatDay(dates[6], {
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <p className="text-tertiary text-faint">
              {loggedDays}/7 days · avg{' '}
              {loggedDays > 0 ? Math.round(weekTotal / loggedDays) : 0} kcal
            </p>
          </div>
          <button type="button" onClick={() => shift(1)} className="tap px-2" aria-label="Next week">
            <Icon name="chevron" size={20} strokeWidth={2.25} />
          </button>
        </div>
      </Card>

      {copySource && (
        <Card className="mb-3 border-primary bg-primary/5">
          <p className="text-secondary font-semibold">Copy to which day?</p>
          <p className="mb-2 text-tertiary text-faint">Pick a day to copy this plan onto.</p>
          <div className="flex flex-wrap gap-1.5">
            {dates
              .filter((d) => d !== copySource)
              .map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    copyDay(copySource, d)
                    setCopySource(null)
                  }}
                  className="tap rounded-pill bg-surface px-3 py-1.5 text-tertiary font-semibold"
                >
                  {DAY_LABELS[dates.indexOf(d)]}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setCopySource(null)}
              className="tap rounded-pill px-3 py-1.5 text-tertiary text-faint"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      <ListGroup>
        {dates.map((date, i) => {
          const totals = dayTotals(data, date)
          const band = statusBand(totals.kcal, data.targets.kcal)
          const isOpen = open === date
          const isToday = date === today
          return (
            <div
              key={date}
              className={`px-4 py-2.5 [&+div]:border-t [&+div]:border-line ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : date)}
                aria-expanded={isOpen}
                className="tap-row -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-2 px-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-secondary font-bold">
                    {DAY_LABELS[i]}
                    {isToday && <span className="ml-1.5 text-tertiary text-primary-ink">· today</span>}
                  </span>
                  <span className="block text-tertiary tabular-nums text-faint">
                    {totals.kcal > 0
                      ? `${Math.round(totals.kcal)} kcal · ${Math.round(totals.protein)}g protein`
                      : 'Nothing planned yet'}
                  </span>
                </span>
                <StatusPill band={band} />
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-line pt-3">
                  {MEAL_SLOTS.map((slot) => {
                    const entries = entriesForSlot(data, date, slot)
                    return (
                      <div key={slot} className="mb-2 last:mb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-tertiary font-semibold text-muted">
                            {SLOT_LABELS[slot].label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPicking({ date, slot })}
                            aria-label={`Add to ${SLOT_LABELS[slot].label}`}
                            className="tap grid h-7 w-7 place-items-center rounded-pill bg-raised text-secondary font-bold text-primary-ink"
                          >
                            +
                          </button>
                        </div>
                        {entries.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 py-1 pl-1">
                            <span className="min-w-0 flex-1 truncate text-secondary">{entryName(e, data.customFoods)}</span>
                            <span className="shrink-0 text-tertiary tabular-nums text-faint">
                              {Math.round(entryMacros(e).kcal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEntry(e.id)}
                              aria-label={`Remove ${entryName(e, data.customFoods)}`}
                              className="tap grid h-7 w-7 shrink-0 place-items-center rounded-pill text-faint"
                            >
                              <Icon name="close" size={14} strokeWidth={2.25} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  {totals.kcal > 0 && (
                    <button
                      type="button"
                      onClick={() => setCopySource(date)}
                      className="tap mt-2 w-full rounded-pill border border-line py-2 text-tertiary font-semibold text-muted"
                    >
                      Copy this day to another
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </ListGroup>

      {heldPicking && (
        <FoodPicker
          date={heldPicking.date}
          slot={heldPicking.slot}
          leaving={pickingLeaving}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}

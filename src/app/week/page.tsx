'use client'

import { useMemo, useState } from 'react'
import { FoodPicker } from '@/components/FoodPicker'
import { Card, PageHeader, StatusPill } from '@/components/ui'
import { useLogging } from '@/lib/logging'
import { statusBand } from '@/lib/nutrition'
import { dayTotals, entriesForSlot, entryMacros, entryName, weekOf } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from '@/lib/types'

const DAY_LABELS = [
  { ms: 'Isnin', en: 'Monday' },
  { ms: 'Selasa', en: 'Tuesday' },
  { ms: 'Rabu', en: 'Wednesday' },
  { ms: 'Khamis', en: 'Thursday' },
  { ms: 'Jumaat', en: 'Friday' },
  { ms: 'Sabtu', en: 'Saturday' },
  { ms: 'Ahad', en: 'Sunday' },
]

export default function WeekPage() {
  const { data, ready } = useData()
  const { copyDay, removeEntry } = useLogging()
  const today = todayIso()
  const [anchor, setAnchor] = useState(today)
  const [open, setOpen] = useState<string>(today)
  const [picking, setPicking] = useState<{ date: string; slot: MealSlot } | null>(null)
  const [copySource, setCopySource] = useState<string | null>(null)

  const dates = useMemo(() => weekOf(anchor), [anchor])

  const shift = (weeks: number) => {
    const d = new Date(`${anchor}T00:00:00`)
    d.setDate(d.getDate() + weeks * 7)
    setAnchor(d.toISOString().slice(0, 10))
  }

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  const weekTotal = dates.reduce((sum, d) => sum + dayTotals(data, d).kcal, 0)
  const loggedDays = dates.filter((d) => dayTotals(data, d).kcal > 0).length

  return (
    <>
      <PageHeader ms="Minggu" en="Week plan" />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="tap px-2 text-lg" aria-label="Minggu sebelum">
            ‹
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">
              {new Date(`${dates[0]}T00:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}{' '}
              –{' '}
              {new Date(`${dates[6]}T00:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <p className="text-xs text-faint">
              {loggedDays}/7 hari · purata{' '}
              {loggedDays > 0 ? Math.round(weekTotal / loggedDays) : 0} kcal
            </p>
          </div>
          <button type="button" onClick={() => shift(1)} className="tap px-2 text-lg" aria-label="Minggu depan">
            ›
          </button>
        </div>
      </Card>

      {copySource && (
        <Card className="mb-3 border-salmon bg-salmon/5">
          <p className="text-sm font-semibold">Salin ke hari mana?</p>
          <p className="mb-2 text-xs text-faint">Pick a day to copy this plan onto.</p>
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
                  className="tap rounded-pill bg-surface px-3 py-1.5 text-xs font-semibold"
                >
                  {DAY_LABELS[dates.indexOf(d)].ms}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setCopySource(null)}
              className="tap rounded-pill px-3 py-1.5 text-xs text-faint"
            >
              Batal
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-3">
        {dates.map((date, i) => {
          const totals = dayTotals(data, date)
          const band = statusBand(totals.kcal, data.targets.kcal)
          const isOpen = open === date
          const isToday = date === today
          return (
            <Card key={date} className={isToday ? 'border-salmon' : undefined}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : date)}
                aria-expanded={isOpen}
                className="tap flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {DAY_LABELS[i].ms}
                    <span className="ml-1 font-normal text-faint">{DAY_LABELS[i].en}</span>
                    {isToday && <span className="ml-1.5 text-xs text-salmon">· hari ini</span>}
                  </span>
                  <span className="block text-xs tabular-nums text-faint">
                    {totals.kcal > 0
                      ? `${Math.round(totals.kcal)} kcal · ${Math.round(totals.protein)}g protein`
                      : 'Belum ada rancangan'}
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
                          <span className="text-xs font-semibold text-muted">
                            {SLOT_LABELS[slot].ms}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPicking({ date, slot })}
                            aria-label={`Tambah ke ${SLOT_LABELS[slot].ms}`}
                            className="tap grid h-7 w-7 place-items-center rounded-pill bg-raised text-sm font-bold text-salmon"
                          >
                            +
                          </button>
                        </div>
                        {entries.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 py-1 pl-1">
                            <span className="min-w-0 flex-1 truncate text-sm">{entryName(e)}</span>
                            <span className="shrink-0 text-xs tabular-nums text-faint">
                              {Math.round(entryMacros(e).kcal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEntry(e.id)}
                              aria-label={`Buang ${entryName(e)}`}
                              className="tap grid h-7 w-7 shrink-0 place-items-center rounded-pill text-faint"
                            >
                              ✕
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
                      className="tap mt-2 w-full rounded-pill border border-line py-2 text-xs font-semibold text-muted"
                    >
                      Salin hari ini ke hari lain
                    </button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {picking && (
        <FoodPicker date={picking.date} slot={picking.slot} onClose={() => setPicking(null)} />
      )}
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FoodPicker } from '@/components/FoodPicker'
import { WaterCard } from '@/components/WaterCard'
import { BudgetRing, Card, MacroBar, PageHeader, StatusPill } from '@/components/ui'
import { useLogging } from '@/lib/logging'
import { statusBand } from '@/lib/nutrition'
import {
  badgesFor,
  dayTotals,
  entriesForSlot,
  entryMacros,
  entryName,
  streakFor,
} from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from '@/lib/types'

export default function TodayPage() {
  const { data, ready } = useData()
  const { removeEntry, setServings } = useLogging()
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const date = todayIso()

  const totals = useMemo(() => dayTotals(data, date), [data, date])
  const band = statusBand(totals.kcal, data.targets.kcal)
  const run = useMemo(() => streakFor(data, date), [data, date])
  const unlocked = useMemo(() => badgesFor(data, date).filter((b) => b.unlocked), [data, date])

  if (!ready) {
    return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>
  }

  return (
    <>
      <PageHeader
        ms="Hari Ini"
        en={new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        action={
          run.current > 0 ? (
            <span className="pill bg-salmon/15 text-salmon" title="Streak">
              <span aria-hidden>🔥</span>
              {run.current} hari
            </span>
          ) : null
        }
      />

      <Card className="mb-4">
        <BudgetRing consumed={totals.kcal} target={data.targets.kcal} band={band} />
        <div className="mt-3 flex justify-center">
          <StatusPill band={band} />
        </div>
        <div className="mt-5 grid gap-3">
          <MacroBar
            label="Protein"
            en="protein"
            value={totals.protein}
            target={data.targets.protein}
            tone="salmon"
          />
          <MacroBar
            label="Karbo"
            en="carbs"
            value={totals.carbs}
            target={data.targets.carbs}
            tone="amber"
          />
          <MacroBar label="Lemak" en="fat" value={totals.fat} target={data.targets.fat} tone="ocean" />
          <MacroBar
            label="Serat"
            en="fibre"
            value={totals.fibre}
            target={data.targets.fibre}
            tone="avocado"
          />
        </div>
      </Card>

      {unlocked.length > 0 && (
        <Link href="/more/badges" className="mb-4 block">
          <Card className="flex items-center gap-3">
            <div className="flex -space-x-1.5 text-xl" aria-hidden>
              {unlocked.slice(0, 5).map((b) => (
                <span key={b.id}>{b.emoji}</span>
              ))}
            </div>
            <p className="flex-1 text-sm font-semibold">
              {unlocked.length} lencana
              <span className="ml-1 font-normal text-faint">unlocked</span>
            </p>
            <span aria-hidden className="text-faint">
              ›
            </span>
          </Card>
        </Link>
      )}

      <WaterCard date={date} />

      <div className="grid gap-3">
        {MEAL_SLOTS.map((slot) => {
          const entries = entriesForSlot(data, date, slot)
          const slotKcal = entries.reduce((sum, e) => sum + entryMacros(e).kcal, 0)
          const label = SLOT_LABELS[slot]
          return (
            <Card key={slot}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-bold">
                  {label.ms} <span className="font-normal text-faint">{label.en}</span>
                </h2>
                <span className="text-xs tabular-nums text-faint">
                  {slotKcal > 0 ? `${Math.round(slotKcal)} kcal` : label.time}
                </span>
              </div>

              {entries.length > 0 && (
                <ul className="mb-2 divide-y divide-line">
                  {entries.map((e) => {
                    const m = entryMacros(e)
                    return (
                      <li key={e.id} className="flex items-center gap-2 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{entryName(e)}</span>
                          <span className="block text-xs text-faint tabular-nums">
                            {Math.round(m.kcal)} kcal · {Math.round(m.protein)}g P
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Kurangkan"
                            onClick={() => setServings(e.id, e.servings - 0.5)}
                            className="tap grid h-8 w-8 place-items-center rounded-pill bg-raised text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xs font-semibold tabular-nums">
                            ×{e.servings}
                          </span>
                          <button
                            type="button"
                            aria-label="Tambah"
                            onClick={() => setServings(e.id, e.servings + 0.5)}
                            className="tap grid h-8 w-8 place-items-center rounded-pill bg-raised text-sm font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label={`Buang ${entryName(e)}`}
                            onClick={() => removeEntry(e.id)}
                            className="tap grid h-8 w-8 place-items-center rounded-pill text-faint"
                          >
                            ✕
                          </button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setPicking(slot)}
                className="tap w-full rounded-pill border border-dashed border-line py-2.5 text-sm font-semibold text-salmon"
              >
                + Tambah makanan
              </button>
            </Card>
          )
        })}
      </div>

      {picking && <FoodPicker date={date} slot={picking} onClose={() => setPicking(null)} />}
    </>
  )
}

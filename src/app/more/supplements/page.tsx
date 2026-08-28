'use client'

import { useState } from 'react'
import { BackLink } from '@/components/BackLink'
import { Card, PageHeader } from '@/components/ui'
import { SUPPLEMENTS } from '@/lib/catalogue'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'

type Tab = 'supplements' | 'hydration' | 'micro' | 'caffeine'

export default function SupplementsPage() {
  const { data, ready, update } = useData()
  const [tab, setTab] = useState<Tab>('supplements')
  const date = todayIso()

  const takenToday = data.supplements[date] ?? []
  const tickedToday = data.micronutrients[date] ?? []

  const toggleSupplement = (name: string) =>
    update((d) => {
      const current = d.supplements[date] ?? []
      return {
        ...d,
        supplements: {
          ...d.supplements,
          [date]: current.includes(name)
            ? current.filter((s) => s !== name)
            : [...current, name],
        },
      }
    })

  const toggleNutrient = (name: string) =>
    update((d) => {
      const current = d.micronutrients[date] ?? []
      return {
        ...d,
        micronutrients: {
          ...d.micronutrients,
          [date]: current.includes(name)
            ? current.filter((s) => s !== name)
            : [...current, name],
        },
      }
    })

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  return (
    <>
      <BackLink />
      <PageHeader ms="Suplemen & Air" en="Supplements, hydration & micronutrients" />

      <Card className="mb-4 border-amber/40 bg-amber/5">
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-bold">Makanan dahulu.</span> Suplemen menutup jurang, bukan
          ganti makanan sebenar. Rujuk dietitian berdaftar sebelum mula apa-apa suplemen baru.
        </p>
      </Card>

      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {(
          [
            ['supplements', 'Suplemen'],
            ['hydration', 'Jadual Air'],
            ['micro', 'Mikro'],
            ['caffeine', 'Kafein'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`tap rounded-pill px-2 py-2 text-[11px] font-semibold ${
              tab === key ? 'bg-salmon text-white' : 'bg-raised text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'supplements' && (
        <div className="grid gap-3">
          <p className="text-xs text-faint">
            {takenToday.length} / {SUPPLEMENTS.supplements.length} diambil hari ini
          </p>
          {SUPPLEMENTS.supplements.map((s) => {
            const taken = takenToday.includes(s.name)
            return (
              <Card key={s.name} className={taken ? 'border-avocado/40 bg-avocado/5' : undefined}>
                <button
                  type="button"
                  onClick={() => toggleSupplement(s.name)}
                  aria-pressed={taken}
                  className="tap flex w-full items-start gap-3 text-left"
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${
                      taken ? 'border-avocado bg-avocado text-white' : 'border-line text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{s.name}</span>
                    <span className="block text-xs font-semibold text-salmon">{s.dose}</span>
                    <span className="mt-1 block text-xs text-muted">{s.purpose}</span>
                    <span className="mt-1 block text-xs text-faint">🕐 {s.timing}</span>
                    {s.foodAlternative && (
                      <span className="mt-1 block text-xs text-faint">
                        🥗 Dari makanan: {s.foodAlternative}
                      </span>
                    )}
                  </span>
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'hydration' && (
        <div className="grid gap-2">
          <Card>
            <p className="text-xs leading-relaxed text-muted">
              Jadual cadangan sepanjang hari. Log jumlah sebenar di skrin{' '}
              <span className="font-semibold">Hari Ini</span>.
            </p>
          </Card>
          {SUPPLEMENTS.hydration.map((h) => (
            <Card key={h.time}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold tabular-nums text-ocean">{h.time}</p>
                <p className="text-xs font-semibold tabular-nums text-muted">{h.volumeMl} ml</p>
              </div>
              <p className="mt-0.5 text-sm">{h.beverage}</p>
              {h.notes && <p className="mt-1 text-xs text-faint">{h.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === 'micro' && (
        <Card>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold">
              Senarai semak harian <span className="font-normal text-faint">Daily checklist</span>
            </h2>
            <span className="text-xs tabular-nums text-faint">
              {tickedToday.length}/{SUPPLEMENTS.micronutrients.length}
            </span>
          </div>
          <ul className="divide-y divide-line">
            {SUPPLEMENTS.micronutrients.map((m) => {
              const ticked = tickedToday.includes(m.nutrient)
              return (
                <li key={m.nutrient}>
                  <button
                    type="button"
                    onClick={() => toggleNutrient(m.nutrient)}
                    aria-pressed={ticked}
                    className="tap flex w-full items-start gap-3 py-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold ${
                        ticked
                          ? 'border-avocado bg-avocado text-white'
                          : 'border-line text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-sm font-semibold ${ticked ? 'text-faint' : ''}`}
                        >
                          {m.nutrient}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-salmon">
                          {m.target}
                        </span>
                      </span>
                      <span className="block text-xs text-faint">{m.sources}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {tab === 'caffeine' && (
        <div className="grid gap-3">
          <Card>
            <ul className="divide-y divide-line">
              {SUPPLEMENTS.caffeine.map((c) => (
                <li key={c.beverage} className="flex items-center gap-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{c.beverage}</span>
                    <span className="block text-xs text-faint">{c.serving}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-salmon">
                      {c.caffeineMg}
                      <span className="text-[10px] font-medium text-faint"> mg</span>
                    </span>
                    <span className="block text-[10px] text-faint">{c.max}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          {SUPPLEMENTS.caffeineCutoff && (
            <Card className="border-amber/40 bg-amber/5">
              <p className="text-xs leading-relaxed text-muted">
                ⏰ {SUPPLEMENTS.caffeineCutoff}
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

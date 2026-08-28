'use client'

import { useMemo, useState } from 'react'
import { Card, EmptyState, PageHeader, StatusPill } from '@/components/ui'
import { rollingAverage, round1, statusBand } from '@/lib/nutrition'
import { dayRecords, latestWeight, weekOf } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import type { WeightLog } from '@/lib/types'

export default function ProgressPage() {
  const { data, ready, update } = useData()
  const [input, setInput] = useState('')
  const today = todayIso()

  const sorted = useMemo(
    () => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)),
    [data.weights]
  )
  const trend = useMemo(() => rollingAverage(sorted.map((w) => w.weightKg)), [sorted])
  const latest = latestWeight(data)
  const toGoal = latest === null ? null : round1(latest - data.profile.goalWeightKg)
  const lost = latest === null ? null : round1(data.profile.startWeightKg - latest)

  const addWeight = () => {
    const kg = Number.parseFloat(input)
    if (!Number.isFinite(kg) || kg <= 0) return
    update((d) => ({
      ...d,
      // One weigh-in per day, so a correction replaces rather than duplicates.
      weights: [
        ...d.weights.filter((w) => w.date !== today),
        { id: today, date: today, weightKg: kg, waistCm: null, hipCm: null } satisfies WeightLog,
      ],
    }))
    setInput('')
  }

  if (!ready) return <p className="py-20 text-center text-sm text-faint">Memuatkan…</p>

  return (
    <>
      <PageHeader ms="Progres" en="Weight & compliance" />

      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Sekarang" en="Now" value={latest === null ? '—' : `${latest}`} unit="kg" />
          <Stat
            label="Dah turun"
            en="Lost"
            value={lost === null ? '—' : `${lost > 0 ? lost : 0}`}
            unit="kg"
            tone="avocado"
          />
          <Stat
            label="Lagi"
            en="To goal"
            value={toGoal === null ? '—' : `${toGoal > 0 ? toGoal : 0}`}
            unit="kg"
            tone="salmon"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Berat hari ini (kg)`}
            aria-label="Berat hari ini dalam kg"
            className="min-w-0 flex-1 rounded-pill border border-line bg-surface px-4 py-2.5 text-base outline-none placeholder:text-faint focus:border-salmon"
          />
          <button
            type="button"
            onClick={addWeight}
            className="tap shrink-0 rounded-pill bg-salmon px-5 text-sm font-bold text-white"
          >
            Simpan
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Timbang seminggu sekali — pagi, selepas tandas, sebelum sarapan. Berat naik-turun
          1–3% setiap hari; ikut garis purata, bukan satu bacaan.
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 text-sm font-bold">
          Graf berat <span className="font-normal text-faint">Weight trend</span>
        </h2>
        {sorted.length < 2 ? (
          <EmptyState
            emoji="⚖️"
            ms="Perlu sekurang-kurangnya 2 bacaan"
            en="Log twice to see a trend"
          />
        ) : (
          <WeightChart
            points={sorted.map((w, i) => ({
              date: w.date,
              weight: w.weightKg,
              avg: trend[i],
            }))}
            goal={data.profile.goalWeightKg}
          />
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold">
          Minggu ini <span className="font-normal text-faint">This week</span>
        </h2>
        <ul className="divide-y divide-line">
          {dayRecords(data, weekOf(today)).map((d) => (
            <li key={d.date} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">
                {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-faint">
                  {d.kcal > 0 ? `${Math.round(d.kcal)} kcal` : '—'}
                </span>
                <StatusPill band={statusBand(d.kcal, data.targets.kcal)} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function Stat({
  label,
  en,
  value,
  unit,
  tone = 'ink',
}: {
  label: string
  en: string
  value: string
  unit: string
  tone?: 'ink' | 'salmon' | 'avocado'
}) {
  const colour = tone === 'salmon' ? 'text-salmon' : tone === 'avocado' ? 'text-avocado' : ''
  return (
    <div>
      <p className={`text-2xl font-extrabold tabular-nums ${colour}`}>
        {value}
        <span className="ml-0.5 text-xs font-semibold text-faint">{unit}</span>
      </p>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-[10px] text-faint">{en}</p>
    </div>
  )
}

/**
 * Inline SVG rather than a charting library: two series over at most a few
 * dozen points does not justify 50 kB on a phone.
 */
function WeightChart({
  points,
  goal,
}: {
  points: { date: string; weight: number; avg: number | null }[]
  goal: number
}) {
  const w = 320
  const h = 150
  const pad = { top: 10, right: 8, bottom: 20, left: 30 }
  const values = [...points.map((p) => p.weight), goal]
  const min = Math.min(...values) - 0.5
  const max = Math.max(...values) + 0.5
  const span = max - min || 1

  const x = (i: number) =>
    pad.left + (i / Math.max(1, points.length - 1)) * (w - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - (v - min) / span) * (h - pad.top - pad.bottom)

  const line = (get: (p: (typeof points)[number]) => number | null) =>
    points
      .map((p, i) => {
        const v = get(p)
        return v === null ? null : `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`
      })
      .filter(Boolean)
      .join(' ')

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Graf berat mingguan">
        <line
          x1={pad.left}
          x2={w - pad.right}
          y1={y(goal)}
          y2={y(goal)}
          stroke="rgb(var(--avocado))"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text x={pad.left} y={y(goal) - 4} fontSize="8" fill="rgb(var(--avocado))">
          goal {goal}kg
        </text>
        <path d={line((p) => p.weight)} fill="none" stroke="rgb(var(--line))" strokeWidth="1.5" />
        <path
          d={line((p) => p.avg)}
          fill="none"
          stroke="rgb(var(--salmon))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.weight)} r="2.5" fill="rgb(var(--salmon))" />
        ))}
        <text x={2} y={y(max - 0.5)} fontSize="8" fill="rgb(var(--faint))">
          {round1(max)}
        </text>
        <text x={2} y={y(min + 0.5)} fontSize="8" fill="rgb(var(--faint))">
          {round1(min)}
        </text>
      </svg>
      <p className="mt-1 text-[10px] text-faint">
        <span className="text-salmon">━</span> purata 7 hari · <span>━</span> bacaan harian
      </p>
    </div>
  )
}

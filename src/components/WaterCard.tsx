'use client'

import { Card } from './ui'
import { useData } from '@/lib/store/provider'

const GLASS_ML = 250

/**
 * The workbook sets a 2.5 L target (Dashboard!B20) and lays out an hourly
 * schedule, but has nowhere to record what you actually drank. This closes
 * that: one tap per glass.
 */
export function WaterCard({ date }: { date: string }) {
  const { data, update } = useData()
  const drunk = data.water[date] ?? 0
  const target = data.targets.waterMl
  const glasses = Math.round(drunk / GLASS_ML)
  const targetGlasses = Math.max(1, Math.round(target / GLASS_ML))
  const pct = target > 0 ? Math.min(1, drunk / target) : 0

  const add = (ml: number) =>
    update((d) => ({
      ...d,
      water: { ...d.water, [date]: Math.max(0, (d.water[date] ?? 0) + ml) },
    }))

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-secondary font-bold">Water</h2>
        <span className="text-tertiary tabular-nums text-muted">
          {drunk} <span className="text-faint">/ {target} ml</span>
        </span>
      </div>

      <div
        className="mb-3 flex flex-wrap gap-1"
        role="img"
        aria-label={`${glasses} of ${targetGlasses} glasses`}
      >
        {Array.from({ length: targetGlasses }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-6 w-4 rounded-b-md rounded-t-sm border transition ${
              i < glasses ? 'border-ocean bg-ocean' : 'border-line bg-raised'
            }`}
          />
        ))}
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-pill bg-raised">
        <div
          className="h-full bg-ocean transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => add(GLASS_ML)}
          className="tap flex-1 rounded-pill bg-ocean py-2 text-tertiary font-bold text-white"
        >
          + a glass (250ml)
        </button>
        <button
          type="button"
          onClick={() => add(500)}
          className="tap rounded-pill bg-raised px-4 py-2 text-tertiary font-semibold text-muted"
        >
          +500
        </button>
        <button
          type="button"
          onClick={() => add(-GLASS_ML)}
          aria-label="Remove a glass"
          disabled={drunk === 0}
          className="tap rounded-pill bg-raised px-4 py-2 text-tertiary font-semibold text-muted disabled:opacity-40"
        >
          −
        </button>
      </div>
    </Card>
  )
}

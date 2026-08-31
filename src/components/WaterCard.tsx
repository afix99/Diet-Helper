'use client'

import { Card } from './ui'
import { PressButton } from './PressButton'
import { Icon } from './icons'
import { sound } from '@/lib/sound'
import { burstFrom } from './BurstLayer'
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

  const add = (ml: number, from?: Element | null) => {
    const next = Math.max(0, drunk + ml)
    update((d) => ({
      ...d,
      water: { ...d.water, [date]: Math.max(0, (d.water[date] ?? 0) + ml) },
    }))
    // Only the glass that finishes the target gets a burst. Every glass would
    // make the eighth one mean nothing.
    if (ml > 0 && target > 0 && drunk < target && next >= target) {
      burstFrom(from ?? null, null, { seed: 'water-target', scale: 1.4 })
    }
  }

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-secondary font-bold">
          <Icon
            name="droplet"
            size={18}
            strokeWidth={1.9}
            fill={drunk > 0 ? 'currentColor' : 'none'}
            className="text-ocean"
          />
          Water
        </h2>
        <span className="text-tertiary tabular-nums text-muted">
          {drunk} <span className="text-faint">/ {target} ml</span>
        </span>
      </div>

      <div
        className="mb-3 flex flex-wrap gap-1"
        role="img"
        aria-label={`${glasses} of ${targetGlasses} glasses`}
      >
        {/*
          One glyph, painted or not. Abstract tiles said "eight of something";
          a glass says which eight, and the filled ones read as drunk at a
          glance rather than by counting.
        */}
        {Array.from({ length: targetGlasses }, (_, i) => (
          <Icon
            key={i}
            name="glass"
            size={22}
            strokeWidth={1.6}
            fill={i < glasses ? 'currentColor' : 'none'}
            className={`transition-colors ${i < glasses ? 'text-ocean' : 'text-faint/45'}`}
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
        <PressButton
          full
          cue="water"
          onClick={(e) => add(GLASS_ML, e.currentTarget)}
          className="flex-1 !bg-ocean !py-2"
        >
          + a glass (250ml)
        </PressButton>
        <button
          type="button"
          onClick={(e) => {
            sound('water')
            add(500, e.currentTarget)
          }}
          className="tap rounded-pill bg-raised px-4 py-2 text-tertiary font-semibold text-muted"
        >
          +500
        </button>
        <button
          type="button"
          onClick={() => {
            sound('undo')
            add(-GLASS_ML)
          }}
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

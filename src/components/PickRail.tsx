'use client'

import { useMemo, useState } from 'react'
import { Icon } from './icons'
import { slotForNow } from '@/lib/dates'
import { useLogging } from '@/lib/logging'
import { headlineFor, suggestFoods, type Need } from '@/lib/suggest'
import { useData } from '@/lib/store/provider'
import { todayIso } from '@/lib/store/defaults'
import { SLOT_LABELS } from '@/lib/types'

/**
 * Real foods from the catalogue, with the numbers that justify them, one tap
 * from being logged.
 *
 * An observation you cannot act on is just a complaint. The coach can now say
 * protein is short *and* hand over the three highest-protein-per-calorie things
 * in a 415-row catalogue that you have actually eaten before.
 */
export function PickRail({ need }: { need: Need }) {
  const { data } = useData()
  const { logFood } = useLogging()
  const [added, setAdded] = useState<string | null>(null)

  const today = todayIso()
  const slot = useMemo(() => slotForNow(), [])
  const picks = useMemo(() => suggestFoods(data, need, { today }), [data, need, today])

  if (picks.length === 0) return null

  return (
    <div className="mt-2.5 border-t border-line pt-2.5">
      <ul className="stack gap-1.5">
        {picks.map((food) => (
          <li key={food.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-tertiary font-semibold">{food.name}</span>
              <span className="block text-caption text-faint tabular-nums">
                {headlineFor(food, need)} &middot; {Math.round(food.kcal)} kcal
                {food.servingSize ? ` · ${food.servingSize}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                logFood(today, slot, food)
                setAdded(food.id)
              }}
              aria-label={`Log ${food.name} to ${SLOT_LABELS[slot].label}`}
              className="tap grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-raised font-bold text-primary-ink"
            >
              {added === food.id ? (
                <Icon name="check" size={15} strokeWidth={3} />
              ) : (
                <Icon name="plus" size={15} strokeWidth={2.5} />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-faint">
        {added
          ? `Added to ${SLOT_LABELS[slot].label.toLowerCase()}.`
          : `Tap to add to ${SLOT_LABELS[slot].label.toLowerCase()}.`}
      </p>
    </div>
  )
}

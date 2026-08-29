'use client'

import { useMemo, useState } from 'react'
import { Sheet } from './ui'
import { PressButton } from './PressButton'
import { Icon } from './icons'
import { useLogging } from '@/lib/logging'
import { parseQuickAdd } from '@/lib/quickAdd'
import { allFoods } from '@/lib/selectors'
import { useData } from '@/lib/store/provider'
import { SLOT_LABELS, type MealSlot } from '@/lib/types'

const EXAMPLES = [
  '2 eggs and a cup of brown rice',
  'nasi lemak with teh tarik',
  'grilled salmon with steamed broccoli',
]

/**
 * Log a whole meal by describing it.
 *
 * Everything is matched against the local catalogue and shown for confirmation
 * before anything is written — the parser is good, not infallible, and silently
 * logging a wrong guess is worse than asking.
 */
export function QuickAdd({
  date,
  slot,
  onClose,
  leaving,
}: {
  date: string
  slot: MealSlot
  onClose: () => void
  leaving?: boolean
}) {
  const { data } = useData()
  const { logFood } = useLogging()
  const [text, setText] = useState('')
  const [dropped, setDropped] = useState<string[]>([])

  const foods = useMemo(() => allFoods(data), [data])
  const result = useMemo(() => parseQuickAdd(text, foods), [text, foods])
  const keep = result.matches.filter((m) => !dropped.includes(m.phrase))

  const commit = () => {
    for (const m of keep) logFood(date, slot, m.food, m.servings)
    onClose()
  }

  const totalKcal = Math.round(keep.reduce((sum, m) => sum + m.food.kcal * m.servings, 0))

  return (
    <Sheet onClose={onClose} leaving={leaving} labelledBy="quick-add-title">
      <div className="flex items-center justify-between px-4 pb-2 pt-2">
        <div>
          <p id="quick-add-title" className="text-secondary font-bold">
            Quick add
          </p>
          <p className="text-tertiary text-faint">{SLOT_LABELS[slot].label}</p>
        </div>
        <button type="button" onClick={onClose} className="tap px-2 text-secondary font-semibold text-primary-ink">
          Cancel
        </button>
      </div>

      <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <textarea
          autoFocus
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Describe your meal"
          placeholder="Describe your meal…"
          className="w-full resize-none rounded-inner border border-line bg-surface px-3 py-2.5 text-body outline-none placeholder:text-faint focus:border-primary"
        />

        {text.trim().length === 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-tertiary text-faint">Try one of these:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setText(e)}
                  className="rounded-pill bg-raised px-3 py-1.5 text-tertiary text-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {result.matches.length > 0 && (
          <ul className="mt-4 overflow-hidden rounded-card border border-line">
            {result.matches.map((m) => {
              const off = dropped.includes(m.phrase)
              return (
                <li
                  key={m.phrase}
                  className="flex items-center gap-3 px-3 py-2.5 [&+li]:border-t [&+li]:border-line"
                >
                  <button
                    type="button"
                    aria-pressed={!off}
                    aria-label={off ? `Include ${m.food.name}` : `Exclude ${m.food.name}`}
                    onClick={() =>
                      setDropped((d) =>
                        off ? d.filter((p) => p !== m.phrase) : [...d, m.phrase]
                      )
                    }
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                      off ? 'border-line text-transparent' : 'border-avocado bg-avocado text-on-primary'
                    }`}
                  >
                    {!off && <Icon name="check" size={13} strokeWidth={3} />}
                  </button>
                  <span className={`min-w-0 flex-1 ${off ? 'opacity-40' : ''}`}>
                    <span className="block truncate text-body">
                      {m.servings !== 1 && (
                        <span className="font-semibold text-primary-ink">{m.servings}× </span>
                      )}
                      {m.food.name}
                    </span>
                    <span className="block truncate text-tertiary text-faint">
                      read “{m.phrase}”
                      {m.confidence < 0.55 && ' · unsure, check this'}
                    </span>
                  </span>
                  <span className="shrink-0 text-secondary tabular-nums text-muted">
                    {Math.round(m.food.kcal * m.servings)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {result.unmatched.length > 0 && (
          <p className="mt-3 rounded-inner bg-amber/10 px-3 py-2 text-tertiary text-muted">
            Couldn&apos;t find {result.unmatched.map((u) => `“${u}”`).join(', ')}. Add it from
            the Foods tab and it&apos;ll be recognised next time.
          </p>
        )}

        <PressButton
          full
          hapticWeight="success"
          onClick={commit}
          disabled={keep.length === 0}
          className="mt-4"
        >
          {keep.length === 0
            ? 'Nothing to add yet'
            : `Add ${keep.length} ${keep.length === 1 ? 'item' : 'items'} · ${totalKcal} kcal`}
        </PressButton>
      </div>
    </Sheet>
  )
}
